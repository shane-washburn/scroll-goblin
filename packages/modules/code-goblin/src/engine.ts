import type { Answer, Challenge, Lesson, Progress, Run, TrackId, Trinket } from './types';

export const SAVE_KEY = 'scroll-goblin-code-goblin-v1';
export const MAX_HEARTS = 5;
export const CAST_SECONDS = 30;

/** Local calendar dates, not elapsed 24-hour periods (DST-safe). */
export function dayKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function dayDistance(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}
export function freshProgress(now = new Date()): Progress {
  return { version: 1, completed: {}, hearts: MAX_HEARTS, heartDay: dayKey(now), streak: 0,
    lastActiveDay: null, brewDays: 0, freezes: 0, selectedTrack: 'python', equipped: 'none',
    timed: true, sound: false, run: null };
}
export function refreshDay(progress: Progress, now = new Date()): Progress {
  const today = dayKey(now);
  return today > progress.heartDay ? { ...progress, heartDay: today, hearts: MAX_HEARTS } : progress;
}
export function currentStreak(progress: Progress, now = new Date()): number {
  if (!progress.lastActiveDay) return 0;
  const gap = dayDistance(progress.lastActiveDay, dayKey(now));
  return gap <= 1 || (gap === 2 && progress.freezes > 0) ? progress.streak : 0;
}
export function recordActivity(progress: Progress, now: Date): Progress {
  const today = dayKey(now);
  if (progress.lastActiveDay && today <= progress.lastActiveDay) return progress;
  const gap = progress.lastActiveDay ? dayDistance(progress.lastActiveDay, today) : Infinity;
  const useFreeze = gap === 2 && progress.freezes > 0;
  const brewDays = gap === 1 ? progress.brewDays + 1 : 1;
  return { ...progress, lastActiveDay: today,
    streak: gap === 1 || useFreeze ? progress.streak + 1 : 1,
    brewDays: brewDays >= 7 ? 0 : brewDays,
    freezes: Math.min(3, progress.freezes - Number(useFreeze) + Number(brewDays >= 7)) };
}
export function starsTotal(progress: Progress): number {
  return Object.values(progress.completed).reduce((sum, node) => sum + node.stars, 0);
}
export function xpTotal(progress: Progress): number {
  return Object.values(progress.completed).reduce((sum, node) => sum + 30 + node.stars * 10, 0);
}
export function earnedStars(mistakes: number): number { return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1; }
export function unlocked(lesson: Lesson, progress: Progress): boolean {
  return lesson.prerequisites.every(id => Boolean(progress.completed[id]));
}
export function canEquip(trinket: Trinket, progress: Progress, lessons: Lesson[]): boolean {
  if (trinket === 'none') return true;
  if (trinket === 'scarf') return starsTotal(progress) >= 9;
  if (trinket === 'hammer') return starsTotal(progress) >= 24;
  return lessons.filter(l => l.trackId === 'nether').every(l => Boolean(progress.completed[l.nodeId]));
}
export function isCorrect(challenge: Challenge, answer: Answer): boolean {
  switch (challenge.type) {
    case 'word_bank': {
      if (!Array.isArray(answer) || new Set(answer).size !== answer.length ||
        answer.some(i => !Number.isInteger(i) || i < 0 || i >= challenge.tokens.length)) return false;
      const actual = answer.map(i => challenge.tokens[i]);
      return [challenge.correctSequence, ...(challenge.acceptedSequences ?? [])].some(sequence =>
        sequence.length === actual.length && sequence.every((token, i) => token === actual[i]));
    }
    case 'linter_trap': return answer === challenge.correctLineIndex;
    case 'rosetta': return answer === challenge.correctOptionIndex;
    // Outer whitespace is harmless; case, internal whitespace and punctuation are preserved.
    case 'micro_caster': return typeof answer === 'string' &&
      [challenge.answer, ...(challenge.acceptedAnswers ?? [])].includes(answer.trim());
  }
}
export function correctAnswer(challenge: Challenge): string {
  switch (challenge.type) {
    case 'word_bank': return challenge.correctSequence.join('');
    case 'linter_trap': return `Line ${challenge.correctLineIndex + 1}: ${challenge.codeSnippet[challenge.correctLineIndex]}`;
    case 'rosetta': return challenge.options[challenge.correctOptionIndex];
    case 'micro_caster': return challenge.answer;
  }
}
export type Action =
  | { type: 'start'; nodeId: string; practice: boolean }
  | { type: 'begin' | 'retry' | 'submit' | 'next' | 'hint' | 'start_clock' | 'timeout' | 'refresh' }
  | { type: 'answer'; answer: Answer }
  | { type: 'track'; track: TrackId }
  | { type: 'equip'; trinket: Trinket }
  | { type: 'setting'; name: 'timed' | 'sound'; value: boolean };

