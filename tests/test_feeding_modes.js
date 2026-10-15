'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Aqua=require('../aqua_sim_mobile_ability_pass2');
let count=0;const ok=(name,x)=>{assert.ok(x,name);count++;console.log('PASS '+name)};
const styles={guppy:'peck',sardine:'filter',puffer:'beak',barra:'bite',piranha:'bite',
 goldfish:'suction',koi:'suction',clown:'peck',eel:'bite',tuna:'bite',
 angel:'peck',seahorse:'snout',sunfish:'suction'};
function fixture(sp='tuna',sp2='guppy'){
 const sim=Aqua.create();
 sim.newMatch({sp,mode:'free',seed:24,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,
  slots:{fish:[{pid:'P1',sp},{pid:'P2',sp:sp2}]}});
 sim.fishes.slice(2).forEach(f=>{f.alive=false;f.respawn=1e8});
 sim.npcs.forEach(f=>f.alive=false);
 const [a,b]=sim.fishes;
 Object.assign(a,{x:1400,y:300,z:500,hx:1,hz:0,mass:500,displayMass:500,prot:0,vx:0,vy:0,vz:0});
 Object.assign(b,{x:1420,y:300,z:500,hx:-1,hz:0,mass:30,displayMass:30,prot:0,vx:0,vy:0,vz:0});
 return{sim,a,b};
}
const idle={P1:{mv:{x:0,y:0,z:0}},P2:{mv:{x:0,y:0,z:0}}};
for(const [sp,style] of Object.entries(styles)){
 const{sim,a,b}=fixture(sp);ok(sp+' assigned '+style+' feeding',sim.feedingStyle(a)===style);
 const m=sim.feedingPoint(a);b.x=m.x+2;b.y=m.y;b.z=m.z;
 ok(sp+' forward mouth can capture prey',sim.feedingContact(a,b));
 b.x=a.x-7;b.y=a.y;b.z=a.z;
 ok(sp+' tail/body contact cannot feed',!sim.feedingContact(a,b));
}
{
 const {sim,a,b}=fixture('tuna');b.x=a.x-6;const mass=a.mass;
 sim.step(idle,1/60);
 ok('Rear body collision cannot eliminate prey',b.alive&&a.mass===mass);
}
{
 const {sim,a,b}=fixture('piranha');const m=sim.feedingPoint(a);b.x=m.x;b.z=m.z;
 sim.step(idle,1/60);
 ok('Jaw-aligned attack eliminates smaller prey and grows',!b.alive&&a.mass>500);
}
{
 const {sim,a,b}=fixture('eel');const m=sim.feedingPoint(a);b.x=m.x;b.z=m.z;b.prot=3;
 sim.step(idle,1/60);
 ok('Protection overrides valid forward strike',b.alive);
}
{
 const {sim,a,b}=fixture('barra');const m=sim.feedingPoint(a);b.x=m.x;b.z=m.z;b.mass=a.mass;
 ok('Equal mass cannot be swallowed',!sim.feedingContact(a,b));
}
{
 const {sim,a,b}=fixture('puffer');a.mass=100;b.mass=210;
 let m=sim.feedingPoint(a);b.x=m.x;b.z=m.z;
 ok('Puffer cannot swallow larger fish without inflation',!sim.feedingContact(a,b));
 sim.useAbility(a);m=sim.feedingPoint(a);b.x=m.x;b.z=m.z;
 ok('Puffer can swallow when effective combat mass is tripled',sim.feedingContact(a,b)&&a.mass===100);
}
{
 const {sim,a,b}=fixture('tuna');let m=sim.feedingPoint(a);b.x=m.x+140;
 const prior=new Map([[a,{x:a.x,y:a.y,z:a.z}],[b,{x:b.x,y:b.y,z:b.z}]]);
 b.x=m.x-9;
 ok('Fast strike uses swept jaw collision',sim.feedingContact(a,b,prior));
}
{
 const {sim,a,b}=fixture('goldfish');a.mass=300;b.mass=20;b.x=a.x+40;
 sim.step(idle,1/60);
 ok('Suction exerts bounded inward motion without teleport',b.alive&&b.vx<0&&b.x===1440);
}
{
 const {sim,a,b}=fixture('goldfish');a.mass=300;b.mass=20;b.x=a.x+40;b.prot=3;
 sim.step(idle,1/60);
 ok('Suction cannot override shields',b.vx===0&&b.alive);
}
{
 const {sim,a,b}=fixture('goldfish');const m=sim.feedingPoint(a);b.x=m.x;b.z=m.z;
 sim.step(idle,1/60);
 ok('Suction feeder swallows only at mouth',!b.alive&&a.mass>500);
}
{
 const {sim,a,b}=fixture('sardine');b.mass=8;const m=sim.feedingPoint(a);b.x=m.x+8;b.z=m.z+10;
 ok('Sardine captures tiny prey with filter scoop',sim.feedingContact(a,b));
}
{
 const {sim,a,b}=fixture('seahorse');b.mass=10;const m=sim.feedingPoint(a);b.x=m.x;b.z=m.z;
 ok('Seahorse forward snout suction works',sim.feedingContact(a,b));
}
{
 const html=fs.readFileSync(path.join(__dirname,'../fisherman-mobile-ability-pass2.html'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../aqua_sim_mobile_ability_pass2.js'),'utf8');
 const bundled=html.slice(html.indexOf('/*SIM:BEGIN*/')+13,html.indexOf('/*SIM:END*/')).trim()+
  "\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;\n";
 ok('Client and server feeding physics byte-identical',bundled===server);
 ok('Mouth animation and predator gulp remain connected',html.includes('const feedingStyle=sim.feedingStyle(f)')&&html.includes("feeding:e.feeding||'peck'"));
 ok('Predation always validates mouth alignment after body contact',server.includes('if(!feedingContact(predator,prey,previous))continue;'));
 ok('Menu explains feeding mechanic per species',html.includes('id="showFeeding"')&&html.includes('sim.feedingStyle({sp})'));
}
console.log(count+' feeding-mode regression checks passed');
