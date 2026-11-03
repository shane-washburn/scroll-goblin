import assert from 'node:assert/strict';
import test from 'node:test';
import { BASE_POINTS, MAX_MULTIPLIER, MIN_POINTS, ROUND_COUNT, SUBJECTS, TILE_COUNT,
  canGuess, createGame, currentRound, isFinished, makeGuess, multiplierFor, nextRound,
  potentialPoints, rankFor, revealTile } from './engine';
import type { Game } from './types';
import * as React from 'react';
import { SUBJECT_ART } from './art';

// The tsx test runner compiles JSX with the classic React.createElement
// transform (Vite uses the automatic runtime), so the art module needs the
// React global when invoked under node:test.
(globalThis as { React?: typeof React }).React = React;

const game = () => createGame(42);
const reveal = (g: Game, tiles: number[]) => tiles.reduce(revealTile, g);

test('createGame is deterministic, mixes kinds, and bounds its transforms', () => {
  assert.deepEqual(createGame(42), createGame(42));
  for (let seed = 0; seed < 50; seed++) {
    const g = createGame(seed);
    assert.equal(g.rounds.length, ROUND_COUNT);
    assert.equal(new Set(g.rounds.map(r => r.subject)).size, ROUND_COUNT, 'subjects are unique');
    const dogs = g.rounds.filter(r => r.kind === 'hotdog').length;
    assert.ok(dogs >= 2 && ROUND_COUNT - dogs >= 2, `seed ${seed} has ${dogs} hot dogs`);
    for (const r of g.rounds) {
      assert.ok(SUBJECTS.some(s => s.id === r.subject && s.kind === r.kind));
      const { rotate, scale, dx, dy, variant } = r.transform;
      assert.ok(Math.abs(rotate) <= 12 && scale >= 1 && scale <= 1.3);
      assert.ok(Math.abs(dx) <= 15 && Math.abs(dy) <= 10 && variant >= 0 && variant < 4);
    }
  }
});

test('tiles reveal once each and never after a guess', () => {
  let g = reveal(game(), [3, 3, -1, TILE_COUNT, 7]);
  assert.deepEqual(currentRound(g).revealed, [3, 7]);
  g = makeGuess(g, currentRound(g).kind);
  assert.equal(revealTile(g, 11), g);
});

test('guessing requires at least one revealed tile', () => {
  const g = game();
  assert.equal(canGuess(g), false);
  assert.equal(makeGuess(g, 'hotdog'), g);
  assert.equal(canGuess(reveal(g, [0])), true);
});

test('fewer tiles means more points, floored at the minimum', () => {
  assert.equal(potentialPoints(1), BASE_POINTS);
  assert.ok(potentialPoints(2) < potentialPoints(1));
  assert.equal(potentialPoints(TILE_COUNT), MIN_POINTS);
});

test('a correct one-tile guess banks full base points', () => {
  const g = makeGuess(reveal(game(), [0]), currentRound(game()).kind);
  assert.equal(g.score, BASE_POINTS);
  assert.equal(currentRound(g).correct, true);
  assert.equal(g.streak, 1);
});

test('a wrong guess scores zero and resets the streak', () => {
  let g = reveal(game(), [0]);
  const wrong = currentRound(g).kind === 'hotdog' ? 'imposter' : 'hotdog';
  g = { ...g, streak: 3 };
  g = makeGuess(g, wrong);
  assert.equal(currentRound(g).points, 0);
  assert.equal(g.score, 0);
  assert.equal(g.streak, 0);
  assert.equal(makeGuess(g, wrong), g, 'cannot guess twice');
});

test('the streak multiplier climbs and caps', () => {
  assert.equal(multiplierFor(0), 1);
  assert.equal(multiplierFor(2), 3);
  assert.equal(multiplierFor(99), MAX_MULTIPLIER);
  let g = game();
  for (let i = 0; i < ROUND_COUNT; i++) {
    g = makeGuess(reveal(g, [0]), currentRound(g).kind);
    if (i < ROUND_COUNT - 1) g = nextRound(g);
  }
  assert.equal(g.score, BASE_POINTS * (1 + 2 + 3 + 4 + 4), 'perfect game');
  assert.equal(isFinished(g), true);
  assert.equal(nextRound(g), g, 'cannot advance past the end');
});

test('rounds only advance after a guess', () => {
  const g = reveal(game(), [0]);
  assert.equal(nextRound(g), g);
  const judged = makeGuess(g, 'hotdog');
  assert.equal(nextRound(judged).index, 1);
});

test('every subject the engine can deal has a draw function, and vice versa', () => {
  assert.deepEqual(Object.keys(SUBJECT_ART).sort(), SUBJECTS.map(s => s.id).sort());
  for (const subject of SUBJECTS) for (let variant = 0; variant < 4; variant++) {
    assert.ok(SUBJECT_ART[subject.id](variant), `${subject.id} variant ${variant}`);
  }
});

test('every score maps to exactly one rank', () => {
  assert.equal(rankFor(0), 'Honorary Not-Hot-Dog');
  assert.equal(rankFor(10), 'Suspicious Sausage Intern');
  assert.equal(rankFor(1400), 'Certified Glizzard Wizard');
  for (const score of [0, 1, 299, 300, 599, 600, 999, 1000]) assert.equal(typeof rankFor(score), 'string');
});
