import { useCallback, useEffect, useState } from "react";

import { useGuestAppBooking } from "../../components/guestapp/GuestAppBookingContext";
import { guestAppTimelineStep } from "../../lib/guestAppApi";
import { guestAppImages } from "../../lib/guestAppImages";
import { fetchCurrentWeather, isRainyWmoCode } from "../../lib/openMeteoWeather";

function formatShortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

const STEP_ORDER = ["checkin", "room_ready", "in_room", "checkout"];

export default function GuestAppHome() {
  const { session, sessionLoading, bookingRef, showToast, refreshSession } = useGuestAppBooking();
  const [doorOpen, setDoorOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(true);

  const notify = useCallback((msg) => showToast(msg), [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      setWeatherLoading(true);
      setWeatherError("");
      try {
        const w = await fetchCurrentWeather({ signal: controller.signal });
        if (!cancelled) setWeather(w);
      } catch (e) {
        if (!cancelled) {
          setWeather(null);
          setWeatherError(e?.message || "Could not load weather.");
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  const advanceStep = useCallback(
    async (step) => {
      setAdvancing(true);
      try {
        await guestAppTimelineStep(bookingRef, step);
        await refreshSession();
        showToast(`Timeline updated: ${step.replaceAll("_", " ")}`);
      } catch (e) {
        showToast(e?.message || "Could not update timeline.");
      } finally {
        setAdvancing(false);
      }
    },
    [bookingRef, refreshSession, showToast],
  );

  const roomLabel = session?.room_number || "—";
  const checkIn = session?.check_in;
  const checkOut = session?.check_out;
  const refLabel = session?.booking_ref || bookingRef;

  const steps = session?.stay_steps || [];

  const nextStep = (() => {
    if (!steps.length) return null;
    const cur = steps.find((s) => s.state === "current");
    if (!cur) return null;
    const idx = STEP_ORDER.indexOf(cur.key);
    if (idx < 0 || idx >= STEP_ORDER.length - 1) return null;
    return STEP_ORDER[idx + 1];
  })();

  const isRain = weather && (isRainyWmoCode(weather.weatherCode) || (weather.precipitationMm ?? 0) > 0.5);

  return (
    <div className="ga-stagger space-y-5">
      <section className="ga-stagger-item ga-animate-in relative overflow-hidden rounded-3xl border border-white/10 shadow-inner">
        <img
          src={guestAppImages.heroLobby}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1714] via-[#0f1714]/75 to-[#0f1714]/40" />
        <div className="relative p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/75">Stay overview</p>
        <p className="mt-1 text-lg font-semibold text-white">Room {roomLabel}</p>
        <p className="mt-0.5 text-sm text-white/60">
          {formatShortDate(checkIn)} → {formatShortDate(checkOut)} · Booking ref {refLabel}
        </p>
        {session?.property_name ? (
          <p className="mt-1 text-xs text-white/50">{session.property_name}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-white/55">Stay timeline</p>
          <ol className="relative space-y-0 border-l border-white/15 pl-4">
            {steps.map((s) => {
              const dot =
                s.state === "done"
                  ? "bg-emerald-400"
                  : s.state === "current"
                    ? "bg-amber-400 ring-2 ring-amber-400/40"
                    : "bg-white/25";
              return (
                <li
                  key={s.key}
                  className={`relative pb-4 pl-1 last:pb-0 ${s.state === "current" ? "guest-app-timeline-current" : ""}`}
                >
                  <span
                    className={`ga-timeline-dot absolute -left-[1.15rem] top-1.5 h-2.5 w-2.5 rounded-full ${dot}`}
                    aria-hidden
                  />
                  <p className="text-sm font-semibold text-white">{s.label_en}</p>
                  {s.label_vi && s.label_vi !== s.label_en ? (
                    <p className="text-[0.65rem] text-white/40">{s.label_vi}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {sessionLoading && !session ? (
            <p className="text-xs text-white/50">Loading timeline from booking…</p>
          ) : null}
        </div>

        {session && nextStep ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-white/60">
              Front desk can move the stay to the next step here (synced to the CRM timeline).
            </p>
            <button
              type="button"
              disabled={advancing}
              className="mt-2 w-full rounded-xl bg-emerald-600/90 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              onClick={() => advanceStep(nextStep)}
            >
              {advancing ? "Sending…" : `Continue to ${String(nextStep).replaceAll("_", " ")}`}
            </button>
          </div>
        ) : null}
        </div>
      </section>

      <section className="ga-stagger-item guest-app-card-hover overflow-hidden rounded-3xl border border-emerald-400/25 bg-emerald-950/40 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <div className="relative h-28 w-full shrink-0">
          <img src={guestAppImages.airport} alt="" className="h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/50 to-transparent" />
        </div>
        <div className="p-4">
        <p className="text-sm font-semibold text-white">Thanks for booking with us!</p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Pre-book airport pickup — our concierge team will meet you at the terminal.
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          onClick={() => notify("Request received. Concierge will confirm with you shortly.")}
        >
          Book transfer
        </button>
        </div>
      </section>

      <section className="ga-stagger-item grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={`guest-app-card-hover relative overflow-hidden rounded-3xl border p-4 text-left transition ${
            doorOpen
              ? "border-emerald-400/50 bg-emerald-500/15"
              : "border-white/10 bg-white/[0.04] hover:border-white/20"
          }`}
          onClick={() => {
            setDoorOpen(true);
            notify("Unlock request sent to your door lock (demo until hardware is connected).");
          }}
        >
          <img
            src={guestAppImages.mobileKey}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f1714]/80 to-transparent" />
          <div className="relative">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Mobile key</p>
          <p className="mt-1 text-base font-semibold text-white">{doorOpen ? "Unlocked" : "Tap to unlock"}</p>
          <p className="mt-1 text-xs text-white/55">Room {roomLabel}</p>
          </div>
        </button>
        <div className="guest-app-card-hover relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <img
            src={guestAppImages.minibarPay}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-tl from-[#0f1714]/90 to-transparent" />
          <div className="relative">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Payment</p>
          <p className="mt-1 text-base font-semibold text-white">Minibar & services</p>
          <p className="mt-1 text-xs text-white/55">
            Extras: {session?.folio_extras_total != null ? `${session.folio_extras_total}` : "—"} · Housekeeping:{" "}
            {session?.housekeeping_room_status || "—"}
          </p>
          <p className="mt-2 text-[0.65rem] text-white/45">Itemized charges are on the Me tab.</p>
          </div>
        </div>
      </section>

      <section className="ga-stagger-item relative overflow-hidden rounded-3xl border border-amber-400/20 bg-amber-950/30">
        <img src={guestAppImages.happyHour} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/95 via-amber-950/80 to-amber-950/50" />
        <div className="relative p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-amber-200/80">Happy hour</p>
        <p className="mt-1 text-sm font-medium text-white">
          Rooftop — buy one cocktail, get one free; starts in one hour.
        </p>
        <button
          type="button"
          className="mt-3 rounded-2xl bg-amber-500/90 px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-400"
          onClick={() => notify("Bar seat request sent.")}
        >
          Hold bar seats
        </button>
        </div>
      </section>

      <section className="ga-stagger-item relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <img
          src={isRain ? guestAppImages.weatherRain : guestAppImages.weatherSun}
          alt=""
          className="absolute right-0 top-0 h-36 w-36 -translate-y-2 translate-x-4 rounded-full object-cover opacity-40 blur-[1px] sm:h-44 sm:w-44"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1714] via-[#0f1714]/92 to-transparent sm:via-[#0f1714]/85" />
        <div className="relative p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Weather</p>
            {weatherLoading && !weather ? (
              <p className="mt-1 text-sm text-white/60">Loading…</p>
            ) : weatherError ? (
              <p className="mt-1 text-sm text-rose-300/90">{weatherError}</p>
            ) : weather ? (
              <>
                <p className="mt-1 text-sm font-medium text-white">
                  {weather.placeLabel} · {weather.labelEn}
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-100">
                  {Math.round(weather.temperatureC)}°C
                  <span className="ml-2 text-sm font-normal text-white/55">
                    feels {Math.round(weather.apparentC)}°C
                  </span>
                </p>
                <p className="mt-1 text-xs text-white/55">
                  Humidity {weather.humidityPct}% · Wind {Math.round(weather.windKmh)} km/h
                  {weather.precipitationMm > 0 ? ` · Recent rain ${weather.precipitationMm} mm` : ""}
                </p>
                <p className="mt-1 text-[0.65rem] text-white/35">Updated: {weather.time} (Open-Meteo)</p>
              </>
            ) : null}
          </div>
        </div>
        {isRain ? (
          <p className="mt-3 text-sm leading-relaxed text-emerald-100/85">
            Rainy weather — afternoon tea in the lounge or in-room dining.{" "}
            <button
              type="button"
              className="font-semibold text-emerald-300 underline"
              onClick={() => notify("Rainy-day specials are listed under Dine.")}
            >
              View menu
            </button>
          </p>
        ) : null}
        </div>
      </section>
    </div>
  );
}
