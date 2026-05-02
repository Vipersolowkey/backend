from __future__ import annotations

import json
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.property_ops import PricingDecisionLog


def _json_default(obj: object) -> float | int | str:
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)


def log_pricing_decision(
    db: Session,
    *,
    source: str,
    property_id: int | None,
    room_id: int | None,
    room_type_id: int | None,
    target_date: date | None,
    raw_price: Decimal | None,
    final_price: Decimal | None,
    scenario_label: str | None = None,
    demand_scenario: str | None = None,
    applied_rules: list[str] | None = None,
    context: dict | None = None,
) -> PricingDecisionLog:
    row = PricingDecisionLog(
        property_id=property_id,
        room_id=room_id,
        room_type_id=room_type_id,
        target_date=target_date,
        source=source,
        raw_price=raw_price,
        final_price=final_price,
        scenario_label=scenario_label,
        demand_scenario=demand_scenario,
        applied_rules_json=json.dumps(applied_rules or [], ensure_ascii=False),
        context_json=json.dumps(context or {}, default=_json_default, ensure_ascii=False),
    )
    db.add(row)
    return row
