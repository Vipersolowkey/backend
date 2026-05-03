from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.guest_experience import GuestFolioLine, RoomHousekeepingState
from app.models.property_ops import GuestNote, GuestTimelineEvent
from app.schemas.guest_app import (
    DiningRequestCreate,
    FolioLineCreate,
    HousekeepingRequestCreate,
    TimelineStepCreate,
)
from app.services import guest_app_service as gs

router = APIRouter(prefix="/guest-app", tags=["guest-app"])


@router.get("/session")
def guest_app_session(booking_ref: str = Query(..., min_length=3), db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return gs.build_session_payload(db, booking)


@router.get("/timeline")
def guest_app_timeline(booking_ref: str = Query(..., min_length=3), db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return gs.get_timeline_view(db, booking)


@router.post("/timeline/step")
def guest_app_timeline_step(payload: TimelineStepCreate, db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, payload.booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    try:
        out = gs.advance_timeline(db, booking, payload.step)
        db.commit()
        return out
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/offers")
def guest_app_offers(booking_ref: str = Query(..., min_length=3), db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    tags = gs.list_guest_tags(db, booking.guest_id)
    return {"booking_ref": booking.booking_id, "tags": tags, "offers": gs.build_segment_offers(tags)}


@router.post("/dining-request")
def guest_app_dining_request(payload: DiningRequestCreate, db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, payload.booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    body = gs.dining_request_note(
        {
            "party_size": payload.party_size,
            "slot_time": payload.slot_time,
            "allergies": payload.allergies,
            "notes": payload.notes,
            "booking_ref": payload.booking_ref,
        },
    )
    db.add(GuestNote(guest_id=booking.guest_id, body=body, author_label="Guest app"))
    db.add(
        GuestTimelineEvent(
            guest_id=booking.guest_id,
            event_type="dining_request",
            detail=f"Dining request queued: {payload.slot_time} for {payload.party_size} pax.",
        ),
    )
    db.commit()
    return {"ok": True, "message": "Restaurant queue received your request."}


@router.post("/housekeeping-request")
def guest_app_housekeeping_request(payload: HousekeepingRequestCreate, db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, payload.booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    room = booking.room
    body = gs.housekeeping_request_note(
        {"scope": payload.scope, "notes": payload.notes, "booking_ref": payload.booking_ref, "room": room.room_number},
    )
    db.add(GuestNote(guest_id=booking.guest_id, body=body, author_label="Guest app"))
    hk = gs.get_or_create_room_housekeeping(db, room.id)
    hk.status = "in_progress"
    hk.last_note = payload.notes or f"{payload.scope} requested"
    hk.updated_at = datetime.now(timezone.utc)
    db.add(
        GuestTimelineEvent(
            guest_id=booking.guest_id,
            event_type="housekeeping_request",
            detail=f"HK {payload.scope} for room {room.room_number}",
        ),
    )
    db.commit()
    return {"ok": True, "message": "Housekeeping has been notified.", "room_housekeeping_status": hk.status}


@router.get("/rooms/board")
def guest_app_room_board(
    property_id: int = Query(1, ge=1),
    db: Session = Depends(get_db),
) -> dict:
    rows = gs.room_board_rows(db, property_id)
    return {"property_id": property_id, "as_of": gs.today_iso(), "rooms": rows}


@router.get("/bill-preview")
def guest_app_bill_preview(booking_ref: str = Query(..., min_length=3), db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return gs.build_session_payload(db, booking)


@router.get("/bill-export")
def guest_app_bill_export(booking_ref: str = Query(..., min_length=3), db: Session = Depends(get_db)) -> Response:
    booking = gs.get_booking_by_ref(db, booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    payload = gs.build_session_payload(db, booking)
    text = gs.bill_export_text(payload)
    return Response(content=text, media_type="text/plain; charset=utf-8")


@router.post("/folio-line")
def guest_app_folio_line(payload: FolioLineCreate, db: Session = Depends(get_db)) -> dict:
    booking = gs.get_booking_by_ref(db, payload.booking_ref)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    line = GuestFolioLine(
        booking_id=booking.id,
        category=payload.category,
        description=payload.description,
        amount=payload.amount,
    )
    db.add(line)
    db.commit()
    db.refresh(line)
    return {"id": line.id, "category": line.category, "description": line.description, "amount": str(line.amount)}
