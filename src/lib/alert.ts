/**
 * The two-note chime and the buzz that announce a new order.
 *
 * Both the kitchen display and the front-of-house screens ring the same bell,
 * so it lives here rather than being retyped in each page.
 */

/**
 * One AudioContext for the whole tab. Browsers cap how many a page may open,
 * and a screen that rings all evening would hit that ceiling and go silent.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Call from a click or tap. Browsers start every AudioContext suspended until
 * a person has interacted with the page, so without this the first order of
 * the evening arrives in silence — exactly the one nobody is watching for.
 */
export function unlockAudio() {
  const a = audio();
  if (a && a.state === "suspended") void a.resume();
}

/** A rising E5 → A5 ding. Carries over a kitchen without being shrill. */
export function playChime() {
  const a = audio();
  if (!a) return;
  try {
    if (a.state === "suspended") void a.resume();
    const now = a.currentTime;

    const tone = (freq: number, at: number) => {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + at);
      gain.gain.linearRampToValueAtTime(0.15, now + at + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + at + 0.8);
      osc.connect(gain);
      gain.connect(a.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.8);
    };

    tone(659.25, 0); // E5
    tone(880, 0.1); // A5
  } catch (err) {
    console.error("Failed to play notification chime:", err);
  }
}

/**
 * A short double buzz for the phone or tablet propped up by the till.
 * Android honours it; iOS Safari ignores vibration entirely, which is why the
 * banner and the chime carry the message on their own.
 */
export function buzz() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([120, 80, 120]);
    }
  } catch {
    // a browser that refuses to buzz is not worth interrupting the order for
  }
}
