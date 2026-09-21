/**
 * The alarm that announces a new order.
 *
 * Two sources, in order of preference:
 *
 *  1. `public/alert.mp3` — drop any sound file at that path and it becomes the
 *     notification. Nothing else needs changing; if the file is missing or the
 *     browser cannot decode it, the app falls back on its own.
 *  2. A synthesised chime, built to carry across a noisy shop: a bright rising
 *     pair of notes rung three times, pushed through a compressor so it can sit
 *     near full scale without the crackle that plain loud sine waves produce.
 */

/** Put a file here and it wins over the built-in chime. */
const CUSTOM_SOUND_URL = "/alert.mp3";

/** How many times the chime repeats. Three carries over a busy room. */
const REPEATS = 3;
const REPEAT_GAP = 0.42;

/**
 * One AudioContext for the whole tab. Browsers cap how many a page may open,
 * and a screen that rings all evening would hit that ceiling and go silent.
 */
let ctx: AudioContext | null = null;
let chain: { input: GainNode } | null = null;

let custom: HTMLAudioElement | null = null;
let customUsable = false;

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
 * Master bus: everything goes through a compressor before the speakers. It
 * levels the peaks so the whole ring can sit loud without clipping, which is
 * what actually makes a notification cut through — not raw gain.
 */
function bus(a: AudioContext) {
  if (chain) return chain;

  const input = a.createGain();
  input.gain.value = 1;

  const squash = a.createDynamicsCompressor();
  squash.threshold.value = -18;
  squash.knee.value = 6;
  squash.ratio.value = 12;
  squash.attack.value = 0.003;
  squash.release.value = 0.15;

  const out = a.createGain();
  out.gain.value = 1;

  input.connect(squash);
  squash.connect(out);
  out.connect(a.destination);

  chain = { input };
  return chain;
}

/**
 * Call from a click or tap. Browsers start every AudioContext suspended until
 * a person has interacted with the page, so without this the first order of
 * the evening arrives in silence — exactly the one nobody is watching for.
 * This is also where a custom sound file gets loaded and tested.
 */
export function unlockAudio() {
  const a = audio();
  if (a && a.state === "suspended") void a.resume();

  if (custom || typeof window === "undefined") return;
  try {
    const el = new Audio(CUSTOM_SOUND_URL);
    el.preload = "auto";
    el.volume = 1;
    el.addEventListener("canplaythrough", () => {
      customUsable = true;
    });
    el.addEventListener("error", () => {
      customUsable = false; // no such file: the built-in chime handles it
    });
    custom = el;
  } catch {
    custom = null;
  }
}

/** Rings the alarm: the custom file if there is one, otherwise the chime. */
export function playChime() {
  if (!custom) unlockAudio();

  if (custom && customUsable) {
    try {
      custom.currentTime = 0;
      custom.volume = 1;
      const started = custom.play();
      if (started) {
        void started.catch(() => {
          customUsable = false;
          synth(); // file refused to play — do not leave the kitchen in silence
        });
      }
      return;
    } catch {
      customUsable = false;
    }
  }

  synth();
}

function synth() {
  const a = audio();
  if (!a) return;
  try {
    if (a.state === "suspended") void a.resume();
    const { input } = bus(a);
    const now = a.currentTime;

    const tone = (freq: number, at: number, peak: number) => {
      const osc = a.createOscillator();
      const gain = a.createGain();
      // Triangle rather than sine: the extra harmonics are what let a small
      // tablet speaker be heard over an extractor fan.
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(peak, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.38);
      osc.connect(gain);
      gain.connect(input);
      osc.start(now + at);
      osc.stop(now + at + 0.4);
    };

    for (let i = 0; i < REPEATS; i++) {
      const at = i * REPEAT_GAP;
      tone(880, at, 0.9); // A5
      tone(1318.5, at + 0.12, 0.9); // E6
      tone(1760, at + 0.12, 0.35); // an octave of sparkle on top
    }
  } catch (err) {
    console.error("Failed to play notification chime:", err);
  }
}

/**
 * A long triple buzz for the phone or tablet propped up by the till.
 * Android honours it; iOS Safari ignores vibration entirely, which is why the
 * banner and the chime carry the message on their own.
 */
export function buzz() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([250, 120, 250, 120, 250]);
    }
  } catch {
    // a browser that refuses to buzz is not worth interrupting the order for
  }
}
