/**
 * Aura Farm — simulation engine.
 *
 * A tiny, React-free state machine. The player seeds a jarred aura blob with
 * RYB color, raises it with care actions, and harvests it. All mutable
 * per-frame state lives on a `World` object owned by the page's ref; nothing
 * here touches React. `stepWorld` mutates the world and returns `FrameEvents`
 * so the page can fire sounds and react to transitions.
 *
 * Phases:
 *   build      → seeding color + raising the blob (orb scene)
 *   harvesting → the orb streaks into the goblin (transition animation)
 *   dancing    → the goblin performs the aura's dance forever (payoff scene)
 */

import {
  classifyAura,
  emptyCare,
  emptyMix,
  hueSat,
  mixForAura,
  mixToRgb,
  type AuraDef,
  type Care,
  type Channel,
  type Mix,
  warmth,
} from "./aura";

export const W = 900;
export const H = 620;

export type Phase = "build" | "harvesting" | "dancing";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: [number, number, number];
}

export interface World {
  w: number;
  h: number;
  phase: Phase;
  mix: Mix;
  care: Care;
  /** 0..1 maturity. Harvestable at 1. */
  growth: number;
  /** True once growth first reaches 1 (so we only chime once). */
  matured: boolean;
  /** Decorative pulse phase for the orb. */
  pulse: number;
  particles: Particle[];
  /** Seconds elapsed in the current harvest animation. */
  harvestT: number;
  /** Seconds elapsed dancing (drives the dance clock). */
  danceT: number;
  /** Locked at harvest time. */
  aura: AuraDef | null;
  /** Screen shake magnitude. */
  shake: number;
  /** A burst flash used at the moment of harvest, 0..1. */
  flash: number;
}

export interface FrameEvents {
  matured: boolean;
  harvestDone: boolean;
}

export const HARVEST_DURATION = 1.25;

export function createWorld(): World {
  return {
    w: W,
    h: H,
    phase: "build",
    mix: emptyMix(),
    care: emptyCare(),
    growth: 0,
    matured: false,
    pulse: 0,
    particles: [],
    harvestT: 0,
    danceT: 0,
    aura: null,
    shake: 0,
    flash: 0,
  };
}

/* ------------------------------------------------------------------ *
 * Geometry helpers (orb position)
 * ------------------------------------------------------------------ */

export function orbCenter(): { x: number; y: number } {
  return { x: W / 2, y: H * 0.46 };
}

export function orbRadius(growth: number): number {
  return 34 + growth * 96;
}

/* ------------------------------------------------------------------ *
 * Particles
 * ------------------------------------------------------------------ */

function spawnParticle(world: World, burst = false): void {
  const c = orbCenter();
  const radius = orbRadius(world.growth);
  const a = Math.random() * Math.PI * 2;
  const dist = radius * (0.5 + Math.random() * 0.5);
  const speed = burst ? 60 + Math.random() * 140 : 8 + Math.random() * 22;
  const color = mixToRgb(world.mix);
  world.particles.push({
    x: c.x + Math.cos(a) * dist,
    y: c.y + Math.sin(a) * dist,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed - (burst ? 0 : 14),
    life: 0,
    maxLife: burst ? 0.6 + Math.random() * 0.5 : 0.8 + Math.random() * 0.9,
    r: burst ? 2 + Math.random() * 4 : 1.5 + Math.random() * 3,
    color,
  });
}

function stepParticles(world: World, dt: number): void {
  const ps = world.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      ps.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 26 * dt; // gentle gravity-ish drift
    p.vx *= 1 - 1.6 * dt;
  }
}

/* ------------------------------------------------------------------ *
 * Player actions (called from the page in response to clicks)
 * ------------------------------------------------------------------ */

/** Add a drop of one primary. Allowed only while building. */
export function addColor(world: World, ch: Channel, amount = 1): void {
  if (world.phase !== "build") return;
  world.mix[ch] += amount;
  for (let i = 0; i < 6; i++) spawnParticle(world, true);
  world.pulse = 1;
}

export type CareKind = keyof Care;

export interface CareResult {
  /** Growth gained by this action. */
  gained: number;
}

/**
 * Apply a care action: nudges the mix (so raising changes the final aura) and
 * advances growth. Warm auras gain growth faster, matching the color theory.
 */
