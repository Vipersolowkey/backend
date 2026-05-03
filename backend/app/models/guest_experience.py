"""Guest-facing app: folio lines and housekeeping board (PMS-lite)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class GuestFolioLine(Base):
    __tablename__ = "guest_folio_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomHousekeepingState(Base):
    """Per-room housekeeping for board + guest requests (clean / dirty / in_progress)."""

    __tablename__ = "room_housekeeping_states"

    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), primary_key=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="clean")
    last_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
