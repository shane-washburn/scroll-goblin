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
test('chaos checkmate forces a verdict before round six even with cheats remaining', async()=>{
 const {chaosCheckmate,chaosVerdictRequest,piecesOf}=await import('./game');
 const c=new Chess();['f3','e5','g4'].forEach(m=>c.move(m));
 const before={...initialChaos(),pieces:piecesOf(c),turn:'b' as const,ply:3};
 const action={kind:'move' as const,from:'d8',to:'h4'};
 const after=applyChaos(before,action,false);
 assert.equal(chaosCheckmate(after),true);
 assert.deepEqual(chaosVerdictRequest(after,action),{round:2,declaration:true});
 assert.equal(after.cheats,3);
});
test('ordinary check and stalemate do not force the Universe; either color can be mated',async()=>{
 const {chaosCheckmate,piecesOf}=await import('./game');
 for(const [fen,mate] of [
 ['4k3/8/8/8/8/8/4R3/4K3 b - - 0 1',false],
 ['7k/5K2/6Q1/8/8/8/8/8 b - - 0 1',false],
 ['7k/6Q1/5K2/8/8/8/8/8 b - - 0 1',true],
 ['4k3/8/8/8/8/8/4r3/4K3 w - - 0 1',false],
 ] as const){const c=new Chess(fen);assert.equal(chaosCheckmate({...initialChaos(),pieces:piecesOf(c),turn:c.turn()}),mate,fen);}
});
test('memory records cheats and captures accurately, keeping only four accepted comments',async()=>{
 const {rememberChaos,readChaosMemory}=await import('./game');
 const s=initialChaos();let memory=rememberChaos(undefined,s,{kind:'teleport',from:'b1',to:'b8'},true);
 assert.match(memory.human_last_action,/used a cheat: teleported White Knight from b1 to b8, capturing Black Knight/);
 for(let i=0;i<6;i++)memory=rememberChaos(memory,s,{kind:'move',from:'a7',to:'a6',comment:`Portal joke ${i}`},false);
 assert.deepEqual(memory.recent_banter,['Portal joke 2','Portal joke 3','Portal joke 4','Portal joke 5']);
 assert.match(memory.human_last_action,/teleported/);
 const saved=readChaosMemory(JSON.parse(JSON.stringify(memory)));assert.deepEqual(saved,memory);
 const normal=rememberChaos(memory,s,{kind:'move',from:'e2',to:'e4'},true);assert.equal(normal.human_last_action,'Human moved White Pawn from e2 to e4.');
 assert.deepEqual(readChaosMemory(),{human_last_action:'No human action recorded yet.',recent_banter:[]});
});