export function careAction(world: World, kind: CareKind): CareResult {
  if (world.phase !== "build") return { gained: 0 };
  world.care[kind] += 1;

  const m = world.mix;
  // Seed a faint base so the first care action on an empty jar still reads.
  if (m.r + m.y + m.b === 0) {
    m.r = 0.3;
    m.y = 0.3;
    m.b = 0.3;
  }

  switch (kind) {
    case "feed": {
      // Inspiration intensifies the current dominant hue (more vibrant).
      const max = Math.max(m.r, m.y, m.b);
      if (m.r === max) m.r += 0.6;
      else if (m.y === max) m.y += 0.6;
      else m.b += 0.6;
      break;
    }
    case "rest": {
      // Rest pulls toward balance — calmer, greyer, cooler.
      const avg = (m.r + m.y + m.b) / 3;
      m.r += (avg - m.r) * 0.25;
      m.y += (avg - m.y) * 0.25;
      m.b += (avg - m.b) * 0.25;
      m.b += 0.15;
      break;
    }
    case "sun":
      m.r += 0.25;
      m.y += 0.5;
      break;
    case "music":
      m.b += 0.3;
      m.r += 0.2;
      break;
    case "story":
      m.r += 0.35;
      m.b += 0.45;
      break;
    case "chaos": {
      m.r += (Math.random() - 0.35) * 1.4;
      m.y += (Math.random() - 0.35) * 1.4;
      m.b += (Math.random() - 0.35) * 1.4;
      world.shake = Math.max(world.shake, 6);
      break;
    }
  }
  m.r = Math.max(0, m.r);
  m.y = Math.max(0, m.y);
  m.b = Math.max(0, m.b);

  const { hue } = hueSat(world.mix);
  const speed = 1 + 0.5 * warmth(hue); // warm grows ~1.5x, cool ~0.5x
  const base =
    kind === "feed"
      ? 0.09
      : kind === "sun"
        ? 0.1
        : kind === "rest"
          ? 0.045
          : 0.065;
  const gained = base * speed;
  world.growth = Math.min(1, world.growth + gained);

  for (let i = 0; i < 10; i++) spawnParticle(world, true);
  world.pulse = 1;
  return { gained };
}

/** Reset to a fresh empty jar. */
export function reseed(world: World): void {
  world.mix = emptyMix();
  world.care = emptyCare();
  world.growth = 0;
  world.matured = false;
  world.particles = [];
  world.aura = null;
  world.phase = "build";
  world.harvestT = 0;
  world.danceT = 0;
  world.flash = 0;
}

/** Begin the harvest: lock the aura and start the streak-into-goblin anim. */
export function harvest(world: World): AuraDef | null {
  if (world.phase !== "build" || world.growth < 1) return null;
  world.aura = classifyAura(world.mix, world.care);
  world.phase = "harvesting";
  world.harvestT = 0;
  world.flash = 0;
  for (let i = 0; i < 40; i++) spawnParticle(world, true);
  return world.aura;
}

/** Force-set state from a shared snapshot, jumping straight to the dance. */
export function loadShared(world: World, mix: Mix, care: Care): AuraDef {
  world.mix = { ...mix };
  world.care = { ...care };
  world.growth = 1;
  world.matured = true;
  world.aura = classifyAura(mix, care);
  world.phase = "dancing";
  world.danceT = 0;
  return world.aura;
}

/**
 * Replay a specific aura's dance directly (from the Dance Encyclopedia). Forces
 * the aura rather than re-deriving it, using its canonical color for visuals
 * and groove tempo.
 */
export function playAura(world: World, aura: AuraDef): void {
  world.mix = mixForAura(aura.id);
  world.care = emptyCare();
  world.growth = 1;
  world.matured = true;
  world.aura = aura;
  world.phase = "dancing";
  world.danceT = 0;
  world.harvestT = 0;
  world.flash = 0;
  world.particles = [];
}

/* ------------------------------------------------------------------ *
 * Per-frame step
 * ------------------------------------------------------------------ */

export function stepWorld(world: World, dt: number): FrameEvents {
  const events: FrameEvents = { matured: false, harvestDone: false };

  world.pulse = Math.max(0, world.pulse - dt * 2.2);
  world.shake = Math.max(0, world.shake - dt * 22);
  stepParticles(world, dt);

  if (world.phase === "build") {
    // Idle drift growth so a seeded blob slowly matures even without care,
    // but care is far faster. Only grows once color has been added.
    if (world.mix.r + world.mix.y + world.mix.b > 0 && world.growth < 1) {
      const { hue } = hueSat(world.mix);
      const speed = 1 + 0.5 * warmth(hue);
      world.growth = Math.min(1, world.growth + dt * 0.018 * speed);
    }
    if (Math.random() < 0.4) spawnParticle(world, false);
    if (world.growth >= 1 && !world.matured) {
      world.matured = true;
      events.matured = true;
    }
  } else if (world.phase === "harvesting") {
    world.harvestT += dt;
    world.flash = Math.min(1, world.harvestT / 0.4);
    // Stream particles toward the goblin (bottom center).
    const target = { x: W / 2, y: H * 0.82 };
    for (const p of world.particles) {
      p.vx += (target.x - p.x) * dt * 6;
      p.vy += (target.y - p.y) * dt * 6;
    }
    if (Math.random() < 0.9) {
      const c = orbCenter();
      const a = Math.random() * Math.PI * 2;
      const r = orbRadius(world.growth) * Math.random();
      world.particles.push({
        x: c.x + Math.cos(a) * r,
        y: c.y + Math.sin(a) * r,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0.7,
        r: 2 + Math.random() * 3,
        color: mixToRgb(world.mix),
      });
    }
    if (world.harvestT >= HARVEST_DURATION) {
      world.phase = "dancing";
      world.danceT = 0;
      world.shake = 8;
      events.harvestDone = true;
    }
  } else {
    // dancing
    world.danceT += dt;
  }

  return events;
}
