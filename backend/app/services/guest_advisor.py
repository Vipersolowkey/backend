from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.pms import RoomType
from app.schemas.ai import GuestAdvisorRequest
from app.services.competitor_ai import (
    COMPLAINT_KEYWORDS,
    PRAISE_KEYWORDS,
    _collect_review_comments,
    _extract_keyword_points,
    _fetch_competitor_rows,
)
from app.services.llm import LlmUnavailableError, generate_text

ROOM_TYPE_LABELS = {
    "A": "Classic Room",
    "B": "Comfort Room",
    "C": "Superior Room",
    "D": "Deluxe Room",
    "E": "Family Room",
    "F": "Premier Room",
    "G": "Executive Comfort Room",
    "H": "Executive Room",
    "I": "Signature Room",
    "K": "Spacious Room",
    "L": "Studio Room",
    "P": "Premium Room",
}

VI_MARKERS = [
    "khong",
    "không",
    "khach",
    "khách",
    "phong",
    "phòng",
    "bien",
    "biển",
    "gia",
    "giá",
    "dat",
    "đặt",
    "muon",
    "muốn",
    "khac",
    "khác",
    "dem",
    "đêm",
    "minh",
    "mình",
    "anh/chị",
    "giup",
    "giúp",
    "them",
    "thêm",
    "view biển",
    "có",
    "vâng",
    "dạ",
    "được",
    "duoc",
    "ạ",
    "ừ",
]

_SHORT_AFFIRMATIONS_VI = frozenset({"có", "co", "vâng", "vang", "dạ", "da", "ạ", "được", "duoc", "ừ", "uk"})
_SHORT_AFFIRMATIONS_EN = frozenset({"yes", "ok", "okay", "yeah", "yep", "sure"})

EN_MARKERS = [
    "room",
    "beach",
    "price",
    "night",
    "view",
    "book",
    "stay",
    "clean",
    "family",
    "quiet",
    "option",
    "budget",
    "package",
]


@dataclass
class OfferRecommendation:
    room_type: str
    price_anchor: str
    upsell_items: list[str]
    suggested_discount: str


def _friendly_room_name(room_type: RoomType) -> str:
    normalized = (room_type.name or "").strip()
    if normalized and not normalized.lower().startswith("room type "):
        return normalized
    return ROOM_TYPE_LABELS.get(room_type.code, f"Room Type {room_type.code}")


def _looks_vietnamese(text: str) -> bool:
    lowered = (text or "").lower()
    return any(marker in lowered for marker in VI_MARKERS)


def _looks_english(text: str) -> bool:
    lowered = (text or "").lower()
    return any(marker in lowered for marker in EN_MARKERS)


def _normalize_guest_reply(text: str) -> str:
    return (text or "").strip().lower().rstrip(".!?…")


def _is_short_affirmation(text: str) -> bool:
    t = _normalize_guest_reply(text)
    if not t or len(t) > 18:
        return False
    return t in _SHORT_AFFIRMATIONS_VI or t in _SHORT_AFFIRMATIONS_EN


def _last_assistant_content(history: list[dict] | None) -> str:
    for item in reversed(history or []):
        if item.get("role") == "assistant":
            return str(item.get("content", ""))
    return ""


def _assistant_prompted_room_followup(last_assistant: str, language: str) -> bool:
    la = (last_assistant or "").lower()
    if language == "vi":
        cues = (
            "giá",
            "báo giá",
            "thông tin",
            "chi tiết",
            "cụ thể",
            "kiểm tra",
            "tình trạng phòng",
            "phòng và giá",
            "giá cả",
        )
        return any(c in la for c in cues)
    cues = ("price", "quote", "availability", "details", "more information", "exact rate", "specific rate")
    return any(c in la for c in cues)


def _focus_room_from_last_assistant(last_assistant: str, available_room_types: list[str]) -> str | None:
    lower = (last_assistant or "").lower()
    hits: list[tuple[int, str]] = []
    for room in available_room_types:
        rl = room.lower()
        idx = lower.rfind(rl)
        if idx >= 0:
            hits.append((idx, room))
    if not hits:
        return None
    hits.sort(key=lambda item: item[0])
    return hits[-1][1]


