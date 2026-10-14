'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'../fisherman-mobile-v152.html'),'utf8');
function portion(name,next){const a=source.indexOf('function '+name+'('),b=source.indexOf(next,a);assert(a>=0&&b>a);return source.slice(a,b)}
const ctx={Math,Number,WRECK:{x:2968},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(ctx);
vm.runInContext(portion('shipCameraBlend','function easeCameraArm'),ctx);
vm.runInContext(portion('easeCameraArm','const biteFloatScreenPos'),ctx);
const blend=ctx.shipCameraBlend,step=ctx.easeCameraArm;
assert.equal(blend({x:500,y:700,z:0}),0,'open water must stay wide');
assert.equal(blend({x:2968,y:700,z:0}),1,'ship interior must get close camera');
assert.equal(blend({x:2968,y:30,z:0}),0,'far-above fish must stay wide');
let lastBlend=blend({x:1800,y:720,z:0});
for(let x=1800.5;x<2968;x+=0.5){const n=blend({x,y:720,z:0});assert(n>=lastBlend-1e-9);assert(Math.abs(n-lastBlend)<.01);lastBlend=n}
let d=330,prev=d;
for(let i=0;i<90;i++){const x=2050+i*12.5,want=330-225*blend({x,y:720,z:0});d=step(d,want,1/60);assert(Math.abs(d-prev)<9,'no single-frame camera jump');prev=d}
assert(d<160);
for(let i=0;i<90;i++){d=step(d,330,1/60);assert(d-prev<6);prev=d}
assert(d>290);
let clearance=320;
for(const target of [15,15,15,15,15,320,320,320,320,320]){const n=step(clearance,target,1/60,670,350,15,4.5);assert(Math.abs(n-clearance)<=670/60+1e-7);clearance=n}
assert(source.includes('chaseCameraArm.clearance=easeCameraArm('));
assert(!source.includes('const dd=inWreck(ct)?85:'));
assert(source.includes("if(playerRole==='fisher'&&state==='play')setFisherCamera(dt)"));
assert(source.includes("variant:'fisher-mobile-v15'"));
console.log('PASS smooth pirate-ship camera transition and collision retraction');
