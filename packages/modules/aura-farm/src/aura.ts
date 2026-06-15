/**
 * Aura Farm — the color-theory brain.
 *
 * Everything the player does collapses into two inputs: a RYB color mix
 * (Red / Yellow / Blue, the painterly primaries the user actually learns) and
 * a set of "care affinities" (how the blob was raised). This module is pure:
 * it turns those numbers into a concrete aura — a hue family, warm/cool
 * temperament, a name, a blurb, a color, and the dance the goblin performs.
 *
 * The color theory is encoded as data, not taught explicitly:
 *   - Primaries:   Red, Yellow, Blue
 *   - Secondaries: Orange (R+Y), Green (Y+B), Purple/Violet (R+B)
 *   - Warm half of the wheel grows faster & dances harder; cool half is smoother.
 *   - A near-equal mix is "balanced" → the rare Rainbow aura.
 * Care actions bend the outcome so identical mixes can diverge — that swerve is
 * where the shareable "I accidentally made a Tax Fraud Aura" moments come from.
 */

export type Channel = "r" | "y" | "b";

export interface Mix {
  r: number;
  y: number;
  b: number;
}

export interface Care {
  feed: number;
  rest: number;
  sun: number;
  music: number;
  story: number;
  chaos: number;
}

export type DanceId =
  | "sway"
  | "jump"
  | "floss"
  | "seaLion"
  | "worm"
  | "breakdance"
  | "moonwalk"
  | "tRex"
  | "narutoRun"
  | "disco"
  | "wizard"
  | "hippie"
  | "heroPose"
  | "gremlin"
  | "sigma"
  | "headbang";

export type Rarity = "common" | "rare" | "legendary";

export interface AuraDef {
  id: string;
  name: string;
  emoji: string;
  dance: DanceId;
  /** Human-readable name of the dance, for captions. */
  danceName: string;
  rarity: Rarity;
  /** Short flavor line shown on the harvest reveal. */
  blurb: string;
  /** The sneaky color-theory note — what the player just learned. */
  lesson: string;
}

/* ------------------------------------------------------------------ *
 * Color math (RYB)
 * ------------------------------------------------------------------ */

export const emptyMix = (): Mix => ({ r: 0, y: 0, b: 0 });
export const emptyCare = (): Care => ({
  feed: 0,
  rest: 0,
  sun: 0,
  music: 0,
  story: 0,
  chaos: 0,
});

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Total drops in the mix. */
export function mixTotal(m: Mix): number {
  return m.r + m.y + m.b;
}

/** Normalized proportions; falls back to a neutral grey when empty. */
export function proportions(m: Mix): { pr: number; py: number; pb: number } {
  const t = mixTotal(m);
  if (t <= 0) return { pr: 1 / 3, py: 1 / 3, pb: 1 / 3 };
  return { pr: m.r / t, py: m.y / t, pb: m.b / t };
}

/**
 * Hue angle (0..360) on the RYB wheel, plus saturation (0..1, how far from a
 * balanced grey). Red sits at 0°, Yellow at 120°, Blue at 240°; the secondary
 * mixes land between them (orange ~60°, green ~180°, purple ~300°).
 */
