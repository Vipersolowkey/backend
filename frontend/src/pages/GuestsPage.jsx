import { useEffect, useState } from "react";

import { OrganicLayout, OrganicSection } from "../components/organic/OrganicUI";
import { fetchGuestCrm, fetchGuestsList, fetchProperties } from "../lib/dashboardApi";

export default function GuestsPage() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [guests, setGuests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [crm, setCrm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProperties()
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchGuestsList(propertyId === "" ? null : Number(propertyId), 80)
      .then((rows) => {
        if (!cancelled) {
          setGuests(rows);
          setSelectedId(null);
          setCrm(null);
        }
      })
      .catch(() => {
        if (!cancelled) setGuests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!selectedId) {
      setCrm(null);
      return;
    }
    let cancelled = false;
    setError("");
    fetchGuestCrm(selectedId)
      .then((data) => {
        if (!cancelled) setCrm(data);
      })
      .catch(() => {
        if (!cancelled) {
          setCrm(null);
          setError("Could not load CRM profile.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <OrganicLayout
      pageKey="guests"
      hero={{
        eyebrow: "CRM",
        title: "Guest profiles",
        description: "Light CRM: tags, notes, and timeline seeded for demo bookings.",
        stats: [],
        illustration: null,
      }}
    >
      <OrganicSection eyebrow={null} title="Directory" description={null}>
        <label className="mb-4 grid max-w-md gap-2 text-sm font-semibold text-[var(--earth-secondary)]">
          Property
          <select className="px-3 py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">All</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <ul className="grid gap-2 md:grid-cols-2">
          {guests.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setSelectedId(g.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                  selectedId === g.id
                    ? "border-[rgba(61,122,106,0.45)] bg-[rgba(61,122,106,0.1)]"
                    : "border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.55)]"
                }`}
              >
                <div className="font-semibold text-[var(--earth-secondary)]">{g.full_name || `Guest #${g.id}`}</div>
                <div className="text-xs text-[var(--earth-text)]">{g.email}</div>
              </button>
            </li>
          ))}
        </ul>
      </OrganicSection>

      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      {crm ? (
        <OrganicSection eyebrow={null} title="CRM detail" description={null}>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.6)] p-5">
              <h3 className="font-['Fraunces',serif] text-lg text-[var(--earth-secondary)]">Tags</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {crm.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[rgba(61,122,106,0.15)] px-3 py-1 text-xs font-semibold">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.6)] p-5 lg:col-span-2">
              <h3 className="font-['Fraunces',serif] text-lg text-[var(--earth-secondary)]">Notes</h3>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--earth-text)]">
                {crm.notes.map((n) => (
                  <li key={n.id} className="border-b border-[rgba(30,42,36,0.06)] pb-2">
                    <span className="text-xs text-[var(--earth-secondary)]">{n.created_at}</span>
                    <div>{n.body}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.6)] p-5">
            <h3 className="font-['Fraunces',serif] text-lg text-[var(--earth-secondary)]">Timeline</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {crm.timeline.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-2 text-[var(--earth-text)]">
                  <span className="font-semibold text-[var(--earth-primary)]">{e.event_type}</span>
                  <span className="text-xs opacity-80">{e.occurred_at}</span>
                  <span>{e.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </OrganicSection>
      ) : null}
    </OrganicLayout>
  );
}
