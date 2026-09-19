"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";

/**
 * The little "⋮" menu that hangs off the corner of a card.
 *
 * Cards clip their own rounded corners and sit shoulder to shoulder in a grid,
 * so a menu positioned *inside* one gets sliced off and slides under the card
 * next door. This one is rendered into <body> and placed with fixed
 * coordinates read off the button, so it floats above everything, flips below
 * when there is no room above, and nudges sideways to stay on screen.
 */
export default function PopMenu({
  label,
  open,
  onOpenChange,
  width = 224,
  className = "",
  children,
}: {
  label: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  width?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Placed by hand on the DOM node rather than through state: the measurement
  // only exists after layout, and a render round-trip would show one frame of
  // the menu in the wrong corner.
  const place = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const r = btn.getBoundingClientRect();
    const h = menu.offsetHeight;
    const w = menu.offsetWidth;
    const gap = 8;
    const pad = 8;

    // Above the button by default; drops below only when it would not fit
    let top = r.top - gap - h;
    if (top < pad) {
      const below = r.bottom + gap;
      top =
        below + h + pad <= window.innerHeight
          ? below
          : Math.max(pad, window.innerHeight - h - pad);
    }

    // Right edge lines up with the button, then clamped to the viewport
    let left = r.right - w;
    left = Math.min(
      Math.max(pad, left),
      Math.max(pad, window.innerWidth - w - pad)
    );

    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.visibility = "visible";
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={`btn btn-plain btn-sm px-2 ${className}`}
      >
        <Icon name="more" size={16} />
      </button>

      {/* open only ever flips true after a click, so this never runs on the server */}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width,
              visibility: "hidden",
            }}
            className="panel animate-pop z-50 p-1.5 shadow-lg"
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
