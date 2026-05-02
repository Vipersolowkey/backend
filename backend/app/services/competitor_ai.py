from __future__ import annotations

import json
from collections import Counter
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.competitor_data import CompetitorData
from app.schemas.ai import CompetitorInsightRequest
from app.services.llm import LlmUnavailableError, generate_text


PRAISE_KEYWORDS = {
    "clean": "Clean rooms and hygiene",
    "friendly": "Friendly and helpful staff",
    "location": "Good location and accessibility",
    "view": "Nice view and scenery",
    "breakfast": "Breakfast quality",
    "spacious": "Spacious rooms",
    "quiet": "Quiet atmosphere",
    "wifi": "Reliable wifi",
}

COMPLAINT_KEYWORDS = {
    "noisy": "Noise issues",
    "mosquito": "Mosquito or pest issues",
    "small": "Small room size",
    "hard": "Difficult access or navigation",
    "annoy": "Service or cleaning interruptions",
    "old": "Old facilities or outdated rooms",
    "dirty": "Cleanliness concerns",
    "bad": "General service complaints",
}


def _fetch_competitor_rows(
    db: Session,
    area_name: str,
    source: str | None,
    max_hotels: int,
) -> list[CompetitorData]:
    stmt = select(CompetitorData).where(CompetitorData.search_area == area_name)
    if source:
        stmt = stmt.where(CompetitorData.source == source)
    stmt = stmt.order_by(CompetitorData.scraped_at.desc(), CompetitorData.id.desc()).limit(max_hotels)
    return list(db.scalars(stmt).all())


def _collect_review_comments(rows: list[CompetitorData], max_reviews_per_hotel: int) -> list[str]:
    comments: list[str] = []
    for row in rows:
        for review in (row.reviews or [])[:max_reviews_per_hotel]:
            comment = (review or {}).get("comment")
            if comment:
                comments.append(str(comment).strip())
    return comments


def _collect_review_objects(row: CompetitorData, max_reviews: int) -> list[dict]:
    return [
        {
            "comment": review.get("comment"),
            "reviewer": review.get("reviewer"),
            "review_date": review.get("review_date"),
        }
        for review in (row.reviews or [])[:max_reviews]
    ]


def _extract_keyword_points(comments: list[str], mapping: dict[str, str]) -> list[str]:
    counts: Counter[str] = Counter()
    for comment in comments:
        lowered = comment.lower()
        for keyword, label in mapping.items():
            if keyword in lowered:
                counts[label] += 1
    return [label for label, _ in counts.most_common(5)]


def _extract_strengths_and_weaknesses(comments: list[str]) -> tuple[list[str], list[str]]:
    strengths = _extract_keyword_points(comments, PRAISE_KEYWORDS)
    weaknesses = _extract_keyword_points(comments, COMPLAINT_KEYWORDS)
    return strengths[:4], weaknesses[:4]


def _fallback_summary(area_name: str, praise_points: list[str], complaint_points: list[str]) -> str:
    praise_text = ", ".join(praise_points) if praise_points else "service and location"
    complaint_text = ", ".join(complaint_points) if complaint_points else "consistency gaps"
    return (
        f"Competitors in {area_name} are most praised for {praise_text}. "
        f"The most common complaints are {complaint_text}. "
        "Position the hotel around reliability, cleaner guest experience, and clear service guarantees."
    )


def _find_competitor_hotel(db: Session, area_name: str, source: str, hotel_name: str) -> CompetitorData:
    stmt = (
        select(CompetitorData)
        .where(
            CompetitorData.search_area == area_name,
            CompetitorData.source == source,
            CompetitorData.hotel_name == hotel_name,
        )
        .order_by(CompetitorData.scraped_at.desc(), CompetitorData.id.desc())
        .limit(1)
    )
    row = db.scalar(stmt)
    if row is None:
        raise ValueError(f"Competitor hotel not found: {hotel_name}")
    return row


