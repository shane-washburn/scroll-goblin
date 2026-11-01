import type { Game, Kind, Round, RoundTransform, SubjectDef } from './types';

export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const TILE_COUNT = GRID_COLS * GRID_ROWS;
export const ROUND_COUNT = 5;
/** A one-tile guess is worth the full base; every extra tile costs a bite. */
export const BASE_POINTS = 100;
export const TILE_PENALTY = 6;
export const MIN_POINTS = 10;
export const MAX_MULTIPLIER = 4;

export const SUBJECTS: SubjectDef[] = [
  { id: 'classic-dog', kind: 'hotdog' },
  { id: 'mustard-dog', kind: 'hotdog' },
  { id: 'loaded-dog', kind: 'hotdog' },
  { id: 'chili-dog', kind: 'hotdog' },
  { id: 'dachshund', kind: 'imposter' },
  { id: 'sub-sandwich', kind: 'imposter' },
  { id: 'banana', kind: 'imposter' },
  { id: 'caterpillar', kind: 'imposter' },
  { id: 'canoe', kind: 'imposter' },
];

/** Small deterministic PRNG so games are reproducible from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(rng: () => number, items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeTransform(rng: () => number): RoundTransform {
  return {
    rotate: Math.round((rng() * 2 - 1) * 12),
    scale: 1 + rng() * 0.3,
    flip: rng() < 0.5,
    dx: Math.round((rng() * 2 - 1) * 15),
    dy: Math.round((rng() * 2 - 1) * 10),
    variant: Math.floor(rng() * 4),
  };
}

/** Builds a game with a guaranteed mix of at least two of each kind. */
export function createGame(seed: number): Game {
  const rng = mulberry32(seed);
  const dogs = shuffle(rng, SUBJECTS.filter(s => s.kind === 'hotdog'));
  const imposters = shuffle(rng, SUBJECTS.filter(s => s.kind === 'imposter'));
  const rest = shuffle(rng, [...dogs.slice(2), ...imposters.slice(2)]);
  const picks = shuffle(rng, [...dogs.slice(0, 2), ...imposters.slice(0, 2), ...rest.slice(0, ROUND_COUNT - 4)]);
  const rounds: Round[] = picks.map(subject => ({
    subject: subject.id, kind: subject.kind, transform: makeTransform(rng),
    revealed: [], guess: null, correct: null, points: 0, multiplier: 1,
  }));
  return { rounds, index: 0, score: 0, streak: 0 };
}

/** What a correct guess is worth right now: first peek is free, the rest cost. */
export function potentialPoints(revealedCount: number): number {
  if (revealedCount === 0) return BASE_POINTS;
  return Math.max(MIN_POINTS, BASE_POINTS - (revealedCount - 1) * TILE_PENALTY);
}

export function multiplierFor(streak: number): number {
  return Math.min(1 + streak, MAX_MULTIPLIER);
}

export function currentRound(game: Game): Round {
  return game.rounds[game.index];
}

export function canGuess(game: Game): boolean {
  const round = currentRound(game);
  return round.guess === null && round.revealed.length > 0;
}

export function revealTile(game: Game, tile: number): Game {
  const round = currentRound(game);
  if (round.guess !== null || tile < 0 || tile >= TILE_COUNT || round.revealed.includes(tile)) return game;
  const rounds = game.rounds.map((r, i) => (i === game.index ? { ...r, revealed: [...r.revealed, tile] } : r));
  return { ...game, rounds };
}

export function makeGuess(game: Game, guess: Kind): Game {
  if (!canGuess(game)) return game;
  const round = currentRound(game);
  const correct = guess === round.kind;
  const multiplier = multiplierFor(game.streak);
  const points = correct ? potentialPoints(round.revealed.length) * multiplier : 0;
  const rounds = game.rounds.map((r, i) => (i === game.index ? { ...r, guess, correct, points, multiplier } : r));
  return { ...game, rounds, score: game.score + points, streak: correct ? game.streak + 1 : 0 };
}

/** True once the final round has been judged. */
export function isFinished(game: Game): boolean {
  return game.index === game.rounds.length - 1 && currentRound(game).guess !== null;
}

export function nextRound(game: Game): Game {
  if (currentRound(game).guess === null || isFinished(game)) return game;
  return { ...game, index: game.index + 1 };
}

export const RANKS = [
  { min: 1000, title: 'Certified Glizzard Wizard' },
  { min: 600, title: 'Hot Dog Inspector, First Class' },
  { min: 300, title: 'Apprentice Bun Examiner' },
  { min: 1, title: 'Suspicious Sausage Intern' },
  { min: 0, title: 'Honorary Not-Hot-Dog' },
];

export function rankFor(score: number): string {
  return RANKS.find(rank => score >= rank.min)!.title;
}
