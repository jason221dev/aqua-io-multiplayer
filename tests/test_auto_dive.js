'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Aqua=require('../aqua_sim_mobile_ability_pass2');
let count=0;const ok=(name,p)=>{assert.ok(p,name);count++;console.log('PASS '+name)};
function setup(){
 const sim=Aqua.create();
 sim.newMatch({sp:'guppy',mode:'free',seed:317,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'P1',sp:'guppy'}]}});
 sim.fishes.slice(1).forEach(f=>Object.assign(f,{alive:false,respawn:1e8}));
 const fish=sim.fishes[0];Object.assign(fish,{x:1300,y:-35,z:110,vx:175,vy:-200,vz:45,air:true,airT:0,reentryT:0,minY:-35,prot:0});
 return{sim,fish};
}
for(const [title,move] of [['neutral input',{x:0,y:0,z:0}],['old upward pitch held',{x:0,y:-1,z:0}]]){
 const {sim,fish}=setup(),samples=[],input={P1:{mv:move}};let landed=false;
 for(let i=0;i<225;i++){
  const oldAir=fish.air,vx=fish.vx,vz=fish.vz;
  sim.step(input,1/60);
  if(oldAir&&!fish.air&&!landed){
   landed=true;ok(title+' preserves horizontal splash velocity',fish.vx===vx&&fish.vz===vz&&fish.vy>0);
  }
  if(landed&&samples.length<94)samples.push({y:fish.y,vy:fish.vy,x:fish.x});
 }
 ok(title+' enters water without asking for steering',landed&&samples.length>=90);
 ok(title+' initially descends automatically',samples.slice(1,8).every((p,i)=>p.y>samples[i].y&&p.vy>0));
 ok(title+' moves forward during submerged dive',samples[60].x>samples[0].x+20);
 ok(title+' descends safely 100+ units below surface',Math.max(...samples.map(p=>p.y))>=100);
 ok(title+' levels out before tank floor',Math.max(...samples.map(p=>p.y))<600);
}
const html=fs.readFileSync(path.join(__dirname,'..','fisherman-mobile-ability-pass2.html'),'utf8');
{
 const start=html.indexOf('let previousPlayerAir=false;'),end=html.indexOf('function loop(now){',start);
 assert.ok(start>0&&end>start,'Missing phone reentry-angle handler');
 const fish={alive:true,air:true,reentryT:0,vx:150,vy:-180,vz:35};
 const ctx={playerRole:'fish',state:'play',human:fish,swimPitch:-.77,pitch:.2,NEUTRAL:.32,PMIN:-1,PMAX:1.3,recenter:{yaw:0},yaw:1.25,
   clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
 vm.runInNewContext(html.slice(start,end)+
   '\nthis.enterWater=applyAutomaticWaterEntryPitch;\nthis.angle=()=>({swimPitch,pitch,yaw,recenter});',ctx);
 ctx.enterWater();ok('Original rising angle remains while fish is airborne',ctx.angle().swimPitch===-.77);
 Object.assign(fish,{air:false,reentryT:1.45,vy:260});ctx.enterWater();
 ok('Reentry automatically resets retained pitch downward',ctx.angle().swimPitch>.24);
 ok('Swim heading persists and chase camera follows dive',ctx.angle().yaw===1.25&&ctx.angle().pitch>.32&&ctx.angle().recenter===null);
 const angle=ctx.angle().swimPitch;ctx.enterWater();
 ok('Pitch handoff only happens once, leaving later steering alone',ctx.angle().swimPitch===angle);
}
const simText=fs.readFileSync(path.join(__dirname,'..','aqua_sim_mobile_ability_pass2.js'),'utf8');
ok('HTML gameplay and authoritative simulation remain identical',html.slice(html.indexOf('/*SIM:BEGIN*/')+13,html.indexOf('/*SIM:END*/')).trim()+
  "\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;\n"===simText);
console.log(count+' automatic reentry checks passed');
