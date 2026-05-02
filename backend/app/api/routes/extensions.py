from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.pms import Booking, Guest, Room
from app.models.property_ops import AlertThreshold, GuestNote, GuestTag, GuestTimelineEvent, PricingDecisionLog, Property, RoomTypePriceRule
from app.services.alerts_engine import evaluate_thresholds, fire_webhook
from app.services.automation_metrics import compute_alert_inputs
from app.services.report_exports import build_export_csv_bundle, build_export_workbook, occupancy_calendar_days

router = APIRouter(tags=["operations"])


class AlertThresholdCreate(BaseModel):
    property_id: int | None = None
    metric_key: str = Field(..., min_length=3, max_length=64)
    threshold_value: Decimal
    enabled: bool = True
    webhook_url: str | None = None


class AlertThresholdPatch(BaseModel):
    threshold_value: Decimal | None = None
    enabled: bool | None = None
    webhook_url: str | None = None


class AlertEvaluateRequest(BaseModel):
    property_id: int | None = None


class GuestNoteCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=8000)
    author_label: str | None = Field(None, max_length=120)


class GuestTagCreate(BaseModel):
    tag: str = Field(..., min_length=1, max_length=80)


class GuestTimelineCreate(BaseModel):
    event_type: str = Field(..., min_length=2, max_length=64)
    detail: str = Field(..., min_length=1, max_length=4000)


class RoomPriceRulePayload(BaseModel):
    min_price: Decimal = Field(..., gt=0)
    max_price: Decimal = Field(..., gt=0)


@router.get("/properties", summary="List properties / areas")
def list_properties(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Property).order_by(Property.id.asc())).all()
    return [{"id": r.id, "name": r.name, "code": r.code, "area_name": r.area_name} for r in rows]


@router.get("/calendar/occupancy")
def calendar_occupancy(
    year: int = Query(..., ge=2020, le=2035),
    month: int = Query(..., ge=1, le=12),
    property_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> dict:
    return {"year": year, "month": month, "days": occupancy_calendar_days(db, year, month, property_id)}


@router.get("/reports/export.xlsx")
def export_xlsx(
    property_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> Response:
    data = build_export_workbook(db, property_id=property_id)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="hotel_analytics_export.xlsx"'},
    )


@router.get("/reports/export.csv")
def export_csv(
    property_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> Response:
    data = build_export_csv_bundle(db, property_id=property_id)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="monthly_revenue_summary.csv"'},
    )


@router.get("/pricing-decisions")
def pricing_decisions(
    limit: int = Query(100, ge=1, le=500),
    property_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> list[dict]:
    stmt = select(PricingDecisionLog).order_by(PricingDecisionLog.id.desc()).limit(limit)
    if property_id is not None:
        stmt = stmt.where(PricingDecisionLog.property_id == property_id)
    rows = db.scalars(stmt).all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "source": r.source,
            "property_id": r.property_id,
            "room_id": r.room_id,
            "room_type_id": r.room_type_id,
            "target_date": r.target_date.isoformat() if r.target_date else None,
            "raw_price": float(r.raw_price) if r.raw_price is not None else None,
            "final_price": float(r.final_price) if r.final_price is not None else None,
            "scenario_label": r.scenario_label,
            "demand_scenario": r.demand_scenario,
            "applied_rules_json": r.applied_rules_json,
        }
        for r in rows
    ]


