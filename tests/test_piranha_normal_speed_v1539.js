'use strict';
const assert=require('node:assert/strict');
const A=require('../aqua_sim');
const fs=require('node:fs');
const path=require('node:path');
let tests=0;
function test(label,fn){fn();console.log('PASS '+label);tests++}
function arena(){
 const s=A.create();s.newMatch({sp:'piranha',mode:'free',seed:1539,competitorCount:8,npcCount:0,miniFishCount:0,
  slots:{fish:[{sp:'piranha',pid:'human'},{sp:'guppy'}]}});
 s.fishes.forEach((f,i)=>Object.assign(f,{x:1000+i*350,y:400,z:0,vx:0,vy:0,vz:0,
  prot:0,abilCD:999,wt:99999,wx:0,wy:0,wz:0,mass:100,air:false,reentryT:0,hooked:null}));
 s.fishers.forEach(f=>{f.cd=9999;f.x=5000;f.z=700});
 for(const p of s.plank)p.alive=false;
 return s;
}
const move=(s,x=1,z=0)=>s.step({human:{mv:{x,y:0,z},abHold:false}},1/30);
test('Frenzy base duration is exactly half and cooldown is unchanged',()=>{
 assert.equal(A.SP.piranha.dur,1.95);assert.equal(A.SP.piranha.cd,11);
 const s=arena(),p=s.fishes[0];p.abilCD=0;p.mass=400;
 assert(s.useAbility(p));assert.equal(p.abilT,1.95);
 move(s,0);assert(Math.abs(p.abilT-(1.95-1/30))<1e-8);
});
test('Catch extension and remaining-duration cap are halved',()=>{
 assert.equal(A.ABILITY.frenzyEatExtension,.24);assert.equal(A.ABILITY.frenzyCap,2.65);
 const s=arena(),p=s.fishes[0];p.abilCD=0;p.mass=400;
 assert(s.useAbility(p));s.abilityOnEat(p,{mass:40},'rival');
 assert.equal(Math.round(p.abilT*100),219,'one catch adds 0.24s');
 for(let i=0;i<30;i++)s.abilityOnEat(p,{mass:40},'rival');
 assert.equal(p.abilT,2.65,'catch chain never exceeds new cap');
});
test('Frenzy and catch chains do not increase propulsion speed or acceleration',()=>{
 assert.equal(A.SP.piranha.mul,1);
 assert.equal(A.ABILITY.frenzyStack,undefined);
 const baseline=arena(),active=arena(),p=baseline.fishes[0],q=active.fishes[0];
 p.mass=q.mass=400;q.abilCD=0;
 assert(active.useAbility(q));q.frenzyChain=4;
 // Both have a smaller prey due east so auto pursuit and manual +X share a heading.
 for(let i=0;i<3;i++){move(baseline);move(active);
  for(const key of ['vx','vy','vz'])assert(Math.abs(p[key]-q[key])<1e-9,key+' speed differs during Frenzy');
 }
});
test('Propulsion hold and release still govern automatic pursuit with original target lock',()=>{
 const s=arena(),[p,prey]=s.fishes;p.mass=400;prey.mass=50;prey.x=1225;p.abilCD=0;
 assert(s.useAbility(p));assert.equal(p.piranhaTarget,prey);
 move(s,-1);assert(p.vx>0,'propulsion hold auto-steers toward prey');
 move(s,0);assert.equal(p.vx,0,'release must stop fish');
 assert.equal(p.piranhaTarget,prey,'release retains lock');
});
test('Canonical browser and lobby copy reflect rebalance',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('dur:1.95,mult:1.1,mul:1.0'));
 assert(html.includes('frenzyEatExtension:.24,frenzyCap:2.65'));
 assert(html.includes('normal swim speed; 1.95s base duration and up to 2.65s with catches'));
 assert(!html.includes("sp*=1+ABILITY.frenzyStack"));
});
console.log(`v1.5.39: ${tests} Piranha regression checks passed`);
