import { useEffect, useState } from "react";

import { OrganicLayout, OrganicSection } from "../components/organic/OrganicUI";
import { fetchProperties, getApiOrigin, reportExportCsvUrl, reportExportXlsxUrl } from "../lib/dashboardApi";

export default function ReportsPage() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    fetchProperties()
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  const pid = propertyId === "" ? null : Number(propertyId);
  const xlsx = reportExportXlsxUrl(pid);
  const csv = reportExportCsvUrl(pid);

  return (
    <OrganicLayout
      pageKey="reports"
      hero={{
        eyebrow: "Exports",
        title: "Reports & downloads",
        description: `Excel workbook includes revenue history, pricing decision log, and competitor snapshot. CSV is revenue-only.`,
        stats: [{ label: "API", value: getApiOrigin() }],
        illustration: null,
      }}
    >
      <OrganicSection eyebrow={null} title="Scope" description={null}>
        <label className="grid max-w-md gap-2 text-sm font-semibold text-[var(--earth-secondary)]">
          Property filter (optional)
          <select className="px-3 py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Downloads" description={null}>
        <div className="flex flex-wrap gap-4">
          <a
            href={xlsx}
            className="inline-flex rounded-full border border-[rgba(61,122,106,0.35)] bg-[rgba(61,122,106,0.12)] px-5 py-3 text-sm font-semibold text-[var(--earth-secondary)]"
          >
            Download .xlsx
          </a>
          <a
            href={csv}
            className="inline-flex rounded-full border border-[rgba(107,66,38,0.28)] bg-[rgba(255,255,255,0.55)] px-5 py-3 text-sm font-semibold text-[var(--earth-secondary)]"
          >
            Download revenue .csv
          </a>
        </div>
      </OrganicSection>
    </OrganicLayout>
  );
}
