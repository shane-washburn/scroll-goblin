/**
 * Life of an Octopus — simulation engine.
 *
 * A single-screen ecosystem driven by a fixed-ish timestep. The whole life is
 * a "hybrid" structure: an age clock advances under the hood while each chapter
 * is a gated section with its own goal. Three verbs carry the entire game —
 * move, camouflage (passive), and ink — layered with light contextual
 * interactions per chapter (eat, collect, display, guard).
 *
 * All per-frame state lives in a mutable `World` object owned by the React
 * page's ref; nothing here touches React. `stepWorld` mutates the world and
 * returns `FrameEvents` so the page can play sounds and react to transitions.
 */

export type Behavior = "wander" | "flee" | "hunt" | "hide";
export type CreatureKind =
  | "predator"
  | "prey"
  | "mate"
  | "shell"
  | "egg"
  | "baby";

export interface Creature {
  id: number;
  kind: CreatureKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  baseSpeed: number;
  behavior: Behavior;
  detect: number;
  alive: boolean;
  hue: number;
  wobble: number;
  dirX: number;
  /** performance.now() until which the creature is stunned (ink), 0 = none. */
  stun: number;
  /** generic per-kind scratch (shell-carried flag, target wander point). */
  tx: number;
  ty: number;
  /** Species label for HUD flavor. */
  species: string;
}

export interface Octopus {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  health: number;
  maxHealth: number;
  /** 0..1 how blended with the background the body currently is. */
  camo: number;
  /** Courtship color-display charge, 0..1. */
  flash: number;
  facing: number;
  /** carried shells in the den chapter. */
  carrying: number;
  /** brief invulnerability window after taking a hit. */
  invuln: number;
  /** Whether displaying for courtship (automatic when near mate). */
  displaying: boolean;
}

export interface Stats {
  ageReached: number;
  predatorsEscaped: number;
  preyCaught: number;
  densBuilt: number;
  eggsProtected: number;
  inkUsed: number;
}

export interface World {
  w: number;
  h: number;
  chapter: number;
  octo: Octopus;
  creatures: Creature[];
  /** Pointer-follow target. */
  target: { x: number; y: number; active: boolean };
  /** Keyboard movement direction. */
  keyX: number;
  keyY: number;
  ink: { x: number; y: number; t: number; active: boolean };
  inkReadyAt: number;
  age: number;
  ageF: number;
  stats: Stats;
  goalProgress: number;
  goalTarget: number;
  chapterTime: number;
  /** 0..1 senescence used in the guardian chapter / ending. */
  weakening: number;
  shake: number;
  /** Fixed den location for the den chapter. */
  den: { x: number; y: number };
  /** running flag — false once dead or finished. */
  phase: "playing" | "ending" | "dead" | "won";
  endTime: number;
  /** Eggs lost to predators in the guardian chapter (lowers the final count). */
  eggsLost: number;
  /** Track which predators have started hunting the player for escape metric. */
  huntingPredators: Set<number>;
  /** Courtship success animation state. */
  mateSuccess: boolean;
  mateSuccessTime: number;
  /** Guardian end animation state. */
  endAnimation: {
    phase: "fade" | "ascend" | "heaven";
    startTime: number;
    fadeOpacity: number;
    ascended: boolean | number;
  };
}

export interface FrameEvents {
  ate: boolean;
  hurt: boolean;
  escaped: boolean;
  inked: boolean;
  pickup: boolean;
  heart: boolean;
  chapterComplete: boolean;
  died: boolean;
  /** A sibling hatchling was eaten this frame (Hatchling chapter). */
  siblingEaten: boolean;
}

export interface ChapterDef {
  no: number;
  /** chapter card title, e.g. "The Hatchling". */
  title: string;
  age: number;
  /** HUD goal line. */
  goal: string;
  /** Very short HUD goal hint, e.g. "Reach surface". */
  hint: string;
  /** opening narration card line. */
  card: string;
  topColor: [number, number, number];
  bottomColor: [number, number, number];
  octoSize: number;
  maxSpeed: number;
  accel: number;
  /** vertical drift; negative floats up (hatchling). */
  buoyancy: number;
  /** 0..1 steering responsiveness. */
  control: number;
}

/* --- World geometry --- */
export const W = 400;
export const H = 560;
export const SURFACE_Y = 48;
export const FLOOR_Y = 500;

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

/** Deterministic pseudo-random for static scenery matching draw.ts. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Check if octopus is near environmental cover (rocks, coral, seaweed). */
function getCoverFactor(x: number, y: number): number {
  const r = rng(7);
  let cover = 0;

  // Check proximity to rocks (12 rocks with various sizes)
  for (let i = 0; i < 12; i++) {
    const rx = 50 + r() * (W - 100);
    const rad = 18 + r() * 35;
    const ry = FLOOR_Y - rad * 0.2 + r() * 15;
    const d = Math.sqrt(dist2(x, y, rx, ry));
    if (d < rad + 20) {
      cover = Math.max(cover, 1 - d / (rad + 40));
    }
  }

  // Check proximity to coral (8 coral patches)
  for (let i = 0; i < 8; i++) {
    const cx = 60 + r() * (W - 120);
    const cy = FLOOR_Y - 5 + r() * 20;
    const size = 8 + r() * 16;
    const d = Math.sqrt(dist2(x, y, cx, cy));
    if (d < size + 25) {
      cover = Math.max(cover, 0.7 - d / (size + 50));
    }
  }

  // Check proximity to seaweed (10 strands)
  for (let i = 0; i < 10; i++) {
    const sx = 30 + r() * (W - 60);
    const sy = FLOOR_Y + 10;
    const height = 30 + r() * 60;
    // Seaweed extends upward from sy
    const d = Math.sqrt(dist2(x, y, sx, Math.max(y, sy - height * 0.5)));
    if (d < 20 && y > sy - height && y < sy + 10) {
      cover = Math.max(cover, 0.5 - d / 40);
    }
  }

  return clamp(cover, 0, 1);
}

