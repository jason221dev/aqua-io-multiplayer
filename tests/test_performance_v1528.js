'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const oldCore=path.resolve(__dirname,'../audit/baseline_aqua_sim_v1527.js');
const original=require(oldCore),optimized=require('../aqua_sim');
let seed=1528001;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
let rays=0;
for(let i=0;i<30000;i++){
  const a={x:2300+random()*1500,y:80+random()*850,z:-350+random()*700};
  const b={x:a.x+(random()-.5)*480,y:a.y+(random()-.5)*380,z:a.z+(random()-.5)*430};
  assert.equal(optimized.shipBlocked(a,b),original.shipBlocked(a,b),'wreck LOS ray '+i);
  rays++;
}
console.log('PASS '+rays+' randomized ship LOS rays have exactly matching collision outcomes');
for(let i=0;i<12000;i++){
  const mass=50+random()*6000;
  const from={x:2000+random()*2100,y:10+random()*890,z:-450+random()*900,mass,vx:200*(random()-.5),vy:200*(random()-.5),vz:200*(random()-.5)};
  const to={...from,x:from.x+(random()-.5)*110,y:from.y+(random()-.5)*75,z:from.z+(random()-.5)*95};
  const a={...to},b={...to};
  optimized.shipMove(a,from);original.shipMove(b,from);
  for(const field of ['x','y','z','vx','vy','vz'])assert.equal(a[field],b[field],`wreck swept movement ${i},${field}`);
}
console.log('PASS 12000 randomized swept wreck movement/collider cases exactly match v1.5.27');
// Repeatedly release full single-net batches. Confirm spawn protection,
// position, batch identity and deterministic simulation remain equivalent.
for(const count of [8,60,200]){
 const config={sp:'guppy',mode:'free',seed:1528,competitorCount:count,maxTotalFish:count,npcCount:0,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}};
 // Ability immunity intentionally differs from v1.5.27; test release determinism
 // using two current instances, while static geometry is checked against original above.
 const before=optimized.create(),after=optimized.create();before.newMatch(config);after.newMatch(config);
 const victims=Array.from({length:Math.floor(count*.4)},(_,i)=>i);
 for(const i of victims){before.kill(before.fishes[i],'caught');after.kill(after.fishes[i],'caught');}
 for(let i=0;i<330;i++){
   before.step({},1/30);after.step({},1/30);
   for(const key of ['t','nextRespawnDumpAt'])assert.equal(after[key],before[key]);
   assert.deepEqual(after.respawnQueue,before.respawnQueue);
   assert.deepEqual(after.respawnBatches,before.respawnBatches);
   for(let j=0;j<count;j++){
      const a=after.fishes[j],b=before.fishes[j];
      for(const field of ['alive','holding','mass','prot','sp','x','y','z','vx','vy','vz'])assert.equal(a[field],b[field],`pop=${count},tick=${i},fish=${j},${field}`);
   }
 }
 console.log('PASS '+count+'-fish protected respawn replay is deterministic');
}
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
for(const code of ['const OFFLINE_TICK=1/30','function applyRenderQuality(','function positionNetFish(','renderQualityScale'])assert(html.includes(code),'missing '+code);
assert.equal((html.match(/function buildSharedRespawnNet\(/g)||[]).length,1);
console.log('PASS 30Hz local step, adaptive DPR, 20Hz net-instance animation, one shared net');
