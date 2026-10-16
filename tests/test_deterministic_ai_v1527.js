'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const A=require('../aqua_sim');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
let checked=0;
function check(name,fn){fn();checked++;console.log('PASS '+name)}
function sandbox(sp){
  const sim=A.create();
  sim.newMatch({mode:'free',sp,seed:270125,competitorCount:8,npcCount:0,miniFishCount:0,slots:{fish:[{sp},{sp:'guppy'}]}});
  sim.fishes.forEach((f,i)=>Object.assign(f,{x:1800+i*480,y:340,z:0,mass:100,prot:0,abilT:0,abilCD:0,wt:9999,wx:0,wy:0,wz:0,vx:0,vy:0,vz:0,hx:1,hz:0,air:false}));
  for(const p of sim.plank)p.alive=false;
  sim.fishers.forEach(fr=>{fr.cd=999;fr.cast=null;fr.x=5000;fr.z=700});
  return sim;
}
check('Duration multipliers and cooldowns: tuna 3 seconds, seahorse 7.4 seconds',()=>{
 assert.equal(A.SP.tuna.dur,3);assert.equal(A.SP.tuna.cd,16.2);
 assert.equal(A.SP.seahorse.dur,7.4);assert.equal(A.SP.seahorse.cd,7.7);
});
check('Every species has a distinct ability name and authoritative deterministic evaluator',()=>{
 assert.equal(Object.keys(A.SP).length,13);
 assert.equal(new Set(Object.values(A.SP).map(x=>x.abil)).size,13);
 assert.equal(typeof A.create().aiShouldUseAbility,'function');
});
const cases={
  guppy(s,f,g){g.x=f.x+140;g.mass=330},
  sardine(s,f,g){g.sp='sardine';g.x=f.x+150;g.mass=50;const p=s.plank[0];Object.assign(p,{alive:true,x:f.x+90,y:f.y,z:f.z});},
  puffer(s,f,g){g.x=f.x+120;g.mass=240;},
  barra(s,f,g){g.x=f.x+160;g.mass=50;},
  piranha(s,f,g){g.x=f.x+140;g.mass=40;},
  goldfish(s,f,g){g.x=f.x+280;g.mass=100;},
  koi(s,f,g){const p=s.plank[0];Object.assign(p,{alive:true,x:f.x+150,y:40,z:0});f.y=150;},
  clown(s,f,g){g.x=f.x+150;g.mass=290;},
  eel(s,f,g){g.x=f.x+130;g.mass=100;},
  tuna(s,f,g){g.x=f.x+165;g.mass=45;},
  angel(s,f,g){g.x=f.x+130;g.mass=45;},
  seahorse(s,f,g){g.x=f.x+180;g.mass=280;},
  sunfish(s,f,g){f.y=75;const p=s.plank[0];Object.assign(p,{alive:true,x:f.x+95,y:45,z:0});},
};
check('All thirteen AI species autonomously request their unique ability under a viable situation',()=>{
 for(const [sp,scene] of Object.entries(cases)){
   const s=sandbox(sp),f=s.fishes[0],g=s.fishes[1];scene(s,f,g);
   assert.equal(f.human,false,sp+' is an AI competitor');
   assert.equal(s.aiShouldUseAbility(f),true,`${sp} did not recognize its ability condition`);
   s.botThink(f);assert.equal(f.abilReq,true,sp+' did not queue the ability');
   assert.equal(s.useAbility(f),true,sp+' could not fire its ability');
   assert.equal(f.abilT,A.SP[sp].dur,sp+' window mismatch');
 }
});
check('Ability evaluation never spends the cooldown while no useful target is in range',()=>{
 for(const sp of Object.keys(A.SP)){
   const s=sandbox(sp),f=s.fishes[0];f.x=1000;f.y=550;
   for(const o of s.fishes.slice(1)){o.x=4500;o.y=550;o.z=0;}
   assert.equal(s.aiShouldUseAbility(f),false,sp+' spurious activation');
   s.botThink(f);assert.equal(f.abilReq,false,sp+' request leaked');
 }
});
check('AI ability requests are rejected while stunned, active, on cooldown or hooked',()=>{
 const s=sandbox('eel'),f=s.fishes[0],g=s.fishes[1];g.x=f.x+90;
 assert(s.aiShouldUseAbility(f));
 f.abilCD=3;assert(!s.aiShouldUseAbility(f));f.abilCD=0;
 f.shockT=.5;assert(!s.aiShouldUseAbility(f));f.shockT=0;
 f.abilT=.4;assert(!s.aiShouldUseAbility(f));f.abilT=0;
 f.hooked={};assert(!s.aiShouldUseAbility(f));
});
check('Same initial world and decisions give identical authoritative effects after snapshot restoration',()=>{
 const s=sandbox('eel'),f=s.fishes[0],g=s.fishes[1];g.x=f.x+95;
 const other=A.create();other.restore(s.snapshot());
 for(const sim of [s,other]){
   const fish=sim.fishes[0];sim.botThink(fish);if(fish.abilReq){sim.useAbility(fish);fish.abilReq=false;}
   sim.step({},1/30);
 }
 assert.deepEqual(s.snapshot(),other.snapshot());
});
check('Other fish have no ability overlay instances or target reticles; camouflage and inflation remain',()=>{
 for(const fragment of [
  'remoteIM.shields=remoteIM.auras=remoteIM.flashes=remoteIM.marks=null',
  'if(barracudaLockMarker)barracudaLockMarker.visible=false',
  'e.abilityAura.visible=localAbilityIndicators&&feedback.aura',
  'e.abilityRing.visible=localAbilityIndicators&&feedback.aura',
  'e.bub.visible=localAbilityIndicators&&feedback.shield',
  'rivalFadeMesh(K,f.sp,close)',
  'inflateRadiusFactor(f)'])assert(html.includes(fragment),fragment);
 const block=html.slice(html.indexOf('  // Species-specific cartoon models with vertex coloured markings and fins.'),
                        html.indexOf('  // Species silhouettes plus individually placed eyes'));
 assert(!block.includes('emitRivalFeedback('));
});
check('Real 200-competitor, 60-minnow match exercises at least eleven species without scripting',()=>{
 const sim=A.create();sim.newMatch({sp:'koi',mode:'free',seed:1527,competitorCount:200,npcCount:0,miniFishCount:60});
 // Initial spawn protection lasts 6 seconds; wait until eligible rivals emerge.
 for(let frame=0;frame<300;frame++)sim.step({},1/30);
 const used=new Set(sim.fishes.filter(f=>!f.human&&(f.abilCD>0||f.abilT>0)).map(f=>f.sp));
 assert(used.size>=11,`expected at least 11 species to activate without a scripted target, saw ${[...used].join(', ')}`);
 // Separate deterministic scenarios above test each of the 13 abilities;
 // naturally occurring targets may remain shielded or unavailable in this seed.
});
console.log(`v1.5.27: ${checked} deterministic ability and no-rival-marker checks passed`);
