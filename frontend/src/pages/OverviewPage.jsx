import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  cityOptions,
  currency,
  fallbackAlerts,
  fallbackInsight,
  fallbackMonthlyRevenue,
  fallbackOperationalPriorities,
  fetchCompetitorInsights,
  fetchDashboard,
  fetchPricingSimulation,
  fetchRevenueManagerBrief,
  normalizeUiErrorMessage,
  pricingSimRoomOptions,
  sourceOptions,
} from "../lib/dashboardApi";
import ReadableInsightBody from "../components/ReadableInsightBody";
import {
  OrganicLayout,
  OrganicSection,
  OrganicStatCard,
  OverviewIllustration,
  ToneBadge,
} from "../components/organic/OrganicUI";

function operationalCategoryLabel(category) {
  const labels = {
    retention: "Retention",
    revenue: "Revenue",
    occupancy: "Occupancy",
    cancellation: "Cancellation",
    market: "Market",
  };
  return labels[category] || category;
}

function operationalSeverityTone(severity) {
  if (severity === "critical") return "complaint";
  if (severity === "warning") return "neutral";
  return "praise";
}

function JudgePillarCard({ step, title, detail }) {
  return (
    <article className="organic-pillar-card group relative grid gap-4 overflow-hidden rounded-[32px_18px_36px_22px] border border-[rgba(30,42,36,0.08)] bg-[rgba(255,255,255,0.65)] p-6 shadow-[0_12px_32px_rgba(30,42,36,0.06)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[rgba(184,90,50,0.55)] via-[rgba(61,122,106,0.45)] to-transparent transition-opacity duration-300 group-hover:opacity-100" />
      <p className="organic-pillar-step text-xs font-semibold uppercase tracking-[0.28em] text-[var(--earth-primary)]">{step}</p>
      <h3 className="font-['Fraunces',serif] text-[clamp(1.25rem,2vw,1.65rem)] font-semibold text-[var(--earth-secondary)]">{title}</h3>
      {detail ? <p className="text-sm leading-7 text-[var(--earth-text)]">{detail}</p> : null}
    </article>
  );
}

