from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.property_ops import RoomTypePriceRule


def get_rule_for_room_type(db: Session, room_type_id: int) -> RoomTypePriceRule | None:
    return db.scalar(select(RoomTypePriceRule).where(RoomTypePriceRule.room_type_id == room_type_id))


def clamp_price(db: Session, room_type_id: int, price: Decimal) -> tuple[Decimal, list[str]]:
    """Return (clamped_price, human-readable audit lines)."""
    rule = get_rule_for_room_type(db, room_type_id)
    if rule is None:
        return price.quantize(Decimal("0.01")), []

    notes: list[str] = []
    p = price.quantize(Decimal("0.01"))
    lo = rule.min_price.quantize(Decimal("0.01"))
    hi = rule.max_price.quantize(Decimal("0.01"))

    if p < lo:
        notes.append(f"Applied floor rule: {p} → {lo} (min_price for room_type_id={room_type_id}).")
        p = lo
    elif p > hi:
        notes.append(f"Applied ceiling rule: {p} → {hi} (max_price for room_type_id={room_type_id}).")
        p = hi

    return p, notes
