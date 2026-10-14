'use strict';
const assert = require('node:assert/strict');
const baseline=require('./aqua_sim_baseline.js');
const improved=require('../aqua_sim.js');
const count=+(process.env.FRAMES||600),npcCount=+(process.env.NPCS||320);
let comparisons=0;
function inputs(role,i){
 const fish={mv:{x:Math.cos(i*.028),y:.24*Math.sin(i*.035),z:Math.sin(i*.028)},tap:i%100===0?1:0};
 const fisher={mode:i%550<275?'aim':'boat',stick:{x:.2*Math.sin(i*.02),y:.55},rod:(1+Math.sin(i*.03))/2,roll:0,drag:.35,
   reel:{down:i%37===0,up:i%37===24,strokes:[i%4===0?13:0]},ev:i%550===0?[{t:'cast',lure:'goldfish'}]:[]};
 return role==='both'?{fish,fisher}:role==='fish'?{fish}:{fisher};
}
for(const role of ['fish','fisher','both']){
 const a=baseline.create(),b=improved.create();
 const opts={sp:'goldfish',quick:false,auto:false,seed:1034,npcCount,nurseryProtect:role!=='fisher',slots:{fish:role==='fisher'?[]:[{pid:'fish',sp:'goldfish'}],fishers:role==='fish'?[]:[{pid:'fisher'}]}};
 a.newMatch(opts);b.newMatch(opts);assert.deepStrictEqual(a.snapshot(),b.snapshot());
 for(let i=0;i<count;i++){
   const frame=inputs(role,i);
   a.step(frame,1/60);b.step(frame,1/60);
   // Full state, RNG seed and reference graph are checked at each checkpoint.
   if(i%60===0||i===count-1){
     assert.deepStrictEqual(b.snapshot(),a.snapshot(),`${role} diverged at frame ${i}`);
     assert.deepStrictEqual(b.drainEvents(),a.drainEvents(),`${role} events diverged at frame ${i}`);
     comparisons++;
   }
 }
 console.log('PASS',role,count,'frames, bit-for-bit state and event parity');
}
console.log(comparisons,'snapshots compared; no gameplay differences');
