'use strict';
const assert=require('node:assert/strict');
const Aqua=require('../aqua_sim');
const fs=require('node:fs');
const path=require('node:path');
let tests=0;
function test(name,fn){fn();tests++;console.log('PASS',name)}
function arena(species=['eel','guppy','tuna'],miniCount=2){
  const s=Aqua.create();
  s.newMatch({sp:species[0],seed:1531,mode:'free',competitorCount:8,npcCount:0,miniFishCount:miniCount,
    slots:{fish:species.map((sp,i)=>({sp,pid:i===0?'human':undefined}))}});
  s.fishes.forEach((f,i)=>Object.assign(f,{x:1200+i*520,y:440,z:0,mass:100,prot:0,abilCD:999,
    vx:0,vy:0,vz:0,wt:9999,wx:0,wy:0,wz:0,shockT:0,eelSlowT:0,dazzledT:0,turnLockT:0,slowT:0}));
  s.fishers.forEach(f=>{f.x=4900;f.z=900;f.cd=999});
  for(const p of s.plank)p.alive=false;
  return s;
}
const simulate=(s,n=1)=>{for(let i=0;i<n;i++)s.step({},1/30)};
test('Protected rival receives no stun, slow, velocity knockback or ability cancel; nearby unprotected rival and minnow do',()=>{
  const s=arena(),[e,g,t]=s.fishes;
  Object.assign(e,{x:1200,y:440,z:0,prot:6,abilCD:0});
  Object.assign(g,{x:1270,y:440,z:0,prot:5,vx:88,vy:4,vz:9,abilT:2,camoT:2,lungeT:1});
  Object.assign(t,{x:1277,y:440,z:0,prot:0,abilT:2});
  const mini=s.npcs.find(n=>n.mini);Object.assign(mini,{x:1280,y:440,z:0,shockT:0,eelSlowT:0});
  assert(s.useAbility(e),'protected eel can still activate');
  for(const k of ['shockT','eelSlowT'])assert.equal(g[k]||0,0,k+' ignored');
  assert.equal(g.vx,88);assert.equal(g.vy,4);assert.equal(g.vz,9);
  assert.equal(g.abilT,2);assert.equal(g.camoT,2);assert.equal(g.lungeT,1);
  assert(t.shockT>0&&t.eelSlowT>=3.1,'unprotected competitor affected');
  assert(mini.shockT>0&&mini.eelSlowT>0,'school minnows remain shockable');
  g.prot=0; e.electricNext=0;e.electricPulses=1;simulate(s);
  assert(g.shockT>0&&g.eelSlowT>0,'new electric pulse works as soon as protection expires');
});
test('Protected targets ignore Goldfish glitter while unprotected targets keep steering but slow',()=>{
  const s=arena(['goldfish','guppy','tuna'],0),[gold,protectedFish,unprotected]=s.fishes;
  Object.assign(gold,{x:1500,y:440,z:0,abilCD:0,prot:6});
  Object.assign(protectedFish,{x:1550,y:440,z:0,prot:6,wx:-1,wt:1e5});
  Object.assign(unprotected,{x:1590,y:440,z:0,prot:0,wx:-1,wt:1e5});
  assert(s.useAbility(gold));
  assert.equal(protectedFish.dazzledT||0,0);
  assert(unprotected.dazzledT>0);
  simulate(s,4);
  assert(protectedFish.vx<0,'shielded fish continues left');
  assert(unprotected.vx<0,'unshielded fish retains original leftward steering');
  assert(Math.abs(unprotected.vx)<Math.abs(protectedFish.vx),'glitter slows the unprotected fish');
});
test('Guppy mirror dart never changes predator steering, protected or not',()=>{
  const s=arena(['guppy','barra'],0),[g,b]=s.fishes;
  Object.assign(g,{x:1000,y:440,z:0,abilCD:0});
  Object.assign(b,{x:1100,y:440,z:0,mass:300,prot:6});
  assert(s.useAbility(g));assert(g.flickT>0&&g.prot>0,'own power works');
  assert.equal(b.turnLockT||0,0,'protected enemy steering unaffected');
  b.prot=0;g.abilCD=0;assert(s.useAbility(g));assert.equal(b.turnLockT||0,0);
});
test('Shield applied after a prior hit immediately clears negative ability effects',()=>{
  const s=arena(['clown','clown','eel'],0),[clown,ally,eel]=s.fishes;
  Object.assign(clown,{x:1000,y:440,z:0,prot:0,abilCD:0,shockT:.3,eelSlowT:2,dazzledT:1,turnLockT:.5,slowT:1});
  Object.assign(ally,{x:1040,y:440,z:0,prot:0,shockT:.2,eelSlowT:2,dazzledT:1,turnLockT:.5,slowT:1});
  assert(s.useAbility(clown));
  for(const f of [clown,ally]){
    assert(f.prot>0,'clown ally received protection');
    for(const key of ['shockT','eelSlowT','dazzledT','turnLockT','slowT'])assert.equal(f[key],0,key+' cleared');
  }
  assert.equal(eel.prot||0,0,'enemy not shielded');
});
test('Piranha lock and Angelfish halo snare ignore protected fish',()=>{
  const p=arena(['piranha','guppy','guppy'],0),[hunter,shielded,prey]=p.fishes;
  Object.assign(hunter,{x:1000,y:440,z:0,mass:300,abilCD:0});
  Object.assign(shielded,{x:1070,y:440,z:0,mass:50,prot:6});
  Object.assign(prey,{x:1200,y:440,z:0,mass:40,prot:0});
  assert(p.useAbility(hunter));assert.strictEqual(hunter.piranhaTarget,prey);
  const s=arena(['angel','guppy','guppy'],0),[angel,protectedFish,free]=s.fishes;
  Object.assign(angel,{x:1200,y:440,z:0,mass:250,abilCD:0});
  Object.assign(protectedFish,{x:1290,y:440,z:0,mass:50,prot:6});
  Object.assign(free,{x:1310,y:440,z:0,mass:50,prot:0});
  assert(s.useAbility(angel));s.influenceWhirl(angel,1/30);
  protectedFish.wx=free.wx=1;protectedFish.wt=free.wt=9999;
  s.step({},1/30);
  assert(protectedFish.vx>free.vx,'shielded prey avoids halo slowdown');
  assert.equal(free.vz,0,'halo does not turn prey');
});
test('AI Eels and Goldfish do not waste attacks when all nearby rivals are protected',()=>{
  for(const species of ['eel','goldfish']){
    const s=arena([species,'guppy'],0),[actor,victim]=s.fishes;
    Object.assign(actor,{x:1200,y:440,z:0,abilCD:0,human:false,pid:null});
    Object.assign(victim,{x:species==='eel'?1270:1400,y:440,z:0,prot:6});
    assert.equal(s.aiShouldUseAbility(actor),false,species+' should not cast solely on protected fish');
    victim.prot=0;
    assert.equal(s.aiShouldUseAbility(actor),true,species+' should cast when vulnerable rival appears');
  }
});
test('Client inline engine and server engine share protection-immunity implementation',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','aqua_sim.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const clauses=['function clearProtectedDebuffs(f){','function haloSnared(o){','other.air||predationProtected(other)','if(o.sp){if(!predationProtected(o))rivals='];
  for(const clause of clauses)assert(source.includes(clause)&&html.includes(clause),clause);
});
console.log(`v1.5.31: ${tests} protected ability immunity tests passed`);
