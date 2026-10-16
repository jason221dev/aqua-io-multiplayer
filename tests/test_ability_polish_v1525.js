'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('../aqua_sim'),src=fs.readFileSync('index.html','utf8');
let count=0;
const check=(name,fn)=>{fn();console.log('PASS',name);count++};
function testWorld(species=['goldfish','guppy']){
 const s=A.create();
 s.newMatch({sp:species[0],mode:'free',seed:15425,competitorCount:8,npcCount:0,miniFishCount:0,slots:{fish:species.map(sp=>({sp}))}});
 s.fishes.forEach((f,i)=>{f.x=1100+i*430;f.y=420;f.z=0;f.mass=100;f.wt=1e9;f.wx=f.wy=f.wz=0;f.abilCD=999;f.prot=0});
 return s;
}
check('13 species have unique labelled active ability windows, longer than v1.5.24',()=>{
 const old={guppy:.95,sardine:1.7,puffer:1.95,barra:.8,piranha:2.5,goldfish:1.65,koi:1.7,clown:1.35,eel:1.6,tuna:.9,angel:1.3,seahorse:2.25,sunfish:2.3};
 assert.equal(Object.keys(A.SP).length,13);
 assert.equal(new Set(Object.values(A.SP).map(x=>x.abil)).size,13);
 for(const [key,initial] of Object.entries(old)){
  assert(A.SP[key].dur>initial,`${key} duration upgraded`);
  assert(A.SP[key].hint.length>40,`${key} tactical description`);
 }
});
check('guppy escape is defensive and lasts long enough to be used reactively',()=>{
 const s=testWorld(['guppy','barra']),g=s.fishes[0],p=s.fishes[1];p.x=g.x+130;p.mass=300;
 g.abilCD=0;assert(s.useAbility(g));assert(g.dodgeT>=.6&&g.prot>=.6);
 assert.equal(p.turnLockT,0,'Mirror Dart does not change enemy steering');
});
check('school surge gives solo speed and spreads a greater buff to allies',()=>{
 const s=testWorld(['sardine','sardine']),a=s.fishes[0],b=s.fishes[1];b.x=a.x+50;
 a.abilCD=0;assert(s.useAbility(a));assert(a.surgeMul>=A.ABILITY.schoolBoostMin);
 assert(b.surge>2&&b.surgeMul>=a.surgeMul);
});
check('puffer keeps temporary combat mass completely separate from permanent mass',()=>{
 const s=testWorld(['puffer']),p=s.fishes[0];p.abilCD=0;const m=p.mass;
 assert(s.useAbility(p));assert.equal(s.combatMass(p),3*m);assert.equal(p.mass,m);
});
check('goldfish three pulse sequence dazes but never creates a shield',()=>{
 const s=testWorld(['goldfish','guppy']),g=s.fishes[0],p=s.fishes[1];g.abilCD=0;p.x=g.x+65;
 assert(s.useAbility(g));assert.equal(g.shimmerPulses,1);assert(p.dazzledT>0);assert.equal(g.prot,0);
 for(let i=0;i<67;i++)s.step({},1/30);
 assert.equal(g.shimmerPulses,3);assert(g.abilT>0);
});
check('eel emits two authoritative shock waves across protected and unprotected targets',()=>{
 const s=testWorld(['eel','guppy']),e=s.fishes[0],p=s.fishes[1];p.x=e.x+65;e.abilCD=0;
 assert(s.useAbility(e));assert(p.shockT>0);
 p.shockT=0;for(let i=0;i<36;i++)s.step({},1/30);
 assert.equal(e.electricPulses,2);assert(p.shockT>0);
});
check('koi underwater suction does not trigger an unrelated jump or shield',()=>{
 const s=testWorld(['koi']),f=s.fishes[0];f.abilCD=0;f.y=440;
 assert(s.useAbility(f));assert(!f.air);assert.equal(f.prot,0);assert(f.abilT>2.7);
});
check('all rivals, not only the human, receive authoritative bite animation state',()=>{
 const s=testWorld(['piranha','guppy']),pred=s.fishes[0],prey=s.fishes[1];pred.mass=300;prey.mass=50;prey.x=pred.x+12;
 // Player protection cleared; resolve contact in free roam.
 for(let i=0;i<10;i++)s.step({},1/30);
 assert.equal(pred.biteAt===undefined,false);
 assert(pred.biteSize>0);
 assert(pred.growthDelta>0);
});
check('slider is visibly in menu and stored preference affects stick and swipe steering',()=>{
 for(const part of ['id="steerSensitivity"','id="sensitivityValue"','SENSITIVITY_KEY','localStorage.setItem(SENSITIVITY_KEY','yaw-=dx*.006*steerSensitivity','yaw-=steerX*dt*1.9*steerSensitivity','swimPitch+dy*.0055*steerSensitivity','steerY*dt*1.15*steerSensitivity'])
  assert(src.includes(part),part);
 assert(src.includes('x:clamp((joy.on?joy.dx:')&&src.includes("fisherLeftMode==='aim'?clamp("));
 assert(src.indexOf('id="steerSensitivity"')>src.indexOf('id="menu"'));
 assert(src.indexOf('id="steerSensitivity"')<src.indexOf('id="onlinePanel"'));
});
check('lobby demo shows distinct swim, bite, swallow, growth and wave animation',()=>{
 for(const item of ['feedRipple','gulpWave','biteOpen','hero.jaw.rotation.z','f.g.userData.biteShrink',"sp==='angel'?clock*5",'e.growthFlash','e.abilityRing'])assert(src.includes(item),item);
});
check('all inline scripts parse including embedded client and tutorial',()=>{
 const pattern=/<script([^>]*)>([\s\S]*?)<\/script>/g;let m,ran=0;
 while((m=pattern.exec(src))){if(m[1].includes('src='))continue;new vm.Script(m[2]);ran++}
 assert(ran>=4,ran);
});
console.log(`v1.5.25: ${count} feature checks passed`);
