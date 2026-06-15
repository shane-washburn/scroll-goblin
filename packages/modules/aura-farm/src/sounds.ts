/**
 * Synthesized sound for Aura Farm, routed through the shared @scroll-goblin/ui
 * audio bus so the global mute toggle applies. No asset files — every sound is
 * an oscillator with a short gain envelope.
 *
 * The headline feature is `startGroove`: a looping dance beat whose tempo,
 * waveform, and scale are derived from the harvested aura (warm = faster &
 * brighter, cool = slower & smoother). It uses a small lookahead scheduler so
 * timing stays tight, and returns a stop handle.
 */

import { getAudioBus, getNoiseBuffer } from "@scroll-goblin/ui";
import { warmth, hueSat, type DanceId, type Mix } from "./aura";

// Bundled audio asset for the Sigma Boy dance (Vite resolves it to a URL).
const SIGMA_BOY_URL = Object.values(
  import.meta.glob("./assets/sigma-boy.mp3", {
    eager: true,
    query: "?url",
    import: "default",
  })
)[0] as string;

function blip(
  type: OscillatorType,
  freq: number,
  dur: number,
  peak = 0.18,
  glideTo?: number
): void {
  const { ctx, out } = getAudioBus();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A drop of color — pitch rises with each primary so they feel distinct. */
export function playDrop(channel: "r" | "y" | "b"): void {
  const freq = channel === "r" ? 392 : channel === "y" ? 523 : 659;
  blip("triangle", freq, 0.14, 0.15, freq * 1.5);
}

const CARE_TONES: Record<string, [OscillatorType, number, number]> = {
  feed: ["sine", 587, 698],
  rest: ["sine", 330, 262],
  sun: ["triangle", 784, 988],
  music: ["square", 494, 740],
  story: ["sine", 440, 587],
  chaos: ["sawtooth", 220, 110],
};

export function playCare(kind: string): void {
  const tone = CARE_TONES[kind] ?? CARE_TONES.feed;
  blip(tone[0], tone[1], 0.18, 0.16, tone[2]);
}

/** Rising shimmer when the blob reaches maturity. */
export function playMature(): void {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => blip("triangle", f, 0.22, 0.14), i * 80);
  });
}

/** The harvest whoosh + payoff chord. */
export function playHarvest(): void {
  const { ctx, out } = getAudioBus();
  const t = ctx.currentTime;

  // Noise whoosh.
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(4000, t + 0.5);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.2, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  src.connect(filter).connect(ng).connect(out);
  src.start(t);
  src.stop(t + 0.65);

  // Triumphant chord a beat later.
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => {
    setTimeout(() => blip("triangle", f, 0.6, 0.12), 380);
  });
}

/* ------------------------------------------------------------------ *
 * Looping dance groove
 * ------------------------------------------------------------------ */

export interface Groove {
  stop(): void;
}

// Scales (semitone offsets) keyed loosely by mood, picked per-dance/per-color.
const MAJOR = [0, 2, 4, 7, 9, 12];
const MINOR = [0, 3, 5, 7, 10, 12];
const PENTA = [0, 3, 5, 7, 10];

function midi(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

/**
 * Start a looping beat sized to the aura. Returns a handle whose `stop()`
 * tears down the scheduler and fades the groove out.
 */
export function startGroove(dance: DanceId, mix: Mix): Groove {
  // The Sigma Boy dance gets its own scored instrumental hook instead of the
  // color-derived generic beat.
  if (dance === "sigma") return startSigmaGroove();
  const { ctx, out } = getAudioBus();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.1);
  master.connect(out);

  const { hue } = hueSat(mix);
  const w = warmth(hue); // -1 cool .. 1 warm
  const bpm = 96 + Math.round((w + 1) * 28); // ~96 (cool) .. ~152 (warm)
  const spb = 60 / bpm;

  const wave: OscillatorType =
    dance === "disco" || dance === "headbang" || dance === "gremlin"
      ? "sawtooth"
      : w > 0.2
        ? "square"
        : "triangle";
  const scale = w > 0.15 ? MAJOR : w < -0.15 ? MINOR : PENTA;
  const root = 48 + Math.round((w + 1) * 4); // bass register

  const noise = getNoiseBuffer(ctx);

  let step = 0;
  let nextTime = ctx.currentTime + 0.06;
  let stopped = false;

  const kick = (time: number) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.6, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + 0.2);
  };

  const hat = (time: number, level: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(hp).connect(g).connect(master);
    src.start(time);
    src.stop(time + 0.06);
  };

  const note = (time: number, semis: number, dur: number, peak: number) => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = midi(semis);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  };

  // 8-step pattern (two beats of eighths), scheduled with lookahead.
  const schedule = () => {
    if (stopped) return;
    while (nextTime < ctx.currentTime + 0.2) {
      const s = step % 8;
      if (s === 0 || s === 4) kick(nextTime);
      hat(nextTime, s % 2 === 0 ? 0.05 : 0.03);
      // Bass on the beat.
      if (s % 2 === 0) note(nextTime, root, spb * 0.9, 0.18);
      // Melody arpeggio on offbeats.
      if (s % 2 === 1) {
        const deg = scale[(step * 3) % scale.length];
        note(nextTime, root + 12 + deg, spb * 0.7, 0.12);
      }
      nextTime += spb / 2;
      step++;
    }
  };

  schedule();
  const timer = window.setInterval(schedule, 25);

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 0.15);
    },
  };
}

/* ------------------------------------------------------------------ *
 * Sigma Boy instrumental
 * ------------------------------------------------------------------ */

// Decoded once and reused across replays so we only fetch/decode the mp3 once.
let sigmaBuffer: AudioBuffer | null = null;
let sigmaDecoding: Promise<AudioBuffer> | null = null;

function loadSigmaBuffer(ctx: AudioContext): Promise<AudioBuffer> {
  if (sigmaBuffer) return Promise.resolve(sigmaBuffer);
  if (!sigmaDecoding) {
    sigmaDecoding = fetch(SIGMA_BOY_URL)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => {
        sigmaBuffer = buf;
        return buf;
      });
  }
  return sigmaDecoding;
}

/**
 * Play the bundled "Sigma Boy" mp3 on loop through the shared audio bus (so the
 * global mute toggle still applies). The decoded buffer is cached, so replays
 * start instantly; the first play waits on the fetch/decode. `stop()` fades the
 * track out and tears down the source.
 */
function startSigmaGroove(): Groove {
  const { ctx, out } = getAudioBus();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(out);

  let stopped = false;
  let src: AudioBufferSourceNode | null = null;

  void loadSigmaBuffer(ctx)
    .then((buf) => {
      if (stopped) return;
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(master);
      src.start();
    })
    .catch(() => {
      /* asset failed to load — stay silent rather than throw */
    });

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 0.15);
      window.setTimeout(() => {
        if (src) {
          try {
            src.stop();
          } catch {
            /* already stopped */
          }
          src.disconnect();
        }
        master.disconnect();
      }, 200);
    },
  };
}