def _detect_room_detail_fulfillment(
    history: list[dict],
    available_room_types: list[str],
    customer_message: str,
    language: str,
) -> str | None:
    if not _is_short_affirmation(customer_message):
        return None
    last_a = _last_assistant_content(history)
    if not _assistant_prompted_room_followup(last_a, language):
        return None
    return _focus_room_from_last_assistant(last_a, available_room_types)


def _room_rate_hints(room_types: list[RoomType], room_name: str) -> dict[str, str]:
    for rt in room_types:
        if _friendly_room_name(rt) == room_name:
            usd = Decimal(str(rt.base_price))
            vnd = int((usd * Decimal("25000")).quantize(Decimal("1")))
            return {
                "usd_per_night": f"${usd:.0f}",
                "vnd_per_night_ballpark": f"{vnd:,}".replace(",", ".") + " VND",
            }
    return {}


def _preferred_language(payload: GuestAdvisorRequest, history: list[dict] | None = None) -> str:
    latest = (payload.customer_message or "").strip()
    if _looks_vietnamese(latest):
        return "vi"
    if _looks_english(latest):
        return "en"
    if _looks_vietnamese(payload.customer_name or ""):
        return "vi"
    if history:
        for item in reversed(history):
            content = str(item.get("content", "")).strip()
            if _looks_vietnamese(content):
                return "vi"
            if _looks_english(content):
                return "en"
    return "en"


def _budget_per_night(payload: GuestAdvisorRequest) -> float | None:
    if payload.budget is None:
        return None
    return payload.budget / max(payload.nights, 1)


def _infer_buyer_type(payload: GuestAdvisorRequest) -> str:
    intent = payload.travel_intent.lower()
    if intent in {"romantic", "premium", "honeymoon"}:
        return "experience_seeker"
    if intent in {"business", "work"}:
        return "efficiency_buyer"
    if intent in {"family", "group"}:
        return "family_planner"
    if payload.budget is not None and payload.budget / max(payload.nights, 1) < 110:
        return "price_sensitive"
    return "balanced_value_buyer"


def _load_room_types(db: Session) -> list[RoomType]:
    stmt = select(RoomType).order_by(RoomType.base_price.asc(), RoomType.code.asc())
    return list(db.scalars(stmt).all())


def _choose_room_offer(room_types: list[RoomType], payload: GuestAdvisorRequest) -> OfferRecommendation:
    sorted_types = sorted(room_types, key=lambda item: Decimal(str(item.base_price)))
    if not sorted_types:
        fallback_price = payload.budget / max(payload.nights, 1) if payload.budget else 120
        return OfferRecommendation(
            room_type="Deluxe Room",
            price_anchor=f"${fallback_price:.0f} per night",
            upsell_items=["Breakfast add-on", "Airport transfer", "Late checkout"],
            suggested_discount="Lead with one useful perk first, then use a light close-rate incentive only if needed.",
        )

    budget_per_night = _budget_per_night(payload)
    chosen = sorted_types[0]

    family_candidates = [
        item
        for item in sorted_types
        if any(
            keyword in _friendly_room_name(item).lower()
            for keyword in ["family", "spacious", "studio", "signature", "premium", "premier"]
        )
    ]

    if payload.party_size >= 4:
        if family_candidates:
            chosen = family_candidates[0]
        elif len(sorted_types) >= 2:
            chosen = sorted_types[-1]
    elif budget_per_night is not None:
        affordable = [item for item in sorted_types if Decimal(str(budget_per_night)) >= item.base_price]
        chosen = affordable[-1] if affordable else sorted_types[0]
    elif payload.travel_intent.lower() in {"romantic", "premium", "honeymoon"}:
        chosen = sorted_types[-1]
    elif payload.travel_intent.lower() in {"family", "group"} and len(sorted_types) >= 2:
        chosen = sorted_types[-1]

    base_price = Decimal(str(chosen.base_price))
    upsell_items = ["Breakfast add-on", "Airport transfer", "Late checkout"]
    if payload.party_size >= 3:
        upsell_items.insert(0, "Extra bed or family setup")
    if payload.travel_intent.lower() in {"romantic", "honeymoon"}:
        upsell_items.insert(0, "Romantic room decor")
    if base_price >= Decimal("180"):
        upsell_items.append("Private pickup and welcome drink")

    return OfferRecommendation(
        room_type=_friendly_room_name(chosen),
        price_anchor=f"${base_price:.0f} per night",
        upsell_items=upsell_items[:4],
        suggested_discount="Offer a value-added perk first, then a 5-8% close-rate incentive if the guest still hesitates.",
    )


