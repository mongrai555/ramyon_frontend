/**
 * Sends a table's QR tent card to the printer.
 *
 * The card used to be built with document.write into a blank `window.open`
 * tab. That tab stayed script-connected to the dashboard, so the browser ran
 * the two on a single thread and the print dialog froze the dashboard behind
 * it — the floor stopped refreshing, and orders placed in the meantime went
 * unnoticed until someone reloaded.
 *
 * Now the card is a real page (`/admin/print`) opened with `noopener`, which
 * gives it its own process. The dashboard keeps polling and ringing while
 * someone stands at the printer. The card image travels through localStorage,
 * because a QR data URL is far too long for a query string.
 */

export interface PrintJob {
  qr: string;
  tableNumber: string;
}

const JOB_PREFIX = "k_print_job_";
const ACK_PREFIX = "k_print_ack_";

/** How long to wait for the card tab to report in before calling it blocked. */
const ACK_TIMEOUT_MS = 2500;

/**
 * Opens the card in its own tab. Resolves false only when the tab never
 * reported in, which in practice means the browser blocked the pop-up —
 * `noopener` costs us the window handle, so the tab has to say so itself.
 */
export async function printQrTent(
  qrDataUrl: string,
  tableNumber: string,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    localStorage.setItem(
      JOB_PREFIX + key,
      JSON.stringify({ qr: qrDataUrl, tableNumber } satisfies PrintJob),
    );
  } catch {
    return false; // storage full or blocked; nothing to hand the card tab
  }

  window.open(`/admin/print?k=${key}`, "_blank", "noopener,noreferrer");

  const opened = await waitForAck(key);
  if (!opened) cleanUp(key);
  return opened;
}

function waitForAck(key: string): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      try {
        if (localStorage.getItem(ACK_PREFIX + key)) {
          localStorage.removeItem(ACK_PREFIX + key);
          resolve(true);
          return;
        }
      } catch {
        resolve(true); // cannot tell; assume it worked rather than cry wolf
        return;
      }
      if (Date.now() - started >= ACK_TIMEOUT_MS) {
        resolve(false);
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
  });
}

function cleanUp(key: string) {
  try {
    localStorage.removeItem(JOB_PREFIX + key);
    localStorage.removeItem(ACK_PREFIX + key);
  } catch {
    // nothing worth failing a print over
  }
}

/** Read by the card page. Clears the job so old cards cannot pile up. */
export function readPrintJob(key: string): PrintJob | null {
  try {
    const raw = localStorage.getItem(JOB_PREFIX + key);
    if (!raw) return null;
    localStorage.removeItem(JOB_PREFIX + key);
    return JSON.parse(raw) as PrintJob;
  } catch {
    return null;
  }
}

/** The card page's "I'm here" — the dashboard waits for this. */
export function ackPrintJob(key: string) {
  try {
    localStorage.setItem(ACK_PREFIX + key, "1");
  } catch {
    // the dashboard will fall back to warning about pop-ups; harmless
  }
}

export default printQrTent;
