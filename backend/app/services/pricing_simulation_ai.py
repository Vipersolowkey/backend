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

PRICING_SIM_SYSTEM = """You are a hotel pricing simulation engine.

Your task is to estimate the impact of a pricing or marketing change described in the scenario.

Rules:
- Use only the context numbers provided. State clearly when an outcome is an estimate, not a guarantee.
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


def _collect_context(db: Session, *, area_name: str, room_type_hint: str | None) -> dict:
    today = date.today()
    rt = _resolve_room_type(db, room_type_hint)

    total_rooms = db.scalar(select(func.count(Room.id))) or 0
    occupied = (
        db.scalar(
            select(func.count(func.distinct(Booking.room_id))).where(
                Booking.status.in_(tuple(ACTIVE_BOOKING_STATUSES)),
                Booking.check_in <= today,
                Booking.check_out > today,
            )
        )
        or 0
    )
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

    return (
        "📊 Simulation Result:\n"
        f"- Occupancy change: {'+' if occ_delta >= 0 else ''}{occ_delta:.1f}%\n"
        f"- Revenue change: {'+' if rev_delta >= 0 else ''}{rev_delta:.1f}%\n\n"
        "🧠 Reasoning:\n"
        f"- {reason}\n"
        f"- Baseline proxy occupancy {context['occupancy']['occupancy_percent_proxy']:.1f}% and BAR {context['current_price']:.2f} for {context['room_type']['name']}.\n\n"
        "📌 Conclusion:\n"
        f"- {apply} — heuristic model only; configure LLM for scenario-specific refinement.\n"
    )


def generate_pricing_simulation(
    *, db: Session, area_name: str = "Nha Trang", room_type: str | None = None, scenario_input: str = ""
) -> dict[str, str]:
    context = _collect_context(db, area_name=area_name, room_type_hint=room_type)
    user_prompt = _build_user_prompt(context, scenario_input)
    try:
        text, model_used = generate_text(user_prompt, PRICING_SIM_SYSTEM)
        return {"analysis": text.strip(), "model_used": model_used}
    except LlmUnavailableError:
        return {"analysis": _heuristic_simulation(context, scenario_input), "model_used": "heuristic_fallback"}
