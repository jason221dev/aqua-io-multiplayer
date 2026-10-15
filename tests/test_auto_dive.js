'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Aqua=require('../aqua_sim_mobile_ability_pass2');
const D=1/60;let passed=0;
function ok(label,value){assert.ok(value,label);passed++;console.log('PASS '+label)}
function fixture(){
 const sim=Aqua.create();sim.newMatch({sp:'guppy',mode:'free',seed:317,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'P1',sp:'guppy'}]}});
 for(const f of sim.fishes.slice(1))Object.assign(f,{alive:false,respawn:1e8});
 const fish=sim.fishes[0];Object.assign(fish,{x:1300,y:-35,z:110,vx:175,vy:-200,vz:45,air:true,airT:0,reentryT:0,minY:-35,prot:0});
 return{sim,fish};
}
function splash(sim,fish,move){
 let descending=false;
 for(let i=0;i<120;i++){
  const wasAir=fish.air,vx=fish.vx,vz=fish.vz;
  sim.step({P1:{mv:move}},D);
  if(wasAir&&fish.air&&fish.vy>0&&fish.y<0)descending=true;
  if(wasAir&&!fish.air){
   ok('Fish turns downward before splash',descending);
   ok('Splash preserves forward motion',fish.vx===vx&&fish.vz===vz&&fish.vy>0);
   return;
  }
 }
 throw Error('Never landed');
}
const HOLD={x:1,y:0,z:0},RELEASE={x:0,y:0,z:0};
{
 const {sim,fish}=fixture();splash(sim,fish,HOLD);
 const frames=[];for(let i=0;i<30;i++){sim.step({P1:{mv:HOLD}},D);frames.push({x:fish.x,y:fish.y,vy:fish.vy});}
 ok('Held controller carries forward trajectory',frames.every((p,i)=>i===0||p.x>frames[i-1].x));
 ok('Held controller initially continues descending',frames.slice(0,8).every((p,i)=>p.vy>0&&(i===0||p.y>frames[i-1].y)));
 ok('No forced depth: fish levels naturally before 145 units',frames.at(-1).y>25&&frames.at(-1).y<140);
 ok('Splash momentum blend expires without depth threshold',fish.reentryT===0);
}
{
 const {sim,fish}=fixture();splash(sim,fish,HOLD);const x=fish.x,z=fish.z;
 sim.step({P1:{mv:RELEASE}},D);
 ok('Release immediately stops underwater propulsion',fish.vx===0&&fish.vy===0&&fish.vz===0);
 ok('Release does not trigger autopilot',fish.x===x&&fish.z===z&&fish.reentryT===0);
}
{
 const {sim,fish}=fixture();splash(sim,fish,HOLD);
 for(let i=0;i<8;i++)sim.step({P1:{mv:{x:0,y:-1,z:0}}},D);
 ok('One stale rising control input cannot instantly reverse splash',fish.vy>0&&fish.y>0);
}
const html=fs.readFileSync(path.join(__dirname,'..','fisherman-mobile-ability-pass2.html'),'utf8');
const simSource=fs.readFileSync(path.join(__dirname,'..','aqua_sim_mobile_ability_pass2.js'),'utf8');
ok('No REENTRY_DEPTH or underwater autopilot',!simSource.includes('REENTRY_DEPTH')&&!simSource.includes('autopilot={')&&!simSource.includes('depthNeed='));
ok('Landing momentum blend requires controller held',simSource.includes('inputHeld&&splashRecovery>0'));
{
 const start=html.indexOf('let previousPlayerAir=false;'),end=html.indexOf('function loop(now){',start);
 assert.ok(start>0&&end>start);
 const fish={alive:true,air:true,reentryT:0,vx:150,vy:-180,vz:35};
 const ctx={playerRole:'fish',state:'play',human:fish,swimPitch:-.77,pitch:.2,NEUTRAL:.32,PMIN:-1,PMAX:1.3,recenter:{yaw:0},yaw:1.25,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
 vm.runInNewContext(html.slice(start,end)+"\nthis.trigger=applyAutomaticWaterEntryPitch;this.angles=()=>({swimPitch,pitch,yaw,recenter})",ctx);
 ctx.trigger();ok('Airborne angle remains unchanged',ctx.angles().swimPitch===-.77);
 Object.assign(fish,{air:false,reentryT:.22,vy:260});ctx.trigger();
 ok('Splash automatically sets downward swim angle',ctx.angles().swimPitch>.24);
 ok('Forward yaw preserved with camera pitch follow',ctx.angles().yaw===1.25&&ctx.angles().pitch>.32&&ctx.angles().recenter===null);
 const angle=ctx.angles().swimPitch;ctx.trigger();ok('Pitch adjustment only occurs once',ctx.angles().swimPitch===angle);
}
const bundled=html.slice(html.indexOf('/*SIM:BEGIN*/')+13,html.indexOf('/*SIM:END*/')).trim()+"\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;\n";
ok('Browser/client and server simulation identical',bundled===simSource);
console.log(passed+' held-input water entry checks passed');
