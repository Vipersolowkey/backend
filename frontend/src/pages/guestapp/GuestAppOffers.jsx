import { useCallback, useEffect, useState } from "react";

import { useGuestAppBooking } from "../../components/guestapp/GuestAppBookingContext";
import { guestAppOffers } from "../../lib/guestAppApi";
import { upsellFeed } from "../../lib/guestAppMockData";
import { guestAppImages, segmentOfferImages } from "../../lib/guestAppImages";
import { fetchCurrentWeather, isRainyWmoCode } from "../../lib/openMeteoWeather";

function UpgradeVisual({ imageUrl, priceHint }) {
  const src = imageUrl || guestAppImages.seaUpgrade;
  const badge = priceHint || "+50k";
  return (
    <div
      className="guest-app-img-zoom relative h-36 w-full overflow-hidden rounded-2xl"
      role="img"
      aria-label="Sea-view balcony"
    >
      <img src={src} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-xs font-semibold text-white/95">
        <span>Sea view</span>
        <span className="rounded-full bg-black/40 px-2 py-0.5 backdrop-blur">{badge}</span>
      </div>
    </div>
  );
}

export default function GuestAppOffers() {
  const { bookingRef, showToast } = useGuestAppBooking();
  const [segmentOffers, setSegmentOffers] = useState([]);
  const [tags, setTags] = useState([]);
  const [offersError, setOffersError] = useState("");
  const [liveRain, setLiveRain] = useState(false);

  const notify = useCallback((msg) => showToast(msg), [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetchCurrentWeather({ signal: controller.signal })
      .then((w) => {
        if (!cancelled) setLiveRain(isRainyWmoCode(w.weatherCode) || (w.precipitationMm ?? 0) > 0.5);
      })
      .catch(() => {
        if (!cancelled) setLiveRain(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setOffersError("");
      try {
        const data = await guestAppOffers(bookingRef);
        if (cancelled) return;
        setTags(data?.tags || []);
        setSegmentOffers(data?.offers || []);
      } catch (e) {
        if (!cancelled) {
          setSegmentOffers([]);
          setTags([]);
          setOffersError(e?.message || "Could not load segment offers.");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [bookingRef]);

  const visible = upsellFeed.filter((item) => {
    if (item.type === "weather" && item.conditional) return liveRain;
    return true;
  });

  return (
    <div className="ga-stagger space-y-4">
      {tags.length ? (
        <p className="text-xs text-emerald-200/80">
          CRM tags: <span className="font-semibold text-white">{tags.join(", ")}</span>
        </p>
      ) : null}
      {offersError ? <p className="text-xs text-rose-300/90">{offersError}</p> : null}

      <p className="text-sm text-white/65">Segment offers and in-stay suggestions.</p>

      {segmentOffers.length ? (
        <div className="space-y-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/75">By segment / tag</p>
          {segmentOffers.map((item) => {
            const coverSrc = segmentOfferImages[item.id] || segmentOfferImages["seg-default"];
            return (
            <article
              key={item.id}
              className="ga-stagger-item guest-app-card-hover overflow-hidden rounded-3xl border border-emerald-400/25 bg-emerald-950/35 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            >
              <div className="relative h-28 w-full">
                <img src={coverSrc} alt="" className="h-full w-full object-cover opacity-95" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/40 to-transparent" />
              </div>
              <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                {item.price_hint ? (
                  <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                    {item.price_hint}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-white/40">{item.segment}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/75">{item.body}</p>
              <button
                type="button"
                className="mt-4 w-full rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                onClick={() => notify(`Selected: ${item.title}`)}
              >
                {item.cta}
              </button>
              </div>
            </article>
            );
          })}
        </div>
      ) : null}

      {liveRain ? (
        <p className="text-[0.65rem] text-sky-200/80">It is raining or has rained recently — rainy-day ideas appear below.</p>
      ) : null}

      <div className="space-y-4">
        {visible.map((item) => (
          <article
            key={item.id}
            className="ga-stagger-item guest-app-card-hover overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          >
            {item.type === "room_upgrade" ? (
              <div className="p-1">
                <UpgradeVisual imageUrl={item.imageUrl} priceHint={item.priceHint} />
              </div>
            ) : item.imageUrl ? (
              <div className="guest-app-img-zoom relative h-28 w-full overflow-hidden">
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1714]/92 to-transparent" />
              </div>
            ) : null}
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                {item.priceHint ? (
                  <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                    {item.priceHint}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
              <button
                type="button"
                className="mt-4 w-full rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                onClick={() => notify(`Selected: ${item.title}`)}
              >
                {item.cta}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="ga-stagger-item overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="relative h-24 w-full">
          <img src={guestAppImages.roomAddons} alt="" className="h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1714]/95 to-[#0f1714]/40" />
        </div>
        <div className="p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Room add-ons</p>
        <p className="mt-1 text-sm text-white/75">Down pillows, essential oils, early breakfast — one tap.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Down pillows", "Essential oils", "Breakfast 5:30"].map((label) => (
            <button
              key={label}
              type="button"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/10"
              onClick={() => notify(`Added: ${label}`)}
            >
              + {label}
            </button>
          ))}
        </div>
        </div>
      </section>
    </div>
  );
}