/** All scoring, clocks and completion rewards pass through this pure transition. */
export function transition(previous: Progress, action: Action, lessons: Lesson[], now = new Date()): Progress {
  const progress = refreshDay(previous, now);
  if (action.type === 'refresh') return progress;
  if (action.type === 'track') return { ...progress, selectedTrack: action.track };
  if (action.type === 'setting') return { ...progress, [action.name]: action.value };
  if (action.type === 'equip') return canEquip(action.trinket, progress, lessons) ? { ...progress, equipped: action.trinket } : progress;
  if (action.type === 'start') {
    const lesson = lessons.find(l => l.nodeId === action.nodeId);
    if (!lesson || !unlocked(lesson, progress) || (!action.practice && progress.hearts === 0)) return progress;
    return { ...progress, selectedTrack: lesson.trackId, run: { nodeId: lesson.nodeId, practice: action.practice,
      phase: 'story', index: 0, mistakes: 0, answer: null, feedback: null, hintUsed: false,
      deadline: null, timed: !action.practice && progress.timed } };
  }
  const run = progress.run;
  const lesson = lessons.find(l => l.nodeId === run?.nodeId);
  if (!run || !lesson || run.phase === 'complete') return progress;
  const withRun = (changes: Partial<Run>): Progress => ({ ...progress, run: { ...run, ...changes } });
  if (action.type === 'begin') return run.phase === 'story' ? withRun({ phase: 'challenge' }) : progress;
  if (run.phase !== 'challenge') return progress;
  const challenge = lesson.challenges[run.index];
  if (action.type === 'next') {
    if (run.feedback !== 'correct') return progress;
    if (run.index < lesson.challenges.length - 1) return withRun({ index: run.index + 1, answer: null,
      feedback: null, hintUsed: false, deadline: null });
    const finished: Progress = { ...recordActivity(progress, now), run: { ...run, phase: 'complete', deadline: null } };
    if (run.practice) return { ...finished, hearts: Math.min(MAX_HEARTS, progress.hearts + 1) };
    const old = progress.completed[lesson.nodeId];
    return { ...finished, completed: { ...progress.completed, [lesson.nodeId]: {
      stars: Math.max(old?.stars ?? 0, earnedStars(run.mistakes)), completedAt: old?.completedAt ?? now.toISOString() } } };
  }
  if (action.type === 'retry') return run.feedback && run.feedback !== 'correct'
    ? withRun({ feedback: null, answer: null, deadline: null }) : progress;
  if (run.feedback || (!run.practice && progress.hearts === 0)) return progress;
  if (action.type === 'hint') return withRun({ hintUsed: true });
  if (action.type === 'start_clock') return challenge.type === 'micro_caster' && run.timed && !run.deadline
    ? withRun({ deadline: now.getTime() + CAST_SECONDS * 1000 }) : progress;
  if (action.type === 'answer') return withRun({ answer: action.answer });
  if (action.type !== 'submit' && action.type !== 'timeout') return progress;
  const timed = challenge.type === 'micro_caster' && run.timed;
  if (timed && !run.deadline) return progress;
  const expired = timed && run.deadline !== null && now.getTime() >= run.deadline;
  if (action.type === 'timeout' && !expired) return progress;
  const correct = !expired && isCorrect(challenge, run.answer);
  return { ...progress, hearts: correct || run.practice ? progress.hearts : Math.max(0, progress.hearts - 1),
    run: { ...run, feedback: correct ? 'correct' : expired ? 'timeout' : 'incorrect', deadline: null,
      mistakes: run.mistakes + Number(!correct) } };
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
/** Saves are untrusted: damaged or outdated data must not crash or unlock the campaign. */
export function readProgress(raw: string | null, lessons: Lesson[], now = new Date()): { progress: Progress; recovered: boolean } {
  const fresh = freshProgress(now);
  if (!raw) return { progress: fresh, recovered: false };
  try {
    const value = JSON.parse(raw) as Progress;
    if (!value || value.version !== 1 || !value.completed || typeof value.completed !== 'object' || Array.isArray(value.completed) ||
      !integer(value.hearts, 0, 5) || !validDay(value.heartDay) || !integer(value.streak, 0, 100000) ||
      !integer(value.brewDays, 0, 6) || !integer(value.freezes, 0, 3) ||
      !(value.lastActiveDay === null || validDay(value.lastActiveDay)) ||
      !['python', 'java', 'nether'].includes(value.selectedTrack) || !['none', 'scarf', 'hammer', 'tail'].includes(value.equipped) ||
      typeof value.timed !== 'boolean' || typeof value.sound !== 'boolean') throw new Error('Invalid save');
    const completed: Progress['completed'] = {};
    // Catalog order is topological; a save cannot skip prerequisite nodes.
    for (const lesson of lessons) {
      const entry = value.completed[lesson.nodeId];
      if (entry && integer(entry.stars, 1, 3) && typeof entry.completedAt === 'string' &&
        Number.isFinite(Date.parse(entry.completedAt)) && lesson.prerequisites.every(id => Boolean(completed[id]))) {
        completed[lesson.nodeId] = { stars: entry.stars, completedAt: entry.completedAt };
      }
    }
    const progress: Progress = { ...fresh, completed, hearts: value.hearts, heartDay: value.heartDay,
      streak: value.streak, lastActiveDay: value.lastActiveDay, brewDays: value.brewDays, freezes: value.freezes,
      selectedTrack: value.selectedTrack, equipped: value.equipped, timed: value.timed, sound: value.sound };
    let recovered = Object.keys(completed).length !== Object.keys(value.completed).length;
    if (!canEquip(progress.equipped, progress, lessons)) { progress.equipped = 'none'; recovered = true; }
    if (value.run) {
      const run = value.run;
      const lesson = lessons.find(l => l.nodeId === run.nodeId);
      const answerValid = run.answer === null || typeof run.answer === 'string' && run.answer.length <= 500 ||
        integer(run.answer, 0, 100) || Array.isArray(run.answer) && run.answer.length <= 100 && run.answer.every(i => integer(i, 0, 100));
      if (lesson && unlocked(lesson, progress) && ['story', 'challenge', 'complete'].includes(run.phase) &&
        typeof run.practice === 'boolean' && integer(run.index, 0, lesson.challenges.length - 1) &&
        integer(run.mistakes, 0, 100000) && [null, 'correct', 'incorrect', 'timeout'].includes(run.feedback) &&
        typeof run.hintUsed === 'boolean' && typeof run.timed === 'boolean' && answerValid &&
        (run.deadline === null || typeof run.deadline === 'number' && Number.isFinite(run.deadline) && run.deadline > 0)) {
        progress.run = { nodeId: run.nodeId, practice: run.practice, phase: run.phase, index: run.index, mistakes: run.mistakes,
          answer: run.answer, feedback: run.feedback, hintUsed: run.hintUsed, deadline: run.deadline, timed: run.timed };
      } else recovered = true;
    }
    return { progress: refreshDay(progress, now), recovered };
  } catch { return { progress: fresh, recovered: true }; }
}
