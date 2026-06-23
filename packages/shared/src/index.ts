import { z } from "zod";

/**
 * The contract shared between every frontend and backend.
 * Both apps depend ONLY on these schemas/types, never on each other's internals.
 * This is what keeps the system decoupled and swappable.
 */

export const DIRECTIONS = ["text-to-emoji", "emoji-to-text"] as const;
export const DirectionSchema = z.enum(DIRECTIONS);
export type Direction = z.infer<typeof DirectionSchema>;

/**
 * Supported target languages for the `emoji-to-text` direction
 * (and the source/target language for `text-to-emoji`).
 * BCP-47-ish codes; extend freely.
 */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "nl", label: "Dutch" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "es", label: "Spanish" },
  { code: "uk", label: "Ukrainian" },
] as const;

export const LanguageCodeSchema = z.enum(
  LANGUAGES.map((l) => l.code) as [string, ...string[]]
);
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

export const TranslateRequestSchema = z.object({
  /** The text or emoji string to translate. */
  input: z.string().min(1, "Input cannot be empty").max(2000, "Input too long"),
  /** Which way to translate. */
  direction: DirectionSchema,
  /**
   * Target human language.
   * - emoji-to-text: language to translate the emoji meaning into.
   * - text-to-emoji: language the input text is written in (helps interpretation).
   */
  targetLanguage: LanguageCodeSchema.default("en"),
});
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;

/**
 * Structured result the LLM is asked to return.
 * Structured output lets the UI render alternatives + notes cleanly.
 */
export const TranslationResultSchema = z.object({
  /** Primary translation. */
  translation: z.string(),
  /** Other valid interpretations / phrasings (emoji are ambiguous!). */
  alternatives: z.array(z.string()).max(5).default([]),
  /** Optional short note about idioms, ambiguity, or tone. */
  notes: z.string().optional(),
});
export type TranslationResult = z.infer<typeof TranslationResultSchema>;

export const TranslateResponseSchema = z.object({
  result: TranslationResultSchema,
  /** Echoes the model used, for transparency / debugging. */
  model: z.string(),
  /** Whether this response was served from cache. */
  cached: z.boolean().default(false),
});
export type TranslateResponse = z.infer<typeof TranslateResponseSchema>;

/* ------------------------------------------------------------------ */
/* Commune with God — AI magic 8-ball contract                         */
/* ------------------------------------------------------------------ */

export const CommuneRequestSchema = z.object({
  /** The question the seeker asks the divine. */
  question: z
    .string()
    .min(1, "Ask something, even a whisper")
    .max(500, "The divine prefers concise questions"),
});
export type CommuneRequest = z.infer<typeof CommuneRequestSchema>;

/** Structured divine answer the LLM is asked to return. */
export const DivineAnswerSchema = z.object({
  /** Short magic-8-ball-style verdict, e.g. "Yes, and sooner than you think." */
  verdict: z.string(),
  /** A few sentences of warm, supportive, non-denominational guidance. */
  message: z.string(),
  /** A one-line parting blessing. */
  blessing: z.string(),
});
export type DivineAnswer = z.infer<typeof DivineAnswerSchema>;

export const CommuneResponseSchema = z.object({
  result: DivineAnswerSchema,
  /** Echoes the model used, for transparency / debugging. */
  model: z.string(),
});
export type CommuneResponse = z.infer<typeof CommuneResponseSchema>;

/* ------------------------------------------------------------------ */
/* Brainrot Button — custom audio clip sharing contract                */
/* ------------------------------------------------------------------ */

export const BrainrotButtonClipIdSchema = z
  .string()
  .regex(/^[a-f0-9]{32}$/, "Invalid clip id");
export type BrainrotButtonClipId = z.infer<typeof BrainrotButtonClipIdSchema>;

export const BrainrotButtonClipUploadResponseSchema = z.object({
  clipId: BrainrotButtonClipIdSchema,
  /** ISO timestamp; Redis TTL is the source of truth server-side. */
  expiresAt: z.string().datetime(),
});
export type BrainrotButtonClipUploadResponse = z.infer<
  typeof BrainrotButtonClipUploadResponseSchema
>;

