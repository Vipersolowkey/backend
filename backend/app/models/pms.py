from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    country_code: Mapped[str | None] = mapped_column(String(3), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("100.00"))


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    room_type_id: Mapped[int] = mapped_column(ForeignKey("room_types.id"), nullable=False, index=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False, index=True, default=1)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="available")

    room_type: Mapped[RoomType] = relationship()


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
    check_in: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_out: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    guest: Mapped[Guest] = relationship()
    room: Mapped[Room] = relationship()
