/**
 * Canonical-space duel simulation for Slug Fencing.
 *
 * The engine knows nothing about React, handedness, sound, or networking. It
 * operates on two abstract fencers — `p1` and `p2` — purely in terms of their
 * vertical position, energy, and lunge timing. Crucially, HIT DETECTION DEPENDS
 * ONLY ON VERTICAL ALIGNMENT AND LUNGE TIMING, never on absolute x. That makes
 * which side a slug renders on a pure view concern (see view layer), so each
 * player can sit on their own dominant-hand side without affecting the sim.
 *
 * The same engine drives:
 *  - solo play (one fencer is steered by `stepAi`),
 *  - multiplayer (host steers `p1` from local input, `p2` from polled guest
 *    input, and resolves hits authoritatively).
 */

/* --- Arena geometry (SVG viewBox units) --- */
export const VW = 640;
export const VH = 380;
export const TOP_Y = 72;
export const BOTTOM_Y = 312;
export const LEFT_X = 150;
export const RIGHT_X = 490;
export const MID_X = (LEFT_X + RIGHT_X) / 2;
/** How far a lunge thrusts the head toward the rival, in viewBox units. */
export const LUNGE_REACH = 260;
/** Vertical alignment window for a lunge to count as a hit. */
export const HIT_Y_TOL = 34;

/* --- Lunge timing --- */
export const LUNGE_MS = 360;
/** Fraction of the lunge at which contact is evaluated (the thrust apex). */
export const HIT_AT = 0.46;
/** Minimum gap between lunges — "you can only lunge every so often". */
export const LUNGE_COOLDOWN_MS = 450;

/* --- Energy economy --- */
export const ENERGY_MAX = 100;
export const ENERGY_REGEN = 26; // per second
export const LUNGE_COST = 30;
export const MOVE_COST_PER_UNIT = 0.05; // energy per viewBox unit travelled
export const MOVE_SPEED = 380; // max vertical units per second

export const MID_Y = (TOP_Y + BOTTOM_Y) / 2;

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export interface Fencer {
  y: number;
  targetY: number;
  energy: number;
  lungeStart: number; // performance.now() of active lunge, 0 = idle
  lastLungeEnd: number; // for cooldown
  hitResolved: boolean; // contact already evaluated for current lunge
}

export function makeFencer(y: number = MID_Y): Fencer {
  return {
    y,
    targetY: y,
    energy: ENERGY_MAX,
    lungeStart: 0,
    lastLungeEnd: 0,
    hitResolved: true,
  };
}

/** Eased out-and-back thrust offset for a lunge in progress (0..reach..0). */
export function lungeOffset(now: number, start: number): number {
  if (start === 0) return 0;
  const t = (now - start) / LUNGE_MS;
  if (t >= 1) return 0;
  return Math.sin(t * Math.PI) * LUNGE_REACH;
}

/** Move a fencer toward its target, spending energy, then regen the rest. */
export function applyMovement(f: Fencer, dt: number): void {
  const desired = f.targetY - f.y;
  const maxStep = MOVE_SPEED * dt;
  let step = clamp(desired, -maxStep, maxStep);
  const cost = Math.abs(step) * MOVE_COST_PER_UNIT;
  if (cost > f.energy) {
    // Not enough juice to cover the full move — travel only what we can.
    const afford = f.energy / MOVE_COST_PER_UNIT;
    step = Math.sign(step) * afford;
    f.energy = 0;
  } else {
    f.energy -= cost;
  }
  f.y = clamp(f.y + step, TOP_Y, BOTTOM_Y);
  f.energy = Math.min(ENERGY_MAX, f.energy + ENERGY_REGEN * dt);
}

/** Attempt to start a lunge for the given fencer; returns true if launched. */
export function tryLunge(f: Fencer, now: number): boolean {
  if (f.lungeStart !== 0) return false; // already lunging
  if (now - f.lastLungeEnd < LUNGE_COOLDOWN_MS) return false;
  if (f.energy < LUNGE_COST) return false;
  f.energy -= LUNGE_COST;
  f.lungeStart = now;
  f.hitResolved = false;
  return true;
}

/** Retire a finished lunge so cooldown can begin. */
export function advanceLungeLifecycle(f: Fencer, now: number): void {
  if (f.lungeStart !== 0 && now - f.lungeStart >= LUNGE_MS) {
    f.lungeStart = 0;
    f.lastLungeEnd = now;
  }
}

