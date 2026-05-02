const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "http://127.0.0.1:8000";
  }
}

export async function fetchBackendHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3200);
    const response = await fetch(`${getApiOrigin()}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

export const sourceOptions = [
  { label: "All Sources", value: "" },
  { label: "Agoda", value: "agoda_json_import" },
  { label: "Booking", value: "booking_json_import" },
];

export const cityOptions = ["Nha Trang", "Đà Lạt", "Hanoi", "Da Nang"];

export const demandScenarioOptions = [
  { label: "Baseline", value: "baseline" },
  { label: "Holiday peak", value: "holiday_peak" },
  { label: "Low season", value: "low_season" },
  { label: "Rainy week", value: "rainy_week" },
  { label: "Major event", value: "major_event" },
];

export const sortOptions = [
  { label: "Most Reviews", value: "reviews_desc" },
  { label: "A-Z", value: "name_asc" },
  { label: "Availability", value: "availability_first" },
  { label: "Source", value: "source_asc" },
];

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const fallbackMonthlyRevenue = {
  monthLabel: "August 2017",
  totalRevenue: 3347905.38,
  averageAdr: 164.37,
  averageStayNights: 4.04,
  growthPercent: 18.6,
};

/** When API omits `operational_pulse` (older backend). */
export const fallbackOperationalPulse = {
  asOfDate: null,
  totalRooms: 0,
  occupiedRoomsTonight: 0,
  occupancyPctTonight: 0,
  arrivalsNext7Days: 0,
  departuresNext7Days: 0,
  futureCheckInsNext30Days: 0,
};

/** When API omits comparison blocks (older backend). */
export const fallbackPeriodComparison = null;

function mapPeriodComparison(pcRaw) {
  if (!pcRaw) return null;
  return {
    granularity: pcRaw.granularity ?? "rolling_7d",
    asOfDate: pcRaw.as_of_date ?? null,
    currentLabel: pcRaw.current_label ?? "",
    previousLabel: pcRaw.previous_label ?? "",
    currentStart: pcRaw.current_start ?? null,
    currentEnd: pcRaw.current_end ?? null,
    previousStart: pcRaw.previous_start ?? null,
    previousEnd: pcRaw.previous_end ?? null,
    arrivalsCurrent: Number(pcRaw.arrivals_current ?? 0),
    arrivalsPrevious: Number(pcRaw.arrivals_previous ?? 0),
    arrivalsChangePct:
      pcRaw.arrivals_change_pct === null || pcRaw.arrivals_change_pct === undefined
        ? null
        : Number(pcRaw.arrivals_change_pct),
    departuresCurrent: Number(pcRaw.departures_current ?? 0),
    departuresPrevious: Number(pcRaw.departures_previous ?? 0),
    departuresChangePct:
      pcRaw.departures_change_pct === null || pcRaw.departures_change_pct === undefined
        ? null
        : Number(pcRaw.departures_change_pct),
    checkInRevenueCurrent: Number(pcRaw.check_in_revenue_current ?? 0),
    checkInRevenuePrevious: Number(pcRaw.check_in_revenue_previous ?? 0),
    revenueChangePct:
      pcRaw.revenue_change_pct === null || pcRaw.revenue_change_pct === undefined
        ? null
        : Number(pcRaw.revenue_change_pct),
  };
}

/** When API omits `priorities` (older backend). */
export const fallbackOperationalPriorities = [
  {
    category: "retention",
    severity: "warning",
    title: "Bookings need rate intervention",
    detail: "4 bookings flagged HIGH risk vs competitor benchmarks in Nha Trang.",
    suggestedAction: "Open Alerts; tackle largest gaps first; bundle before cutting BAR.",
    routeHint: "/alerts",
  },
  {
    category: "revenue",
    severity: "info",
    title: "Positive revenue momentum",
    detail: "MoM ~+18.6% in August 2017 window (illustrative historical data).",
    suggestedAction: "Hold rate discipline; use Competitors to avoid underpricing in strong demand.",
    routeHint: "/competitors",
  },
  {
    category: "cancellation",
    severity: "warning",
    title: "Large segment with high cancellations",
    detail: "Review Online TA / No Deposit mix in cancellation summary.",
    suggestedAction: "Tighten deposits or offer date changes instead of full refunds where contracts allow.",
    routeHint: "/",
  },
];

export const fallbackAlerts = [
  {
    bookingId: "ORT-2026-0001",
    guestName: "Le Thi Mai Anh",
    email: "m.anh.le@email.com",
    roomType: "Classic Room",
    stayDates: "2026-05-02 to 2026-05-05",
    bookedPrice: 540,
    competitorPrice: 80.5,
    risk: "HIGH",
  },
  {
    bookingId: "ORT-2026-0002",
    guestName: "Park Seo-jun",
    email: "sj.park@email.com",
    roomType: "Deluxe Room",
    stayDates: "2026-05-08 to 2026-05-10",
    bookedPrice: 420,
    competitorPrice: 80.5,
    risk: "HIGH",
  },
  {
    bookingId: "ORT-2026-0003",
    guestName: "Tran Duc Minh",
    email: "minh.tran@email.com",
    roomType: "Family Room",
    stayDates: "2026-05-18 to 2026-05-21",
    bookedPrice: 390,
    competitorPrice: 80.5,
    risk: "HIGH",
  },
  {
    bookingId: "ORT-2026-0004",
    guestName: "Sarah Okafor",
    email: "s.okafor@email.com",
    roomType: "Signature Room",
    stayDates: "2026-05-22 to 2026-05-26",
    bookedPrice: 1180,
    competitorPrice: 80.5,
    risk: "HIGH",
  },
];

export const fallbackInsight = {
  area_name: "Nha Trang",
  source: "agoda_json_import",
  hotels_analyzed: 8,
  reviews_analyzed: 26,
  praise_points: [
    "Sea view and rooftop pool experiences",
    "Breakfast variety and local flavors",
    "Clean rooms and proactive housekeeping",
    "Walkable beach and night-market access",
    "Family layouts and value-led suites",
  ],
  complaint_points: [
    "Compact rooms in central towers",
    "Peak-hour check-in queues",
    "Street noise on lower floors",
    "Aging hardware in some mid-tier listings",
  ],
  strategic_summary:
    "The Nha Trang set clusters around USD 69–95 with several properties showing tight inventory; guests reward beach access and breakfast, while check-in friction and noise remain the main attack surface for differentiation.",
  model_used: "heuristic_fallback",
};

export const fallbackHotels = [
  {
    source: "agoda_json_import",
    hotel_name: "Truong Hai Hotel",
    search_area: "Nha Trang",
    availability_status: "unavailable",
    current_price: 81,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 1205,
    reviews: [
      {
        comment: "Room is very spacious for the price and it was clean.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Hard to find the first time, but overall a good stay near the beach.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
  {
    source: "agoda_json_import",
    hotel_name: "Coral Bay Residence Nha Trang",
    search_area: "Nha Trang",
    availability_status: "Few rooms left at this price",
    current_price: 74,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 842,
    reviews: [
      {
        comment: "Quiet floor and strong air conditioning; beach is a short walk.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Good value for a sea-view room compared to bigger chains nearby.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
  {
    source: "agoda_json_import",
    hotel_name: "Anna Belle Doi Rong Hotel",
    search_area: "Nha Trang",
    availability_status: "available",
    current_price: 69,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 356,
    reviews: [
      {
        comment: "Guests like the view from higher floors; breakfast is simple but fresh.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Some mention slower check-in during peak hours.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
  {
    source: "agoda_json_import",
    hotel_name: "Azure Pearl Nha Trang",
    search_area: "Nha Trang",
    availability_status: "Limited availability",
    current_price: 91,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 2104,
    reviews: [
      {
        comment: "Pool and rooftop bar are the highlight; staff remembered our anniversary.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Premium feel without the resort price tag of Cam Ranh properties.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
  {
    source: "agoda_json_import",
    hotel_name: "Golden Wave Suites",
    search_area: "Nha Trang",
    availability_status: "Only 2 rooms left",
    current_price: 72,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 678,
    reviews: [
      {
        comment: "Good value for money; family room layout worked well for two kids.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Elevator wait times during breakfast rush.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
  {
    source: "agoda_json_import",
    hotel_name: "Seaside Pearl Hotel",
    search_area: "Nha Trang",
    availability_status: "Last rooms — selling fast",
    current_price: 78,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 1540,
    reviews: [
      {
        comment: "Great beach access and helpful front desk for tour bookings.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Clean rooms; ask for a high floor to avoid street noise.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
  {
    source: "agoda_json_import",
    hotel_name: "Horizon City Hotel Nha Trang",
    search_area: "Nha Trang",
    availability_status: "Limited",
    current_price: 86,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 923,
    reviews: [
      {
        comment: "Central location for food and night market; rooms compact but modern.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Housekeeping was thorough every day.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
  {
    source: "agoda_json_import",
    hotel_name: "Marina Boutique Nha Trang",
    search_area: "Nha Trang",
    availability_status: "Few rooms left",
    current_price: 95,
    currency: "USD",
    hotel_url: "https://www.agoda.com/",
    review_count: 412,
    reviews: [
      {
        comment: "Small property but very personal service; excellent breakfast selection.",
        reviewer: null,
        review_date: null,
      },
      {
        comment: "Higher rate than neighbors but felt worth it for a special trip.",
        reviewer: null,
        review_date: null,
      },
    ],
  },
];

export const fallbackHotelIntelligence = {
  hotel: fallbackHotels[0],
  executive_summary:
    "This competitor wins on perceived value and location convenience, but guest feedback still exposes service consistency gaps that can be attacked with a cleaner, calmer stay promise.",
  strengths: ["Good location and accessibility", "Clean rooms and hygiene", "Spacious rooms"],
  weaknesses: ["Old facilities or outdated rooms", "General service complaints", "Small room size"],
  pricing_posture:
    "Use value-led positioning rather than chasing rate blindly. Compete on trust, smoother service, and clearer promise delivery.",
  service_gaps: [
    "Inconsistent guest service tone",
    "Occasional cleanliness concerns",
    "Weak first-arrival experience",
  ],
  positioning_opportunities: [
    "Promise a quieter and more dependable stay",
    "Lead with cleaner rooms and stronger service assurance",
    "Package experience benefits instead of discounting first",
  ],
  recommended_actions: [
    "Target high-risk guests with service-led retention offers",
    "Mirror competitor strengths in copy but stress consistency",
    "Use sales scripts focused on reliability and arrival comfort",
  ],
  marketing_hooks: [
    "Cleaner sleep, smoother stay",
    "Service you can count on from check-in to checkout",
    "More dependable comfort near the same area hotspots",
  ],
  model_used: "heuristic_fallback",
};

export const fallbackGuestAdvisor = {
  summary:
    "Anchor on Deluxe or Signature depending on length of stay and origin market; lead with airport-to-room flow and F&B bundles before discussing rate flex.",
  recommended_room_type: "Deluxe Room",
  recommended_price_anchor: "$168 per night",
  upsell_items: [
    "Half-board or breakfast-inclusive package",
    "Private Cam Ranh airport transfer",
    "Late checkout + luggage hold",
    "One-time room upgrade to Signature on 3+ nights",
  ],
  sales_script:
    "For a multi-night coastal stay I would start with our Deluxe category for space and quiet floors, then add breakfast and transfer so the trip feels turnkey. If the guest is celebrating or staying four nights or more, Signature adds the view and lounge-style service without jumping straight to the top published rate.",
  objection_handling: [
    "If the guest says another hotel is cheaper, reposition around service reliability and cleaner execution.",
    "If the guest is unsure, offer one bundled perk before using a room discount.",
    "If the guest asks for reassurance, stress faster support and smoother arrival.",
  ],
  follow_up_questions: [
    "Are you prioritizing budget, comfort, or convenience?",
    "Would breakfast included help your decision?",
    "Do you need airport transfer or a late checkout option?",
  ],
  suggested_discount:
    "Start with a bundle upgrade, then use a light 5-8% closing incentive only if the guest still hesitates.",
  competitor_context:
    "Nearby competitors are often praised for location and breakfast, but complaints still focus on service consistency and room upkeep.",
  model_used: "heuristic_fallback",
};

export const fallbackLeadScore = {
  lead_score: 81,
  lead_temperature: "WARM",
  buyer_type: "experience_led_leisure",
  close_probability: "Medium-High",
  upsell_priority: "F&B and logistics first",
  buying_signals: [
    "International mix with weekend-heavy arrival pattern",
    "Stays spanning four nights show willingness to invest in comfort",
    "Classic vs Signature spread implies trade-up room if perks are clear",
  ],
  blockers: ["Cross-shopping OTAs in the USD 70–95 band"],
  recommended_upsells: ["Breakfast add-on", "Airport transfer", "Late checkout"],
  model_used: "heuristic_fallback",
};

export const fallbackPlaybook = {
  buyer_type: "balanced_value_buyer",
  journey_stage: "considering_options",
  opening_script:
    "I'd open with Deluxe Room—it balances space and value instead of chasing the cheapest external rate.",
  value_points: [
    "Lead with cleaner execution and more dependable service",
    "Frame the package around convenience, not only room rate",
    "Use one perk to make the offer feel stronger than OTA-only comparisons",
  ],
  upsell_strategy: [
    "Start with breakfast or transfer before a deeper room discount",
    "Upsell convenience first, then room category if interest stays strong",
    "Anchor value around a complete stay package",
  ],
  close_strategy: [
    "Ask a soft close question tied to convenience",
    "Reassure on service reliability if the guest compares price",
    "Use a light incentive only after value is established",
  ],
  follow_up_cadence:
    "Follow up within 1 hour, then again next morning with a concise value-led reminder.",
  script_variants: ["Value-led opening", "Trust-led reassurance", "Urgency-led close"],
  model_used: "heuristic_fallback",
};

export const fallbackChatMessages = [
  {
    role: "assistant",
    content: "Hi — I can suggest rooms, packages, and how to handle price objections.",
  },
];

export const fallbackCompetitorChatMessages = [
  {
    role: "assistant",
    content:
      "Ask about pricing pressure, review complaints, positioning gaps, or which competitor deserves the most attention in this market.",
  },
];

export function formatEnumLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function decodeEscapedNewlines(text) {
  return String(text || "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

export function parseReviewPayload(review) {
  const rawComment = typeof review === "string" ? review : review?.comment ?? review;
  let commentText = "";
  let reviewerName =
    typeof review === "object" && review !== null
      ? review?.reviewer || review?.reviewer_name || null
      : null;
  let reviewLocation =
    typeof review === "object" && review !== null ? review?.location || null : null;

  if (rawComment && typeof rawComment === "object") {
    commentText = rawComment.review || rawComment.comment || JSON.stringify(rawComment);
    reviewerName = reviewerName || rawComment.reviewer_name || rawComment.reviewer || null;
    reviewLocation = reviewLocation || rawComment.location || null;
  } else {
    const stringComment = String(rawComment || "").trim();
    if (stringComment.startsWith("{") && /['"]review['"]\s*:/.test(stringComment)) {
      const reviewMatch = stringComment.match(
        /['"]review['"]\s*:\s*(["'])([\s\S]*?)\1\s*(?=,\s*['"](reviewer_name|reviewer|location)['"]|}$)/
      );
      const reviewerMatch = stringComment.match(/['"]reviewer_name['"]\s*:\s*(["'])([\s\S]*?)\1/);
      const locationMatch = stringComment.match(/['"]location['"]\s*:\s*(["'])([\s\S]*?)\1/);
      commentText = reviewMatch?.[2] || stringComment;
      reviewerName = reviewerName || reviewerMatch?.[2] || null;
      reviewLocation = reviewLocation || locationMatch?.[2] || null;
    } else {
      commentText = stringComment;
    }
  }

  return {
    commentText: decodeEscapedNewlines(commentText || "No comment provided."),
    reviewerName,
    reviewLocation,
  };
}

export async function consumeSseStream(response, onEvent) {
  if (!response.body) {
    throw new Error("Streaming body is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventBlock of events) {
      const dataLine = eventBlock.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      onEvent(JSON.parse(dataLine.slice(6)));
    }
  }
}

export function normalizeUiErrorMessage(error, fallbackMessage) {
  const raw = String(error?.message || "").toLowerCase();
  if (raw.includes("failed to fetch")) {
    return "Can't reach the backend. Make sure the FastAPI server is running.";
  }
  if (raw.includes("network")) {
    return "Network or backend issue — try again.";
  }
  return fallbackMessage;
}

export function normalizeStreamProviderError(event, fallbackMessage) {
  const detail = String(event?.detail || "").trim();
  const raw = detail.toLowerCase();

  if (raw.includes("groq api key is not configured")) {
    return "Groq API key is not configured on the backend.";
  }
  if (raw.includes("401") || raw.includes("unauthorized")) {
    return "AI provider returned 401 Unauthorized — check API key or model access.";
  }
  if (raw.includes("timeout")) {
    return "AI provider timed out before replying.";
  }
  if (raw.includes("connection")) {
    return "Can't connect to the AI provider — check base URL or service status.";
  }
  if (detail) {
    return `AI provider error: ${detail}`;
  }
  return fallbackMessage;
}

export function classifyCommentTone(comment) {
  const praiseKeywords = ["clean", "friendly", "location", "view", "breakfast", "spacious", "quiet", "good"];
  const complaintKeywords = ["noisy", "mosquito", "small", "hard", "annoy", "old", "dirty", "bad"];
  const lowered = (comment || "").toLowerCase();
  if (complaintKeywords.some((keyword) => lowered.includes(keyword))) return "complaint";
  if (praiseKeywords.some((keyword) => lowered.includes(keyword))) return "praise";
  return "neutral";
}

async function jsonRequest(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}

export async function fetchDashboard(propertyId = null) {
  const q =
    propertyId !== null && propertyId !== undefined && propertyId !== ""
      ? `?property_id=${encodeURIComponent(propertyId)}`
      : "";
  const response = await fetch(`${API_BASE_URL}/dashboard${q}`);
  if (!response.ok) throw new Error("Failed to load dashboard.");
  const payload = await response.json();
  const rawPriorities = Array.isArray(payload.priorities) ? payload.priorities : null;
  const priorities =
    rawPriorities?.map((row) => ({
      category: row.category,
      severity: row.severity,
      title: row.title,
      detail: row.detail,
      suggestedAction: row.suggested_action,
      routeHint: row.route_hint || null,
    })) ?? null;
  const scope = payload.property_scope || null;
  const pulseRaw = payload.operational_pulse;
  const operationalPulse = pulseRaw
    ? {
        asOfDate: pulseRaw.as_of_date ?? null,
        totalRooms: Number(pulseRaw.total_rooms ?? 0),
        occupiedRoomsTonight: Number(pulseRaw.occupied_rooms_tonight ?? 0),
        occupancyPctTonight: Number(pulseRaw.occupancy_pct_tonight ?? 0),
        arrivalsNext7Days: Number(pulseRaw.arrivals_next_7_days ?? 0),
        departuresNext7Days: Number(pulseRaw.departures_next_7_days ?? 0),
        futureCheckInsNext30Days: Number(pulseRaw.future_check_ins_next_30_days ?? 0),
      }
    : fallbackOperationalPulse;
  const periodComparison = mapPeriodComparison(payload.period_comparison) ?? fallbackPeriodComparison;
  const calendarWeekComparison =
    mapPeriodComparison(payload.calendar_week_comparison) ?? fallbackPeriodComparison;
  const pipelineComparison = mapPeriodComparison(payload.pipeline_comparison) ?? fallbackPeriodComparison;
  return {
    propertyScope: scope ? { id: scope.id, name: scope.name, areaName: scope.area_name } : null,
    monthlyRevenue: {
      monthLabel: payload.monthly_revenue.month_label,
      totalRevenue: Number(payload.monthly_revenue.total_revenue),
      averageAdr: Number(payload.monthly_revenue.average_adr),
      averageStayNights: Number(payload.monthly_revenue.average_stay_nights),
      growthPercent: Number(payload.monthly_revenue.growth_percent),
    },
    operationalPulse,
    periodComparison,
    calendarWeekComparison,
    pipelineComparison,
    alerts: payload.alerts.map((item) => ({
      bookingId: item.booking_id,
      guestName: item.guest_name,
      email: item.guest_email,
      roomType: item.room_type,
      stayDates: item.stay_dates,
      bookedPrice: Number(item.booked_price),
      competitorPrice: item.competitor_price ? Number(item.competitor_price) : null,
      risk: item.risk,
    })),
    operationalPriorities: priorities,
  };
}

export async function fetchProperties() {
  const response = await fetch(`${API_BASE_URL}/properties`);
  if (!response.ok) throw new Error("Failed to load properties.");
  return response.json();
}

export function reportExportXlsxUrl(propertyId = null) {
  const q =
    propertyId !== null && propertyId !== undefined && propertyId !== ""
      ? `?property_id=${encodeURIComponent(propertyId)}`
      : "";
  return `${API_BASE_URL}/reports/export.xlsx${q}`;
}

export function reportExportCsvUrl(propertyId = null) {
  const q =
    propertyId !== null && propertyId !== undefined && propertyId !== ""
      ? `?property_id=${encodeURIComponent(propertyId)}`
      : "";
  return `${API_BASE_URL}/reports/export.csv${q}`;
}

export async function fetchOccupancyCalendar(year, month, propertyId = null) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (propertyId !== null && propertyId !== undefined && propertyId !== "") {
    params.set("property_id", String(propertyId));
  }
  const response = await fetch(`${API_BASE_URL}/calendar/occupancy?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to load calendar.");
  return response.json();
}

