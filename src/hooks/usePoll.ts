"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Re-runs `fn` on a timer while the tab is being looked at.
 *
 * Two things a bare setInterval in a component gets wrong, and both bit this
 * app: the interval is torn down and rebuilt whenever any dependency changes
 * identity, so a callback that closes over fresh state resets the clock on
 * every render; and it keeps firing in a background tab, so a phone left on
 * the menu after the customer leaves goes on hammering the API all evening.
 *
 * Here the callback lives in a ref, so the timer is created once and still
 * calls the latest closure, and the poll pauses while the tab is hidden,
 * catching up with one immediate call the moment it comes back.
 */
export default function usePoll(
  fn: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true,
) {
  const saved = useRef(fn);
  useLayoutEffect(() => {
    saved.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const run = () => {
      void saved.current();
    };

    const start = () => {
      if (timer !== null) return;
      timer = setInterval(run, intervalMs);
    };
    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run(); // show what was missed before waiting out another interval
        start();
      } else {
        stop();
      }
    };

    run();
    if (document.visibilityState === "visible") start();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [intervalMs, enabled]);
}