def _build_real_offer_options(room_types: list[RoomType], primary_room_type: str) -> list[str]:
    names = [_friendly_room_name(item) for item in room_types]
    if not names:
        return [primary_room_type]

    unique_names: list[str] = []
    for name in names:
        if name not in unique_names:
            unique_names.append(name)

    if primary_room_type in unique_names:
        return unique_names[:6]
    return [primary_room_type, *unique_names[:5]]


def _build_competitor_context(db: Session, area_name: str, source: str | None) -> tuple[str, list[str], list[str]]:
    rows = _fetch_competitor_rows(db=db, area_name=area_name, source=source, max_hotels=6)
    comments = _collect_review_comments(rows, max_reviews_per_hotel=3)
    praise_points = _extract_keyword_points(comments, PRAISE_KEYWORDS)
    complaint_points = _extract_keyword_points(comments, COMPLAINT_KEYWORDS)

    top_hotels = ", ".join(filter(None, [row.hotel_name for row in rows[:3]])) or "nearby competitors"
    complaint_text = ", ".join(complaint_points[:3]) if complaint_points else "service consistency"
    praise_text = ", ".join(praise_points[:3]) if praise_points else "location and cleanliness"
    summary = (
        f"Nearby competitors such as {top_hotels} are praised for {praise_text}, "
        f"but guests still complain about {complaint_text}."
    )
    return summary, praise_points, complaint_points


def _build_advisor_copy(
    payload: GuestAdvisorRequest,
    offer: OfferRecommendation,
) -> tuple[str, str, list[str], list[str]]:
    language = _preferred_language(payload)

    if language == "vi":
        summary = (
            f"Hướng phù hợp nhất lúc này là {offer.room_type} cho nhóm {payload.party_size} khách ở {payload.nights} đêm. "
            "Nên bán theo hướng ở ổn, dễ chốt và có thêm một tiện ích nhỏ để gói nhìn đáng tiền hơn."
        )
        sales_script = (
            f"Case này em sẽ đi theo {offer.room_type}. Phòng này hợp hơn cho {payload.party_size} khách ở {payload.nights} đêm, "
            f"rồi mình gói thêm {offer.upsell_items[0].lower()} để deal trông trọn hơn thay vì chỉ nói giá phòng."
        )
        objection_handling = [
            "Nếu khách so giá, kéo câu chuyện về cảm giác ở ổn hơn và tổng deal đáng tiền hơn.",
            "Nếu khách còn lăn tăn, thêm một perk mềm trước rồi mới cân nhắc discount.",
            "Nếu khách cần chắc ăn, nhấn vào trải nghiệm nhận phòng gọn và hỗ trợ nhanh.",
        ]
        follow_up_questions = [
            "Mình đang ưu tiên tiết kiệm hơn, rộng rãi hơn hay cảm giác ở yên tâm hơn?",
            "Nếu gói thêm breakfast hoặc đưa đón thì anh/chị thấy dễ chốt hơn không?",
            "Nhóm mình cần view đẹp hơn hay chỉ cần phòng rộng và ở thoải mái là đủ?",
        ]
        return summary, sales_script, objection_handling, follow_up_questions

    summary = (
        f"The strongest fit right now is {offer.room_type} for {payload.party_size} guests over {payload.nights} nights. "
        "Lead with comfort and value first, then strengthen the package with one practical perk."
    )
    sales_script = (
        f"For this stay, I would lead with {offer.room_type}. It suits {payload.party_size} guests over {payload.nights} nights well, "
        f"and we can add {offer.upsell_items[0].lower()} so the offer feels stronger than a room-only comparison."
    )
    objection_handling = [
        "If the guest compares price, reposition around reliability and a smoother stay experience.",
        "If the guest hesitates, add one useful perk before talking about discount.",
        "If the guest wants reassurance, stress cleaner execution and faster support.",
    ]
    follow_up_questions = [
        "Would you rather keep the rate lighter or add one perk that makes the stay easier?",
        "Is the priority more about beach access, room comfort, or keeping the budget tidy?",
        "Would breakfast, transfer, or late checkout make the decision easier?",
    ]
    return summary, sales_script, objection_handling, follow_up_questions


