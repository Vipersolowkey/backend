import { useEffect, useState } from "react";

import { OrganicLayout, OrganicSection } from "../components/organic/OrganicUI";
import { fetchInsightsLeaderboards, normalizeUiErrorMessage } from "../lib/dashboardApi";

/** Shown when `/insights/leaderboards` returns empty arrays (e.g. DB not seeded on serverless). */
const FALLBACK_ROOM_TYPES = [
  { room_type_id: "demo-1", code: "I", name: "Imperial Suite", avg_rating: 4.93, review_count: 142 },
  { room_type_id: "demo-2", code: "F", name: "Family Ocean", avg_rating: 4.9, review_count: 228 },
  { room_type_id: "demo-3", code: "P", name: "Premier Sea View", avg_rating: 4.88, review_count: 156 },
  { room_type_id: "demo-4", code: "D", name: "Deluxe Garden", avg_rating: 4.86, review_count: 338 },
  { room_type_id: "demo-5", code: "L", name: "Lagoon Villa", avg_rating: 4.85, review_count: 98 },
];

const FALLBACK_SERVICES = [
  { service_key: "spa", name_vi: "Spa & therapeutic massage", avg_rating: 4.91, review_count: 124 },
  { service_key: "breakfast_buffet", name_vi: "International breakfast buffet", avg_rating: 4.88, review_count: 468 },
  { service_key: "rooftop_bar", name_vi: "Rooftop bar & sunset", avg_rating: 4.85, review_count: 256 },
  { service_key: "airport_transfer", name_vi: "Airport transfer", avg_rating: 4.78, review_count: 224 },
  { service_key: "concierge", name_vi: "Concierge & day tours", avg_rating: 4.8, review_count: 198 },
  { service_key: "pool", name_vi: "Pool & pool bar", avg_rating: 4.75, review_count: 234 },
];

const FALLBACK_UPSELLS = [
  {
    sku: "addon_breakfast_pkg",
    name_vi: "Extra breakfast / late checkout bundle",
    orders_last_30d: 156,
    share_last_30d_pct: 18.2,
    orders_all_time: 2288,
    revenue_last_30d: 31_200_000,
  },
  {
    sku: "addon_airport_transfer",
    name_vi: "Round-trip airport transfer",
    orders_last_30d: 132,
    share_last_30d_pct: 15.4,
    orders_all_time: 1960,
    revenue_last_30d: 44_800_000,
  },
  {
    sku: "addon_spa_slot",
    name_vi: "Spa golden-hour slot booking",
    orders_last_30d: 108,
    share_last_30d_pct: 12.6,
    orders_all_time: 1024,
    revenue_last_30d: 22_400_000,
  },
  {
    sku: "addon_room_upgrade",
    name_vi: "Room upgrade / sea view",
    orders_last_30d: 92,
    share_last_30d_pct: 10.7,
    orders_all_time: 812,
    revenue_last_30d: 18_200_000,
  },
  {
    sku: "addon_rooftop_dinner",
    name_vi: "Rooftop dinner set for two",
    orders_last_30d: 71,
    share_last_30d_pct: 8.3,
    orders_all_time: 540,
    revenue_last_30d: 15_800_000,
  },
];

function formatVnd(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    Number(n),
  );
}

function Stars({ value }) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  return (
    <span className="whitespace-nowrap" title={`${v.toFixed(2)} / 5`}>
      <span className="font-semibold tabular-nums text-[var(--earth-secondary)]">{v.toFixed(2)}</span>
      <span className="ml-1 text-amber-600">/ 5 ★</span>
    </span>
  );
}

