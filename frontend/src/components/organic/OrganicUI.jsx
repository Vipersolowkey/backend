import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { fetchBackendHealth } from "../../lib/dashboardApi";

function OrganicMainWatermark() {
  return (
    <div className="organic-main-watermark pointer-events-none select-none" aria-hidden>
      <svg viewBox="0 0 360 300" className="organic-main-watermark-svg text-[var(--earth-secondary)]" fill="none">
        <path
          opacity="0.5"
          d="M48 268C112 196 138 68 156 12C174 68 200 196 264 268"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          opacity="0.45"
          d="M156 36C130 48 104 84 100 122C134 118 156 84 156 36Z"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          opacity="0.45"
          d="M160 72C196 80 224 112 228 148C192 142 168 112 160 72Z"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          opacity="0.4"
          d="M228 88C204 98 182 128 178 158C212 152 232 124 228 88Z"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle opacity="0.35" cx="92" cy="118" r="7" stroke="currentColor" strokeWidth="1" />
        <path opacity="0.38" d="M296 44C282 62 268 96 272 128C294 108 302 74 296 44Z" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

function sparkVariantFromLabel(label) {
  const key = String(label || "").length % 3;
  return key === 0 ? "a" : key === 1 ? "b" : "c";
}

function DecorativeSparkline({ label, compact }) {
  const variant = sparkVariantFromLabel(label);
  const paths = {
    a: "M2 22 C18 10 28 26 42 14 S72 24 88 8 S108 20 118 6",
    b: "M2 18 C22 28 36 6 52 16 S78 4 96 14 S112 22 118 8",
    c: "M2 12 C16 22 34 8 50 18 S74 10 92 20 S108 12 118 16",
  };
  const d = paths[variant] || paths.a;
  const wrapClass = compact
    ? "organic-hero-spark mt-2 text-[rgba(61,122,106,0.34)] transition-colors duration-300 group-hover:text-[rgba(61,122,106,0.5)]"
    : "organic-stat-spark mt-4 text-[rgba(61,122,106,0.42)] transition-opacity duration-300 group-hover:text-[rgba(61,122,106,0.58)]";
  const pathClass = compact ? "organic-hero-spark-path" : "organic-stat-spark-path";
  return (
    <div className={wrapClass}>
      <svg viewBox="0 0 120 30" className={`${compact ? "h-5" : "h-7"} w-full overflow-visible`} aria-hidden>
        <path
          className={pathClass}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={compact ? 1.12 : 1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SidebarHealth({ ok, checked }) {
  if (!checked) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/55">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300/90" aria-hidden />
        Checking API…
      </span>
    );
  }
  if (ok) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-50">
        <span
          className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.85)]"
          aria-hidden
        />
        Backend connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-50">
      <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden />
      Server unreachable
    </span>
  );
}