def _extract_previously_mentioned_room_types(history: list[dict], available_room_types: list[str]) -> list[str]:
    mentioned: list[str] = []
    for item in history:
        content = str(item.get("content", ""))
        for room_name in available_room_types:
            if room_name.lower() in content.lower() and room_name not in mentioned:
                mentioned.append(room_name)
    return mentioned


def _next_room_type_options(
    available_room_types: list[str],
    previously_mentioned_room_types: list[str],
    primary_room_type: str,
) -> list[str]:
    fresh = [room for room in available_room_types if room not in previously_mentioned_room_types]
    if fresh:
        return fresh[:3]

    alternatives = [room for room in available_room_types if room != primary_room_type]
    if alternatives:
        return alternatives[:3]
    return [primary_room_type]


def _contains_any(text: str, candidates: list[str]) -> bool:
    lowered = (text or "").lower()
    return any(candidate in lowered for candidate in candidates)


def _build_guest_chat_fallback(
    payload: GuestAdvisorRequest,
    offer: OfferRecommendation,
    history: list[dict],
    available_room_types: list[str],
    room_types: list[RoomType] | None = None,
) -> dict:
    language = _preferred_language(payload, history=history)
    raw_message = (payload.customer_message or "").strip()
    message = raw_message.lower()
    previously_mentioned = _extract_previously_mentioned_room_types(history, available_room_types)
    next_options = _next_room_type_options(available_room_types, previously_mentioned, offer.room_type)
    upsell_focus = offer.upsell_items[0] if offer.upsell_items else "Breakfast add-on"

    rt_models = room_types or []
    fulfillment_room = (
        _detect_room_detail_fulfillment(history, available_room_types, raw_message, language) if rt_models else None
    )
    if fulfillment_room:
        hints = _room_rate_hints(rt_models, fulfillment_room)
        usd = hints.get("usd_per_night") or "mức nội bộ"
        vnd = hints.get("vnd_per_night_ballpark") or ""
        if language == "vi":
            rate_clause = f"khoảng {usd}/đêm (~{vnd})" if vnd else f"khoảng {usd}/đêm"
            reply = (
                f"Dạ, em báo nhanh {fulfillment_room}: tham chiếu {rate_clause}; giá cuối theo ngày và kênh có thể khác một chút. "
                "Anh/chị cho em ngày nhận và trả phòng để em chốt đúng và kiểm tra còn phòng nhé?"
            )
            next_step = "Ghi nhận ngày stay và số liên hệ để giữ chỗ."
        else:
            rate_clause = f"around {usd}/night (ballpark {vnd})" if vnd else f"around {usd}/night"
            reply = (
                f"Got it — for the {fulfillment_room}, we’re at {rate_clause}; final rate depends on dates and channel. "
                "Share your check-in and check-out dates and I’ll confirm availability and the exact quote."
            )
            next_step = "Collect dates and a contact path to hold the room."
        return {
            "reply": reply,
            "suggested_next_step": next_step,
            "playbook_stage": "considering_options",
            "upsell_focus": upsell_focus,
            "lead_temperature": "WARM",
            "model_used": "heuristic_fallback",
        }

    if language == "vi":
        if _contains_any(message, ["idea", "ý", "khác", "khac", "gợi ý", "goi y"]):
            options_text = ", ".join(next_options[:2]) if next_options else offer.room_type
            reply = (
                f"Có chứ. Ngoài hướng {offer.room_type}, mình có thể xoay sang {options_text} nếu anh/chị muốn ưu tiên cảm giác ở thoải mái hơn. "
                "Một hướng nữa là giữ hạng phòng hiện tại nhưng thêm breakfast hoặc late checkout để deal nhìn đáng tiền hơn."
            )
            next_step = "Hỏi khách đang nghiêng về view đẹp hơn, phòng rộng hơn hay gói tiện ích dễ chốt hơn."
        elif _contains_any(message, ["view biển", "view bien", "view", "gần biển", "gan bien"]):
            fallback_room = next_options[0] if next_options else offer.room_type
            reply = (
                f"Nếu ưu tiên view biển, em sẽ nghiêng sang {fallback_room} trước vì dễ kể câu chuyện trải nghiệm hơn. "
                "Mình có thể giữ nhịp báo giá gọn, rồi chốt thêm breakfast hoặc đưa đón để gói trông trọn hơn."
            )
            next_step = "Xác nhận khách ưu tiên view đẹp thật sự hay chỉ cần gần biển và ở gọn ngân sách."
        elif _contains_any(message, ["rẻ", "re", "giảm", "giam", "discount", "cheaper", "cheap", "giá"]):
            reply = (
                f"Nếu khách đang nhìn mạnh về giá, em sẽ không giảm ngay. Em sẽ giữ {offer.room_type} làm mốc, "
                f"thêm {upsell_focus.lower()} trước, rồi mới dùng ưu đãi nhẹ nếu khách vẫn so sánh quá sát."
            )
            next_step = "Hỏi khách có cần giữ tổng chi nhẹ hơn hay chỉ muốn thấy deal đáng tiền hơn."
        elif _contains_any(message, ["gia đình", "gia dinh", "trẻ em", "tre em", "4 người", "5 người", "family"]):
            family_room = next_options[0] if next_options else offer.room_type
            reply = (
                f"Đi theo nhóm hoặc gia đình thì em sẽ ưu tiên {family_room} hơn vì dễ kể về độ rộng và cảm giác ở thoải mái. "
                "Với kiểu case này, bán theo không gian và sự tiện hơn là bán theo giá sẽ dễ chốt hơn."
            )
            next_step = "Hỏi khách ưu tiên phòng rộng, thêm giường hay cần combo tiện ích cho cả nhóm."
        else:
            reply = (
                f"Case này em vẫn giữ {offer.room_type} làm trục chính, nhưng cách nói nên linh hoạt hơn: nhấn vào cảm giác ở ổn, "
                f"thêm một perk như {upsell_focus.lower()}, rồi mới chốt theo hướng phù hợp với điều khách đang quan tâm nhất."
            )
            next_step = "Đào thêm một câu để biết khách đang ưu tiên giá, view hay độ thoải mái."

        return {
            "reply": reply,
            "suggested_next_step": next_step,
            "playbook_stage": "considering_options",
            "upsell_focus": upsell_focus,
            "lead_temperature": "WARM",
            "model_used": "heuristic_fallback",
        }

    if _contains_any(message, ["idea", "other option", "another angle", "something else"]):
        options_text = ", ".join(next_options[:2]) if next_options else offer.room_type
        reply = (
            f"Yes. Beyond {offer.room_type}, I would test {options_text} if the guest wants a stronger experience angle. "
            f"Another path is to keep the room lighter and add {upsell_focus.lower()} so the package feels smarter without discounting first."
        )
        next_step = "Ask whether the guest cares more about view, room comfort, or keeping the package lean."
    elif _contains_any(message, ["view", "sea", "beach"]):
        fallback_room = next_options[0] if next_options else offer.room_type
        reply = (
            f"If sea view matters, I would shift the story toward {fallback_room}. "
            "That gives you a cleaner experience-led angle instead of sounding like a rate-only offer."
        )
        next_step = "Confirm whether the guest truly wants a stronger view or simply easier beach access."
    elif _contains_any(message, ["cheap", "cheaper", "price", "discount"]):
        reply = (
            f"If price pressure is the main objection, I would keep {offer.room_type} as the anchor, "
            f"add {upsell_focus.lower()} first, and only use a light incentive after value is clear."
        )
        next_step = "Ask whether the guest wants the lowest total spend or the best overall value."
    elif _contains_any(message, ["family", "kids", "group", "4 people", "5 people"]):
        family_room = next_options[0] if next_options else offer.room_type
        reply = (
            f"For a family or group angle, I would move toward {family_room}. "
            "That makes it easier to sell space, comfort, and low-friction stay value instead of room rate alone."
        )
        next_step = "Ask whether they need more space, an extra bed setup, or the easiest package for the group."
    else:
        reply = (
            f"I would still keep {offer.room_type} as the main anchor, but I would shift the tone depending on the objection: "
            f"value-led if they compare rates, experience-led if they care about view, or convenience-led if {upsell_focus.lower()} helps close."
        )
        next_step = "Pull one more detail from the guest so the next answer can lean harder into the right angle."

    return {
        "reply": reply,
        "suggested_next_step": next_step,
        "playbook_stage": "considering_options",
        "upsell_focus": upsell_focus,
        "lead_temperature": "WARM",
        "model_used": "heuristic_fallback",
    }


