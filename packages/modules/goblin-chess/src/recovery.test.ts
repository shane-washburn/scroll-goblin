import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialChaos, applyChaos, type ChaosState } from './game';
import { backupChaosAction, recoverChaosTurn } from './recovery';

test('invalid proposals are corrected automatically against the unchanged board', async () => {
  const state = initialChaos(), before = structuredClone(state), errors: (string | undefined)[] = [];
  const action = await recoverChaosTurn(state, async error => {
    errors.push(error);
    return errors.length < 3 ? { kind:'move',from:'a8',to:'a7',comment:'Rejected comment' } : { kind:'move',from:'e2',to:'e4',comment:'Accepted comment' };
  }, () => false);
  assert.equal(errors.length,3);assert.match(errors[1]!,/Choose one/);
  assert.equal(action?.comment,'Accepted comment');assert.deepEqual(state,before);
  const next=applyChaos(state,action!,false);assert.equal(next.ply,1);assert.equal(next.cheats,3);
});
test('three unusable proposals produce a valid backup, without fabricated banter', async () => {
  const state=initialChaos();let calls=0;
  const action=await recoverChaosTurn(state,async()=>{calls++;return {kind:'resurrect',piece:'q',to:'e4'};},()=>false);
  assert.equal(calls,3);assert.equal(action?.kind,'move');assert.equal(action?.comment,undefined);
  const next=applyChaos(state,action!,false);assert.equal(next.turn,'b');assert.equal(next.ply,1);assert.equal(next.cheats,3);
});
test('blocked pieces can use a backup teleport; no pieces summon the Universe',()=>{
  const state:ChaosState={pieces:[{square:'a8',type:'p',color:'w'}],captured:[],turn:'w',ply:4,cheats:2};
  const action=backupChaosAction(state);assert.equal(action.kind,'teleport');assert.equal(applyChaos(state,action,false).ply,5);
  assert.equal(backupChaosAction({...state,pieces:[]}).kind,'declare');
});
test('leaving a match prevents further requests or a backup action',async()=>{
  let cancelled=false,calls=0;
  const action=await recoverChaosTurn(initialChaos(),async()=>{calls++;cancelled=true;return {kind:'move',from:'a8',to:'a7'};},()=>cancelled);
  assert.equal(action,null);assert.equal(calls,1);
});
test('service failures are not retried as if they were bad chess proposals',async()=>{
  let calls=0;await assert.rejects(recoverChaosTurn(initialChaos(),async()=>{calls++;throw new Error('Rate limited');},()=>false),/Rate limited/);assert.equal(calls,1);
});
