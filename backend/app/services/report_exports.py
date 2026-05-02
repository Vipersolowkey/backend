from __future__ import annotations

import calendar
from datetime import date
from io import BytesIO

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import MonthlyRevenueSummary
from app.models.competitor_data import CompetitorData
from app.models.pms import Booking, Room
from app.models.property_ops import PricingDecisionLog
from app.services.operational_priorities import _occupancy_today_pct
from app.services.predictive import ACTIVE_BOOKING_STATUSES


def occupancy_calendar_days(db: Session, year: int, month: int, property_id: int | None) -> list[dict]:
    _, last_day = calendar.monthrange(year, month)
    out: list[dict] = []
    q_total = select(func.count(Room.id)).where(Room.status != "inactive")
    if property_id is not None:
        q_total = q_total.where(Room.property_id == property_id)
    total_rooms = int(db.scalar(q_total) or 0)
    if total_rooms == 0:
        for d in range(1, last_day + 1):
            out.append({"date": date(year, month, d).isoformat(), "occupied_rooms": 0, "total_rooms": 0, "occupancy_pct": 0.0})
        return out

    for d in range(1, last_day + 1):
        day = date(year, month, d)
        stmt = (
            select(func.count(func.distinct(Booking.room_id)))
            .join(Room, Room.id == Booking.room_id)
            .where(
                Booking.status.in_(tuple(ACTIVE_BOOKING_STATUSES)),
                Booking.check_in <= day,
                Booking.check_out > day,
                Room.status != "inactive",
            )
        )
        if property_id is not None:
            stmt = stmt.where(Room.property_id == property_id)
        occ = int(db.scalar(stmt) or 0)
        # One decimal reads cleanly on the heatmap; seed overlaps supply varied night-by-night counts.
        pct = round(100.0 * occ / total_rooms, 1)
        out.append(
            {
                "date": day.isoformat(),
                "occupied_rooms": occ,
                "total_rooms": total_rooms,
                "occupancy_pct": pct,
            }
        )
    return out


def build_export_workbook(db: Session, *, property_id: int | None) -> bytes:
    rev_rows = db.scalars(
        select(MonthlyRevenueSummary).order_by(MonthlyRevenueSummary.year.desc(), MonthlyRevenueSummary.id.desc()).limit(36)
    ).all()
    revenue_df = pd.DataFrame(
        [
            {
                "month_label": f"{r.month_name} {r.year}",
                "total_estimated_revenue": float(r.total_estimated_revenue),
                "avg_adr": float(r.avg_adr),
                "avg_stay_nights": float(r.avg_stay_nights),
            }
            for r in reversed(rev_rows)
        ]
    )

    log_stmt = select(PricingDecisionLog).order_by(PricingDecisionLog.id.desc()).limit(500)
    if property_id is not None:
        log_stmt = log_stmt.where(PricingDecisionLog.property_id == property_id)
    logs = db.scalars(log_stmt).all()
    logs_df = pd.DataFrame(
        [
            {
                "created_at": row.created_at.isoformat() if row.created_at else "",
                "source": row.source,
                "property_id": row.property_id,
                "room_id": row.room_id,
                "final_price": float(row.final_price) if row.final_price is not None else None,
                "raw_price": float(row.raw_price) if row.raw_price is not None else None,
                "demand_scenario": row.demand_scenario,
            }
            for row in logs
        ]
    )

    comp = db.scalars(select(CompetitorData).order_by(CompetitorData.id.desc()).limit(200)).all()
    comp_df = pd.DataFrame(
        [
            {
                "area": r.search_area,
                "hotel": r.hotel_name,
                "price": float(r.current_price) if r.current_price is not None else None,
                "currency": r.currency,
                "availability": r.availability_status,
            }
            for r in comp
        ]
    )

    occ = _occupancy_today_pct(db, property_id)
    summary_df = pd.DataFrame(
        [
            {"metric": "occupancy_today_pct", "value": occ if occ is not None else ""},
            {"metric": "property_filter_id", "value": property_id if property_id is not None else "all"},
            {"metric": "export_date", "value": date.today().isoformat()},
        ]
    )

    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        revenue_df.to_excel(writer, sheet_name="monthly_revenue", index=False)
        logs_df.to_excel(writer, sheet_name="pricing_decisions", index=False)
        comp_df.to_excel(writer, sheet_name="competitors_snapshot", index=False)
        summary_df.to_excel(writer, sheet_name="summary", index=False)
    return buf.getvalue()


def build_export_csv_bundle(db: Session, *, property_id: int | None) -> bytes:
    """Single CSV with multiple sections as comments is awkward — return revenue CSV only + newline markers."""
    rev_rows = db.scalars(
        select(MonthlyRevenueSummary).order_by(MonthlyRevenueSummary.year.asc(), MonthlyRevenueSummary.id.asc()).limit(120)
    ).all()
    revenue_df = pd.DataFrame(
        [
            {
                "month_label": f"{r.month_name} {r.year}",
                "total_estimated_revenue": float(r.total_estimated_revenue),
                "avg_adr": float(r.avg_adr),
            }
            for r in rev_rows
        ]
    )
    buf = BytesIO()
    revenue_df.to_csv(buf, index=False)
    return buf.getvalue()
