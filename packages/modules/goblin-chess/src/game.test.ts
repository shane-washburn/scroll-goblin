import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyChaos, canMove, initialChaos, normalEnding, type ChaosState } from './game';
import { Chess } from 'chess.js';
test('normal human moves obey geometry and blockers without spending a cheat', () => {
  const s = initialChaos();
  assert.equal(canMove(s, 'e2', 'e4'), true);
  assert.equal(canMove(s, 'a1', 'a5'), false);
  assert.equal(canMove(s, 'b1', 'c3'), true);
  assert.equal(canMove(s, 'e2', 'f3'), false);
  const n = applyChaos(s, { kind: 'move', from: 'e2', to: 'e4' }, true);
  assert.equal(n.turn, 'b'); assert.equal(n.cheats, 3); assert.equal(n.ply, 1);
  assert.equal(s.pieces.find(p => p.square === 'e2')?.type, 'p');
});
test('teleport captures and consumes a turn and exactly one cheat', () => {
  const s = applyChaos(initialChaos(), { kind: 'teleport', from: 'a2', to: 'a8' }, true);
  assert.equal(s.cheats, 2); assert.equal(s.captured[0].type, 'r');
  assert.equal(s.pieces.find(p => p.square === 'a8')?.color, 'w');
  assert.throws(() => applyChaos({ ...s, cheats: 0 }, { kind: 'teleport', from: 'b7', to: 'b3' }, true));
});
test('LLM can violate movement rules without consuming the human cheats', () => {
  const s = applyChaos(initialChaos(), { kind: 'move', from: 'a1', to: 'h6' }, false);
  assert.equal(s.cheats, 3); assert.equal(s.pieces.find(p => p.square === 'h6')?.type, 'r');
});
test('resurrection requires an owned captured piece and an empty square', () => {
  const s: ChaosState = { ...initialChaos(), captured: [{ square: 'c1', color: 'w', type: 'b' }] };
  assert.throws(() => applyChaos(s, { kind: 'resurrect', piece: 'q', to: 'e5' }, true));
  assert.throws(() => applyChaos(s, { kind: 'resurrect', piece: 'b', to: 'e2' }, true));
  const n = applyChaos(s, { kind: 'resurrect', piece: 'b', to: 'e5' }, true);
  assert.equal(n.captured.length, 0); assert.equal(n.cheats, 2);
});
test('king transformations and friendly captures are rejected', () => {
  const s = initialChaos();
  assert.throws(() => applyChaos(s, { kind: 'transform', from: 'e1', piece: 'q' }, true));
  assert.throws(() => applyChaos(s, { kind: 'transform', from: 'a2', piece: 'k' }, true));
  assert.throws(() => applyChaos(s, { kind: 'teleport', from: 'a1', to: 'b1' }, false));
  assert.throws(() => applyChaos(s, { kind: 'teleport', from: 'a1', to: 'z9' }, false));
});
test('checkmate and stalemate have distinct results', () => {
  const c = new Chess(); ['f3', 'e5', 'g4', 'Qh4#'].forEach(m => c.move(m));
  assert.equal(normalEnding(c), 'Black wins by checkmate.');
  assert.equal(normalEnding(new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1')), 'Draw by stalemate.');
});
