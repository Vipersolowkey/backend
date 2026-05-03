import { useCallback, useState } from "react";

import { useGuestAppBooking } from "../../components/guestapp/GuestAppBookingContext";
import { guestAppBillExportUrl, guestAppHousekeepingRequest } from "../../lib/guestAppApi";
import { lightingScenes } from "../../lib/guestAppMockData";

function formatAmount(amountStr) {
  if (amountStr == null || amountStr === "") return "—";
  const n = Number(amountStr);
  if (Number.isNaN(n)) return amountStr;
  return n.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const HK_VI = {
  clean: "Sạch / sẵn sàng",
  dirty: "Cần dọn",
  in_progress: "Đang dọn",
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

  const guestName = session?.guest_name || "Khách";

  const openBillPreview = useCallback(async () => {
    setBillLoading(true);
    setBillOpen(true);
    try {
      const url = guestAppBillExportUrl(bookingRef);
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) throw new Error(text || "Lỗi tải bill");
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
      notify("Đã gửi yêu cầu dọn phòng tới buồng phòng.");
      setHkNotes("");
      await refreshSession();
    } catch (e) {
      notify(e?.message || "Gửi yêu cầu thất bại.");
    } finally {
      setHkBusy(false);
    }
  }, [bookingRef, hkNotes, notify, refreshSession]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-lg font-semibold text-white">Xin chào, {guestName}</p>
        <p className="mt-1 text-sm text-white/60">
          Phòng {session?.room_number || "—"} · Phụ phí (minibar / giặt / spa):{" "}
          {session?.folio_extras_total != null ? formatAmount(session.folio_extras_total) : "—"}
        </p>
        <p className="mt-2 text-xs text-white/50">
          Buồng phòng:{" "}
          <span className="font-semibold text-emerald-200/90">
            {session?.housekeeping_room_status
              ? HK_VI[session.housekeeping_room_status] || session.housekeeping_room_status
              : "—"}
          </span>
        </p>
      </section>

      <section className="rounded-3xl border border-emerald-400/20 bg-emerald-950/25 p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/85">Dọn phòng</p>
        <p className="mt-1 text-xs text-white/55">Gửi yêu cầu dọn / dọn lại phòng của bạn (không xem sơ đồ toàn khách sạn ở đây).</p>
        <label className="mt-3 block text-xs text-white/55">
          Ghi chú (tuỳ chọn)
          <input
            value={hkNotes}
            onChange={(e) => setHkNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white"
            placeholder="Ví dụ: dọn sau 14:00…"
          />
        </label>
        <button
          type="button"
          disabled={hkBusy}
          onClick={requestHousekeeping}
          className="mt-3 w-full rounded-2xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {hkBusy ? "Đang gửi…" : "Yêu cầu dọn phòng"}
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Folio & phụ phí</p>
        <ul className="mt-3 space-y-2">
          {lines.length === 0 ? (
            <li className="text-sm text-white/50">Chưa có dòng phụ phí.</li>
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
            Xem trước hóa đơn
          </button>
          <a
            href={guestAppBillExportUrl(bookingRef)}
            download={`bill-${bookingRef}.txt`}
            className="flex items-center justify-center rounded-2xl bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Tải bill (.txt)
          </a>
        </div>
        <p className="mt-2 text-[0.65rem] text-white/40">Bill được tạo từ tổng tiền phòng và các dòng folio hiện có.</p>
      </section>

      <section className="rounded-3xl border border-rose-400/25 bg-gradient-to-br from-rose-950/50 to-stone-950/60 p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-rose-200/90">Ưu đãi cá nhân</p>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Tab Offers lấy gợi ý theo tag CRM (gia đình / anniversary). Ở đây chỉ nhắc minibar quà tặng nếu có trên hồ sơ.
        </p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-rose-200 underline"
          onClick={() => notify("Đã gửi lời cảm ơn tới concierge.")}
        >
          Cảm ơn, tôi đã nhận quà
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Music (Spotify)</p>
        <p className="mt-1 text-sm text-white/70">Liên kết Spotify để phát playlist khi vào phòng.</p>
        <button
          type="button"
          className="mt-4 w-full rounded-2xl bg-[#1DB954] py-3 text-sm font-semibold text-black hover:brightness-110"
          onClick={() => {
            setSpotifyLinked(true);
            notify("Đã ghi nhận. Đang mở Spotify…");
            window.open("https://open.spotify.com/", "_blank", "noopener,noreferrer");
          }}
        >
          {spotifyLinked ? "Đã liên kết — mở Spotify" : "Liên kết Spotify"}
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Cảnh đèn</p>
        <p className="mt-1 text-xs text-white/55">Đọc sách · Thư giãn · Lãng mạn (lưu trên thiết bị này).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {lightingScenes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setScene(s.id);
                notify(`Đèn: ${s.label}`);
              }}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                scene === s.id
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                  : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {s.label}
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
          aria-label="Xem trước hóa đơn"
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#0f1714] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Bill (preview)</p>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs font-semibold text-white/70 hover:bg-white/10"
                onClick={() => setBillOpen(false)}
              >
                Đóng
              </button>
            </div>
            <pre className="max-h-[65vh] overflow-auto p-4 text-left text-xs leading-relaxed text-emerald-50/90">
              {billLoading ? "Đang tải…" : billText}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
