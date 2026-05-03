import { API_BASE_URL } from "./dashboardApi";

const LS_BOOKING_REF = "guest_app_booking_ref";
export const DEFAULT_GUEST_APP_BOOKING_REF = "ORT-2026-0003";

export function loadGuestBookingRef() {
  try {
    const v = window.localStorage.getItem(LS_BOOKING_REF);
    return (v && v.trim()) || DEFAULT_GUEST_APP_BOOKING_REF;
  } catch {
    return DEFAULT_GUEST_APP_BOOKING_REF;
  }
}

export function saveGuestBookingRef(ref) {
  try {
    window.localStorage.setItem(LS_BOOKING_REF, (ref || "").trim());
  } catch {
    /* ignore */
  }
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function guestAppSession(bookingRef, signal) {
  const q = new URLSearchParams({ booking_ref: bookingRef.trim() });
  const response = await fetch(`${API_BASE_URL}/guest-app/session?${q}`, { signal });
  const data = await parseJson(response);
  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function guestAppOffers(bookingRef, signal) {
  const q = new URLSearchParams({ booking_ref: bookingRef.trim() });
  const response = await fetch(`${API_BASE_URL}/guest-app/offers?${q}`, { signal });
  const data = await parseJson(response);
  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function guestAppRoomBoard(propertyId = 1, signal) {
  const q = new URLSearchParams({ property_id: String(propertyId) });
  const response = await fetch(`${API_BASE_URL}/guest-app/rooms/board?${q}`, { signal });
  const data = await parseJson(response);
  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function guestAppTimelineStep(bookingRef, step) {
  const response = await fetch(`${API_BASE_URL}/guest-app/timeline/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_ref: bookingRef.trim(), step }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function guestAppDiningRequest(payload) {
  const response = await fetch(`${API_BASE_URL}/guest-app/dining-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function guestAppHousekeepingRequest(payload) {
  const response = await fetch(`${API_BASE_URL}/guest-app/housekeeping-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export function guestAppBillExportUrl(bookingRef) {
  const q = new URLSearchParams({ booking_ref: bookingRef.trim() });
  return `${API_BASE_URL}/guest-app/bill-export?${q}`;
}

/** Thêm dòng folio (minibar / dining / …) — đồng bộ bill. */
export async function guestAppAddFolioLine({ booking_ref, category, description, amount }) {
  const response = await fetch(`${API_BASE_URL}/guest-app/folio-line`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booking_ref: booking_ref.trim(),
      category: category || "dining",
      description,
      amount: typeof amount === "number" ? amount.toFixed(2) : String(amount),
    }),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}
