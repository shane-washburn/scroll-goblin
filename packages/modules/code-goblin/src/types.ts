export type TrackId = 'python' | 'java' | 'nether';
export type Tier = 1 | 2 | 3;
export type Character = 'pip' | 'pythia' | 'brak' | 'percy' | 'imp';

interface ChallengeBase {
  id: string;
  prompt: string;
  hint: string;
  explanation: string;
}
export interface WordBank extends ChallengeBase {
  type: 'word_bank';
  tokens: string[];
  correctSequence: string[];
  /** Explicit alternatives; whitespace inside tokens is significant. */
  acceptedSequences?: string[][];
}
export interface LinterTrap extends ChallengeBase {
  type: 'linter_trap';
  codeSnippet: string[];
  correctLineIndex: number;
}
export interface Rosetta extends ChallengeBase {
  type: 'rosetta';
  sourceLanguage: string;
  targetLanguage: string;
  codeSnippet: string;
  options: string[];
  correctOptionIndex: number;
}
export interface MicroCaster extends ChallengeBase {
  type: 'micro_caster';
  before: string;
  after: string;
  answer: string;
  acceptedAnswers?: string[];
}
export type Challenge = WordBank | LinterTrap | Rosetta | MicroCaster;
export interface Lesson {
  trackId: TrackId;
  tier: Tier;
  nodeId: string;
  title: string;
  subtitle: string;
  storyIntro: string;
  mentor: Character;
  minutes: number;
  concepts: string[];
  example: string;
  challenges: Challenge[];
  prerequisites: string[];
  reference: { label: string; url: string };
}
export type Answer = string | number | number[] | null;
export interface Run {
  nodeId: string;
  practice: boolean;
  phase: 'story' | 'challenge' | 'complete';
  index: number;
  mistakes: number;
  answer: Answer;
  feedback: 'correct' | 'incorrect' | 'timeout' | null;
  hintUsed: boolean;
  deadline: number | null;
  /** Snapshotted at run start so settings cannot change a live clock. */
  timed: boolean;
}
export type Trinket = 'none' | 'scarf' | 'hammer' | 'tail';
export interface Progress {
  version: 1;
  completed: Record<string, { stars: number; completedAt: string }>;
  hearts: number;
  heartDay: string;
  streak: number;
  lastActiveDay: string | null;
  brewDays: number;
  freezes: number;
  selectedTrack: TrackId;
  equipped: Trinket;
  timed: boolean;
  sound: boolean;
  run: Run | null;
}
