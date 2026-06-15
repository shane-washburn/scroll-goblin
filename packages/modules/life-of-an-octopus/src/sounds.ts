/**
 * Synthesized sound effects for Life of an Octopus. Everything routes through
 * the shared @scroll-goblin/ui audio bus so the global mute toggle applies.
 */

import { getAudioBus, getNoiseBuffer } from "@scroll-goblin/ui";

/** Soft bubbly "pop" when an egg hatches / chapter begins. */
export function playHatch(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(420, now);
  o.frequency.exponentialRampToValueAtTime(880, now + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  o.connect(g).connect(out);
  o.start(now);
  o.stop(now + 0.22);
}

/** Wet gulp when prey is eaten. */
export function playEat(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  const o = ac.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(300, now);
  o.frequency.exponentialRampToValueAtTime(90, now + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.22, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  o.connect(g).connect(out);
  o.start(now);
  o.stop(now + 0.16);
}

/** Dull thud when a predator lands a hit. */
export function playHurt(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(180, now);
  o.frequency.exponentialRampToValueAtTime(48, now + 0.22);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.4, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  o.connect(g).connect(out);
  o.start(now);
  o.stop(now + 0.26);

  const n = ac.createBufferSource();
  n.buffer = getNoiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 700;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.18, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  n.connect(f).connect(ng).connect(out);
  n.start(now);
  n.stop(now + 0.14);
}

/** Whooshing release of ink. */
export function playInk(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  const n = ac.createBufferSource();
  n.buffer = getNoiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(1800, now);
  f.frequency.exponentialRampToValueAtTime(300, now + 0.4);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.3, now + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  n.connect(f).connect(g).connect(out);
  n.start(now);
  n.stop(now + 0.52);
}

/** Light "clink" when a shell is picked up or placed. */
export function playPickup(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(680, now);
  o.frequency.exponentialRampToValueAtTime(1180, now + 0.06);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  o.connect(g).connect(out);
  o.start(now);
  o.stop(now + 0.14);
}

/** Warm rising chord for the courtship success. */
export function playHeart(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  [392, 523, 659].forEach((freq, i) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ac.createGain();
    const t = now + i * 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.55);
  });
}

/** A gentle marimba note for a new chapter card. */
export function playChapter(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  [523, 784].forEach((freq, i) => {
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const g = ac.createGain();
    const t = now + i * 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.42);
  });
}

/** Low, slow descending tone for death / the final fade. */
export function playDeath(): void {
  const { ctx: ac, out } = getAudioBus();
  const now = ac.currentTime;
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(300, now);
  o.frequency.exponentialRampToValueAtTime(70, now + 1.6);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.18, now + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  o.connect(g).connect(out);
  o.start(now);
  o.stop(now + 1.85);
}
