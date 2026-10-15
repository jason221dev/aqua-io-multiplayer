'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function spectatorFollowAngles(f){'),end=html.indexOf('const cameraCollisionTarget=',start);
assert(start>0&&end>start,'follow orientation helper exported in client source');
const fn=vm.runInNewContext(html.slice(start,end)+'\nspectatorFollowAngles',{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});
const near=(a,b,tol=.01)=>assert(Math.abs(a-b)<tol,`${a} vs ${b}`);
for(const [vx,vz,expectedX,expectedZ] of [[200,0,-1,0],[-200,0,1,0],[0,200,0,-1],[0,-200,0,1]]){
 const a=fn({vx,vz,hx:1,hz:0,vy:0});const x=Math.sin(a.yaw),z=Math.cos(a.yaw);
 near(x,expectedX);near(z,expectedZ);
}
console.log('PASS cardinal directions position camera directly behind fish');
const diag=fn({vx:100,vz:-100,hx:1,hz:0,vy:0});
assert(Math.sin(diag.yaw)<0&&Math.cos(diag.yaw)>0);console.log('PASS diagonal tail-on chase');
const stopped=fn({vx:0,vz:0,hx:0,hz:1,vy:0});near(Math.cos(stopped.yaw),-1);console.log('PASS stationary fish keeps facing direction');
const diving=fn({vx:100,vz:0,vy:100,hx:1,hz:0}),rising=fn({vx:100,vz:0,vy:-100,hx:1,hz:0});assert(diving.pitch>rising.pitch);console.log('PASS swimming pitch adjusts for depth');
for(const f of [{},{vx:NaN,vz:Infinity,vy:NaN,hx:0,hz:0}]){const a=fn(f);assert(Number.isFinite(a.yaw)&&Number.isFinite(a.pitch))}console.log('PASS missing input cannot corrupt camera');
assert(html.includes("observerMode==='largest'&&canObserve()"));
assert(html.includes("observerMode==='off'&&!human?.alive&&ct!==human&&ct?.alive&&!!ct.sp"));
assert(html.includes("yaw=lerpAng(yaw,targetAngles.yaw,1-Math.exp(-dt*12))"));
assert(html.includes("if(observerMode==='free'&&canObserve())observerFlight(dt)"));
console.log('PASS observer, predator, and freecam routing');
