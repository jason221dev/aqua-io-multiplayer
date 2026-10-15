'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Aqua=require('../aqua_sim');
let checks=0;
const test=(label,fn)=>{fn();checks++;console.log('PASS '+label)};
function fresh(mode='free'){
  const sim=Aqua.create();
  sim.newMatch({sp:'guppy',mode,seed:7,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'player',sp:'guppy',name:'Player'}]}});
  return {sim,me:sim.fishes.find(f=>f.pid==='player')};
}
function stepTo(sim,target,dt=.05){ while(sim.t+1e-9<target) sim.step({},Math.min(dt,target-sim.t)); }

test('Respawning fish wait in holding nets until the next 10-second batch drop',()=>{
  const {sim,me}=fresh();
  sim.kill(me,'caught');
  stepTo(sim,3.6);
  assert.equal(me.alive,false);
  assert.equal(me.holding,true);
  assert.equal(sim.respawnQueue.length,1);
  assert.equal(me.holdingSlot,0);
  stepTo(sim,9.95);
  assert.equal(me.alive,false);
  assert.equal(me.holding,true);
  assert.equal(sim.respawnQueue.length,1);
  stepTo(sim,10.01,.01);
  assert.equal(me.alive,true);
  assert.equal(me.holding,false);
  assert(me.prot>5.9 && me.prot<=Aqua.BALANCE.fishSpawnShield);
  assert(!sim.respawnQueue.some(q=>q.pid==='player'));
  assert(sim.respawnBatches.length>=1);
  assert.equal(me.air,true);
  assert(me.y<22);
});

test('Multiple queued fish dump together in the same respawn batch',()=>{
  const {sim,me}=fresh();
  const other=sim.fishes.find(f=>f!==me);
  sim.kill(me,'caught');
  stepTo(sim,1.0);
  sim.kill(other,'caught');
  stepTo(sim,3.6);
  assert.equal(sim.respawnQueue.length,1);
  stepTo(sim,4.6);
  assert.equal(sim.respawnQueue.length,2);
  stepTo(sim,10.01,.01);
  assert(!sim.respawnQueue.some(q=>q.pid==='player'));
  assert.equal(me.alive,true);
  assert.equal(other.alive,true);
  const dx=Math.abs(me.x-other.x),dz=Math.abs(me.z-other.z);
  assert(dx<140 && dz<140,'batch-released fish should drop into the same general area');
});

test('Observer fish never enters the respawn-net queue',()=>{
  const {sim,me}=fresh();
  assert.equal(sim.setObserver('player',true),true);
  stepTo(sim,35,.1);
  assert.equal(me.observing,true);
  assert.equal(me.alive,false);
  assert.equal(me.holding,false);
  assert(!sim.respawnQueue.some(q=>q.pid==='player'));
});

test('Client HUD and renderer reference respawn nets and batch countdowns',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert(html.includes('updateRespawnNets()'));
  assert(html.includes('SHARED RESPAWN NET · BATCH DROP IN'));
  assert(html.includes('respawnQueue=sim.respawnQueue||[]'));
  assert(html.includes('respawnDropRing'));
  assert.equal((html.match(/function buildSharedRespawnNet\(/g)||[]).length,1,'only one holding-net construction function');
  assert(html.includes('sharedRespawnNet=buildSharedRespawnNet()'),'holding-net singleton');
  assert(!html.includes('respawnNetPool'),'never create one net per fish');
  assert(html.includes('positionNetFish(net,holding)'),'all queued fish are instanced within one net');
});

test('Online transport preserves one shared net and queue for all fish',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 const motion=fs.readFileSync(path.join(__dirname,'..','motion_v2.js'),'utf8');
 assert(html.includes('sim.applyRespawnView(msg.rq,msg.rb,msg.rnext,msg.rpoint)'));
 assert(server.includes('rq:sim.respawnQueue.map(e=>({...e}))'));
 assert(server.includes('Object.assign(extra,respawnView)')); 
 assert(server.includes('base.rq=sim.respawnQueue'));
 assert(server.includes('f.holding?1:0'));
 assert(motion.includes("'spectateTarget','holding'"));
});
console.log(`${checks} respawn holding-net checks passed`);