export const BrainrotButtonShareStateSchema = z.object({
  clipId: BrainrotButtonClipIdSchema,
});
export type BrainrotButtonShareState = z.infer<
  typeof BrainrotButtonShareStateSchema
>;

/* ------------------------------------------------------------------ */
/* Stats — suite-wide interaction counters & leaderboard contract       */
/* ------------------------------------------------------------------ */

/**
 * Allowlist of every metric a module may report, with display labels for the
 * leaderboard. The API rejects anything not listed here, so a misbehaving
 * client can't create arbitrary Redis keys.
 *
 * `visits` is implicit for every module and tracked by the shell.
 */
export const STAT_METRICS: Record<string, Record<string, string>> = {
  "touch-grass": {
    touches: "Grass touches",
    plucks: "Grass plucked",
    waters: "Waterings poured",
  },
  "screaming-chicken": {
    squeezes: "Chicken squeezes",
    screams: "Screams unleashed",
    eggs: "Eggs laid",
  },
  "potato-painter": {
    stamps: "Potatoes stamped",
  },
  "commune-with-god": {
    answers: "Answers from God",
  },
  "emoji-translator": {
    translations: "Emoji translations",
  },
  "slug-fencing": {
    hits: "Hits landed",
    lunges: "Lunges thrown",
    matches: "Matches played",
    mpWins: "Multiplayer wins",
  },
  "balloon-blower": {
    filled: "Balloons filled",
    popped: "Balloons popped",
  },
  "brainrot-button": {
    presses: "Button pushes",
    recordings: "Custom recordings",
  },
  "pushy-paws": {
    pushed: "Items pushed",
  },
  "musical-dna": {
    plays: "Songs played",
    notes: "Notes sequenced",
  },
  "life-of-an-octopus": {
    won: "Games won as octopus",
    died: "Octopus deaths",
  },
  "aura-farm": {
    harvests: "Auras farmed",
    drops: "Energy mixed",
  },
  "goblin-mirror": {
    scans: "Goblins scanned",
  },
};

/** Reserved metric name for page visits; valid for every module. */
export const VISITS_METRIC = "visits";

export function isValidStat(module: string, metric: string): boolean {
  if (metric === VISITS_METRIC) return module in STAT_METRICS;
  return Boolean(STAT_METRICS[module]?.[metric]);
}

/** One batched counter increment reported by a client. */
export const StatEventSchema = z.object({
  module: z.string().min(1).max(64),
  metric: z.string().min(1).max(64),
  /** Clamped server-side; batching keeps Redis command usage low. */
  count: z.number().int().min(1).max(1000),
});
export type StatEvent = z.infer<typeof StatEventSchema>;

export const StatsTrackRequestSchema = z.object({
  events: z.array(StatEventSchema).min(1).max(50),
});
export type StatsTrackRequest = z.infer<typeof StatsTrackRequestSchema>;

/** Per-module totals returned by the leaderboard endpoint. */
export const ModuleStatsSchema = z.object({
  visits: z.number(),
  /** metric name -> total, for metrics listed in STAT_METRICS. */
  metrics: z.record(z.number()),
});
export type ModuleStats = z.infer<typeof ModuleStatsSchema>;