function SidebarNavIcon({ name }) {
  const svgProps = {
    className: "organic-sidebar-nav-icon-svg",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...svgProps}>
          <path
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z"
            stroke="currentColor"
            strokeWidth="1.65"
          />
        </svg>
      );
    case "sales-ai":
      return (
        <svg {...svgProps}>
          <path
            d="M19 10v1a7 7 0 01-14 0v-1M12 19v2M8 21h8"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 19a4 4 0 004-4v-3a4 4 0 00-8 0v3a4 4 0 004 4z"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "competitors":
      return (
        <svg {...svgProps}>
          <path
            d="M4 21V10.5M4 21h16M9 21V14m6 7v-5m5 5V8l-5-3-5 3v13"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9 10l3-2 3 2" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "alerts":
      return (
        <svg {...svgProps}>
          <path
            d="M14 21a2 2 0 01-4 0h4z"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 15s1-1 1-5a6 6 0 10-12 0c0 4 1 5 1 5h10z"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function BotanicalFlourish({ className = "" }) {
  return (
    <svg viewBox="0 0 220 120" className={`botanical-flourish ${className}`} fill="none" aria-hidden="true">
      <path
        className="botanical-flourish-stroke botanical-flourish-stroke-a"
        d="M10 106C52 76 70 28 78 8C86 28 104 76 146 106"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        className="botanical-flourish-stroke botanical-flourish-stroke-b"
        d="M78 20C64 26 50 42 48 58C64 56 78 42 78 20Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        className="botanical-flourish-stroke botanical-flourish-stroke-c"
        d="M80 38C96 42 108 56 110 72C92 70 82 58 80 38Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        className="botanical-flourish-stroke botanical-flourish-stroke-d"
        d="M134 40C120 46 108 62 106 78C122 76 134 62 134 40Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        className="botanical-flourish-stroke botanical-flourish-stroke-e"
        d="M150 24C164 30 178 46 182 64C164 62 150 46 150 24Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function BlobDivider() {
  return (
    <div className="organic-blob-divider overflow-hidden rounded-[28px] border border-[rgba(107,66,38,0.12)] bg-[rgba(255,255,255,0.44)] p-2">
      <svg viewBox="0 0 1200 90" className="organic-blob-svg h-16 w-full text-[rgba(196,113,74,0.5)]" fill="none" aria-hidden="true">
        <path
          className="organic-blob-path"
          d="M10 58C78 16 154 22 222 44C296 68 362 80 444 62C520 46 586 10 658 12C746 16 790 72 888 76C988 80 1068 18 1190 42"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function OverviewIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 420 320" className={`${className} route-illustration route-illustration-overview`} fill="none" aria-hidden="true">
      <path className="route-illustration-fill" d="M48 210C84 144 134 124 192 124C242 124 286 140 322 182C338 202 350 224 350 254H90C90 236 92 228 100 208" fill="rgba(196,113,74,0.12)" />
      <path className="route-illustration-line" d="M110 252C118 206 140 176 182 160C208 150 238 150 264 160C308 176 336 208 346 252" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        className="route-illustration-line route-illustration-bar route-illustration-bar-d1"
        d="M138 250V186"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="route-illustration-line route-illustration-bar route-illustration-bar-d2"
        d="M190 250V146"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="route-illustration-line route-illustration-bar route-illustration-bar-d3"
        d="M242 250V168"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="route-illustration-line route-illustration-bar route-illustration-bar-d4"
        d="M294 250V196"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path className="route-illustration-line" d="M96 252H350" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="route-illustration-leaf" d="M276 74C288 44 314 28 350 28C348 62 326 92 286 98" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path className="route-illustration-leaf" d="M286 98C310 108 326 128 334 154" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle className="route-illustration-orb" cx="100" cy="92" r="22" fill="rgba(143,175,143,0.16)" />
      <circle className="route-illustration-line" cx="100" cy="92" r="10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function SalesIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 420 320" className={`${className} route-illustration route-illustration-sales`} fill="none" aria-hidden="true">
      <rect className="route-illustration-line route-illustration-frame" x="78" y="70" width="182" height="160" rx="26" stroke="currentColor" strokeWidth="2" />
      <path
        className="route-illustration-line route-illustration-dataline route-illustration-dataline-d1"
        d="M116 118H222"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="route-illustration-line route-illustration-dataline route-illustration-dataline-d2"
        d="M116 148H204"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="route-illustration-line route-illustration-dataline route-illustration-dataline-d3"
        d="M116 178H186"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="route-illustration-fill route-illustration-chat-bubble"
        d="M286 92C308 92 326 108 326 130C326 154 304 170 280 170C268 170 256 166 248 160L230 176L236 150C228 142 224 130 224 118C224 102 234 92 250 92H286Z"
        fill="rgba(143,175,143,0.16)"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        className="route-illustration-line route-illustration-dataline route-illustration-dataline-d4"
        d="M250 126H298"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        className="route-illustration-line route-illustration-dataline route-illustration-dataline-d5"
        d="M250 142H286"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle className="route-illustration-orb" cx="144" cy="248" r="20" fill="rgba(196,113,74,0.14)" />
      <path className="route-illustration-leaf" d="M236 226C262 214 292 220 308 238" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path className="route-illustration-leaf" d="M308 238C286 262 252 270 220 256" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CompetitorsIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 420 320" className={`${className} route-illustration route-illustration-competitors`} fill="none" aria-hidden="true">
      <rect className="route-illustration-line route-illustration-tower route-illustration-tower-left" x="66" y="92" width="110" height="138" rx="26" stroke="currentColor" strokeWidth="2" />
      <rect
        className="route-illustration-fill route-illustration-tower route-illustration-tower-right"
        x="192"
        y="64"
        width="152"
        height="166"
        rx="32"
        fill="rgba(196,113,74,0.1)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path className="route-illustration-line" d="M96 128H146" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="route-illustration-line" d="M96 154H134" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="route-illustration-line" d="M224 106H304" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="route-illustration-line" d="M224 136H316" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="route-illustration-line" d="M224 166H286" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="route-illustration-leaf" d="M128 248C172 220 220 210 278 214" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path className="route-illustration-leaf" d="M278 214L264 202" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path className="route-illustration-leaf" d="M278 214L266 228" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path className="route-illustration-line" d="M340 34C338 66 320 88 286 100" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path className="route-illustration-line" d="M286 100C304 110 320 130 324 148" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function AlertsIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 420 320" className={`${className} route-illustration route-illustration-alerts`} fill="none" aria-hidden="true">
      <path className="route-illustration-line route-illustration-spark route-illustration-spark-left" d="M84 90L70 76" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path className="route-illustration-line route-illustration-spark route-illustration-spark-right" d="M340 90L354 76" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <g className="route-illustration-bell-cluster">
        <path
          className="route-illustration-fill route-illustration-bell-body"
          d="M212 52C262 52 302 92 302 142V162C302 182 308 194 320 204V212H104V204C116 194 122 182 122 162V142C122 92 162 52 212 52Z"
          fill="rgba(196,113,74,0.1)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path className="route-illustration-line" d="M186 236C190 252 200 262 212 262C224 262 234 252 238 236" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path className="route-illustration-line route-illustration-bell-stem" d="M212 32V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle className="route-illustration-orb" cx="212" cy="136" r="22" fill="rgba(143,175,143,0.16)" />
        <path className="route-illustration-line route-illustration-bell-clapper" d="M212 124V144" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle className="route-illustration-bell-dot" cx="212" cy="160" r="2.6" fill="currentColor" />
      </g>
      <path className="route-illustration-leaf" d="M122 212H302" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function renderIllustration(illustration, variant = "hero") {
  if (!illustration) return null;
  const toneClass =
    variant === "sidebar"
      ? "organic-hero-illustration organic-sidebar-route-art text-[rgba(232,248,240,0.38)]"
      : "organic-hero-illustration text-[rgba(30,42,36,0.42)]";
  if (typeof illustration === "function") {
    const Illustration = illustration;
    return <Illustration className={toneClass} />;
  }
  return illustration;
}

export function OrganicLayout({ pageKey, hero, children, sideArtwork = true }) {
  const navItems = [
    { key: "overview", label: "Overview", path: "/overview" },
    { key: "sales-ai", label: "Sales AI", path: "/sales-ai" },
    { key: "competitors", label: "Competitors", path: "/competitors" },
    { key: "alerts", label: "Alerts", path: "/alerts" },
  ];

  const [healthOk, setHealthOk] = useState(null);
  const [healthChecked, setHealthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchBackendHealth().then((ok) => {
      if (!cancelled) {
        setHealthOk(ok);
        setHealthChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="luxury-app organic-app-root min-h-screen">
      <aside className="organic-sidebar">
        <div className="organic-sidebar-inner flex min-h-0 w-full flex-1 flex-col">
          <div className="organic-sidebar-top flex w-full items-start gap-3">
            <div className="organic-sidebar-brand-mark">
              <img
                src="/app-icon.png"
                width={44}
                height={44}
                alt="AI Hospitality Hotel"
                decoding="async"
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="organic-sidebar-eyebrow">Operations</p>
              <p className="organic-sidebar-title truncate">AI Hospitality Hotel</p>
            </div>
            <div className="organic-sidebar-status shrink-0 lg:hidden">
              <SidebarHealth ok={healthOk} checked={healthChecked} />
            </div>
          </div>

          <div className="organic-sidebar-divider hidden lg:block" aria-hidden />

          <nav className="organic-sidebar-nav flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) =>
                  `organic-sidebar-navlink ${isActive ? "organic-sidebar-navlink-active" : ""}`
                }
              >
                <span className="organic-sidebar-nav-icon-wrap">
                  <SidebarNavIcon name={item.key} />
                </span>
                <span className="grid min-w-0 leading-tight">
                  <span className="organic-sidebar-nav-label">{item.label}</span>
                </span>
              </NavLink>
            ))}
          </nav>

          {sideArtwork ? (
            <div className="mt-5 hidden flex-col items-center gap-3 lg:flex">
              <div className="flex w-full justify-center rounded-[20px] border border-white/10 bg-white/[0.06] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                {typeof sideArtwork === "function" ? (
                  renderIllustration(sideArtwork, "sidebar")
                ) : (
                  <BotanicalFlourish className="h-24 w-44 text-[rgba(230,245,238,0.55)]" />
                )}
              </div>
            </div>
          ) : null}

          <div className="organic-sidebar-status mt-auto hidden border-t border-white/15 pt-5 lg:block">
            <SidebarHealth ok={healthOk} checked={healthChecked} />
          </div>
        </div>
      </aside>

      <div className={`organic-main-column organic-page-shell organic-page-${pageKey}`}>
        <OrganicMainWatermark />
        <div className="organic-main-inner mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <OrganicPageHero {...hero} />
          {children}
        </div>
      </div>
    </div>
  );
}

export function OrganicPageHero({ eyebrow, title, description, stats, note, illustration }) {
  return (
    <section className="page-enter organic-hero-shell relative overflow-hidden rounded-[40px_22px_44px_24px] border border-[rgba(30,42,36,0.08)] bg-[linear-gradient(145deg,rgba(255,255,255,0.82)_0%,rgba(248,244,238,0.95)_42%,rgba(255,255,255,0.65)_100%)] p-6 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[rgba(184,90,50,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-[-20%] h-48 w-48 rounded-full bg-[rgba(61,122,106,0.14)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,transparent_68%)] opacity-60" />
      <div className="organic-hero-grid relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
        <div className="organic-hero-copy grid gap-5">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--earth-primary)]">{eyebrow}</p>
          ) : null}
          <h1 className="text-gradient-hero max-w-4xl text-[clamp(2.5rem,5vw,4.75rem)] leading-[0.98]">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-base leading-8 text-[var(--earth-text-muted)]">{description}</p>
          ) : null}
          <div className="organic-hero-stats flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group organic-stat-chip min-w-[148px] rounded-[24px] border border-[rgba(30,42,36,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4 shadow-[0_8px_24px_rgba(30,42,36,0.06)] backdrop-blur-sm"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--earth-text-subtle)]">{stat.label}</p>
                <p className="organic-stat-value mt-2 font-['Fraunces',serif] text-2xl font-semibold tracking-tight text-[var(--earth-secondary)]">
                  {stat.value}
                </p>
                <DecorativeSparkline label={stat.label} compact />
              </div>
            ))}
          </div>
        </div>
        <div className="organic-hero-aside grid gap-5 rounded-[32px_20px_38px_22px] border border-[rgba(30,42,36,0.08)] bg-[rgba(255,255,255,0.55)] p-6 shadow-[0_12px_36px_rgba(30,42,36,0.06)] backdrop-blur-md">
          <div className="organic-hero-art-wrap">{renderIllustration(illustration) || <BotanicalFlourish className="h-24 w-48 text-[rgba(30,42,36,0.4)]" />}</div>
          {note ? <p className="text-sm leading-7 text-[var(--earth-text-muted)]">{note}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function OrganicSection({ eyebrow, title, description, action, children }) {
  return (
    <section className="page-enter organic-section-shell relative grid gap-6 overflow-hidden rounded-[40px_20px_42px_18px] border border-[rgba(107,66,38,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(240,231,220,0.88))] p-6 shadow-[0_16px_38px_rgba(100,60,20,0.1)] sm:p-8">
      <div className="organic-section-ribbon pointer-events-none" aria-hidden />
      <div className="organic-section-head grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-3">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--earth-primary)]">{eyebrow}</p>
          ) : null}
          <h2 className="organic-section-title text-[clamp(1.8rem,3vw,3rem)] text-[var(--earth-secondary)]">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-7 text-[var(--earth-text-muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <BlobDivider />
      {children}
    </section>
  );
}

