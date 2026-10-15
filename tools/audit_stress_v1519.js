const A=require('../aqua_sim');const {performance}=require('node:perf_hooks');const scenarios=[];
for (const mode of ['free','last'])for(const seed of [1,5]){
 const sim=A.create();sim.newMatch({sp:'guppy',mode,seed,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:30,slots:{fish:[{pid:'human',sp:'guppy'}]}});
 const start=performance.now();let netEvents=0;let nonFinite=0;let queueMax=0;
 for(let k=0;k<1200;k++){
  sim.step({},1/30);queueMax=Math.max(queueMax,sim.respawnQueue.length);
  for(const f of sim.fishes)if(!Number.isFinite(f.mass)||!Number.isFinite(f.x)||!Number.isFinite(f.y)||!Number.isFinite(f.z))nonFinite++;
  for(const e of sim.drainEvents())if(e.k==='net')netEvents++;
 }
 scenarios.push({mode,seed,elapsedMs:Math.round(performance.now()-start),t:sim.t,alive:sim.fishes.filter(f=>f.alive).length,queue:sim.respawnQueue.length,queueMax,netEvents,caught:sim.fishers.map(x=>x.caught),nonFinite});
}
console.log(JSON.stringify(scenarios,null,2));