export function hueSat(m: Mix): { hue: number; sat: number } {
  const { pr, py, pb } = proportions(m);
  // Three unit vectors 120° apart, weighted by each primary's share.
  const ar = 0;
  const ay = (2 * Math.PI) / 3;
  const ab = (4 * Math.PI) / 3;
  const x = pr * Math.cos(ar) + py * Math.cos(ay) + pb * Math.cos(ab);
  const y = pr * Math.sin(ar) + py * Math.sin(ay) + pb * Math.sin(ab);
  let hue = (Math.atan2(y, x) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  // Magnitude maxes at ~0.666 when one primary dominates fully.
  const sat = clamp01(Math.hypot(x, y) / 0.6667);
  return { hue, sat };
}

/**
 * Warmth in -1..1. Peaks warm at orange (hue 60°) and peaks cool at blue
 * (hue 240°) — the classic warm/cool split of the color wheel.
 */
export function warmth(hue: number): number {
  return Math.cos(((hue - 60) * Math.PI) / 180);
}

/** Six-way hue family for naming the base auras. */
export type HueFamily =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export function hueFamily(hue: number): HueFamily {
  if (hue < 30 || hue >= 330) return "red";
  if (hue < 90) return "orange";
  if (hue < 150) return "yellow";
  if (hue < 210) return "green";
  if (hue < 270) return "blue";
  return "purple";
}

/* ------------------------------------------------------------------ *
 * RYB → RGB (for rendering the orb / goblin tint)
 * ------------------------------------------------------------------ */

type RGB = [number, number, number];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Trilinear RYB→RGB cube (Gosset & Chen). Corners are the RGB values for each
// RYB combination; we interpolate by the (normalized) primary amounts.
const RYB_CUBE: RGB[] = [
  [255, 255, 255], // 000 white
  [0, 0, 255], // 001 blue
  [255, 255, 0], // 010 yellow
  [0, 169, 51], // 011 green
  [255, 0, 0], // 100 red
  [129, 26, 184], // 101 purple
  [255, 153, 0], // 110 orange
  [53, 21, 6], // 111 dark brown
];

/** Convert a mix to a CSS rgb() string. Heavier mixes read as more saturated. */
export function mixToRgb(m: Mix): RGB {
  const { pr, py, pb } = proportions(m);
  const c000 = RYB_CUBE[0];
  const c001 = RYB_CUBE[1];
  const c010 = RYB_CUBE[2];
  const c011 = RYB_CUBE[3];
  const c100 = RYB_CUBE[4];
  const c101 = RYB_CUBE[5];
  const c110 = RYB_CUBE[6];
  const c111 = RYB_CUBE[7];
  const out: RGB = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const x0 = lerp(lerp(c000[i], c100[i], pr), lerp(c010[i], c110[i], pr), py);
    const x1 = lerp(lerp(c001[i], c101[i], pr), lerp(c011[i], c111[i], pr), py);
    out[i] = Math.round(lerp(x0, x1, pb));
  }
  return out;
}

export function rgbStr(c: RGB, a = 1): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}

/** Perceived brightness 0..1. */
export function brightness(c: RGB): number {
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
}

/* ------------------------------------------------------------------ *
 * Aura catalog
 * ------------------------------------------------------------------ */

