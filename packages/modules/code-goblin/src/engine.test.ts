import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSONS, validateCurriculum } from './curriculum';
import { SAVE_KEY, canEquip, currentStreak, dayDistance, dayKey, earnedStars, freshProgress, isCorrect,
  readProgress, recordActivity, refreshDay, starsTotal, transition, unlocked, xpTotal } from './engine';
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
