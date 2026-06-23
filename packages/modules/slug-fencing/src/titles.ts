/**
 * Cosmetic victory titles + accessories. A random title is awarded on every
 * win — costs nothing, but makes screenshots and shares much funnier.
 */

export const VICTORY_TITLES = [
  "SIGMA SLUG",
  "ALPHA MOLLUSK",
  "GOO TYCOON",
  "SLIME EMPEROR",
  "MUCUS KING",
  "LORD OF THE LAWN",
  "THE MOIST ONE",
  "GRAND SLUGGER",
  "CHAMPION OF GOO",
  "SLIME LORD",
] as const;

export type VictoryTitle = (typeof VICTORY_TITLES)[number];

export function randomTitle(): VictoryTitle {
  return VICTORY_TITLES[Math.floor(Math.random() * VICTORY_TITLES.length)];
}

/** Brainrot accessory the winning slug puts on. Picked at random per victory. */
export const ACCESSORIES = ["shades", "crown", "chain"] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export function randomAccessory(): Accessory {
  return ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)];
}

/** Fake aura reward shown on the victory screen, e.g. "+3000 Aura". */
export function randomAura(): number {
  return (3 + Math.floor(Math.random() * 7)) * 1000; // 3000..9000
}

/** Random emote shown above a slug at the end of a point. */
export const EMOTES = ["😎", "😡", "😭", "🤪", "🥶", "💀"] as const;
export function randomEmote(): string {
  return EMOTES[Math.floor(Math.random() * EMOTES.length)];
}

/** Arena backgrounds, chosen per match for variety at near-zero cost. */
export const ARENAS = [
  { id: "garden", name: "Garden", from: "#DCFCE7", via: "#FFFFFF", to: "#FEF9C3" },
  { id: "forest", name: "Forest Floor", from: "#D1FAE5", via: "#FFFFFF", to: "#E7E5C8" },
  { id: "kitchen", name: "Kitchen Counter", from: "#E0F2FE", via: "#FFFFFF", to: "#F1F5F9" },
  { id: "cave", name: "Goblin Cave", from: "#E9D5FF", via: "#FFFFFF", to: "#DDD6FE" },
  { id: "rain", name: "Rainy Sidewalk", from: "#CBD5E1", via: "#FFFFFF", to: "#E2E8F0" },
] as const;

export type Arena = (typeof ARENAS)[number];

export function randomArena(): Arena {
  return ARENAS[Math.floor(Math.random() * ARENAS.length)];
}
