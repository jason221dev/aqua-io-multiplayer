'use strict';
const assert=require('node:assert/strict');
const A=require('../aqua_sim_mobile_v153');
function scenario(aMass,bMass,far=false){
 const s=A.create();
 s.newMatch({seed:912,mode:'free',competitorCount:200,maxTotalFish:200,miniFishCount:30,npcCount:0,slots:{fish:[{pid:'ONE',sp:'guppy'},{pid:'TWO',sp:'tuna'}]}});
 for(const f of s.fishes.slice(2)){f.alive=false;f.respawn=600;}
 for(const o of s.npcs)o.alive=false;
 const a=s.fishes[0],b=s.fishes[1];
 Object.assign(a,{x:1100,y:300,z:0,mass:aMass,displayMass:aMass,prot:100,vx:0,vy:0,vz:0});
 Object.assign(b,{x:far?1500:1100,y:300,z:0,mass:bMass,displayMass:bMass,prot:100,vx:0,vy:0,vz:0});
 return {s,a,b};
}
const still={ONE:{mv:{x:0,y:0,z:0}},TWO:{mv:{x:0,y:0,z:0}}};
{
 const {s,a,b}=scenario(100,101);s.step(still,1/60);
 assert(!a.alive&&b.alive&&b.mass>101,'101 must eat 100 despite protection');
}
{
 const {s,a,b}=scenario(101,100);s.step(still,1/60);
 assert(a.alive&&!b.alive,'either fish must win when heavier');
}
{
 const {s,a,b}=scenario(100,100);for(let i=0;i<25;i++)s.step(still,1/60);
 assert(a.alive&&b.alive,'equal masses must never eat one another');
}
{
 const {s,a,b}=scenario(100,101,true);s.step(still,1/60);
 assert(a.alive&&b.alive,'separated fish must not collide');
}
{
 const {s,a,b}=scenario(100,101,true);b.x=1500;
 s.step({ONE:{mv:{x:1,y:0,z:0}},TWO:still.TWO},2);
 assert(!a.alive&&b.alive,'swept pass-through must resolve');
}
{
 const {s,a,b}=scenario(100,100);
 const mini=s.npcs.find(x=>x.mini);
 mini.alive=true;mini.mass=16;mini.grace=90;mini.x=a.x;mini.y=a.y;mini.z=a.z;
 s.step(still,1/60);
 assert(!mini.alive&&a.mass>100,'minnows edible regardless of grace');
}
{
 const {s,a,b}=scenario(3600,3000);
 a.x=2580;a.y=756;a.z=188;b.x=2580;b.y=756;b.z=278;
 assert(A.shipBlocked(a,b));s.step(still,1/60);
 assert(a.alive&&b.alive,'pirate ship walls prevent eating through solids');
}
const c=A.create();c.newMatch({seed:439,mode:'last',competitorCount:200,maxTotalFish:200,miniFishCount:30,npcCount:0});
assert.equal(c.fishes.length,200);
for(let i=0;i<30;i++)c.step({},1/60);
console.log('PASS v1.5.3 strict mass predation: symmetry, equality, swept contact, minis, ship walls, 200 competitors');
