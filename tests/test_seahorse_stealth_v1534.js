'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const A=require('../aqua_sim');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name)}
const mk=(sp)=>{
  const s=A.create();
  s.newMatch({sp:'guppy',mode:'last',seed:34,competitorCount:8,maxTotalFish:400,npcCount:0,miniFishCount:0,slots:{fish:[{sp:'piranha'},{sp:'seahorse'},{sp:'barra'}]}});
  for(let i=0;i<s.fishes.length;i++){
    const f=s.fishes[i];Object.assign(f,{x:6000+i*115,y:700,z:1000,prot:0,mass:i<3?60:500,wt:10000,wx:0,wy:0,wz:0,vx:0,vy:0,vz:0,abilCD:100});
  }
  for(const p of s.plank)p.alive=false;
  s.fishers.forEach(fr=>{fr.cd=100000;fr.x=9000;fr.z=1400});
  return s;
};
check('Camouflage is concealment only: still valid to eat when heavier fish touches',()=>{
  const s=mk(),hunter=s.fishes[0],hidden=s.fishes[1];
  Object.assign(hunter,{sp:'piranha',x:1100,y:450,z:0,mass:300});
  Object.assign(hidden,{sp:'seahorse',x:1120,y:450,z:0,mass:80,abilCD:0});
  assert(s.useAbility(hidden));assert(hidden.camoT>0);
  assert.equal(s.predationProtected(hidden),false,'camouflage does not grant immunity');
  assert.equal(s.visuallyHiddenFromOpponent(hidden),true);
  assert(s.biteEligible(hunter,hidden),'physical capture remains eligible');
  s.step({},1/30);
  assert.equal(hidden.alive,false,'contact predator can eat unseen seahorse');
  assert(hunter.mass>300,'predator gains mass from contact');
});
check('Six-second spawn protection still blocks contact predation independently of stealth',()=>{
  const s=mk(),hunter=s.fishes[0],hidden=s.fishes[1];
  Object.assign(hunter,{x:1100,y:450,z:0,mass:300});
  Object.assign(hidden,{x:1120,y:450,z:0,mass:80,abilCD:0,prot:6});
  s.useAbility(hidden);assert(hidden.camoT>0);
  s.step({},1/30);
  assert.equal(hidden.alive,true);assert(s.predationProtected(hidden));
});
check('Piranha lock acquisition and Barracuda lunge never locate hidden fish',()=>{
  const s=mk(),p=s.fishes[0],hidden=s.fishes[1],b=s.fishes[2];
  Object.assign(p,{x:1050,y:450,z:0,mass:250,abilCD:0,hx:1,hz:0});
  Object.assign(hidden,{x:1190,y:450,z:0,mass:80,abilCD:0});
  Object.assign(b,{x:1050,y:450,z:70,mass:250,hx:1,hz:0,abilCD:0});
  assert(s.useAbility(hidden));
  assert.equal(s.aiShouldUseAbility(p),false,'no auto-Frenzy trigger against invisible fish');
  assert(s.useAbility(p));assert.equal(p.piranhaTarget,null);
  assert(s.useAbility(b));assert.equal(b.lungeTarget,null);
  hidden.camoT=0;hidden.abilT=0;
  p.abilT=0;p.abilCD=0;b.abilT=0;b.abilCD=0;
  assert.equal(s.aiShouldUseAbility(p),true);
  assert(s.useAbility(p));assert.equal(p.piranhaTarget,hidden);
  assert(s.useAbility(b));assert.equal(b.lungeTarget,hidden);
});
check('AI does not visually track an invisible Seahorse, including close range',()=>{
  const s=mk(),hunter=s.fishes[0],hidden=s.fishes[1];
  Object.assign(hunter,{x:1100,y:450,z:0,mass:300});
  Object.assign(hidden,{x:1170,y:450,z:0,mass:80,abilCD:0});
  assert(s.useAbility(hidden));
  s.botThink(hunter);
  assert(Math.hypot(hunter.wx,hunter.wy,hunter.wz)<3,'hidden fish not explicitly pursued');
  hidden.camoT=0;hidden.abilT=0;
  s.botThink(hunter);
  assert(hunter.wx>50,'visible fish can be acquired normally');
  hidden.camoT=3;hidden.x=hunter.x+20;
  s.botThink(hunter);
  assert(Math.hypot(hunter.wx,hunter.wy,hunter.wz)<3,'does not acquire within old 38-unit loophole');
});
check('Rendering distinguishes own ghost from enemy disappearance, including instanced and full rigs',()=>{
  const c=vm.createContext({ME:'local'});
  const from=html.indexOf('function rivalSeahorseHidden('),to=html.indexOf('function fishAbilityFeedback(',from);
  assert(from>0&&to>from);vm.runInContext(html.slice(from,to),c);
  const hidden={sp:'seahorse',camoT:3,pid:'opponent',alive:true};
  assert.equal(c.rivalSeahorseHidden(hidden),true);
  hidden.pid='local';assert.equal(c.rivalSeahorseHidden(hidden),false,'own camouflage shown as translucent ghost');
  hidden.pid='opponent';hidden.camoT=0;assert.equal(c.rivalSeahorseHidden(hidden),false);
  assert(html.includes('e.wrap.visible=f.alive&&!rivalSeahorseHidden(f)'));
  assert(html.includes('if(!f?.alive||rivalSeahorseHidden(f))continue;'));
});
console.log(checks+' Seahorse stealth/physical predation checks passed');
