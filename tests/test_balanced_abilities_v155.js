'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../aqua_sim_mobile_v155'),species=Object.keys(A.SP);
let passed=0;function test(name,condition){assert.ok(condition,name);passed++}
test('13 unique fish specialties',species.length===13&&new Set(species.map(k=>A.SP[k].abil)).size===13);
for(const k of species){const q=A.SP[k];test(k+' bounded cadence',q.cd>q.dur*2.5&&q.cd<=14&&q.dur>0&&q.dur<=2.6)}
function fixture(spA='guppy',spB='tuna'){
 const s=A.create();s.newMatch({seed:8155,mode:'free',competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'A',sp:spA},{pid:'B',sp:spB}],fishers:[{pid:'ang'}]}});
 for(const o of s.fishes.slice(2)){o.alive=false;o.respawn=999}
 const [a,b]=s.fishes;for(const [f,x] of [[a,1500],[b,1700]])Object.assign(f,{x,y:430,z:0,prot:0,abilT:0,abilCD:0,mass:100,displayMass:100});
 return{s,a,b,fr:s.fishers.find(f=>f.pid==='ang')};
}
for(const sp of species){const {s,a}=fixture(sp);test(sp+' activates once then locks until cooldown',s.useAbility(a)&&!s.useAbility(a))}
{
 const {s,a,b}=fixture('puffer');b.x=a.x;b.mass=240;s.useAbility(a);test('3x effective mass not real mass',A.combatMass(a)===300&&a.mass===100);s.step({},1/60);test('puffer can eat 240 at real mass 100',a.alive&&!b.alive);
}
{
 const {s,a,b}=fixture('clown');b.x=a.x;b.mass=500;s.useAbility(a);s.step({},1/60);test('clown shield beats predation',a.alive&&b.alive);
}
{
 const {s,a,b}=fixture('angel');b.x=a.x+30;b.mass=50;b.prot=2;s.useAbility(a);s.influenceWhirl(a,1/60);test('whirl respects shield',!b.vx);b.prot=0;s.influenceWhirl(a,1/60);test('whirl attracts smaller prey',b.vx<0);
}
{
 const {s,a,fr}=fixture('eel');fr.x=a.x;fr.z=a.z;s.useAbility(a);test('eel disrupts reel briefly without deleting cast',fr.shockT===A.ABILITY.eelFisherInterrupt);
}
{
 const {s,a,b}=fixture();b.x=a.x;b.mass=100;s.step({},1/60);test('equal mass is safe',a.alive&&b.alive);
}
{
 const {s,a,b}=fixture();b.x=a.x;b.mass=101;s.step({},1/60);test('higher mass eats lower mass',!a.alive&&b.alive);
}
const html=fs.readFileSync(path.join(__dirname,'../fisherman-mobile-v155.html'),'utf8');
test('single contextual fish action and clear cooldown',html.includes('id="abilityTip"')&&html.includes('BREAK LINE')&&html.includes('RECHARGING'));
test('fisher three-zone reel feedback',html.includes('data-zone')&&html.includes('RELEASE!')&&html.includes('DEPTH LOCKED'));
test('new multiplayer variant',html.includes("variant:'fisher-mobile-v155'"));
test('fisher advantage is target not a fabricated measured rate',A.BALANCE.fisherTargetCatchShare===.55);
console.log('PASS '+passed+' v1.5.5 staged balance checks');
