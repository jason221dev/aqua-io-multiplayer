const assert=require('node:assert/strict');const Aqua=require('../aqua_sim');
const DT=1/30;let passed=0;
function arena(roster){const s=Aqua.create();s.newMatch({sp:roster[0],mode:'last',seed:5,competitorCount:Math.max(8,roster.length),maxTotalFish:400,npcCount:0,miniFishCount:0,slots:{fish:roster.map(sp=>({sp}))}});s.fishes.forEach((f,i)=>{f.x=300+i*450;f.z=-700+i*60;f.y=400;f.prot=0;f.mass=100;f.abilCD=999;f.wt=1e9;f.wx=f.wy=f.wz=0});s.fishers.forEach(fr=>{fr.x=5000;fr.z=800;fr.cd=9999});return s;}
function run(s,secs){for(let i=0;i<Math.round(secs/DT);i++)s.step({},DT);}
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('Guppy imposes overshoot on nearby stronger fish',()=>{const s=arena(['guppy','barra']),g=s.fishes[0],b=s.fishes[1];g.x=1000;g.z=0;g.mass=100;b.x=880;b.z=0;b.mass=300;g.abilCD=0;assert(s.useAbility(g));assert(b.turnLockT>.3);});
test('Goldfish shimmer dazzles without granting self-protection',()=>{const s=arena(['goldfish','guppy']),g=s.fishes[0],p=s.fishes[1];g.x=1000;g.z=0;g.mass=200;p.x=1060;p.z=0;g.abilCD=0;assert(s.useAbility(g));assert(!s.predationProtected(g));assert(p.dazzledT>0);});
test('Torpedoing tuna ignores eel stun and clears CC',()=>{const s=arena(['tuna','eel']),t=s.fishes[0],e=s.fishes[1];t.x=1000;t.z=0;e.x=1045;e.z=0;t.abilCD=0;e.abilCD=0;assert(s.useAbility(t));assert(s.useAbility(e));assert.equal(t.shockT||0,0);t.slowT=1;t.dazzledT=1;run(s,.05);assert.equal(t.slowT,0);assert.equal(t.dazzledT,0);});
test('Seahorse camouflage bite grants bonus biomass and reveals attacker',()=>{const gain=hide=>{const s=arena(['seahorse','guppy']),h=s.fishes[0],p=s.fishes[1];h.mass=200;h.x=1000;h.z=0;p.mass=50;p.x=1030;p.z=0;if(hide){h.abilCD=0;s.useAbility(h)}const mass=h.mass;run(s,.1);assert(!p.alive);return {delta:h.mass-mass,camo:h.camoT}};const a=gain(false),b=gain(true);assert(b.delta>a.delta*1.4);assert.equal(b.camo,0);});
console.log(passed+' ability identity checks passed');
