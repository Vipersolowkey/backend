import { useEffect } from "react";

export default function GuestToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const id = window.setTimeout(() => onClose(), 3200);
    return () => window.clearTimeout(id);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className="fixed left-1/2 top-[4.5rem] z-[60] max-w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-emerald-400/30 bg-emerald-950/95 px-4 py-3 text-center text-sm font-medium text-emerald-50 shadow-lg backdrop-blur-md"
      role="status"
    >
      {message}
    </div>
  );
}
