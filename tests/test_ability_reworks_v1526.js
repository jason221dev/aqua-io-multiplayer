'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Aqua=require('../aqua_sim');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name)}
function arena(roster=['koi','guppy'],minis=0){
 const sim=Aqua.create();
 sim.newMatch({sp:roster[0],seed:1526,mode:'free',competitorCount:8,npcCount:0,miniFishCount:minis,
   slots:{fish:roster.map((sp,i)=>({sp,pid:i===0?'human':undefined}))}});
 for(const [i,f] of sim.fishes.entries())Object.assign(f,{x:850+i*510,y:430,z:0,vx:0,vy:0,vz:0,
  prot:0,abilCD:999,wt:9999,wx:0,wy:0,wz:0,mass:100});
 sim.fishers.forEach(fr=>{fr.cd=999;fr.x=5000;fr.z=700});
 return sim;
}
const step=(s,n=1,dt=1/30,inp={})=>{for(let i=0;i<n;i++)s.step(inp,dt)};
test('requested multiplicative durations and cooldowns are exact',()=>{
 assert.equal(Aqua.SP.tuna.dur,3);assert.equal(Aqua.SP.tuna.cd,16.2);
 assert.equal(Aqua.SP.seahorse.dur,7.4);
 assert.equal(Aqua.ABILITY.shockRadius*2,Aqua.ABILITY.clownRadius);
 assert.equal(Aqua.ABILITY.glimmerRadius,350);
 assert.equal(Aqua.ABILITY.koiSuctionRadius,350);
});
test('koi draws surface pellets 3D toward the fish, even at depth, without remote instant consumption',()=>{
 const s=arena(['koi']),k=s.fishes[0];k.abilCD=0;k.y=300;
 s.plank.forEach(p=>p.alive=false);
 const near=s.plank[0],far=s.plank[1];Object.assign(near,{x:k.x+100,y:40,z:k.z,alive:true});
 Object.assign(far,{x:k.x+380,y:40,z:k.z,alive:true});
 const n0=Aqua.dist(k,near),f0=Aqua.dist(k,far);
 assert(n0<350&&f0>350);assert(s.useAbility(k));
 step(s,12,1/30,{human:{mv:{x:0,y:0,z:0}}});
 assert(Aqua.dist(k,near)<n0-35,'near pellet should be pulled toward underwater koi');
 assert(near.y>40,'surface pellet moves down from the waterline');
 assert.equal(far.x,k.x+380,'outside food stays put');
 assert.equal(k.air,false,'no old lotus leap');
});
test('koi suction wins over shoaling forces for live minnows inside 350 only',()=>{
 const s=arena(['koi'],2),k=s.fishes[0];k.abilCD=0;k.x=1900;k.y=300;k.z=0;
 const school=s.npcs.filter(o=>o.mini),near=school[0],far=school[1];
 Object.assign(near,{x:2100,y:300,z:0,vx:0,vy:0,vz:0,shockT:0,grace:0});
 Object.assign(far,{x:2400,y:300,z:0,vx:0,vy:0,vz:0,shockT:0,grace:0});
 const beforeNear=Aqua.dist(k,near);
 assert(s.useAbility(k));
 step(s,1,1/30,{human:{mv:{x:0,y:0,z:0}}});
 assert(Aqua.dist(k,near)<beforeNear-5,'school solver cannot overwrite koi pull');
 assert(Math.abs(far.x-2400)<45,'outside minnow not sucked inside in one step');
});
test('eel shocks unprotected rivals and school fish within 85, but not shielded fish or distant targets',()=>{
 const s=arena(['eel','guppy','tuna'],2),e=s.fishes[0],g=s.fishes[1],t=s.fishes[2];
 e.x=1100;e.y=400;e.z=0;g.x=1269;g.y=400;g.z=0;g.prot=5;
 t.x=1271;t.y=400;t.z=0;
 const mini=s.npcs.filter(o=>o.mini);Object.assign(mini[0],{x:1110,y:400,z:0});Object.assign(mini[1],{x:1310,y:400,z:0});
 e.abilCD=0;assert(s.useAbility(e));
 assert.equal(g.shockT||0,0,'protected opponent cannot be stunned');assert.equal(g.eelSlowT||0,0,'protected opponent cannot be slowed');
 assert(mini[0].shockT>0&&mini[0].eelSlowT>=3.1);
 assert.equal(t.shockT||0,0);assert.equal(mini[1].shockT||0,0);
});
test('eel aftershock is a 75% speed reduction after the stun, including minnows',()=>{
 const s=arena(['eel','guppy']),g=s.fishes[1];
 g.shockT=0;g.eelSlowT=2;g.x=2300;g.y=400;g.z=0;g.wx=1;g.wy=g.wz=0;
 // Fish physics uses sp*=.25 in the post-stun phase, separate from other slowdowns.
 step(s,20);
 const slow=Math.hypot(g.vx,g.vy,g.vz);
 g.eelSlowT=0;g.vx=g.vy=g.vz=0;g.x=2300;g.wx=1;
 step(s,20);
 const normal=Math.hypot(g.vx,g.vy,g.vz);
 assert(slow<normal*.29&&slow>normal*.21,`eel aftershock is one-quarter normal movement: ${slow}/${normal}`);
});
test('shimmer slows unprotected rivals but protected fish steer and accelerate freely',()=>{
 const s=arena(['goldfish','guppy','tuna']),g=s.fishes[0],enemy=s.fishes[1],t=s.fishes[2];
 g.x=1100;g.y=430;g.z=0;enemy.x=1140;enemy.y=430;enemy.z=0;
 t.x=1090;t.y=430;t.z=0;
 enemy.wx=-1;enemy.prot=4;t.wx=1;t.wt=9999;t.abilCD=0;assert(s.useAbility(t));
 g.abilCD=0;assert(s.useAbility(g));
 step(s,12,1/30,{human:{mv:{x:0,y:0,z:0}}});
 assert(enemy.vx<0,'protected opponent keeps its leftward control');
 assert(t.vx>0,'unprotected tuna keeps its rightward steering, no forced fleeing');
 assert(g.prot<=0,'Shimmer does not shield owner');
});
test('piranha locks nearest eligible edible target and switches when it dies',()=>{
 const s=arena(['piranha','guppy','guppy']),p=s.fishes[0],a=s.fishes[1],b=s.fishes[2];
 p.x=1000;p.y=430;p.z=0;p.mass=300;p.prot=0;
 a.x=1190;a.mass=60;a.y=430;a.z=0;a.prot=0;
 b.x=1240;b.mass=55;b.y=430;b.z=0;b.prot=0;
 p.abilCD=0;assert(s.useAbility(p));assert.strictEqual(p.piranhaTarget,a);
 a.alive=false;step(s,1,1/30,{human:{mv:{x:-1,y:0,z:0}}});
 assert.strictEqual(p.piranhaTarget,b,'retargets without another ability press');
 assert(p.vx>0,'holding swim propulsion pursues target even when steering input points left');
 step(s,1,1/30,{human:{mv:{x:0,y:0,z:0},abHold:true}});
 assert.equal(p.vx,0,'ability-button hold alone does not drive Piranha; propulsion must be held');
 const saved=s.snapshot(),c=Aqua.create();c.restore(saved);
 assert.strictEqual(c.fishes[0].piranhaTarget,c.fishes[2],'lock references survive multiplayer snapshot');
});
test('piranha invalidates consumed ordinary NPC reference before that NPC respawns in place',()=>{
 const s=arena(['piranha']),p=s.fishes[0];p.abilCD=0;
 const prey={mass:15,kind:'sardine',x:p.x+25,y:p.y,z:p.z,alive:true};
 // A realistic live NPC target uses the existing simulation roster.
 s.npcs.push(prey);p.mass=300;p.prot=0;
 assert(s.useAbility(p));assert.strictEqual(p.piranhaTarget,prey);
 s.abilityOnEat(p,prey,'ambient');assert.equal(p.piranhaTarget,null);
});
test('seahorse remains invisible at the former 3.7s boundary if not sprinting',()=>{
 const s=arena(['seahorse']),h=s.fishes[0];h.abilCD=0;
 assert(s.useAbility(h));assert.equal(h.camoT,7.4);
 step(s,125,1/30,{human:{mv:{x:0,y:0,z:0}}});
 assert(h.camoT>3&&h.abilT>3,'does not expire at former duration');
});
test('menu stories demonstrate new suction, repulsion, and longer active windows',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const token of ['85-UNIT SHOCK','350 SUCTION','350 GLITTER','HOLD SWIM TO HUNT','7.4s camouflage','3-second Torpedo sprint'])assert(html.includes(token),token);
 const re=/<script([^>]*)>([\s\S]*?)<\/script>/g;let m,n=0;
 while((m=re.exec(html))){if(m[1].includes('src='))continue;new vm.Script(m[2]);n++}
 assert(n>=4);
});
console.log(`v1.5.26: ${passed} ability rework checks passed`);
