"""Shared occupancy + HIGH-risk counts for alert thresholds and scheduling."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.property_ops import Property
from app.models.pms import Booking, Guest, Room, RoomType
from app.services.operational_priorities import _occupancy_today_pct
from app.services.predictive import predict_cancellation_risk


def _predict_area_name(db: Session, property_id: int | None) -> str | None:
    if property_id is None:
        return None
    prop = db.get(Property, property_id)
    return prop.area_name if prop else None


def count_high_risk_recent_bookings(db: Session, property_id: int | None, *, limit: int = 80) -> int:
    stmt = (
        select(Booking, Guest, RoomType)
        .join(Guest, Guest.id == Booking.guest_id)
        .join(Room, Room.id == Booking.room_id)
        .join(RoomType, RoomType.id == Room.room_type_id)
        .order_by(Booking.check_in.desc())
        .limit(limit)
    )
    if property_id is not None:
        stmt = stmt.where(Room.property_id == property_id)

    area_name = _predict_area_name(db, property_id)
    high_risk = 0
    for booking, _guest, _room_type in db.execute(stmt).all():
        pred = predict_cancellation_risk(
            {
                "room_id": booking.room_id,
                "check_in": booking.check_in,
                "check_out": booking.check_out,
                "total_price": booking.total_price,
            },
            db=db,
            area_name=area_name,
        )
        if pred.get("cancellation_risk") == "HIGH":
            high_risk += 1
    return high_risk


def compute_alert_inputs(db: Session, property_id: int | None) -> tuple[float | None, int]:
    occ = _occupancy_today_pct(db, property_id)
    high_risk = count_high_risk_recent_bookings(db, property_id)
    return occ, high_risk
