from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.predictive import (
    CancellationPredictionRequest,
    CancellationPredictionResponse,
    DynamicPriceResponse,
)
from app.models.property_ops import Property
from app.services.pricing_log import log_pricing_decision
from app.services.predictive import calculate_dynamic_price_detail, predict_cancellation_risk

router = APIRouter(prefix="/predictive", tags=["predictive"])


@router.get("/dynamic-price", response_model=DynamicPriceResponse)
def get_dynamic_price(
    room_id: int = Query(...),
    target_date: date = Query(...),
    property_id: int | None = Query(None),
    area_name: str | None = Query(None),
    db: Session = Depends(get_db),
) -> DynamicPriceResponse:
    resolved_area = area_name
    if property_id is not None:
        prop = db.get(Property, property_id)
        if prop is not None:
            resolved_area = prop.area_name
    detail = calculate_dynamic_price_detail(
        room_id=room_id,
        target_date=target_date,
        db=db,
        area_name=resolved_area,
    )
    log_pricing_decision(
        db,
        source="dynamic_price",
        property_id=detail.get("property_id"),
        room_id=room_id,
        room_type_id=detail.get("room_type_id"),
        target_date=target_date,
        raw_price=detail.get("raw_model_price"),
        final_price=detail.get("recommended_price"),
        applied_rules=detail.get("applied_rules"),
        context={
            "base_price": str(detail.get("base_price")),
            "area_name": detail.get("area_name"),
            "model_boost_applied": detail.get("model_boost_applied"),
            "competitor_rows_used": detail.get("competitor_rows_used"),
        },
    )
    db.commit()
    return DynamicPriceResponse(
        room_id=room_id,
        target_date=target_date,
        recommended_price=detail["recommended_price"],
        raw_model_price=detail["raw_model_price"],
        applied_rules=detail.get("applied_rules") or [],
        competitor_avg_nightly=detail.get("competitor_avg_nightly"),
        occupancy_rate_room_type=detail.get("occupancy_rate_room_type"),
    )


@router.post("/cancellation-risk", response_model=CancellationPredictionResponse)
def get_cancellation_risk(
    payload: CancellationPredictionRequest,
    db: Session = Depends(get_db),
) -> CancellationPredictionResponse:
    return CancellationPredictionResponse(**predict_cancellation_risk(payload.model_dump(), db=db))
