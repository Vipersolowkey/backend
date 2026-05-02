from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select, true
from sqlalchemy.orm import Session

from app.models.analytics import MonthlyRevenueSummary
from app.models.property_ops import Property
from app.models.pms import Booking, Guest, Room, RoomType
from app.schemas.dashboard import (
    CancellationAlert,
    DashboardResponse,
    MonthlyRevenueCard,
    OperationalPriority,
    OperationalPulse,
    PeriodComparison,
)
from app.services.operational_priorities import build_operational_priorities
from app.services.predictive import ACTIVE_BOOKING_STATUSES, predict_cancellation_risk


def _pct_vs_prior(current: int | Decimal, previous: int | Decimal) -> Decimal | None:
    prev_d = Decimal(previous)
    if prev_d == 0:
        return None
    cur_d = Decimal(current)
    return ((cur_d - prev_d) / prev_d * Decimal("100")).quantize(Decimal("0.01"))


def _monday_sunday_week_containing(d: date) -> tuple[date, date]:
    """ISO week: Monday–Sunday containing date `d`."""
    wd = d.isoweekday()
    monday = d - timedelta(days=wd - 1)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _period_comparison_for_windows(
    *,
    as_of: date,
    granularity: str,
    current_label: str,
    previous_label: str,
    cur_start: date,
    cur_end: date,
    prev_start: date,
    prev_end: date,
    count_bookings,
    sum_booking_revenue,
) -> PeriodComparison:
    arrivals_cur = count_bookings(Booking.check_in >= cur_start, Booking.check_in <= cur_end)
    arrivals_prev = count_bookings(Booking.check_in >= prev_start, Booking.check_in <= prev_end)
    deps_cur = count_bookings(Booking.check_out >= cur_start, Booking.check_out <= cur_end)
    deps_prev = count_bookings(Booking.check_out >= prev_start, Booking.check_out <= prev_end)
    rev_cur = sum_booking_revenue(Booking.check_in >= cur_start, Booking.check_in <= cur_end)
    rev_prev = sum_booking_revenue(Booking.check_in >= prev_start, Booking.check_in <= prev_end)
    return PeriodComparison(
        granularity=granularity,
        as_of_date=as_of,
        current_label=current_label,
        previous_label=previous_label,
        current_start=cur_start,
        current_end=cur_end,
        previous_start=prev_start,
        previous_end=prev_end,
        arrivals_current=arrivals_cur,
        arrivals_previous=arrivals_prev,
        arrivals_change_pct=_pct_vs_prior(arrivals_cur, arrivals_prev),
        departures_current=deps_cur,
        departures_previous=deps_prev,
        departures_change_pct=_pct_vs_prior(deps_cur, deps_prev),
        check_in_revenue_current=rev_cur,
        check_in_revenue_previous=rev_prev,
        revenue_change_pct=_pct_vs_prior(rev_cur, rev_prev),
    )


