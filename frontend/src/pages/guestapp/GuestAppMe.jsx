import { useCallback, useState } from "react";

import { useGuestAppBooking } from "../../components/guestapp/GuestAppBookingContext";
import { guestAppBillExportUrl, guestAppHousekeepingRequest } from "../../lib/guestAppApi";
import { guestAppImages } from "../../lib/guestAppImages";
import { lightingScenes } from "../../lib/guestAppMockData";

function formatAmount(amountStr) {
  if (amountStr == null || amountStr === "") return "—";
  const n = Number(amountStr);
  if (Number.isNaN(n)) return amountStr;
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const HK_LABELS = {
  clean: "Clean / ready",
  dirty: "Needs service",
  in_progress: "In progress",
};

export default function GuestAppMe() {
  const { session, bookingRef, showToast, refreshSession } = useGuestAppBooking();
  const [spotifyLinked, setSpotifyLinked] = useState(false);
  const [scene, setScene] = useState("relax");
  const [billOpen, setBillOpen] = useState(false);
  const [billText, setBillText] = useState("");
  const [billLoading, setBillLoading] = useState(false);
  const [hkNotes, setHkNotes] = useState("");
  const [hkBusy, setHkBusy] = useState(false);

  const notify = useCallback((msg) => showToast(msg), [showToast]);

  const guestName = session?.guest_name || "Guest";

  const openBillPreview = useCallback(async () => {
    setBillLoading(true);
    setBillOpen(true);
    try {
      const url = guestAppBillExportUrl(bookingRef);
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) throw new Error(text || "Could not load bill");
      setBillText(text);
    } catch (e) {
      setBillText(String(e?.message || e));
    } finally {
      setBillLoading(false);
    }
  }, [bookingRef]);

  const lines = session?.folio_lines || [];

  const requestHousekeeping = useCallback(async () => {
    setHkBusy(true);
    try {
      await guestAppHousekeepingRequest({
        booking_ref: bookingRef.trim(),
        scope: "full_clean",
        notes: hkNotes.trim() || null,
      });
      notify("Housekeeping request sent.");
      setHkNotes("");
      await refreshSession();
    } catch (e) {
      notify(e?.message || "Request failed.");
    } finally {
      setHkBusy(false);
    }
  }, [bookingRef, hkNotes, notify, refreshSession]);

  return (
    <div className="ga-stagger space-y-5">
      <section className="ga-stagger-item relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]">
        <img
          src={guestAppImages.profileWelcome}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1714] via-[#0f1714]/88 to-[#0f1714]/50" />
        <div className="relative p-4">
        <p className="text-lg font-semibold text-white">Hello, {guestName}</p>
        <p className="mt-1 text-sm text-white/60">
          Room {session?.room_number || "—"} · Extras (minibar / laundry / spa):{" "}
          {session?.folio_extras_total != null ? formatAmount(session.folio_extras_total) : "—"}
        </p>
        <p className="mt-2 text-xs text-white/50">
          Housekeeping:{" "}
          <span className="font-semibold text-emerald-200/90">
            {session?.housekeeping_room_status
              ? HK_LABELS[session.housekeeping_room_status] || session.housekeeping_room_status
              : "—"}
          </span>
        </p>
        </div>
      </section>

      <section className="ga-stagger-item overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-950/25">
        <div className="relative h-24 w-full">
          <img src={guestAppImages.housekeeping} alt="" className="h-full w-full object-cover opacity-85" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 to-emerald-950/35" />
        </div>
        <div className="p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/85">Housekeeping</p>
        <p className="mt-1 text-xs text-white/55">
          Request a full clean or a refresh for your room. (Hotel-wide floor plans are not shown here.)
        </p>
        <label className="mt-3 block text-xs text-white/55">
          Notes (optional)
          <input
            value={hkNotes}
            onChange={(e) => setHkNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
            placeholder="e.g. clean after 2:00 PM…"
          />
        </label>
        <button
          type="button"
          disabled={hkBusy}
          onClick={requestHousekeeping}
          className="mt-3 w-full rounded-2xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {hkBusy ? "Sending…" : "Request housekeeping"}
        </button>
        </div>
      </section>

      <section className="ga-stagger-item overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="relative h-20 w-full">
          <img src={guestAppImages.folioDesk} alt="" className="h-full w-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f1714]/95" />
        </div>
        <div className="p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Folio & extras</p>
        <ul className="mt-3 space-y-2">
          {lines.length === 0 ? (
            <li className="text-sm text-white/50">No folio lines yet.</li>
          ) : (
            lines.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-white">{row.description}</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-emerald-200/60">{row.category}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-emerald-200">{formatAmount(row.amount)}</p>
              </li>
            ))
          )}
        </ul>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-2xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            onClick={openBillPreview}
          >
            Preview bill
          </button>
          <a
            href={guestAppBillExportUrl(bookingRef)}
            download={`bill-${bookingRef}.txt`}
            className="flex items-center justify-center rounded-2xl bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Download bill (.txt)
          </a>
        </div>
        <p className="mt-2 text-[0.65rem] text-white/40">Bill combines room package and current folio lines.</p>
        </div>
      </section>

      <section className="ga-stagger-item relative overflow-hidden rounded-3xl border border-rose-400/25 bg-gradient-to-br from-rose-950/50 to-stone-950/60">
        <img
          src={guestAppImages.giftRose}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-rose-950/90 via-rose-950/70 to-transparent" />
        <div className="relative p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-rose-200/90">Personal touches</p>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          The Offers tab uses CRM tags (family, anniversary). Here you can acknowledge an in-room amenity gift.
        </p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-rose-200 underline"
          onClick={() => notify("Thanks sent to concierge.")}
        >
          Thanks — I received the gift
        </button>
        </div>
      </section>

      <section className="ga-stagger-item relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <img
          src={guestAppImages.spotifyMood}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1714]/95 to-[#0f1714]/70" />
        <div className="relative p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Music (Spotify)</p>
        <p className="mt-1 text-sm text-white/70">Link Spotify to play a welcome playlist when you enter the room.</p>
        <button
          type="button"
          className="mt-4 w-full rounded-2xl bg-[#1DB954] py-3 text-sm font-semibold text-black hover:brightness-110"
          onClick={() => {
            setSpotifyLinked(true);
            notify("Saved. Opening Spotify…");
            window.open("https://open.spotify.com/", "_blank", "noopener,noreferrer");
          }}
        >
          {spotifyLinked ? "Linked — open Spotify" : "Link Spotify"}
        </button>
        </div>
      </section>

      <section className="ga-stagger-item rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Lighting scenes</p>
        <p className="mt-1 text-xs text-white/55">Reading · Relax · Romantic (saved on this device).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {lightingScenes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setScene(s.id);
                notify(`Lighting: ${s.label}`);
              }}
              className={`guest-app-card-hover flex min-w-[6.5rem] flex-col overflow-hidden rounded-2xl border text-left transition ${
                scene === s.id
                  ? "border-emerald-400/60 ring-1 ring-emerald-400/30"
                  : "border-white/15 hover:border-white/25"
              }`}
            >
              {s.imageUrl ? (
                <span className="relative block h-14 w-full overflow-hidden">
                  <img src={s.imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                </span>
              ) : null}
              <span
                className={`px-3 py-2 text-sm font-semibold ${
                  scene === s.id ? "bg-emerald-500/20 text-emerald-100" : "bg-white/5 text-white/85"
                }`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45">{lightingScenes.find((x) => x.id === scene)?.hint}</p>
      </section>

      {billOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Bill preview"
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#0f1714] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Bill (preview)</p>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs font-semibold text-white/70 hover:bg-white/10"
                onClick={() => setBillOpen(false)}
              >
                Close
              </button>
            </div>
            <pre className="max-h-[65vh] overflow-auto p-4 text-left text-xs leading-relaxed text-emerald-50/90">
              {billLoading ? "Loading…" : billText}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
