"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Calls `onNew` with the ids that appeared since the previous render pass.
 *
 * The first observation only sets the baseline: opening a screen onto a floor
 * full of running orders should not sound like twenty tables just ordered.
 */
export default function useNewItems(
  ids: string[],
  onNew: (added: string[]) => void,
  enabled: boolean = true,
) {
  const previous = useRef<string[] | null>(null);
  const handler = useRef(onNew);
  useLayoutEffect(() => {
    handler.current = onNew;
  });

  // Compare by content: the array is rebuilt on every render, so its identity
  // says nothing about whether an order actually arrived.
  const fingerprint = ids.join("|");

  useEffect(() => {
    if (!enabled) {
      previous.current = null;
      return;
    }

    const current = fingerprint ? fingerprint.split("|") : [];
    const before = previous.current;
    previous.current = current;

    if (before === null) return;

    const added = current.filter((id) => !before.includes(id));
    if (added.length > 0) handler.current(added);
  }, [fingerprint, enabled]);
}
