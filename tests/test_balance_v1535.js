'use strict';
const A=require('../aqua_sim'),assert=require('node:assert/strict'),fs=require('node:fs');
let tests=0;
function run(name,fn){fn();console.log('PASS '+name);tests++}
function arena(roles){
  const s=A.create();s.newMatch({sp:roles[0],seed:1535,mode:'free',competitorCount:8,npcCount:0,miniFishCount:0,slots:{fish:roles.map((sp,i)=>({sp,pid:i===0?'human':undefined}))}});
  s.fishes.forEach((f,i)=>Object.assign(f,{x:4500+i*120,y:420,z:0,prot:0,abilCD:999,wt:9999,wx:0,wy:0,wz:0,mass:100,vx:0,vy:0,vz:0}));
  s.fishers.forEach(f=>{f.cd=9999;f.x=4900;f.z=700});
  for(const p of s.plank)p.alive=false;
  return s;
}
const mv=(s,x,y=0,z=0,abHold=false)=>s.step({human:{mv:{x,y,z},abHold}},1/30);
run('Piranha pursuit uses held swim propulsion, not ability button, and re-locks next closest target',()=>{
  const s=arena(['piranha','guppy','sardine']),[p,a,b]=s.fishes;
  Object.assign(p,{x:1000,mass:400,abilCD:0});Object.assign(a,{x:1150,mass:40});Object.assign(b,{x:1220,mass:35});
  assert(s.useAbility(p));assert.equal(p.piranhaTarget,a);
  mv(s,0,0,0,true);assert.equal(p.vx,0);
  mv(s,-1);assert(p.vx>0,'swim held, overrides opposite steering');
  mv(s,0);assert.equal(p.vx,0);assert.equal(p.piranhaTarget,a,'release preserves lock');
  a.alive=false;mv(s,1);assert.equal(p.piranhaTarget,b);assert(p.vx>0);
  p.abilT=0;mv(s,0);assert.equal(p.piranhaTarget,null);assert.equal(p.vx,0);
});
run('Sardine surge triples its own activation radius from 265 to 795; not ordinary school radius',()=>{
  const s=arena(['sardine','sardine','sardine']),[src,inside,outside]=s.fishes;
  Object.assign(src,{x:1000,abilCD:0});inside.x=1790;outside.x=1800;
  assert.equal(A.ABILITY.schoolSurgeRadius,795);assert.equal(A.ABILITY.schoolRadius,265);
  assert(s.useAbility(src));assert(inside.surge>0,'inside 790 receives boost');assert.equal(outside.surge||0,0,'outside 800 does not');
});
run('Pufferfish gains threefold combat mass without any poison/slow on eater',()=>{
  const s=arena(['puffer','tuna']),[p,attacker]=s.fishes;
  Object.assign(p,{x:1100,mass:50,abilCD:0});Object.assign(attacker,{x:1100,mass:350,wx:0,wt:9999});
  assert(s.useAbility(p));assert.equal(A.combatMass(p),150);
  s.step({},1/30);assert.equal(attacker.slowT||0,0,'attacker must not be poisoned');
  assert.equal(p.alive,false,'larger attacker still eats puffer when heavier than inflated combat mass');
});
run('Barracuda locks exactly one target for a lunge; no mid-lunge retarget',()=>{
  const s=arena(['barra','guppy','guppy']),[hunter,a,b]=s.fishes;
  Object.assign(hunter,{x:1000,hx:1,hz:0,mass:400,abilCD:0});Object.assign(a,{x:1110,mass:40});Object.assign(b,{x:1180,mass:30});
  assert(s.useAbility(hunter));assert.equal(hunter.lungeTarget,a);a.alive=false;
  mv(s,1);assert.notEqual(hunter.lungeTarget,b,'cannot switch to second fish during same ability');
});
run('Goldfish speed is doubled while Glitter Screen pulses still affect vulnerable rivals',()=>{
  assert.equal(A.SP.goldfish.mul,2);
  const s=arena(['goldfish','guppy']),[g,enemy]=s.fishes;
  Object.assign(g,{x:1200,abilCD:0});enemy.x=1300;
  assert(s.useAbility(g));assert(enemy.dazzledT>0,'disruption remains');mv(s,1);assert(g.vx>0);
});
run('Clownfish runs at double speed; defensive shields stun attackers then slow by 50 percent',()=>{
  assert.equal(A.SP.clown.mul,2);
  const s=arena(['clown','tuna','clown']),[clown,attacker,ally]=s.fishes;
  Object.assign(clown,{x:1200,mass:60,abilCD:0});Object.assign(attacker,{x:1200,mass:400,wx:0,wt:9999});Object.assign(ally,{x:1250,mass:50});
  assert(s.useAbility(clown));assert(clown.clownGuardT>0&&ally.clownGuardT>0,'personal and allied guard');
  s.step({},1/30);assert(clown.alive,'shield prevents contact predation');
  assert(attacker.shockT>0,'attacker stunned');assert(attacker.clownSlowT>0,'50% slowdown timer');
  assert.equal(attacker.eelSlowT,0,'clown slow independent from eel');
  // A non-ability spawn shield cannot counter-stun attackers.
  const n=arena(['clown','tuna']),[newSpawn,hunter]=n.fishes;
  Object.assign(newSpawn,{x:1200,mass:50,prot:6,clownGuardT:0});Object.assign(hunter,{x:1200,mass:500});
  n.step({},1/30);assert.equal(hunter.shockT||0,0);
});
run('Eel shock reduces speed to one quarter after stun, and retains protection immunity',()=>{
  assert.equal(A.ABILITY.shockRadius,A.ABILITY.clownRadius);
  const s=arena(['eel','guppy','guppy']),[e,unprotected,protectedFish]=s.fishes;
  Object.assign(e,{x:1100,abilCD:0});Object.assign(unprotected,{x:1160,prot:0});Object.assign(protectedFish,{x:1170,prot:6});
  assert(s.useAbility(e));assert(unprotected.shockT>0&&unprotected.eelSlowT>0);
  assert.equal(protectedFish.shockT||0,0);assert.equal(protectedFish.eelSlowT||0,0);
  assert(fs.readFileSync(require('node:path').join(__dirname,'../aqua_sim.js'),'utf8').includes('if(f.eelSlowT>0)sp*=.25'));
});
run('Tuna Torpedo retains directional input and unrestricted mid-sprint turning',()=>{
  const s=arena(['tuna']),t=s.fishes[0];Object.assign(t,{x:1100,abilCD:0,hx:1,hz:0});
  assert(s.useAbility(t));mv(s,0,0,1);assert(t.vz>0,'can turn from x to z under Torpedo');
  mv(s,0,0,-1);assert(t.vz<0,'can reverse steering while ability remains active');
});
run('Multiplayer encodes new clown timers as independent metadata fields',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
  const codec=require('../motion_v2');
  assert(source.includes('q(f.clownSlowT||0),q(f.clownGuardT||0)'));
  assert(codec.decode, 'network codec available');
});
console.log(`v1.5.35: ${tests} ability checks passed`);
