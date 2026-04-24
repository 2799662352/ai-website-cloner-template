"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type ToastItem = {
  id: number;
  text: string;
  variant: "info" | "success" | "warn" | "error";
};

let _id = 0;
let _items: ToastItem[] = [];
const _listeners = new Set<() => void>();

function emit() {
  for (const fn of _listeners) fn();
}

export function toast(
  text: string,
  variant: ToastItem["variant"] = "info",
  durationMs = 2400,
) {
  const id = ++_id;
  _items = [..._items, { id, text, variant }];
  emit();
  window.setTimeout(() => {
    _items = _items.filter((t) => t.id !== id);
    emit();
  }, durationMs);
}

function subscribe(fn: () => void) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
function getSnapshot() {
  return _items;
}
const _emptySnapshot: ToastItem[] = [];
function getServerSnapshot(): ToastItem[] {
  return _emptySnapshot;
}

export function ToastHost() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed left-1/2 top-20 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={
            "pointer-events-auto rounded-lg border px-4 py-2 text-sm shadow-xl backdrop-blur " +
            (t.variant === "error"
              ? "border-red-500/40 bg-red-500/15 text-red-100"
              : t.variant === "success"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                : t.variant === "warn"
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
                  : "border-white/15 bg-black/70 text-white/90")
          }
          style={{
            animation: "toast-in 180ms cubic-bezier(.2,.8,.2,1) both",
          }}
        >
          {t.text}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