export const INK_COOLDOWN_MS = 4200;
export const INK_RADIUS = 150;

/** Ages are in MONTHS — an octopus lives only about a year. */
export const CHAPTERS: ChapterDef[] = [
  {
    no: 1,
    title: "The Hatchling",
    age: 0,
    goal: "Drift up to the bright surface currents.",
    hint: "Reach the surface",
    card: "You and thousands of siblings hatch at once and rush for the surface. Almost none survive the gauntlet. Let the current carry you up.",
    topColor: [190, 235, 244],
    bottomColor: [74, 163, 196],
    octoSize: 8,
    maxSpeed: 50,
    accel: 90,
    buoyancy: -34,
    control: 0.2,
  },
  {
    no: 2,
    title: "The Descent",
    age: 1,
    goal: "Sink down to the seafloor — and survive the open water.",
    hint: "Reach the seafloor",
    card: "The open water is full of mouths. Reach the seafloor where you can hide.",
    topColor: [74, 163, 196],
    bottomColor: [11, 59, 102],
    octoSize: 13,
    maxSpeed: 90,
    accel: 200,
    buoyancy: -2,
    control: 0.45,
  },
  {
    no: 3,
    title: "The Hunter",
    age: 4,
    goal: "Catch prey to grow. Ambush from your camouflage.",
    hint: "Eat 6 prey",
    card: "You have learned to hunt. Stay still, blend in, then strike.",
    topColor: [43, 111, 143],
    bottomColor: [8, 49, 79],
    octoSize: 17,
    maxSpeed: 114,
    accel: 280,
    buoyancy: 0,
    control: 0.7,
  },
  {
    no: 4,
    title: "The Den",
    age: 8,
    goal: "Carry shells home to build a safe den.",
    hint: "Bring 3 shells home",
    card: "A grown octopus needs a fortress. Gather shells and wall up your den.",
    topColor: [37, 89, 111],
    bottomColor: [6, 36, 58],
    octoSize: 21,
    maxSpeed: 120,
    accel: 300,
    buoyancy: 0,
    control: 0.82,
  },
  {
    no: 5,
    title: "The Courtship",
    age: 11,
    goal: "Find another octopus. Approach, then hold to display your colors.",
    hint: "Find a mate",
    card: "Once in a life, you search for another. Few octopuses ever meet one.",
    topColor: [47, 109, 134],
    bottomColor: [10, 47, 77],
    octoSize: 24,
    maxSpeed: 118,
    accel: 300,
    buoyancy: 0,
    control: 0.88,
  },
  {
    no: 6,
    title: "The Guardian",
    age: 12,
    goal: "Guard your eggs. Stay close. Drive away anything that comes.",
    hint: "Guard the eggs",
    card: "You will lay thousands of eggs — and never eat again. Guard them to the end.",
    topColor: [29, 74, 99],
    bottomColor: [5, 29, 48],
    octoSize: 26,
    maxSpeed: 112,
    accel: 290,
    buoyancy: 0,
    control: 0.9,
  },
];

const GUARDIAN_DURATION = 36; // seconds to protect the eggs

let nextId = 1;

export function createWorld(): World {
  return {
    w: W,
    h: H,
    chapter: 0,
    octo: {
      x: W / 2,
      y: FLOOR_Y - 30,
      vx: 0,
      vy: 0,
      size: CHAPTERS[0].octoSize,
      health: 100,
      maxHealth: 100,
      camo: 0,
      flash: 0,
      facing: 1,
      carrying: 0,
      invuln: 0,
      displaying: false,
    },
    creatures: [],
    target: { x: W / 2, y: FLOOR_Y - 30, active: false },
    keyX: 0,
    keyY: 0,
    ink: { x: 0, y: 0, t: 0, active: false },
    inkReadyAt: 0,
    age: 0,
    ageF: 0,
    stats: {
      ageReached: 0,
      predatorsEscaped: 0,
      preyCaught: 0,
      densBuilt: 0,
      eggsProtected: 0,
      inkUsed: 0,
    },
    goalProgress: 0,
    goalTarget: 1,
    chapterTime: 0,
    weakening: 0,
    shake: 0,
    den: { x: W - 120, y: FLOOR_Y - 24 },
    phase: "playing",
    endTime: 0,
    eggsLost: 0,
    huntingPredators: new Set(),
    mateSuccess: false,
    mateSuccessTime: 0,
    endAnimation: {
      phase: "fade",
      startTime: 0,
      fadeOpacity: 0,
      ascended: 0,
    },
  };
}

