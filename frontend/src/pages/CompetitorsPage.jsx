import { useEffect, useMemo, useState } from "react";

import {
  API_BASE_URL,
  cityOptions,
  classifyCommentTone,
  consumeSseStream,
  fallbackCompetitorChatMessages,
  fallbackHotelIntelligence,
  fallbackHotels,
  fallbackInsight,
  fetchCompetitorHotelIntelligence,
  fetchCompetitorHotels,
  fetchCompetitorInsights,
  formatEnumLabel,
  normalizeStreamProviderError,
  normalizeUiErrorMessage,
  parseReviewPayload,
  sortOptions,
  sourceOptions,
} from "../lib/dashboardApi";
import ReadableInsightBody from "../components/ReadableInsightBody";
import {
  CompetitorsIllustration,
  OrganicLayout,
  OrganicSection,
  OrganicStatCard,
  ToneBadge,
} from "../components/organic/OrganicUI";

function availabilityLabel(status) {
  if (status === "available") return "Available";
  if (status === "unavailable") return "Unavailable";
  return formatEnumLabel(status || "unknown");
}

function HotelCard({ hotel, onOpen }) {
  const hasPrice =
    hotel.current_price != null && hotel.current_price !== "" && !Number.isNaN(Number(hotel.current_price));
  const priceLine = hasPrice
    ? `${hotel.currency?.trim() || "$"} ${hotel.current_price}`.trim()
    : "No public OTA rate";

  return (
    <article className="hover-glow grid min-w-0 gap-4 rounded-[32px_18px_38px_20px] border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_8px_28px_rgba(30,42,36,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ToneBadge tone="neutral">{hotel.source === "agoda_json_import" ? "Agoda" : "Booking"}</ToneBadge>
          <ToneBadge tone={hotel.availability_status === "available" ? "praise" : "complaint"}>
            {availabilityLabel(hotel.availability_status)}
          </ToneBadge>
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums text-[var(--earth-text-subtle)]">
          {hotel.review_count} reviews
        </p>
      </div>

      <div className="min-w-0 space-y-1">
        <h3 className="text-[clamp(1.35rem,2vw,1.85rem)] leading-snug text-[var(--earth-secondary)]">{hotel.hotel_name}</h3>
        <p className="text-sm font-medium text-[var(--earth-text-subtle)]">{hotel.search_area}</p>
      </div>

      <div className="min-w-0 space-y-3 border-t border-[rgba(30,42,36,0.08)] pt-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--earth-text-subtle)]">OTA rate (snapshot)</p>
          <p className="mt-1 break-normal text-base font-semibold leading-snug text-[var(--earth-text)]">{priceLine}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onOpen(hotel)} className="shrink-0 px-4 py-2.5 text-sm font-semibold">
            View detail
          </button>
          {hotel.hotel_url ? (
            <a
              href={hotel.hotel_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-[22px] border border-[rgba(30,42,36,0.14)] px-4 py-2.5 text-sm font-semibold text-[var(--earth-secondary)] no-underline"
            >
              Open listing
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-3">
        {(hotel.reviews || []).slice(0, 2).map((review, index) => {
          const { commentText, reviewerName, reviewLocation } = parseReviewPayload(review);
          const tone = classifyCommentTone(commentText);
          return (
            <div
              key={`${hotel.hotel_name}-${index}`}
              className="rounded-[24px] border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.85)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ToneBadge tone={tone}>{formatEnumLabel(tone)}</ToneBadge>
                {reviewerName ? <span className="text-xs font-medium text-[var(--earth-text-subtle)]">{reviewerName}</span> : null}
                {reviewLocation ? (
                  <span className="text-xs font-medium text-[var(--earth-text-subtle)]">· {reviewLocation.toUpperCase()}</span>
                ) : null}
              </div>
              <p className="text-sm leading-7 text-[var(--earth-text)]">{commentText}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function CompetitorsPage() {
  const [selectedCity, setSelectedCity] = useState("Nha Trang");
  const [selectedSource, setSelectedSource] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("reviews_desc");
  const [insight, setInsight] = useState(fallbackInsight);
  const [hotels, setHotels] = useState(fallbackHotels);
  const [selectedHotel, setSelectedHotel] = useState(fallbackHotelIntelligence);
  const [chatMessages, setChatMessages] = useState(fallbackCompetitorChatMessages);
  const [chatInput, setChatInput] = useState("");
  const [chatMeta, setChatMeta] = useState({
    hotels_analyzed: fallbackHotels.length,
    area_name: "Nha Trang",
    source: null,
    summary_model: "heuristic_fallback",
    model_used: "heuristic_fallback",
  });
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingHotels(true);
      try {
        const [insightData, hotelData] = await Promise.all([
          fetchCompetitorInsights({
            area_name: selectedCity,
            source: selectedSource || null,
            max_hotels: 8,
            max_reviews_per_hotel: 3,
          }),
          fetchCompetitorHotels({
            area_name: selectedCity,
            source: selectedSource || null,
            max_hotels: 12,
            max_reviews_per_hotel: 3,
          }),
        ]);
        setInsight(insightData);
        setHotels(hotelData.hotels);
      } catch {
        setInsight({ ...fallbackInsight, area_name: selectedCity, source: selectedSource || null });
        setHotels(fallbackHotels);
      } finally {
        setLoadingHotels(false);
      }
    }

    load();
  }, [selectedCity, selectedSource]);

  const filteredHotels = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const base = !keyword ? hotels : hotels.filter((hotel) => hotel.hotel_name.toLowerCase().includes(keyword));
    const sorted = [...base];
    sorted.sort((left, right) => {
      if (sortBy === "name_asc") return left.hotel_name.localeCompare(right.hotel_name);
      if (sortBy === "availability_first") {
        return (left.availability_status === "available" ? 0 : 1) - (right.availability_status === "available" ? 0 : 1);
      }
      if (sortBy === "source_asc") return left.source.localeCompare(right.source);
      return right.review_count - left.review_count;
    });
    return sorted;
  }, [hotels, searchTerm, sortBy]);

  const snapshot = useMemo(() => {
    const agoda = filteredHotels.filter((hotel) => hotel.source === "agoda_json_import").length;
    const booking = filteredHotels.filter((hotel) => hotel.source === "booking_json_import").length;
    const available = filteredHotels.filter((hotel) => hotel.availability_status === "available").length;

    return {
      total: filteredHotels.length,
      available,
      leader: agoda === booking ? "Balanced" : agoda > booking ? "Agoda" : "Booking",
    };
  }, [filteredHotels]);

  async function openHotelDetail(hotel) {
    try {
      const detail = await fetchCompetitorHotelIntelligence({
        area_name: hotel.search_area,
        source: hotel.source,
        hotel_name: hotel.hotel_name,
        max_reviews: 8,
      });
      setSelectedHotel(detail);
    } catch {
      setSelectedHotel({ ...fallbackHotelIntelligence, hotel });
    }
  }

  async function sendChat() {
    const question = chatInput.trim();
    if (!question) return;

    const nextHistory = [...chatMessages, { role: "user", content: question }];
    setChatMessages(nextHistory);
    setChatInput("");
    setLoadingChat(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/competitor-chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area_name: selectedCity,
          source: selectedSource || null,
          question,
          history: nextHistory,
        }),
      });
      if (!response.ok) throw new Error("stream failed");

      let assistantInserted = false;
      await consumeSseStream(response, (event) => {
        if (event.type === "meta") {
          setChatMeta((current) => ({ ...current, ...event }));
        } else if (event.type === "model") {
          setChatMeta((current) => ({ ...current, model_used: event.model_used }));
        } else if (event.type === "error") {
          const errorMessage = normalizeStreamProviderError(
            event,
            "Competitor chat unavailable. Check backend logs for details."
          );
          setChatMeta((current) => ({ ...current, model_used: "provider_error" }));
          setChatMessages((current) => {
            const updated = current.filter(
              (item, index, array) => !(index === array.length - 1 && item.role === "assistant" && !item.content)
            );
            return [...updated, { role: "assistant", content: errorMessage }];
          });
        } else if (event.type === "chunk") {
          setChatMessages((current) => {
            const updated = [...current];
            if (!assistantInserted || updated[updated.length - 1]?.role !== "assistant") {
              assistantInserted = true;
              updated.push({ role: "assistant", content: event.content });
              return updated;
            }
            const last = updated.length - 1;
            updated[last] = { ...updated[last], content: `${updated[last].content}${event.content}` };
            return updated;
          });
        }
      });
    } catch (error) {
      const errorMessage = normalizeUiErrorMessage(
        error,
        "Could not stream competitor AI response. Check backend logs for details."
      );
      setChatMessages((current) => [
        ...current.filter((item, index, array) => !(index === array.length - 1 && item.role === "assistant" && !item.content)),
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <OrganicLayout
      pageKey="competitors"
      sideArtwork={CompetitorsIllustration}
      hero={{
        eyebrow: null,
        title: "Competitors",
        description: null,
        stats: [
          { label: "Tracked", value: String(snapshot.total).padStart(2, "0") },
          { label: "Available", value: String(snapshot.available).padStart(2, "0") },
          { label: "Top source", value: snapshot.leader },
        ],
        illustration: CompetitorsIllustration,
      }}
    >
      <OrganicSection
        eyebrow={null}
        title="By area"
        description={null}
        action={
          <div className="flex flex-wrap gap-3">
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="px-4 py-3 text-sm font-semibold">
              {cityOptions.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-3 text-sm font-semibold">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search hotels..." className="px-4 py-3 text-sm" />
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-4">
          <OrganicStatCard label="Hotels" value={snapshot.total} />
          <OrganicStatCard label="Available" value={snapshot.available} />
          <OrganicStatCard label="Source" value={snapshot.leader} />
          <article className="rounded-[22px_34px_24px_38px] border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_8px_28px_rgba(30,42,36,0.05)] lg:col-span-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[rgba(30,42,36,0.08)] pb-4">
              <h3 className="font-['Fraunces',serif] text-[clamp(1.35rem,2.2vw,1.85rem)] font-semibold tracking-tight text-[var(--earth-secondary)]">
                Strategic summary
              </h3>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--earth-text-subtle)]">From market reviews</span>
            </div>
            <ReadableInsightBody text={insight.strategic_summary} modelUsed={insight.model_used} className="mt-5" />
          </article>
        </div>
        <div className="flex flex-wrap gap-2">
          {sourceOptions.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              onClick={() => setSelectedSource(option.value)}
              className={
                selectedSource === option.value
                  ? "px-4 py-3 text-sm font-semibold bg-[var(--earth-primary)] text-[#faf7f2]"
                  : "px-4 py-3 text-sm font-semibold"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </OrganicSection>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
        <OrganicSection eyebrow={null} title="Watchlist" description={null}>
          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            {loadingHotels
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton h-[320px] rounded-[28px] border border-[rgba(107,66,38,0.14)]" />
                ))
              : filteredHotels.map((hotel) => (
                  <HotelCard key={`${hotel.source}-${hotel.hotel_name}`} hotel={hotel} onOpen={openHotelDetail} />
                ))}
          </div>
        </OrganicSection>

        <OrganicSection eyebrow={null} title={selectedHotel?.hotel?.hotel_name || "Detail"} description={null}>
          <div className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              {(selectedHotel?.strengths || []).map((item) => (
                <ToneBadge key={item} tone="praise">
                  {item}
                </ToneBadge>
              ))}
            </div>
            <ReadableInsightBody text={selectedHotel?.executive_summary} className="rounded-[20px] border border-[rgba(30,42,36,0.06)] bg-[rgba(255,255,255,0.55)] p-4" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-[rgba(196,113,74,0.2)] bg-[rgba(196,113,74,0.08)] p-5">
                <h3 className="text-[clamp(1.3rem,2vw,1.8rem)] text-[var(--earth-secondary)]">Exploitable weaknesses</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedHotel?.weaknesses || []).map((item) => (
                    <ToneBadge key={item} tone="complaint">
                      {item}
                    </ToneBadge>
                  ))}
                </div>
              </div>
              <div className="rounded-[28px] border border-[rgba(143,175,143,0.2)] bg-[rgba(143,175,143,0.08)] p-5">
                <h3 className="text-[clamp(1.3rem,2vw,1.8rem)] text-[var(--earth-secondary)]">Angles to use</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedHotel?.marketing_hooks || []).map((item) => (
                    <ToneBadge key={item} tone="neutral">
                      {item}
                    </ToneBadge>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-[26px] border border-[rgba(30,42,36,0.08)] bg-[rgba(255,255,255,0.6)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--earth-text-subtle)]">Pricing posture</p>
              <div className="mt-2">
                <ReadableInsightBody text={selectedHotel?.pricing_posture} />
              </div>
            </div>
          </div>
        </OrganicSection>
      </section>

      <OrganicSection eyebrow={null} title="Chat" description={null}>
        <div className="organic-chat-stack grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="grid gap-4 rounded-[36px_18px_38px_20px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-6">
            <div className="max-h-[460px] space-y-3 overflow-y-auto pr-2">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "assistant"
                      ? "mr-8 rounded-[28px] border border-[rgba(143,175,143,0.22)] bg-[rgba(143,175,143,0.1)] px-4 py-4 text-sm leading-7 text-[var(--earth-secondary)]"
                      : "ml-8 rounded-[28px] border border-[rgba(196,113,74,0.18)] bg-[rgba(196,113,74,0.08)] px-4 py-4 text-sm leading-7 text-[var(--earth-secondary)]"
                  }
                >
                  {message.content}
                </div>
              ))}
              {loadingChat ? (
                <div className="mr-8 rounded-[28px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.44)] px-4 py-4 text-sm text-[var(--earth-secondary)]">
                  <span className="typing-dots">
                    Replying<span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              ) : null}
            </div>
            <div className="organic-chat-composer flex gap-3">
              <textarea
                rows={3}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message…"
                className="min-h-[92px] flex-1 px-4 py-3 leading-7"
              />
              <button type="button" onClick={sendChat} disabled={loadingChat || !chatInput.trim()} className="self-end px-5 py-3 text-sm font-semibold">
                Send
              </button>
            </div>
          </article>

          <div className="grid gap-4">
            <OrganicStatCard label="Area" value={chatMeta.area_name} />
            <OrganicStatCard label="Hotels" value={chatMeta.hotels_analyzed || snapshot.total} />
            <OrganicStatCard label="Model" value={chatMeta.model_used} />
          </div>
        </div>
      </OrganicSection>
    </OrganicLayout>
  );
}
