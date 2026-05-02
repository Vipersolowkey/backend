"""Heuristic operational signals: revenue, occupancy, cancellation mix, retention queue."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import CancellationSummary, MonthlyRevenueSummary
from app.models.pms import Booking, Room
from app.services.predictive import ACTIVE_BOOKING_STATUSES


def _occupancy_today_pct(db: Session) -> float | None:
    total_rooms = db.scalar(select(func.count(Room.id))) or 0
    if not total_rooms:
        return None
    today = date.today()
    occupied = (
        db.scalar(
            select(func.count(func.distinct(Booking.room_id))).where(
                Booking.status.in_(tuple(ACTIVE_BOOKING_STATUSES)),
                Booking.check_in <= today,
                Booking.check_out > today,
            )
        )
        or 0
    )
    return round(100.0 * float(occupied) / float(total_rooms), 2)


def _weighted_cancellation_pct(db: Session) -> float | None:
    rows = db.scalars(select(CancellationSummary)).all()
    if not rows:
        return None
    total_b = sum(int(r.total_bookings) for r in rows)
    canceled_b = sum(int(r.canceled_bookings) for r in rows)
    if not total_b:
        return None
    return round(100.0 * float(canceled_b) / float(total_b), 2)


def _worst_large_segment_cancel(db: Session) -> tuple[str, float] | None:
    """Segment with high volume and elevated cancel % (MVP heuristic)."""
    rows = db.scalars(select(CancellationSummary)).all()
    best: tuple[str, float] | None = None
    for r in rows:
        if int(r.total_bookings) < 800:
            continue
        pct = float(r.cancellation_rate_pct)
        if pct < 32.0:
            continue
        label = f"{r.hotel} · {r.market_segment} · {r.deposit_type}"
        if best is None or pct > best[1]:
            best = (label, pct)
    return best


def build_operational_priorities(
    db: Session,
    *,
    high_risk_booking_count: int,
    revenue_mom_growth_percent: Decimal,
    latest_period_label: str,
) -> list[dict]:
    """
    Return ordered list of dicts compatible with OperationalPriority schema:
    category, severity, title, detail, suggested_action, route_hint
    """
    items: list[dict] = []
    growth = float(revenue_mom_growth_percent)

    if high_risk_booking_count >= 5:
        items.append(
            {
                "category": "retention",
                "severity": "critical",
                "title": "Heavy retention queue",
                "detail": f"{high_risk_booking_count} bookings flagged HIGH risk (competitive price pressure).",
                "suggested_action": "Work largest rate gaps first: bundle + personalized outreach before cutting BAR.",
                "route_hint": "/alerts",
            }
        )
    elif high_risk_booking_count >= 2:
        items.append(
            {
                "category": "retention",
                "severity": "warning",
                "title": "Bookings need rate intervention",
                "detail": f"{high_risk_booking_count} bookings are HIGH risk vs market benchmarks.",
                "suggested_action": "Open Alerts, send retention emails, and log decline reasons if guests cancel.",
                "route_hint": "/alerts",
            }
        )
    elif high_risk_booking_count == 1:
        items.append(
            {
                "category": "retention",
                "severity": "info",
                "title": "Single rate-risk case",
                "detail": "At least one booking is exposed to competitor benchmarks.",
                "suggested_action": "Prioritize a short call or message before sending incentives.",
                "route_hint": "/alerts",
            }
        )

    if growth <= -8:
        items.append(
            {
                "category": "revenue",
                "severity": "critical",
                "title": "Sharp estimated revenue decline MoM",
                "detail": f"Vs prior period ({latest_period_label}), MoM growth is about {growth:.1f}%.",
                "suggested_action": "Refresh room mix + midweek BAR; compare Pricing Lab to OTA channels.",
                "route_hint": "/",
            }
        )
    elif growth <= -3:
        items.append(
            {
                "category": "revenue",
                "severity": "warning",
                "title": "Revenue trending down",
                "detail": f"MoM ~{growth:.1f}% for {latest_period_label}.",
                "suggested_action": "Run Revenue Manager briefing and audit weak booking segments.",
                "route_hint": "/",
            }
        )
    elif growth >= 12:
        items.append(
            {
                "category": "revenue",
                "severity": "info",
                "title": "Positive revenue momentum",
                "detail": f"MoM ~+{growth:.1f}% — room to hold rate card or test BAR increases gradually.",
                "suggested_action": "Watch competitor compression; avoid room discounts while demand holds.",
                "route_hint": "/competitors",
            }
        )

    occ = _occupancy_today_pct(db)
    if occ is not None:
        if occ < 12:
            items.append(
                {
                    "category": "occupancy",
                    "severity": "warning",
                    "title": "Low occupancy today",
                    "detail": f"~{occ:.1f}% rooms occupied (active bookings).",
                    "suggested_action": "Activate midweek sales: F&B bundles, late checkout, short corporate pushes.",
                    "route_hint": "/sales-ai",
                }
            )
        elif occ > 78:
            items.append(
                {
                    "category": "occupancy",
                    "severity": "info",
                    "title": "High occupancy load",
                    "detail": f"~{occ:.1f}% — manage BAR and avoid over-discounting on OTAs.",
                    "suggested_action": "Sync with Competitors watchlist and review stay restrictions.",
                    "route_hint": "/competitors",
                }
            )

    wc = _weighted_cancellation_pct(db)
    if wc is not None and wc >= 34:
        items.append(
            {
                "category": "cancellation",
                "severity": "warning",
                "title": "Elevated blended cancellation rate",
                "detail": f"~{wc:.1f}% cancellations in historical segment rollup.",
                "suggested_action": "Review Online TA / No Deposit mix; tighten deposits where contracts allow.",
                "route_hint": "/",
            }
        )

    worst = _worst_large_segment_cancel(db)
    if worst and not any(i["category"] == "cancellation" for i in items):
        label, pct = worst
        items.append(
            {
                "category": "cancellation",
                "severity": "warning",
                "title": "Large segment with high cancellations",
                "detail": f"{label}: ~{pct:.1f}% cancel rate.",
                "suggested_action": "Tune channel policy; try light deposits or date-change perks vs full refunds.",
                "route_hint": "/",
            }
        )

    def _sort_key(row: dict) -> tuple[int, int]:
        sr = {"critical": 0, "warning": 1, "info": 2}.get(row["severity"], 3)
        cr = {"retention": 0, "revenue": 1, "occupancy": 2, "cancellation": 3, "market": 4}.get(row["category"], 5)
        return (sr, cr)

    items.sort(key=_sort_key)
    return items[:8]
