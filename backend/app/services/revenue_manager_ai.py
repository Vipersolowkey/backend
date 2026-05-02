from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import CancellationSummary, MonthlyRevenueSummary
from app.models.competitor_data import CompetitorData
from app.models.pms import Booking, Room
from app.services.llm import LlmUnavailableError, generate_text
from app.services.predictive import ACTIVE_BOOKING_STATUSES

REVENUE_MANAGER_SYSTEM = """You are an AI Revenue Manager for a hotel.
Your job is to analyze hotel performance data and recommend specific actions to maximize revenue and occupancy.

Rules:
- Base conclusions on the numeric and tabular data provided. Do not invent competitor names or figures that are not in the input.
- Identify concrete problems or opportunities implied by the data (e.g. high cancellation share, ADR vs competitor snapshot, occupancy slack).
- Recommend 3-5 specific actions. Each must include: What to do, Reason, Expected Impact.
- Be concise, practical, and business-oriented. Avoid generic advice ("improve service" without tying to data).

Output format (use exactly these section headers and structure):

⚠️ Key Insights:
- ...

📌 Recommended Actions:
1. Action: ...
   Reason: ...
   Expected Impact: ...

2. Action: ...
   Reason: ...
   Expected Impact: ...

(Continue numbering up to 5 actions as needed.)
"""


def _json_default(obj: object) -> str | float | int:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(type(obj))


def _collect_inputs(db: Session, area_name: str) -> dict:
    today = date.today()

    rev_rows = db.scalars(
        select(MonthlyRevenueSummary).order_by(MonthlyRevenueSummary.year.desc(), MonthlyRevenueSummary.id.desc()).limit(8)
    ).all()
    chronological = list(reversed(rev_rows))
    revenue_data = [
        {
            "period": f"{r.month_name} {r.year}",
            "total_estimated_revenue": r.total_estimated_revenue,
            "avg_adr": r.avg_adr,
            "avg_stay_nights": r.avg_stay_nights,
        }
        for r in chronological
    ]

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

    cancel_rows = db.scalars(select(CancellationSummary).limit(80)).all()
    total_bookings = sum(int(r.total_bookings) for r in cancel_rows) or 0
    canceled_bookings = sum(int(r.canceled_bookings) for r in cancel_rows) or 0
    cancellation_rate_pct = (
        round(100.0 * float(canceled_bookings) / float(total_bookings), 2) if total_bookings else 0.0
    )

    upcoming = db.scalars(
        select(Booking)
        .where(
            Booking.status.in_(tuple(ACTIVE_BOOKING_STATUSES)),
            Booking.check_in >= today,
        )
        .order_by(Booking.check_in.asc())
        .limit(15)
    ).all()
    booking_data = [
        {
            "booking_id": b.booking_id,
            "check_in": b.check_in.isoformat(),
            "check_out": b.check_out.isoformat(),
            "status": b.status,
            "total_price": b.total_price,
        }
        for b in upcoming
    ]

    comp_rows = db.scalars(
        select(CompetitorData)
        .where(CompetitorData.search_area == area_name)
        .order_by(CompetitorData.scraped_at.desc())
        .limit(12)
    ).all()
    competitor_data = [
        {
            "hotel_name": r.hotel_name,
            "source": r.source,
            "current_price": float(r.current_price) if r.current_price is not None else None,
            "currency": r.currency,
            "availability_status": r.availability_status,
        }
        for r in comp_rows
    ]

    date_context = {
        "today_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%MZ"),
        "market_area_focus": area_name,
    }

    return {
        "revenue_data": revenue_data,
        "occupancy": {
            "rooms_sold_tonight_proxy": int(occupied),
            "total_rooms": int(total_rooms),
            "occupancy_percent_of_inventory": occupancy_pct,
        },
        "cancellation_rate": {
            "aggregate_cancellation_rate_pct_sample": cancellation_rate_pct,
            "sample_rows_used": len(cancel_rows),
        },
        "booking_data": booking_data,
        "competitor_data": competitor_data,
        "date_context": date_context,
    }