function makePredator(species: string, x: number, y: number): Creature {
  const sizes: Record<string, number> = {
    Fry: 7,
    Mackerel: 16,
    Tuna: 26,
    "Small shark": 34,
    "Moray eel": 30,
  };
  const speeds: Record<string, number> = {
    Fry: 98,
    Mackerel: 150,
    Tuna: 175,
    "Small shark": 165,
    "Moray eel": 120,
  };
  return {
    id: nextId++,
    kind: "predator",
    x,
    y,
    vx: 0,
    vy: 0,
    r: sizes[species] ?? 20,
    baseSpeed: speeds[species] ?? 140,
    behavior: "wander",
    // Fry actively swarm the hatchling chase, so they sense from much farther.
    detect: species === "Fry" ? 200 : (sizes[species] ?? 20) * 5 + 60,
    alive: true,
    hue: 205,
    wobble: rand(0, 6.28),
    dirX: Math.random() < 0.5 ? -1 : 1,
    stun: 0,
    tx: x,
    ty: y,
    species,
  };
}

function makePrey(species: string, x: number, y: number): Creature {
  const r = species === "Crab" ? 12 : 8;
  return {
    id: nextId++,
    kind: "prey",
    x,
    y,
    vx: 0,
    vy: 0,
    r,
    baseSpeed: species === "Crab" ? 55 : 110,
    behavior: "wander",
    detect: 120,
    alive: true,
    hue: species === "Crab" ? 12 : 28,
    wobble: rand(0, 6.28),
    dirX: Math.random() < 0.5 ? -1 : 1,
    stun: 0,
    tx: x,
    ty: y,
    species,
  };
}

/** A drifting sibling hatchling — fodder for the Hatchling chapter swarm. */
function makeSibling(x: number, y: number): Creature {
  return {
    id: nextId++,
    kind: "baby",
    x,
    y,
    vx: rand(-10, 10),
    vy: -rand(10, 30),
    r: 5 + Math.random() * 2,
    baseSpeed: 40,
    behavior: "wander",
    detect: 0,
    alive: true,
    hue: 200,
    wobble: rand(0, 6.28),
    dirX: 1,
    stun: 0,
    tx: x,
    ty: y,
    species: "Sibling",
  };
}

function spawnPredators(world: World, specs: [string, number][]) {
  for (const [species, count] of specs) {
    for (let i = 0; i < count; i++) {
      const onLeft = Math.random() < 0.5;
      const x = onLeft ? rand(-40, 60) : rand(W - 60, W + 40);
      const y = rand(SURFACE_Y + 30, FLOOR_Y - 30);
      world.creatures.push(makePredator(species, x, y));
    }
  }
}

