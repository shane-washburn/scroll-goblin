import data from './lessons.json';
import type { Challenge, Lesson, TrackId } from './types';

export const TRACKS = {
  python: { title: 'Forest Runes', language: 'Python', mentor: 'Arch-Mage Pythia', character: 'pythia',
    description: 'Follow the roots. Find your flow.', color: 'forest' },
  java: { title: 'Dungeon Forging', language: 'Java', mentor: 'Iron-Smith Brak', character: 'brak',
    description: 'A strong spell starts with a blueprint.', color: 'forge' },
  nether: { title: 'The Quantum Nether', language: 'CS + Quantum', mentor: 'Schrödinger’s Percy', character: 'percy',
    description: 'Beyond syntax, a stranger world awaits.', color: 'nether' },
} as const;
export const TIER_NAMES = ['Apprentice', 'Adept', 'Master'];
export const CHAMBERS = ['The Traversal Catacombs', 'The Vectorized AI Forge', 'The Quantum Crucible'];
export const CHALLENGE_NAMES: Record<Challenge['type'], string> = {
  word_bank: 'Rune Weaver', linter_trap: 'The Linter Trap', rosetta: 'Rosetta Altar', micro_caster: 'Micro-Caster',
};

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid Code Goblin curriculum: ${message}`);
}
/** Validate authors' JSON before any lesson is playable. No executable lesson code. */
export function validateCurriculum(input: unknown): Lesson[] {
  requireThat(Array.isArray(input) && input.length > 0, 'expected a nonempty lesson array');
  const ids = new Set<string>();
  const challengeIds = new Set<string>();
  for (const lesson of input as Lesson[]) {
    requireThat(lesson && typeof lesson === 'object', 'expected lesson object');
    requireThat(Object.hasOwn(TRACKS, lesson.trackId) && [1, 2, 3].includes(lesson.tier), 'track and tier');
    for (const key of ['nodeId', 'title', 'subtitle', 'storyIntro', 'example'] as const)
      requireThat(typeof lesson[key] === 'string' && lesson[key].length > 0, key);
    requireThat(/^[a-z0-9-]+$/.test(lesson.nodeId) && !ids.has(lesson.nodeId), 'unique node ID');
    requireThat(['pip', 'pythia', 'brak', 'percy', 'imp'].includes(lesson.mentor), 'mentor');
    requireThat(Number.isInteger(lesson.minutes) && lesson.minutes > 0, 'duration');
    requireThat(Array.isArray(lesson.prerequisites) && lesson.prerequisites.every(id => ids.has(id)), 'prerequisites must precede lesson');
    requireThat(Array.isArray(lesson.concepts) && lesson.concepts.length > 0 && lesson.concepts.every(t => typeof t === 'string'), 'teaching notes');
    requireThat(lesson.reference && typeof lesson.reference.label === 'string' && /^https:\/\//.test(lesson.reference.url), 'reference');
    requireThat(Array.isArray(lesson.challenges) && lesson.challenges.length >= 1, 'challenges');
    for (const c of lesson.challenges) {
      requireThat(c && typeof c === 'object' && typeof c.id === 'string' && !challengeIds.has(c.id), 'unique challenge ID');
      challengeIds.add(c.id);
      for (const key of ['prompt', 'hint', 'explanation'] as const) requireThat(typeof c[key] === 'string' && c[key].length > 0, key);
      switch (c.type) {
        case 'word_bank': {
          requireThat(Array.isArray(c.tokens) && c.tokens.length > 0 && c.tokens.every(t => typeof t === 'string' && t.length > 0), 'tokens');
          for (const sequence of [c.correctSequence, ...(c.acceptedSequences ?? [])]) {
            requireThat(Array.isArray(sequence) && sequence.length > 0, 'sequence');
            const available = [...c.tokens];
            for (const token of sequence) {
              const index = available.indexOf(token);
              requireThat(index >= 0, 'answer must be constructible from bank');
              available.splice(index, 1);
            }
          }
          break;
        }
        case 'linter_trap':
          requireThat(Array.isArray(c.codeSnippet) && c.codeSnippet.every(line => typeof line === 'string') &&
            Number.isInteger(c.correctLineIndex) && c.correctLineIndex >= 0 && c.correctLineIndex < c.codeSnippet.length, 'linter index'); break;
        case 'rosetta':
          requireThat(typeof c.codeSnippet === 'string' && typeof c.sourceLanguage === 'string' && typeof c.targetLanguage === 'string' &&
            Array.isArray(c.options) && c.options.length >= 2 && c.options.every(t => typeof t === 'string') &&
            new Set(c.options).size === c.options.length && Number.isInteger(c.correctOptionIndex) &&
            c.correctOptionIndex >= 0 && c.correctOptionIndex < c.options.length, 'rosetta options'); break;
        case 'micro_caster':
          requireThat(typeof c.before === 'string' && typeof c.after === 'string' && typeof c.answer === 'string' && c.answer.trim().length > 0 &&
            (!c.acceptedAnswers || Array.isArray(c.acceptedAnswers) && c.acceptedAnswers.every(a => typeof a === 'string')), 'micro answer'); break;
        default: throw new Error('Unknown Code Goblin challenge type');
      }
    }
    ids.add(lesson.nodeId);
  }
  return input as Lesson[];
}
export const LESSONS = validateCurriculum(data);
export const lessonsFor = (track: TrackId) => LESSONS.filter(l => l.trackId === track);
