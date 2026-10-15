'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Aqua=require('../aqua_sim');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name)}
function newGame(sp='tuna'){
 const sim=Aqua.create();sim.newMatch({sp,seed:88,mode:'free',competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'u',sp}]}});
 const f=sim.fishes[0];Object.assign(f,{x:1100,y:30,z:0,vx:180,vy:-250,vz:12,prot:600,hx:1,hz:0});return {sim,f};
}
function close(a,b,eps=1e-5){assert(Math.abs(a-b)<=eps,`Expected ${a} ~= ${b} (tol ${eps})`)}
test('A breach reaches the true waterline before entering an inverted ballistic parabola',()=>{
 const {sim,f}=newGame();let saw=false;
 for(let i=0;i<30;i++){
  const before={x:f.x,y:f.y,z:f.z};
  sim.step({u:{mv:{x:.7,y:-.7,z:.05}}},.02);
  assert(Number.isFinite(f.y)&&Number.isFinite(f.vy));
  if(f.air){assert(f.y<=0&&f.airT>=0,'Airborne fish starts above water');assert(f.x>before.x,'Forward motion continues');saw=true;break;}
 }
 assert(saw,'Launch must be reachable at a normal 50 Hz frame rate');
});
test('Single-step and substepped airborne travel follow identical gravity and horizontal distance',()=>{
 const {sim}=newGame();const a={x:1000,y:-50,z:0,vx:173,vy:-180,vz:-35,air:true,airT:0,minY:-50,jumps:0,best:0};
 const b={...a};sim.advanceAirborne(a,.54);for(let i=0;i<54;i++)sim.advanceAirborne(b,.01);
 for(const k of ['x','y','z','vx','vy','airT','minY'])close(a[k],b[k],.00001);
 assert.equal(a.air,true);
});
test('Apex reverses only vertical velocity, keeping heading and lateral velocity',()=>{
 const {sim}=newGame();const a={x:2000,y:-30,z:0,vx:190,vy:-140,vz:24,air:true,airT:0,minY:-30,jumps:0,best:0};
 sim.advanceAirborne(a,.16);assert(a.vy<0);close(a.vx,190);close(a.vz,24);
 const y=a.y;sim.advanceAirborne(a,.16);assert(a.vy>0);assert(a.y>y,'After the apex fish descends toward surface');
});
test('Landing advances remaining underwater fraction without dropping horizontal displacement',()=>{
 const {sim}=newGame();const f={x:800,y:-25,z:100,vx:160,vy:230,vz:40,air:true,airT:0,minY:-100,jumps:0,best:0,spawnSplashPending:false,prot:0};
 const old={...f};sim.advanceAirborne(f,.2);
 assert.equal(f.air,false);assert(f.y>=0&&f.y<100);close(f.x,old.x+old.vx*.2);close(f.z,old.z+old.vz*.2);
 close(f.vy,Math.sqrt(old.vy*old.vy-2*Aqua.GRAV*old.y));assert.equal(f.jumps,1);
 close(f.reentryT,.22);assert.equal(f.prot,0);
});
test('Net fish still gets six-second protection on splash, not again for ordinary jumps',()=>{
 const {sim,f}=newGame();Object.assign(f,{x:1400,y:-40,vx:80,vy:200,vz:0,air:true,minY:-60,spawnSplashPending:true,prot:0});
 sim.advanceAirborne(f,.3);assert(!f.air);close(f.prot,6);assert.equal(f.spawnSplashPending,false);
 Object.assign(f,{y:-25,vy:200,air:true,minY:-25,prot:-1});sim.advanceAirborne(f,.2);
 assert(!f.air);assert.equal(f.prot,-1);
});
test('Re-entering with propulsion held retains forward motion and adopts a descending swim heading',()=>{
 const {sim,f}=newGame();Object.assign(f,{x:1300,y:-12,vx:170,vy:230,vz:5,air:true,minY:-65,prot:500});
 sim.step({u:{mv:{x:1,y:-.3,z:0}}},.08);
 assert.equal(f.air,false);assert(f.reentryT>0);const vx=f.vx,vy=f.vy;
 sim.step({u:{mv:{x:.8,y:.6,z:0}}},.02);
 assert(f.x>1300,'Fish retains lateral forward continuity');
 assert(f.vx>0&&vx>0);assert(f.vy>0&&vy>0,'The downward impact tangent survives first underwater step');
});
test('Koi breach ability uses the same continuous flight and water-entry solver',()=>{
 const {sim,f}=newGame('koi');
 Object.assign(f,{x:1800,y:70,z:0,vx:165,vy:-100,vz:0,prot:200,abilCD:0});
 assert.equal(sim.useAbility(f),true);
 assert.equal(f.air,true);
 const startX=f.x;let landed=false;
 for(let i=0;i<100;i++){
  sim.step({u:{mv:{x:1,y:.3,z:0}}},.03);
  if(!f.air){landed=true;break;}
 }
 assert(landed);assert(f.jumps>=1);assert(f.x>startX);
});
test('Water-entry camera eases its pitch rather than snapping instantly',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const beg=html.indexOf('let previousPlayerAir=false,waterEntryCameraTarget=null');const end=html.indexOf('function loop(now)',beg);
 assert(beg>0&&end>beg);
 const ctx={playerRole:'fish',state:'play',human:{alive:true,air:false,reentryT:.21,vx:160,vy:250,vz:0},
  pitch:.20,swimPitch:-.6,NEUTRAL:.32,PMIN:-.5,PMAX:1.2,recenter:null,
  moveVec:()=>({x:1,y:0,z:0}),clamp:(v,l,h)=>Math.max(l,Math.min(v,h)),Math};
 vm.createContext(ctx);vm.runInContext(html.slice(beg,end),ctx);
 vm.runInContext('previousPlayerAir=true;applyAutomaticWaterEntryPitch(.016)',ctx);
 assert(ctx.swimPitch>0,'Control heading switches toward descending trajectory');
 assert(ctx.pitch>.20&&ctx.pitch<.40,'Camera advances a fraction rather than snapping to desired pitch');
 const p=ctx.pitch;vm.runInContext('applyAutomaticWaterEntryPitch(.016)',ctx);
 assert(ctx.pitch>p,'Camera converges smoothly during recovery');
});
test('Re-entry without held propulsion does not create artificial steering',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const beg=html.indexOf('let previousPlayerAir=false,waterEntryCameraTarget=null');const end=html.indexOf('function loop(now)',beg);
 const ctx={playerRole:'fish',state:'play',human:{alive:true,air:false,reentryT:.21,vx:140,vy:240,vz:0},
  pitch:.22,swimPitch:-.55,NEUTRAL:.32,PMIN:-.5,PMAX:1.2,recenter:null,
  moveVec:()=>({x:0,y:0,z:0}),clamp:(v,l,h)=>Math.max(l,Math.min(v,h)),Math};
 vm.createContext(ctx);vm.runInContext(html.slice(beg,end),ctx);
 vm.runInContext('previousPlayerAir=true;applyAutomaticWaterEntryPitch(.016)',ctx);
 close(ctx.swimPitch,-.55);close(ctx.pitch,.22);
});
test('Waterline environment blends continuously above and below the surface',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert(html.includes('const underwaterMix=clamp((cd+45)/90,0,1);'));
 assert(html.includes('scene.fog.density=.000035+.000030*underwaterMix;'));
 assert(!html.includes("if(cd<0){_c.copy(cSky)"));
});
console.log(`${checks} continuous leap/reentry checks passed`);