/** (Re)build the world for a chapter. */
export function setupChapter(world: World, idx: number, now: number) {
  const def = CHAPTERS[idx];
  world.chapter = idx;
  world.creatures = [];
  world.chapterTime = 0;
  world.goalProgress = 0;
  world.weakening = 0;
  world.eggsLost = 0;
  world.age = def.age;
  world.ageF = def.age;
  world.octo.size = def.octoSize;
  world.octo.flash = 0;
  world.octo.carrying = 0;
  world.octo.invuln = 0;
  world.inkReadyAt = now;
  // Critical: clear run-end state so restarting a chapter actually resumes
  // play (otherwise stepWorld stays parked and only ink, which bypasses the
  // phase gate, responds).
  world.phase = "playing";
  world.shake = 0;
  world.octo.health = world.octo.maxHealth;
  world.octo.camo = 0;
  world.octo.displaying = false;
  world.huntingPredators.clear();
  world.mateSuccess = false;
  world.mateSuccessTime = 0;
  world.endAnimation = {
    phase: "fade",
    startTime: 0,
    fadeOpacity: 0,
    ascended: 0,
  };
  world.octo.vx = 0;
  world.octo.vy = 0;

  switch (idx) {
    case 0: // Hatchling — start at the bottom, drift up
      world.octo.x = W / 2 + rand(-40, 40);
      world.octo.y = FLOOR_Y - 24;
      world.octo.vx = 0;
      world.octo.vy = 0;
      world.goalTarget = 1;
      // An egg clutch on the floor and a swarm of sibling hatchlings making
      // the same desperate dash — "octopus D-Day". Most will be picked off.
      {
        const cx = W / 2;
        const cy = FLOOR_Y - 8;
        // Fry strung across the water column form a gauntlet the rising swarm
        // must cross, rather than starting off at the edges out of reach.
        const fryCount = 10;
        for (let i = 0; i < fryCount; i++) {
          const fx = 70 + (i / (fryCount - 1)) * (W - 140) + rand(-30, 30);
          const fy = rand(SURFACE_Y + 50, FLOOR_Y - 80);
          world.creatures.push(makePredator("Fry", fx, fy));
        }
        world.creatures.push({
          id: nextId++,
          kind: "egg",
          x: cx,
          y: cy - 4,
          vx: 0,
          vy: 0,
          r: 24,
          baseSpeed: 0,
          behavior: "hide",
          detect: 0,
          alive: true,
          hue: 40,
          wobble: 0,
          dirX: 1,
          stun: 0,
          tx: 0,
          ty: 0,
          species: "Eggs",
        });
        for (let i = 0; i < 26; i++) {
          world.creatures.push(
            makeSibling(cx + rand(-100, 100), cy - rand(0, 34))
          );
        }
      }
      break;
    case 1: // Descent — start near the surface, sink down
      world.octo.x = W / 2;
      world.octo.y = SURFACE_Y + 24;
      world.goalTarget = 1;
      spawnPredators(world, [
        ["Mackerel", 3],
        ["Tuna", 2],
        ["Small shark", 1],
      ]);
      break;
    case 2: // Hunter — eat prey
      world.octo.x = W / 2;
      world.octo.y = (SURFACE_Y + FLOOR_Y) / 2;
      world.goalTarget = 6;
      for (let i = 0; i < 5; i++)
        world.creatures.push(
          makePrey("Shrimp", rand(60, W - 60), rand(SURFACE_Y + 40, FLOOR_Y - 20))
        );
      for (let i = 0; i < 4; i++)
        world.creatures.push(
          makePrey("Crab", rand(60, W - 60), rand(FLOOR_Y - 60, FLOOR_Y - 12))
        );
      spawnPredators(world, [["Mackerel", 2]]);
      break;
    case 3: // Den — collect shells
      world.octo.x = W / 2;
      world.octo.y = (SURFACE_Y + FLOOR_Y) / 2;
      world.goalTarget = 3;
      world.den = { x: W - 120, y: FLOOR_Y - 22 };
      for (let i = 0; i < 5; i++) {
        const c = makePrey("Shell", rand(60, W - 200), rand(FLOOR_Y - 70, FLOOR_Y - 10));
        c.kind = "shell";
        c.r = 11;
        c.baseSpeed = 0;
        world.creatures.push(c);
      }
      spawnPredators(world, [
        ["Moray eel", 2],
        ["Small shark", 1],
      ]);
      break;
    case 4: // Courtship — find a mate
      world.octo.x = 90;
      world.octo.y = (SURFACE_Y + FLOOR_Y) / 2;
      world.goalTarget = 1;
      {
        const mate: Creature = {
          id: nextId++,
          kind: "mate",
          x: W - 110,
          y: (SURFACE_Y + FLOOR_Y) / 2 + rand(-40, 40),
          vx: 0,
          vy: 0,
          r: 24,
          baseSpeed: 26,
          behavior: "wander",
          detect: 0,
          alive: true,
          hue: 320,
          wobble: 0,
          dirX: -1,
          stun: 0,
          tx: W - 110,
          ty: 0,
          species: "Octopus",
        };
        world.creatures.push(mate);
      }
      spawnPredators(world, [["Tuna", 1]]);
      break;
    case 5: // Guardian — protect the eggs
      world.octo.x = world.den.x - 6;
      world.octo.y = world.den.y - 8;
      world.goalTarget = GUARDIAN_DURATION;
      {
        const eggs: Creature = {
          id: nextId++,
          kind: "egg",
          x: world.den.x,
          y: world.den.y - 6,
          vx: 0,
          vy: 0,
          r: 26,
          baseSpeed: 0,
          behavior: "hide",
          detect: 0,
          alive: true,
          hue: 40,
          wobble: 0,
          dirX: 1,
          stun: 0,
          tx: 0,
          ty: 0,
          species: "Eggs",
        };
        world.creatures.push(eggs);
      }
      spawnPredators(world, [
        ["Mackerel", 3],
        ["Moray eel", 2],
        ["Small shark", 1],
      ]);
      // Tempting prey drifting away from the nest — instinct says hunt, but
      // chasing it leaves the eggs undefended.
      for (let i = 0; i < 4; i++)
        world.creatures.push(
          makePrey(
            "Shrimp",
            rand(60, world.den.x - 180),
            rand(SURFACE_Y + 60, FLOOR_Y - 40)
          )
        );
      world.creatures.push(makePrey("Crab", rand(80, 260), FLOOR_Y - 20));
      break;
  }
}

/** Trigger an ink cloud if off cooldown. Returns true when it fired. */
export function tryInk(world: World, now: number): boolean {
  if (now < world.inkReadyAt) return false;
  world.inkReadyAt = now + INK_COOLDOWN_MS;
  world.ink = { x: world.octo.x, y: world.octo.y, t: now, active: true };
  world.stats.inkUsed++;
  // Speed burst.
  const sp = Math.hypot(world.octo.vx, world.octo.vy) || 1;
  world.octo.vx += (world.octo.vx / sp) * 160;
  world.octo.vy += (world.octo.vy / sp) * 160;
  // Stun & scatter nearby predators.
  for (const c of world.creatures) {
    if (c.kind !== "predator") continue;
    if (dist2(c.x, c.y, world.octo.x, world.octo.y) < INK_RADIUS * INK_RADIUS) {
      c.stun = now + 2600;
      c.behavior = "flee";
    }
  }
  return true;
}

function octoSpeed(o: Octopus) {
  return Math.hypot(o.vx, o.vy);
}