def generate_competitor_insight(db: Session, payload: CompetitorInsightRequest) -> dict:
    rows = _fetch_competitor_rows(
        db=db,
        area_name=payload.area_name,
        source=payload.source,
        max_hotels=payload.max_hotels,
    )
    comments = _collect_review_comments(rows, payload.max_reviews_per_hotel)
    praise_points = _extract_keyword_points(comments, PRAISE_KEYWORDS)
    complaint_points = _extract_keyword_points(comments, COMPLAINT_KEYWORDS)

    summary = _fallback_summary(payload.area_name, praise_points, complaint_points)
    model_used = "heuristic_fallback"

    if comments:
        review_context = json.dumps(comments[:20], ensure_ascii=False)
        prompt = (
            f"Analyze competitor hotel reviews for {payload.area_name}. "
            "Write a concise strategic summary for a hotel revenue manager. "
            "Focus on what guests praise, what they complain about, and how to differentiate.\n\n"
            f"Reviews: {review_context}"
        )
        system_prompt = (
            "You are a hotel market analyst. Return plain text only. "
            "Keep it short, concrete, and action-oriented."
        )
        try:
            summary, model_used = generate_text(prompt=prompt, system_prompt=system_prompt)
        except LlmUnavailableError:
            pass

    grounding_hotels = [
        {
            "hotel_name": row.hotel_name,
            "search_area": row.search_area,
            "current_price": float(row.current_price) if row.current_price is not None else None,
            "currency": row.currency,
            "availability_status": row.availability_status,
            "source": row.source,
        }
        for row in rows[: payload.max_hotels]
    ]

    return {
        "area_name": payload.area_name,
        "source": payload.source,
        "hotels_analyzed": len(rows),
        "reviews_analyzed": len(comments),
        "praise_points": praise_points,
        "complaint_points": complaint_points,
        "strategic_summary": summary,
        "model_used": model_used,
        "data_grounding": {
            "summary": "Rows below are competitor snapshots used for review counts and keyword mining.",
            "hotels": grounding_hotels,
        },
    }


def _format_price(value: Decimal | float | int | None) -> str | None:
    if value is None:
        return None
    return f"{Decimal(str(value)).quantize(Decimal('0.01'))}"


def _hotel_to_card(row: CompetitorData, max_reviews_per_hotel: int) -> dict:
    return {
        "source": row.source,
        "hotel_name": row.hotel_name,
        "search_area": row.search_area,
        "availability_status": row.availability_status,
        "current_price": _format_price(row.current_price),
        "currency": row.currency,
        "hotel_url": row.hotel_url,
        "review_count": len(row.reviews or []),
        "reviews": _collect_review_objects(row, max_reviews_per_hotel),
    }


def get_competitor_hotels(
    db: Session,
    area_name: str,
    source: str | None,
    max_hotels: int,
    max_reviews_per_hotel: int,
) -> dict:
    rows = _fetch_competitor_rows(
        db=db,
        area_name=area_name,
        source=source,
        max_hotels=max_hotels,
    )

    hotels = []
    for row in rows:
        hotels.append(_hotel_to_card(row, max_reviews_per_hotel))

    return {
        "area_name": area_name,
        "source": source,
        "hotels": hotels,
    }


