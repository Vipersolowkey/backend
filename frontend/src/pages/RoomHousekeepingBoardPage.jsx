import { useCallback, useEffect, useState } from "react";

import { OrganicLayout, OrganicSection } from "../components/organic/OrganicUI";
import { fetchProperties } from "../lib/dashboardApi";
import { guestAppRoomBoard } from "../lib/guestAppApi";

const HK_VI = {
  clean: "Sạch / sẵn sàng",
  dirty: "Cần dọn",
  in_progress: "Đang dọn",
};

const STAY_VI = {
  vacant: "Trống",
  reserved: "Đã đặt (chưa vào)",
  occupied: "Đang ở",
};

export default function RoomHousekeepingBoardPage() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [board, setBoard] = useState({ rooms: [] });
  const [boardError, setBoardError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties()
      .then((list) => {
        const arr = list || [];
        setProperties(arr);
        if (arr.length) {
          setPropertyId((prev) => (prev && arr.some((p) => String(p.id) === prev) ? prev : String(arr[0].id)));
        } else {
          setPropertyId("1");
        }
      })
      .catch(() => {
        setProperties([]);
        setPropertyId("1");
      });
  }, []);

  const loadBoard = useCallback(async () => {
    const pid = propertyId === "" ? 1 : Number(propertyId);
    if (!Number.isFinite(pid) || pid < 1) return;
    setBoardError("");
    setLoading(true);
    try {
      const data = await guestAppRoomBoard(pid);
      setBoard(data);
    } catch (e) {
      setBoard({ rooms: [] });
      setBoardError(e?.message || "Không tải được bảng phòng.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId === "") return undefined;
    loadBoard();
    const id = window.setInterval(loadBoard, 20_000);
    return () => window.clearInterval(id);
  }, [loadBoard, propertyId]);

  const rows = board?.rooms || [];

  return (
    <OrganicLayout
      pageKey="room-board"
      hero={{
        eyebrow: "Vận hành",
        title: "Sơ đồ phòng & buồng phòng",
        description: "Trạng thái lưu trú theo booking và trạng thái dọn phòng (HK) từng phòng — dành cho lễ tân / buồng phòng.",
        stats: [],
        illustration: null,
      }}
    >
      <OrganicSection eyebrow={null} title="Bộ lọc" description={null}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-sm font-semibold text-[var(--earth-secondary)]">
            Chi nhánh / property
            <select
              className="min-w-[240px] px-3 py-2"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={!properties.length}
            >
              {properties.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-full border border-[rgba(30,42,36,0.12)] bg-[rgba(255,255,255,0.65)] px-4 py-2 text-sm font-semibold text-[var(--earth-secondary)] hover:bg-white"
            onClick={loadBoard}
          >
            Làm mới
          </button>
        </div>
        {board.as_of ? (
          <p className="mt-2 text-xs text-[var(--earth-text-muted)]">Cập nhật: {board.as_of}</p>
        ) : null}
        {boardError ? <p className="mt-2 text-sm text-amber-800">{boardError}</p> : null}
      </OrganicSection>

      <OrganicSection
        eyebrow={null}
        title="Danh sách phòng"
        description={loading ? "Đang tải…" : `${rows.length} phòng.`}
      >
        <ul className="max-h-[min(70vh,52rem)] space-y-2 overflow-auto pr-1">
          {rows.map((r) => (
            <li
              key={r.room_id}
              className="rounded-2xl border border-[rgba(30,42,36,0.1)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--earth-secondary)]">Phòng {r.room_number}</span>
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--earth-text-muted)]">
                  {STAY_VI[r.stay_state] || r.stay_state}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--earth-text)]">
                <span>
                  HK: <span className="font-medium text-[var(--earth-primary)]">{HK_VI[r.housekeeping_status] || r.housekeeping_status}</span>
                </span>
                {r.guest_name ? <span className="max-w-[12rem] truncate font-medium">{r.guest_name}</span> : null}
              </div>
              {r.booking_ref ? (
                <p className="mt-1 text-[0.7rem] font-medium text-[rgba(61,122,106,0.95)]">Mã: {r.booking_ref}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </OrganicSection>
    </OrganicLayout>
  );
}
