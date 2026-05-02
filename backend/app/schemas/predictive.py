from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class DynamicPriceResponse(BaseModel):
    room_id: int
    target_date: date
    recommended_price: Decimal
    raw_model_price: Decimal | None = None
    applied_rules: list[str] = Field(default_factory=list)
    competitor_avg_nightly: Decimal | None = None
    occupancy_rate_room_type: Decimal | None = None


class CancellationPredictionRequest(BaseModel):
    room_id: int
    check_in: date
    check_out: date
    total_price: Decimal


class CancellationPredictionResponse(BaseModel):
    cancellation_risk: str
    reason: str
    room_id: int | None = None
    booked_nightly_rate: Decimal | None = None
    competitor_avg_nightly_rate: Decimal | None = None
    price_gap_ratio: Decimal | None = None
    occupancy_rate: Decimal | None = None