def _build_user_prompt(data: dict) -> str:
    return f"""Analyze the following hotel performance snapshot and produce your briefing.

Input data:
- Revenue trend: {json.dumps(data["revenue_data"], default=_json_default, ensure_ascii=False)}
- Occupancy rate: {json.dumps(data["occupancy"], default=_json_default, ensure_ascii=False)}
- Cancellation rate: {json.dumps(data["cancellation_rate"], default=_json_default, ensure_ascii=False)}
- Upcoming bookings: {json.dumps(data["booking_data"], default=_json_default, ensure_ascii=False)}
- Competitor pricing: {json.dumps(data["competitor_data"], default=_json_default, ensure_ascii=False)}
- Seasonality / date context: {json.dumps(data["date_context"], default=_json_default, ensure_ascii=False)}
"""


def _heuristic_brief(data: dict) -> str:
    occ = data["occupancy"]
    rev = data["revenue_data"]
    cancel = data["cancellation_rate"]
    upcoming_n = len(data["booking_data"])
    comp_n = len(data["competitor_data"])
    last_rev = rev[-1] if rev else {}

    lines_insight = [
        f"Latest period in sample: {last_rev.get('period', 'n/a')} with estimated revenue {last_rev.get('total_estimated_revenue', 'n/a')} and ADR {last_rev.get('avg_adr', 'n/a')}.",
        f"Night occupancy proxy: {occ.get('occupancy_percent_of_inventory', 0)}% of {occ.get('total_rooms', 0)} rooms ({occ.get('rooms_sold_tonight_proxy', 0)} rooms with in-stay bookings today).",
        f"Historical cancellation rate (aggregated sample): {cancel.get('aggregate_cancellation_rate_pct_sample', 0)}% across {cancel.get('sample_rows_used', 0)} summary rows.",
        f"Forward book: {upcoming_n} upcoming active bookings in the next window; competitor snapshot rows: {comp_n} for this market.",
    ]

    actions = [
        (
            "Tighten BAR / LOS rules for high-risk dates",
            "Cancellation sample shows leakage; protecting inventory on peak nights reduces spoilage.",
            "Protect ADR on compression nights; fewer last-minute gaps.",
        ),
        (
            "Targeted upsell on upcoming stays",
            f"{upcoming_n} future stays are visible — pre-arrival bundles improve RevPAR without discounting room.",
            "Higher ancillary revenue and stickier guest experience.",
        ),
        (
            "Reprice vs competitor snapshot",
            "Use listed competitor prices in the same area to avoid under-selling when demand allows.",
            "Revenue lift when market allows a higher floor.",
        ),
    ]

    insight_block = "\n".join(f"- {line}" for line in lines_insight)
    action_blocks = []
    for i, (act, reason, impact) in enumerate(actions, start=1):
        action_blocks.append(
            f"{i}. Action: {act}\n   Reason: {reason}\n   Expected Impact: {impact}"
        )
    actions_str = "\n\n".join(action_blocks)

    return (
        "⚠️ Key Insights:\n"
        f"{insight_block}\n\n"
        "📌 Recommended Actions:\n"
        f"{actions_str}\n\n"
        "(Heuristic brief — configure GROQ_API_KEY for full AI analysis.)"
    )


def generate_revenue_manager_brief(*, db: Session, area_name: str = "Nha Trang") -> dict[str, str | dict]:
    data = _collect_inputs(db, area_name=area_name)
    user_prompt = _build_user_prompt(data)
    grounding = {
        "revenue_trend_rows": data["revenue_data"],
        "occupancy_snapshot": data["occupancy"],
        "cancellation_aggregate": data["cancellation_rate"],
        "competitor_snapshot": data["competitor_data"],
        "upcoming_bookings_sample": data["booking_data"][:8],
        "note": "LLM/heuristic brief must align with these figures; do not invent hotels or periods outside this snapshot.",
    }
    try:
        text, model_used = generate_text(user_prompt, REVENUE_MANAGER_SYSTEM)
        return {"analysis": text.strip(), "model_used": model_used, "data_grounding": grounding}
    except LlmUnavailableError:
        return {"analysis": _heuristic_brief(data), "model_used": "heuristic_fallback", "data_grounding": grounding}