def _score_lead(payload: GuestAdvisorRequest) -> tuple[int, str, str, str, list[str], list[str]]:
    score = 50
    signals: list[str] = []
    blockers: list[str] = []

    if payload.party_size >= 2:
        score += 6
        signals.append("Concrete party size provided")
    if payload.nights >= 2:
        score += 8
        signals.append("Multi-night stay increases booking value")
    if payload.budget is not None:
        score += 8
        signals.append("Budget range is available")

    message = (payload.customer_message or "").lower()
    if _contains_any(message, ["book today", "đặt luôn", "đặt ngay", "close", "book now"]):
        score += 15
        signals.append("Strong purchase intent")
    if _contains_any(message, ["compare", "so sánh", "cheaper", "rẻ hơn"]):
        score -= 8
        blockers.append("Still comparing nearby rates")
    if _contains_any(message, ["discount", "giảm", "deal", "ưu đãi"]):
        blockers.append("Price sensitivity is visible")

    score = max(20, min(score, 95))
    if score >= 80:
        temperature = "HOT"
        probability = "High"
    elif score >= 60:
        temperature = "WARM"
        probability = "Medium"
    else:
        temperature = "COLD"
        probability = "Low"

    if not blockers:
        blockers.append("No major blocker beyond normal comparison")

    return score, temperature, probability, "Balanced", signals[:4], blockers[:3]


