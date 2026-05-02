import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const fallbackMonthlyRevenue = {
  monthLabel: "August 2017",
  totalRevenue: 3347905.38,
  averageAdr: 164.37,
  averageStayNights: 4.04,
  growthPercent: 18.6,
};

const fallbackAlerts = [
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

const fallbackInsight = {
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

const fallbackHotels = [
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

const fallbackHotelIntelligence = {
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

const fallbackGuestAdvisor = {
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

const fallbackLeadScore = {
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
  recommended_upsells: [
    "Half-board or breakfast-inclusive package",
    "Private Cam Ranh airport transfer",
    "Late checkout + luggage hold",
  ],
  model_used: "heuristic_fallback",
};

const fallbackPlaybook = {
  buyer_type: "experience_led_leisure",
  journey_stage: "considering_options",
  opening_script:
    "I would recommend our Deluxe Room because it balances comfort and value better than simply chasing the cheapest nearby rate.",
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
  script_variants: [
    "Value-led opening",
    "Trust-led reassurance",
    "Urgency-led close",
  ],
  model_used: "heuristic_fallback",
};

const fallbackChatMessages = [
  {
    role: "assistant",
    content: "Chào anh/chị — em có thể gợi ý phòng, gói và cách xử lý khi khách so giá.",
  },
];

const fallbackCompetitorChatMessages = [
  {
    role: "assistant",
    content:
      "Ask about pricing pressure, review complaints, positioning gaps, or which competitor deserves the most attention in this market.",
  },
];

const sourceOptions = [
  { label: "All Sources", value: "" },
  { label: "Agoda", value: "agoda_json_import" },
  { label: "Booking", value: "booking_json_import" },
];

const cityOptions = ["Nha Trang", "Hanoi", "Da Nang"];
const sortOptions = [
  { label: "Most Reviews", value: "reviews_desc" },
  { label: "A-Z", value: "name_asc" },
  { label: "Availability", value: "availability_first" },
  { label: "Source", value: "source_asc" },
];

const praiseKeywords = ["clean", "friendly", "location", "view", "breakfast", "spacious", "quiet", "good"];
const complaintKeywords = ["noisy", "mosquito", "small", "hard", "annoy", "old", "dirty", "bad"];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dashboardPages = [
  { key: "overview", label: "Overview", path: "/overview" },
  { key: "sales", label: "Sales AI", path: "/sales-ai" },
  { key: "competitors", label: "Competitors", path: "/competitors" },
  { key: "alerts", label: "Alerts", path: "/alerts" },
];

function formatEnumLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function decodeEscapedNewlines(text) {
  return String(text || "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

function parseReviewPayload(review) {
  const rawComment = typeof review === "string" ? review : review?.comment ?? review;
  let commentText = "";
  let reviewerName =
    typeof review === "object" && review !== null
      ? review?.reviewer || review?.reviewer_name || null
      : null;
  let reviewLocation =
    typeof review === "object" && review !== null
      ? review?.location || null
      : null;

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

async function consumeSseStream(response, onEvent) {
  if (!response.body) {
    throw new Error("Streaming body is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventBlock of events) {
      const dataLine = eventBlock
        .split("\n")
        .find((line) => line.startsWith("data: "));

      if (!dataLine) {
        continue;
      }

      const payload = JSON.parse(dataLine.slice(6));
      onEvent(payload);
    }
  }
}

function MetricCard({ label, value, hint, accent = "teal" }) {
  const accentStyles = {
    teal: "from-[rgba(143,175,143,0.2)] to-[rgba(143,175,143,0.04)]",
    amber: "from-[rgba(196,113,74,0.18)] to-[rgba(196,113,74,0.04)]",
    rose: "from-[rgba(107,66,38,0.16)] to-[rgba(107,66,38,0.04)]",
  };

  return (
    <div className="hover-glow relative overflow-hidden rounded-[32px_18px_34px_20px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.58)] p-5 shadow-[0_16px_34px_rgba(100,60,20,0.12)] backdrop-blur">
      <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${accentStyles[accent]}`} />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--earth-primary)]">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--earth-secondary)]">{value}</p>
        <p className="mt-2 text-sm text-[var(--earth-text-muted)]">{hint}</p>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[rgba(107,66,38,0.14)] pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--earth-primary)]">{eyebrow}</p>
        <h2 className="mt-2 text-[clamp(1.6rem,2.6vw,2.6rem)] tracking-tight text-[var(--earth-secondary)]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--earth-text-muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function DashboardPageNav({ currentPage, onChange }) {
  return (
    <div className="sticky top-4 z-30 animate-fade-up">
      <div className="rounded-[34px_18px_32px_22px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.52)] p-3 shadow-[0_16px_34px_rgba(100,60,20,0.12)] backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {dashboardPages.map((page, index) => (
            <button
              key={page.key}
              type="button"
              onClick={() => onChange(page)}
              style={{ animationDelay: `${index * 60}ms` }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${
                currentPage === page.key
                  ? "animate-soft-scale bg-[var(--earth-primary)] text-[#faf7f2] shadow-lg"
                  : "animate-fade-up bg-[rgba(255,255,255,0.44)] text-[var(--earth-secondary)] hover:bg-[rgba(196,113,74,0.12)]"
              }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BotanicalFlourish({ className = "" }) {
  return (
    <svg
      viewBox="0 0 220 120"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 106C52 76 70 28 78 8C86 28 104 76 146 106"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M78 20C64 26 50 42 48 58C64 56 78 42 78 20Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M80 38C96 42 108 56 110 72C92 70 82 58 80 38Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M134 40C120 46 108 62 106 78C122 76 134 62 134 40Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M150 24C164 30 178 46 182 64C164 62 150 46 150 24Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BlobDivider() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[rgba(107,66,38,0.12)] bg-[rgba(255,255,255,0.44)] p-2">
      <svg viewBox="0 0 1200 90" className="h-16 w-full text-[rgba(196,113,74,0.5)]" fill="none" aria-hidden="true">
        <path
          d="M10 58C78 16 154 22 222 44C296 68 362 80 444 62C520 46 586 10 658 12C746 16 790 72 888 76C988 80 1068 18 1190 42"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function OrganicPageHero({ eyebrow, title, description, stats, note }) {
  return (
    <section className="page-enter relative overflow-hidden rounded-[42px] border border-[rgba(107,66,38,0.16)] bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(240,231,220,0.92))] p-6 shadow-[0_18px_40px_rgba(100,60,20,0.12)] sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-10 -top-8 h-40 w-40 rounded-full bg-[rgba(196,113,74,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-[rgba(143,175,143,0.12)] blur-3xl" />
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="grid gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--earth-primary)]">{eyebrow}</p>
          <h1 className="max-w-4xl text-[clamp(2.6rem,5vw,4.9rem)] leading-[0.98] text-[var(--earth-secondary)]">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--earth-text-muted)]">{description}</p>
          <div className="flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[148px] rounded-[28px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] px-5 py-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--earth-text-muted)]">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--earth-secondary)]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 rounded-[34px_18px_40px_20px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.52)] p-6">
          <BotanicalFlourish className="h-24 w-48 text-[rgba(107,66,38,0.58)]" />
          <p className="text-sm leading-7 text-[var(--earth-text-muted)]">{note}</p>
          <div className="rounded-[26px_16px_30px_18px] border border-[rgba(143,175,143,0.28)] bg-[rgba(143,175,143,0.08)] p-4 text-sm leading-7 text-[var(--earth-secondary)]">
            Thiết kế mới ưu tiên khoảng thở, nhịp nội dung mềm và khả năng quét thông tin tự nhiên như đang xem một editorial premium thay vì một dashboard khô cứng.
          </div>
        </div>
      </div>
    </section>
  );
}

function OrganicSection({ eyebrow, title, description, action, children }) {
  return (
    <section className="page-enter grid gap-6 rounded-[40px_20px_42px_18px] border border-[rgba(107,66,38,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(240,231,220,0.88))] p-6 shadow-[0_16px_38px_rgba(100,60,20,0.1)] sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--earth-primary)]">{eyebrow}</p>
          <h2 className="text-[clamp(1.8rem,3vw,3rem)] text-[var(--earth-secondary)]">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-[var(--earth-text-muted)]">{description}</p>
        </div>
        {action}
      </div>
      <BlobDivider />
      {children}
    </section>
  );
}

function normalizeUiErrorMessage(error, fallbackMessage) {
  const raw = String(error?.message || "").toLowerCase();
  if (raw.includes("failed to fetch")) {
    return "Không kết nối được tới backend. Kiểm tra xem FastAPI có đang chạy không.";
  }
  if (raw.includes("network")) {
    return "Kết nối mạng hoặc backend đang có vấn đề.";
  }
  return fallbackMessage;
}

function getAlertSavings(alert) {
  return alert.competitorPrice ? alert.bookedPrice - alert.competitorPrice : 0;
}

function normalizeBackendErrorMessage(error, fallbackMessage) {
  const raw = String(error?.message || "").toLowerCase();
  if (raw.includes("failed to fetch")) {
    return "Không kết nối được tới backend. Kiểm tra xem FastAPI có đang chạy không.";
  }
  if (raw.includes("network")) {
    return "Kết nối mạng hoặc backend đang có vấn đề.";
  }
  return fallbackMessage;
}

function InsightList({ title, items, tone }) {
  const toneStyles = {
    praise: "border-emerald-200 bg-emerald-50 text-emerald-800",
    complaint: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${toneStyles[tone]}`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">No signals available yet.</span>
        )}
      </div>
    </div>
  );
}

function PromoPreview({ preview, onClose }) {
  if (!preview) {
    return null;
  }

  return (
    <section className="page-slide-enter rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <SectionHeader
        eyebrow="Generated Email"
        title="Promo Email Preview"
        description={`Generated by ${preview.modelUsed}. Review the draft before sending it to the guest.`}
        action={
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Close Preview
          </button>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl bg-slate-950 p-5 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Subject</p>
          <p className="mt-3 text-xl font-semibold">{preview.subject}</p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Booking</p>
            <p className="mt-2">{preview.bookingId}</p>
            <p className="mt-4 font-medium text-white">Guest</p>
            <p className="mt-2">{preview.guestName}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Body</p>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">
            {preview.emailBody}
          </pre>
        </div>
      </div>
    </section>
  );
}

function GuestAdvisorPanel({
  form,
  onChange,
  onSubmit,
  loading,
  response,
}) {
  return (
    <section className="page-slide-enter rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <SectionHeader
        eyebrow="AI Sales Concierge"
        title="Guest Advisor And Upsell Agent"
        description="Replace repetitive customer care conversations with AI that recommends the right room, proposes upsells, and generates a persuasive reply script."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="hover-glow rounded-[28px] bg-slate-950 p-6 text-white">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Khách hàng</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                value={form.customerName}
                onChange={(event) => onChange("customerName", event.target.value)}
                placeholder="Tên khách"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Nhu cầu</span>
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                value={form.travelIntent}
                onChange={(event) => onChange("travelIntent", event.target.value)}
              >
                <option value="leisure">Leisure</option>
                <option value="family">Family</option>
                <option value="business">Business</option>
                <option value="romantic">Romantic</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Số khách</span>
              <input
                type="number"
                min="1"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                value={form.partySize}
                onChange={(event) => onChange("partySize", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Số đêm</span>
              <input
                type="number"
                min="1"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                value={form.nights}
                onChange={(event) => onChange("nights", event.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Ngân sách dự kiến</span>
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                value={form.budget}
                onChange={(event) => onChange("budget", event.target.value)}
                placeholder="Tổng ngân sách cho cả stay"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Tin nhắn của khách</span>
            <textarea
              rows={7}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-500"
              value={form.customerMessage}
              onChange={(event) => onChange("customerMessage", event.target.value)}
              placeholder="Ví dụ: Tôi đi 2 người, muốn gần biển, sạch sẽ, giá hợp lý và có ăn sáng."
            />
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Đang tư vấn..." : "Generate AI Advice"}
          </button>
        </div>

        <div className="grid gap-5">
          <div className="hover-glow rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Advisor Summary</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              {response.recommended_room_type}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{response.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Price Anchor</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{response.recommended_price_anchor}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Model</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{response.model_used}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailPillList title="Upsell Items" items={response.upsell_items} tone="teal" />
            <DetailPillList title="Follow-Up Questions" items={response.follow_up_questions} tone="amber" />
          </div>

          <div className="hover-glow rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Sales Script</p>
            <p className="mt-4 text-sm leading-7 text-emerald-950">{response.sales_script}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Objection Handling</p>
              <div className="mt-4 space-y-3">
                {response.objection_handling.map((item) => (
                  <div key={item} className="rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Commercial Notes</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Suggested Close</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{response.suggested_discount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Competitor Context</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{response.competitor_context}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LeadScoringPanel({ score }) {
  const toneClass =
    score.lead_temperature === "HOT"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : score.lead_temperature === "WARM"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <section className="page-slide-enter rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <SectionHeader
        eyebrow="Lead Scoring"
        title="Booking Conversion Score"
        description="Know who is easiest to close, how aggressive to upsell, and what friction is still blocking the booking."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[28px] bg-slate-950 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Lead Score</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <p className="text-5xl font-semibold tracking-tight sm:text-6xl">{score.lead_score}</p>
            <span className={`mb-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${toneClass}`}>
              {score.lead_temperature}
            </span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Buyer Type</p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{formatEnumLabel(score.buyer_type)}</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Close Probability</p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{formatEnumLabel(score.close_probability)}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upsell Priority</p>
            <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{formatEnumLabel(score.upsell_priority)}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailPillList title="Buying Signals" items={score.buying_signals} tone="emerald" />
          <DetailPillList title="Blockers" items={score.blockers} tone="rose" />
          <DetailPillList title="Recommended Upsells" items={score.recommended_upsells} tone="teal" />
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Model</p>
            <p className="mt-4 text-sm font-semibold text-slate-900">{score.model_used}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Use this score to decide whether to close directly, reassure first, or keep the offer lighter.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConversionPlaybookPanel({ playbook }) {
  return (
    <section className="page-slide-enter rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <SectionHeader
        eyebrow="Playbook AI"
        title="Booking Conversion Playbook"
        description="AI chooses the right opening, value framing, upsell timing, and close pattern for the current lead type."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] bg-slate-950 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Opening Script</p>
          <p className="mt-4 text-sm leading-7 text-slate-200">{playbook.opening_script}</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Buyer Type</p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{formatEnumLabel(playbook.buyer_type)}</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Journey Stage</p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{formatEnumLabel(playbook.journey_stage)}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Follow-Up Cadence</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{playbook.follow_up_cadence}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailPillList title="Value Points" items={playbook.value_points} tone="teal" />
          <DetailPillList title="Upsell Strategy" items={playbook.upsell_strategy} tone="amber" />
          <DetailPillList title="Close Strategy" items={playbook.close_strategy} tone="emerald" />
          <DetailPillList title="Script Variants" items={playbook.script_variants} tone="slate" />
        </div>
      </div>
    </section>
  );
}

function GuestChatWidget({
  messages,
  input,
  onInputChange,
  onSend,
  loading,
  meta,
}) {
  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <SectionHeader
        eyebrow="AI Chat"
        title="Guest Chat Widget"
        description="Multi-turn conversation flow that behaves like a reservation agent, remembers objections, and keeps pushing toward the close."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-3xl px-4 py-4 text-sm leading-7 ${
                  message.role === "assistant"
                    ? "mr-8 bg-slate-950 text-white"
                    : "ml-8 bg-white text-slate-700 shadow-sm"
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading ? (
              <div className="mr-8 rounded-3xl bg-slate-950 px-4 py-4 text-sm text-white">
                <span className="typing-dots">
                  AI is preparing the next reply<span>.</span><span>.</span><span>.</span>
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex gap-3">
            <textarea
              rows={3}
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="Type the guest's next message..."
              className="min-h-[84px] flex-1 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-teal-500"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={loading || !input.trim()}
              className="self-end rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Send
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] bg-slate-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Chat Guidance</p>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Next Step</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{meta.suggested_next_step}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Playbook Stage</p>
                <p className="mt-2 break-words text-sm font-semibold text-white">{formatEnumLabel(meta.playbook_stage)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upsell Focus</p>
                <p className="mt-2 break-words text-sm font-semibold text-white">{formatEnumLabel(meta.upsell_focus)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lead Temperature</p>
                <p className="mt-2 text-sm font-semibold text-white">{meta.lead_temperature}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">How To Use</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>Paste the guest's next objection or question and let AI continue the conversation.</p>
              <p>Use the chat output as a ready-made reservation script for staff or auto-reply workflows.</p>
              <p>Watch the guidance panel to know whether to reassure, upsell, or push for the close.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompetitorChatWidget({
  messages,
  input,
  onInputChange,
  onSend,
  loading,
  meta,
}) {
  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <SectionHeader
        eyebrow="Groq Analyst"
        title="Competitor Analyst Chatbot"
        description="Ask AI about pricing pressure, review complaints, positioning gaps, and which rivals deserve the closest watch."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
          <div className="max-h-[480px] space-y-3 overflow-y-auto pr-2">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-3xl px-4 py-4 text-sm leading-7 ${
                  message.role === "assistant"
                    ? "mr-8 bg-slate-950 text-white"
                    : "ml-8 bg-white text-slate-700 shadow-sm"
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading ? (
              <div className="mr-8 rounded-3xl bg-slate-950 px-4 py-4 text-sm text-white">
                <span className="typing-dots">
                  Groq is analyzing the market<span>.</span><span>.</span><span>.</span>
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex gap-3">
            <textarea
              rows={3}
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="Ví dụ: Khách đang chê đối thủ nào nhiều nhất về sạch sẽ và dịch vụ?"
              className="min-h-[84px] flex-1 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-teal-500"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={loading || !input.trim()}
              className="self-end rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Ask Groq
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] bg-slate-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Live Scope</p>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Area</p>
                <p className="mt-2 text-sm font-semibold text-white">{meta.area_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hotels Analyzed</p>
                <p className="mt-2 text-sm font-semibold text-white">{meta.hotels_analyzed}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Source</p>
                <p className="mt-2 text-sm font-semibold text-white">{meta.source ? sourceLabel(meta.source) : "All Sources"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Model</p>
                <p className="mt-2 text-sm font-semibold text-white">{meta.model_used}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Good Questions</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>Đối thủ nào đang mạnh nhất về cảm nhận sạch sẽ và view?</p>
              <p>Nếu muốn giữ ADR, tôi nên phản công bằng giá hay bằng service promise?</p>
              <p>Review nào cho thấy khoảng trống rõ nhất để marketing khai thác?</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function classifyCommentTone(comment) {
  const lowered = (comment || "").toLowerCase();
  if (complaintKeywords.some((keyword) => lowered.includes(keyword))) {
    return "complaint";
  }
  if (praiseKeywords.some((keyword) => lowered.includes(keyword))) {
    return "praise";
  }
  return "neutral";
}

function InsightToneChart({ praiseCount, complaintCount, neutralCount }) {
  const total = Math.max(praiseCount + complaintCount + neutralCount, 1);
  const praiseWidth = (praiseCount / total) * 100;
  const complaintWidth = (complaintCount / total) * 100;
  const neutralWidth = (neutralCount / total) * 100;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Tone Mix</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Review Signal Balance
          </h3>
        </div>
        <div className="text-right text-sm text-slate-500">{total} snippets analyzed</div>
      </div>

      <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${praiseWidth}%`, float: "left" }}
        />
        <div
          className="h-full bg-rose-500"
          style={{ width: `${complaintWidth}%`, float: "left" }}
        />
        <div
          className="h-full bg-slate-400"
          style={{ width: `${neutralWidth}%`, float: "left" }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Praise</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{praiseCount}</p>
        </div>
        <div className="rounded-2xl bg-rose-50 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Complaint</p>
          <p className="mt-2 text-2xl font-semibold text-rose-900">{complaintCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-600">General</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{neutralCount}</p>
        </div>
      </div>
    </div>
  );
}

function sourceLabel(source) {
  return source === "agoda_json_import" ? "Agoda" : "Booking";
}

function DetailPillList({ title, items, tone = "slate" }) {
  const palette = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(items || []).length ? (
          items.map((item) => (
            <span
              key={`${title}-${item}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${palette[tone]}`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">No signal available.</span>
        )}
      </div>
    </div>
  );
}

function CompetitorHotelPage({ intelligence, onBack }) {
  const hotel = intelligence?.hotel;
  if (!hotel) {
    return null;
  }

  const reviewSignal = (hotel.reviews || []).reduce(
    (summary, review) => {
      const { commentText } = parseReviewPayload(review);
      const tone = classifyCommentTone(commentText);
      if (tone === "praise") {
        summary.praise += 1;
      } else if (tone === "complaint") {
        summary.complaint += 1;
      } else {
        summary.neutral += 1;
      }
      return summary;
    },
    { praise: 0, complaint: 0, neutral: 0 }
  );

  const commercialPressure =
    hotel.availability_status === "available"
      ? "High pressure to differentiate on service quality and booking confidence."
      : "Competitor supply looks tighter, so avoid overreacting with unnecessary discounting.";

  return (
    <div className="luxury-app min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(251,191,36,0.12),_transparent_24%),linear-gradient(135deg,#f8fafc_0%,#eefbf7_42%,#fffaf0_100%)] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="animate-soft-scale overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Back to Dashboard
              </button>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                  {sourceLabel(hotel.source)}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                  {hotel.availability_status || "unknown"}
                </span>
                <span className="rounded-full bg-teal-400/15 px-3 py-1 text-xs font-semibold tracking-wide text-teal-200">
                  Model: {intelligence.model_used}
                </span>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">
                {hotel.hotel_name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{intelligence.executive_summary}</p>
            </div>

            <div className="grid min-w-[280px] gap-4 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Visible Price</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {hotel.current_price ? `${hotel.currency || "$"} ${hotel.current_price}` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Review Count</p>
                <p className="mt-2 text-2xl font-semibold text-white">{hotel.review_count}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Availability Pressure</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{commercialPressure}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Praise Signals"
            value={String(reviewSignal.praise).padStart(2, "0")}
            hint="Positive comments in the loaded sample"
            accent="teal"
          />
          <MetricCard
            label="Complaint Signals"
            value={String(reviewSignal.complaint).padStart(2, "0")}
            hint="Friction points your team can exploit"
            accent="rose"
          />
          <MetricCard
            label="AI Hooks"
            value={String((intelligence.marketing_hooks || []).length).padStart(2, "0")}
            hint="Campaign angles ready for ads and retention"
            accent="amber"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <SectionHeader
                eyebrow="AI Battlecard"
                title="Commercial Positioning"
                description="A deeper hotel-level read for revenue, sales, and marketing teams."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <DetailPillList title="Strengths" items={intelligence.strengths} tone="emerald" />
                <DetailPillList title="Weaknesses" items={intelligence.weaknesses} tone="rose" />
                <DetailPillList title="Service Gaps" items={intelligence.service_gaps} tone="amber" />
                <DetailPillList
                  title="Positioning Opportunities"
                  items={intelligence.positioning_opportunities}
                  tone="teal"
                />
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <SectionHeader
                eyebrow="AI Plan"
                title="Recommended Actions"
                description="Operational and campaign actions derived from this competitor's review footprint."
              />
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Pricing Posture</p>
                  <p className="mt-4 text-sm leading-7 text-slate-200">{intelligence.pricing_posture}</p>
                </div>
                <div className="space-y-3">
                  {(intelligence.recommended_actions || []).map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <InsightToneChart
              praiseCount={reviewSignal.praise}
              complaintCount={reviewSignal.complaint}
              neutralCount={reviewSignal.neutral}
            />

            <div className="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <SectionHeader
                eyebrow="Campaign AI"
                title="Marketing Hooks"
                description="Hooks you can turn into ad copy, email angles, OTA descriptions, or WhatsApp follow-up."
              />
              <div className="mt-6 space-y-3">
                {(intelligence.marketing_hooks || []).map((hook) => (
                  <div key={hook} className="rounded-3xl border border-teal-100 bg-teal-50/80 p-4 text-sm font-medium leading-6 text-teal-900">
                    {hook}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <SectionHeader
                eyebrow="Live Listing"
                title="Snapshot And Reviews"
                description="Raw listing context and guest voice for manual validation."
              />
              <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Area</p>
                    <p className="mt-2 text-lg font-semibold">{hotel.search_area}</p>
                  </div>
                  {hotel.hotel_url ? (
                    <a
                      href={hotel.hotel_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Open Listing
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(hotel.reviews || []).length ? (
                  hotel.reviews.map((review, index) => {
                    const { commentText, reviewerName, reviewLocation } = parseReviewPayload(review);
                    const tone = classifyCommentTone(commentText);
                    return (
                      <div key={`${hotel.hotel_name}-detail-${index}`} className="rounded-3xl bg-slate-50 p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                              tone === "praise"
                                ? "bg-emerald-100 text-emerald-700"
                                : tone === "complaint"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {tone === "praise" ? "Praise" : tone === "complaint" ? "Complaint" : "General"}
                          </span>
                          {reviewerName ? (
                            <span className="text-xs font-medium text-slate-500">{reviewerName}</span>
                          ) : null}
                          {reviewLocation ? (
                            <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              {reviewLocation}
                            </span>
                          ) : null}
                          {review.review_date ? (
                            <span className="text-xs font-medium text-slate-400">{review.review_date}</span>
                          ) : null}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{commentText}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
                    No review snippets available for this property.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CompetitorHotelCard({ hotel, onOpen }) {
  return (
    <article className="page-slide-enter hover-glow rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold tracking-wide text-white">
              {sourceLabel(hotel.source)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600">
              {hotel.availability_status || "unknown"}
            </span>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">{hotel.hotel_name}</h3>
          <p className="mt-1 text-sm text-slate-500">{hotel.search_area}</p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Review Count</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{hotel.review_count}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-teal-50 px-3 py-1.5 font-medium text-teal-700">
          Price: {hotel.current_price ? `${hotel.currency || "$"} ${hotel.current_price}` : "N/A"}
        </span>
        {hotel.hotel_url ? (
          <a
            href={hotel.hotel_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Open Listing
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onOpen(hotel)}
          className="rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          View Detail
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {(hotel.reviews || []).length ? (
          hotel.reviews.map((review, index) => (
            <div key={`${hotel.hotel_name}-${index}`} className="rounded-2xl bg-slate-50 p-4">
              {(() => {
                const { commentText, reviewerName, reviewLocation } = parseReviewPayload(review);
                const tone = classifyCommentTone(commentText);
                return (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                          tone === "praise"
                            ? "bg-emerald-100 text-emerald-700"
                            : tone === "complaint"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {tone === "praise" ? "Praise" : tone === "complaint" ? "Complaint" : "General"}
                      </span>
                      {reviewLocation ? (
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {reviewLocation}
                        </span>
                      ) : null}
                      {reviewerName ? <span className="text-xs font-medium text-slate-500">{reviewerName}</span> : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{commentText}</p>
                  </>
                );
              })()}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No review snippets available for this property.
          </div>
        )}
      </div>
    </article>
  );
}

export default function AdminDashboard({ initialPage = "overview" }) {
  const navigate = useNavigate();
  const [monthlyRevenue, setMonthlyRevenue] = useState(fallbackMonthlyRevenue);
  const [alerts, setAlerts] = useState(fallbackAlerts);
  const [selectedCity, setSelectedCity] = useState("Nha Trang");
  const [selectedSource, setSelectedSource] = useState("");
  const [insight, setInsight] = useState(fallbackInsight);
  const [competitorHotels, setCompetitorHotels] = useState(fallbackHotels);
  const [selectedHotelIntelligence, setSelectedHotelIntelligence] = useState(null);
  const [promoPreview, setPromoPreview] = useState(null);
  const [guestAdvisor, setGuestAdvisor] = useState(fallbackGuestAdvisor);
  const [guestLeadScore, setGuestLeadScore] = useState(fallbackLeadScore);
  const [conversionPlaybook, setConversionPlaybook] = useState(fallbackPlaybook);
  const [guestChatMessages, setGuestChatMessages] = useState(fallbackChatMessages);
  const [guestChatInput, setGuestChatInput] = useState("");
  const [guestChatMeta, setGuestChatMeta] = useState({
    suggested_next_step: "Qualify the guest, then guide them toward a package close.",
    playbook_stage: "considering_options",
    upsell_focus: "Breakfast add-on",
    lead_temperature: "WARM",
    model_used: "heuristic_fallback",
  });
  const [competitorChatMessages, setCompetitorChatMessages] = useState(fallbackCompetitorChatMessages);
  const [competitorChatInput, setCompetitorChatInput] = useState("");
  const [competitorChatMeta, setCompetitorChatMeta] = useState({
    hotels_analyzed: 0,
    area_name: "Nha Trang",
    source: null,
    summary_model: "heuristic_fallback",
    model_used: "heuristic_fallback",
  });
  const [guestAdvisorForm, setGuestAdvisorForm] = useState({
    customerName: "",
    customerMessage:
      "Tôi muốn một phòng sạch, gần biển, dịch vụ ổn, giá hợp lý cho 2 người trong 2 đêm.",
    partySize: 2,
    nights: 2,
    budget: 320,
    travelIntent: "leisure",
  });
  const [loadingBookingId, setLoadingBookingId] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingHotelPage, setLoadingHotelPage] = useState(false);
  const [loadingGuestAdvisor, setLoadingGuestAdvisor] = useState(false);
  const [loadingGuestChat, setLoadingGuestChat] = useState(false);
  const [loadingCompetitorChat, setLoadingCompetitorChat] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("reviews_desc");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [alertSearch, setAlertSearch] = useState("");

  const activeSource = useMemo(
    () => sourceOptions.find((option) => option.value === selectedSource)?.label ?? "All Sources",
    [selectedSource]
  );

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard`);
        if (!response.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        const payload = await response.json();
        setMonthlyRevenue({
          monthLabel: payload.monthly_revenue.month_label,
          totalRevenue: Number(payload.monthly_revenue.total_revenue),
          averageAdr: Number(payload.monthly_revenue.average_adr),
          averageStayNights: Number(payload.monthly_revenue.average_stay_nights),
          growthPercent: Number(payload.monthly_revenue.growth_percent),
        });
        setAlerts(
          payload.alerts.map((item) => ({
            bookingId: item.booking_id,
            guestName: item.guest_name,
            email: item.guest_email,
            roomType: item.room_type,
            stayDates: item.stay_dates,
            bookedPrice: Number(item.booked_price),
            competitorPrice: item.competitor_price ? Number(item.competitor_price) : null,
            risk: item.risk,
          }))
        );
      } catch {
        setStatusTone("warning");
        setStatusMessage("Đang dùng dữ liệu mẫu vì backend chưa phản hồi.");
      } finally {
        setLoadingDashboard(false);
      }
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    async function loadInsights() {
      setLoadingInsight(true);

      try {
        const response = await fetch(`${API_BASE_URL}/ai/competitor-insights`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            area_name: selectedCity,
            source: selectedSource || null,
            max_hotels: 8,
            max_reviews_per_hotel: 3,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to load competitor insights.");
        }

        const payload = await response.json();
        setInsight(payload);
      } catch {
        setInsight({
          ...fallbackInsight,
          area_name: selectedCity,
          source: selectedSource || null,
        });
      } finally {
        setLoadingInsight(false);
      }
    }

    loadInsights();
  }, [selectedSource, selectedCity]);

  useEffect(() => {
    async function loadCompetitorHotels() {
      setLoadingHotels(true);

      try {
        const response = await fetch(`${API_BASE_URL}/ai/competitor-hotels`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            area_name: selectedCity,
            source: selectedSource || null,
            max_hotels: 12,
            max_reviews_per_hotel: 3,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to load competitor hotels.");
        }

        const payload = await response.json();
        setCompetitorHotels(payload.hotels);
      } catch {
        setCompetitorHotels(
          (selectedSource ? fallbackHotels.filter((hotel) => hotel.source === selectedSource) : fallbackHotels).filter(
            (hotel) => hotel.search_area === selectedCity
          )
        );
      } finally {
        setLoadingHotels(false);
      }
    }

    loadCompetitorHotels();
  }, [selectedSource, selectedCity]);

  useEffect(() => {
    setCompetitorChatMessages(fallbackCompetitorChatMessages);
    setCompetitorChatMeta({
      hotels_analyzed: competitorHotels.length,
      area_name: selectedCity,
      source: selectedSource || null,
      summary_model: insight.model_used,
      model_used: insight.model_used,
    });
  }, [selectedCity, selectedSource]);

  async function handleOpenHotelDetail(hotel) {
    setLoadingHotelPage(true);
    setSelectedHotelIntelligence(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/competitor-hotel-intelligence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area_name: hotel.search_area,
          hotel_name: hotel.hotel_name,
          source: hotel.source,
          max_reviews: 8,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load hotel intelligence.");
      }

      const payload = await response.json();
      setSelectedHotelIntelligence(payload);
    } catch {
      setSelectedHotelIntelligence({
        ...fallbackHotelIntelligence,
        hotel,
      });
    } finally {
      setLoadingHotelPage(false);
    }
  }

  function handleGuestAdvisorChange(field, value) {
    setGuestAdvisorForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleGenerateGuestAdvice() {
    setLoadingGuestAdvisor(true);
    const requestPayload = {
      area_name: selectedCity,
      source: selectedSource || null,
      customer_name: guestAdvisorForm.customerName || null,
      customer_message: guestAdvisorForm.customerMessage,
      party_size: Number(guestAdvisorForm.partySize) || 2,
      nights: Number(guestAdvisorForm.nights) || 2,
      budget: guestAdvisorForm.budget === "" ? null : Number(guestAdvisorForm.budget),
      travel_intent: guestAdvisorForm.travelIntent,
    };

    try {
      const [advisorResult, leadResult, playbookResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/ai/guest-advisor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        }),
        fetch(`${API_BASE_URL}/ai/lead-scoring`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        }),
        fetch(`${API_BASE_URL}/ai/conversion-playbook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        }),
      ]);

      if (advisorResult.status === "fulfilled" && advisorResult.value.ok) {
        setGuestAdvisor(await advisorResult.value.json());
      } else {
        setGuestAdvisor(fallbackGuestAdvisor);
      }

      if (leadResult.status === "fulfilled" && leadResult.value.ok) {
        const leadPayload = await leadResult.value.json();
        setGuestLeadScore(leadPayload);
      } else {
        setGuestLeadScore(fallbackLeadScore);
      }

      if (playbookResult.status === "fulfilled" && playbookResult.value.ok) {
        const playbookPayload = await playbookResult.value.json();
        setConversionPlaybook(playbookPayload);
        setGuestChatMessages([{ role: "assistant", content: playbookPayload.opening_script }]);
        setGuestChatMeta((current) => ({
          ...current,
          suggested_next_step: playbookPayload.follow_up_cadence,
          playbook_stage: playbookPayload.journey_stage,
        }));
      } else {
        setConversionPlaybook(fallbackPlaybook);
      }
    } catch {
      setGuestAdvisor(fallbackGuestAdvisor);
      setGuestLeadScore(fallbackLeadScore);
      setConversionPlaybook(fallbackPlaybook);
    } finally {
      setLoadingGuestAdvisor(false);
    }
  }

  async function handleSendGuestChat() {
    const message = guestChatInput.trim();
    if (!message) {
      return;
    }

    const nextHistory = [...guestChatMessages, { role: "user", content: message }];
    setGuestChatMessages(nextHistory);
    setGuestChatInput("");
    setLoadingGuestChat(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/guest-chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area_name: selectedCity,
          source: selectedSource || null,
          customer_name: guestAdvisorForm.customerName || null,
          customer_message: message,
          party_size: Number(guestAdvisorForm.partySize) || 2,
          nights: Number(guestAdvisorForm.nights) || 2,
          budget: guestAdvisorForm.budget === "" ? null : Number(guestAdvisorForm.budget),
          travel_intent: guestAdvisorForm.travelIntent,
          history: nextHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to continue guest chat.");
      }
      setGuestChatMessages((current) => [...current, { role: "assistant", content: "" }]);
      await consumeSseStream(response, (event) => {
        if (event.type === "meta") {
          setGuestChatMeta((current) => ({
            ...current,
            ...event,
          }));
          return;
        }
        if (event.type === "model") {
          setGuestChatMeta((current) => ({
            ...current,
            model_used: event.model_used,
          }));
          return;
        }
        if (event.type === "chunk") {
          setGuestChatMessages((current) => {
            const updated = [...current];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: `${updated[lastIndex].content}${event.content}`,
              };
            }
            return updated;
          });
        }
      });
    } catch {
      const fallbackReply =
        "I understand. Based on what you've shared, I would keep the offer focused on value, service reliability, and one bundled perk rather than jumping straight to a deep discount.";
      setGuestChatMessages((current) => [...current, { role: "assistant", content: fallbackReply }]);
      setGuestChatMeta({
        suggested_next_step: "Reassure the guest, then ask a close-ready question.",
        playbook_stage: conversionPlaybook.journey_stage,
        upsell_focus: guestLeadScore.recommended_upsells?.[0] || "Breakfast add-on",
        lead_temperature: guestLeadScore.lead_temperature,
        model_used: "heuristic_fallback",
      });
    } finally {
      setLoadingGuestChat(false);
    }
  }

  async function handleGeneratePromoEmail(alert) {
    setLoadingBookingId(alert.bookingId);
    setStatusMessage("");
    setStatusTone("neutral");

    try {
      const response = await fetch(`${API_BASE_URL}/marketing/generate-promo-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: alert.bookingId,
          guest_name: alert.guestName,
          guest_email: alert.email,
          room_type: alert.roomType,
          stay_dates: alert.stayDates,
          booked_price: alert.bookedPrice,
          competitor_price: alert.competitorPrice,
          risk_level: alert.risk,
          area_name: selectedCity,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate promotional email.");
      }

      const payload = await response.json();

      setPromoPreview({
        bookingId: alert.bookingId,
        guestName: alert.guestName,
        subject: payload.subject,
        emailBody: payload.email_body,
        modelUsed: payload.model_used,
      });
      setStatusTone("success");
      setStatusMessage(payload?.message || `Promo email generated for booking ${alert.bookingId}.`);
      setAlerts((currentAlerts) =>
        currentAlerts.map((item) =>
          item.bookingId === alert.bookingId ? { ...item, promoGenerated: true } : item
        )
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        normalizeBackendErrorMessage(error, "Không thể tạo promo email lúc này. Kiểm tra backend hoặc model AI.")
      );
    } finally {
      setLoadingBookingId(null);
    }
  }

  async function handleSendCompetitorChat() {
    const question = competitorChatInput.trim();
    if (!question) {
      return;
    }

    const nextHistory = [...competitorChatMessages, { role: "user", content: question }];
    setCompetitorChatMessages(nextHistory);
    setCompetitorChatInput("");
    setLoadingCompetitorChat(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/competitor-chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area_name: selectedCity,
          source: selectedSource || null,
          question,
          history: nextHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to continue competitor chat.");
      }

      setCompetitorChatMessages((current) => [...current, { role: "assistant", content: "" }]);
      await consumeSseStream(response, (event) => {
        if (event.type === "meta") {
          setCompetitorChatMeta((current) => ({
            ...current,
            ...event,
          }));
          return;
        }
        if (event.type === "model") {
          setCompetitorChatMeta((current) => ({
            ...current,
            model_used: event.model_used,
          }));
          return;
        }
        if (event.type === "chunk") {
          setCompetitorChatMessages((current) => {
            const updated = [...current];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: `${updated[lastIndex].content}${event.content}`,
              };
            }
            return updated;
          });
        }
      });
    } catch {
      const fallbackReply =
        "The clearest market pattern right now is that rivals win on surface perception first, but they still leave service consistency gaps that you can exploit in messaging and retention offers.";
      setCompetitorChatMessages((current) => [...current, { role: "assistant", content: fallbackReply }]);
      setCompetitorChatMeta((current) => ({
        ...current,
        area_name: selectedCity,
        source: selectedSource || null,
        hotels_analyzed: competitorHotels.length,
        model_used: "heuristic_fallback",
      }));
    } finally {
      setLoadingCompetitorChat(false);
    }
  }

  const filteredHotels = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const searched = !normalizedSearch
      ? competitorHotels
      : competitorHotels.filter((hotel) => hotel.hotel_name.toLowerCase().includes(normalizedSearch));

    const sorted = [...searched];
    sorted.sort((left, right) => {
      if (sortBy === "name_asc") {
        return left.hotel_name.localeCompare(right.hotel_name);
      }
      if (sortBy === "availability_first") {
        const leftAvailable = left.availability_status === "available" ? 0 : 1;
        const rightAvailable = right.availability_status === "available" ? 0 : 1;
        return leftAvailable - rightAvailable;
      }
      if (sortBy === "source_asc") {
        return left.source.localeCompare(right.source) || left.hotel_name.localeCompare(right.hotel_name);
      }
      return right.review_count - left.review_count;
    });

    return sorted;
  }, [competitorHotels, searchTerm, sortBy]);

  const toneSummary = useMemo(() => {
    let praiseCount = 0;
    let complaintCount = 0;
    let neutralCount = 0;

    filteredHotels.forEach((hotel) => {
      (hotel.reviews || []).forEach((review) => {
        const { commentText } = parseReviewPayload(review);
        const tone = classifyCommentTone(commentText);
        if (tone === "praise") {
          praiseCount += 1;
        } else if (tone === "complaint") {
          complaintCount += 1;
        } else {
          neutralCount += 1;
        }
      });
    });

    return { praiseCount, complaintCount, neutralCount };
  }, [filteredHotels]);

  const aiOpportunityQueue = useMemo(() => {
    const topComplaint = insight.complaint_points?.[0] || "service consistency";
    const topPraise = insight.praise_points?.[0] || "location";
    const availableHotels = filteredHotels.filter((hotel) => hotel.availability_status === "available").length;

    return [
      {
        title: "Retention Offer Trigger",
        detail: `Target high-risk bookings with a service-led offer built around ${topPraise.toLowerCase()} and certainty.`,
        tone: "emerald",
      },
      {
        title: "Service Recovery Angle",
        detail: `Competitor reviews keep exposing ${topComplaint.toLowerCase()}. Turn that weakness into a clearer promise in landing pages and front-desk scripts.`,
        tone: "rose",
      },
      {
        title: "Availability Pressure",
        detail:
          availableHotels > 0
            ? `${availableHotels} monitored competitors still show availability. Protect ADR with value framing before using deeper discounts.`
            : "Competitor availability looks tighter. Use scarcity and confidence messaging instead of discounting.",
        tone: "amber",
      },
    ];
  }, [filteredHotels, insight]);

  const filteredAlerts = useMemo(() => {
    const keyword = alertSearch.trim().toLowerCase();
    const searched = !keyword
      ? alerts
      : alerts.filter((alert) =>
          [alert.bookingId, alert.guestName, alert.roomType, alert.stayDates].some((field) =>
            String(field || "")
              .toLowerCase()
              .includes(keyword)
          )
        );

    return [...searched].sort((left, right) => getAlertSavings(right) - getAlertSavings(left));
  }, [alerts, alertSearch]);

  const alertsSummary = useMemo(() => {
    const totalSavings = filteredAlerts.reduce((sum, alert) => sum + getAlertSavings(alert), 0);
    const generatedCount = filteredAlerts.filter((alert) => alert.promoGenerated).length;
    return {
      total: filteredAlerts.length,
      totalSavings,
      generatedCount,
    };
  }, [filteredAlerts]);

  const competitorSnapshot = useMemo(() => {
    const agodaCount = filteredHotels.filter((hotel) => hotel.source === "agoda_json_import").length;
    const bookingCount = filteredHotels.filter((hotel) => hotel.source === "booking_json_import").length;
    const availableCount = filteredHotels.filter((hotel) => hotel.availability_status === "available").length;
    const topReviewed = filteredHotels[0] || null;
    const mostAvailable = filteredHotels.find((hotel) => hotel.availability_status === "available") || null;
    const sourceLeader = agodaCount === bookingCount ? "Balanced" : agodaCount > bookingCount ? "Agoda" : "Booking";

    return {
      total: filteredHotels.length,
      agodaCount,
      bookingCount,
      availableCount,
      topReviewed,
      mostAvailable,
      sourceLeader,
    };
  }, [filteredHotels]);

  const currentPageConfig = useMemo(() => {
    const map = {
      overview: {
        eyebrow: "Warm Earth Overview",
        title: "Bức tranh doanh thu và hành vi thị trường được kể lại như một bản tóm lược điều hành cao cấp.",
        description:
          "Overview giờ được bố cục lại như một executive briefing: ít nhiễu, nhiều khoảng thở, và mọi tín hiệu quan trọng đều được dẫn mắt theo đúng nhịp.",
        stats: [
          { label: "Revenue", value: currency.format(monthlyRevenue.totalRevenue) },
          { label: "ADR", value: currency.format(monthlyRevenue.averageAdr) },
          { label: "Risk Alerts", value: String(alerts.length).padStart(2, "0") },
        ],
        note:
          "Từ competitor insight đến action queue, từng section đều được đặt trong các khối organic rõ tầng, giúp người quản lý nhìn thông tin như đọc một premium report hơn là một màn điều khiển kỹ thuật.",
      },
      sales: {
        eyebrow: "Sales AI Atelier",
        title: "Một không gian tư vấn mềm mại để AI nói như nhân viên đặt phòng giàu kinh nghiệm.",
        description:
          "Sales AI được chuyển thành một journey tư vấn: chẩn đoán nhu cầu, đọc nhiệt lead, xây playbook rồi trôi mượt sang đối thoại đa lượt.",
        stats: [
          { label: "Lead Score", value: String(guestLeadScore.lead_score).padStart(2, "0") },
          { label: "Buyer Type", value: formatEnumLabel(guestLeadScore.buyer_type) },
          { label: "Model", value: guestAdvisor.model_used },
        ],
        note:
          "Page này ưu tiên cảm giác chăm sóc cá nhân, nên các khối được xếp như một salon tư vấn: ấm, thân thiện và đủ khoảng trống để hội thoại trở thành trung tâm.",
      },
      competitors: {
        eyebrow: "Competitor Garden",
        title: "Theo dõi đối thủ bằng một bố cục giàu chất biên tập, không còn là danh sách card lặp lại.",
        description:
          "Competitors bây giờ nhấn mạnh nhịp đọc: snapshot thị trường, fast compare, watchlist chi tiết và chatbot analyst được sắp theo chiều sâu nhận định.",
        stats: [
          { label: "Tracked Hotels", value: String(competitorSnapshot.total).padStart(2, "0") },
          { label: "Available", value: String(competitorSnapshot.availableCount).padStart(2, "0") },
          { label: "Source Mix", value: competitorSnapshot.sourceLeader },
        ],
        note:
          "Các divider blob và ornamental flourish giúp phần competitor giống một journal thị trường sống động hơn là một bảng dữ liệu phẳng.",
      },
      alerts: {
        eyebrow: "Retention Studio",
        title: "Cảnh báo hủy phòng được xử lý như một studio can thiệp doanh thu, rõ ưu tiên và rất dễ thao tác.",
        description:
          "Alerts được tổ chức lại thành một không gian chăm sóc booking rủi ro cao, nơi mỗi card đều có lý do, khả năng phục hồi và hành động giữ khách thật rõ.",
        stats: [
          { label: "High Risk", value: String(alertsSummary.total).padStart(2, "0") },
          { label: "Gap", value: currency.format(alertsSummary.totalSavings || 0) },
          { label: "Offers", value: String(alertsSummary.generatedCount).padStart(2, "0") },
        ],
        note:
          "Mục tiêu của page này là giảm áp lực quyết định. Nhân sự nhìn vào là biết booking nào đáng cứu trước và nên dùng ngôn ngữ giữ khách theo hướng nào.",
      },
    };

    return map[currentPage];
  }, [
    alerts.length,
    alertsSummary.generatedCount,
    alertsSummary.total,
    alertsSummary.totalSavings,
    competitorSnapshot.availableCount,
    competitorSnapshot.sourceLeader,
    competitorSnapshot.total,
    currentPage,
    guestAdvisor.model_used,
    guestLeadScore.buyer_type,
    guestLeadScore.lead_score,
    monthlyRevenue.averageAdr,
    monthlyRevenue.totalRevenue,
  ]);

  if (loadingHotelPage) {
    return (
      <div className="luxury-app min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(251,191,36,0.12),_transparent_24%),linear-gradient(135deg,#f8fafc_0%,#eefbf7_42%,#fffaf0_100%)] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div className="rounded-[32px] border border-slate-200/80 bg-white/92 px-10 py-12 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600">Competitor AI</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Building hotel battlecard</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
              Pulling deeper AI insight for this property, including strengths, weaknesses, pricing posture, and campaign hooks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedHotelIntelligence) {
    return (
      <CompetitorHotelPage
        intelligence={selectedHotelIntelligence}
        onBack={() => setSelectedHotelIntelligence(null)}
      />
    );
  }

  return (
    <div className="luxury-app min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(251,191,36,0.12),_transparent_24%),linear-gradient(135deg,#f8fafc_0%,#eefbf7_42%,#fffaf0_100%)] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl space-y-10">
        <OrganicPageHero
          eyebrow={currentPageConfig.eyebrow}
          title={currentPageConfig.title}
          description={currentPageConfig.description}
          stats={currentPageConfig.stats}
          note={currentPageConfig.note}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Average Daily Rate"
            value={currency.format(monthlyRevenue.averageAdr)}
            hint="Synced from hotel revenue summary"
            accent="teal"
          />
          <MetricCard
            label="Average Stay"
            value={`${monthlyRevenue.averageStayNights} nights`}
            hint="Useful for yield management and segmentation"
            accent="amber"
          />
          <MetricCard
            label="High-Risk Alerts"
            value={String(alerts.length).padStart(2, "0")}
            hint="Bookings that should receive retention action now"
            accent="rose"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_220px] lg:items-start">
          <DashboardPageNav
            currentPage={currentPage}
            onChange={(page) => {
              setCurrentPage(page.key);
              navigate(page.path);
            }}
          />
          <div className="hidden lg:flex lg:justify-end">
            <BotanicalFlourish className="h-28 w-52 text-[rgba(107,66,38,0.38)]" />
          </div>
        </div>

        {currentPage === "overview" ? (
        <>
        <OrganicSection
            eyebrow="Competitor AI"
            title="Review Intelligence"
            description="Analyze what Agoda and Booking guests praise and criticize so your team can sharpen pricing, service, and positioning."
            action={
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedCity}
                  onChange={(event) => setSelectedCity(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-500"
                >
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {sourceOptions.map((option) => (
                    <button
                      key={option.value || "all"}
                      type="button"
                      onClick={() => setSelectedSource(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        selectedSource === option.value
                          ? "bg-slate-950 text-white shadow-lg"
                          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            }
          >

          <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
              <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Strategic Summary</p>
              <h3 className="mt-4 text-2xl font-semibold">{activeSource}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                {loadingInsight ? "Analyzing competitor reviews..." : insight.strategic_summary}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Hotels</p>
                  <p className="mt-2 text-2xl font-semibold">{insight.hotels_analyzed}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Reviews</p>
                  <p className="mt-2 text-2xl font-semibold">{insight.reviews_analyzed}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Model</p>
                  <p className="mt-2 text-base font-semibold">{insight.model_used}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <InsightList title="Guests Praise" items={insight.praise_points} tone="praise" />
              <InsightList title="Guests Complain About" items={insight.complaint_points} tone="complaint" />
            </div>
          </div>
        </OrganicSection>

        </>
        ) : null}

        {currentPage === "sales" ? (
        <div className="page-enter space-y-8">
        <OrganicSection
          eyebrow="Sales Orchestration"
          title="Một workflow tư vấn hoàn chỉnh từ nhu cầu khách đến cú chốt cuối cùng."
          description="Thay vì đặt từng panel rời rạc, page này được tổ chức lại như một hành trình sales: mở đầu bằng lời tư vấn, đi qua chẩn đoán nhiệt lead, rồi kết bằng đối thoại nhiều lượt."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.52)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--earth-primary)]">Advisor</p>
              <p className="mt-3 text-sm leading-7 text-[var(--earth-text-muted)]">
                AI bắt đầu bằng việc hiểu ý định lưu trú, ngân sách và kiểu khách để đề xuất đúng room type.
              </p>
            </div>
            <div className="rounded-[28px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.52)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--earth-primary)]">Playbook</p>
              <p className="mt-3 text-sm leading-7 text-[var(--earth-text-muted)]">
                Lead scoring và conversion playbook giúp đội ngũ biết khi nào nên trấn an, khi nào nên upsell và khi nào nên close.
              </p>
            </div>
            <div className="rounded-[28px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.52)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--earth-primary)]">Conversation</p>
              <p className="mt-3 text-sm leading-7 text-[var(--earth-text-muted)]">
                Multi-turn chat giữ lại ngữ cảnh và objection để AI hành xử giống một reservation consultant mềm mại hơn.
              </p>
            </div>
          </div>
        </OrganicSection>

        <GuestAdvisorPanel
          form={guestAdvisorForm}
          onChange={handleGuestAdvisorChange}
          onSubmit={handleGenerateGuestAdvice}
          loading={loadingGuestAdvisor}
          response={guestAdvisor}
        />

        <section className="grid gap-5 2xl:grid-cols-2">
          <LeadScoringPanel score={guestLeadScore} />
          <ConversionPlaybookPanel playbook={conversionPlaybook} />
        </section>

        <GuestChatWidget
          messages={guestChatMessages}
          input={guestChatInput}
          onInputChange={setGuestChatInput}
          onSend={handleSendGuestChat}
          loading={loadingGuestChat}
          meta={guestChatMeta}
        />
        </div>
        ) : null}

        {currentPage === "overview" ? (
        <InsightToneChart
          praiseCount={toneSummary.praiseCount}
          complaintCount={toneSummary.complaintCount}
          neutralCount={toneSummary.neutralCount}
        />
        ) : null}

        {currentPage === "overview" ? (
        <OrganicSection
            eyebrow="AI Queue"
            title="Next Best Actions"
            description="A prioritized action queue generated from review tone, competitor availability, and current alert context."
          >

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {aiOpportunityQueue.map((item, index) => (
              <div
                key={item.title}
                style={{ animationDelay: `${index * 80}ms` }}
                className={`rounded-3xl border p-5 ${
                  item.tone === "emerald"
                    ? "border-emerald-200 bg-emerald-50/70"
                    : item.tone === "rose"
                      ? "border-rose-200 bg-rose-50/70"
                      : "border-amber-200 bg-amber-50/70"
                } stagger-item hover-glow`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.title}</p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item.detail}</p>
              </div>
            ))}
          </div>
        </OrganicSection>
        ) : null}

        {currentPage === "competitors" ? (
        <OrganicSection
            eyebrow="Competitor Watchlist"
            title="Hotel Listings And Review Comments"
            description="Read actual hotel snippets from Agoda and Booking so the team can validate what guests are praising or criticizing at property level."
            action={
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search hotel name..."
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-500"
                />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  {loadingHotels ? "Refreshing hotels..." : `${filteredHotels.length} hotels loaded`}
                </div>
              </div>
            }
          >

          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            <div className="animate-fade-up rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tracked Hotels</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{competitorSnapshot.total}</p>
              <p className="mt-2 text-sm text-slate-500">Visible competitors in the current city/source scope.</p>
            </div>
            <div className="animate-fade-up rounded-3xl border border-teal-200 bg-teal-50/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-teal-700">Source Mix</p>
              <p className="mt-3 text-3xl font-semibold text-teal-900">{competitorSnapshot.sourceLeader}</p>
              <p className="mt-2 text-sm text-teal-800">
                Agoda {competitorSnapshot.agodaCount} · Booking {competitorSnapshot.bookingCount}
              </p>
            </div>
            <div className="animate-fade-up rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-700">Availability Visible</p>
              <p className="mt-3 text-3xl font-semibold text-amber-900">{competitorSnapshot.availableCount}</p>
              <p className="mt-2 text-sm text-amber-800">Competitors still showing available inventory.</p>
            </div>
            <div className="animate-fade-up rounded-3xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Top Reviewed Rival</p>
              <p className="mt-3 text-lg font-semibold text-rose-900">
                {competitorSnapshot.topReviewed?.hotel_name || "No hotel loaded"}
              </p>
              <p className="mt-2 text-sm text-rose-800">
                {competitorSnapshot.topReviewed ? `${competitorSnapshot.topReviewed.review_count} reviews` : "Waiting for competitor data"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="animate-soft-scale rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Featured Rival</p>
              <h3 className="mt-3 text-2xl font-semibold">
                {competitorSnapshot.topReviewed?.hotel_name || "No rival selected"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                {competitorSnapshot.topReviewed
                  ? `This property currently leads your watchlist by review volume and should be monitored closely for positioning, review tone, and package strategy.`
                  : "Load more competitor data to surface the most important rival in this city."}
              </p>
              {competitorSnapshot.topReviewed ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                    {sourceLabel(competitorSnapshot.topReviewed.source)}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                    {competitorSnapshot.topReviewed.review_count} reviews
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                    {competitorSnapshot.topReviewed.availability_status || "unknown"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="animate-soft-scale rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Fast Compare</p>
              <div className="mt-4 space-y-3">
                {filteredHotels.slice(0, 4).map((hotel) => (
                  <div
                    key={`fast-${hotel.source}-${hotel.hotel_name}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{hotel.hotel_name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {sourceLabel(hotel.source)} · {hotel.availability_status || "unknown"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900">{hotel.review_count}</p>
                        <p className="text-xs text-slate-400">reviews</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!filteredHotels.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No competitor hotels available yet for quick comparison.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {loadingHotels
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`hotel-skeleton-${index}`}
                    className="skeleton h-[320px] rounded-[28px] border border-slate-200"
                  />
                ))
              : null}
            {filteredHotels.map((hotel) => (
              <CompetitorHotelCard
                key={`${hotel.source}-${hotel.hotel_name}`}
                hotel={hotel}
                onOpen={handleOpenHotelDetail}
              />
            ))}
            {!loadingHotels && !filteredHotels.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 xl:col-span-2">
                No competitor hotels found for the current source filter.
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <CompetitorChatWidget
              messages={competitorChatMessages}
              input={competitorChatInput}
              onInputChange={setCompetitorChatInput}
              onSend={handleSendCompetitorChat}
              loading={loadingCompetitorChat}
              meta={competitorChatMeta}
            />
          </div>
        </OrganicSection>
        ) : null}

        {currentPage === "alerts" ? (
        <div className="page-enter space-y-8">
        <PromoPreview preview={promoPreview} onClose={() => setPromoPreview(null)} />

        <OrganicSection
            eyebrow="Retention Alerts"
            title="High Cancellation Risk"
            description="These bookings are priced above competitor benchmarks. Generate a personalized offer with your local or cloud Ollama model."
            action={
              statusMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    statusTone === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : statusTone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {statusMessage}
                </div>
              ) : null
            }
          >

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="animate-fade-up rounded-3xl border border-rose-200 bg-rose-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-700">High Risk Bookings</p>
              <p className="mt-3 text-3xl font-semibold text-rose-900">{alertsSummary.total}</p>
            </div>
            <div className="animate-fade-up rounded-3xl border border-amber-200 bg-amber-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-700">Potential Revenue Gap</p>
              <p className="mt-3 text-3xl font-semibold text-amber-900">{currency.format(alertsSummary.totalSavings)}</p>
            </div>
            <div className="animate-fade-up rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Generated Offers</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-900">{alertsSummary.generatedCount}</p>
            </div>
            <div className="animate-fade-up rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Quick Find</p>
              <input
                type="text"
                value={alertSearch}
                onChange={(event) => setAlertSearch(event.target.value)}
                placeholder="Search booking or guest..."
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {filteredAlerts.map((alert, index) => {
              const savings = getAlertSavings(alert);

              return (
                <article
                  key={alert.bookingId}
                  className="animate-fade-up grid gap-5 rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(236,253,245,0.72))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_60px_rgba(15,23,42,0.08)] xl:grid-cols-[1.15fr_0.9fr_auto]"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold tracking-wide text-rose-700">
                        {alert.risk} RISK
                      </span>
                      <span className="text-sm font-medium text-slate-500">{alert.bookingId}</span>
                      {alert.promoGenerated ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
                          OFFER READY
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-4 text-xl font-semibold text-slate-900">{alert.guestName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {alert.roomType} | {alert.stayDates}
                    </p>
                    <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Retention Angle</p>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Competitors are cheaper by {currency.format(savings)} for a comparable stay. Reframe the offer around stronger service, a cleaner stay, and lower booking friction instead of price alone.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-3xl bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Booked Price</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {currency.format(alert.bookedPrice)}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Competitor Price</p>
                      <p className="mt-2 text-2xl font-semibold text-teal-700">
                        {alert.competitorPrice ? currency.format(alert.competitorPrice) : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-amber-700">Recovery Potential</p>
                      <p className="mt-2 text-2xl font-semibold text-amber-900">{currency.format(savings)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3 xl:min-w-[220px]">
                    <button
                      type="button"
                      onClick={() => handleGeneratePromoEmail(alert)}
                      disabled={loadingBookingId === alert.bookingId}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {loadingBookingId === alert.bookingId
                        ? "Generating..."
                        : alert.promoGenerated
                          ? "Regenerate Email"
                          : "Generate Promo Email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoPreview(null)}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                    >
                      Clear Preview
                    </button>
                  </div>
                </article>
              );
            })}
            {!filteredAlerts.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                Không tìm thấy booking phù hợp với bộ lọc hiện tại.
              </div>
            ) : null}
          </div>
        </OrganicSection>
        </div>
        ) : null}
      </div>
    </div>
  );
}