def get_dashboard_payload(
    db: Session,
    area_name: str = "Nha Trang",
    property_id: int | None = None,
) -> DashboardResponse:
    latest_month = db.scalar(
        select(MonthlyRevenueSummary).order_by(MonthlyRevenueSummary.year.desc(), MonthlyRevenueSummary.id.desc())
    )
    if latest_month is None:
        monthly_revenue = MonthlyRevenueCard(
            month_label="No data",
            total_revenue=0,
            average_adr=0,
            average_stay_nights=0,
            growth_percent=Decimal("0"),
        )
    else:
        previous_month = db.scalar(
            select(MonthlyRevenueSummary)
            .where(MonthlyRevenueSummary.id != latest_month.id)
            .order_by(MonthlyRevenueSummary.year.desc(), MonthlyRevenueSummary.id.desc())
        )
        growth_percent = 0
        if previous_month and previous_month.total_estimated_revenue:
            growth_percent = (
                (latest_month.total_estimated_revenue - previous_month.total_estimated_revenue)
                / previous_month.total_estimated_revenue
            ) * 100
            growth_percent = Decimal(growth_percent).quantize(Decimal("0.01"))

        monthly_revenue = MonthlyRevenueCard(
            month_label=f"{latest_month.month_name} {latest_month.year}",
            total_revenue=latest_month.total_estimated_revenue,
            average_adr=latest_month.avg_adr,
            average_stay_nights=latest_month.avg_stay_nights,
            growth_percent=growth_percent,
        )

    property_scope: dict | None = None
    resolved_area = area_name
    if property_id is not None:
        prop = db.get(Property, property_id)
        if prop is not None:
            resolved_area = prop.area_name
            property_scope = {"id": prop.id, "name": prop.name, "area_name": prop.area_name}

    stmt = (
        select(Booking, Guest, RoomType)
        .join(Guest, Guest.id == Booking.guest_id)
        .join(Room, Room.id == Booking.room_id)
        .join(RoomType, RoomType.id == Room.room_type_id)
        .order_by(Booking.check_in.desc())
        .limit(80)
    )
    if property_id is not None:
        stmt = stmt.where(Room.property_id == property_id)

    alerts: list[CancellationAlert] = []
    for booking, guest, room_type in db.execute(stmt).all():
        prediction = predict_cancellation_risk(
            {
                "room_id": booking.room_id,
                "check_in": booking.check_in,
                "check_out": booking.check_out,
                "total_price": booking.total_price,
            },
            db=db,
            area_name=resolved_area,
        )
        if prediction["cancellation_risk"] != "HIGH":
            continue

        alerts.append(
            CancellationAlert(
                booking_id=booking.booking_id,
                guest_name=guest.full_name or f"Guest {guest.id}",
                guest_email=guest.email or f"guest{guest.id}@example.com",
                room_type=room_type.name,
                stay_dates=f"{booking.check_in.isoformat()} to {booking.check_out.isoformat()}",
                booked_price=booking.total_price,
                competitor_price=prediction.get("competitor_avg_nightly_rate"),
                risk=prediction["cancellation_risk"],
            )
        )

    priority_dicts = build_operational_priorities(
        db,
        high_risk_booking_count=len(alerts),
        revenue_mom_growth_percent=monthly_revenue.growth_percent,
        latest_period_label=monthly_revenue.month_label,
        property_id=property_id,
    )
    if not priority_dicts:
        priority_dicts = [
            {
                "category": "market",
                "severity": "info",
                "title": "No strong signals from operating rules",
                "detail": "Occupancy, revenue MoM, and HIGH-risk queue are within current thresholds.",
                "suggested_action": "Use Revenue Manager briefing and Competitors to refine this week's strategy.",
                "route_hint": "/competitors",
            }
        ]
    priorities = [OperationalPriority(**row) for row in priority_dicts]

    today = date.today()
    week_end = today + timedelta(days=7)
    pipeline_end = today + timedelta(days=30)

    prop_room_clause = Room.property_id == property_id if property_id is not None else true()

    total_rooms = int(
        db.scalar(
            select(func.count(Room.id)).where(Room.status != "inactive", prop_room_clause)
        )
        or 0
    )

    def count_bookings(*booking_filters):
        stmt = (
            select(func.count(Booking.id))
            .select_from(Booking)
            .join(Room, Room.id == Booking.room_id)
            .where(
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                Room.status != "inactive",
                prop_room_clause,
                *booking_filters,
            )
        )
        return int(db.scalar(stmt) or 0)

    def sum_booking_revenue(*booking_filters):
        stmt = (
            select(func.coalesce(func.sum(Booking.total_price), 0))
            .select_from(Booking)
            .join(Room, Room.id == Booking.room_id)
            .where(
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                Room.status != "inactive",
                prop_room_clause,
                *booking_filters,
            )
        )
        raw = db.scalar(stmt)
        return Decimal(raw or 0).quantize(Decimal("0.01"))

    occupied_tonight = count_bookings(Booking.check_in <= today, Booking.check_out > today)
    if total_rooms > 0:
        occupancy_pct = (Decimal(occupied_tonight) / Decimal(total_rooms) * Decimal("100")).quantize(
            Decimal("0.1")
        )
    else:
        occupancy_pct = Decimal("0")

    operational_pulse = OperationalPulse(
        as_of_date=today,
        total_rooms=total_rooms,
        occupied_rooms_tonight=occupied_tonight,
        occupancy_pct_tonight=occupancy_pct,
        arrivals_next_7_days=count_bookings(Booking.check_in >= today, Booking.check_in <= week_end),
        departures_next_7_days=count_bookings(Booking.check_out >= today, Booking.check_out <= week_end),
        future_check_ins_next_30_days=count_bookings(Booking.check_in >= today, Booking.check_in <= pipeline_end),
    )

    cur_start = today - timedelta(days=6)
    cur_end = today
    prev_start = today - timedelta(days=13)
    prev_end = today - timedelta(days=7)
    period_comparison = _period_comparison_for_windows(
        as_of=today,
        granularity="rolling_7d",
        current_label="Last 7 days",
        previous_label="Prior 7 days",
        cur_start=cur_start,
        cur_end=cur_end,
        prev_start=prev_start,
        prev_end=prev_end,
        count_bookings=count_bookings,
        sum_booking_revenue=sum_booking_revenue,
    )

    cw_mon, cw_sun = _monday_sunday_week_containing(today)
    pw_mon = cw_mon - timedelta(days=7)
    pw_sun = cw_sun - timedelta(days=7)
    ic_cur = cw_mon.isocalendar()
    ic_prev = pw_mon.isocalendar()
    calendar_week_comparison = _period_comparison_for_windows(
        as_of=today,
        granularity="calendar_week_mon",
        current_label=f"This week (ISO {ic_cur.year}-W{ic_cur.week:02d})",
        previous_label=f"Last week (ISO {ic_prev.year}-W{ic_prev.week:02d})",
        cur_start=cw_mon,
        cur_end=cw_sun,
        prev_start=pw_mon,
        prev_end=pw_sun,
        count_bookings=count_bookings,
        sum_booking_revenue=sum_booking_revenue,
    )

    pipe_a0 = today
    pipe_a1 = today + timedelta(days=6)
    pipe_b0 = today + timedelta(days=7)
    pipe_b1 = today + timedelta(days=13)
    pipeline_comparison = _period_comparison_for_windows(
        as_of=today,
        granularity="forward_7d_vs_next_7d",
        current_label="Next 7 days",
        previous_label="Following 7 days",
        cur_start=pipe_a0,
        cur_end=pipe_a1,
        prev_start=pipe_b0,
        prev_end=pipe_b1,
        count_bookings=count_bookings,
        sum_booking_revenue=sum_booking_revenue,
    )

    return DashboardResponse(
        monthly_revenue=monthly_revenue,
        alerts=alerts[:10],
        priorities=priorities,
        operational_pulse=operational_pulse,
        period_comparison=period_comparison,
        calendar_week_comparison=calendar_week_comparison,
        pipeline_comparison=pipeline_comparison,
        property_scope=property_scope,
    )
