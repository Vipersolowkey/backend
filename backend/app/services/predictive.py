from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.competitor_data import CompetitorData
from app.models.property_ops import Property
from app.models.pms import Booking, Room, RoomType
from app.services.price_rules import clamp_price


ACTIVE_BOOKING_STATUSES = {"confirmed", "booked", "checked_in"}
LOW_AVAILABILITY_KEYWORDS = ("limited", "few left", "last room", "sold out", "unavailable")


def _normalize_decimal(value: Decimal | float | int | None, fallback: str = "0.00") -> Decimal:
    if value is None:
        return Decimal(fallback)
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _has_low_availability(status: str | None) -> bool:
    if not status:
        return False
    lowered = status.strip().lower()
    return any(keyword in lowered for keyword in LOW_AVAILABILITY_KEYWORDS)


def _latest_competitor_rows(db: Session, area_name: str) -> list[CompetitorData]:
    latest_scrape_at = db.scalar(
        select(func.max(CompetitorData.scraped_at)).where(CompetitorData.search_area == area_name)
    )
    if latest_scrape_at is None:
        return []

    window_start = latest_scrape_at - timedelta(hours=24)
    stmt = (
        select(CompetitorData)
        .where(
            CompetitorData.search_area == area_name,
            CompetitorData.scraped_at >= window_start,
        )
        .order_by(CompetitorData.scraped_at.desc())
    )
    return list(db.scalars(stmt).all())


def _get_room_context(db: Session, room_id: int) -> tuple[Room, RoomType]:
    room = db.get(Room, room_id)
    if room is None:
        raise ValueError(f"Room {room_id} does not exist.")

    room_type = room.room_type
    if room_type is None:
        raise ValueError(f"Room {room_id} has no room type configured.")

    return room, room_type


def _calculate_room_type_occupancy(db: Session, room_type_id: int, target_date: date) -> Decimal:
    total_rooms = db.scalar(
        select(func.count(Room.id)).where(Room.room_type_id == room_type_id, Room.status != "inactive")
    )
    if not total_rooms:
        return Decimal("0.00")

    occupied_rooms = db.scalar(
        select(func.count(func.distinct(Booking.room_id)))
        .join(Room, Room.id == Booking.room_id)
        .where(
            Room.room_type_id == room_type_id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            Booking.check_in <= target_date,
            Booking.check_out > target_date,
        )
    )
    return Decimal(occupied_rooms or 0) / Decimal(total_rooms)


def _avg_competitor_price(rows: list[CompetitorData]) -> Decimal | None:
    prices = [_normalize_decimal(row.current_price) for row in rows if row.current_price is not None]
    if not prices:
        return None
    return sum(prices) / Decimal(len(prices))


def _resolve_area_name(db: Session, room: Room, area_name: str | None) -> str:
    if area_name:
        return area_name
    prop = db.get(Property, room.property_id)
    return prop.area_name if prop else "Nha Trang"


def calculate_dynamic_price_detail(
    room_id: int,
    target_date: date,
    db: Session | None = None,
    area_name: str | None = None,
) -> dict:
    """
    Raw model price from competitor + occupancy rules, then clamped by RoomTypePriceRule (audit).
    """
    owns_session = db is None
    db = db or SessionLocal()

    try:
        room, room_type = _get_room_context(db, room_id)
        resolved_area = _resolve_area_name(db, room, area_name)
        base_price = _normalize_decimal(room_type.base_price, fallback="100.00")
        occupancy_rate = _calculate_room_type_occupancy(db, room_type.id, target_date)
        competitor_rows = _latest_competitor_rows(db, resolved_area)

        competitor_avg_price: Decimal | None = None
        low_availability_ratio = Decimal("0")
        should_increase = False

        if competitor_rows:
            competitor_avg_price = _avg_competitor_price(competitor_rows)
            low_availability_count = sum(1 for row in competitor_rows if _has_low_availability(row.availability_status))
            low_availability_ratio = Decimal(low_availability_count) / Decimal(len(competitor_rows))

            should_increase = (
                competitor_avg_price is not None
                and competitor_avg_price >= base_price * Decimal("1.05")
                and low_availability_ratio >= Decimal("0.50")
                and occupancy_rate >= Decimal("0.60")
            )

        raw_final = base_price * Decimal("1.15") if should_increase else base_price
        raw_final = raw_final.quantize(Decimal("0.01"))

        clamped, rule_notes = clamp_price(db, room_type.id, raw_final)

        return {
            "recommended_price": clamped,
            "raw_model_price": raw_final,
            "base_price": base_price.quantize(Decimal("0.01")),
            "property_id": room.property_id,
            "room_type_id": room_type.id,
            "area_name": resolved_area,
            "occupancy_rate_room_type": occupancy_rate.quantize(Decimal("0.0001")),
            "competitor_avg_nightly": competitor_avg_price.quantize(Decimal("0.01")) if competitor_avg_price else None,
            "competitor_rows_used": len(competitor_rows),
            "low_availability_ratio": low_availability_ratio.quantize(Decimal("0.0001")),
            "applied_rules": rule_notes,
            "model_boost_applied": should_increase,
        }
    finally:
        if owns_session:
            db.close()