export default function OverviewPage() {
  const [selectedCity, setSelectedCity] = useState("Nha Trang");
  const [selectedSource, setSelectedSource] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState(fallbackMonthlyRevenue);
  const [alerts, setAlerts] = useState(fallbackAlerts);
  const [operationalPriorities, setOperationalPriorities] = useState(fallbackOperationalPriorities);
  const [insight, setInsight] = useState(fallbackInsight);
  const [revenueBriefAnalysis, setRevenueBriefAnalysis] = useState("");
  const [revenueBriefModel, setRevenueBriefModel] = useState("");
  const [loadingRevenueBrief, setLoadingRevenueBrief] = useState(false);
  const [revenueBriefError, setRevenueBriefError] = useState("");
  const [pricingRoomType, setPricingRoomType] = useState("");
  const [pricingScenario, setPricingScenario] = useState(
    "Cut Deluxe BAR by 8% for two weeks to lift midweek occupancy while keeping the current cancellation policy."
  );
  const [pricingAnalysis, setPricingAnalysis] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState("");

  const loadRevenueBrief = useCallback(async () => {
    setLoadingRevenueBrief(true);
    setRevenueBriefError("");
    try {
      const payload = await fetchRevenueManagerBrief({ area_name: selectedCity });
      setRevenueBriefAnalysis(payload.analysis);
      setRevenueBriefModel(payload.model_used);
    } catch (error) {
      setRevenueBriefAnalysis("");
      setRevenueBriefModel("");
      setRevenueBriefError(normalizeUiErrorMessage(error, "Could not load revenue briefing."));
    } finally {
      setLoadingRevenueBrief(false);
    }
  }, [selectedCity]);

  const runPricingSimulation = useCallback(async () => {
    const trimmed = pricingScenario.trim();
    if (trimmed.length < 8) {
      setPricingError("Scenario text must be at least 8 characters.");
      return;
    }
    setLoadingPricing(true);
    setPricingError("");
    try {
      const payload = await fetchPricingSimulation({
        area_name: selectedCity,
        room_type: pricingRoomType || null,
        scenario_input: trimmed,
      });
      setPricingAnalysis(payload.analysis);
      setPricingModel(payload.model_used);
    } catch (error) {
      setPricingAnalysis("");
      setPricingModel("");
      setPricingError(normalizeUiErrorMessage(error, "Could not run pricing simulation."));
    } finally {
      setLoadingPricing(false);
    }
  }, [pricingRoomType, pricingScenario, selectedCity]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const payload = await fetchDashboard();
        setMonthlyRevenue(payload.monthlyRevenue);
        setAlerts(payload.alerts);
        setOperationalPriorities(payload.operationalPriorities ?? fallbackOperationalPriorities);
      } catch {}
    }

    loadDashboardData();
  }, []);

  useEffect(() => {
    async function loadInsight() {
      try {
        const payload = await fetchCompetitorInsights({
          area_name: selectedCity,
          source: selectedSource || null,
          max_hotels: 8,
          max_reviews_per_hotel: 3,
        });
        setInsight(payload);
      } catch {
        setInsight({ ...fallbackInsight, area_name: selectedCity, source: selectedSource || null });
      }
    }

    loadInsight();
  }, [selectedCity, selectedSource]);

  useEffect(() => {
    loadRevenueBrief();
  }, [loadRevenueBrief]);

  return (
    <OrganicLayout
      pageKey="overview"
      sideArtwork={OverviewIllustration}
      hero={{
        eyebrow: null,
        title: "Overview",
        description: null,
        stats: [
          { label: "Monthly revenue", value: currency.format(monthlyRevenue.totalRevenue) },
          { label: "ADR", value: currency.format(monthlyRevenue.averageAdr) },
          { label: "Growth", value: `${monthlyRevenue.growthPercent >= 0 ? "+" : ""}${monthlyRevenue.growthPercent}%` },
        ],
        illustration: OverviewIllustration,
      }}
    >
      <OrganicSection
        eyebrow={null}
        title="Workflow"
        description="Suggested daily rhythm (pricing → sales → retention). Not a forced wizard."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <JudgePillarCard step="01" title="Pricing & strategy" detail={null} />
          <JudgePillarCard step="02" title="Sales & upsell" detail={null} />
          <JudgePillarCard step="03" title="Retention" detail={null} />
        </div>
      </OrganicSection>

      <OrganicSection
        eyebrow={null}
        title="Impact benchmark"
        description="Illustrative numbers—not live PMS data."
      >
        <div className="grid gap-6 md:grid-cols-3">
          <OrganicStatCard label="Front desk time" value="−35%" />
          <OrganicStatCard label="ADR" value="+4–9%" />
          <OrganicStatCard label="Risk churn" value="−18%" />
        </div>
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Metrics" description={null}>
        <section className="grid gap-6 md:grid-cols-3">
          <OrganicStatCard label="ADR" value={currency.format(monthlyRevenue.averageAdr)} />
          <OrganicStatCard label="Avg nights" value={`${monthlyRevenue.averageStayNights}`} />
          <OrganicStatCard label="Alerts" value={String(alerts.length).padStart(2, "0")} />
        </section>
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Priorities" description={null}>
        <div className="grid gap-5 lg:grid-cols-2">
          {operationalPriorities.map((row, index) => (
            <article
              key={`${row.category}-${index}`}
              className="hover-glow grid gap-4 rounded-[32px_18px_36px_22px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.56)] p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={operationalSeverityTone(row.severity)}>{row.severity}</ToneBadge>
                <ToneBadge tone="neutral">{operationalCategoryLabel(row.category)}</ToneBadge>
              </div>
              <h3 className="font-['Fraunces',serif] text-[clamp(1.2rem,1.8vw,1.45rem)] font-semibold text-[var(--earth-secondary)]">
                {row.title}
              </h3>
              <div className="rounded-[22px] border border-[rgba(61,122,106,0.22)] bg-[rgba(61,122,106,0.07)] p-4 text-sm leading-7 text-[var(--earth-secondary)]">
                {row.suggestedAction}
              </div>
              {row.routeHint && row.routeHint !== "/" ? (
                <Link
                  to={row.routeHint}
                  className="inline-flex w-fit items-center text-sm font-semibold text-[var(--earth-primary)] underline-offset-4 hover:underline"
                >
                  Open
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </OrganicSection>

      <OrganicSection
        eyebrow={null}
        title="AI Revenue Manager"
        description={null}
        action={
          <button
            type="button"
            onClick={() => loadRevenueBrief()}
            disabled={loadingRevenueBrief}
            className="px-4 py-3 text-sm font-semibold"
          >
            {loadingRevenueBrief ? "Analyzing…" : "Refresh briefing"}
          </button>
        }
      >
        {revenueBriefError ? (
          <p className="text-sm font-medium text-[var(--earth-text)]">{revenueBriefError}</p>
        ) : loadingRevenueBrief && !revenueBriefAnalysis ? (
          <div className="skeleton h-52 rounded-[28px] border border-[rgba(30,42,36,0.08)]" />
        ) : (
          <ReadableInsightBody text={revenueBriefAnalysis} modelUsed={revenueBriefModel} />
        )}
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Pricing Lab" description={null}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid gap-4 rounded-[28px] border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.65)] p-5">
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[var(--earth-secondary)]">
                Market
                <select
                  value={selectedCity}
                  onChange={(event) => setSelectedCity(event.target.value)}
                  className="px-4 py-3 text-sm font-semibold"
                >
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[var(--earth-secondary)]">
                Room type
                <select
                  value={pricingRoomType}
                  onChange={(event) => setPricingRoomType(event.target.value)}
                  className="px-4 py-3 text-sm font-semibold"
                >
                  {pricingSimRoomOptions.map((opt) => (
                    <option key={opt.value || "auto"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-[var(--earth-secondary)]">
              Scenario to simulate
              <textarea
                value={pricingScenario}
                onChange={(event) => setPricingScenario(event.target.value)}
                rows={5}
                className="min-h-[120px] px-4 py-3 text-sm leading-7"
                placeholder="Describe the scenario…"
              />
            </label>
            <button
              type="button"
              onClick={() => runPricingSimulation()}
              disabled={loadingPricing || pricingScenario.trim().length < 8}
              className="justify-self-start px-5 py-3 text-sm font-semibold"
            >
              {loadingPricing ? "Running…" : "Run simulation"}
            </button>
            {pricingError ? <p className="text-sm font-medium text-[var(--earth-text)]">{pricingError}</p> : null}
          </div>
          <div className="min-w-0 rounded-[28px] border border-[rgba(30,42,36,0.08)] bg-[rgba(255,255,255,0.55)] p-5">
            {loadingPricing && !pricingAnalysis ? (
              <div className="skeleton h-56 rounded-2xl border border-[rgba(30,42,36,0.06)]" />
            ) : (
              <ReadableInsightBody text={pricingAnalysis} modelUsed={pricingModel} />
            )}
          </div>
        </div>
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Market lens" description={null}
        action={
          <div className="flex flex-wrap gap-3">
            <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} className="px-4 py-3 text-sm font-semibold">
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
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="hover-glow grid gap-5 rounded-[32px_18px_38px_20px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.58)] p-6">
            <div className="flex flex-wrap items-center gap-3">
              <ToneBadge tone="neutral">
                {selectedSource ? sourceOptions.find((option) => option.value === selectedSource)?.label : "All Sources"}
              </ToneBadge>
              <ToneBadge tone="praise">{insight.hotels_analyzed} hotels</ToneBadge>
              <ToneBadge tone="complaint">{insight.reviews_analyzed} reviews</ToneBadge>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[rgba(30,42,36,0.08)] pb-4">
              <h2 className="font-['Fraunces',serif] text-[clamp(1.75rem,3vw,2.6rem)] font-semibold tracking-tight text-[var(--earth-secondary)]">
                Strategic summary
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--earth-text-subtle)]">Market</span>
            </div>
            <ReadableInsightBody text={insight.strategic_summary} modelUsed={insight.model_used} className="mt-5" />
          </article>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="grid gap-4 rounded-[22px_36px_24px_38px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-6">
              <h3 className="text-[clamp(1.4rem,2vw,2rem)] text-[var(--earth-secondary)]">What guests praise</h3>
              <div className="flex flex-wrap gap-2">
                {insight.praise_points.map((item) => (
                  <ToneBadge key={item} tone="praise">
                    {item}
                  </ToneBadge>
                ))}
              </div>
            </article>
            <article className="grid gap-4 rounded-[36px_22px_38px_24px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-6">
              <h3 className="text-[clamp(1.4rem,2vw,2rem)] text-[var(--earth-secondary)]">What guests complain about</h3>
              <div className="flex flex-wrap gap-2">
                {insight.complaint_points.map((item) => (
                  <ToneBadge key={item} tone="complaint">
                    {item}
                  </ToneBadge>
                ))}
              </div>
            </article>
          </div>
        </div>
      </OrganicSection>

    </OrganicLayout>
  );
}
