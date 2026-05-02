from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    area_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)


class PricingDecisionLog(Base):
    __tablename__ = "pricing_decision_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id"), nullable=True, index=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), nullable=True, index=True)
    room_type_id: Mapped[int | None] = mapped_column(ForeignKey("room_types.id"), nullable=True, index=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    raw_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    final_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    scenario_label: Mapped[str | None] = mapped_column(String(512), nullable=True)
    demand_scenario: Mapped[str | None] = mapped_column(String(64), nullable=True)
    applied_rules_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_json: Mapped[str | None] = mapped_column(Text, nullable=True)


class AlertThreshold(Base):
    __tablename__ = "alert_thresholds"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id"), nullable=True, index=True)
    metric_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    threshold_value: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    webhook_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)


class ThresholdNotifyDedupe(Base):
    """Cooldown tracking so scheduled threshold evaluation does not spam webhooks."""

    __tablename__ = "threshold_notify_dedupe"
    __table_args__ = (UniqueConstraint("threshold_id", "property_scope", name="uq_threshold_notify_scope"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    threshold_id: Mapped[int] = mapped_column(ForeignKey("alert_thresholds.id"), nullable=False, index=True)
    property_scope: Mapped[str] = mapped_column(String(32), nullable=False)
    last_fired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class GuestTag(Base):
    __tablename__ = "guest_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False, index=True)
    tag: Mapped[str] = mapped_column(String(80), nullable=False)

    __table_args__ = (UniqueConstraint("guest_id", "tag", name="uq_guest_tag"),)


class GuestNote(Base):
    __tablename__ = "guest_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class GuestTimelineEvent(Base):
    __tablename__ = "guest_timeline_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomTypePriceRule(Base):
    __tablename__ = "room_type_price_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_type_id: Mapped[int] = mapped_column(ForeignKey("room_types.id"), unique=True, nullable=False, index=True)
    min_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    max_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
