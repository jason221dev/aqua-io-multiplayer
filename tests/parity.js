'use strict';
const assert=require('node:assert/strict'),A=require('../aqua_sim');
const frames=Math.max(30,Number(process.env.FRAMES)||120);let comparisons=0;
const frame=i=>({fish:{mv:{x:Math.cos(i*.07),y:Math.sin(i*.03)*.15,z:Math.sin(i*.07)},tap:i%90===0?1:0}});
for(const mode of ['free','last']){
 const opts={seed:1967,mode,competitorCount:200,npcCount:0,maxTotalFish:200,slots:{fish:[{pid:'fish'}],fishers:[{pid:'angler'}]}};
 const a=A.create(),b=A.create();a.newMatch(opts);b.newMatch(opts);
 assert.deepStrictEqual(a.snapshot(),b.snapshot());
 for(let i=0;i<frames;i++){
   const input=frame(i);a.step(input,1/30);b.step(input,1/30);
   if(i%25===0||i===frames-1){assert.deepStrictEqual(a.snapshot(),b.snapshot());assert.deepStrictEqual(a.drainEvents(),b.drainEvents());comparisons++}
   if(i===Math.floor(frames/2)){const restored=A.create();restored.restore(JSON.parse(JSON.stringify(b.snapshot())));assert.deepStrictEqual(restored.snapshot(),b.snapshot());b.restore(restored.snapshot())}
 }
 console.log('PASS deterministic '+mode+' 200-fish simulation and snapshot recovery');
}
console.log('PASS',comparisons,'deterministic replay comparisons');