function stepOcto(world: World, dt: number) {
  const def = CHAPTERS[world.chapter];
  const o = world.octo;
  const slow = world.weakening; // 0..1 senescence
  // Senescence bites hard at the end of life: an aging octopus becomes
  // visibly sluggish and barely steerable.
  const maxSpeed = def.maxSpeed * (1 - slow * 0.82);
  const control = def.control * (1 - slow * 0.7);

  // Desired velocity from pointer target and/or keys.
  let dvx = 0;
  let dvy = 0;
  if (world.target.active) {
    const dx = world.target.x - o.x;
    const dy = world.target.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 4) {
      dvx = (dx / d) * maxSpeed;
      dvy = (dy / d) * maxSpeed;
    }
  }
  if (world.keyX !== 0 || world.keyY !== 0) {
    const d = Math.hypot(world.keyX, world.keyY) || 1;
    dvx = (world.keyX / d) * maxSpeed;
    dvy = (world.keyY / d) * maxSpeed;
  }

  // Steer toward desired velocity; control alone governs responsiveness, so
  // the jump from a barely-steerable hatchling to a deliberate adult is felt.
  const k = Math.min(1, control * 6 * dt);
  o.vx += (dvx - o.vx) * k;
  o.vy += (dvy - o.vy) * k;

  // Buoyancy / drift.
  o.vy += def.buoyancy * dt;
  // Water drag.
  o.vx *= 1 - Math.min(1, 1.6 * dt);
  o.vy *= 1 - Math.min(1, 1.6 * dt);

  o.x = clamp(o.x + o.vx * dt, 16, W - 16);
  o.y = clamp(o.y + o.vy * dt, SURFACE_Y - 6, FLOOR_Y);
  if (Math.abs(o.vx) > 6) o.facing = o.vx > 0 ? 1 : -1;

  // Camouflage: strongest when pressed against the seafloor OR near environmental
  // features (rocks, coral, seaweed). Holding still makes you nearly indistinguishable.
  // SKIP during end animation - we force camo to 1 for the death sequence
  if (!(world.chapter === 5 && world.chapterTime >= world.goalTarget)) {
    const floorFactor = clamp(1 - (FLOOR_Y - o.y) / 70, 0, 1);
    // Environmental cover from biodiversity (rocks, coral, seaweed)
    const coverFactor = getCoverFactor(o.x, o.y) * 0.85; // Slightly less effective than floor
    // Combine floor and cover - take the best of both
    const locationFactor = Math.max(floorFactor, coverFactor);
    const sp = octoSpeed(o);
    const stillFactor = sp < 36 ? 1 : 0.45;
    const camoTarget = locationFactor * stillFactor;
    const prevCamo = o.camo;
    const rate = camoTarget > o.camo ? 3.2 : 5;
    o.camo = clamp(o.camo + (camoTarget - o.camo) * Math.min(1, rate * dt), 0, 1);

    // Speed bonus when emerging from camouflage - the element of surprise!
    if (o.camo < prevCamo && prevCamo > 0.5) {
      const burst = (prevCamo - o.camo) * 320;
      if (Math.abs(o.vx) > 1 || Math.abs(o.vy) > 1) {
        const spf = Math.hypot(o.vx, o.vy) || 1;
        o.vx += (o.vx / spf) * burst;
        o.vy += (o.vy / spf) * burst;
      }
    }
  }

  // Automatic displaying for courtship - happens automatically when near mate
  if (world.chapter === 4 && !world.mateSuccess) {
    const mate = world.creatures.find((c) => c.kind === "mate");
    if (mate) {
      const distToMate = Math.sqrt(dist2(o.x, o.y, mate.x, mate.y));
      // Auto-display when within 100px of mate
      o.displaying = distToMate < 100;
    } else {
      o.displaying = false;
    }
  } else {
    o.displaying = false;
  }

  if (o.invuln > 0) o.invuln = Math.max(0, o.invuln - dt);
}

function effectiveDetect(c: Creature, world: World) {
  // Camouflage shortens how far creatures can sense the octopus.
  return c.detect * (1 - world.octo.camo * 0.82);
}

function steer(c: Creature, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy) || 1;
  const dvx = (dx / d) * speed;
  const dvy = (dy / d) * speed;
  c.vx += (dvx - c.vx) * Math.min(1, dt * 3.2);
  c.vy += (dvy - c.vy) * Math.min(1, dt * 3.2);
}

function wander(c: Creature, dt: number) {
  if (dist2(c.x, c.y, c.tx, c.ty) < 900 || Math.random() < dt * 0.4) {
    c.tx = clamp(c.x + rand(-220, 220), 30, W - 30);
    c.ty = clamp(c.y + rand(-140, 140), SURFACE_Y + 20, FLOOR_Y - 8);
  }
  steer(c, c.tx, c.ty, c.baseSpeed * 0.5, dt);
}

/** Resolve a predator biting the player when overlapping (knockback + stun). */
function bitePlayer(c: Creature, world: World, now: number, ev: FrameEvents) {
  const o = world.octo;
  if (o.invuln > 0) return;
  if (dist2(c.x, c.y, o.x, o.y) >= (c.r + o.size) * (c.r + o.size)) return;
  o.health -= 14 + c.r * 0.4;
  o.invuln = 1.1;
  o.camo = 0;
  world.shake = 10;
  ev.hurt = true;
  const a = Math.atan2(o.y - c.y, o.x - c.x);
  o.vx += Math.cos(a) * 220;
  o.vy += Math.sin(a) * 220;
  c.tx = c.x - Math.cos(a) * 200;
  c.ty = c.y - Math.sin(a) * 200;
  c.stun = now + 600;
}

