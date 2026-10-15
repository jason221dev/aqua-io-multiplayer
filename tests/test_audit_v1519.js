'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const A=require('../aqua_sim');
const MV=require('../motion_v2');
const {server,issueBinaryMotion}=require('../server');
let checks=0;
function test(label,run){run();checks++;console.log('PASS '+label)}
function fresh(mode='free',seed=11){
  const sim=A.create();sim.newMatch({sp:'guppy',mode,seed,competitorCount:25,maxTotalFish:25,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'watcher',sp:'guppy',name:'watcher'}]}});
  return sim;
}
function progress(sim,until){while(sim.t<until-1e-7)sim.step({},Math.min(.05,until-sim.t));}
function motionHarness(mode){
  const sim=fresh(mode),victim=sim.fishes[0],killer=sim.fishes[1];
  victim.x=220;victim.z=0;killer.x=4800;killer.z=50;
  sim.kill(victim,'eaten',killer);
  const result=[];
  const client={pid:'watcher',role:'fish',motionV2:null,ws:{closed:false,socket:{writableLength:0},sendBinary(data){result.push(MV.decode(data));}}};
  const room={sim,tick:0,users:new Map([['watcher',client]])};
  issueBinaryMotion(room,100000,true,true,true);
  assert(result[0].f.some(record=>record[0]===killer.i),'initial full fish state sent');
  assert(result[0].rpoint&&Number.isFinite(result[0].rpoint.x),'respawn target synced to multiplayer clients');
  killer.x+=15;killer.vx=210;room.tick++;
  issueBinaryMotion(room,100065,false,false,false);
  return{sim,victim,killer,result};
}
test('Last Fish Standing predator across aquarium gets 65ms motion, not 360ms distant cadence',()=>{
  const {killer,result}=motionHarness('last');
  assert(result[1].f.some(record=>record[0]===killer.i),'current followed predator is transmitted immediately');
});
test('Free Roam six-second eater replay also uses close-field motion cadence',()=>{
  const {killer,result}=motionHarness('free');
  assert(result[1].f.some(record=>record[0]===killer.i),'followed eater must be transmitted immediately');
});
test('Ordinary distant fish remain rate-limited to protect bandwidth',()=>{
  const sim=fresh('free');const victim=sim.fishes[0],killer=sim.fishes[1],other=sim.fishes[2];
  victim.x=200;killer.x=5000;other.x=4900;
  sim.kill(victim,'eaten',killer);
  const packets=[],client={pid:'watcher',role:'fish',ws:{closed:false,socket:{writableLength:0},sendBinary(b){packets.push(MV.decode(b));}}};
  const room={sim,tick:0,users:new Map([['watcher',client]])};
  issueBinaryMotion(room,100000,true,false,true);
  killer.x+=8;other.x+=8;room.tick++;
  issueBinaryMotion(room,100065,false,false,false);
  assert(packets[1].f.some(record=>record[0]===killer.i));
  assert(!packets[1].f.some(record=>record[0]===other.i),'unwatched far fish should not consume chase-camera bandwidth');
});
test('Random drop point is fixed and announced before batch release',()=>{
  const sim=fresh('free');const f=sim.fishes[0];sim.kill(f,'caught');
  progress(sim,4.5);
  assert(f.holding);assert(sim.respawnQueue.some(q=>q.i===f.i));
  const scheduled=JSON.stringify(sim.nextRespawnPoint),next=sim.nextRespawnDumpAt;
  progress(sim,9.99);assert.equal(JSON.stringify(sim.nextRespawnPoint),scheduled);
  assert.equal(f.alive,false);
  progress(sim,10.01);
  assert(f.alive);assert(!f.holding);
  assert(sim.respawnBatches.length>=1);
  const latest=sim.respawnBatches[sim.respawnBatches.length-1];
  assert.equal(latest.x,JSON.parse(scheduled).x);assert.equal(latest.z,JSON.parse(scheduled).z);
  assert(Math.hypot(f.x-latest.x,f.z-latest.z)<250);
  assert(f.prot>5.9);
  assert.equal(sim.nextRespawnDumpAt,next+10);
});
test('Respawn target survives snapshot/restore and client update',()=>{
  const a=fresh('free');const b=A.create();b.restore(a.snapshot());
  assert.deepEqual(b.nextRespawnPoint,a.nextRespawnPoint);
  a.applyRespawnView([],[],20,{x:1211,z:-290});
  assert.equal(a.nextRespawnPoint.x,1211);
  assert.equal(a.nextRespawnPoint.z,-290);
  assert.equal(a.nextRespawnDumpAt,20);
});
test('Net-drop RNG does not perturb preexisting seeded gameplay initialization',()=>{
  const reference=[[1,133629283],[5,-434265186]];
  for(const [seed,originalRng] of reference){
    const sim=A.create();
    sim.newMatch({sp:'guppy',mode:'free',seed,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:30,
      slots:{fish:[{pid:'human',sp:'guppy'}]}});
    assert.equal(sim.snapshot().rng,originalRng,'preexisting gameplay RNG state must remain stable');
  }
});
test('Queued-batch replay is deterministic across snapshot/restore',()=>{
  const a=fresh('free',37);a.kill(a.fishes[0],'caught');progress(a,4.75);
  const b=A.create();b.restore(a.snapshot());
  progress(a,10.15);progress(b,10.15);
  assert.deepEqual(b.respawnBatches,a.respawnBatches);
  assert.deepEqual(b.nextRespawnPoint,a.nextRespawnPoint);
  assert.equal(b.snapshot().rng,a.snapshot().rng);
  assert.equal(b.snapshot().respawnRng,a.snapshot().respawnRng);
});
test('Last Fish Standing still never has a respawn holding queue',()=>{
  const s=fresh('last');s.kill(s.fishes[0],'caught');progress(s,31);
  assert.equal(s.respawnQueue.length,0);assert.equal(s.respawnBatches.length,0);
});
test('Shared net begins travelling before the ten-second release rather than afterward',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert(html.includes('const target=nextRespawnPoint||rack'));
  assert(html.includes('const approach=(respawnQueue||[]).length?clamp((1.55-timeUntil)/1.55,0,1):0;'));
  assert(html.includes('net.fishLayer.visible=true;\n    positionNetFish(net,holding)'));
  assert(html.includes('The fish already entered the water together at the exact ten-second'));
});
server.on('listening',()=>server.close());
console.log(`${checks} audit hardening checks passed`);
