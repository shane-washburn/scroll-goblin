import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSONS, validateCurriculum } from './curriculum';
import { CAST_SECONDS, SAVE_KEY, canEquip, currentStreak, dayDistance, dayKey, earnedStars, freshProgress, isCorrect,
  latestCompletion, nextCampaignLesson, readProgress, recordActivity, refreshDay, starsTotal, transition, unlocked, xpTotal } from './engine';
import type { Answer, Challenge, Progress } from './types';

const now = new Date(2026, 9, 17, 12);
function answerFor(c: Challenge): Answer {
  if (c.type === 'micro_caster') return c.answer;
  if (c.type === 'linter_trap') return c.correctLineIndex;
  if (c.type === 'rosetta') return c.correctOptionIndex;
  const used = new Set<number>();
  return c.correctSequence.map(token => { const index = c.tokens.findIndex((t, i) => t === token && !used.has(i)); used.add(index); return index; });
}
function finish(p: Progress, nodeId: string, practice = false, date = now): Progress {
  p = transition(p, { type: 'start', nodeId, practice }, LESSONS, date);
  p = transition(p, { type: 'begin' }, LESSONS, date);
  const lesson = LESSONS.find(l => l.nodeId === nodeId)!;
  for (const c of lesson.challenges) {
    if (c.type === 'micro_caster') p = transition(p, { type: 'start_clock' }, LESSONS, date);
    p = transition(p, { type: 'answer', answer: answerFor(c) }, LESSONS, date);
    p = transition(p, { type: 'submit' }, LESSONS, date);
    assert.equal(p.run?.feedback, 'correct', c.id);
    p = transition(p, { type: 'next' }, LESSONS, date);
  }
  assert.equal(p.run?.phase, 'complete');
  return p;
}
test('the complete JSON campaign has 33 nodes, 100 solvable challenges, all tiers and all mechanics', () => {
  assert.equal(LESSONS.length, 33);
  assert.equal(LESSONS.flatMap(l => l.challenges).length, 100);
  const mechanics = new Set<string>();
  for (const track of ['python', 'java', 'nether']) for (const tier of [1, 2, 3])
    assert.ok(LESSONS.some(l => l.trackId === track && l.tier === tier));
  for (const c of LESSONS.flatMap(l => l.challenges)) {
    mechanics.add(c.type); assert.ok(isCorrect(c, answerFor(c)), c.id);
    assert.equal(isCorrect(c, null), false, c.id);
  }
  assert.equal(mechanics.size, 4);
  const invalid = structuredClone(LESSONS);
  invalid[0].prerequisites = ['missing'];
  assert.throws(() => validateCurriculum(invalid), /prerequisites/);
});
test('sequence matching preserves indentation, duplicates and token identity; typing preserves case', () => {
  const word: Challenge = { id: 'word', type: 'word_bank', prompt: 'p', hint: 'h', explanation: 'e', tokens: ['x', 'x', '\n    ', '\n'], correctSequence: ['x', '\n    ', 'x'] };
  assert.ok(isCorrect(word, [0, 2, 1]));
  assert.equal(isCorrect(word, [0, 3, 1]), false);
  assert.equal(isCorrect(word, [0, 2, 0]), false);
  assert.equal(isCorrect(word, [0, -1, 1]), false);
  const micro = LESSONS[0].challenges[3];
  assert.ok(isCorrect(micro, ' True ')); assert.equal(isCorrect(micro, 'true'), false);
});
test('authoring rejects unreachable token counts and unmatchable typing answers', () => {
  const word = LESSONS[0].challenges.find(c => c.type === 'word_bank')!;
  const micro = LESSONS[0].challenges.find(c => c.type === 'micro_caster')!;
  const validate = (challenge: Challenge) => validateCurriculum([{ ...LESSONS[0], challenges: [challenge] }]);
  for (const sequence of [word.correctSequence.slice(1), [...word.correctSequence, word.tokens[0]]]) {
    assert.throws(() => validate({ ...word, acceptedSequences: [sequence] }), /answer slots/);
  }
  assert.doesNotThrow(() => validate({ ...word, acceptedSequences: [[...word.correctSequence].reverse()] }));
  for (const answer of ['', ' ', ' True', 'True ', '\nTrue\t']) {
    assert.throws(() => validate({ ...micro, answer }), /outer whitespace/);
    assert.throws(() => validate({ ...micro, acceptedAnswers: [answer] }), /outer whitespace/);
  }
  assert.doesNotThrow(() => validate({ ...micro, answer: 'x + y', acceptedAnswers: ['x+y'] }));
});
test('the next campaign path reaches the Nether from either completed language and ends at the certificate', () => {
  for (const first of ['python', 'java'] as const) {
    let p: Progress = { ...freshProgress(now), selectedTrack: first };
    assert.equal(nextCampaignLesson(p, LESSONS)?.trackId, first);
    for (const lesson of LESSONS.filter(l => l.trackId === first)) p = finish(p, lesson.nodeId);
    assert.equal(nextCampaignLesson(p, LESSONS)?.trackId, first === 'python' ? 'java' : 'python');
    for (const lesson of LESSONS.filter(l => l.trackId !== first && l.trackId !== 'nether')) p = finish(p, lesson.nodeId);
    p.selectedTrack = first;
    assert.equal(nextCampaignLesson(p, LESSONS)?.nodeId, LESSONS.find(l => l.trackId === 'nether')?.nodeId);
    for (const lesson of LESSONS.filter(l => l.trackId === 'nether')) p = finish(p, lesson.nodeId);
    assert.equal(nextCampaignLesson(p, LESSONS), undefined);
  }
});
test('certificate completion dates follow the catalog even after a node is renamed or reordered', () => {
  const nether = LESSONS.filter(l => l.trackId === 'nether').map(l => ({ ...l, nodeId: `renamed-${l.nodeId}` })).reverse();
  const p = freshProgress(now);
  assert.equal(latestCompletion(p, nether), null);
  for (const lesson of nether) p.completed[lesson.nodeId] = { stars: 3, completedAt: '2026-10-17T18:00:00Z' };
  p.completed[nether[2].nodeId].completedAt = '2026-10-19T18:00:00Z';
  p.completed[LESSONS[0].nodeId] = { stars: 3, completedAt: '2026-10-20T18:00:00Z' };
  assert.equal(latestCompletion(p, nether), '2026-10-19T18:00:00Z');
});
test('both independent tracks start open; prerequisites and the joint Nether gate are enforced', () => {
  let p = freshProgress(now);
  assert.ok(unlocked(LESSONS[0], p)); assert.ok(unlocked(LESSONS[12], p));
  assert.equal(unlocked(LESSONS[1], p), false);
  assert.equal(transition(p, { type: 'start', nodeId: LESSONS[24].nodeId, practice: true }, LESSONS, now).run, null);
  for (const lesson of LESSONS.slice(0, 12)) p = finish(p, lesson.nodeId);
  assert.equal(unlocked(LESSONS[24], p), false);
  for (const lesson of LESSONS.slice(12)) p = finish(p, lesson.nodeId);
  assert.equal(Object.keys(p.completed).length, 33); assert.equal(starsTotal(p), 99); assert.equal(xpTotal(p), 1980);
  assert.ok(canEquip('tail', p, LESSONS));
});
test('incorrect submissions cost one heart once; zero hearts cannot start campaign but practice restores one', () => {
  let p = transition(freshProgress(now), { type: 'start', nodeId: LESSONS[0].nodeId, practice: false }, LESSONS, now);
  p = transition(p, { type: 'begin' }, LESSONS, now);
  p = transition(p, { type: 'submit' }, LESSONS, now);
  assert.equal(p.hearts, 4); assert.equal(p.run?.mistakes, 1);
  assert.deepEqual(transition(p, { type: 'submit' }, LESSONS, now), p);
  assert.deepEqual(transition(p, { type: 'next' }, LESSONS, now), p);
  for (let i = 0; i < 4; i++) { p = transition(p, { type: 'retry' }, LESSONS, now); p = transition(p, { type: 'submit' }, LESSONS, now); }
  assert.equal(p.hearts, 0);
  assert.deepEqual(transition(p, { type: 'start', nodeId: LESSONS[0].nodeId, practice: false }, LESSONS, now), p);
  p = finish(p, LESSONS[0].nodeId, true);
  assert.equal(p.hearts, 1); assert.equal(xpTotal(p), 0); assert.equal(starsTotal(p), 0);
  assert.equal(currentStreak(p, now), 1);
  assert.equal(transition(p, { type: 'next' }, LESSONS, now).hearts, 1);
});
test('repeat completion does not farm stars or XP and stars reflect mistakes', () => {
  let p = finish(freshProgress(now), LESSONS[0].nodeId);
  const firstXp = xpTotal(p);
  p = finish(p, LESSONS[0].nodeId);
  assert.equal(xpTotal(p), firstXp); assert.equal(starsTotal(p), 3);
  assert.deepEqual([0, 1, 2, 3, 100].map(earnedStars), [3, 2, 2, 1, 1]);
  assert.equal(currentStreak(p, now), 1);
});
test('the typing clock waits for readiness, survives a reload, and expires once even offscreen', () => {
  let p = transition(freshProgress(now), { type: 'start', nodeId: LESSONS[0].nodeId, practice: false }, LESSONS, now);
  p = { ...p, run: { ...p.run!, phase: 'challenge', index: 3, answer: 'True' } };
  assert.equal(transition(p, { type: 'submit' }, LESSONS, now).run?.feedback, null);
  p = transition(p, { type: 'start_clock' }, LESSONS, now);
  assert.equal(p.run?.deadline, now.getTime() + 30000);
  const loaded = readProgress(JSON.stringify(p), LESSONS, new Date(now.getTime() + 29000)).progress;
  assert.equal(loaded.run?.deadline, p.run?.deadline);
  p = transition(loaded, { type: 'submit' }, LESSONS, new Date(now.getTime() + 30000));
  assert.equal(p.run?.feedback, 'timeout'); assert.equal(p.hearts, 4);
  assert.deepEqual(transition(p, { type: 'timeout' }, LESSONS, now), p);
  p = transition(p, { type: 'retry' }, LESSONS, now);
  assert.equal(p.run?.deadline, null);
});
test('restored clocks are bounded to a cast and are only active on a timed typing challenge', () => {
  const p = transition(freshProgress(now), { type: 'start', nodeId: LESSONS[0].nodeId, practice: false }, LESSONS, now);
  const run = { ...p.run!, phase: 'challenge' as const, index: 3, deadline: Number.MAX_VALUE };
  const restored = readProgress(JSON.stringify({ ...p, run }), LESSONS, now);
  assert.ok(restored.recovered);
  assert.equal(restored.progress.run?.deadline, now.getTime() + CAST_SECONDS * 1000);
  const expired = transition(restored.progress, { type: 'timeout' }, LESSONS, new Date(now.getTime() + CAST_SECONDS * 1000));
  assert.equal(expired.hearts, 4);
  for (const changes of [{ phase: 'story' }, { feedback: 'correct' }, { index: 0 }, { timed: false }, { practice: true }]) {
    const loaded = readProgress(JSON.stringify({ ...p, run: { ...run, ...changes } }), LESSONS, now);
    assert.ok(loaded.recovered); assert.equal(loaded.progress.run?.deadline, null);
    if ('practice' in changes) assert.equal(loaded.progress.run?.timed, false);
  }
  const tomorrow = new Date(now.getTime() + 86400000);
  const loaded = readProgress(JSON.stringify({ ...p, run: { ...run, deadline: now.getTime() + 30000 } }), LESSONS, tomorrow).progress;
  const timedOut = transition(loaded, { type: 'timeout' }, LESSONS, tomorrow);
  assert.equal(timedOut.run?.feedback, 'timeout'); assert.equal(timedOut.hearts, 4);
  assert.deepEqual(transition(timedOut, { type: 'timeout' }, LESSONS, tomorrow), timedOut);
});
test('daily hearts use local calendar days and cannot be farmed by a backwards clock', () => {
  const p = { ...freshProgress(now), hearts: 0 };
  assert.equal(refreshDay(p, new Date(2026, 9, 17, 23, 59)).hearts, 0);
  assert.equal(refreshDay(p, new Date(2026, 9, 18, 0, 1)).hearts, 5);
  assert.equal(refreshDay(p, new Date(2026, 9, 16)).hearts, 0);
  assert.equal(dayDistance('2026-03-08', '2026-03-09'), 1);
  assert.equal(dayDistance('2026-11-01', '2026-11-02'), 1);
  assert.equal(dayKey(new Date(2026, 0, 1)), '2026-01-01');
});
test('seven actual consecutive days brew a potion, one missed day consumes it, bigger gaps reset', () => {
  let p = freshProgress(now);
  for (let i = 0; i < 7; i++) p = recordActivity(p, new Date(2026, 9, 17 + i));
  assert.equal(p.streak, 7); assert.equal(p.freezes, 1); assert.equal(p.brewDays, 0);
  assert.equal(currentStreak(p, new Date(2026, 9, 25)), 7);
  p = recordActivity(p, new Date(2026, 9, 25));
  assert.equal(p.streak, 8); assert.equal(p.freezes, 0); assert.equal(p.brewDays, 1);
  assert.equal(currentStreak(p, new Date(2026, 9, 28)), 0);
  p = recordActivity(p, new Date(2026, 9, 28));
  assert.equal(p.streak, 1); assert.equal(p.brewDays, 1);
});
test('a backwards clock hides the streak without changing recorded activity', () => {
  const p = recordActivity(freshProgress(now), now);
  const yesterday = new Date(2026, 9, 16);
  assert.equal(currentStreak(p, yesterday), 0);
  assert.deepEqual(recordActivity(p, yesterday), p);
  assert.equal(currentStreak(p, now), 1);
});
test('a finished brew waits at capacity, survives reload and gaps, then fills a used potion slot', () => {
  let p = freshProgress(now);
  for (let i = 0; i < 28; i++) p = recordActivity(p, new Date(2026, 9, 17 + i));
  assert.equal(p.freezes, 3); assert.equal(p.brewDays, 7);
  const loaded = readProgress(JSON.stringify(p), LESSONS, now);
  assert.equal(loaded.recovered, false); assert.equal(loaded.progress.brewDays, 7);
  p = recordActivity(loaded.progress, new Date(2026, 9, 45));
  assert.equal(p.freezes, 3); assert.equal(p.brewDays, 7);
  const afterGap = recordActivity(p, new Date(2026, 9, 49));
  assert.equal(afterGap.streak, 1); assert.equal(afterGap.brewDays, 7);
  p = recordActivity(p, new Date(2026, 9, 47));
  assert.equal(p.streak, 30); assert.equal(p.freezes, 3); assert.equal(p.brewDays, 0);
  assert.deepEqual(recordActivity(p, new Date(2026, 9, 47)), p);
});
test('corrupt and incompatible saves recover; invalid prerequisites cannot unlock rewards', () => {
  assert.equal(SAVE_KEY, 'scroll-goblin-code-goblin-v1');
  for (const raw of ['{', 'null', '[]', '{"version":2}', JSON.stringify({ ...freshProgress(now), hearts: -1 })]) {
    const result = readProgress(raw, LESSONS, now); assert.ok(result.recovered); assert.equal(result.progress.hearts, 5);
  }
  const invalid = { ...freshProgress(now), completed: { 'net-09-measurement': { stars: 3, completedAt: now.toISOString() } }, equipped: 'tail' };
  const result = readProgress(JSON.stringify(invalid), LESSONS, now);
  assert.equal(result.progress.equipped, 'none'); assert.deepEqual(result.progress.completed, {});
  const saved = finish(freshProgress(now), LESSONS[0].nodeId);
  assert.deepEqual(readProgress(JSON.stringify(saved), LESSONS, now).progress, saved);
});
