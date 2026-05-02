import { useEffect, useMemo, useState } from "react";

import { OrganicLayout, OrganicSection } from "../components/organic/OrganicUI";
import { fetchOccupancyCalendar, fetchProperties } from "../lib/dashboardApi";

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [propertyId, setPropertyId] = useState("");
  const [properties, setProperties] = useState([]);
  const [days, setDays] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProperties()
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetchOccupancyCalendar(year, month, propertyId === "" ? null : Number(propertyId))
      .then((payload) => {
        if (!cancelled) setDays(payload.days || []);
      })
      .catch(() => {
        if (!cancelled) {
          setDays([]);
          setError("Could not load occupancy calendar.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, propertyId]);

  const maxPct = useMemo(() => days.reduce((m, d) => Math.max(m, Number(d.occupancy_pct) || 0), 0), [days]);

  const formatPct = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return "0";
    return n >= 10 ? n.toFixed(0) : n.toFixed(1);
  };

  const paddedDays = useMemo(() => {
    const firstJs = new Date(year, month - 1, 1).getDay();
    const pad = (firstJs + 6) % 7;
    return [...Array(pad).fill(null), ...days];
  }, [year, month, days]);

  return (
    <OrganicLayout
      pageKey="calendar"
      hero={{
        eyebrow: "Operations",
        title: "Occupancy calendar",
        description: "Share of inventory with in-stay bookings per night (proxy).",
        stats: [],
        illustration: null,
      }}
    >
      <OrganicSection eyebrow={null} title="Filters" description={null}>
        <div className="flex flex-wrap gap-4">
          <label className="grid gap-1 text-sm font-semibold text-[var(--earth-secondary)]">
            Year
            <input
              type="number"
              className="min-w-[120px] px-3 py-2"
              value={year}
              min={2024}
              max={2030}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--earth-secondary)]">
            Month
            <select className="px-3 py-2" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--earth-secondary)]">
            Property
            <select className="min-w-[220px] px-3 py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-amber-800">{error}</p> : null}
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Heatmap" description="Darker green = higher occupancy proxy for that night.">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--earth-secondary)]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {paddedDays.map((d, idx) => {
            if (!d) return <div key={`pad-${idx}`} className="min-h-[52px]" />;
            const pct = Number(d.occupancy_pct) || 0;
            const intensity = maxPct > 0 ? pct / maxPct : 0;
            const bg = `rgba(61,122,106,${0.08 + intensity * 0.42})`;
            const pctLabel = formatPct(pct);
            return (
              <div
                key={d.date}
                title={`${d.date}: ${pctLabel}% (${d.occupied_rooms}/${d.total_rooms} rooms)`}
                className="rounded-xl border border-[rgba(30,42,36,0.08)] p-2 text-left text-xs leading-snug text-[var(--earth-text)]"
                style={{ backgroundColor: bg }}
              >
                <div className="font-semibold tabular-nums text-[var(--earth-secondary)]">{d.date.slice(8)}</div>
                <div className="tabular-nums text-[var(--earth-text-muted)]">{pctLabel}%</div>
              </div>
            );
          })}
        </div>
      </OrganicSection>
    </OrganicLayout>
  );
}