/** AI personality knobs; presets live in personalities.ts. */
export interface AiTuning {
  /** Min/max ms between target rethinks. */
  thinkMin: number;
  thinkMax: number;
  /** Min/max ms cooldown the AI imposes on itself after a lunge. */
  lungeGapMin: number;
  lungeGapMax: number;
  /** Probability it actually lunges when aligned. */
  lungeChance: number;
  /** How tightly it must be aligned (multiplier on HIT_Y_TOL) to fire. */
  alignMult: number;
  /** Chance per rethink that it shadows the player (vs. juke/dodge). */
  shadowChance: number;
  /** Max move speed as a fraction of MOVE_SPEED (slower = easier). */
  speedScale: number;
}

export interface AiState {
  nextThink: number;
  nextLunge: number;
}

export function makeAiState(): AiState {
  return { nextThink: 0, nextLunge: 0 };
}

/**
 * Steer an AI-controlled fencer toward (or away from) its foe and lunge when
 * lined up. Self-contained: handles target decisions, movement, lunging, and
 * lunge lifecycle. Returns true if it launched a lunge this tick (for sound).
 */
export function stepAi(
  f: Fencer,
  foe: Fencer,
  dt: number,
  now: number,
  ai: AiState,
  tuning: AiTuning
): boolean {
  if (now >= ai.nextThink) {
    ai.nextThink =
      now + tuning.thinkMin + Math.random() * (tuning.thinkMax - tuning.thinkMin);
    const roll = Math.random();
    if (roll < tuning.shadowChance) {
      f.targetY = clamp(foe.y + (Math.random() * 50 - 25), TOP_Y, BOTTOM_Y);
    } else if (roll < tuning.shadowChance + 0.25) {
      f.targetY = TOP_Y + Math.random() * (BOTTOM_Y - TOP_Y);
    } else {
      f.targetY =
        foe.y > MID_Y
          ? TOP_Y + Math.random() * 70
          : BOTTOM_Y - Math.random() * 70;
    }
  }

  // Movement, scaled by personality speed (easy slugs are sluggish).
  const desired = f.targetY - f.y;
  const maxStep = MOVE_SPEED * tuning.speedScale * dt;
  let step = clamp(desired, -maxStep, maxStep);
  const moveCost = Math.abs(step) * MOVE_COST_PER_UNIT;
  if (moveCost > f.energy) {
    step = Math.sign(step) * (f.energy / MOVE_COST_PER_UNIT);
    f.energy = 0;
  } else {
    f.energy -= moveCost;
  }
  f.y = clamp(f.y + step, TOP_Y, BOTTOM_Y);
  f.energy = Math.min(ENERGY_MAX, f.energy + ENERGY_REGEN * dt);

  let launched = false;
  if (
    now >= ai.nextLunge &&
    f.lungeStart === 0 &&
    f.energy > LUNGE_COST + 25
  ) {
    const aligned = Math.abs(f.y - foe.y) <= HIT_Y_TOL * tuning.alignMult;
    if (aligned && Math.random() < tuning.lungeChance && tryLunge(f, now)) {
      ai.nextLunge =
        now +
        tuning.lungeGapMin +
        Math.random() * (tuning.lungeGapMax - tuning.lungeGapMin);
      launched = true;
    }
  }
  advanceLungeLifecycle(f, now);
  return launched;
}

export type LungeOutcome = "hit" | "miss" | null;

export interface ResolveResult {
  p1: LungeOutcome;
  p2: LungeOutcome;
}

/**
 * Evaluate contact for any lunge that has reached its apex. Mutates each
 * fencer's `hitResolved`. Returns the per-fencer outcome for this tick so the
 * caller can update scores, play sound, and flash impacts.
 */
export function resolveLunges(p1: Fencer, p2: Fencer, now: number): ResolveResult {
  const apex = (f: Fencer) =>
    f.lungeStart !== 0 &&
    !f.hitResolved &&
    (now - f.lungeStart) / LUNGE_MS >= HIT_AT;

  const result: ResolveResult = { p1: null, p2: null };

  if (apex(p1)) {
    p1.hitResolved = true;
    result.p1 = Math.abs(p1.y - p2.y) <= HIT_Y_TOL ? "hit" : "miss";
  }
  if (apex(p2)) {
    p2.hitResolved = true;
    result.p2 = Math.abs(p2.y - p1.y) <= HIT_Y_TOL ? "hit" : "miss";
  }
  return result;
}
