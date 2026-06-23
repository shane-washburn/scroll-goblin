/**
 * AI rival personalities for solo play. Each is just a tuning preset fed to
 * the canonical engine's `stepAi`, so adding difficulty costs no new logic.
 */
import type { AiTuning } from "./engine";

export type Difficulty = "easy" | "normal" | "sigma";

export interface Personality {
  id: Difficulty;
  /** Display name shown on menus and the scoreboard. */
  name: string;
  emoji: string;
  /** One-line flavour for the difficulty picker. */
  blurb: string;
  tuning: AiTuning;
}

export const PERSONALITIES: Record<Difficulty, Personality> = {
  easy: {
    id: "easy",
    name: "Sleepy Slug",
    emoji: "😴",
    blurb: "Half asleep. Reacts late and lunges lazily.",
    tuning: {
      thinkMin: 360,
      thinkMax: 760,
      lungeGapMin: 800,
      lungeGapMax: 1400,
      lungeChance: 0.4,
      alignMult: 0.8,
      shadowChance: 0.45,
      speedScale: 0.62,
    },
  },
  normal: {
    id: "normal",
    name: "Average Slug",
    emoji: "🐌",
    blurb: "A fair fight. Shadows you and strikes when lined up.",
    tuning: {
      thinkMin: 240,
      thinkMax: 600,
      lungeGapMin: 450,
      lungeGapMax: 900,
      lungeChance: 0.6,
      alignMult: 1.1,
      shadowChance: 0.6,
      speedScale: 0.85,
    },
  },
  sigma: {
    id: "sigma",
    name: "Sigma Slug",
    emoji: "🕶️",
    blurb: "Built different. Fast, relentless, terrifyingly aligned.",
    tuning: {
      thinkMin: 150,
      thinkMax: 360,
      lungeGapMin: 300,
      lungeGapMax: 560,
      lungeChance: 0.82,
      alignMult: 1.25,
      shadowChance: 0.72,
      speedScale: 1.0,
    },
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "normal", "sigma"];
