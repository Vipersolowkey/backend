import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.ai import (
    CompetitorChatRequest,
    CompetitorHotelDetailRequest,
    CompetitorHotelInsightResponse,
    CompetitorHotelListResponse,
    CompetitorInsightRequest,
    CompetitorInsightResponse,
    ConversionPlaybookResponse,
    GuestChatRequest,
    GuestChatResponse,
    GuestAdvisorRequest,
    GuestAdvisorResponse,
    GuestLeadScoreResponse,
    PricingSimulationRequest,
    PricingSimulationResponse,
    RevenueManagerRequest,
    RevenueManagerResponse,
)
from app.services.competitor_ai import (
    generate_competitor_hotel_intelligence,
    generate_competitor_insight,
    get_competitor_hotels,
    prepare_competitor_chat_context,
)
from app.services.guest_advisor import (
    generate_conversion_playbook,
    generate_guest_advisor_response,
    generate_guest_chat_reply,
    generate_guest_lead_score,
    prepare_guest_chat_context,
)
from app.services.llm import stream_text
from app.services.pricing_simulation_ai import generate_pricing_simulation
from app.services.revenue_manager_ai import generate_revenue_manager_brief

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/revenue-manager-brief", response_model=RevenueManagerResponse)
def revenue_manager_brief(
    payload: RevenueManagerRequest,
    db: Session = Depends(get_db),
) -> RevenueManagerResponse:
    return RevenueManagerResponse(**generate_revenue_manager_brief(db=db, area_name=payload.area_name))


@router.post("/pricing-simulation", response_model=PricingSimulationResponse)
def pricing_simulation(
    payload: PricingSimulationRequest,
    db: Session = Depends(get_db),
) -> PricingSimulationResponse:
    return PricingSimulationResponse(
        **generate_pricing_simulation(
            db=db,
            area_name=payload.area_name,
            room_type=payload.room_type,
            scenario_input=payload.scenario_input,
        )
    )


@router.post("/competitor-insights", response_model=CompetitorInsightResponse)
def competitor_insights(
    payload: CompetitorInsightRequest,
    db: Session = Depends(get_db),
) -> CompetitorInsightResponse:
    return CompetitorInsightResponse(**generate_competitor_insight(db=db, payload=payload))


@router.post("/competitor-hotels", response_model=CompetitorHotelListResponse)
def competitor_hotels(
    payload: CompetitorInsightRequest,
    db: Session = Depends(get_db),
) -> CompetitorHotelListResponse:
    return CompetitorHotelListResponse(
        **get_competitor_hotels(
            db=db,
            area_name=payload.area_name,
            source=payload.source,
            max_hotels=payload.max_hotels,
            max_reviews_per_hotel=payload.max_reviews_per_hotel,
        )
    )


@router.post("/competitor-hotel-intelligence", response_model=CompetitorHotelInsightResponse)
def competitor_hotel_intelligence(
    payload: CompetitorHotelDetailRequest,
    db: Session = Depends(get_db),
) -> CompetitorHotelInsightResponse:
    return CompetitorHotelInsightResponse(
        **generate_competitor_hotel_intelligence(
            db=db,
            area_name=payload.area_name,
            source=payload.source,
            hotel_name=payload.hotel_name,
            max_reviews=payload.max_reviews,
        )
    )


@router.post("/guest-advisor", response_model=GuestAdvisorResponse)
def guest_advisor(
    payload: GuestAdvisorRequest,
    db: Session = Depends(get_db),
) -> GuestAdvisorResponse:
    return GuestAdvisorResponse(**generate_guest_advisor_response(db=db, payload=payload))


@router.post("/lead-scoring", response_model=GuestLeadScoreResponse)
def guest_lead_scoring(
    payload: GuestAdvisorRequest,
    db: Session = Depends(get_db),
) -> GuestLeadScoreResponse:
    return GuestLeadScoreResponse(**generate_guest_lead_score(db=db, payload=payload))


@router.post("/conversion-playbook", response_model=ConversionPlaybookResponse)
def conversion_playbook(
    payload: GuestAdvisorRequest,
    db: Session = Depends(get_db),
) -> ConversionPlaybookResponse:
    return ConversionPlaybookResponse(**generate_conversion_playbook(db=db, payload=payload))


@router.post("/guest-chat", response_model=GuestChatResponse)
def guest_chat(
    payload: GuestChatRequest,
    db: Session = Depends(get_db),
) -> GuestChatResponse:
    advisor_payload = GuestAdvisorRequest(
        area_name=payload.area_name,
        source=payload.source,
        customer_name=payload.customer_name,
        customer_message=payload.customer_message,
        party_size=payload.party_size,
        nights=payload.nights,
        budget=payload.budget,
        travel_intent=payload.travel_intent,
    )
    history = [message.model_dump() for message in payload.history]
    return GuestChatResponse(**generate_guest_chat_reply(db=db, payload=advisor_payload, history=history))


@router.post("/guest-chat/stream")
def guest_chat_stream(
    payload: GuestChatRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    advisor_payload = GuestAdvisorRequest(
        area_name=payload.area_name,
        source=payload.source,
        customer_name=payload.customer_name,
        customer_message=payload.customer_message,
        party_size=payload.party_size,
        nights=payload.nights,
        budget=payload.budget,
        travel_intent=payload.travel_intent,
    )
    history = [message.model_dump() for message in payload.history]
    prepared = prepare_guest_chat_context(db=db, payload=advisor_payload, history=history)

    def event_stream():
        yield _sse({"type": "meta", **prepared["meta"]})
        try:
            iterator, model_used = stream_text(
                prompt=prepared["prompt"],
                system_prompt=prepared["system_prompt"],
            )
            yield _sse({"type": "model", "model_used": model_used})
            for chunk in iterator:
                if chunk:
                    yield _sse({"type": "chunk", "content": chunk})
        except Exception as exc:
            logger.exception(
                "guest_chat_stream runtime stream failure: area=%s source=%s message=%r error=%r",
                payload.area_name,
                payload.source,
                payload.customer_message,
                exc,
            )
            yield _sse(
                {
                    "type": "error",
                    "message": "AI provider is unavailable for guest chat.",
                    "detail": str(exc),
                }
            )
        yield _sse({"type": "done"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/competitor-chat/stream")
def competitor_chat_stream(
    payload: CompetitorChatRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    prepared = prepare_competitor_chat_context(
        db=db,
        area_name=payload.area_name,
        source=payload.source,
        question=payload.question,
        history=payload.history,
    )

    def event_stream():
        yield _sse({"type": "meta", **prepared["meta"]})
        try:
            iterator, model_used = stream_text(
                prompt=prepared["prompt"],
                system_prompt=prepared["system_prompt"],
            )
            yield _sse({"type": "model", "model_used": model_used})
            for chunk in iterator:
                if chunk:
                    yield _sse({"type": "chunk", "content": chunk})
        except Exception as exc:
            logger.exception(
                "competitor_chat_stream runtime stream failure: area=%s source=%s question=%r error=%r",
                payload.area_name,
                payload.source,
                payload.question,
                exc,
            )
            yield _sse(
                {
                    "type": "error",
                    "message": "AI provider is unavailable for competitor chat.",
                    "detail": str(exc),
                }
            )
        yield _sse({"type": "done"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
