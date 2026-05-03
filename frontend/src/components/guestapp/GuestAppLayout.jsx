import { NavLink, Outlet, Link } from "react-router-dom";

import GuestToast from "../../pages/guestapp/GuestToast";
import { GuestAppBookingProvider, useGuestAppBooking } from "./GuestAppBookingContext";

const tabs = [
  { to: "/guest-app", label: "Home", end: true, icon: "home" },
  { to: "/guest-app/offers", label: "Offers", end: false, icon: "offers" },
  { to: "/guest-app/dine", label: "Dine", end: false, icon: "dine" },
  { to: "/guest-app/me", label: "Me", end: false, icon: "me" },
];

function TabIcon({ name }) {
  const c = "h-5 w-5 stroke-current";
  if (name === "home") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "offers") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3v18M3 12h18" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
      </svg>
    );
  }
  if (name === "dine") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 3v9a4 4 0 008 0V3M10 3v17M14 3v17" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" strokeWidth="1.6" />
      <path d="M6 20c0-3.5 3.5-6 6-6s6 2.5 6 6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GuestAppLayoutShell() {
  const { bookingRef, setBookingRef, sessionError, sessionLoading, toast, hideToast } = useGuestAppBooking();

  return (
    <div className="guest-app-root flex min-h-screen flex-col bg-[linear-gradient(180deg,#102219_0%,#0d1a14_45%,#0f1714_100%)] text-[rgba(245,250,248,0.94)]">
      <GuestToast message={toast} onClose={hideToast} />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(12,28,22,0.92)] px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Azure Pearl</p>
              <p className="truncate text-sm font-semibold text-white/95">Your stay</p>
            </div>
            <Link
              to="/overview"
              className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-emerald-100/90 transition hover:bg-white/10"
            >
              Ops
            </Link>
          </div>
          <label className="flex flex-col gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white/45">
            Mã đặt (booking)
            <input
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-medium normal-case tracking-normal text-white placeholder:text-white/35 focus:border-emerald-400/50 focus:outline-none"
              placeholder="ORT-2026-0003"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {sessionLoading ? <p className="text-xs text-emerald-200/70">Đang đồng bộ với PMS…</p> : null}
          {sessionError ? <p className="text-xs text-rose-300/90">{sessionError}</p> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[rgba(10,22,18,0.96)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg"
        aria-label="Guest app navigation"
      >
        <div className="mx-auto flex max-w-md justify-around gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[0.6rem] font-semibold uppercase tracking-wide transition sm:text-[0.65rem] ${
                  isActive ? "text-emerald-300" : "text-white/45 hover:text-white/70"
                }`
              }
            >
              <TabIcon name={tab.icon} />
              <span className="truncate">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function GuestAppLayout() {
  return (
    <GuestAppBookingProvider>
      <GuestAppLayoutShell />
    </GuestAppBookingProvider>
  );
}
