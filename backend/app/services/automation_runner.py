"""Scheduled jobs: morning digest + threshold evaluation with cooldown dedupe."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.property_ops import Property, ThresholdNotifyDedupe
from app.services.alerts_engine import evaluate_thresholds, fire_webhook
from app.services.automation_digest import build_morning_digest
from app.services.automation_metrics import compute_alert_inputs
from app.services.automation_notify import send_digest_notifications, send_threshold_alert_notifications


def _scope_key(property_id: int | None) -> str:
    return "all" if property_id is None else str(property_id)


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _past_cooldown(db: Session, threshold_id: int, property_scope: str) -> bool:
    row = db.scalar(
        select(ThresholdNotifyDedupe).where(
            ThresholdNotifyDedupe.threshold_id == threshold_id,
            ThresholdNotifyDedupe.property_scope == property_scope,
        )
    )
    if row is None:
        return True
    delta = datetime.now(timezone.utc) - _to_utc(row.last_fired_at)
    return delta >= timedelta(hours=max(1, settings.automation_alert_cooldown_hours))


def _mark_fired(db: Session, threshold_id: int, property_scope: str) -> None:
    now = datetime.now(timezone.utc)
    row = db.scalar(
        select(ThresholdNotifyDedupe).where(
            ThresholdNotifyDedupe.threshold_id == threshold_id,
            ThresholdNotifyDedupe.property_scope == property_scope,
        )
    )
    if row:
        row.last_fired_at = now
    else:
        db.add(ThresholdNotifyDedupe(threshold_id=threshold_id, property_scope=property_scope, last_fired_at=now))
    db.commit()


def run_scheduled_digest(db: Session) -> dict:
    out: dict = {"sent": []}
    scope_mode = (settings.automation_digest_scope or "combined").strip().lower()
    if scope_mode == "each_property":
        props = db.scalars(select(Property).order_by(Property.id.asc())).all()
        for p in props:
            subject, body = build_morning_digest(db, p.id)
            send_digest_notifications(subject, body)
            out["sent"].append({"property_id": p.id, "subject": subject})
    else:
        subject, body = build_morning_digest(db, None)
        send_digest_notifications(subject, body)
        out["sent"].append({"property_id": None, "subject": subject})
    return out


def run_scheduled_threshold_evaluation(db: Session) -> dict:
    props = db.scalars(select(Property).order_by(Property.id.asc())).all()
    scopes: list[int | None] = [None] + [p.id for p in props]
    summary_items: list[dict] = []

    for pid in scopes:
        occ, high_risk = compute_alert_inputs(db, pid)
        triggered = evaluate_thresholds(
            db=db,
            property_id=pid,
            occupancy_pct=occ,
            high_risk_booking_count=high_risk,
        )
        sk = _scope_key(pid)
        prop_label = "All properties" if pid is None else next((p.name for p in props if p.id == pid), str(pid))

        fired_payloads: list[dict] = []
        notify_lines: list[str] = ["[Threshold breach]", prop_label, ""]

        for item in triggered:
            tid = int(item["threshold_id"])
            if not _past_cooldown(db, tid, sk):
                continue
            envelope = {"alert": item, "occupancy_pct": occ, "high_risk": high_risk, "property_id": pid}
            url = item.get("webhook_url")
            if url:
                fire_webhook(url, envelope)
            _mark_fired(db, tid, sk)
            fired_payloads.append(envelope)
            notify_lines.append(item.get("message", ""))
            summary_items.append({**item, "property_id": pid})

        if fired_payloads:
            notify_lines.extend(["", f"occupancy_pct={occ}", f"high_risk_recent_scan={high_risk}"])
            send_threshold_alert_notifications(
                notify_lines,
                {"property_scope": sk, "property_id": pid, "alerts": fired_payloads},
            )

    return {"triggered_count": len(summary_items), "items": summary_items}
