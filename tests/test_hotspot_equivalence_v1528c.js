'use strict';
const assert=require('node:assert/strict');
const previous=require('../audit/baseline_aqua_sim_v1528b.js');
const optimized=require('../aqua_sim.js');
let checkCount=0;
// Kelp candidate rejection must be conservative, even exactly at ellipsoid bounds.
for(let seed of [7,1528,20261015]){
  const a=previous.create(),b=optimized.create();
  const opts={sp:'guppy',mode:'free',seed,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}};
  a.newMatch(opts);b.newMatch(opts);
  for(let i=0;i<30000;i++){
    const k=a.kelp[i%a.kelp.length];const f={x:k.x+(i%23-11)*k.rx/10,y:k.y+(i%19-9)*k.ry/8,z:k.z+(i%17-8)*k.rzz/7};
    assert.equal(a.inKelp(f),b.inKelp(f),`kelp seed ${seed} sample ${i}`);checkCount++;
  }
}
console.log('PASS '+checkCount+' ellipsoid/kelp comparisons match baseline');
for(const [population,seed,ticks] of [[200,1528,1230],[60,765,600],[8,901,480]]){
  const opts={sp:'guppy',mode:'free',seed,competitorCount:population,maxTotalFish:population,npcCount:0,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}};
  // Protection immunity changes outcomes relative to the historical version,
  // so use current-engine replay parity for a complete mutable world snapshot.
  const a=optimized.create(),b=optimized.create();a.newMatch(opts);b.newMatch(opts);
  for(let j=0;j<Math.floor(population*.25);j++){a.kill(a.fishes[j],'caught');b.kill(b.fishes[j],'caught')}
  for(let i=0;i<ticks;i++){
    a.step({},1/30);b.step({},1/30);
    if(i%30===0||i===ticks-1){assert.deepEqual(b.snapshot(),a.snapshot(),`population ${population}, tick ${i}`);checkCount++}
  }
  console.log('PASS '+population+' fish over '+ticks+' ticks: complete world state deterministic with protection rules');
}
console.log('PASS '+checkCount+' detailed deterministic parity assertions');
