'use strict';
const assert=require('node:assert/strict');
const Aqua=require('../aqua_sim');
const fs=require('node:fs');
const make=(mode,seed=419)=>{const s=Aqua.create();s.newMatch({sp:'guppy',mode,seed,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:30,slots:{fish:[{pid:'ME',sp:'guppy'}]}});return s};
const s=make('last');
assert.equal(s.fishes.length,200);assert(s.fishes.every(f=>f.mass===100));
assert(s.fishes.every(f=>f.y>=65&&f.y<=160&&f.prot===8));
assert(s.plank.some(p=>p.alive&&Math.hypot(p.x-s.fishes[0].x,p.z-s.fishes[0].z)<120));
const h=s.fishes[0],p=s.plank.find(p=>p.alive);
h.x=p.x;h.y=p.y;h.z=p.z;
s.step({ME:{mv:{x:0,y:0,z:0}}},1/30);
assert(h.mass>100&&(h.mass-100)%6===0);
assert(s.feed.some(x=>x.to==='ME'&&x.s.includes('Surface food +6')));
const snap=JSON.parse(JSON.stringify(s.snapshot())),restored=Aqua.create();restored.restore(snap);
assert.equal(restored.fishes[0].mass,h.mass);assert.equal(restored.fishes[0].prot,h.prot);
const free=make('free'),q=free.plank.find(x=>x.alive);
assert.equal(free.fishes[0].y,570);assert(free.fishes.every(f=>f.prot===0));
free.fishes[0].x=q.x;free.fishes[0].y=q.y;free.fishes[0].z=q.z;
free.step({ME:{mv:{x:0,y:0,z:0}}},1/30);
assert(free.fishes[0].mass>100&&(free.fishes[0].mass-100)%3===0);
for(const seed of [419,420,421]){
 const game=make('last',seed),player=game.fishes[0];
 for(let i=0;i<105;i++){
  let best=null,dd=Infinity;
  for(const pellet of game.plank)if(pellet.alive){
   const d=(pellet.x-player.x)**2+(pellet.y-player.y)**2+(pellet.z-player.z)**2;
   if(d<dd){dd=d;best=pellet}
  }
  const dx=(best?.x??player.x)-player.x,dy=(best?.y??player.y)-player.y,dz=(best?.z??player.z)-player.z,d=Math.hypot(dx,dy,dz)||1;
  game.step({ME:{mv:{x:dx/d,y:dy/d,z:dz/d}}},1/30);
 }
 assert(player.alive&&player.mass>=112,'playable growth: seed '+seed);
 assert.equal(game.state,'play');
}
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
assert(html.includes('Swim up to yellow surface food to GROW'));
console.log('PASS Last Fish Standing growth, nutrition, fair spawning, snapshot, HUD and free-roam separation');
