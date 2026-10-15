'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function spectatorFollowAngles(f){');
const end=html.indexOf('const cameraCollisionTarget=',start);
assert(start>0&&end>start,'spectator camera orientation function exists');
const fn=vm.runInNewContext(html.slice(start,end)+'\nspectatorFollowAngles',{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});
function test(s,cb){cb();console.log('PASS '+s)}
function near(x,y,epsilon=1e-9){assert(Math.abs(x-y)<epsilon,`${x} vs ${y}`)}
function behindDirection(f){const a=fn(f);return{x:Math.sin(a.yaw)*Math.cos(a.pitch),z:Math.cos(a.yaw)*Math.cos(a.pitch),pitch:a.pitch};}
test('Swimming +X is viewed from -X, directly behind the tail',()=>{
 const v=behindDirection({vx:210,vz:0,hx:1,hz:0,vy:0});assert(v.x<-.98);near(v.z,0,1e-6);
});
test('Swimming -X is viewed from +X',()=>{
 const v=behindDirection({vx:-200,vz:0,hx:-1,hz:0,vy:0});assert(v.x>.98);near(v.z,0,1e-6);
});
test('Swimming +Z is viewed from -Z',()=>{
 const v=behindDirection({vx:0,vz:200,hx:0,hz:1,vy:0});assert(v.z<-.98);near(v.x,0,1e-6);
});
test('Swimming -Z is viewed from +Z',()=>{
 const v=behindDirection({vx:0,vz:-170,hx:0,hz:-1,vy:0});assert(v.z>.98);near(v.x,0,1e-6);
});
test('Diagonals use the opposite horizontal swimming vector',()=>{
 const a=behindDirection({vx:100,vz:-100,hx:1,hz:0,vy:0});assert(a.x<0&&a.z>0);near(Math.abs(a.x),Math.abs(a.z),1e-8);
});
test('Stopped fish retain last heading rather than snapping toward camera north',()=>{
 const a=behindDirection({vx:0,vz:0,hx:0,hz:1,vy:0});assert(a.z<0);
});
test('Fish dive tilts the chase camera up, rise tilts it down',()=>{
 const down=fn({vx:100,vz:0,vy:100,hx:1,hz:0}),up=fn({vx:100,vz:0,vy:-100,hx:1,hz:0});
 assert(down.pitch>.12&&up.pitch<.12);assert(down.pitch<=.62&&up.pitch>=-.38);
});
test('Corrupt or missing velocities cannot yield NaNs',()=>{
 for(const f of [{},{vx:NaN,vz:Infinity,vy:NaN,hx:0,hz:0},{vx:0,vz:0,hx:0,hz:0}]){
  const o=fn(f);assert(Number.isFinite(o.yaw)&&Number.isFinite(o.pitch));
 }
});
test('Observer Follow Largest and predator follow both use the fish-heading chase mode',()=>{
 assert(html.includes("observerMode==='largest'&&canObserve()"));
 assert(html.includes("observerMode==='off'&&!human?.alive&&ct!==human&&ct?.alive&&!!ct.sp"));
 assert(html.includes('yaw=lerpAng(yaw,targetAngles.yaw,1-Math.exp(-dt*12))'));
 assert(html.includes("else if(observerMode!=='free')yaw+=dt*.06"));
});
test('Manual fish controls and Free Camera retain their separate heading logic',()=>{
 assert(html.includes("else if(state==='play'&&playerRole==='fish'&&observerMode==='off')"));
 assert(html.includes("if(observerMode==='free'&&canObserve())observerFlight(dt)"));
});
console.log('10 tail-on observer camera tests passed');
