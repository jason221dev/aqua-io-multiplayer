'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../aqua_sim'),MV=require('../motion_v2');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
let n=0;
function check(s,run){run();console.log('PASS',s);n++}
function match(mode='free'){
 const s=A.create();s.newMatch({sp:'guppy',mode,seed:121,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,
   slots:{fish:[{pid:'VICTIM',sp:'guppy'},{pid:'EATER',sp:'tuna'}]}});
 const [v,e]=s.fishes;
 for(let i=2;i<s.fishes.length;i++){s.fishes[i].alive=false;s.fishes[i].respawn=9000}
 Object.assign(v,{x:1400,y:350,z:0,prot:0,mass:100,displayMass:100});
 Object.assign(e,{x:1400,y:350,z:0,prot:0,mass:450,displayMass:450});
 return {s,v,e};
}
check('all initial 200 competitors receive a 6-second shield, in both modes',()=>{
 for(const mode of ['free','last']){
  const sim=A.create();sim.newMatch({mode,seed:128,maxTotalFish:200,competitorCount:200,npcCount:0,miniFishCount:0});
  assert.equal(sim.fishes.length,200);assert.ok(sim.fishes.every(f=>f.prot===6));
 }
});
check('predator eating player captures its exact fish ID and 6-second replay duration',()=>{
 const {s,v,e}=match();s.step({},.02);
 assert.equal(v.alive,false);assert.equal(v.spectateTarget,e.i);assert.equal(v.spectateT,6);
 assert.equal(v.respawn,6);assert.equal(e.alive,true);
});
check('fish camera stays with eater while respawn clock is active',()=>{
 const {s,v,e}=match();s.step({},.02);const t=v.spectateT;
 s.step({},2);assert.equal(v.alive,false);assert.equal(v.spectateTarget,e.i);assert.ok(v.spectateT<t&&v.spectateT>3.9);
 assert.ok(v.respawn>3.9&&v.respawn<4.1);
});
check('free-roam eaten fish enters a holding net at 6 seconds, then batch-drops with fresh protection',()=>{
 const {s,v}=match();s.step({},.02);s.step({},5.9);
 assert.equal(v.alive,false);assert.ok(v.spectateT>0&&v.spectateT<.2);
 s.step({},.12);assert.equal(v.alive,false);assert.equal(v.holding,true);
 assert.equal(v.spectateT,0);assert.equal(v.spectateTarget,-1);
 s.step({},3.84);assert.equal(v.alive,false);assert.equal(v.holding,true);
 s.step({},.14);assert.equal(v.alive,true);assert.equal(v.holding,false);assert.ok(v.prot>5.8&&v.prot<=6);
});
check('protection blocks heavier fish and cannot be removed by ordinary contact',()=>{
 const {s,v,e}=match();v.prot=6;s.step({},.01);assert.equal(v.alive,true);assert.equal(e.alive,true);
});
check('Last Fish Standing never respawns and records an indefinite predator follow',()=>{
 const {s,v,e}=match('last');s.step({},.02);assert.equal(v.alive,false);
 assert.equal(v.respawn,0);assert.equal(v.spectateTarget,e.i);assert.equal(v.spectateT,-1);
});
check('fisherman catches retain existing respawn semantics and do not target random fish',()=>{
 const {s,v}=match();s.kill(v,'caught');assert.equal(v.respawn,3.5);
 assert.equal(v.spectateTarget,-1);assert.equal(v.spectateT,0);
});
check('late multiplayer join receives 6s spawn protection',()=>{
 const {s}=match();const f=s.addFishPlayer({pid:'LATE',sp:'puffer'});
 assert.ok(f);assert.equal(f.prot,6);
});
check('snapshot and restore carry eater target and remaining spectator time',()=>{
 const {s,v,e}=match();s.step({},.02);
 const ss=s.snapshot(),clone=A.create();clone.restore(ss);
 assert.equal(clone.fishes[v.i].spectateTarget,e.i);assert.equal(clone.fishes[v.i].spectateT,6);
});
check('UI continues tracking in Last Fish Standing and ends immediately at the winner',()=>{
 assert.ok(html.includes('until:lastFish?Infinity:performance.now()+human.spectateT*1000'));
 assert.ok(html.includes("if(playerRole==='fish'&&sim.rules.mode!=='last'&&eaterFollow())"));
 assert.ok(html.includes('if(deferredResults){if(!eaterFollow())endMatch()'));
 assert.ok(html.includes('FOLLOWING PREDATOR · UNTIL MATCH ENDS'));
});
check('compact motion decoder includes spectator metadata',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../motion_v2.js'),'utf8');
 const srv=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert.ok(js.includes("'reentryT','spectateT','spectateTarget'"));
 assert.ok(srv.includes('q(f.spectateT||0),f.spectateTarget??-1'));assert.ok(srv.includes('spectateTarget:f.spectateTarget??-1'));
});
console.log(`${n} eater follow and protection tests passed`);
