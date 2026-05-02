import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  cityOptions,
  currency,
  demandScenarioOptions,
  fallbackAlerts,
  fallbackInsight,
  fallbackMonthlyRevenue,
  fallbackOperationalPulse,
  fallbackPeriodComparison,
  fallbackOperationalPriorities,
  fetchCompetitorInsights,
  fetchDashboard,
  fetchPricingSimulation,
  fetchProperties,
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

function formatPulseDate(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPctVersusPrior(pct, versusLabel = "prior window") {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return `vs ${versusLabel}: —`;
  const n = Number(pct);
  const sign = n >= 0 ? "+" : "";
  return `vs ${versusLabel}: ${sign}${n}%`;
}

function PeriodComparisonCards({ block, pctVersusLabel = "prior window" }) {
  if (!block) return null;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <OrganicStatCard
        label={`Arrivals (${block.currentLabel})`}
        value={`${block.arrivalsCurrent}`}
        hint={`${block.previousLabel}: ${block.arrivalsPrevious} · ${formatPctVersusPrior(block.arrivalsChangePct, pctVersusLabel)}`}
      />
      <OrganicStatCard
        label={`Departures (${block.currentLabel})`}
        value={`${block.departuresCurrent}`}
        hint={`${block.previousLabel}: ${block.departuresPrevious} · ${formatPctVersusPrior(block.departuresChangePct, pctVersusLabel)}`}
      />
      <OrganicStatCard
        label="Revenue (check-ins in window)"
        value={currency.format(block.checkInRevenueCurrent)}
        hint={`${block.previousLabel}: ${currency.format(block.checkInRevenuePrevious)} · ${formatPctVersusPrior(
          block.revenueChangePct,
          pctVersusLabel
        )}`}
      />
    </div>
  );
}

function formatIsoRangeShort(startIso, endIso) {
  if (!startIso || !endIso || typeof startIso !== "string" || typeof endIso !== "string") return "";
  const fmt = (iso) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

function JudgePillarCard({ step, title, detail }) {
  return (
    <article className="organic-pillar-card group relative grid gap-2 overflow-hidden rounded-2xl border border-[rgba(30,42,36,0.08)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_8px_28px_rgba(30,42,36,0.05)] sm:gap-3 sm:rounded-[28px_16px_30px_18px] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[rgba(184,90,50,0.35)] via-[rgba(61,122,106,0.28)] to-transparent" />
      <p className="organic-pillar-step text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--earth-text-subtle)]">{step}</p>
      <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--earth-secondary)] sm:text-[1.25rem]">{title}</h3>
      {detail ? <p className="text-sm leading-relaxed text-[var(--earth-text-muted)]">{detail}</p> : null}
    </article>
  );
}

function DataGroundingDetails({ title, data }) {
  if (!data || typeof data !== "object") return null;
  return (
    <details className="mt-4 rounded-2xl border border-[rgba(61,122,106,0.2)] bg-[rgba(61,122,106,0.06)] p-4 text-xs text-[var(--earth-secondary)]">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--earth-primary)]">{title}</summary>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

