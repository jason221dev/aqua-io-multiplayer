'use strict';
const assert=require('node:assert/strict'),Aqua=require('../aqua_sim_mobile_ability_pass2');
const species=Object.keys(Aqua.SP);
const total=200,seconds=Number(process.env.SOAK_SECONDS||60),seed=Number(process.env.SOAK_SEED||101),FPS=30;
const slots={fish:Array.from({length:total},(_,i)=>({sp:species[i%species.length]}))};
const sim=Aqua.create();sim.newMatch({seed,mode:'free',competitorCount:total,maxTotalFish:total,npcCount:0,miniFishCount:30,slots});
assert.equal(sim.state,'play');
assert.equal(sim.fishes.length,total);
const begin=process.hrtime.bigint();
for(let i=0;i<seconds*FPS;i++){
 sim.step({},1/FPS);
 if(i%60===0){
  for(const f of sim.fishes){
   assert(Number.isFinite(f.mass)&&f.mass>=0&&f.mass<=10000,'Fish runaway mass');
   assert([f.x,f.y,f.z,f.vx,f.vy,f.vz,f.abilT,f.abilCD].every(Number.isFinite),'Fish NaN motion/ability state');
  }
  for(const p of sim.plank)assert([p.x,p.y,p.z].every(Number.isFinite),'Plankton runaway position');
 }
}
const result={seed,simulationSeconds:seconds,frames:seconds*FPS,
 elapsedWallSeconds:Number(process.hrtime.bigint()-begin)/1e9,
 totalFish:sim.fishes.length,aliveFish:sim.fishes.filter(f=>f.alive).length,
 species:species.map(sp=>{
  const fish=sim.fishes.filter(f=>f.sp===sp);
  return{sp,n:fish.length,alive:fish.filter(f=>f.alive).length,
   meanMass:+(fish.reduce((a,f)=>a+f.mass,0)/fish.length).toFixed(1),
   maxMass:Math.round(Math.max(...fish.map(f=>f.mass))),
   captures:fish.reduce((a,f)=>a+(f.fishEaten||0),0)}
 })};
console.log(JSON.stringify(result,null,2));
console.log('PASS species soak: 200 competitors, fishers, 30 edible minnows, finite simulation and mass');
