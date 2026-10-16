'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Aqua=require('../aqua_sim');
let count=0;
const test=(label,fn)=>{fn();console.log('PASS '+label);count++};
function arena(species,mini=0){
 const s=Aqua.create();
 s.newMatch({sp:species[0],mode:'free',seed:1532,competitorCount:8,npcCount:0,miniFishCount:mini,
  slots:{fish:species.map((sp,i)=>({sp,pid:i===0?'human':undefined}))}});
 s.fishes.forEach((f,i)=>Object.assign(f,{x:1200+i*400,y:420,z:0,vx:0,vy:0,vz:0,
  prot:0,mass:100,wt:99999,wx:0,wy:0,wz:0,abilCD:999}));
 s.fishers.forEach(f=>{f.cd=9999;f.x=5000;f.z=700});
 return s;
}
const steer=(s,x=1,abHold=false)=>s.step({human:{mv:{x,y:0,z:0},abHold}},1/30);
test('Piranha locks prey; swim propulsion, not ability-button hold, triggers pursuit',()=>{
 const s=arena(['piranha','guppy']);const [p,g]=s.fishes;
 Object.assign(p,{x:1200,mass:300,abilCD:0});Object.assign(g,{x:1430,mass:50});
 assert(s.useAbility(p));assert.equal(p.piranhaTarget,g);
 steer(s,-1,false);assert(p.vx>0,'holding swim propulsion auto-pursues nearest locked prey');
 const target=p.piranhaTarget;
 steer(s,0,false);assert.equal(p.vx,0,'releasing swim input stops the fish');
 assert.equal(p.piranhaTarget,target,'lock retained without chase');
 steer(s,0,true);assert.equal(p.vx,0,'holding ability button alone does not propel fish');
 steer(s,-1,false);assert(p.vx>0,'swim propulsion re-engages auto pursuit regardless of manual heading');
 assert.equal(p.piranhaTarget,target,'lock survives release');
});
test('Piranha retargets when prey dies, chasing only while swim propulsion is held',()=>{
 const s=arena(['piranha','guppy','sardine']);const [p,a,b]=s.fishes;
 Object.assign(p,{mass:350,abilCD:0,x:1200});Object.assign(a,{mass:50,x:1380});Object.assign(b,{mass:55,x:1510});
 assert(s.useAbility(p));assert.equal(p.piranhaTarget,a);
 a.alive=false;steer(s,1,false);assert.equal(p.piranhaTarget,b);assert(p.vx>0);
 steer(s,0,false);assert.equal(p.vx,0);
 b.prot=6;for(const extra of s.fishes.slice(3))extra.prot=6;steer(s,-1,true);assert.equal(p.piranhaTarget,null,'protected prey cannot be locked');
 assert(p.vx<0,'without an eligible target, manual steering remains available');
});
test('Piranha stopped (no swim or hold) cannot move; expired ability stops chasing',()=>{
 const s=arena(['piranha','guppy']);const [p,g]=s.fishes;
 Object.assign(p,{mass:300,abilCD:0});Object.assign(g,{mass:50,x:1460});
 assert(s.useAbility(p));steer(s,1,false);assert(p.vx>0);
 p.abilT=1/100;steer(s,0,true);assert.equal(p.vx,0);
 assert.equal(p.piranhaTarget,null);
});
test('Goldfish reduces nearby rivals speed but never forces their headings',()=>{
 const s=arena(['goldfish','guppy','guppy']);const [gold,slow,protectedFish]=s.fishes;
 Object.assign(gold,{x:1500,mass:100,abilCD:0});Object.assign(slow,{x:1600,wx:-1,wt:9999});
 Object.assign(protectedFish,{x:1630,wx:-1,wt:9999,prot:5});
 assert(s.useAbility(gold));assert(slow.dazzledT>0);assert.equal(protectedFish.dazzledT,0);
 s.step({},1/30);assert(slow.vx<0,'not steered away from goldfish');
 assert(Math.abs(protectedFish.vx)>Math.abs(slow.vx),'protected prey ignores speed penalty');
});
test('Angelfish halo slows smaller fish without steering changes and excludes larger and protected fish',()=>{
 const s=arena(['angel','guppy','guppy','puffer']);const [a,small,shielded,big]=s.fishes;
 Object.assign(a,{x:1800,mass:320,abilCD:0});
 Object.assign(small,{x:1900,mass:50,wx:1,wt:99999});
 Object.assign(shielded,{x:1940,mass:50,wx:1,wt:99999,prot:4});
 Object.assign(big,{x:1950,mass:400,wx:1,wt:99999});
 assert(s.useAbility(a));s.step({},1/30);
 assert(small.vx>0&&small.vx<shielded.vx*.65,'smaller prey slowed, heading retained');
 assert(big.vx>small.vx,'large fish unaffected');
 assert.equal(small.vz,0,'no swirl applied');
});
test('Guppy Mirror Dart only alters its own state, never enemy movement controls',()=>{
 const s=arena(['guppy','barra']),[g,b]=s.fishes;
 Object.assign(g,{x:1200,abilCD:0});Object.assign(b,{x:1280,mass:300,wx:-1});
 assert(s.useAbility(g));assert(g.flickT>0&&g.dodgeT>0);
 assert.equal(b.turnLockT,0);s.step({},1/30);assert(b.vx<0);
});
test('Network protocol includes held state and immediate release; no remote target rings',()=>{
 const html=fs.readFileSync('index.html','utf8'),server=fs.readFileSync('server.js','utf8'),src=fs.readFileSync('aqua_sim.js','utf8');
 for(const t of ['const abilityPointers=new Set()',"abHold:abilityPointers.size>0||!!keys[' ']",'function publishAbilityRelease()',"const piranhaChasing=",'Math.hypot(f.in.mv.x',"if(typeof abilityPointers!=='undefined')abilityPointers.clear()"])
  assert(html.includes(t),'missing client contract: '+t);
 for(const t of ['q.abHold=frame.abHold===true;','q.abHold=false;','abHold:q.abHold===true'])assert(server.includes(t),'missing server contract: '+t);
 assert(src.includes('return{mv,bt,hold:inp?.abHold===true};'));
 assert(!src.includes('goldfishRepulsion('));
 assert(!src.includes('other.turnLockT=Math.max('));
 assert(html.includes('Opponents receive no floating special-ability indicator batches.'));
 assert(html.includes("if(e.target.closest?.('#ab')&&human?.sp==='piranha')return;"),'ability button does not spuriously trigger forward swimming');
 assert(html.includes("abHold:abilityPointers.size>0||!!keys[' ']}});"),'network preserves ability-button hold separately from swim propulsion');
 let scripts=0;for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(match[1].includes('src='))continue;new vm.Script(match[2]);scripts++}
 assert(scripts>=4);
});
console.log(`v1.5.32: ${count} targeted tests passed`);
