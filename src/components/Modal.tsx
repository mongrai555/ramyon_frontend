"use client";

import React, { useEffect } from "react";
import Icon from "@/components/Icon";

/**
 * The back-of-house dialog. Staff work on a counter screen with a mouse, so
 * these sit in the middle rather than sliding up from the thumb the way the
 * customer's sheets do. Escape and the veil both close it.
 */
export default function Modal({
  title,
  note,
  onClose,
  children,
  width = "max-w-md",
  tone = "light",
}: {
  title: string;
  note?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  tone?: "light" | "dark";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dark = tone === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="animate-veil absolute inset-0 bg-ink/60"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-pop relative z-10 flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-t-panel sm:rounded-panel ${
          dark
            ? "border border-kds-edge bg-kds-panel text-kds-text"
            : "border border-edge bg-brand-bg"
        }`}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b px-5 py-4 ${
            dark ? "border-kds-edge" : "border-edge"
          }`}
        >
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold tracking-tight">
              {title}
            </h2>
            {note && (
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  dark ? "text-kds-mute" : "text-ink-soft"
                }`}
              >
                {note}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className={`btn px-2 py-2 ${dark ? "btn-dark-quiet" : "btn-quiet"}`}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
