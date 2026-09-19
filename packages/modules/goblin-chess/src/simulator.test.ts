import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hadamardProbabilities, measure, simulateOracle } from './simulator';
function memory() { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } }; }
test('eight Hadamards preserve normalization and create 256 equiprobable outcomes', () => {
  const p = hadamardProbabilities();
  assert.equal(p.length, 256);
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  p.forEach(probability => assert.ok(Math.abs(probability - 1 / 256) < 1e-14));
});
test('Born sampling gives independent faction/color and 1-in-8 endings', () => {
  const assignments = [0, 0, 0, 0], winners = [0, 0];
  for (let i = 0; i < 256; i++) {
    const bits = measure((i + .5) / 256);
    assignments[bits[0] + 2 * bits[1]]++;
    if (bits.slice(0, 3).every(b => b === 0)) winners[bits[3]]++;
  }
  assert.deepEqual(assignments, [64, 64, 64, 64]); assert.deepEqual(winners, [16, 16]);
});
test('simulated assignments and verdicts stay fixed on retry/reload', () => {
  const store = memory(); let samples = 0; const sample = () => { samples++; return .5 / 256; };
  const start = { action: 'start' as const, session: 'test', seq: 0 };
  assert.equal(simulateOracle(start, store, sample).proof.source, 'simulator');
  simulateOracle(start, store, sample); assert.equal(samples, 1);
  const end = { action: 'verdict' as const, session: 'test', seq: 1, round: 6, declaration: false };
  const first = simulateOracle(end, store, sample);
  assert.equal(first.ended, true); assert.equal(first.winner, 'w');
  assert.deepEqual(simulateOracle(end, store, sample), first); assert.equal(samples, 2);
  assert.throws(() => simulateOracle({ ...end, seq: 2, round: 7 }, store, sample));
});
test('round gate rejects early checks but permits a forced declaration', () => {
  const store = memory(); simulateOracle({ action: 'start', session: 'test', seq: 0 }, store, () => .5);
  const request = { action: 'verdict' as const, session: 'test', seq: 1, round: 1, declaration: false };
  assert.throws(() => simulateOracle(request, store, () => .5));
  const end = simulateOracle({ ...request, declaration: true }, store, () => 8.5 / 256);
  assert.equal(end.ended, true); assert.equal(end.winner, 'b');
});
test('hardware handoff continues the event sequence and caches the fallback verdict', async () => {
  const { continueInSimulator, hasSimulation } = await import('./simulator');
  const store = memory();
  continueInSimulator('hardware-session', 4, store);
  assert.equal(hasSimulation('hardware-session', store), true);
  const request = { action: 'verdict' as const, session: 'hardware-session', seq: 5, round: 10, declaration: false };
  const result = simulateOracle(request, store, () => 1.5 / 256);
  assert.equal(result.ended, false);
  continueInSimulator('hardware-session', 0, store);
  assert.deepEqual(simulateOracle(request, store, () => .5 / 256), result);
  assert.throws(() => simulateOracle({ ...request, seq: 7 }, store));
  assert.equal(simulateOracle({ ...request, seq: 6, round: 11, declaration: true }, store, () => 8.5 / 256).winner, 'b');
});
