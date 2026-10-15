'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
const a=html.indexOf('const continuousFlightCamera={pitch:NaN,flightMix:0};'),b=html.indexOf('function draw3D(dt){',a);
assert(a>=0&&b>a);
function rig(){const c={Math,NEUTRAL:.32,clamp:(x,l,h)=>Math.max(l,Math.min(h,x))};vm.createContext(c);vm.runInContext(html.slice(a,b)+'\nthis.rig=continuousFlightCamera;',c);return{c,step:(dt,f,p=.32,on=true)=>c.continuousFlightCameraPitch(dt,f,p,on)}}
check('No leap camera jump at 20-120 FPS',()=>{for(const hz of [20,30,60,90,120]){const c=rig();let prev=.32;for(let t=0;t<2.4;t+=1/hz){const air=t>.20&&t<1.4,vy=air?-390+700*(t-.2):t<.2?-150:t<1.66?390:120;const q=c.step(1/hz,{air,reentryT:t>=1.4&&t<1.66?1.66-t:0,y:air?-70:25,vx:160,vy,vz:0});assert(Math.abs(q-prev)<=1.75/hz+1e-8);prev=q}}});
check('Camera follows trajectory before splash',()=>{const c=rig();for(let n=0;n<50;n++)c.step(.016,{air:true,y:-35,vx:170,vy:350,vz:0});assert(c.c.rig.pitch>.32)});
check('Pitch state preserved across water contact',()=>{const c=rig();for(let n=0;n<25;n++)c.step(.016,{air:true,y:-20,vx:170,vy:350,vz:0});const p=c.c.rig.pitch,m=c.c.rig.flightMix;const next=c.step(.016,{air:false,reentryT:.21,y:5,vx:170,vy:361,vz:0},.9);assert(Math.abs(next-p)<.03);assert(c.c.rig.flightMix>m)});
check('Smooth recovery to underwater control',()=>{const c=rig();for(let n=0;n<50;n++)c.step(.016,{air:true,y:-20,vx:170,vy:350,vz:0});for(let n=0;n<70;n++)c.step(.016,{air:false,reentryT:0,y:90,vx:170,vy:110,vz:0},.38);assert(c.c.rig.flightMix<.1)});
check('Fish pitch never switches limits on contact',()=>{assert(!html.includes('(f.air||(f.reentryT||0)>0)?1.3:.9'));assert(!html.includes('(f.air||(f.reentryT||0)>0)?-1.3:-.38'))});
check('Spectator/freecam unaffected',()=>{const c=rig();c.step(.016,{air:true,y:-20,vx:170,vy:350,vz:0});assert.equal(c.step(.016,{air:true,y:-20,vx:170,vy:350,vz:0},.7,false),.7);assert.equal(c.c.rig.flightMix,0);assert(html.includes("if(observerMode==='free'&&canObserve())observerFlight(dt)"))});
check('No splash-only pitch recovery',()=>{assert(!html.includes('waterEntryCameraRemaining'));assert(html.includes('const viewPitch=continuousFlightCameraPitch(dt,ct,pitch,playerChase);'))});
console.log(passed+' continuous chase camera regression checks passed');
