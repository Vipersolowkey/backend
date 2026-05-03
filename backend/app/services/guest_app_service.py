"""Guest app: stay timeline, folio, segment offers, dining/HK requests."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.guest_experience import GuestFolioLine, RoomHousekeepingState
from app.models.pms import Booking, Guest, Room, RoomType
from app.models.property_ops import GuestNote, GuestTag, GuestTimelineEvent, Property

STAY_EVENTS = (
    ("stay_app_checkin_started", "checkin", "Check-in started", "Đang nhận phòng"),
    ("stay_app_room_ready", "room_ready", "Room ready", "Phòng đã sẵn sàng"),
    ("stay_app_in_room", "in_room", "In room", "Đã vào phòng"),
    ("stay_app_checkout_done", "checkout", "Checked out", "Đã trả phòng"),
)

STEP_TO_EVENT = {row[1]: row[0] for row in STAY_EVENTS}
EVENT_TO_STEP = {row[0]: row[1] for row in STAY_EVENTS}


def _today() -> date:
    return datetime.now(timezone.utc).date()


def today_iso() -> str:
    return _today().isoformat()


def get_or_create_room_housekeeping(db: Session, room_id: int) -> RoomHousekeepingState:
    return _hk_for_room(db, room_id)


def get_booking_by_ref(db: Session, booking_ref: str) -> Booking | None:
    ref = (booking_ref or "").strip()
    if not ref:
        return None
    return db.scalar(
        select(Booking)
        .options(joinedload(Booking.guest), joinedload(Booking.room).joinedload(Room.room_type))
        .where(Booking.booking_id == ref),
    )


def _hk_for_room(db: Session, room_id: int) -> RoomHousekeepingState:
    row = db.get(RoomHousekeepingState, room_id)
    if row is None:
        row = RoomHousekeepingState(room_id=room_id, status="clean", last_note=None)
        db.add(row)
        db.flush()
    return row


def _stay_events_for_guest(db: Session, guest_id: int) -> dict[str, GuestTimelineEvent]:
    types = [t[0] for t in STAY_EVENTS]
    rows = db.scalars(
        select(GuestTimelineEvent)
        .where(GuestTimelineEvent.guest_id == guest_id, GuestTimelineEvent.event_type.in_(types))
        .order_by(GuestTimelineEvent.occurred_at.asc()),
    ).all()
    # latest event per type wins for "done" set
    out: dict[str, GuestTimelineEvent] = {}
    for r in rows:
        out[r.event_type] = r
    return out


def _step_done(booking: Booking, events_by_type: dict[str, GuestTimelineEvent], event_type: str, step_key: str) -> bool:
    if step_key == "checkout":
        return event_type in events_by_type or booking.status == "checked_out"
    if step_key == "in_room":
        return event_type in events_by_type or booking.status in ("checked_in", "checked_out")
    if step_key == "room_ready":
        return event_type in events_by_type
    if step_key == "checkin":
        return event_type in events_by_type
    return False


def compute_stay_phase(booking: Booking, events_by_type: dict[str, GuestTimelineEvent]) -> tuple[str, list[dict[str, Any]]]:
    """Returns phase_key and UI steps with state done|current|upcoming."""
    steps: list[dict[str, Any]] = []
    for event_type, step_key, en, vi in STAY_EVENTS:
        done = _step_done(booking, events_by_type, event_type, step_key)
        steps.append({"key": step_key, "event_type": event_type, "label_en": en, "label_vi": vi, "state": "done" if done else "upcoming"})

    first_open = next((i for i, s in enumerate(steps) if s["state"] != "done"), None)
    if first_open is not None:
        steps[first_open]["state"] = "current"

    if all(s["state"] == "done" for s in steps):
        phase = "completed"
    elif first_open is None:
        phase = "completed"
    else:
        phase = steps[first_open]["key"]

    return phase, steps


def get_timeline_view(db: Session, booking: Booking) -> dict[str, Any]:
    events = _stay_events_for_guest(db, booking.guest_id)
    phase, steps = compute_stay_phase(booking, events)
    return {"booking_ref": booking.booking_id, "stay_phase_key": phase, "stay_steps": steps}


def build_session_payload(db: Session, booking: Booking) -> dict[str, Any]:
    guest = booking.guest
    room = booking.room
    rt = room.room_type
    prop = db.get(Property, room.property_id)
    events = _stay_events_for_guest(db, booking.guest_id)
    phase, steps = compute_stay_phase(booking, events)

    folio_rows = list(db.scalars(select(GuestFolioLine).where(GuestFolioLine.booking_id == booking.id)).all())
    extras = sum((r.amount for r in folio_rows), Decimal("0"))
    hk = _hk_for_room(db, room.id)

    return {
        "booking_ref": booking.booking_id,
        "guest_name": guest.full_name if guest else None,
        "room_number": room.room_number,
        "property_name": prop.name if prop else None,
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "booking_status": booking.status,
        "stay_phase_key": phase,
        "stay_steps": steps,
        "folio_lines_count": len(folio_rows),
        "folio_lines": [
            {
                "id": r.id,
                "category": r.category,
                "description": r.description,
                "amount": str(r.amount),
                "created_at": r.created_at.isoformat(),
            }
            for r in folio_rows
        ],
        "folio_extras_total": str(extras),
        "room_rate_total": str(booking.total_price),
        "bill_estimated_total": str((booking.total_price + extras).quantize(Decimal("0.01"))),
        "housekeeping_room_status": hk.status,
    }


def advance_timeline(db: Session, booking: Booking, step: str) -> dict[str, Any]:
    et = STEP_TO_EVENT.get(step)
    if not et:
        raise ValueError("invalid step")
    db.add(
        GuestTimelineEvent(
            guest_id=booking.guest_id,
            event_type=et,
            detail=f"Guest app: {step}",
        ),
    )
    if step == "in_room":
        booking.status = "checked_in"
    if step == "checkout":
        booking.status = "checked_out"
    db.flush()
    db.refresh(booking)
    return build_session_payload(db, booking)


def list_guest_tags(db: Session, guest_id: int) -> list[str]:
    return [r.tag for r in db.scalars(select(GuestTag).where(GuestTag.guest_id == guest_id)).all()]


def build_segment_offers(tags: list[str]) -> list[dict[str, Any]]:
    tags_l = {t.lower() for t in tags}
    offers: list[dict[str, Any]] = []
    if "family" in tags_l or any("kid" in t for t in tags_l):
        offers.append(
            {
                "id": "seg-family",
                "segment": "family",
                "title": "Family arrival pack",
                "body": "Kids welcome kit + late checkout request priority. Book kids club slot before 4 PM.",
                "cta": "Reserve kids club",
                "price_hint": "From 150,000 VND",
            },
        )
    if any(x in tags_l for x in ("romance package", "anniversary", "honeymoon")):
        offers.append(
            {
                "id": "seg-romance",
                "segment": "anniversary",
                "title": "Anniversary sparkle",
                "body": "Sparkling wine + room petals + couple spa slot (45 min).",
                "cta": "Add romance bundle",
                "price_hint": "From 890,000 VND",
            },
        )
    offers.append(
        {
            "id": "seg-default",
            "segment": "general",
            "title": "Rooftop happy hour",
            "body": "Tonight 2-for-1 cocktails 5–7 PM — seats limited.",
            "cta": "Hold two seats",
            "price_hint": "5:00–7:00 PM",
        },
    )
    return offers


def dining_request_note(payload: dict[str, Any]) -> str:
    return json.dumps({"kind": "dining_request", **payload}, ensure_ascii=False)


def housekeeping_request_note(payload: dict[str, Any]) -> str:
    return json.dumps({"kind": "housekeeping_request", **payload}, ensure_ascii=False)


def room_board_rows(db: Session, property_id: int, today: date | None = None) -> list[dict[str, Any]]:
    today = today or _today()
    rooms = db.scalars(select(Room).where(Room.property_id == property_id).order_by(Room.room_number)).all()
    rows: list[dict[str, Any]] = []
    for room in rooms:
        hk = db.get(RoomHousekeepingState, room.id)
        hk_status = hk.status if hk else "clean"
        stmt = (
            select(Booking, Guest)
            .join(Guest, Guest.id == Booking.guest_id)
            .where(
                Booking.room_id == room.id,
                Booking.status.in_(["confirmed", "checked_in"]),
                Booking.check_in <= today,
                Booking.check_out > today,
            )
        )
        hit = db.execute(stmt).first()
        guest_name = None
        booking_ref = None
        stay_state = "vacant"
        if hit:
            b, g = hit
            guest_name = g.full_name
            booking_ref = b.booking_id
            stay_state = "occupied" if b.status == "checked_in" else "reserved"
        rows.append(
            {
                "room_id": room.id,
                "room_number": room.room_number,
                "room_pms_status": room.status,
                "housekeeping_status": hk_status,
                "stay_state": stay_state,
                "guest_name": guest_name,
                "booking_ref": booking_ref,
            },
        )
    return rows


def bill_export_text(payload: dict[str, Any]) -> str:
    lines = ["--- GUEST FOLIO PREVIEW ---", f"Booking: {payload['booking_ref']}", f"Guest: {payload.get('guest_name')}"]
    lines.append(f"Room: {payload['room_number']}")
    lines.append(f"Stay: {payload['check_in']} → {payload['check_out']}")
    lines.append(f"Room package total: {payload['room_rate_total']}")
    for item in payload.get("folio_lines", []):
        lines.append(f"  + [{item['category']}] {item['description']}: {item['amount']}")
    lines.append(f"Extras subtotal: {payload['folio_extras_total']}")
    lines.append(f"Estimated bill total: {payload['bill_estimated_total']}")
    lines.append("(Demo — not a tax invoice.)")
    return "\n".join(lines)
