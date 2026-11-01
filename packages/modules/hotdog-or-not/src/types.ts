/** What the hidden picture actually is. */
export type Kind = 'hotdog' | 'imposter';

/** One drawable subject the round can hide behind the tiles. */
export interface SubjectDef {
  /** Stable id, maps to a draw function in art.tsx. */
  id: string;
  kind: Kind;
}

/** Per-round random presentation so repeat subjects still feel fresh. */
export interface RoundTransform {
  /** Rotation in degrees around the stage center. */
  rotate: number;
  /** Uniform zoom, 1.0–1.3. */
  scale: number;
  /** Mirror horizontally. */
  flip: boolean;
  /** Pan offset in viewBox units. */
  dx: number;
  dy: number;
  /** Picks between a subject's color/detail variants. */
  variant: number;
}

export interface Round {
  subject: string;
  kind: Kind;
  transform: RoundTransform;
  /** Tile indices the player has uncovered, in click order. */
  revealed: number[];
  /** The player's call, once made. */
  guess: Kind | null;
  correct: boolean | null;
  /** Points banked for this round (0 until guessed, 0 forever if wrong). */
  points: number;
  /** Streak multiplier that was in effect when the guess landed. */
  multiplier: number;
}

export interface Game {
  rounds: Round[];
  /** Index of the round currently on stage. */
  index: number;
  score: number;
  /** Consecutive correct guesses coming into the current round. */
  streak: number;
}
