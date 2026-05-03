import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { guestAppSession, loadGuestBookingRef, saveGuestBookingRef } from "../../lib/guestAppApi";

const GuestAppBookingContext = createContext(null);

const POLL_MS = 12_000;

function phaseToastEn(phaseKey) {
  switch (phaseKey) {
    case "checkin":
      return "Check-in is in progress.";
    case "room_ready":
      return "Your room is ready.";
    case "in_room":
      return "You're checked in — enjoy your stay.";
    case "checkout":
      return "You've checked out.";
    case "completed":
      return "Your stay is complete.";
    default:
      return `Stay status updated: ${phaseKey}.`;
  }
}

export function GuestAppBookingProvider({ children }) {
  const [bookingRef, setBookingRefState] = useState(() => loadGuestBookingRef());
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [toast, setToast] = useState("");
  const prevPhaseRef = useRef(null);
  const mountedRef = useRef(true);

  const showToast = useCallback((msg) => setToast(msg), []);
  const hideToast = useCallback(() => setToast(""), []);

  const setBookingRef = useCallback((next) => {
    const trimmed = (next || "").trim();
    setBookingRefState(trimmed);
    saveGuestBookingRef(trimmed);
  }, []);

  const refreshSession = useCallback(async () => {
    const ref = (bookingRef || "").trim();
    if (!ref) {
      setSession(null);
      setSessionError("Enter a booking reference.");
      setSessionLoading(false);
      return;
    }
    setSessionLoading(true);
    setSessionError("");
    try {
      const controller = new AbortController();
      const data = await guestAppSession(ref, controller.signal);
      if (!mountedRef.current) return;
      setSession(data);
      const phase = data?.stay_phase_key;
      if (phase != null && prevPhaseRef.current != null && prevPhaseRef.current !== phase) {
        showToast(phaseToastEn(phase));
      }
      prevPhaseRef.current = phase;
    } catch (e) {
      if (!mountedRef.current) return;
      setSession(null);
      setSessionError(e?.message || "Could not load session.");
      prevPhaseRef.current = null;
    } finally {
      if (mountedRef.current) setSessionLoading(false);
    }
  }, [bookingRef, showToast]);

  useEffect(() => {
    prevPhaseRef.current = null;
  }, [bookingRef]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshSession();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      bookingRef,
      setBookingRef,
      session,
      sessionLoading,
      sessionError,
      refreshSession,
      toast,
      showToast,
      hideToast,
    }),
    [
      bookingRef,
      setBookingRef,
      session,
      sessionLoading,
      sessionError,
      refreshSession,
      toast,
      showToast,
      hideToast,
    ],
  );

  return <GuestAppBookingContext.Provider value={value}>{children}</GuestAppBookingContext.Provider>;
}

export function useGuestAppBooking() {
  const ctx = useContext(GuestAppBookingContext);
  if (!ctx) throw new Error("useGuestAppBooking must be used inside GuestAppBookingProvider");
  return ctx;
}
