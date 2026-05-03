import { Link } from "react-router-dom";

import { OrganicLayout, OrganicSection } from "../components/organic/OrganicUI";
import { ownerPulseKpis, ownerPulseRows } from "../lib/guestAppMockData";

function formatVnd(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

export default function OwnerGuestAppPulsePage() {
  return (
    <OrganicLayout
      pageKey="owner-guest-pulse"
      sideArtwork={false}
      hero={{
        eyebrow: "Two-way · Owner",
        title: "Guest app pulse",
        description:
          "Quick view of guest behavior in the app (upsell, in-room dining, notifications). Illustrative data — wire to real APIs later.",
        stats: ownerPulseKpis.map((k) => ({ label: k.label, value: k.value })),
        note: "Upsell details and app events can be connected from CRM / analytics backend.",
        illustration: null,
      }}
    >
      <OrganicSection
        eyebrow="Demo"
        title="Guest journey in the app"
        description="MVP focuses on the guest UI. This owner pulse adds the hotel-operator perspective."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/guest-app"
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--earth-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Open guest app (demo)
            </Link>
            <Link
              to="/insights-rankings"
              className="inline-flex items-center justify-center rounded-2xl border border-[rgba(30,42,36,0.15)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--earth-secondary)] shadow-sm transition hover:bg-[rgba(255,255,255,0.92)]"
            >
              Room & upsell rankings
            </Link>
          </div>
        }
      >
        <div className="overflow-x-auto rounded-2xl border border-[rgba(107,66,38,0.12)] bg-[rgba(255,255,255,0.65)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.5)] text-xs font-semibold uppercase tracking-wide text-[var(--earth-text-subtle)]">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Latest action</th>
                <th className="px-4 py-3 text-right">Upsell (demo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(30,42,36,0.06)]">
              {ownerPulseRows.map((row) => (
                <tr key={row.guest + row.room} className="text-[var(--earth-secondary)]">
                  <td className="px-4 py-3 font-medium">{row.guest}</td>
                  <td className="px-4 py-3 tabular-nums">{row.room}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[rgba(61,122,106,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[var(--earth-accent)]">
                      {row.segment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--earth-text-muted)]">{row.lastAction}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatVnd(row.upsellValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OrganicSection>
    </OrganicLayout>
  );
}