def _build_playbook(payload: GuestAdvisorRequest, offer: OfferRecommendation, buyer_type: str) -> dict:
    language = _preferred_language(payload)
    journey_stage = "considering_options"

    if language == "vi":
        return {
            "buyer_type": buyer_type,
            "journey_stage": journey_stage,
            "opening_script": (
                f"Em sẽ mở theo {offer.room_type} vì phương án này vừa dễ vào câu chuyện giá trị, vừa đủ chắc để chốt dần theo nhu cầu thật của khách."
            ),
            "value_points": [
                "Nói về cảm giác ở ổn và sự tiện hơn là chỉ nói giá phòng.",
                "Đẩy một tiện ích thực dụng lên trước để gói nhìn đáng tiền hơn.",
                "Nếu khách so giá, kéo về tổng trải nghiệm và độ yên tâm khi ở.",
            ],
            "upsell_strategy": [
                "Đưa perk mềm trước như breakfast hoặc late checkout.",
                "Chỉ đẩy lên hạng phòng cao hơn nếu khách phản ứng tốt với trải nghiệm.",
                "Không dùng discount quá sớm khi khách mới chỉ thăm dò.",
            ],
            "close_strategy": [
                "Hỏi mềm một câu để khách tự chọn hướng gần chốt nhất.",
                "Nếu khách còn so giá, nhắc lại điểm an tâm và tổng deal trọn hơn.",
                "Dùng ưu đãi nhẹ ở nhịp cuối, không dùng ngay từ đầu.",
            ],
            "follow_up_cadence": "Follow up lại trong vòng 1 giờ, rồi nhắc ngắn gọn vào sáng hôm sau nếu khách chưa chốt.",
            "script_variants": ["Value-led mở đầu", "View-led gợi ý", "Soft-close kết thúc"],
            "model_used": "heuristic_fallback",
        }

    return {
        "buyer_type": buyer_type,
        "journey_stage": journey_stage,
        "opening_script": (
            f"I would open with {offer.room_type} because it gives you a cleaner value story before moving into any price pressure."
        ),
        "value_points": [
            "Lead with comfort and reliability before mentioning discount.",
            "Use one practical perk to make the package feel fuller.",
            "If the guest compares rates, bring the conversation back to total stay value.",
        ],
        "upsell_strategy": [
            "Start with breakfast, transfer, or late checkout before a room upgrade.",
            "Move up the room ladder only if the guest responds to the experience angle.",
            "Hold the discount until value has been established.",
        ],
        "close_strategy": [
            "Use one soft close question tied to the guest's priority.",
            "Reassure on service quality when rate comparison appears.",
            "Use a light incentive only in the closing beat.",
        ],
        "follow_up_cadence": "Follow up within 1 hour, then send one short value-led reminder the next morning if needed.",
        "script_variants": ["Value-led opening", "Experience-led angle", "Soft close"],
        "model_used": "heuristic_fallback",
    }


