'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function harness(){
  const start=html.indexOf('const continuousFlightCamera={pitch:NaN,flightMix:0};');
  const end=html.indexOf('function draw3D(dt){',start);
  assert(start>=0&&end>start,'camera rig exists and is before draw loop');
  const context={Math,NEUTRAL:.32,clamp:(n,lo,hi)=>Math.max(lo,Math.min(hi,n))};
  vm.createContext(context);
  vm.runInContext(html.slice(start,end)+'\nthis.__rig=continuousFlightCamera;',context);
  return {context,step:(dt,fish,pitch=.32,enabled=true)=>context.continuousFlightCameraPitch(dt,fish,pitch,enabled)};
}
function trace(dt){
 const rig=harness();let pitch=.32,prev=pitch;
 const samples=[];
 const total=2.6;
 for(let t=0;t<total-.0000001;t+=dt){
   // 0.25s prelaunch; 0.25-1.60s air; splash at 1.60s;
   // reentry blend 0.22s and normal underwater movement afterward.
   const air=t>=.25&&t<1.60;
   const phase=t-.25;
   const vy=air?-440+700*phase:t<.25?-160:t<1.82?485:140;
   const y=air?-Math.max(0,440*phase-350*phase*phase):t<.25?30:t<1.82?4:40;
   const f={x:1100+160*t,y,air,reentryT:t>=1.60&&t<1.82?1.82-t:0,vx:160,vy,vz:0};
   pitch=rig.step(dt,f,.32);
   assert(Number.isFinite(pitch));
   assert(Math.abs(pitch-prev)<=1.75*dt+1e-10,`Abrupt camera delta at ${t}: ${pitch-prev}`);
   samples.push({t,pitch,air});prev=pitch;
 }
 return samples;
}
test('camera pitch bounded through launch, apex, splash and swim for 20-120 Hz',()=>{
 for(const hz of [20,30,60,90,120])trace(1/hz);
});
test('camera anticipates the breach before the fish enters air',()=>{
 const h=harness(),f={x:0,y:30,air:false,reentryT:0,vx:160,vy:-300,vz:0};
 h.step(.016,f,.32);
 assert(h.context.__rig.flightMix>0);
 assert(h.step(.016,f,.32)<.32);
});
test('camera follows physical descending velocity before water contact',()=>{
 const h=harness();
 for(let i=0;i<40;i++)h.step(.016,{x:0,y:-55,air:true,reentryT:0,vx:180,vy:-160+i*15,vz:0},.32);
 const before=h.context.__rig.pitch;
 for(let i=0;i<12;i++)h.step(.016,{x:0,y:-10,air:true,reentryT:0,vx:180,vy:420,vz:0},.32);
 assert(h.context.__rig.pitch>before);
});
test('flight weight and camera pitch do not reset at splash',()=>{
 const h=harness();for(let i=0;i<25;i++)h.step(.016,{y:-12,air:true,reentryT:0,vx:180,vy:350,vz:0},.32);
 const before=h.context.__rig.pitch;
 const mix=h.context.__rig.flightMix;
 const after=h.step(.016,{y:3,air:false,reentryT:.205,vx:180,vy:361,vz:0},.70);
 assert(Math.abs(after-before)<.029);
 assert(h.context.__rig.flightMix>mix);
});
test('camera transitions back to swim steering gradually after reentry',()=>{
 const h=harness();for(let i=0;i<50;i++)h.step(.016,{y:-20,air:true,reentryT:0,vx:170,vy:310,vz:0},.32);
 const before=h.context.__rig.flightMix;
 for(let i=0;i<60;i++)h.step(.016,{y:80,air:false,reentryT:0,vx:160,vy:120,vz:0},.37);
 assert(h.context.__rig.flightMix<before);
 assert(h.context.__rig.flightMix<.1);
 assert(Math.abs(h.context.__rig.pitch-.37)<.075);
});
test('no camera recovery timer or direct splash pose reset remains',()=>{
 assert(!html.includes('waterEntryCameraTarget'));
 assert(!html.includes('waterEntryCameraRemaining'));
 assert(html.includes('const viewPitch=continuousFlightCameraPitch(dt,ct,pitch,playerChase);'));
 assert(html.includes('camera3.position.set(cam.x+Math.sin(yaw)*Math.cos(viewPitch)*dd'));
});
test('fish visual nose remains continuous across air-to-water transition',()=>{
 assert(!html.includes('(f.air||(f.reentryT||0)>0)?1.3:.9'));
 assert(!html.includes('(f.air||(f.reentryT||0)>0)?-1.3:-.38'));
 assert(html.includes('const sp=Math.hypot(f.vx,f.vy,f.vz);let pz=clamp(Math.atan2(-f.vy,hs+30),-1.3,1.3)'));
});
test('independent freecam and spectator orientation remain unchanged',()=>{
 const h=harness();h.step(.016,{air:true,y:-80,vx:150,vy:330,vz:0},.3);
 const free=h.step(.016,{air:true,y:-80,vx:150,vy:330,vz:0},.72,false);
 assert.equal(free,.72);
 assert.equal(h.context.__rig.flightMix,0);
 assert(html.includes("if(observerMode==='free'&&canObserve())observerFlight(dt)"));
 assert(html.includes('yaw=lerpAng(yaw,targetAngles.yaw,1-Math.exp(-dt*12))'));
});
test('automatic splash-down changes desired swim heading without teleporting rendered camera',()=>{
 const beg=html.indexOf('let previousPlayerAir=false;');const end=html.indexOf('function loop(now)',beg);
 const ctx={playerRole:'fish',state:'play',human:{alive:true,air:false,reentryT:.21,vx:160,vy:250,vz:0},
  pitch:.20,swimPitch:-.6,NEUTRAL:.32,PMIN:-.5,PMAX:1.2,recenter:null,
  moveVec:()=>({x:1,y:0,z:0}),clamp:(v,l,h)=>Math.max(l,Math.min(v,h)),Math};
 vm.createContext(ctx);vm.runInContext(html.slice(beg,end),ctx);
 vm.runInContext('previousPlayerAir=true;applyAutomaticWaterEntryPitch(.016)',ctx);
 assert(ctx.swimPitch>0);
 assert(ctx.pitch>.2);
 const camRig=harness();camRig.step(.016,{air:true,y:-10,vx:160,vy:250,vz:0},.2);
 const pre=camRig.context.__rig.pitch;
 const post=camRig.step(.016,{air:false,reentryT:.20,y:4,vx:160,vy:265,vz:0},ctx.pitch);
 assert(Math.abs(post-pre)<=.02801);
});
console.log(`${passed} continuous chase camera regression checks passed`);