export const LeaderboardResponseSchema = z.object({
  /** module id -> stats. */
  modules: z.record(ModuleStatsSchema),
  /** False when the API has no Redis configured (stats are zeros). */
  live: z.boolean(),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

/* ------------------------------------------------------------------ */
/* Slug Fencing — multiplayer duel room contract                        */
/* ------------------------------------------------------------------ */

/**
 * Server-mediated, host-authoritative multiplayer. The host's browser runs the
 * one true simulation and writes the room snapshot; the guest writes only its
 * input. Players only ever talk to our API, so neither learns the other's IP.
 *
 * Room ids are short, random, and contain no identifying data. Rooms are
 * purely transient: every write refreshes a Redis TTL, so abandoned and
 * finished rooms expire on their own with no cleanup code and no privacy
 * footprint.
 */

/** Short, URL-safe, non-guessable room id (e.g. "4Rj9KmPq"). */
export const SlugRoomIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{8}$/, "Invalid room id");
export type SlugRoomId = z.infer<typeof SlugRoomIdSchema>;

/** Opaque per-role secret proving a client is the host or the guest. */
export const SlugRoomTokenSchema = z.string().regex(/^[a-f0-9]{32}$/);

export const SLUG_PHASES = [
  "lobby",
  "countdown",
  "playing",
  "victory",
] as const;
export const SlugPhaseSchema = z.enum(SLUG_PHASES);
export type SlugPhase = z.infer<typeof SlugPhaseSchema>;

/** Renderable fencer state. `lungePhase` is 0 when idle, else 0..1 progress. */
export const SlugFencerStateSchema = z.object({
  y: z.number(),
  energy: z.number(),
  lungePhase: z.number().min(0).max(1),
});
export type SlugFencerState = z.infer<typeof SlugFencerStateSchema>;

/** The full authoritative room snapshot the host writes and the guest reads. */
export const SlugRoomSnapshotSchema = z.object({
  roomId: SlugRoomIdSchema,
  scoreToWin: z.number().int().min(1).max(50),
  phase: SlugPhaseSchema,
  /** Epoch ms when the live point begins, for a clock-synced 3-2-1 countdown. */
  startAt: z.number().nullable(),
  guestJoined: z.boolean(),
  /** p1 = host, p2 = guest. */
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
  p1: SlugFencerStateSchema,
  p2: SlugFencerStateSchema,
  /** 1 | 2 | null. */
  winner: z.number().int().nullable(),
  rematchHost: z.boolean(),
  rematchGuest: z.boolean(),
  /** Monotonic snapshot counter so the client can drop stale reads. */
  seq: z.number().int().min(0),
  /** Server epoch ms stamped on write, for clock-offset estimation. */
  updatedAt: z.number(),
});
export type SlugRoomSnapshot = z.infer<typeof SlugRoomSnapshotSchema>;

export const SlugCreateRoomRequestSchema = z.object({
  scoreToWin: z.number().int().min(1).max(50),
});
export type SlugCreateRoomRequest = z.infer<typeof SlugCreateRoomRequestSchema>;

export const SlugCreateRoomResponseSchema = z.object({
  roomId: SlugRoomIdSchema,
  hostToken: SlugRoomTokenSchema,
  snapshot: SlugRoomSnapshotSchema,
});
export type SlugCreateRoomResponse = z.infer<
  typeof SlugCreateRoomResponseSchema
>;

export const SlugJoinResponseSchema = z.object({
  guestToken: SlugRoomTokenSchema,
  snapshot: SlugRoomSnapshotSchema,
});
export type SlugJoinResponse = z.infer<typeof SlugJoinResponseSchema>;

/** Guest-owned input record (the guest is the sole writer of this key). */
export const SlugGuestInputSchema = z.object({
  targetY: z.number(),
  /** Increments once per guest lunge press; host fires on a rising value. */
  lungeSeq: z.number().int().min(0),
  joined: z.boolean(),
  rematch: z.boolean(),
});
export type SlugGuestInput = z.infer<typeof SlugGuestInputSchema>;

/** Guest -> server: update my input (and optional join/rematch flags). */
export const SlugInputRequestSchema = z.object({
  token: SlugRoomTokenSchema,
  targetY: z.number(),
  lungeSeq: z.number().int().min(0),
  rematch: z.boolean().optional(),
});
export type SlugInputRequest = z.infer<typeof SlugInputRequestSchema>;

/** Host -> server: persist the authoritative gameplay state. */
export const SlugStateRequestSchema = z.object({
  token: SlugRoomTokenSchema,
  scoreToWin: z.number().int().min(1).max(50),
  phase: SlugPhaseSchema,
  startAt: z.number().nullable(),
  // Note: guestJoined is NOT accepted from the host — the server derives it
  // authoritatively from the room's guestToken/input so it can't be spoofed.
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
  p1: SlugFencerStateSchema,
  p2: SlugFencerStateSchema,
  winner: z.number().int().nullable(),
  rematchHost: z.boolean(),
  seq: z.number().int().min(0),
});
export type SlugStateRequest = z.infer<typeof SlugStateRequestSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
