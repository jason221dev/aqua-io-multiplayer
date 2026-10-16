'use strict';
const A=require('../aqua_sim'),assert=require('node:assert/strict');
const results=[];
for(const mode of ['free','last','timed'])for(const seed of [1523,90210]){
 const sim=A.create();sim.newMatch({sp:'guppy',mode,seed,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:30,slots:{fish:[{pid:'audit',sp:'guppy'}]}});
 const start=performance.now();let ticks=0,maxQueue=0,maxMass=100;const events={};
 while(sim.t<600&&sim.state==='play'){
  sim.step({},1/30);ticks++;
  for(const e of sim.drainEvents())events[e.k]=(events[e.k]||0)+1;
  maxQueue=Math.max(maxQueue,sim.respawnQueue.length);
  for(const f of sim.fishes){for(const key of ['x','y','z','mass','vx','vy','vz'])assert(Number.isFinite(f[key]),`${mode} ${seed} ${key}`);assert(f.mass>0);maxMass=Math.max(maxMass,f.mass);}
  if(mode==='last')assert.equal(sim.respawnQueue.length,0);
 }
 results.push({mode,seed,ticks,simSeconds:+sim.t.toFixed(3),wallMs:Math.round(performance.now()-start),state:sim.state,alive:sim.fishes.filter(f=>f.alive).length,maxQueue,maxMass:Math.round(maxMass),events});
}
console.log(JSON.stringify(results,null,2));