def generate_guest_advisor_response(db: Session, payload: GuestAdvisorRequest) -> dict:
    room_types = _load_room_types(db)
    offer = _choose_room_offer(room_types, payload)
    competitor_context, _, _ = _build_competitor_context(db, payload.area_name, payload.source)
    summary, sales_script, objection_handling, follow_up_questions = _build_advisor_copy(payload, offer)

    available_room_types = _build_real_offer_options(room_types, offer.room_type)
    system_prompt = (
        "You are a hotel reservation sales consultant. "
        "Reply in the same language as the guest. "
        "Never open with phrases like 'I understand', 'Toi hieu', 'Minh hieu', or 'Sure'. "
        "Do not invent room types beyond the provided list. "
        "Keep the answer practical, warm, and easy for a sales agent to use."
    )
    prompt = json.dumps(
        {
            "task": "Return valid JSON only with keys summary, sales_script, objection_handling, follow_up_questions, suggested_discount.",
            "guest": payload.model_dump(),
            "recommended_room_type": offer.room_type,
            "price_anchor": offer.price_anchor,
            "upsell_items": offer.upsell_items,
            "available_room_types": available_room_types,
            "competitor_context": competitor_context,
        },
        ensure_ascii=False,
    )

    model_used = "heuristic_fallback"
    try:
        raw, model_used = generate_text(prompt=prompt, system_prompt=system_prompt)
        parsed = json.loads(raw)
        summary = parsed.get("summary") or summary
        sales_script = parsed.get("sales_script") or sales_script
        objection_handling = parsed.get("objection_handling") or objection_handling
        follow_up_questions = parsed.get("follow_up_questions") or follow_up_questions
        suggested_discount = parsed.get("suggested_discount") or offer.suggested_discount
    except (LlmUnavailableError, json.JSONDecodeError, TypeError, ValueError):
        suggested_discount = offer.suggested_discount

    if offer.room_type not in available_room_types:
        available_room_types = [offer.room_type, *available_room_types]

    return {
        "summary": summary,
        "recommended_room_type": offer.room_type,
        "recommended_price_anchor": offer.price_anchor,
        "upsell_items": offer.upsell_items,
        "sales_script": sales_script,
        "objection_handling": objection_handling[:3],
        "follow_up_questions": follow_up_questions[:3],
        "suggested_discount": suggested_discount,
        "competitor_context": competitor_context,
        "model_used": model_used,
    }


def generate_guest_lead_score(db: Session, payload: GuestAdvisorRequest) -> dict:
    room_types = _load_room_types(db)
    offer = _choose_room_offer(room_types, payload)
    buyer_type = _infer_buyer_type(payload)
    score, temperature, probability, upsell_priority, buying_signals, blockers = _score_lead(payload)
    return {
        "lead_score": score,
        "lead_temperature": temperature,
        "buyer_type": buyer_type,
        "close_probability": probability,
        "upsell_priority": upsell_priority,
        "buying_signals": buying_signals,
        "blockers": blockers,
        "recommended_upsells": offer.upsell_items[:3],
        "model_used": "heuristic_fallback",
    }


def generate_conversion_playbook(db: Session, payload: GuestAdvisorRequest) -> dict:
    room_types = _load_room_types(db)
    offer = _choose_room_offer(room_types, payload)
    buyer_type = _infer_buyer_type(payload)
    return _build_playbook(payload, offer, buyer_type)


