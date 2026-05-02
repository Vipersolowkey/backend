from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import MonthlyRevenueSummary
from app.models.competitor_data import CompetitorData
from app.models.pms import Booking, Room, RoomType
from app.services.llm import LlmUnavailableError, generate_text
from app.services.predictive import ACTIVE_BOOKING_STATUSES

DEMAND_SCENARIOS: dict[str, dict[str, float | str]] = {
    "baseline": {"occ": 1.0, "rev": 1.0, "copy": "Neutral baseline demand."},
    "holiday_peak": {"occ": 1.35, "rev": 1.12, "copy": "Peak leisure / holiday compression increases promo sensitivity."},
    "low_season": {"occ": 0.75, "rev": 0.9, "copy": "Low season — harder to lift occupancy without sharper incentives."},
    "rainy_week": {"occ": 0.85, "rev": 0.92, "copy": "Weather-soft demand week for leisure segments."},
    "major_event": {"occ": 1.2, "rev": 1.18, "copy": "City-wide event lifts compression and BAR power."},
}

PRICING_SIM_SYSTEM = """You are a hotel pricing simulation engine.

Your task is to estimate the impact of a pricing or marketing change described in the scenario.

Rules:
- Use only the context numbers provided. State clearly when an outcome is an estimate, not a guarantee.
- A demand scenario label is included (baseline, holiday peaks, low season, etc.) — reflect it in your qualitative reasoning.
- Predict directional impact on occupancy and revenue (percentage change is fine).
- Keep reasoning brief and tied to the scenario + competitor and demand context.
- Avoid generic filler.

Output format (use exactly these section headers):

📊 Simulation Result:
- Occupancy change: +X% / -X%
- Revenue change: +X% / -X%

🧠 Reasoning:
- ...

📌 Conclusion:
- Should apply / Should not apply
(and one short line of justification)
"""


def _json_default(obj: object) -> str | float | int:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(type(obj))


def _resolve_room_type(db: Session, room_type_hint: str | None) -> RoomType:
    if room_type_hint:
        h = room_type_hint.strip()
        if len(h) <= 3:
            row = db.scalar(select(RoomType).where(RoomType.code == h.upper()))
            if row:
                return row
        row = db.scalar(select(RoomType).where(RoomType.name.ilike(f"%{h}%")))
        if row:
            return row
    row = db.scalar(select(RoomType).order_by(RoomType.id.asc()))
    if row is None:
        raise ValueError("No room types in database.")
    return row


def _collect_context(
    db: Session,
    *,
    area_name: str,
    room_type_hint: str | None,
    property_id: int | None,
    demand_scenario: str,
) -> dict:
    today = date.today()
    rt = _resolve_room_type(db, room_type_hint)

    q_rooms = select(func.count(Room.id)).where(Room.status != "inactive")
    if property_id is not None:
        q_rooms = q_rooms.where(Room.property_id == property_id)
    total_rooms = db.scalar(q_rooms) or 0

    occ_stmt = (
        select(func.count(func.distinct(Booking.room_id)))
        .join(Room, Room.id == Booking.room_id)
        .where(
            Booking.status.in_(tuple(ACTIVE_BOOKING_STATUSES)),
            Booking.check_in <= today,
            Booking.check_out > today,
            Room.status != "inactive",
        )
    )
    if property_id is not None:
        occ_stmt = occ_stmt.where(Room.property_id == property_id)
    occupied = db.scalar(occ_stmt) or 0
    occupancy_pct = round(100.0 * float(occupied) / float(total_rooms), 2) if total_rooms else 0.0

    rev_rows = db.scalars(
        select(MonthlyRevenueSummary).order_by(MonthlyRevenueSummary.year.desc(), MonthlyRevenueSummary.id.desc()).limit(8)
    ).all()
    chronological = list(reversed(rev_rows))
    demand_data = [
        {
            "period": f"{r.month_name} {r.year}",
            "total_estimated_revenue_proxy": float(r.total_estimated_revenue),
            "avg_adr_market_mix": float(r.avg_adr),
            "avg_stay_nights": float(r.avg_stay_nights),
        }
        for r in chronological
    ]

    comp_rows = db.scalars(
        select(CompetitorData)
        .where(CompetitorData.search_area == area_name)
        .order_by(CompetitorData.scraped_at.desc())
        .limit(15)
    ).all()
    competitor_prices = [
        {
            "hotel_name": r.hotel_name,
            "source": r.source,
            "price": float(r.current_price) if r.current_price is not None else None,
            "currency": r.currency,
            "availability": r.availability_status,
        }
        for r in comp_rows
    ]

    scen = DEMAND_SCENARIOS.get(demand_scenario, DEMAND_SCENARIOS["baseline"])

    return {
        "room_type": {"code": rt.code, "name": rt.name},
        "current_price": float(rt.base_price),
        "occupancy": {
            "occupancy_percent_proxy": occupancy_pct,
            "rooms_sold_tonight": int(occupied),
            "total_rooms": int(total_rooms),
        },
        "demand_data": demand_data,
        "competitor_prices": competitor_prices,
        "demand_scenario": demand_scenario,
        "demand_scenario_notes": str(scen["copy"]),
        "property_id_filter": property_id,
        "date_context": {
            "today_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%MZ"),
            "market_area": area_name,
        },
    }