@router.get("/alert-thresholds")
def alert_thresholds_list(
    property_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> list[dict]:
    stmt = select(AlertThreshold).order_by(AlertThreshold.id.asc())
    if property_id is not None:
        stmt = stmt.where(or_(AlertThreshold.property_id == property_id, AlertThreshold.property_id.is_(None)))
    rows = db.scalars(stmt).all()
    return [
        {
            "id": r.id,
            "property_id": r.property_id,
            "metric_key": r.metric_key,
            "threshold_value": float(r.threshold_value),
            "enabled": r.enabled,
            "webhook_url": r.webhook_url,
        }
        for r in rows
    ]


@router.post("/alert-thresholds")
def alert_thresholds_create(payload: AlertThresholdCreate, db: Session = Depends(get_db)) -> dict:
    row = AlertThreshold(
        property_id=payload.property_id,
        metric_key=payload.metric_key.strip(),
        threshold_value=payload.threshold_value,
        enabled=payload.enabled,
        webhook_url=payload.webhook_url,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.patch("/alert-thresholds/{threshold_id}")
def alert_thresholds_patch(
    threshold_id: int,
    payload: AlertThresholdPatch,
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(AlertThreshold, threshold_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Threshold not found")
    if payload.threshold_value is not None:
        row.threshold_value = payload.threshold_value
    if payload.enabled is not None:
        row.enabled = payload.enabled
    if payload.webhook_url is not None:
        row.webhook_url = payload.webhook_url
    db.commit()
    return {"ok": True}


@router.post("/alert-thresholds/evaluate")
def alert_thresholds_evaluate(
    payload: AlertEvaluateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    occ, high_risk = compute_alert_inputs(db, payload.property_id)

    triggered = evaluate_thresholds(
        db=db,
        property_id=payload.property_id,
        occupancy_pct=occ,
        high_risk_booking_count=high_risk,
    )
    for item in triggered:
        url = item.get("webhook_url")
        if url:
            background_tasks.add_task(fire_webhook, url, {"alert": item, "occupancy_pct": occ, "high_risk": high_risk})

    return {
        "occupancy_pct": occ,
        "high_risk_booking_count": high_risk,
        "triggered": triggered,
    }


@router.get("/guests")
def guests_list(
    limit: int = Query(40, ge=1, le=200),
    property_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> list[dict]:
    stmt = select(Guest).join(Booking, Booking.guest_id == Guest.id).join(Room, Room.id == Booking.room_id)
    if property_id is not None:
        stmt = stmt.where(Room.property_id == property_id)
    stmt = stmt.distinct().order_by(Guest.id.desc()).limit(limit)
    rows = db.scalars(stmt).all()
    return [
        {
            "id": g.id,
            "full_name": g.full_name,
            "email": g.email,
            "country_code": g.country_code,
        }
        for g in rows
    ]


@router.get("/guests/{guest_id}/crm")
def guest_crm_detail(guest_id: int, db: Session = Depends(get_db)) -> dict:
    guest = db.get(Guest, guest_id)
    if guest is None:
        raise HTTPException(status_code=404, detail="Guest not found")
    tags = [r.tag for r in db.scalars(select(GuestTag).where(GuestTag.guest_id == guest_id)).all()]
    notes = db.scalars(select(GuestNote).where(GuestNote.guest_id == guest_id).order_by(GuestNote.id.desc())).all()
    events = db.scalars(
        select(GuestTimelineEvent)
        .where(GuestTimelineEvent.guest_id == guest_id)
        .order_by(GuestTimelineEvent.occurred_at.desc())
        .limit(80),
    ).all()
    return {
        "guest": {
            "id": guest.id,
            "full_name": guest.full_name,
            "email": guest.email,
            "country_code": guest.country_code,
        },
        "tags": tags,
        "notes": [
            {"id": n.id, "body": n.body, "author_label": n.author_label, "created_at": n.created_at.isoformat()}
            for n in notes
        ],
        "timeline": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "detail": e.detail,
                "occurred_at": e.occurred_at.isoformat(),
            }
            for e in events
        ],
    }


@router.post("/guests/{guest_id}/notes")
def guest_add_note(guest_id: int, payload: GuestNoteCreate, db: Session = Depends(get_db)) -> dict:
    if db.get(Guest, guest_id) is None:
        raise HTTPException(status_code=404, detail="Guest not found")
    row = GuestNote(guest_id=guest_id, body=payload.body.strip(), author_label=payload.author_label)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.post("/guests/{guest_id}/tags")
def guest_add_tag(guest_id: int, payload: GuestTagCreate, db: Session = Depends(get_db)) -> dict:
    if db.get(Guest, guest_id) is None:
        raise HTTPException(status_code=404, detail="Guest not found")
    tag = payload.tag.strip()
    exists = db.scalar(select(GuestTag.id).where(GuestTag.guest_id == guest_id, GuestTag.tag == tag))
    if exists:
        return {"ok": True, "duplicate": True}
    db.add(GuestTag(guest_id=guest_id, tag=tag))
    db.commit()
    return {"ok": True}


@router.delete("/guests/{guest_id}/tags/{tag}")
def guest_remove_tag(guest_id: int, tag: str, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(GuestTag).where(GuestTag.guest_id == guest_id, GuestTag.tag == tag))
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


@router.post("/guests/{guest_id}/timeline")
def guest_add_timeline(guest_id: int, payload: GuestTimelineCreate, db: Session = Depends(get_db)) -> dict:
    if db.get(Guest, guest_id) is None:
        raise HTTPException(status_code=404, detail="Guest not found")
    row = GuestTimelineEvent(
        guest_id=guest_id,
        event_type=payload.event_type.strip(),
        detail=payload.detail.strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.get("/room-type-price-rules")
def price_rules_list(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(RoomTypePriceRule).order_by(RoomTypePriceRule.room_type_id.asc())).all()
    return [
        {
            "id": r.id,
            "room_type_id": r.room_type_id,
            "min_price": float(r.min_price),
            "max_price": float(r.max_price),
        }
        for r in rows
    ]


@router.put("/room-type-price-rules/{room_type_id}")
def price_rules_put(room_type_id: int, payload: RoomPriceRulePayload, db: Session = Depends(get_db)) -> dict:
    if payload.min_price > payload.max_price:
        raise HTTPException(status_code=400, detail="min_price must be <= max_price")
    row = db.scalar(select(RoomTypePriceRule).where(RoomTypePriceRule.room_type_id == room_type_id))
    if row is None:
        row = RoomTypePriceRule(room_type_id=room_type_id, min_price=payload.min_price, max_price=payload.max_price)
        db.add(row)
    else:
        row.min_price = payload.min_price
        row.max_price = payload.max_price
    db.commit()
    return {"ok": True}
