'use strict';
const assert=require('node:assert/strict');
const A=require('../aqua_sim');
const xyz=(x,y,z)=>({x,y,z});
function fixture(){
 const s=A.create();s.newMatch({sp:'guppy',seed:7,mode:'free',competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fishers:[{pid:'ANGLER',name:'Fisher'}],fish:[{pid:'SWIMMER',sp:'guppy'}]}});
 for(const f of s.fishes.slice(1)){f.alive=false;f.respawn=1e6}
 const fr=s.fishers[0],f=s.fishes[0];
 f.x=fr.x+90;f.z=fr.z+30;f.y=90;f.prot=0;
 const c={state:'bite',fish:[f],x:f.x,y:f.y,z:f.z};fr.cast=c;
 assert.ok(s.beginPhysicalFight(fr,c,f),'fight starts');
 return{s,fr,f,c};
}
let passes=0;
function check(name,cb){cb();console.log('PASS',name);passes++;}
check('solid lower hull side blocks LOS',()=>{
 assert.ok(A.shipBlocked(xyz(A.WRECK.x-390,755,290),xyz(A.WRECK.x-390,755,130)));
});
check('breach at centre is still swimmable',()=>{
 assert.equal(A.shipBlocked(xyz(A.WRECK.x+60,760,290),xyz(A.WRECK.x+60,760,145)),false);
});
check('central hatch remains open',()=>{
 assert.equal(A.shipBlocked(xyz(A.WRECK.x+70,585,0),xyz(A.WRECK.x+70,694,0)),false);
});
check('intact deck panels are solid',()=>{
 assert.ok(A.shipBlocked(xyz(A.WRECK.x+360,580,0),xyz(A.WRECK.x+360,690,0)));
});
check('sail and yards block fish',()=>{
 assert.ok(A.shipBlocked(xyz(A.WRECK.x-170,315,-55),xyz(A.WRECK.x-170,315,65)));
 assert.ok(A.shipBlocked(xyz(A.WRECK.x-220,255,0),xyz(A.WRECK.x-120,255,0)));
});
check('regular ship-move cannot pass through hull',()=>{
 const f={x:A.WRECK.x-390,y:750,z:300,mass:100,vx:0,vy:0,vz:-100};const old={...f};f.z=110;
 A.shipMove(f,old);
 assert.ok(f.z>235,`fish ended beyond wall: z=${f.z}`);
});
check('net is unavailable far away or at depth',()=>{
 const {s,fr,f,c}=fixture();f.x=fr.x+250;c.landReady=true;c.netGrace=.3;
 s.applyInputs({ANGLER:{ev:[{t:'land'}]}});
 assert.equal(fr.caught,0);
 f.x=fr.x+70;f.y=250;s.applyInputs({ANGLER:{ev:[{t:'land'}]}});
 assert.equal(fr.caught,0);
});
check('net accepts nearby surfacing catch and awards score exactly once',()=>{
 const {s,fr,f,c}=fixture();c.landReady=true;c.netGrace=.4;c.tension=.6;
 s.applyInputs({ANGLER:{ev:[{t:'land'}]}});
 assert.equal(fr.caught,1);assert.ok(fr.score>0);assert.equal(fr.cast,null);
 const effects=s.drainEvents().filter(e=>e.k==='net');assert.equal(effects.length,1);assert.equal(effects[0].fisherIndex,0);
 s.applyInputs({ANGLER:{ev:[{t:'land'}]}});assert.equal(fr.caught,1);
});
check('net cannot override fish break (red tension)',()=>{
 const {s,fr,c}=fixture();c.landReady=true;c.netGrace=.4;c.tension=1.1;
 s.applyInputs({ANGLER:{ev:[{t:'land'}]}});assert.equal(fr.caught,0);
});
check('net success does not require exhausted stamina',()=>{
 const {s,fr,f,c}=fixture();f.fightStamina=1;c.landReady=true;c.netGrace=.4;c.tension=.2;
 s.applyInputs({ANGLER:{ev:[{t:'land'}]}});assert.equal(fr.caught,1);
});
console.log(`${passes} net and wreck checks passed`);
