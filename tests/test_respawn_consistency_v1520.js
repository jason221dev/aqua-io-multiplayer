'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Aqua=require('../aqua_sim');
let count=0;
function check(label, fn){fn();count++;console.log('PASS '+label)}
function game(mode='free', count=12){
  const sim=Aqua.create();sim.newMatch({sp:'guppy',mode,seed:227,competitorCount:count,maxTotalFish:count,
    npcCount:0,miniFishCount:0,slots:{fish:[{pid:'me',sp:'guppy'}]}});
  return {sim,fish:sim.fishes[0]};
}
function advance(sim,end){
  let guard=0;
  while(sim.t<end-1e-8){if(++guard>20000)throw new Error('advance overflow');sim.step({},Math.min(.04,end-sim.t));}
}
check('Fish whose death timer ends at the 10s boundary belongs to that batch',()=>{
  const {sim,fish}=game();advance(sim,6.5);sim.kill(fish,'caught');
  advance(sim,9.98);assert.equal(fish.holding,false);
  advance(sim,10.01);
  assert.equal(fish.alive,true);assert.equal(fish.holding,false);
  assert(sim.respawnBatches.some(b=>b.items.some(q=>q.i===fish.i)));
});
check('After drop, full six-second spawn protection starts on water entry',()=>{
  const {sim,fish}=game();sim.kill(fish,'caught');advance(sim,10.01);
  assert.equal(fish.air,true);assert.equal(fish.spawnSplashPending,true);
  const initial=fish.prot;
  while(fish.air&&sim.t<12)sim.step({},.02);
  assert.equal(fish.air,false);assert.equal(fish.spawnSplashPending,false);
  assert(Math.abs(fish.prot-6)<1e-8,'six full seconds at splash');
  assert(fish.prot>=initial-1e-8);
  advance(sim,sim.t+1);
  assert(fish.prot<5.05&&fish.prot>4.9);
});
check('Normal mid-match airborne jump does not refresh the spawn shield',()=>{
  const {sim,fish}=game();fish.air=true;fish.y=-16;fish.vy=220;fish.prot=-1;
  fish.spawnSplashPending=false;
  sim.step({},.2);
  assert.equal(fish.air,false);assert(fish.prot<0);
});
check('Observer re-entry joins same queued net rather than spawning directly underwater',()=>{
  const {sim,fish}=game();sim.setObserver('me',true);
  assert.equal(sim.setObserver('me',false),true);
  assert.equal(fish.alive,false);assert.equal(fish.observing,false);
  assert.equal(fish.holding,true);assert.equal(sim.respawnQueue.length,1);
  advance(sim,10.01);assert.equal(fish.alive,true);assert(fish.y<0);
});
check('Fish that becomes eligible while net returns remains in visible shared queue',()=>{
  const {sim,fish}=game();const next=sim.fishes[1];
  sim.kill(fish,'caught');advance(sim,7.0);
  sim.kill(next,'caught'); // Eligible at t=10.5 during return from first batch
  advance(sim,10.55);
  assert.equal(fish.alive,true);assert.equal(next.holding,true);
  assert.equal(sim.respawnQueue.length,1);
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert(html.includes('if(holding.length)positionNetFish(net,holding)'));
  assert(html.includes('net.fishLayer.visible=holding.length>0;'));
});
check('One deterministic net pose drives both camera and rendering, maintaining camera continuity',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.equal((html.match(/function buildSharedRespawnNet\(/g)||[]).length,1);
  assert.equal((html.match(/function sharedRespawnNetPose\(/g)||[]).length,1);
  assert(html.includes('if(human.holding){const n=sharedRespawnNetPose()'));
  assert(html.includes('const rack=RESPAWN_NET_RACK,pose=sharedRespawnNetPose();'));
  assert(html.includes('net.group.position.set(pose.x,pose.y,pose.z);'));
  assert(html.includes('d.scale.setScalar(2.8/net.size)'));
});
check('Mass holding queue uses one authoritative release and six-second protections',()=>{
  const {sim}=game('free',200);
  for(const f of sim.fishes)sim.kill(f,'caught');
  advance(sim,4);assert.equal(sim.respawnQueue.length,200);
  advance(sim,10.01);
  const b=sim.respawnBatches.at(-1);
  assert.equal(b.items.length,200);assert.equal(sim.respawnQueue.length,0);
  assert.equal(sim.fishes.filter(f=>f.alive&&f.air&&f.spawnSplashPending).length,200);
  assert(sim.fishes.every(f=>f.prot>5.9));
});
check('Last Fish Standing has no net, queued fish, or resurrection',()=>{
  const {sim,fish}=game('last');sim.kill(fish,'caught');advance(sim,30);
  assert.equal(fish.alive,false);assert.equal(sim.respawnQueue.length,0);
  assert.equal(sim.respawnBatches.length,0);
});
check('Timed Apex cancels a pending holding net rather than spawning after the cutoff',()=>{
  const {sim,fish}=game('timed');advance(sim,237.0);
  sim.kill(fish,'caught');advance(sim,239.95);assert.equal(fish.alive,false);
  // Catch timer reaches readiness after the Apex phase begins at 240.0.
  advance(sim,244);
  assert.equal(fish.alive,false);assert.equal(fish.holding,false);
  assert.equal(sim.respawnQueue.length,0);
});
check('Snapshot retains falling-fish protection flag for deterministic multiplayer recovery',()=>{
  const {sim}=game();sim.kill(sim.fishes[0],'caught');advance(sim,10.01);
  const snap=sim.snapshot(),clone=Aqua.create();clone.restore(snap);
  assert.equal(clone.fishes[0].spawnSplashPending,true);
  assert.deepEqual(clone.respawnBatches,sim.respawnBatches);
  assert.deepEqual(clone.nextRespawnPoint,sim.nextRespawnPoint);
});
console.log(`${count} shared net animation and respawn consistency tests passed`);