export function OrganicStatCard({ label, value, hint }) {
  return (
    <article className="organic-stat-card group relative overflow-hidden rounded-[32px_18px_34px_20px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.58)] p-5 shadow-[0_16px_34px_rgba(100,60,20,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[rgba(196,113,74,0.18)] to-[rgba(143,175,143,0.06)] transition-opacity duration-300 group-hover:opacity-90" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--earth-primary)]">{label}</p>
        <p className="organic-stat-value mt-3 text-3xl font-semibold tracking-tight text-[var(--earth-secondary)]">{value}</p>
        {hint ? <p className="mt-2 text-sm text-[var(--earth-text-subtle)]">{hint}</p> : null}
        <DecorativeSparkline label={label} compact={false} />
      </div>
    </article>
  );
}

export function OrganicStageCard({ step, title, detail, isLast }) {
  return (
    <article className="organic-stage-card hover-glow relative grid gap-3 rounded-[32px_18px_36px_22px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.56)] py-6 pl-[3.25rem] pr-6 md:pl-[3.75rem]">
      <div className="organic-stage-rail" aria-hidden="true">
        <span className="organic-stage-dot" />
        {isLast ? null : <span className="organic-stage-line" />}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--earth-primary)]">Step {step}</p>
      <h3 className="text-[clamp(1.35rem,2vw,1.9rem)] text-[var(--earth-secondary)]">{title}</h3>
      {detail ? <p className="text-sm leading-7 text-[var(--earth-text-muted)]">{detail}</p> : null}
    </article>
  );
}

function ToneGlyph({ tone }) {
  const glyphClass = "h-3 w-3 shrink-0 opacity-80";
  if (tone === "praise") {
    return (
      <svg className={glyphClass} viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2.5 6.2 5 8.7 9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "complaint") {
    return (
      <svg className={glyphClass} viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={glyphClass} viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

export function ToneBadge({ tone, children }) {
  const classes =
    tone === "praise"
      ? "bg-[rgba(143,175,143,0.2)] text-[var(--earth-secondary)]"
      : tone === "complaint"
        ? "bg-[rgba(196,113,74,0.2)] text-[var(--earth-secondary)]"
        : "bg-[rgba(107,66,38,0.1)] text-[var(--earth-secondary)]";
  return (
    <span className={`tone-badge inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${classes}`}>
      <ToneGlyph tone={tone} />
      {children}
    </span>
  );
}
