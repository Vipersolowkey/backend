import { useEffect, useMemo, useState } from "react";

import {
  currency,
  evaluateAlertThresholds,
  fallbackAlerts,
  fallbackMonthlyRevenue,
  fetchDashboard,
  fetchPromoEmail,
  fetchProperties,
  normalizeUiErrorMessage,
} from "../lib/dashboardApi";
import {
  AlertsIllustration,
  OrganicLayout,
  OrganicSection,
  OrganicStageCard,
  OrganicStatCard,
  ToneBadge,
} from "../components/organic/OrganicUI";

export default function AlertsPage() {
  const [monthlyRevenue, setMonthlyRevenue] = useState(fallbackMonthlyRevenue);
  const [alerts, setAlerts] = useState(fallbackAlerts);
  const [promoPreview, setPromoPreview] = useState(null);
  const [alertSearch, setAlertSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

  const pageStages = [
    { step: "01", title: "Overview", detail: null },
    { step: "02", title: "Detail", detail: null },
    { step: "03", title: "Email", detail: null },
  ];

  useEffect(() => {
    fetchProperties()
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const pid = selectedPropertyId === "" ? null : Number(selectedPropertyId);
        const payload = await fetchDashboard(pid);
        setMonthlyRevenue(payload.monthlyRevenue);
        setAlerts(payload.alerts);
      } catch {
        setAlerts(fallbackAlerts);
      }
    }

    loadDashboardData();
  }, [selectedPropertyId]);

  const filteredAlerts = useMemo(() => {
    const keyword = alertSearch.trim().toLowerCase();
    return alerts.filter((alert) =>
      [alert.bookingId, alert.guestName, alert.roomType, alert.stayDates].some((field) =>
        String(field || "").toLowerCase().includes(keyword)
      )
    );
  }, [alertSearch, alerts]);

  const summary = useMemo(() => {
    const totalGap = filteredAlerts.reduce(
      (sum, alert) => sum + (alert.competitorPrice ? alert.bookedPrice - alert.competitorPrice : 0),
      0
    );

    return {
      total: filteredAlerts.length,
      totalGap,
      generated: filteredAlerts.filter((alert) => alert.promoGenerated).length,
    };
  }, [filteredAlerts]);

  async function handleGenerate(alert) {
    setLoadingId(alert.bookingId);
    setStatusMessage("");

    try {
      const payload = await fetchPromoEmail({
        booking_id: alert.bookingId,
        guest_name: alert.guestName,
        guest_email: alert.email,
        room_type: alert.roomType,
        stay_dates: alert.stayDates,
        booked_price: alert.bookedPrice,
        competitor_price: alert.competitorPrice,
        risk_level: alert.risk,
        area_name: "Nha Trang",
      });

      setPromoPreview({
        bookingId: alert.bookingId,
        guestName: alert.guestName,
        subject: payload.subject,
        emailBody: payload.email_body,
        modelUsed: payload.model_used,
      });
      setStatusMessage(payload.message);
      setAlerts((current) =>
        current.map((item) => (item.bookingId === alert.bookingId ? { ...item, promoGenerated: true } : item))
      );
    } catch (error) {
      setStatusMessage(normalizeUiErrorMessage(error, "Could not generate promo email right now."));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <OrganicLayout
      pageKey="alerts"
      sideArtwork={AlertsIllustration}
      hero={{
        eyebrow: null,
        title: "Alerts",
        description: null,
        stats: [
          { label: "Alerts", value: String(summary.total).padStart(2, "0") },
          { label: "Gap vs market", value: currency.format(summary.totalGap || 0) },
          { label: "Revenue", value: currency.format(monthlyRevenue.totalRevenue) },
        ],
        illustration: AlertsIllustration,
      }}
    >
      <OrganicSection eyebrow={null} title="Workflow" description={null}>
        <div className="grid gap-6 lg:grid-cols-3">
          {pageStages.map((item, index) => (
            <OrganicStageCard
              key={item.step}
              step={item.step}
              title={item.title}
              detail={item.detail}
              isLast={index === pageStages.length - 1}
            />
          ))}
        </div>
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Threshold engine" description="Compare live occupancy and HIGH-risk counts vs configured rules; optional webhook POST when triggered.">
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[var(--earth-secondary)]">
            Property scope
            <select
              className="min-w-[220px] px-3 py-2"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={evalLoading}
            className="rounded-full border border-[rgba(61,122,106,0.35)] bg-[rgba(61,122,106,0.12)] px-5 py-3 text-sm font-semibold text-[var(--earth-secondary)]"
            onClick={async () => {
              setEvalLoading(true);
              try {
                const pid = selectedPropertyId === "" ? null : Number(selectedPropertyId);
                const res = await evaluateAlertThresholds(pid);
                setEvalResult(res);
              } catch {
                setEvalResult({ error: "Evaluate failed" });
              } finally {
                setEvalLoading(false);
              }
            }}
          >
            {evalLoading ? "Evaluating…" : "Run threshold check"}
          </button>
        </div>
        {evalResult ? (
          <pre className="mt-4 max-h-64 overflow-auto rounded-2xl border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.65)] p-4 text-xs leading-relaxed">
            {JSON.stringify(evalResult, null, 2)}
          </pre>
        ) : null}
      </OrganicSection>

      {promoPreview ? (
        <OrganicSection
          eyebrow={null}
          title="Email"
          description={null}
          action={
            <button type="button" onClick={() => setPromoPreview(null)} className="px-4 py-3 text-sm font-semibold">
              Close preview
            </button>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            <article className="rounded-[36px_18px_32px_22px] border border-[rgba(196,113,74,0.2)] bg-[rgba(196,113,74,0.08)] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--earth-primary)]">Subject</p>
              <h3 className="mt-4 text-[clamp(1.6rem,2.5vw,2.3rem)] text-[var(--earth-secondary)]">{promoPreview.subject}</h3>
              <p className="mt-4 text-sm leading-7 text-[var(--earth-text-muted)]">Booking: {promoPreview.bookingId}</p>
            </article>
            <article className="rounded-[22px_34px_20px_36px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-6">
              <pre className="whitespace-pre-wrap font-inherit text-sm leading-8 text-[var(--earth-text-muted)]">{promoPreview.emailBody}</pre>
            </article>
          </div>
        </OrganicSection>
      ) : null}

      <OrganicSection eyebrow={null} title="Overview" description={null}
        action={
          <input
            value={alertSearch}
            onChange={(event) => setAlertSearch(event.target.value)}
            placeholder="Search booking or guest..."
            className="px-4 py-3 text-sm"
          />
        }
      >
        <div className="grid gap-6 lg:grid-cols-4">
          <OrganicStatCard label="High-risk" value={summary.total} />
          <OrganicStatCard label="Price gap" value={currency.format(summary.totalGap || 0)} />
          <OrganicStatCard label="Offers sent" value={summary.generated} />
          <article className="rounded-[24px_36px_20px_34px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-5">
            <h3 className="text-[clamp(1.4rem,2vw,2rem)] text-[var(--earth-secondary)]">Status</h3>
            <p className="mt-4 text-sm leading-7 text-[var(--earth-text)]">{statusMessage || "—"}</p>
          </article>
        </div>
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Booking" description={null}>
        <div className="grid gap-6">
          {filteredAlerts.map((alert) => {
            const gap = alert.competitorPrice ? alert.bookedPrice - alert.competitorPrice : 0;

            return (
              <article
                key={alert.bookingId}
                className="grid gap-5 rounded-[40px_18px_38px_24px] border border-[rgba(107,66,38,0.14)] bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(240,231,220,0.92))] p-6 xl:grid-cols-[1.08fr_0.92fr_auto]"
              >
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="complaint">{alert.risk} risk</ToneBadge>
                    <ToneBadge tone="neutral">{alert.bookingId}</ToneBadge>
                    {alert.promoGenerated ? <ToneBadge tone="praise">offer ready</ToneBadge> : null}
                  </div>
                  <div className="grid gap-2">
                    <h3 className="text-[clamp(1.5rem,2vw,2.1rem)] text-[var(--earth-secondary)]">{alert.guestName}</h3>
                    <p className="text-sm font-medium text-[var(--earth-text-subtle)]">
                      {alert.roomType} · {alert.stayDates}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                  <OrganicStatCard label="Booked rate" value={currency.format(alert.bookedPrice)} />
                  <OrganicStatCard label="Benchmark" value={alert.competitorPrice ? currency.format(alert.competitorPrice) : "—"} />
                  <OrganicStatCard label="Delta" value={currency.format(gap)} />
                </div>

                <div className="flex flex-col justify-center gap-3 xl:min-w-[220px]">
                  <button type="button" onClick={() => handleGenerate(alert)} disabled={loadingId === alert.bookingId} className="px-5 py-3 text-sm font-semibold">
                    {loadingId === alert.bookingId ? "Generating email..." : alert.promoGenerated ? "Regenerate email" : "Generate retention email"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </OrganicSection>
    </OrganicLayout>
  );
}
