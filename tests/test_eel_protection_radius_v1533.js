'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Aqua=require('../aqua_sim');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name)}
function scenario(species=['eel','guppy','tuna','clown'],minis=2){
  const s=Aqua.create();s.newMatch({sp:species[0],seed:1533,mode:'free',competitorCount:8,npcCount:0,miniFishCount:minis,
    slots:{fish:species.map((sp,i)=>({sp,pid:i===0?'human':undefined}))}});
  for(let i=0;i<s.fishes.length;i++)Object.assign(s.fishes[i],{x:2500+i*410,y:390,z:0,
    prot:0,air:false,abilCD:999,abilT:0,vx:0,vy:0,vz:0,wt:9999,wx:0,wy:0,wz:0});
  for(const o of s.npcs)Object.assign(o,{x:4500,y:500,z:600,shockT:0,eelSlowT:0});
  s.fishers.forEach((f,i)=>Object.assign(f,{x:4900+i*100,z:700,shockT:0,cd:999}));
  return s;
}
test('Electric radius matches the protection ally aura exactly',()=>{
 assert.equal(Aqua.ABILITY.shockRadius,170);
 assert.equal(Aqua.ABILITY.shockRadius,Aqua.ABILITY.clownRadius);
 assert.equal(Aqua.ABILITY.koiSuctionRadius,350);
 assert.equal(Aqua.ABILITY.glimmerRadius,350);
});
test('Shock applies in 3D to fish and minnows strictly inside 170; excludes beyond boundary',()=>{
 const s=scenario(),[eel,within,outside,protectedFish]=s.fishes;
 Object.assign(eel,{x:1200,y:390,z:0,prot:6,abilCD:0});
 Object.assign(within,{x:1200,y:390,z:169,prot:0});
 Object.assign(outside,{x:1200,y:390,z:171,prot:0});
 Object.assign(protectedFish,{x:1201,y:390,z:0,prot:6,shockT:0,eelSlowT:0,vx:70});
 const [nearMinnow,farMinnow]=s.npcs;
 Object.assign(nearMinnow,{x:1369,y:390,z:0});
 Object.assign(farMinnow,{x:1371,y:390,z:0});
 const [nearFisher,farFisher]=s.fishers;
 Object.assign(nearFisher,{x:1369,z:0});
 Object.assign(farFisher,{x:1371,z:0});
 assert(s.useAbility(eel),'protected eel still activates shock');
 assert(within.shockT>.6&&within.eelSlowT>=3.2,'inside fish is stunned and slowed');
 assert.equal(outside.shockT||0,0,'outside fish unaffected');
 assert.equal(outside.eelSlowT||0,0,'outside fish not slowed');
 assert.equal(protectedFish.shockT||0,0,'inside protected fish immune');
 assert.equal(protectedFish.eelSlowT||0,0,'protected fish not slowed');
 assert.equal(protectedFish.vx,70,'protected fish velocity unchanged');
 assert(nearMinnow.shockT>0&&nearMinnow.eelSlowT>0,'school fish within 170 affected');
 assert.equal(farMinnow.shockT||0,0,'minnow past 170 unaffected');
 assert(nearFisher.shockT>0,'fisherman inside reach interrupted');
 assert.equal(farFisher.shockT||0,0,'fisherman outside reach unaffected');
});
test('Deterministic eel AI triggers inside shared radius, not outside',()=>{
 const s=scenario(['eel','guppy'],0),[eel,rival]=s.fishes;
 eel.human=false;Object.assign(eel,{x:1200,y:390,z:0,abilCD:0,prot:0});
 Object.assign(rival,{x:1371,y:390,z:0,prot:0});
 assert.equal(s.aiShouldUseAbility(eel),false);
 rival.x=1369;
 assert.equal(s.aiShouldUseAbility(eel),true);
 rival.prot=6;
 assert.equal(s.aiShouldUseAbility(eel),false,'AI does not waste shock on protected rival');
});
test('Game UI, inline simulation and source agree on the new radius',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const sim=fs.readFileSync(require('node:path').join(__dirname,'../aqua_sim.js'),'utf8');
 for(const token of ['const PROTECTION_AURA_RADIUS=170;','shockRadius:PROTECTION_AURA_RADIUS','clownRadius:PROTECTION_AURA_RADIUS']){
   assert(html.includes(token),`inline ${token}`);assert(sim.includes(token),`server ${token}`);
 }
 for(const token of ['RELEASE 170-UNIT SHOCK',"eel:'170 SHOCK · −75%'",'within 170 units'])assert(html.includes(token),token);
});
console.log(`v1.5.33: ${passed} eel-range checks passed`);
