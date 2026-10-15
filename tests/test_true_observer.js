'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),Aqua=require('../aqua_sim');
let checks=0;
function t(name,fn){fn();console.log('PASS '+name);checks++}
function fixture(mode='free'){const s=Aqua.create();s.newMatch({sp:'guppy',mode,seed:4,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:20,slots:{fish:[{pid:'player',sp:'guppy'}]}});return{s,f:s.fishes[0]}}
t('Spectating withdraws player from active roster',()=>{const{s,f}=fixture();assert.equal(s.fishes.filter(x=>x.alive).length,200);assert(s.setObserver('player',true));assert(!f.alive&&f.observing);assert.equal(s.fishes.filter(x=>x.alive).length,199);assert.equal(f.respawn,Infinity)});
t('Free Roam observer never auto-respawns or gains kills',()=>{const{s,f}=fixture();s.setObserver('player',true);for(let i=0;i<2500;i++)s.step({player:{mv:{x:1,y:1,z:1},tap:1}},.1);assert(!f.alive&&f.observing);assert.equal(f.fishEaten,0)});
t('No duplicate/unknown observer transitions',()=>{const{s,f}=fixture();assert.equal(s.setObserver('unknown',true),false);assert(s.setObserver('player',true));assert(s.setObserver('player',true));assert(!f.alive)});
t('Free Roam returns as mass-100 fish with 6-second shield',()=>{const{s,f}=fixture();f.mass=900;assert(s.setObserver('player',true));assert(s.setObserver('player',false));assert(f.alive&&!f.observing);assert.equal(f.mass,100);assert.equal(f.prot,6)});
t('Last Fish Standing observer cannot rejoin ongoing match',()=>{const{s,f}=fixture('last');assert(s.setObserver('player',true));assert.equal(s.setObserver('player',false),false);s.step({},.1);assert(!f.alive&&f.observing)});
t('Observer contributes zero competitive score',()=>{const{s,f}=fixture();f.mass=800;f.surv=200;s.setObserver('player',true);assert.equal(s.sides().fs[f.i],0)});
t('Observer is not an alive predator or edible target',()=>{const{s,f}=fixture();s.setObserver('player',true);assert(!s.fishes.some(x=>x.alive&&x.pid==='player'))});
t('Observer withdraws cleanly from a fisherman line',()=>{const{s,f}=fixture();const fr=s.fishers[0];fr.cast={state:'fight',fish:[f],tension:.3};f.hooked={fr};assert(s.setObserver('player',true));assert.equal(fr.cast,null);assert.equal(f.hooked,null)});
t('Client wires the authoritative observer API and camera actions',()=>{const h=fs.readFileSync('index.html','utf8');assert(h.includes('sim.setObserver(ME,true)'));assert(h.includes('sim.setObserver(ME,false)'));assert(h.includes("?'NEW MATCH':'SPAWN AS FISH'"));assert(h.includes('function observerFlight(dt)'))});
console.log(checks+' true observer checks passed');