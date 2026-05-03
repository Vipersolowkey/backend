import { useCallback, useEffect, useState } from "react";

import { useGuestAppBooking } from "../../components/guestapp/GuestAppBookingContext";
import { guestAppTimelineStep } from "../../lib/guestAppApi";
import { fetchCurrentWeather, isRainyWmoCode } from "../../lib/openMeteoWeather";

function formatShortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
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
          setWeatherError(e?.message || "Không tải được thời tiết.");
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
        showToast(`Đã cập nhật bước: ${step}`);
      } catch (e) {
        showToast(e?.message || "Không cập nhật được timeline.");
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
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-inner">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-200/75">Lưu trú</p>
        <p className="mt-1 text-lg font-semibold text-white">Phòng {roomLabel}</p>
        <p className="mt-0.5 text-sm text-white/60">
          {formatShortDate(checkIn)} → {formatShortDate(checkOut)} · Mã {refLabel}
        </p>
        {session?.property_name ? (
          <p className="mt-1 text-xs text-white/50">{session.property_name}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-white/55">Timeline lưu trú</p>
          <ol className="relative space-y-0 border-l border-white/15 pl-4">
            {steps.map((s) => {
              const dot =
                s.state === "done"
                  ? "bg-emerald-400"
                  : s.state === "current"
                    ? "bg-amber-400 ring-2 ring-amber-400/40"
                    : "bg-white/25";
              return (
                <li key={s.key} className="relative pb-4 pl-1 last:pb-0">
                  <span className={`absolute -left-[1.15rem] top-1.5 h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
                  <p className="text-sm font-semibold text-white">{s.label_vi}</p>
                  <p className="text-[0.65rem] text-white/40">{s.label_en}</p>
                </li>
              );
            })}
          </ol>
          {sessionLoading && !session ? (
            <p className="text-xs text-white/50">Đang tải timeline từ booking…</p>
          ) : null}
        </div>

        {session && nextStep ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-white/60">
              Nhân viên lễ tân có thể đẩy bước tiếp theo tại đây (đồng bộ CRM timeline).
            </p>
            <button
              type="button"
              disabled={advancing}
              className="mt-2 w-full rounded-xl bg-emerald-600/90 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              onClick={() => advanceStep(nextStep)}
            >
              {advancing ? "Đang gửi…" : `Tiếp theo → ${nextStep}`}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-900/40 to-stone-900/40 p-4">
        <p className="text-sm font-semibold text-white">Cảm ơn bạn đã đặt phòng!</p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Đặt trước đưa đón sân bay — đội concierge sẽ đón bạn tại ga.
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          onClick={() => notify("Đã ghi nhận — concierge sẽ liên hệ xác nhận.")}
        >
          Đặt đưa đón
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-3xl border p-4 text-left transition ${
            doorOpen
              ? "border-emerald-400/50 bg-emerald-500/15"
              : "border-white/10 bg-white/[0.04] hover:border-white/20"
          }`}
          onClick={() => {
            setDoorOpen(true);
            notify("Đã gửi lệnh mở cửa tới khóa phòng (khi tích hợp hoàn tất).");
          }}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Mobile key</p>
          <p className="mt-1 text-base font-semibold text-white">{doorOpen ? "Đã mở" : "Chạm để mở cửa"}</p>
          <p className="mt-1 text-xs text-white/55">Phòng {roomLabel}</p>
        </button>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Thanh toán</p>
          <p className="mt-1 text-base font-semibold text-white">Minibar & dịch vụ</p>
          <p className="mt-1 text-xs text-white/55">
            Phụ phí: {session?.folio_extras_total != null ? `${session.folio_extras_total}` : "—"} · HK phòng:{" "}
            {session?.housekeeping_room_status || "—"}
          </p>
          <p className="mt-2 text-[0.65rem] text-white/45">Chi tiết dòng folio ở tab Me.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-400/20 bg-amber-950/30 p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-amber-200/80">Happy hour</p>
        <p className="mt-1 text-sm font-medium text-white">
          Rooftop — mua một cocktail tặng một; bắt đầu sau một giờ nữa.
        </p>
        <button
          type="button"
          className="mt-3 rounded-2xl bg-amber-500/90 px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-400"
          onClick={() => notify("Đã gửi yêu cầu giữ chỗ quầy bar.")}
        >
          Giữ chỗ bar
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/50">Thời tiết</p>
            {weatherLoading && !weather ? (
              <p className="mt-1 text-sm text-white/60">Đang tải…</p>
            ) : weatherError ? (
              <p className="mt-1 text-sm text-rose-300/90">{weatherError}</p>
            ) : weather ? (
              <>
                <p className="mt-1 text-sm font-medium text-white">
                  {weather.placeLabel} · {weather.labelVi}
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-100">
                  {Math.round(weather.temperatureC)}°C
                  <span className="ml-2 text-sm font-normal text-white/55">
                    cảm giác {Math.round(weather.apparentC)}°C
                  </span>
                </p>
                <p className="mt-1 text-xs text-white/55">
                  Độ ẩm {weather.humidityPct}% · Gió {Math.round(weather.windKmh)} km/h
                  {weather.precipitationMm > 0 ? ` · Mưa gần đây ${weather.precipitationMm} mm` : ""}
                </p>
                <p className="mt-1 text-[0.65rem] text-white/35">Cập nhật: {weather.time} (Open-Meteo)</p>
              </>
            ) : null}
          </div>
        </div>
        {isRain ? (
          <p className="mt-3 text-sm leading-relaxed text-emerald-100/85">
            Trời mưa — thưởng thức trà chiều tại lounge hoặc gọi món từ phòng.{" "}
            <button
              type="button"
              className="font-semibold text-emerald-300 underline"
              onClick={() => notify("Đang mở thực đơn ngày mưa trong tab Dine.")}
            >
              Xem menu
            </button>
          </p>
        ) : null}
      </section>
    </div>
  );
}
