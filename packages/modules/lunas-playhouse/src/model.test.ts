import { test } from 'node:test';
import assert from 'node:assert/strict';
import { place, sanitize, pathTo, nodes } from './model';
test('moving preserves a unique object and occupied spots select a free neighbor',()=>{
 const a=place({},'banig','f02');const b=place(a,'boots','f02');assert.notEqual(b.boots,b.banig);
 const c=place(b,'banig','f22');assert.equal(Object.keys(c).length,2);assert.equal(c.banig,'f22');
 assert.deepEqual(place(c,'capiz','f22'),c);
});
test('save validation rejects unknown, duplicate and wrong-category placements',()=>{
 assert.deepEqual(sanitize({banig:'f02',boots:'f02',capiz:'f22',guitar:'missing',unknown:'s0'}),{banig:'f02'});
 assert.deepEqual(sanitize(null),{});
});
test('full surfaces do not discard or duplicate a toy',()=>{
 const state={capiz:'s0',carabao:'s1',alebrije:'s2',armadillo:'s3'};
 assert.equal(place(state,'talavera','s0'),state);
});
test('walking paths stay out of furniture and occupied floor items',()=>{
 const route=pathTo({x:0,z:2},{x:-1.8,z:-1.7},{boots:'f22'});
 assert.ok(route.length>0);
 for(const p of route){assert.ok(!(p.z < -1.05&&(p.x<-.45||p.x>.7)));const n=nodes.find(n=>n.id==='f22')!;assert.ok(Math.hypot(n.x-p.x,n.z-p.z)>=.53);}
});
test('wall spots face inward and exclude overlapping floor neighbors',()=>{
 const state=place({},'chair','edge1_1');assert.equal(state.chair,'edge1_1');assert.equal(nodes.find(n=>n.id===state.chair)?.facing,3);
 const next=place(state,'bookcase','f43');const a=nodes.find(n=>n.id===next.chair)!,b=nodes.find(n=>n.id===next.bookcase)!;
 assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=.85);
});
test('rotation saves normalize quarter turns and reject malformed values',async()=>{
 const {sanitizeRotations}=await import('./model');assert.deepEqual(sanitizeRotations({chair:5,books:-1,clock:'bad',unknown:2}),{chair:1,books:3});
});