def generate_competitor_hotel_intelligence(
    db: Session,
    area_name: str,
    source: str,
    hotel_name: str,
    max_reviews: int,
) -> dict:
    row = _find_competitor_hotel(db=db, area_name=area_name, source=source, hotel_name=hotel_name)
    comments = [comment for comment in _collect_review_comments([row], max_reviews_per_hotel=max_reviews) if comment]
    strengths, weaknesses = _extract_strengths_and_weaknesses(comments)

    pricing_posture = (
        "Price visibility is limited in the imported data. Position against perceived service value instead of pure rate."
        if row.current_price is None
        else f"Visible price point is {row.currency or '$'} {row.current_price}; benchmark this against your ADR before reacting."
    )
    service_gaps = weaknesses or ["No dominant service gap found in the sampled reviews."]
    positioning_opportunities = [
        "Lead with reliability and consistency in pre-arrival messaging.",
        "Emphasize cleaner rooms, quieter stays, and sharper service recovery.",
        "Package convenience and service assurance instead of competing only on rate.",
    ]
    recommended_actions = [
        "Train front desk to counter the competitor's strongest perceived advantage.",
        "Use retention offers only when the guest is rate-sensitive and high risk.",
        "Mirror praised amenities in ad copy, but differentiate on consistency.",
    ]
    marketing_hooks = [
        "Stress guaranteed cleanliness and calmer sleep quality.",
        "Promote attentive service and a smoother arrival experience.",
        "Frame the stay as lower-friction and more dependable than nearby alternatives.",
    ]
    executive_summary = (
        f"{row.hotel_name} is strongest on {', '.join(strengths) if strengths else 'general guest experience'}, "
        f"but guests still mention {', '.join(weaknesses) if weaknesses else 'few obvious weaknesses'}."
    )
    model_used = "heuristic_fallback"

    if comments:
        prompt = json.dumps(
            {
                "hotel_name": row.hotel_name,
                "area_name": row.search_area,
                "reviews": comments[:12],
                "task": "Return concise hotel battlecard insights as JSON with keys executive_summary, strengths, weaknesses, pricing_posture, service_gaps, positioning_opportunities, recommended_actions, marketing_hooks.",
            },
            ensure_ascii=False,
        )
        system_prompt = (
            "You are a hotel strategy analyst. Return valid JSON only. "
            "Every list should contain short actionable strings."
        )
        try:
            raw, model_used = generate_text(prompt=prompt, system_prompt=system_prompt)
            parsed = json.loads(raw)
            executive_summary = parsed.get("executive_summary") or executive_summary
            strengths = parsed.get("strengths") or strengths
            weaknesses = parsed.get("weaknesses") or weaknesses
            pricing_posture = parsed.get("pricing_posture") or pricing_posture
            service_gaps = parsed.get("service_gaps") or service_gaps
            positioning_opportunities = parsed.get("positioning_opportunities") or positioning_opportunities
            recommended_actions = parsed.get("recommended_actions") or recommended_actions
            marketing_hooks = parsed.get("marketing_hooks") or marketing_hooks
        except (LlmUnavailableError, json.JSONDecodeError, TypeError, ValueError):
            pass

    return {
        "hotel": _hotel_to_card(row, max_reviews),
        "executive_summary": executive_summary,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "pricing_posture": pricing_posture,
        "service_gaps": service_gaps,
        "positioning_opportunities": positioning_opportunities,
        "recommended_actions": recommended_actions,
        "marketing_hooks": marketing_hooks,
        "model_used": model_used,
    }


def prepare_competitor_chat_context(
    db: Session,
    area_name: str,
    source: str | None,
    question: str,
    history: list[dict] | None = None,
) -> dict:
    rows = _fetch_competitor_rows(
        db=db,
        area_name=area_name,
        source=source,
        max_hotels=8,
    )
    hotels = []
    for row in rows:
        comments = _collect_review_comments([row], max_reviews_per_hotel=2)
        hotels.append(
            {
                "hotel_name": row.hotel_name,
                "source": row.source,
                "availability_status": row.availability_status,
                "current_price": _format_price(row.current_price),
                "currency": row.currency,
                "review_count": len(row.reviews or []),
                "sample_reviews": comments[:2],
            }
        )

    summary = generate_competitor_insight(
        db=db,
        payload=CompetitorInsightRequest(
            area_name=area_name,
            source=source,
            max_hotels=8,
            max_reviews_per_hotel=3,
        ),
    )
    fallback_reply = (
        f"In {area_name}, the clearest signals are praise around "
        f"{', '.join(summary['praise_points'][:3]) or 'location and cleanliness'} and complaints around "
        f"{', '.join(summary['complaint_points'][:3]) or 'service consistency'}. "
        "Use that gap to position your property around cleaner execution, stronger reliability, and easier arrival."
    )
    prompt = json.dumps(
        {
            "area_name": area_name,
            "source": source,
            "question": question,
            "history": (history or [])[-6:],
            "market_summary": summary,
            "tracked_hotels": hotels,
            "task": (
                "Answer like a hotel competitor analyst. Use the market summary and hotel snapshots only. "
                "Be concise, direct, and commercially useful. Return plain text only."
            ),
        },
        ensure_ascii=False,
    )
    system_prompt = (
        "You are a competitor intelligence copilot for a hotel revenue and marketing team. "
        "Answer with practical recommendations, not generic AI advice."
    )
    return {
        "prompt": prompt,
        "system_prompt": system_prompt,
        "fallback_reply": fallback_reply,
        "meta": {
            "hotels_analyzed": len(rows),
            "source": source,
            "area_name": area_name,
            "summary_model": summary["model_used"],
        },
    }
