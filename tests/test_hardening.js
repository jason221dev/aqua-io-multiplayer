'use strict';
const assert = require('node:assert/strict');
const A=require('../aqua_sim.js');
const s=A.create();
const config={sp:'__proto__',seed:1,npcCount:1e9,slots:{fish:[{pid:'p',sp:'constructor'}],fishers:[{pid:'r'}]}};
s.newMatch(config);
assert.equal(s.fishes[0].sp,'guppy');
assert.equal(s.npcs.length,2000);
const snap=JSON.stringify(s.snapshot());
for(const dt of [NaN,Infinity,-Infinity,-1]){s.step({},dt);assert.equal(JSON.stringify(s.snapshot()),snap,'Invalid dt mutated room')}
const frames=Object.create({p:{mv:{x:1,y:0,z:0},tap:4},r:{ev:[{t:'cast',lure:'goldfish'}]}});
s.step(frames,1/60);
assert.equal(s.fishers[0].cast,null,'inherited fisher input used');
assert.ok(s.fishes[0].abilCD<=0,'inherited fish tap used');
const d=A.create();d.newMatch({seed:5,npcCount:50,sp:'koi',slots:{fish:[{pid:'p',sp:'koi'}]}});
assert.equal(d.npcs.length,50);assert.equal(d.fishes[0].sp,'koi');
const snap2=JSON.parse(JSON.stringify(d.snapshot()));const e=A.create();e.restore(snap2);assert.deepEqual(d.snapshot(),e.snapshot());
console.log('PASS invalid dt, forged inherited inputs, unsupported species, bounded NPC allocation, supported species, snapshot restore');
