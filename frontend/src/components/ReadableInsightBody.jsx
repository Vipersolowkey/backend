import { useMemo } from "react";

import { splitLongInsightText } from "../lib/splitLongInsightText";

function ModelTag({ modelUsed }) {
  if (!modelUsed) return null;
  return (
    <p className="mt-5 border-t border-[rgba(30,42,36,0.08)] pt-4">
      <span className="inline-flex items-center rounded-full border border-[rgba(61,122,106,0.25)] bg-[rgba(61,122,106,0.08)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--earth-secondary)]">
        Model · {modelUsed}
      </span>
    </p>
  );
}

function InsightSectionBody({ body, hasHeading }) {
  const sub = useMemo(() => {
    const parts = body.split(/\s[-–]\s/).map((s) => s.trim()).filter(Boolean);
    if (
      parts.length >= 2 &&
      parts.length <= 10 &&
      body.length > 80 &&
      parts.every((p) => p.length >= 10 && p.length < 480)
    ) {
      return { kind: "list", parts };
    }
    return { kind: "text", parts: [body] };
  }, [body]);

  if (sub.kind === "list") {
    return (
      <ul className={`list-none space-y-2.5 pl-0 ${hasHeading ? "mt-3" : "mt-0"}`}>
        {sub.parts.map((line, index) => (
          <li
            key={index}
            className="flex gap-3 text-[0.9375rem] leading-relaxed text-[var(--earth-text-muted)]"
          >
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--earth-accent)] ring-4 ring-[rgba(61,122,106,0.12)]"
              aria-hidden
            />
            <span className="min-w-0">{line}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p
      className={`text-[0.9375rem] font-medium leading-[1.75] text-[var(--earth-text)] ${hasHeading ? "mt-2" : "mt-0"}`}
    >
      {body}
    </p>
  );
}

export default function ReadableInsightBody({ text, modelUsed, className = "" }) {
  const parsed = useMemo(() => splitLongInsightText(text), [text]);

  if (parsed.kind === "empty") {
    return <p className={`text-sm text-[var(--earth-text-subtle)] ${className}`}>No analysis content yet.</p>;
  }

  if (parsed.kind === "sections") {
    return (
      <div className={className}>
        <div className="space-y-4">
          {parsed.items.map((sec, index) => (
            <section
              key={index}
              className="rounded-[22px] border border-[rgba(30,42,36,0.08)] bg-[rgba(255,255,255,0.55)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:px-5 sm:py-4"
            >
              {sec.title ? (
                <h4 className="font-['Fraunces',serif] text-[1.05rem] font-semibold leading-snug tracking-tight text-[var(--earth-secondary)]">
                  {sec.title}
                </h4>
              ) : null}
              <InsightSectionBody body={sec.body} hasHeading={Boolean(sec.title)} />
            </section>
          ))}
        </div>
        <ModelTag modelUsed={modelUsed} />
      </div>
    );
  }

  if (parsed.kind === "bullets") {
    return (
      <div className={className}>
        <ul className="space-y-2.5">
          {parsed.items.map((item, index) => (
            <li
              key={index}
              className="flex gap-3 rounded-[18px] border border-[rgba(30,42,36,0.07)] bg-[rgba(255,255,255,0.72)] px-4 py-3 shadow-[0_2px_8px_rgba(30,42,36,0.04)]"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--earth-primary)] ring-4 ring-[rgba(184,90,50,0.12)]"
                aria-hidden
              />
              <span className="min-w-0 text-[0.9375rem] font-medium leading-relaxed text-[var(--earth-text)]">
                {item}
              </span>
            </li>
          ))}
        </ul>
        <ModelTag modelUsed={modelUsed} />
      </div>
    );
  }

  if (parsed.kind === "paragraphs") {
    return (
      <div className={`space-y-5 ${className}`}>
        {parsed.items.map((block, index) => (
          <p
            key={index}
            className="border-b border-[rgba(30,42,36,0.06)] pb-4 text-[0.9375rem] font-medium leading-[1.78] text-[var(--earth-text)] last:border-0 last:pb-0 first:text-[1rem] first:leading-[1.72] first:tracking-tight"
          >
            {block}
          </p>
        ))}
        <ModelTag modelUsed={modelUsed} />
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-[0.9375rem] font-medium leading-[1.78] text-[var(--earth-text)]">{parsed.items[0]}</p>
      <ModelTag modelUsed={modelUsed} />
    </div>
  );
}