/**
 * Hatchling-chapter predator behaviour: fry swarm every drifting hatchling,
 * siblings and player alike, chasing whichever is nearest.
 */
function huntHatchlings(
  c: Creature,
  world: World,
  dt: number,
  now: number,
  ev: FrameEvents
) {
  const o = world.octo;
  let best: Creature | null = null;
  let bd = Infinity;
  for (const b of world.creatures) {
    if (b.kind !== "baby" || !b.alive) continue;
    const d = dist2(c.x, c.y, b.x, b.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  const pd = dist2(c.x, c.y, o.x, o.y);
  const pDetect = effectiveDetect(c, world);
  const babyInRange = best !== null && bd < c.detect * c.detect;
  const playerInRange = pd < pDetect * pDetect;

  if (babyInRange && (!playerInRange || bd <= pd)) {
    c.behavior = "hunt";
    steer(c, best!.x, best!.y, c.baseSpeed, dt);
    if (bd < (c.r + best!.r) * (c.r + best!.r)) {
      best!.alive = false;
      ev.siblingEaten = true;
    }
  } else if (playerInRange) {
    c.behavior = "hunt";
    steer(c, o.x, o.y, c.baseSpeed, dt);
    bitePlayer(c, world, now, ev);
  } else {
    c.behavior = "wander";
    wander(c, dt);
  }
}

function stepCreature(c: Creature, world: World, dt: number, now: number, ev: FrameEvents) {
  if (!c.alive) return;
  c.wobble += dt * 6;
  const o = world.octo;
  const stunned = now < c.stun;

  if (c.kind === "predator") {
    // During mate success animation, predators just wander peacefully
    if (world.mateSuccess) {
      c.behavior = "wander";
      wander(c, dt);
      return;
    }

    if (stunned) {
      // Flee the ink cloud - counts as escape if was hunting
      if (world.huntingPredators.has(c.id)) {
        world.huntingPredators.delete(c.id);
        world.stats.predatorsEscaped++;
        ev.escaped = true;
      }
      if (world.ink.active)
        steer(c, c.x - (world.ink.x - c.x), c.y - (world.ink.y - c.y), c.baseSpeed, dt);
      else wander(c, dt);
    } else {
      // In the guardian chapter, predators target the eggs unless the
      // octopus is close (it scares them off).
      const eggs =
        world.chapter === 5 ? world.creatures.find((e) => e.kind === "egg") : null;
      const distToOcto = Math.sqrt(dist2(c.x, c.y, o.x, o.y));
      const octoNear = distToOcto < o.size * 4 + 60;

      if (world.chapter === 0) {
        huntHatchlings(c, world, dt, now, ev);
      } else if (eggs && !octoNear) {
        c.behavior = "hunt";
        steer(c, eggs.x, eggs.y, c.baseSpeed, dt);
        if (dist2(c.x, c.y, eggs.x, eggs.y) < (c.r + eggs.r) * (c.r + eggs.r)) {
          // A successful raid: eggs are lost, then the intruder darts off
          // (stunned, so it can't keep nibbling the same approach).
          world.eggsLost += 110;
          world.shake = Math.max(world.shake, 9);
          c.stun = now + 1200;
          c.tx = c.x - c.dirX * 220;
          c.ty = c.y + rand(-60, 60);
        }
      } else if (eggs && octoNear) {
        // Driven off by the guardian.
        if (world.huntingPredators.has(c.id)) {
          world.huntingPredators.delete(c.id);
          world.stats.predatorsEscaped++;
          ev.escaped = true;
        }
        c.behavior = "flee";
        steer(c, c.x + (c.x - o.x), c.y + (c.y - o.y), c.baseSpeed, dt);
        if (distToOcto > o.size * 4 + 120) c.behavior = "wander";
      } else if (distToOcto < effectiveDetect(c, world)) {
        // Start hunting - add to tracking set
        world.huntingPredators.add(c.id);
        c.behavior = "hunt";
        steer(c, o.x, o.y, c.baseSpeed, dt);
        bitePlayer(c, world, now, ev);
      } else {
        // Lost sight of target - count as escape if was hunting
        if (world.huntingPredators.has(c.id)) {
          world.huntingPredators.delete(c.id);
          world.stats.predatorsEscaped++;
          ev.escaped = true;
        }
        c.behavior = "wander";
        wander(c, dt);
      }
    }
  } else if (c.kind === "prey") {
    const d = Math.sqrt(dist2(c.x, c.y, o.x, o.y));
    if (d < c.detect * (1 - world.octo.camo)) {
      c.behavior = "flee";
      steer(c, c.x + (c.x - o.x), c.y + (c.y - o.y), c.baseSpeed, dt);
    } else {
      c.behavior = "wander";
      wander(c, dt);
    }
    // Crabs stay near the floor.
    if (c.species === "Crab") c.ty = clamp(c.ty, FLOOR_Y - 64, FLOOR_Y - 8);
  } else if (c.kind === "mate") {
    // Gentle hover; sway in place.
    c.x = c.tx + Math.sin(c.wobble * 0.4) * 10;
    c.y += Math.sin(c.wobble * 0.6) * dt * 14;
  } else if (c.kind === "baby") {
    // Sibling hatchlings rise with the current, scatter a little, and bolt
    // from any fry that gets close — though most are doomed.
    c.vy += -34 * dt;
    if (Math.random() < dt * 0.7) c.tx = clamp(c.x + rand(-70, 70), 12, W - 12);
    c.vx += (c.tx - c.x - c.vx) * Math.min(1, dt * 1.5);
    let near: Creature | null = null;
    let nd = Infinity;
    for (const p of world.creatures) {
      if (p.kind !== "predator") continue;
      const d = dist2(c.x, c.y, p.x, p.y);
      if (d < nd) {
        nd = d;
        near = p;
      }
    }
    if (near && nd < 80 * 80) {
      c.vx += (c.x - near.x) * dt * 3;
      c.vy += (c.y - near.y) * dt * 3;
    }
    c.vx *= 1 - Math.min(1, 1.4 * dt);
    c.vy *= 1 - Math.min(1, 1.4 * dt);
    c.x = clamp(c.x + c.vx * dt, 8, W - 8);
    c.y = clamp(c.y + c.vy * dt, SURFACE_Y - 4, FLOOR_Y);
    if (Math.abs(c.vx) > 4) c.dirX = c.vx > 0 ? 1 : -1;
    // Reached the surface currents — this sibling made it to safety.
    if (c.y <= SURFACE_Y + 6) c.alive = false;
  }

  if (c.kind === "predator" || c.kind === "prey") {
    c.x = clamp(c.x + c.vx * dt, -50, W + 50);
    c.y = clamp(c.y + c.vy * dt, SURFACE_Y + 8, FLOOR_Y);
    if (Math.abs(c.vx) > 4) c.dirX = c.vx > 0 ? 1 : -1;
  }
}

/** Advance the whole world one tick. */
export function stepWorld(world: World, dt: number, now: number): FrameEvents {
  const ev: FrameEvents = {
    ate: false,
    hurt: false,
    escaped: false,
    inked: false,
    pickup: false,
    heart: false,
    chapterComplete: false,
    died: false,
    siblingEaten: false,
  };
  if (world.phase !== "playing") return ev;

  world.chapterTime += dt;
  // Age is driven by the life stage (in months), not a wall clock — a whole
  // octopus life is only ~12 months, so per-second drift would be meaningless.
  world.age = CHAPTERS[world.chapter].age;
  world.shake = Math.max(0, world.shake - dt * 30);
  if (world.ink.active && now - world.ink.t > 1800) world.ink.active = false;

  stepOcto(world, dt);
  for (const c of world.creatures) stepCreature(c, world, dt, now, ev);

  // Chapter-specific interactions & goal tracking.
  const o = world.octo;
  switch (world.chapter) {
    case 0: // reach surface
      world.goalProgress = clamp(
        (FLOOR_Y - o.y) / (FLOOR_Y - (SURFACE_Y + 10)),
        0,
        1
      );
      if (o.y <= SURFACE_Y + 10) ev.chapterComplete = true;
      break;
    case 1: // reach floor
      world.goalProgress = clamp(
        (o.y - SURFACE_Y) / (FLOOR_Y - 10 - SURFACE_Y),
        0,
        1
      );
      if (o.y >= FLOOR_Y - 10) ev.chapterComplete = true;
      break;
    case 2: // eat prey
      for (const c of world.creatures) {
        if (c.kind !== "prey" || !c.alive) continue;
        if (dist2(c.x, c.y, o.x, o.y) < (c.r + o.size) * (c.r + o.size)) {
          c.alive = false;
          world.stats.preyCaught++;
          world.goalProgress++;
          o.health = Math.min(o.maxHealth, o.health + 6);
          ev.ate = true;
        }
      }
      if (world.goalProgress >= world.goalTarget) ev.chapterComplete = true;
      break;
    case 3: // collect shells -> den
      for (const c of world.creatures) {
        if (c.kind !== "shell" || !c.alive) continue;
        if (
          o.carrying === 0 &&
          dist2(c.x, c.y, o.x, o.y) < (c.r + o.size) * (c.r + o.size)
        ) {
          c.alive = false;
          o.carrying = 1;
          ev.pickup = true;
        }
      }
      if (
        o.carrying > 0 &&
        dist2(o.x, o.y, world.den.x, world.den.y) < 46 * 46
      ) {
        o.carrying = 0;
        world.goalProgress++;
        ev.pickup = true;
      }
      if (world.goalProgress >= world.goalTarget) {
        world.stats.densBuilt = 1;
        ev.chapterComplete = true;
      }
      break;
    case 4: // courtship
      {
        const mate = world.creatures.find((c) => c.kind === "mate");
        if (mate) {
          const near = dist2(o.x, o.y, mate.x, mate.y) < 90 * 90;
          // Once mateSuccess is triggered, lock progress at 1 until chapter completes
          if (!world.mateSuccess) {
            if (near && o.flash > 0.15) {
              world.goalProgress = clamp(
                world.goalProgress + dt * (0.18 + o.flash * 0.5),
                0,
                1
              );
            } else {
              world.goalProgress = clamp(world.goalProgress - dt * 0.12, 0, 1);
            }
          }
          if (world.goalProgress >= 1) {
            ev.heart = true;
            // Trigger mate success animation - predators stop, heart shows
            if (!world.mateSuccess) {
              world.mateSuccess = true;
              world.mateSuccessTime = now;
            }
          }
          // Complete chapter after short animation delay
          if (world.mateSuccess && now - world.mateSuccessTime > 2500) {
            ev.chapterComplete = true;
          }
        }
      }
      break;
    case 5: // guardian
      world.weakening = clamp(world.chapterTime / world.goalTarget, 0, 1);
      // Continuous progress: the bar fills steadily across the whole guard
      // duration, and the eggs hatch exactly when it tops out.
      world.goalProgress = world.chapterTime;
      // The tempting prey is a trap — you can still snap one up for a sliver
      // of vigor, but every second away is a second the nest is exposed.
      for (const c of world.creatures) {
        if (c.kind !== "prey" || !c.alive) continue;
        if (dist2(c.x, c.y, o.x, o.y) < (c.r + o.size) * (c.r + o.size)) {
          c.alive = false;
          world.stats.preyCaught++;
          o.health = Math.min(o.maxHealth, o.health + 8);
          ev.ate = true;
        }
      }
      world.stats.eggsProtected = Math.max(0, 2000 - world.eggsLost);
      // A steady decline you cannot stop, no matter how well you guard.
      o.health = Math.max(1, o.health - dt * 2.2);

      // End animation: when eggs hatch, trigger death/ascension sequence
      if (world.chapterTime >= world.goalTarget) {
        // Check if all eggs are lost - you lose the level and must retry
        if (world.eggsLost >= 2000) {
          world.phase = "dead";
          ev.died = true;
          break;
        }

        if (world.endAnimation.phase === "fade") {
          // Start the end animation
          if (world.endAnimation.startTime === 0) {
            world.endAnimation.startTime = now;
            // Remove all predators
            world.creatures = world.creatures.filter((c) => c.kind !== "predator");
          }

          const elapsed = now - world.endAnimation.startTime;
          const fadeDuration = 3000; // 3 seconds to fade to black
          world.endAnimation.fadeOpacity = clamp(elapsed / fadeDuration, 0, 1);

          // Move octopus to center during fade (slower, gentler movement)
          const centerX = W / 2;
          const centerY = (SURFACE_Y + FLOOR_Y) / 2;
          o.x += (centerX - o.x) * Math.min(1, dt * 1.5);
          o.y += (centerY - o.y) * Math.min(1, dt * 1.5);

          // FORCE color drain - directly set to near 1
          o.camo = Math.min(1, o.camo + dt * 1.2);

          // Transition to ascend phase when mostly faded (ignore camo requirement)
          if (world.endAnimation.fadeOpacity >= 0.85) {
            world.endAnimation.phase = "ascend";
            world.endAnimation.ascended = 0;
            // Ensure camo is fully drained
            o.camo = 1;
            // Reset position to bottom for ascent start
            o.x = W / 2;
            o.y = FLOOR_Y;
            o.vx = 0;
            o.vy = 0;
          }
        } else if (world.endAnimation.phase === "ascend") {
          // Single ascent from bottom to middle, then transition to heaven while staying in middle

          // Progress from 0 to 1 over 4 seconds
          const ascentDuration = 4000;
          world.endAnimation.ascended = Math.min(1, (now - world.endAnimation.startTime - 3000) / ascentDuration);
          const progress = world.endAnimation.ascended;

          o.x = W / 2;

          if (progress < 0.6) {
            // First 60%: move from bottom to middle
            const p = progress / 0.6;
            o.y = lerp(FLOOR_Y, H / 2, p);
          } else {
            // Last 40%: stay in middle while heaven background fades in
            o.y = H / 2;
          }

          // Transition to heaven phase at end
          if (progress >= 1) {
            world.endAnimation.phase = "heaven";
            o.x = W / 2;
            o.y = H / 2;
            ev.chapterComplete = true;
          }
        }
      }
      break;
  }

  // Display charge decays unless actively holding (set by page input).
  o.flash = clamp(o.flash - dt * 0.7, 0, 1);

  world.stats.ageReached = world.age;

  if (o.health <= 0 && world.chapter !== 5) {
    world.phase = "dead";
    ev.died = true;
  }
  return ev;
}

/** Background colour at a depth, used by both rendering and camouflage. */
export function bgColorAt(world: World, y: number): [number, number, number] {
  const def = CHAPTERS[world.chapter];
  const t = clamp((y - SURFACE_Y) / (FLOOR_Y - SURFACE_Y), 0, 1);
  return [
    Math.round(lerp(def.topColor[0], def.bottomColor[0], t)),
    Math.round(lerp(def.topColor[1], def.bottomColor[1], t)),
    Math.round(lerp(def.topColor[2], def.bottomColor[2], t)),
  ];
}
