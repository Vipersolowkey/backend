from __future__ import annotations

import httpx
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.property_ops import AlertThreshold


def fetch_applicable_thresholds(db: Session, property_id: int | None) -> list[AlertThreshold]:
    stmt = select(AlertThreshold).where(AlertThreshold.enabled.is_(True))
    if property_id is not None:
        stmt = stmt.where(or_(AlertThreshold.property_id.is_(None), AlertThreshold.property_id == property_id))
    else:
        stmt = stmt.where(AlertThreshold.property_id.is_(None))
    stmt = stmt.order_by(AlertThreshold.id.asc())
    return list(db.scalars(stmt).all())


def evaluate_thresholds(
    *,
    db: Session,
    property_id: int | None,
    occupancy_pct: float | None,
    high_risk_booking_count: int,
) -> list[dict]:
    """Return triggered alert dicts: metric_key, message, threshold_value, webhook_url."""
    rows = fetch_applicable_thresholds(db, property_id)
    triggered: list[dict] = []
    for row in rows:
        key = row.metric_key.strip().lower()
        tv = float(row.threshold_value)
        if key == "occupancy_below_pct":
            if occupancy_pct is None:
                continue
            if occupancy_pct < tv:
                triggered.append(
                    {
                        "metric_key": row.metric_key,
                        "message": f"Occupancy {occupancy_pct:.1f}% is below threshold {tv:.1f}%.",
                        "threshold_value": tv,
                        "webhook_url": row.webhook_url,
                        "threshold_id": row.id,
                    }
                )
        elif key in ("high_risk_bookings_min", "high_risk_bookings_above"):
            if high_risk_booking_count >= tv:
                triggered.append(
                    {
                        "metric_key": row.metric_key,
                        "message": f"HIGH-risk booking count {high_risk_booking_count} meets/exceeds threshold {int(tv)}.",
                        "threshold_value": tv,
                        "webhook_url": row.webhook_url,
                        "threshold_id": row.id,
                    }
                )
    return triggered


def fire_webhook(url: str, payload: dict) -> None:
    try:
        httpx.post(url, json=payload, timeout=8.0)
    except Exception:
        pass