export default function OverviewPage() {
  const [selectedCity, setSelectedCity] = useState("Nha Trang");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [properties, setProperties] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState(fallbackMonthlyRevenue);
  const [alerts, setAlerts] = useState(fallbackAlerts);
  const [operationalPriorities, setOperationalPriorities] = useState(fallbackOperationalPriorities);
  const [operationalPulse, setOperationalPulse] = useState(fallbackOperationalPulse);
  const [periodComparison, setPeriodComparison] = useState(fallbackPeriodComparison);
  const [calendarWeekComparison, setCalendarWeekComparison] = useState(fallbackPeriodComparison);
  const [pipelineComparison, setPipelineComparison] = useState(fallbackPeriodComparison);
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
  const [pricingGrounding, setPricingGrounding] = useState(null);
  const [pricingDemandScenario, setPricingDemandScenario] = useState("baseline");
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [revenueBriefGrounding, setRevenueBriefGrounding] = useState(null);

  useEffect(() => {
    fetchProperties()
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  const loadRevenueBrief = useCallback(async () => {
    setLoadingRevenueBrief(true);
    setRevenueBriefError("");
    try {
      const payload = await fetchRevenueManagerBrief({ area_name: selectedCity });
      setRevenueBriefAnalysis(payload.analysis);
      setRevenueBriefModel(payload.model_used);
      setRevenueBriefGrounding(payload.data_grounding ?? null);
    } catch (error) {
      setRevenueBriefAnalysis("");
      setRevenueBriefModel("");
      setRevenueBriefGrounding(null);
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
        demand_scenario: pricingDemandScenario,
        property_id: selectedPropertyId === "" ? null : Number(selectedPropertyId),
      });
      setPricingAnalysis(payload.analysis);
      setPricingModel(payload.model_used);
      setPricingGrounding(payload.data_grounding ?? null);
    } catch (error) {
      setPricingAnalysis("");
      setPricingModel("");
      setPricingGrounding(null);
      setPricingError(normalizeUiErrorMessage(error, "Could not run pricing simulation."));
    } finally {
      setLoadingPricing(false);
    }
  }, [pricingDemandScenario, pricingRoomType, pricingScenario, selectedCity, selectedPropertyId]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const pid = selectedPropertyId === "" ? null : Number(selectedPropertyId);
        const payload = await fetchDashboard(pid);
        setMonthlyRevenue(payload.monthlyRevenue);
        setAlerts(payload.alerts);
        setOperationalPriorities(payload.operationalPriorities ?? fallbackOperationalPriorities);
        setOperationalPulse(payload.operationalPulse ?? fallbackOperationalPulse);
        setPeriodComparison(payload.periodComparison ?? fallbackPeriodComparison);
        setCalendarWeekComparison(payload.calendarWeekComparison ?? fallbackPeriodComparison);
        setPipelineComparison(payload.pipelineComparison ?? fallbackPeriodComparison);
        if (payload.propertyScope?.areaName) {
          setSelectedCity(payload.propertyScope.areaName);
        }
      } catch {}
    }

    loadDashboardData();
  }, [selectedPropertyId]);

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
        title="Property scope"
        description="Filter HIGH-risk alerts and occupancy signals to one hotel; market dropdown follows property area."
      >
        <label className="grid max-w-lg gap-2 text-sm font-semibold text-[var(--earth-secondary)]">
          Active property
          <select
            className="px-4 py-3 text-sm font-semibold"
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
          >
            <option value="">All properties (combined)</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.area_name}
              </option>
            ))}
          </select>
        </label>
      </OrganicSection>

      <OrganicSection
        eyebrow={null}
        title="Operations pulse"
        description={`Snapshot from seeded PMS bookings · ${formatPulseDate(operationalPulse.asOfDate)} · respects property filter above.`}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <OrganicStatCard
            label="Tonight occupancy"
            value={`${operationalPulse.occupancyPctTonight}%`}
            hint={`${operationalPulse.occupiedRoomsTonight} / ${operationalPulse.totalRooms} rooms`}
          />
          <OrganicStatCard label="Rooms occupied tonight" value={`${operationalPulse.occupiedRoomsTonight}`} />
          <OrganicStatCard label="Sellable room inventory" value={`${operationalPulse.totalRooms}`} />
          <OrganicStatCard
            label="Arrivals (7 days)"
            value={`${operationalPulse.arrivalsNext7Days}`}
            hint="Check-ins from today through the next week."
          />
          <OrganicStatCard
            label="Departures (7 days)"
            value={`${operationalPulse.departuresNext7Days}`}
            hint="Check-outs in the same window."
          />
          <OrganicStatCard
            label="Arrivals pipeline (30 days)"
            value={`${operationalPulse.futureCheckInsNext30Days}`}
            hint="Confirmed stays starting within 30 days."
          />
        </div>
      </OrganicSection>

      {periodComparison ? (
        <OrganicSection
          eyebrow={null}
          title="Period comparison (rolling)"
          description={`Last 7 days vs the prior 7 days (check-in / check-out dates). Windows: ${formatIsoRangeShort(
            periodComparison.currentStart,
            periodComparison.currentEnd
          )} vs ${formatIsoRangeShort(periodComparison.previousStart, periodComparison.previousEnd)} · as of ${formatPulseDate(
            periodComparison.asOfDate
          )}.`}
        >
          <PeriodComparisonCards block={periodComparison} pctVersusLabel="prior window" />
        </OrganicSection>
      ) : null}

      {calendarWeekComparison ? (
        <OrganicSection
          eyebrow={null}
          title="Calendar week (Mon–Sun)"
          description={`ISO weeks (Monday start). Current: ${formatIsoRangeShort(
            calendarWeekComparison.currentStart,
            calendarWeekComparison.currentEnd
          )} · Previous: ${formatIsoRangeShort(
            calendarWeekComparison.previousStart,
            calendarWeekComparison.previousEnd
          )} · as of ${formatPulseDate(calendarWeekComparison.asOfDate)}.`}
        >
          <PeriodComparisonCards block={calendarWeekComparison} pctVersusLabel="last week" />
        </OrganicSection>
      ) : null}

      {pipelineComparison ? (
        <OrganicSection
          eyebrow={null}
          title="Forward pipeline"
          description={`Check-ins in the next 7 days vs the 7 days after that (still keyed on check-in / check-out for departures). Near: ${formatIsoRangeShort(
            pipelineComparison.currentStart,
            pipelineComparison.currentEnd
          )} · Further out: ${formatIsoRangeShort(pipelineComparison.previousStart, pipelineComparison.previousEnd)} · as of ${formatPulseDate(
            pipelineComparison.asOfDate
          )}.`}
        >
          <PeriodComparisonCards block={pipelineComparison} pctVersusLabel="following window" />
        </OrganicSection>
      ) : null}

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
          <>
            <ReadableInsightBody text={revenueBriefAnalysis} modelUsed={revenueBriefModel} />
            <DataGroundingDetails title="Numeric grounding sent to the model" data={revenueBriefGrounding} />
          </>
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
              <label className="grid gap-2 text-sm font-semibold text-[var(--earth-secondary)] sm:col-span-2">
                Demand scenario
                <select
                  value={pricingDemandScenario}
                  onChange={(event) => setPricingDemandScenario(event.target.value)}
                  className="px-4 py-3 text-sm font-semibold"
                >
                  {demandScenarioOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
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
              <>
                <ReadableInsightBody text={pricingAnalysis} modelUsed={pricingModel} />
                <DataGroundingDetails title="Simulation context & grounding" data={pricingGrounding} />
              </>
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
            <DataGroundingDetails title="Competitor rows used for this insight" data={insight.data_grounding} />
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
