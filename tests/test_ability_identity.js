const assert=require('node:assert/strict');
const Aqua=require('../aqua_sim');
let passed=0;function check(name,fn){fn();console.log('PASS '+name);passed++}
const DT=1/30;
function arena(roster){
  const s=Aqua.create();
  s.newMatch({sp:roster[0],mode:'last',seed:5,competitorCount:Math.max(8,roster.length),maxTotalFish:400,npcCount:0,miniFishCount:0,slots:{fish:roster.map(sp=>({sp}))}});
  s.fishes.forEach((f,i)=>{f.x=300+i*450;f.z=-700+i*60;f.y=400;f.prot=0;f.mass=100;f.abilCD=999;f.wt=1e9;f.wx=f.wy=f.wz=0});
  s.fishers.forEach(fr=>{fr.x=5000;fr.z=800;fr.cd=9999});
  return s;
}
const run=(s,secs)=>{for(let i=0;i<Math.round(secs/DT);i++)s.step({},DT)};
check('Guppy dart makes a nearby chaser overshoot: momentum kept, steering suppressed',()=>{
  const turn=use=>{const s=arena(['guppy','barra']),g=s.fishes[0],b=s.fishes[1];
    g.mass=100;b.mass=300;g.x=1000;g.y=400;g.z=0;b.x=880;b.y=400;b.z=0;b.vx=190;b.hx=1;b.wx=0;b.wz=1;
    if(use){g.abilCD=0;s.useAbility(g);assert(b.turnLockT>0)}
    run(s,.3);return b.vz};
  assert(turn(true)<turn(false)*.6,'locked chaser must turn far less');
});
check('Goldfish shimmer grants no self-protection but dazzled fish swerve',()=>{
  const s=arena(['goldfish','guppy']),g=s.fishes[0],p=s.fishes[1];
  g.mass=200;g.x=1000;g.y=400;g.z=0;p.x=1060;p.y=400;p.z=0;g.abilCD=0;
  assert(s.useAbility(g));assert(!s.predationProtected(g),'no shield');assert(p.dazzledT>0);
  const swerve=dz=>{const t=arena(['guppy']),q=t.fishes[0];q.x=1000;q.y=400;q.z=0;q.wx=1;q.dazzledT=dz;run(t,.3);return Math.abs(q.vz)};
  assert(swerve(1)>3&&swerve(0)<1e-6);
});
check('Torpedoing tuna ignores eel stun, ability cancel, slows and dazzle',()=>{
  const s=arena(['tuna','eel']),t=s.fishes[0],e=s.fishes[1];
  t.mass=200;t.x=1000;t.y=400;t.z=0;e.mass=100;e.x=1045;e.y=400;e.z=0;
  t.abilCD=0;assert(s.useAbility(t));e.abilCD=0;assert(s.useAbility(e));
  assert.equal(t.shockT||0,0);assert(t.abilT>.3);
  t.slowT=1;t.dazzledT=1;run(s,.05);assert.equal(t.slowT,0);assert.equal(t.dazzledT,0);
  const c=arena(['tuna','eel']),ct=c.fishes[0],ce=c.fishes[1];ct.x=1000;ct.y=400;ct.z=0;ce.x=1045;ce.y=400;ce.z=0;ce.abilCD=0;c.useAbility(ce);
  assert(ct.shockT>0,'a tuna that is not torpedoing is stunned normally');
});
check('Seahorse ambush: bite from camouflage grows extra and blows cover',()=>{
  const gain=hide=>{const s=arena(['seahorse','guppy']),h=s.fishes[0],p=s.fishes[1];
    h.mass=200;h.x=1000;h.y=400;h.z=0;p.mass=50;p.x=1030;p.y=400;p.z=0;
    if(hide){h.abilCD=0;s.useAbility(h);assert(h.camoT>0)}
    const m0=h.mass;run(s,.1);assert(!p.alive,'prey eaten');return{g:h.mass-m0,camo:h.camoT}};
  const a=gain(false),b=gain(true);
  assert(b.g>a.g*1.4,'ambush bonus');assert.equal(b.camo,0);
});
console.log(passed+' ability identity checks passed');
