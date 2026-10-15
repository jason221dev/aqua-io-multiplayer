'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Aqua=require('../aqua_sim');
let checks=0;
const test=(label,fn)=>{fn();checks++;console.log('PASS '+label)};
function fresh(mode='free'){
 const sim=Aqua.create();sim.newMatch({sp:'guppy',mode,seed:4,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:20,slots:{fish:[{pid:'player',sp:'guppy',name:'Player'}]}});
 return {sim,me:sim.fishes.find(x=>x.pid==='player')};
}
test('Observer removes player fish from active fish competition and target pool',()=>{
 const {sim,me}=fresh();const initial=sim.fishes.filter(f=>f.alive).length;
 assert.equal(initial,200);
 assert.equal(sim.setObserver('player',true),true);
 assert.equal(me.observing,true);assert.equal(me.alive,false);assert.equal(me.respawn,Infinity);
 assert.equal(sim.fishes.filter(f=>f.alive).length,199);
 assert(!sim.fishes.some(f=>f.alive&&f.pid==='player'));
});
test('Observer never respawns automatically even after several minutes',()=>{
 const {sim,me}=fresh();sim.setObserver('player',true);
 for(let i=0;i<2500;i++)sim.step({player:{mv:{x:1,y:1,z:1},tap:1}},.1);
 assert.equal(me.alive,false);assert.equal(me.observing,true);assert.equal(me.respawn,Infinity);
 assert.equal(me.kills,0);assert.equal(me.fishEaten,0);
});
test('Observer switch is idempotent and refuses unknown or defeated fish',()=>{
 const {sim,me}=fresh();assert.equal(sim.setObserver('unknown',true),false);
 assert.equal(sim.setObserver('player',true),true);assert.equal(sim.setObserver('player',true),true);
 assert.equal(me.alive,false);
});
test('Free Roam return joins the shared respawn net instead of bypassing its animation',()=>{
 const {sim,me}=fresh();me.mass=720;me.peak=720;
 sim.setObserver('player',true);
 assert.equal(sim.setObserver('player',false),true);
 assert.equal(me.observing,false);assert.equal(me.alive,false);assert.equal(me.holding,true);
 assert(sim.respawnQueue.some(q=>q.pid==='player'));
 while(sim.t<10.02)sim.step({},Math.min(.05,10.02-sim.t));
 assert.equal(me.alive,true);assert.equal(me.mass,100);
 assert(me.prot>5.9);assert.equal(me.spectateTarget,-1);
});
test('Last Fish Standing spectator is a permanent forfeit until new match',()=>{
 const {sim,me}=fresh('last');
 assert.equal(sim.setObserver('player',true),true);
 assert.equal(sim.setObserver('player',false),false);
 for(let i=0;i<20;i++)sim.step({},.1);
 assert.equal(me.alive,false);assert.equal(me.observing,true);
});
test('Observer never gets awarded points for remaining a camera',()=>{
 const {sim,me}=fresh();me.mass=800;me.surv=100;sim.setObserver('player',true);
 assert.equal(sim.sides().fs[me.i],0);
});
test('Simulation protects observer from hook resolution and AI targeting',()=>{
 const {sim,me}=fresh();sim.setObserver('player',true);
 assert.equal(sim.predationProtected(me),true); // also ignored as a non-living target
 assert(!sim.fishes.some(f=>f.alive&&f.pid==='player'));
});
test('Observer tracks and restores a hooked fish without a dangling line',()=>{
 const {sim,me}=fresh();const fr=sim.fishers[0];
 fr.cast={state:'fight',fish:[me],tension:.3};me.hooked={fr};
 assert(sim.setObserver('player',true));assert.equal(me.hooked,null);
 assert.equal(fr.cast,null);
 assert(sim.setObserver('player',false));assert.equal(me.alive,false);assert.equal(me.holding,true);assert.equal(me.hooked,null);
});
test('Client calls authoritative observer API and preserves camera modes',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
 assert(html.includes('sim.setObserver(ME,true)'));assert(html.includes('sim.setObserver(ME,false)'));
 assert(html.includes('function observerFlight(dt)'));assert(html.includes('setObserverMode(\'largest\')'));
 assert(html.includes("'NEW MATCH':'JOIN NEXT NET DROP'"));
});
console.log(`${checks} true observer regression checks passed`);
