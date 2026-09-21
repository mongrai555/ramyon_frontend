"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Calls `onNew` with the ids that appeared since the previous pass, including
 * everything present on the very first pass.
 *
 * It deliberately does NOT swallow that first batch. An earlier version did,
 * to avoid announcing a floor full of running orders on page load — but that
 * made the alert depend on the screen having observed an empty list first, and
 * any hiccup (a blocked main thread, a poll that landed before the component
 * mounted) silently ate the first real order of the shift. Deciding what counts
 * as new is the caller's job now, and it has the order timestamps to do it
 * properly.
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
    const before = previous.current ?? [];
    previous.current = current;

    const added = current.filter((id) => !before.includes(id));
    if (added.length > 0) handler.current(added);
  }, [fingerprint, enabled]);
}