export const AURAS: Record<string, AuraDef> = {
  // --- base hue auras (common) ---
  inferno: {
    id: "inferno",
    name: "Inferno Aura",
    emoji: "🔥",
    dance: "headbang",
    danceName: "Goblin Headbang",
    rarity: "common",
    blurb: "Pure red passion. The goblin is FIRED UP and has feelings about it.",
    lesson: "Red is a primary — warm, loud, impossible to ignore.",
  },
  hero: {
    id: "hero",
    name: "Hero Aura",
    emoji: "🦸",
    dance: "heroPose",
    danceName: "Overconfident Hero Pose",
    rarity: "common",
    blurb: "Red + Yellow confidence. Believes it could absolutely fight a bear.",
    lesson: "Orange is a SECONDARY — red mixed with yellow.",
  },
  sunbeam: {
    id: "sunbeam",
    name: "Sunbeam Aura",
    emoji: "☀️",
    dance: "jump",
    danceName: "Pure Joy Jumping",
    rarity: "common",
    blurb: "Yellow joy, no notes. Cannot stop bouncing.",
    lesson: "Yellow is a primary — the brightest, happiest hue on the wheel.",
  },
  forest: {
    id: "forest",
    name: "Forest Aura",
    emoji: "🌿",
    dance: "hippie",
    danceName: "Tree-Hugging Hippie Sway",
    rarity: "common",
    blurb: "Yellow + Blue serenity. Wants to hug everything, especially trees.",
    lesson: "Green is a SECONDARY — yellow mixed with blue.",
  },
  ocean: {
    id: "ocean",
    name: "Ocean Aura",
    emoji: "🌊",
    dance: "sway",
    danceName: "Smooth Tidal Sway",
    rarity: "common",
    blurb: "Blue calm. Moves like it's underwater and in no hurry.",
    lesson: "Blue is a primary — cool, calm, the slow side of the wheel.",
  },
  mystic: {
    id: "mystic",
    name: "Mystic Aura",
    emoji: "🔮",
    dance: "wizard",
    danceName: "Arcane Wizard Casting",
    rarity: "common",
    blurb: "Red + Blue mystery. Definitely casting something.",
    lesson: "Purple is a SECONDARY — red mixed with blue.",
  },
  // --- balanced (legendary) ---
  rainbow: {
    id: "rainbow",
    name: "Rainbow Aura",
    emoji: "🌈",
    dance: "floss",
    danceName: "The Floss",
    rarity: "legendary",
    blurb: "Perfect balance of all three primaries. Naturally, it flosses.",
    lesson: "Equal red + yellow + blue cancels into neutral — true balance is rare.",
  },
  // --- care-driven specials ---
  disco: {
    id: "disco",
    name: "Disco Aura",
    emoji: "🪩",
    dance: "disco",
    danceName: "Saturday Night Goblin",
    rarity: "rare",
    blurb: "Raised on nothing but music. Point up. Point down. Repeat forever.",
    lesson: "Care shapes color: a music-fed aura overrides its base hue.",
  },
  sealion: {
    id: "sealion",
    name: "Sea Lion Aura",
    emoji: "🦭",
    dance: "seaLion",
    danceName: "The Sea Lion",
    rarity: "rare",
    blurb: "A cool aura that got TOO much rest. It only knows how to clap.",
    lesson: "Cool colors + lots of rest = slow, mellow, flappy energy.",
  },
  cosmic: {
    id: "cosmic",
    name: "Cosmic Aura",
    emoji: "🌌",
    dance: "moonwalk",
    danceName: "Lunar Moonwalk",
    rarity: "legendary",
    blurb: "Raised on bedtime stories until it drifted into space.",
    lesson: "Storytelling pulled this aura cool and dreamy regardless of mix.",
  },
  phoenix: {
    id: "phoenix",
    name: "Phoenix Aura",
    emoji: "🦅",
    dance: "breakdance",
    danceName: "Flaming Breakdance",
    rarity: "rare",
    blurb: "A warm aura overdosed on sunlight. Pure kinetic showing off.",
    lesson: "Warm colors + sunlight = the fastest-growing, most energetic auras.",
  },
  // --- chaos pool ---
  gremlin: {
    id: "gremlin",
    name: "Gremlin Aura",
    emoji: "👺",
    dance: "gremlin",
    danceName: "Unhinged Gremlin Flail",
    rarity: "common",
    blurb: "You hit the Chaos button too much. This is your fault.",
    lesson: "Chaos scrambles the mix — color theory politely leaves the room.",
  },
  taxfraud: {
    id: "taxfraud",
    name: "Tax Fraud Aura",
    emoji: "🧾",
    dance: "narutoRun",
    danceName: "Running From The Auditors",
    rarity: "rare",
    blurb: "Warm, chaotic, and sprinting from imaginary auditors.",
    lesson: "Chaos on a WARM aura keeps the energy high — and very suspicious.",
  },
  sigma: {
    id: "sigma",
    name: "Sigma Aura",
    emoji: "🗿",
    dance: "sigma",
    danceName: "Stoic Sigma Nod",
    rarity: "rare",
    blurb: "Cool and chaotic. Arms crossed. Says nothing. Nods slowly.",
    lesson: "Chaos on a COOL aura stays reserved — same energy, less talking.",
  },
  void: {
    id: "void",
    name: "Void Aura",
    emoji: "⚫",
    dance: "worm",
    danceName: "The Floor Worm",
    rarity: "legendary",
    blurb: "Overfed on pure chaos until it collapsed into the floor.",
    lesson: "Pile on enough chaos and the aura forgets which way is up.",
  },
  gamer: {
    id: "gamer",
    name: "Gamer Aura",
    emoji: "🎮",
    dance: "tRex",
    danceName: "Tiny-Arm Rage Stomp",
    rarity: "rare",
    blurb: "Green and chaotic. Claw hands. No touching grass.",
    lesson: "Chaos on a GREEN aura: nature, but make it caffeinated.",
  },
};

export const DANCE_NAMES: Record<DanceId, string> = Object.values(AURAS).reduce(
  (acc, a) => {
    acc[a.dance] = a.danceName;
    return acc;
  },
  {} as Record<DanceId, string>
);

/**
 * Canonical color mix for each aura, used to replay its dance directly from the
 * Dance Encyclopedia. These pick a representative on-theme color so the goblin
 * (and the groove's tempo/scale) match the aura without re-deriving it.
 */