export default function InsightsRankingsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchInsightsLeaderboards()
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e) => {
        if (!cancelled) setError(normalizeUiErrorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const apiRooms = data?.room_types ?? [];
  const apiServices = data?.services ?? [];
  const apiUpsells = data?.upsell_addons ?? [];

  const rooms = apiRooms.length > 0 ? apiRooms : FALLBACK_ROOM_TYPES;
  const services = apiServices.length > 0 ? apiServices : FALLBACK_SERVICES;
  const upsells = apiUpsells.length > 0 ? apiUpsells : FALLBACK_UPSELLS;

  const roomsAreSample = apiRooms.length === 0;
  const servicesAreSample = apiServices.length === 0;
  const upsellsAreSample = apiUpsells.length === 0;

  return (
    <OrganicLayout
      pageKey="insights-rankings"
      sideArtwork={false}
      hero={{
        eyebrow: "Insights",
        title: "Room & service rankings",
        description:
          "Top-rated room types and services; most-used upsell add-ons in the last 30 days — demo rollup data after seed.",
        stats: [],
        illustration: null,
        note: error ? `API error: ${error}` : null,
      }}
    >
      {roomsAreSample || servicesAreSample || upsellsAreSample ? (
        <p className="-mt-2 mb-2 text-xs text-[var(--earth-text-muted)]">
          Sample rows fill empty leaderboard sections until the API returns seeded data (
          <code className="rounded bg-black/5 px-1">seed_db.py</code> on your database).
        </p>
      ) : null}

      <OrganicSection
        eyebrow="Rooms"
        title="Room types guests rate highest"
        description="Average score and internal survey / review count (illustrative data)."
      >
        {roomsAreSample ? (
          <p className="mb-2 text-xs font-medium text-amber-800/90">Showing sample data — no room rollup from API.</p>
        ) : null}
        <div className="overflow-x-auto rounded-2xl border border-[rgba(107,66,38,0.12)] bg-[rgba(255,255,255,0.65)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[rgba(30,42,36,0.1)] text-xs font-semibold uppercase tracking-wide text-[var(--earth-text-subtle)]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Room type</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Avg score</th>
                  <th className="px-4 py-3 text-right">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(30,42,36,0.06)]">
                {rooms.map((row, idx) => (
                  <tr key={String(row.room_type_id)} className="text-[var(--earth-secondary)]">
                    <td className="px-4 py-3 font-medium text-[var(--earth-text-muted)]">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold">{row.name}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--earth-text-muted)]">{row.code}</td>
                    <td className="px-4 py-3">
                      <Stars value={row.avg_rating} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.review_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </OrganicSection>

      <OrganicSection
        eyebrow="Services"
        title="Highest-rated services"
        description="Spa, F&B, transfers, concierge… — ranked by satisfaction score."
      >
        {servicesAreSample ? (
          <p className="mb-2 text-xs font-medium text-amber-800/90">Showing sample data — no service rollup from API.</p>
        ) : null}
        <div className="overflow-x-auto rounded-2xl border border-[rgba(107,66,38,0.12)] bg-[rgba(255,255,255,0.65)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[rgba(30,42,36,0.1)] text-xs font-semibold uppercase tracking-wide text-[var(--earth-text-subtle)]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Avg score</th>
                  <th className="px-4 py-3 text-right">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(30,42,36,0.06)]">
                {services.map((row, idx) => (
                  <tr key={row.service_key} className="text-[var(--earth-secondary)]">
                    <td className="px-4 py-3 font-medium text-[var(--earth-text-muted)]">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold">{row.name_vi}</td>
                    <td className="px-4 py-3">
                      <Stars value={row.avg_rating} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.review_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </OrganicSection>

      <OrganicSection
        eyebrow="Upsell / Add-on"
        title="Most-used add-on services"
        description="Orders in the last 30 days, share of add-on orders in the period, and estimated 30-day revenue."
      >
        {upsellsAreSample ? (
          <p className="mb-2 text-xs font-medium text-amber-800/90">Showing sample data — no upsell rollup from API.</p>
        ) : null}
        <div className="overflow-x-auto rounded-2xl border border-[rgba(107,66,38,0.12)] bg-[rgba(255,255,255,0.65)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[rgba(30,42,36,0.1)] text-xs font-semibold uppercase tracking-wide text-[var(--earth-text-subtle)]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Add-on</th>
                  <th className="px-4 py-3 text-right">Orders (30d)</th>
                  <th className="px-4 py-3 text-right">% of period</th>
                  <th className="px-4 py-3 text-right">All-time orders</th>
                  <th className="px-4 py-3 text-right">Rev. (30d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(30,42,36,0.06)]">
                {upsells.map((row, idx) => (
                  <tr key={row.sku} className="text-[var(--earth-secondary)]">
                    <td className="px-4 py-3 font-medium text-[var(--earth-text-muted)]">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.name_vi}</p>
                      <p className="text-xs text-[var(--earth-text-muted)]">{row.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.orders_last_30d}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--earth-text-muted)]">
                      {row.share_last_30d_pct}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.orders_all_time}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatVnd(row.revenue_last_30d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </OrganicSection>
    </OrganicLayout>
  );
}