def calculate_dynamic_price(
    room_id: int,
    target_date: date,
    db: Session | None = None,
    area_name: str | None = None,
) -> Decimal:
    return calculate_dynamic_price_detail(room_id, target_date, db=db, area_name=area_name)["recommended_price"]


def predict_cancellation_risk(
    booking_data: dict,
    db: Session | None = None,
    area_name: str | None = None,
) -> dict:
    """
    Heuristic cancellation prediction driven by competitor pricing.

    Expected booking_data keys:
    - room_id: int
    - check_in: date
    - check_out: date
    - total_price: Decimal | float | int
    """

    owns_session = db is None
    db = db or SessionLocal()

    try:
        room_id = int(booking_data["room_id"])
        check_in = booking_data["check_in"]
        check_out = booking_data["check_out"]
        total_price = _normalize_decimal(booking_data["total_price"])

        if isinstance(check_in, datetime):
            check_in = check_in.date()
        if isinstance(check_out, datetime):
            check_out = check_out.date()

        stay_nights = max((check_out - check_in).days, 1)
        booked_nightly_rate = total_price / Decimal(stay_nights)

        room, room_type = _get_room_context(db, room_id)
        resolved_area = _resolve_area_name(db, room, area_name)
        occupancy_rate = _calculate_room_type_occupancy(db, room_type.id, check_in)
        competitor_rows = _latest_competitor_rows(db, resolved_area)
        competitor_avg_price = _avg_competitor_price(competitor_rows)

        if competitor_avg_price is None:
            return {
                "cancellation_risk": "LOW",
                "reason": "No competitor pricing is available.",
                "booked_nightly_rate": booked_nightly_rate.quantize(Decimal("0.01")),
                "competitor_avg_nightly_rate": None,
            }

        price_gap_ratio = (booked_nightly_rate - competitor_avg_price) / booked_nightly_rate

        if competitor_avg_price <= booked_nightly_rate * Decimal("0.85"):
            risk = "HIGH"
        elif competitor_avg_price <= booked_nightly_rate * Decimal("0.95") or occupancy_rate < Decimal("0.35"):
            risk = "MEDIUM"
        else:
            risk = "LOW"

        return {
            "cancellation_risk": risk,
            "reason": (
                "Competitors are significantly cheaper for similar stay dates."
                if risk == "HIGH"
                else "Competitor pricing is close enough that switching pressure is moderate."
                if risk == "MEDIUM"
                else "Current booking price remains competitive."
            ),
            "room_id": room.id,
            "booked_nightly_rate": booked_nightly_rate.quantize(Decimal("0.01")),
            "competitor_avg_nightly_rate": competitor_avg_price.quantize(Decimal("0.01")),
            "price_gap_ratio": price_gap_ratio.quantize(Decimal("0.0001")),
            "occupancy_rate": occupancy_rate.quantize(Decimal("0.0001")),
        }
    finally:
        if owns_session:
            db.close()