export const AURA_MIX: Record<string, Mix> = {
  inferno: { r: 6, y: 0, b: 0 },
  hero: { r: 5, y: 3, b: 0 },
  sunbeam: { r: 0, y: 6, b: 0 },
  forest: { r: 0, y: 4, b: 4 },
  ocean: { r: 0, y: 0, b: 6 },
  mystic: { r: 4, y: 0, b: 4 },
  rainbow: { r: 4, y: 4, b: 4 },
  disco: { r: 3, y: 0, b: 4 },
  sealion: { r: 0, y: 1, b: 5 },
  cosmic: { r: 3, y: 0, b: 5 },
  phoenix: { r: 6, y: 3, b: 0 },
  gremlin: { r: 3, y: 3, b: 2 },
  taxfraud: { r: 5, y: 2, b: 1 },
  sigma: { r: 1, y: 1, b: 4 },
  void: { r: 4, y: 2, b: 5 },
  gamer: { r: 1, y: 4, b: 4 },
};

/** Representative mix for an aura id (falls back to a neutral mix). */
export function mixForAura(id: string): Mix {
  return { ...(AURA_MIX[id] ?? { r: 3, y: 3, b: 3 }) };
}

/* ------------------------------------------------------------------ *
 * Classification
 * ------------------------------------------------------------------ */

function dominantAffinity(care: Care): { key: keyof Care; share: number } {
  const total =
    care.feed + care.rest + care.sun + care.music + care.story + care.chaos;
  let bestKey: keyof Care = "feed";
  let best = -1;
  (Object.keys(care) as (keyof Care)[]).forEach((k) => {
    if (care[k] > best) {
      best = care[k];
      bestKey = k;
    }
  });
  return { key: bestKey, share: total > 0 ? best / total : 0 };
}

/**
 * The heart of the game: given the final mix and how it was raised, decide
 * which aura the goblin inherits. Care-driven specials win over the base hue,
 * so raising matters as much as mixing.
 */
export function classifyAura(mix: Mix, care: Care): AuraDef {
  const { hue, sat } = hueSat(mix);
  const fam = hueFamily(hue);
  const w = warmth(hue);
  const warm = w > 0.15;
  const cool = w < -0.15;
  const totalCare =
    care.feed + care.rest + care.sun + care.music + care.story + care.chaos;

  // Care specials only kick in once the blob has actually been raised a bit.
  if (totalCare >= 5) {
    const dom = dominantAffinity(care);

    if (dom.key === "chaos" && dom.share >= 0.42) {
      if (care.chaos >= 11) return AURAS.void; // overfed on darkness
      if (fam === "green") return AURAS.gamer;
      if (warm) return AURAS.taxfraud;
      if (cool) return AURAS.sigma;
      return AURAS.gremlin;
    }
    if (dom.key === "music" && dom.share >= 0.38) return AURAS.disco;
    if (dom.key === "story" && dom.share >= 0.38) return AURAS.cosmic;
    if (dom.key === "sun" && dom.share >= 0.38 && warm) return AURAS.phoenix;
    if (dom.key === "rest" && dom.share >= 0.38 && cool) return AURAS.sealion;
  }

  // Near-equal primaries → the rare balanced aura.
  if (sat < 0.16 && mixTotal(mix) >= 3) return AURAS.rainbow;

  // Base hue auras.
  switch (fam) {
    case "red":
      return AURAS.inferno;
    case "orange":
      return AURAS.hero;
    case "yellow":
      return AURAS.sunbeam;
    case "green":
      return AURAS.forest;
    case "blue":
      return AURAS.ocean;
    case "purple":
      return AURAS.mystic;
  }
}

/* ------------------------------------------------------------------ *
 * Growth stages (cosmetic labels as the blob matures)
 * ------------------------------------------------------------------ */

export type Stage = "seed" | "sprout" | "bloom" | "mature";

export function stageFor(growth: number): Stage {
  if (growth >= 1) return "mature";
  if (growth >= 0.66) return "bloom";
  if (growth >= 0.33) return "sprout";
  return "seed";
}

export const STAGE_LABEL: Record<Stage, string> = {
  seed: "Seedling",
  sprout: "Sprouting",
  bloom: "Blooming",
  mature: "Ready to harvest!",
};

/** Care temperament label derived live from the current mix's warmth. */
export function temperament(mix: Mix): { label: string; warm: boolean } {
  const { hue } = hueSat(mix);
  const w = warmth(hue);
  if (w > 0.15) return { label: "Warm — fast & energetic", warm: true };
  if (w < -0.15) return { label: "Cool — slow & smooth", warm: false };
  return { label: "Neutral", warm: false };
}
