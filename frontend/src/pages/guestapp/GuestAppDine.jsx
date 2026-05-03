import { useCallback, useEffect, useMemo, useState } from "react";

import { useGuestAppBooking } from "../../components/guestapp/GuestAppBookingContext";
import { buildDiningAiSuggestion, pickAnchorDishId } from "../../lib/diningAiSuggestions";
import { guestAppAddFolioLine, guestAppDiningRequest, guestAppOffers } from "../../lib/guestAppApi";
import { fetchCurrentWeather } from "../../lib/openMeteoWeather";
import { guestAppImages } from "../../lib/guestAppImages";
import { dineMenu } from "../../lib/guestAppMockData";

function formatVnd(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function MenuImage({ dish }) {
  const [broken, setBroken] = useState(false);
  if (!dish.imageUrl || broken) {
    return <div className={`h-40 w-full bg-gradient-to-br ${dish.imageTone}`} aria-hidden />;
  }
  return (
    <img
      src={dish.imageUrl}
      alt={dish.name}
      className="h-40 w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}

export default function GuestAppDine() {
  const { bookingRef, showToast, session, refreshSession } = useGuestAppBooking();
  const [slotTime, setSlotTime] = useState("19:00");
  const [partySize, setPartySize] = useState(2);
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const [tags, setTags] = useState([]);
  const [weather, setWeather] = useState(null);
  const [anchorDishId, setAnchorDishId] = useState(dineMenu[0]?.id || "burger");
  const [addOnBusy, setAddOnBusy] = useState(false);
  const [clockHour, setClockHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const id = window.setInterval(() => setClockHour(new Date().getHours()), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    guestAppOffers(bookingRef)
      .then((data) => {
        if (!cancelled) setTags(data?.tags || []);
      })
      .catch(() => {
        if (!cancelled) setTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingRef]);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    fetchCurrentWeather({ signal: ac.signal })
      .then((w) => {
        if (!cancelled) setWeather(w);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  const smartAnchorId = useMemo(
    () => pickAnchorDishId(dineMenu, { hour: clockHour, weather }),
    [clockHour, weather],
  );

  const ai = useMemo(
    () =>
      buildDiningAiSuggestion(dineMenu, anchorDishId, {
        tags,
        weather,
        folioLines: session?.folio_lines,
        hour: clockHour,
      }),
    [anchorDishId, clockHour, session?.folio_lines, tags, weather],
  );

  const notify = useCallback((msg) => showToast(msg), [showToast]);

  const submitReservation = useCallback(async () => {
    setSending(true);
    try {
      await guestAppDiningRequest({
        booking_ref: bookingRef.trim(),
        party_size: partySize,
        slot_time: slotTime.trim(),
        allergies: allergies.trim() || null,
        notes: notes.trim() || null,
      });
      notify("Your reservation or pre-order was sent to the restaurant and logged in CRM.");
    } catch (e) {
      notify(e?.message || "Send failed.");
    } finally {
      setSending(false);
    }
  }, [allergies, bookingRef, notes, notify, partySize, slotTime]);

  const addSuggestedToFolio = useCallback(async () => {
    if (!ai.addOn) return;
    setAddOnBusy(true);
    try {
      await guestAppAddFolioLine({
        booking_ref: bookingRef.trim(),
        category: ai.addOn.category,
        description: `${ai.addOn.labelEn} — ${ai.addOn.description} (suggested with "${ai.dishName}")`,
        amount: ai.addOn.priceVnd,
      });
      await refreshSession();
      notify(`Added to folio: ${ai.addOn.labelEn}`);
    } catch (e) {
      notify(e?.message || "Could not add to folio.");
    } finally {
      setAddOnBusy(false);
    }
  }, [ai.addOn, ai.dishName, bookingRef, notify, refreshSession]);

  return (
    <div className="ga-stagger space-y-4 pb-4">
      <div className="ga-stagger-item ga-animate-in relative h-32 overflow-hidden rounded-3xl border border-emerald-400/20 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
        <img src={guestAppImages.dineHeader} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1714] via-[#0f1714]/65 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/90">Dining</p>
          <p className="text-sm font-semibold text-white">In-room dining · reservations / pre-order</p>
        </div>
      </div>

      <section className="ga-stagger-item rounded-3xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/80">Reserve or pre-order</p>
        <p className="mt-1 text-xs text-white/55">Choose your time, party size, and any allergy notes — we save this to your guest profile.</p>
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-medium text-white/60">
            Arrival time
            <input
              value={slotTime}
              onChange={(e) => setSlotTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
              placeholder="19:00 or 2026-05-04T19:00"
            />
          </label>
          <label className="block text-xs font-medium text-white/60">
            Party size
            <input
              type="number"
              min={1}
              max={30}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs font-medium text-white/60">
            Allergies / dietary restrictions
            <textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
              placeholder="e.g. peanuts, lactose…"
            />
          </label>
          <label className="block text-xs font-medium text-white/60">
            Additional notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
              placeholder="Window table, kids, etc."
            />
          </label>
          <button
            type="button"
            disabled={sending}
            onClick={submitReservation}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Submit to restaurant"}
          </button>
        </div>
      </section>

      <div className="ga-stagger-item rounded-3xl border border-emerald-400/25 bg-emerald-950/40 p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/80">Smart pairing</p>
        <p className="mt-2 text-xs text-white/50">
          Combines CRM tags, live weather, local time, and recent folio activity to suggest a matching add-on.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {dineMenu.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setAnchorDishId(d.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                anchorDishId === d.id
                  ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-100"
                  : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              {d.name.split("&")[0].trim()}
            </button>
          ))}
        </div>

        {smartAnchorId !== anchorDishId ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] text-emerald-200/80">
              Suggested dish for right now:{" "}
              <span className="font-semibold text-white">
                {dineMenu.find((x) => x.id === smartAnchorId)?.name?.split("&")[0]?.trim() ?? smartAnchorId}
              </span>
            </span>
            <button
              type="button"
              className="rounded-full border border-emerald-400/40 px-2.5 py-0.5 text-[0.65rem] font-semibold text-emerald-200 hover:bg-emerald-500/15"
              onClick={() => setAnchorDishId(smartAnchorId)}
            >
              Apply
            </button>
          </div>
        ) : null}

        {ai.contextPills.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ai.contextPills.map((p) => (
              <span
                key={p}
                className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-white/55"
              >
                {p}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-3 text-sm leading-relaxed text-emerald-50/90">{ai.headline}</p>

        {ai.addOn ? (
          <button
            type="button"
            disabled={addOnBusy}
            className="mt-3 text-left text-sm font-semibold text-emerald-300 underline decoration-emerald-500/50 underline-offset-2 disabled:opacity-50"
            onClick={addSuggestedToFolio}
          >
            {addOnBusy ? "Adding…" : `Add ${ai.addOn.labelEn} (${formatVnd(ai.addOn.priceVnd)})`}
          </button>
        ) : (
          <p className="mt-3 text-xs text-white/45">No add-on pairings configured for this dish.</p>
        )}
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-white/45">In-room dining menu</p>

      <div className="space-y-4">
        {dineMenu.map((dish) => (
          <article
            key={dish.id}
            className="ga-stagger-item guest-app-img-zoom guest-app-card-hover overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]"
          >
            <MenuImage dish={dish} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{dish.name}</h2>
                  <p className="mt-1 text-sm text-white/65">{dish.desc}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-emerald-200">{formatVnd(dish.price)}</p>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-2xl border border-white/15 bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
                onClick={() => notify(`Sent to kitchen: ${dish.name}`)}
              >
                Order to room
              </button>
              {dish.id === "burger" ? (
                <p className="mt-2 text-xs text-white/50">Scan table QR or order here — same app.</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
