'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Aqua=require('../aqua_sim_mobile_v155'),Octo=require('../octopus_v158');
function make(){
 const sim=Octo.decorate(Aqua);
 sim.newMatch({sp:'guppy',seed:17,npcCount:0,miniFishCount:0,competitorCount:24,maxTotalFish:24,mode:'free',slots:{fish:[{pid:'human',sp:'guppy'}]}});
 for(let i=0;i<sim.fishes.length;i++){const f=sim.fishes[i];f.x=1700+(i%8)*330;f.y=200;f.z=-500+Math.floor(i/8)*330;f.vx=f.vy=f.vz=0;f.prot=0;f.wt=5;f.wx=f.wy=f.wz=0;f.mass=100;}
 for(const fr of sim.fishers)fr.cd=1e9;
 return sim;
}
function setup(sim){const f=sim.fishes[0];Object.assign(f,{x:1000,y:872,z:0,vx:0,vy:0,vz:0,mass:1800,prot:0});sim.setOctopusState({x:870,y:878,z:0,face:'floor',cd:0,mode:'hunt',target:-1});return f}
{
 const sim=make(),fish=setup(sim),outsider=sim.fishes[23];outsider.mass=5;
 for(let i=1;i<23;i++)sim.fishes[i].mass=130+i;
 for(let i=0;i<500;i++)sim.step({human:{mv:{x:0,y:0,z:0}}},1/30);
 assert((fish.octoHits||0)>=1,'Top-ranked fish gets attacked');
 assert(fish.mass<=900,'Successful contact removes half the mass');
 assert.equal(sim.octopus.hits,1,'Cooldown prevents repeated immediate attacks');
 assert.equal(outsider.octoHits||0,0,'Out-of-ranking fish not attacked');
}
{
 const sim=make(),f=setup(sim);f.prot=3;sim.idle(12.01);
 for(let i=0;i<55;i++)sim.step({human:{mv:{x:0,y:0,z:0}}},1/30);
 assert.equal(f.mass,1800,'Spawn shield blocks octopus');
}
{
 const sim=make(),f=setup(sim);f.sp='puffer';f.abilT=2.2;sim.idle(12.01);
 for(let i=0;i<50;i++)sim.step({human:{mv:{x:0,y:0,z:0}}},1/30);
 assert.equal(f.mass,1800,'Puffer inflation is protective');
}
{
 const sim=make();setup(sim);sim.step({human:{mv:{x:0,y:0,z:0}}},1/30);
 const snap=sim.snapshot(),copy=Octo.decorate(Aqua);copy.restore(snap);assert.deepEqual(copy.octopus,sim.octopus);
}
const html=fs.readFileSync(path.join(__dirname,'../fisherman-mobile-v158.html'),'utf8');
assert(html.includes('AquaOctopus.decorate(Aqua)')&&html.includes('octopus_visual_v158.js'));
console.log('PASS Octopus v1.5.8: ranked targeting, 50% mass penalty, cooldown, shields, puffer, snapshots, client integration');