export async function fetchGuestsList(propertyId = null, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (propertyId !== null && propertyId !== undefined && propertyId !== "") {
    params.set("property_id", String(propertyId));
  }
  const response = await fetch(`${API_BASE_URL}/guests?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to load guests.");
  return response.json();
}

export async function fetchGuestCrm(guestId) {
  const response = await fetch(`${API_BASE_URL}/guests/${guestId}/crm`);
  if (!response.ok) throw new Error("Failed to load guest CRM.");
  return response.json();
}

export async function evaluateAlertThresholds(propertyId = null) {
  const response = await fetch(`${API_BASE_URL}/alert-thresholds/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ property_id: propertyId }),
  });
  if (!response.ok) throw new Error("Evaluate failed.");
  return response.json();
}

export const fetchCompetitorInsights = (payload) => jsonRequest("/ai/competitor-insights", payload);
export const fetchCompetitorHotels = (payload) => jsonRequest("/ai/competitor-hotels", payload);
export const fetchCompetitorHotelIntelligence = (payload) =>
  jsonRequest("/ai/competitor-hotel-intelligence", payload);
export const fetchGuestAdvisor = (payload) => jsonRequest("/ai/guest-advisor", payload);
export const fetchLeadScoring = (payload) => jsonRequest("/ai/lead-scoring", payload);
export const fetchConversionPlaybook = (payload) => jsonRequest("/ai/conversion-playbook", payload);
export const fetchRevenueManagerBrief = (payload) => jsonRequest("/ai/revenue-manager-brief", payload);
export const fetchPricingSimulation = (payload) => jsonRequest("/ai/pricing-simulation", payload);

/** Room type hints for pricing simulation (matches seeded `room_types` codes). */
export const pricingSimRoomOptions = [
  { label: "Auto (from DB)", value: "" },
  { label: "Classic (A)", value: "A" },
  { label: "Comfort (B)", value: "B" },
  { label: "Superior (C)", value: "C" },
  { label: "Deluxe (D)", value: "D" },
  { label: "Family (E)", value: "E" },
  { label: "Premier (F)", value: "F" },
];
export const fetchPromoEmail = (payload) => jsonRequest("/marketing/generate-promo-email", payload);

export function buildGuestRequest({ areaName, source, customerName, customerMessage, partySize, nights, budget, travelIntent }) {
  return {
    area_name: areaName,
    source: source || null,
    customer_name: customerName || null,
    customer_message: customerMessage,
    party_size: Number(partySize) || 2,
    nights: Number(nights) || 2,
    budget: budget === "" || budget == null ? null : Number(budget),
    travel_intent: travelIntent,
  };
}
