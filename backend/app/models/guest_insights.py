"""Rollups for in-app leaderboards (room & service satisfaction, upsell usage)."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class RoomTypeRatingSummary(Base):
    """Aggregated guest satisfaction by room type (seeded / synced from surveys or PMS)."""

    __tablename__ = "room_type_rating_summaries"
    __table_args__ = (UniqueConstraint("room_type_id", name="uq_room_type_rating_room_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    room_type_id: Mapped[int] = mapped_column(ForeignKey("room_types.id"), nullable=False, index=True)
    avg_rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room_type: Mapped["RoomType"] = relationship("RoomType")


class ServiceRatingSummary(Base):
    """Aggregated ratings for hotel services (spa, F&B, transfer, etc.)."""

    __tablename__ = "service_rating_summaries"
    __table_args__ = (UniqueConstraint("service_key", name="uq_service_rating_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    service_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name_vi: Mapped[str] = mapped_column(String(160), nullable=False)
    avg_rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UpsellUsageSummary(Base):
    """Add-on / upsell SKU usage (orders in window + lifetime)."""

    __tablename__ = "upsell_usage_summaries"
    __table_args__ = (UniqueConstraint("sku", name="uq_upsell_usage_sku"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name_vi: Mapped[str] = mapped_column(String(200), nullable=False)
    orders_last_30d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    orders_all_time: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revenue_last_30d: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


from typing import TYPE_CHECKING  # noqa: E402

if TYPE_CHECKING:
    from app.models.pms import RoomType  # noqa: F401