def _build_user_prompt(context: dict, scenario_input: str) -> str:
    return f"""Current context:
- Room type: {json.dumps(context["room_type"], ensure_ascii=False)}
- Current price: {context["current_price"]}
- Occupancy rate: {json.dumps(context["occupancy"], default=_json_default, ensure_ascii=False)}
- Historical demand: {json.dumps(context["demand_data"], default=_json_default, ensure_ascii=False)}
- Competitor prices: {json.dumps(context["competitor_prices"], default=_json_default, ensure_ascii=False)}
- Demand scenario: {context.get("demand_scenario", "baseline")} — {context.get("demand_scenario_notes", "")}

Scenario:
{scenario_input.strip()}
"""


def _heuristic_simulation(context: dict, scenario: str) -> str:
    scen = scenario.lower()
    occ_delta = 1.5
    rev_delta = 2.0
    apply = "Should apply"

    if any(k in scen for k in ("discount", "giảm giá", "giảm", "promo", "sale", "% off")):
        m = re.search(r"(\d+)\s*%", scenario)
        pct = float(m.group(1)) / 100.0 if m else 0.08
        occ_delta = min(8.0, 2.0 + pct * 40)
        rev_delta = -min(5.0, pct * 25) + occ_delta * 0.4
        reason = "Price cuts usually lift occupancy in the short run but can dilute ADR; net revenue direction depends on elasticity in your demand sample."
    elif any(k in scen for k in ("increase price", "raise", "tăng giá", "premium")):
        occ_delta = -2.5
        rev_delta = 3.0
        reason = "Raising BAR typically trims occupancy slightly while supporting revenue if demand is inelastic vs competitors shown."
    elif any(k in scen for k in ("package", "bundle", "breakfast", "marketing", "campaign")):
        occ_delta = 2.0
        rev_delta = 4.5
        reason = "Value-add bundles often improve conversion without pure discounting, supporting both occupancy and total revenue."
    else:
        reason = "Scenario is neutral vs common patterns; small positive trial is reasonable before committing budget."
        apply = "Should apply"

    if rev_delta < -1 and occ_delta > 3:
        apply = "Should not apply" if rev_delta < -3 else "Should apply"

    bias = DEMAND_SCENARIOS.get(context.get("demand_scenario", "baseline"), DEMAND_SCENARIOS["baseline"])
    occ_delta *= float(bias["occ"])
    rev_delta *= float(bias["rev"])
    scen_note = str(bias["copy"])

    return (
        "📊 Simulation Result:\n"
        f"- Occupancy change: {'+' if occ_delta >= 0 else ''}{occ_delta:.1f}%\n"
        f"- Revenue change: {'+' if rev_delta >= 0 else ''}{rev_delta:.1f}%\n\n"
        "🧠 Reasoning:\n"
        f"- {reason}\n"
        f"- Demand scenario adjustment: {scen_note}\n"
        f"- Baseline proxy occupancy {context['occupancy']['occupancy_percent_proxy']:.1f}% and BAR {context['current_price']:.2f} for {context['room_type']['name']}.\n\n"
        "📌 Conclusion:\n"
        f"- {apply} — heuristic model only; configure LLM for scenario-specific refinement.\n"
    )


def generate_pricing_simulation(
    *,
    db: Session,
    area_name: str = "Nha Trang",
    room_type: str | None = None,
    scenario_input: str = "",
    demand_scenario: str = "baseline",
    property_id: int | None = None,
) -> dict[str, str | dict]:
    from app.models.property_ops import Property

    resolved_area = area_name
    if property_id is not None:
        prop = db.get(Property, property_id)
        if prop is not None:
            resolved_area = prop.area_name

    ds = demand_scenario if demand_scenario in DEMAND_SCENARIOS else "baseline"
    context = _collect_context(
        db,
        area_name=resolved_area,
        room_type_hint=room_type,
        property_id=property_id,
        demand_scenario=ds,
    )
    user_prompt = _build_user_prompt(context, scenario_input)
    grounding = {
        "occupancy_proxy": context["occupancy"],
        "competitor_prices_sample": context["competitor_prices"][:10],
        "demand_history_months": context["demand_data"],
        "demand_scenario": ds,
        "property_id_filter": property_id,
        "note": "Simulation percentages should remain consistent with these proxy figures.",
    }
    try:
        text, model_used = generate_text(user_prompt, PRICING_SIM_SYSTEM)
        return {"analysis": text.strip(), "model_used": model_used, "data_grounding": grounding}
    except LlmUnavailableError:
        return {
            "analysis": _heuristic_simulation(context, scenario_input),
            "model_used": "heuristic_fallback",
            "data_grounding": grounding,
        }
