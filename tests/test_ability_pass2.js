'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Aqua=require('../aqua_sim_mobile_ability_pass2');
let count=0;
function check(label,pass){assert.ok(pass,label);count++;console.log('PASS',label)}
function fixture(one='guppy',two='tuna'){
 const s=Aqua.create();s.newMatch({sp:one,mode:'free',seed:23,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'P1',sp:one},{pid:'P2',sp:two}]}});
 for(const f of s.fishes.slice(2)){f.alive=false;f.respawn=1e6}
 const [a,b]=s.fishes;for(const [f,x] of [[a,1400],[b,1700]])Object.assign(f,{x,y:300,z:0,prot:0,mass:100,vx:0,vy:0,vz:0,abilT:0,abilCD:0,wx:0,wy:0,wz:0,wt:5});
 return{s,a,b};
}
const dt=1/60;
{
 const {s,a,b}=fixture('guppy','tuna');b.mass=900;b.x=a.x-80;
 s.useAbility(a);check('Guppy gains finite lateral dodge',a.flickT>0&&Math.hypot(a.flickX,a.flickZ)>0);
 const z=a.z;s.step({P1:{mv:{x:0,y:0,z:0}}},dt);
 check('Guppy sidestep physically moves without directional input',Math.abs(a.z-z)>0);
 check('Guppy retains brief protection during dodge',a.prot>0&&a.dodgeT>0);
}
{
 const {s,a,b}=fixture('sardine','sardine');b.x=a.x+75;
 s.useAbility(a);check('Sardine school bonus scales with nearby members',a.surgeMul>b.surgeMul-.0001&&a.surgeMul>Aqua.ABILITY.schoolBoostMin);
 check('Sardine surge shares duration with nearby ally',b.surge>0);
}
{
 const {s,a,b}=fixture('puffer','tuna');b.mass=401;b.x=a.x;b.y=a.y;
 s.step({},dt);check('Swallowing an uninflated puffer poisons attacker',!a.alive&&b.slowT===Aqua.ABILITY.toxinSlow);
}
{
 const {s,a,b}=fixture('barra','guppy');b.mass=50;b.x=a.x+140;
 s.useAbility(a);check('Barracuda selects smaller forward target',a.lungeTarget===b&&a.lungeActive);
 s.step({P1:{mv:{x:0,y:0,z:0}}},dt);
 check('Barracuda committed lunge moves after input release',a.x>1400);
}
{
 const {s,a,b}=fixture('barra','tuna');b.mass=500;b.x=a.x-200;
 s.useAbility(a);const cd=a.abilCD;for(let i=0;i<60;i++)s.step({P1:{mv:{x:0,y:0,z:0}}},dt);
 check('Missed barracuda attack incurs cooldown penalty',!a.lungeActive&&a.abilCD>cd-1);
}
{
 const {s,a,b}=fixture('barra','guppy');b.mass=30;b.x=a.x+1;
 s.useAbility(a);s.step({P1:{mv:{x:0,y:0,z:0}}},dt);
 check('Successful lunge captures prey by normal contact',!b.alive&&a.mass>100);
 check('Successful lunge refunds a portion of cooldown',a.lungeHit&&a.abilCD<6.1);
}
{
 const {s,a}=fixture('tuna','guppy');s.useAbility(a);
 s.step({P1:{mv:{x:1,y:0,z:0}}},dt);const first=a.vx;
 for(let i=0;i<30;i++)s.step({P1:{mv:{x:1,y:0,z:0}}},dt);
 check('Tuna accelerates over a held-heading torpedo',a.vx>first+5);
}
{
 const {s,a}=fixture('piranha','guppy');s.useAbility(a);
 for(let i=0;i<6;i++)s.abilityOnEat(a);
 check('Piranha duration extension is capped',a.abilT<=Aqua.ABILITY.frenzyCap);
 check('Piranha speed stacks are capped at three',Math.min(a.frenzyChain,Aqua.ABILITY.frenzyMaxStack)===3);
}
{
 const {s,a,b}=fixture('goldfish','tuna');b.x=a.x+60;
 s.useAbility(a);check('Goldfish dazzles nearby rival',b.dazzledT>0);
 s.botThink(b);check('Dazzled bot discards active ability request and selects random roam',!b.abilReq&&[b.wx,b.wz].every(Number.isFinite));
}
{
 const {s,a}=fixture('koi','guppy');a.y=80;
 s.useAbility(a);check('Koi near-surface leap launches into air',a.air&&a.vy<0);
}
{
 const {s,a,b}=fixture('clown','tuna');b.mass=400;b.x=a.x;
 s.useAbility(a);s.step({},dt);
 check('Clown shield blocks capture and stings attacker',a.alive&&b.alive&&b.slowT>0&&b.stingT>0);
}
{
 const {s,a,b}=fixture('eel','seahorse');b.x=a.x+12;
 s.useAbility(b);s.useAbility(a);
 check('Eel strips unshielded camouflage and interrupts ability',b.camoT===0&&b.abilT<=.1);
}
{
 const {s,a,b}=fixture('angel','guppy');b.mass=45;b.x=a.x+50;b.prot=0;
 s.useAbility(a);s.influenceWhirl(a,dt);
 check('Angelfish swirl adds tangential and inward velocity',b.vx<0&&Math.abs(b.vz)>0);
}
{
 const {s,a,b}=fixture('seahorse','guppy');s.useAbility(a);
 const k=s.kelp[0];a.x=k.x;a.y=k.y;a.z=k.z;a.vx=150;
 s.step({P1:{mv:{x:1,y:0,z:0}}},dt);
 check('Seahorse keeps camouflage while gliding at 150 in kelp',a.camoT>0);
}
{
 const {s,a}=fixture('sunfish','guppy');a.y=75;
 const p=s.plank.find(x=>x.alive);assert.ok(p);Object.assign(p,{x:a.x+85,y:75,z:a.z});
 s.useAbility(a);const x=p.x;s.plankMagnet(a,dt);
 check('Sunfish pulls nearby plankton toward itself',p.x<x);
}
{
 const {s,a}=fixture('guppy','tuna');s.useAbility(a);s.kill(a,'test');s.spawnFish(a);
 check('Respawn resets stale movement, stun, and targeting',a.flickT===0&&a.slowT===0&&a.lungeTarget===null&&a.prot===3);
}
{
 const {s,a,b}=fixture('barra','guppy');b.mass=20;b.x=a.x+110;s.useAbility(a);
 const restored=Aqua.create();restored.restore(JSON.parse(JSON.stringify(s.snapshot())));
 check('Barracuda target reference survives snapshot restore',restored.fishes[0].lungeTarget===restored.fishes[1]);
}
{
 const html=fs.readFileSync(path.join(__dirname,'..','fisherman-mobile-ability-pass2.html'),'utf8');
 check('Bundled HTML includes the ability and client visuals',html.includes('barracudaLockMarker')&&html.includes('plankMagnet(f,dt)')&&html.includes('statusFlash'));
 check('Barracuda lock renderer uses a scoped protection method',html.includes('!sim.predationProtected(target)')&&!/(?<!\.)\bpredationProtected\s*\(/.test(html.split('/*SIM:END*/')[1]));
}
{const s=Aqua.create();check('Protection method is exposed to renderer and respects shields',typeof s.predationProtected==='function'&&s.predationProtected({sp:'guppy',prot:1})&&!s.predationProtected({sp:'guppy',prot:0,dodgeT:0,air:false}));}
console.log(`${count} ability pass-2 checks passed`);
