from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class DiningRequestCreate(BaseModel):
    booking_ref: str = Field(..., min_length=4, max_length=120)
    party_size: int = Field(2, ge=1, le=30)
    slot_time: str = Field(..., min_length=1, max_length=32, description="e.g. 19:00 or 2026-05-04T19:00")
    allergies: str | None = Field(None, max_length=500)
    notes: str | None = Field(None, max_length=1000)


class HousekeepingRequestCreate(BaseModel):
    booking_ref: str = Field(..., min_length=4, max_length=120)
    scope: Literal["full_clean", "tidy", "turndown"] = "full_clean"
    notes: str | None = Field(None, max_length=1000)


class TimelineStepCreate(BaseModel):
    booking_ref: str = Field(..., min_length=4, max_length=120)
    step: Literal["checkin", "room_ready", "in_room", "checkout"]


class FolioLineCreate(BaseModel):
    """Demo: guest or staff posts an incidental line (optional)."""

    booking_ref: str
    category: Literal["minibar", "laundry", "spa", "dining", "other"] = "other"
    description: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., ge=Decimal("0.00"))


class GuestAppSessionResponse(BaseModel):
    booking_ref: str
    guest_name: str | None
    room_number: str
    property_name: str | None
    check_in: str
    check_out: str
    booking_status: str
    stay_phase_key: str
    stay_steps: list[dict]
    folio_lines_count: int
    folio_extras_total: str
    housekeeping_room_status: str
