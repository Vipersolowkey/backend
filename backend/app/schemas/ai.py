from pydantic import BaseModel, Field


class CompetitorInsightRequest(BaseModel):
    area_name: str = "Nha Trang"
    source: str | None = None
    max_hotels: int = 8
    max_reviews_per_hotel: int = 3


class CompetitorInsightResponse(BaseModel):
    area_name: str
    source: str | None = None
    hotels_analyzed: int
    reviews_analyzed: int
    praise_points: list[str]
    complaint_points: list[str]
    strategic_summary: str
    model_used: str
    data_grounding: dict | None = None


class CompetitorHotelReview(BaseModel):
    comment: str | None = None
    reviewer: str | None = None
    review_date: str | None = None


class CompetitorHotelCard(BaseModel):
    source: str
    hotel_name: str
    search_area: str
    availability_status: str | None = None
    current_price: str | None = None
    currency: str | None = None
    hotel_url: str | None = None
    review_count: int
    reviews: list[CompetitorHotelReview]


class CompetitorHotelListResponse(BaseModel):
    area_name: str
    source: str | None = None
    hotels: list[CompetitorHotelCard]


class CompetitorHotelDetailRequest(BaseModel):
    area_name: str
    hotel_name: str
    source: str
    max_reviews: int = 8


class CompetitorHotelInsightResponse(BaseModel):
    hotel: CompetitorHotelCard
    executive_summary: str
    strengths: list[str]
    weaknesses: list[str]
    pricing_posture: str
    service_gaps: list[str]
    positioning_opportunities: list[str]
    recommended_actions: list[str]
    marketing_hooks: list[str]
    model_used: str


class CompetitorChatRequest(BaseModel):
    area_name: str = "Nha Trang"
    source: str | None = None
    question: str
    history: list[dict[str, str]] = []


class GuestAdvisorRequest(BaseModel):
    area_name: str = "Nha Trang"
    source: str | None = None
    customer_name: str | None = None
    customer_message: str
    party_size: int = 2
    nights: int = 2
    budget: float | None = None
    travel_intent: str = "leisure"


class GuestAdvisorResponse(BaseModel):
    summary: str
    recommended_room_type: str
    recommended_price_anchor: str
    upsell_items: list[str]
    sales_script: str
    objection_handling: list[str]
    follow_up_questions: list[str]
    suggested_discount: str
    competitor_context: str
    model_used: str


class GuestLeadScoreResponse(BaseModel):
    lead_score: int
    lead_temperature: str
    buyer_type: str
    close_probability: str
    upsell_priority: str
    buying_signals: list[str]
    blockers: list[str]
    recommended_upsells: list[str]
    model_used: str


class ConversionPlaybookResponse(BaseModel):
    buyer_type: str
    journey_stage: str
    opening_script: str
    value_points: list[str]
    upsell_strategy: list[str]
    close_strategy: list[str]
    follow_up_cadence: str
    script_variants: list[str]
    model_used: str


class GuestChatMessage(BaseModel):
    role: str
    content: str


class GuestChatRequest(BaseModel):
    area_name: str = "Nha Trang"
    source: str | None = None
    customer_name: str | None = None
    customer_message: str
    party_size: int = 2
    nights: int = 2
    budget: float | None = None
    travel_intent: str = "leisure"
    history: list[GuestChatMessage] = []


class GuestChatResponse(BaseModel):
    reply: str
    suggested_next_step: str
    playbook_stage: str
    upsell_focus: str
    lead_temperature: str
    model_used: str


class RevenueManagerRequest(BaseModel):
    area_name: str = "Nha Trang"


class RevenueManagerResponse(BaseModel):
    analysis: str
    model_used: str
    data_grounding: dict | None = None


class PricingSimulationRequest(BaseModel):
    area_name: str = "Nha Trang"
    room_type: str | None = Field(
        default=None,
        description="Room type code (e.g. D) or partial name; omit to use first type in DB.",
    )
    scenario_input: str = Field(..., min_length=8, description="Describe the pricing or marketing change to simulate.")
    demand_scenario: str = Field(
        default="baseline",
        description="baseline | holiday_peak | low_season | rainy_week | major_event",
    )
    property_id: int | None = Field(default=None, description="Optional property scope for occupancy/context.")


class PricingSimulationResponse(BaseModel):
    analysis: str
    model_used: str
    data_grounding: dict | None = None
