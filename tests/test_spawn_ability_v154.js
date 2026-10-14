'use strict';
const assert=require('node:assert/strict');
const Aqua=require('../aqua_sim_mobile_v154');
const still={A:{mv:{x:0,y:0,z:0}},B:{mv:{x:0,y:0,z:0}}};
let passed=0;
function ok(msg,b){assert.ok(b,msg);passed++;console.log('PASS '+msg)}
function pair(spA='guppy',spB='tuna',am=100,bm=250){
 const s=Aqua.create();s.newMatch({mode:'free',seed:921,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'A',sp:spA},{pid:'B',sp:spB}]}});
 for(const f of s.fishes.slice(2)){f.alive=false;f.respawn=900}
 const [a,b]=s.fishes;
 Object.assign(a,{x:1100,y:300,z:0,mass:am,displayMass:am,prot:0,abilT:0,abilCD:0,dodgeT:0});
 Object.assign(b,{x:1100,y:300,z:0,mass:bm,displayMass:bm,prot:0,abilT:0,abilCD:0,dodgeT:0});
 return{s,a,b};
}
for(const mode of ['free','last']){
 const s=Aqua.create();s.newMatch({mode,seed:67,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:30});
 ok(mode+' starts all 200 competitors with exactly 3 seconds protection',s.fishes.length===200&&s.fishes.every(f=>f.prot===3));
 s.step({},1/60);ok(mode+' shield countdown ticks down',s.fishes[0].prot>2.98&&s.fishes[0].prot<3);
}
{
 const {s,a,b}=pair();a.prot=3;s.step(still,1/60);ok('spawn protection blocks a larger fish',a.alive&&b.alive);
 a.prot=0;s.step(still,1/60);ok('unprotected larger fish consumes smaller',!a.alive&&b.alive);
}
{
 const {s,a,b}=pair('puffer','tuna',100,240);
 ok('puffer activates inflation',s.useAbility(a));
 ok('puffer effective mass triples without artificial biomass',Aqua.combatMass(a)===300&&a.mass===100);
 s.step(still,1/60);
 ok('inflated puffer can eat a fish bigger than its actual mass',a.alive&&!b.alive&&a.mass>100&&a.mass<300);
}
{
 const {s,a,b}=pair('puffer','tuna',100,240);s.step(still,1/60);
 ok('unactivated puffer loses to larger fish',!a.alive&&b.alive);
}
{
 const {s,a,b}=pair('puffer','tuna',100,300);s.useAbility(a);s.step(still,1/60);
 ok('equal combat mass prevents eating',a.alive&&b.alive);
}
{
 const {s,a,b}=pair('puffer','tuna',100,301);s.useAbility(a);s.step(still,1/60);
 ok('inflation does not give invulnerability against greater combat mass',!a.alive&&b.alive);
}
{
 const {s,a,b}=pair('puffer','tuna',100,240);b.prot=3;s.useAbility(a);s.step(still,1/60);
 ok('spawn protection defeats puffer inflated attack',a.alive&&b.alive);
}
{
 const {s,a,b}=pair('clown','tuna',100,700);s.useAbility(a);s.step(still,1/60);
 ok('clownfish shield ability protects against predation',a.alive&&b.alive);
}
{
 const {s,a,b}=pair('goldfish','tuna',100,700);s.useAbility(a);s.step(still,1/60);
 ok('goldfish flash protects against predation',a.alive&&b.alive);
}
{
 const {s,a,b}=pair('puffer','tuna',100,240);s.useAbility(a);a.abilT=.005;s.step(still,.01);
 ok('inflation expiry restores actual mass outcome',!a.alive&&b.alive);
}
{
 const {s,a}=pair();s.kill(a,'eaten');s.spawnFish(a);ok('respawn always renews a 3-second shield',a.prot===3);
 const late=s.addFishPlayer({pid:'LATE',sp:'puffer'});ok('late human join gets 3-second shield',late?.prot===3);
}
{
 const {s,a,b}=pair('guppy','tuna',150,150);s.step(still,1/60);
 ok('ordinary equal-mass contact does nothing',a.alive&&b.alive);
}
console.log(passed+' spawn and ability predation checks passed');