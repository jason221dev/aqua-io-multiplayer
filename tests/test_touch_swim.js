'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('const JR=58,NEUTRAL='),html.indexOf('const ABIL_GLOW='));
assert.ok(source.includes('const swimPointers=new Set()'));
class Target{
  constructor(){this.listeners={};this.classList={toggle(){}}}
  addEventListener(t,f){(this.listeners[t]??=[]).push(f)}
  getBoundingClientRect(){return{left:0,top:0,width:600,height:800}}
  setPointerCapture(){}
  fire(t,props={}){const e={pointerId:1,pointerType:'touch',button:0,clientX:150,clientY:180,type:t,preventDefault(){},target:{closest(){return false}},...props};for(const f of this.listeners[t]||[])f(e);return e}
}
const C=new Target(),document=new Target(),button=new Target(),app=new Target(),swap=new Target(),sent=[];
const ctx={C,document,localStorage:{getItem(){return '0'},setItem(){}},performance,Math,Number,Set,
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),addEventListener(){},$(id){return({app,swap,ab:button})[id]||new Target()},
  online:{active:true,started:true},onlineTransmit(m){sent.push(m)},state:'play',playerRole:'fish',yaw:0,pitch:.32,swimPitch:0,
  tap(){},fisherReelStroke(){},myFisher(){return null},recenter:null,console
};
vm.createContext(ctx);vm.runInContext(source,ctx);
function mv(){return vm.runInContext('moveVec()',ctx)}
function drive(dt){vm.runInContext(`adjustSwimPitch(${dt})`,ctx)}
function press(id,x=450,y=180,target=C){const props={pointerId:id,clientX:x,clientY:y};document.fire('pointerdown',props);if(target!==document)target.fire('pointerdown',props)}
function lift(id,target=C){const p={pointerId:id};document.fire('pointerup',p);if(target!==document)target.fire('pointerup',p)}
const zero=(v)=>Math.hypot(v.x,v.y,v.z)<1e-8;
assert.ok(zero(mv()),'no touches -> no movement');
press(1,450);assert.ok(Math.abs(mv().z+1)<1e-6,'press anywhere on right drives forward at full throttle');
lift(1);assert.ok(zero(mv()),'last touch release must stop');assert.equal(sent.at(-1).frame.mv.x,0);
press(2,80,200);assert.ok(!zero(mv()),'joystick center held must move fish forward');
assert.ok(Math.abs(mv().z+1)<1e-6,'stick neutral still swims');
C.fire('pointermove',{pointerId:2,clientX:135,clientY:145});drive(.5);
assert.ok(ctx.yaw<-.1,'drag right turns fish right');assert.ok(ctx.swimPitch<-.1,'drag up pitches fish upward');
const v=mv();assert.ok(v.y<-.1&&v.x>0,'forward thrust follows retained yaw and pitch');
const heading=ctx.yaw,tilt=ctx.swimPitch;
lift(2);assert.ok(zero(mv()),'steering controller release halts thrust');assert.equal(ctx.yaw,heading);assert.equal(ctx.swimPitch,tilt);
press(3,100,200);press(4,420,250);lift(3);assert.ok(!zero(mv()),'one finger lifts, other still propels');lift(4);assert.ok(zero(mv()));
press(5,435,275,button);assert.ok(!zero(mv()),'ability button contact counts as an active screen hold');lift(5,document);assert.ok(zero(mv()));
press(6,430,245);C.fire('pointercancel',{pointerId:6});document.fire('pointercancel',{pointerId:6});assert.ok(zero(mv()),'pointercancel must not leave stuck throttle');
press(7,430,245);vm.runInContext('resetInput()',ctx);assert.ok(zero(mv()),'resetInput must release all pointer states');
ctx.playerRole='fisher';document.fire('pointerdown',{pointerId:8});assert.ok(zero(mv()),'fisher role must not use fish throttle');
console.log('PASS touch fish controls: hold anywhere, steer, stop, retain heading/pitch, multitouch, cancel, blur, ability, fisherman isolation');

// Server authority: release is an immediate stop while preserving forward heading.
const Aqua=require('../aqua_sim');
for(const sp of ['guppy','sunfish','tuna']){
  const sim=Aqua.create();sim.newMatch({sp,seed:321,quick:true,npcCount:0,slots:{fish:[{pid:'p1',sp}]}});
  const fish=sim.fishes.find(f=>f.pid==='p1');
  for(let n=0;n<8;n++)sim.step({p1:{mv:{x:.8,y:-.2,z:-.5}}},1/60);
  const oldDirection=[fish.hx,fish.hz],oldPos=[fish.x,fish.y,fish.z];
  sim.step({p1:{mv:{x:0,y:0,z:0}}},1/60);
  assert.deepEqual([fish.vx,fish.vy,fish.vz],[0,0,0],`${sp}: stop on release must reset velocity`);
  assert.deepEqual([fish.x,fish.y,fish.z],oldPos,`${sp}: released fish must not coast`);
  assert.deepEqual([fish.hx,fish.hz],oldDirection,`${sp}: release preserves heading`);
}
console.log('PASS authoritative stop without glide across guppy, sunfish and tuna');