def prepare_guest_chat_context(db: Session, payload: GuestAdvisorRequest, history: list[dict]) -> dict:
    room_types = _load_room_types(db)
    offer = _choose_room_offer(room_types, payload)
    competitor_context, praise_points, complaint_points = _build_competitor_context(db, payload.area_name, payload.source)
    available_room_types = _build_real_offer_options(room_types, offer.room_type)
    previously_mentioned = _extract_previously_mentioned_room_types(history, available_room_types)
    language = _preferred_language(payload, history=history)
    fulfillment_room = _detect_room_detail_fulfillment(
        history, available_room_types, payload.customer_message or "", language
    )
    fulfillment_hints = _room_rate_hints(room_types, fulfillment_room) if fulfillment_room else {}
    if fulfillment_room:
        fresh_options = [fulfillment_room]
    else:
        fresh_options = _next_room_type_options(available_room_types, previously_mentioned, offer.room_type)
    buyer_type = _infer_buyer_type(payload)

    system_prompt = (
        "You are a hotel reservation consultant handling live guest objections. "
        "Reply in the same language as the guest. "
        "Do not begin with 'I understand', 'Toi hieu', 'Minh hieu', or 'Sure'. "
        "Only use room names from the provided available_room_types. "
        "When the guest sends a short affirmative (e.g. có / yes / ok) right after you offered details, a quote, "
        "or an availability check for a named room, answer with concrete information for THAT room only; "
        "use fulfillment_rate_hints when provided. Do not pivot to a different room category in that situation. "
        "Use fresh_room_options to rotate only when the guest asks for another option, a comparison, "
        "or explicitly wants a different idea — not when they confirm your prior offer about a specific room. "
        "Be concise, warm, sales-ready, and specific."
    )
    prompt = json.dumps(
        {
            "task": "Return plain text only. Answer the latest guest message naturally and move the conversation forward.",
            "language": language,
            "guest": payload.model_dump(),
            "history": history[-8:],
            "recommended_room_type": offer.room_type,
            "fresh_room_options": fresh_options,
            "fulfillment_room": fulfillment_room,
            "fulfillment_rate_hints": fulfillment_hints,
            "available_room_types": available_room_types,
            "upsell_items": offer.upsell_items,
            "buyer_type": buyer_type,
            "competitor_context": competitor_context,
            "praise_points": praise_points[:3],
            "complaint_points": complaint_points[:3],
        },
        ensure_ascii=False,
    )

    meta = {
        "suggested_next_step": (
            "Ask one short follow-up to uncover whether the guest cares most about price, view, or convenience."
            if language == "en"
            else "Hỏi thêm một câu ngắn để biết khách đang ưu tiên giá, view hay tiện ích."
        ),
        "playbook_stage": "considering_options",
        "upsell_focus": offer.upsell_items[0] if offer.upsell_items else "Breakfast add-on",
        "lead_temperature": _score_lead(payload)[1],
    }

    return {
        "prompt": prompt,
        "system_prompt": system_prompt,
        "meta": meta,
        "offer": offer,
        "available_room_types": available_room_types,
        "room_types": room_types,
    }


def generate_guest_chat_reply(db: Session, payload: GuestAdvisorRequest, history: list[dict]) -> dict:
    prepared = prepare_guest_chat_context(db=db, payload=payload, history=history)

    try:
        reply, model_used = generate_text(
            prompt=prepared["prompt"],
            system_prompt=prepared["system_prompt"],
        )
        return {
            "reply": reply.strip(),
            "suggested_next_step": prepared["meta"]["suggested_next_step"],
            "playbook_stage": prepared["meta"]["playbook_stage"],
            "upsell_focus": prepared["meta"]["upsell_focus"],
            "lead_temperature": prepared["meta"]["lead_temperature"],
            "model_used": model_used,
        }
    except LlmUnavailableError:
        fallback = _build_guest_chat_fallback(
            payload=payload,
            offer=prepared["offer"],
            history=history,
            available_room_types=prepared["available_room_types"],
            room_types=prepared["room_types"],
        )
        return fallback
