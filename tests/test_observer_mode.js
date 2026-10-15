'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Aqua=require('../aqua_sim_mobile_ability_pass2');
const html=fs.readFileSync(path.join(__dirname,'../fisherman-mobile-ability-pass2.html'),'utf8');
let passes=0;function ok(name,x){assert.ok(x,name);passes++;console.log('PASS '+name)}
const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
for(const id of ['roleObserver','observerHUD','observerMenuHelp','obsFollow','obsFree','obsStatus','obsStick','obsThumb','obsUp','obsDown','obsSpeed']){
 ok(id+' exists exactly once',ids.filter(x=>x===id).length===1);
}
ok('Single-player-only role selection',html.includes("setRole('observer')")&&html.includes("role==='observer'?'none':'block'"));
ok('Observer does not create a human fish or fisherman',html.includes("slots:{fish:playerRole==='fish'?[{pid:ME,name:'You'}]:[],fishers:playerRole==='fisher'?[{pid:ME,name:'You'}]:[]}"));
ok('No observer multiplayer join',html.includes("if(playerRole==='observer')return;$('onlinePanel')"));
ok('Observer uses alternate 3D camera branch',html.includes("if(observerActive()&&state!=='menu')")&&html.includes("camera3.lookAt(observer.look.x,-observer.look.y,observer.look.z)"));
ok('Followed fish uses detailed FishForge model',html.includes("const model=buildPlayer(fishes[index]);fm[index]=model;dyn.add(model.wrap)"));
ok('Observer input uses dedicated touch IDs',html.includes("observer.stickPointer=e.pointerId")&&html.includes("observer.lookPointer={id:e.pointerId"));
ok('Canvas drag and rise/dive available',html.includes("observer.yaw-=dx*.005")&&html.includes("bindObserverVertical('obsUp','up')")&&html.includes("bindObserverVertical('obsDown','down')"));
ok('Camera pose persists on free/follow switching',html.includes("observerRestoreLook()")&&html.includes("observerEasePoint(observer.pos,wanted,d,2.5,2300)"));
ok('Observer is excluded from player HUD and bite aiming',html.includes("if(observerActive())return; // Spectator status")&&html.includes("if(playerRole!=='fish'){biteTarget=null;return}"));
ok('No changes to authoritative sim',html.slice(html.indexOf('/*SIM:BEGIN*/')+13,html.indexOf('/*SIM:END*/')).trim()+
  "\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;\n"===
  fs.readFileSync(path.join(__dirname,'../aqua_sim_mobile_ability_pass2.js'),'utf8'));
{
 const sim=Aqua.create();sim.newMatch({sp:'guppy',mode:'free',seed:400,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:30,
   slots:{fish:[],fishers:[]}});
 ok('200 full AI competitors',sim.fishes.length===200&&sim.fishes.every(f=>!f.human&&!f.pid));
 ok('30 edible minnows',sim.npcs.filter(n=>n.mini&&n.alive).length===30);
 ok('Two AI fishermen retained',sim.fishers.length===2&&sim.fishers.every(f=>!f.human));
 for(let i=0;i<18;i++)sim.step({},1/60);
 ok('200-competitor observer match advances normally',sim.state==='play'&&sim.t>.25);
}
{
 const marks=['obsFollow','obsFree','obsStatus','obsStick','obsThumb','obsSpeed','app'];
 const controls=Object.fromEntries(marks.map(id=>[id,{
   style:{},textContent:'',innerHTML:'',
   classList:{add(){},remove(){},toggle(){}}
 }]));
 const start=html.indexOf('const observer={'),end=html.indexOf("try{flip=localStorage",start);
 assert.ok(start>0&&end>start,'Observer camera module missing');
 const fishes=[
   {i:0,sp:'guppy',alive:true,mass:100,x:700,y:180,z:20,hx:1,hz:0,vx:100,vz:0},
   {i:1,sp:'tuna',alive:true,mass:350,x:2500,y:310,z:450,hx:1,hz:0,vx:90,vz:10},
   {i:2,sp:'piranha',alive:true,mass:200,x:3400,y:600,z:60,hx:1,hz:0,vx:0,vz:0}
 ];
 const ctx={
   THREE:null,WW:Aqua.WW,WH:Aqua.WH,ZH:Aqua.ZH,SP:Aqua.SP,rad:Aqua.rad,clamp:Aqua.clamp,
   fishes,keys:{},t:0,state:'play',playerRole:'observer',online:{started:false},renderer:null,dyn:null,remoteIM:null,
   $:id=>controls[id],console
 };
 vm.runInNewContext(html.slice(start,end)+
   '\nthis.observerAPI={observer,observerReset,observerMode,observerUpdate,observerLargestFish,observerViewForward};',ctx);
 const {observer,observerReset,observerMode,observerUpdate,observerLargestFish}=ctx.observerAPI;
 observerReset();
 ok('Observer starts in free camera',observer.mode==='free');
 const old={...observer.pos};ctx.keys.w=1;observerUpdate(1/60);
 ok('W moves free camera without any fish input',Math.hypot(observer.pos.x-old.x,observer.pos.z-old.z)>0.1);
 delete ctx.keys.w;observer.up=true;const before=observer.pos.y;observerUpdate(1/60);observer.up=false;
 ok('Rise button moves camera vertically',observer.pos.y<before);
 observer.pos.x=150;observer.pos.y=300;observer.pos.z=500;
 observerMode('follow');
 ok('Follow Largest targets highest living mass',observer.mode==='follow'&&observerLargestFish().i===1);
 const p={...observer.pos};observerUpdate(1/60);
 ok('Follow transition bounded and not teleported',Math.hypot(observer.pos.x-p.x,observer.pos.y-p.y,observer.pos.z-p.z)<45);
 ok('Status identifies biggest fish',controls.obsStatus.innerHTML.toLowerCase().includes('tuna'));
 fishes[2].mass=800;ctx.t+=.5;observerUpdate(1/60);
 ok('Follow automatically changes leader',observer.target.i===2&&controls.obsStatus.innerHTML.toLowerCase().includes('piranha'));
 observerMode('free');
 const returned={...observer.pos};observerUpdate(0);
 ok('Free camera resumes at current viewing location',observer.mode==='free'&&Math.hypot(observer.pos.x-returned.x,observer.pos.y-returned.y,observer.pos.z-returned.z)<1e-6);
 ctx.keys.w=1;ctx.keys.q=1;for(let i=0;i<600;i++)observerUpdate(1/60);
 ok('Free camera remains inside aquarium bounds',observer.pos.x>=30&&observer.pos.x<=Aqua.WW-30&&observer.pos.y>=-200&&observer.pos.y<=Aqua.WH-30&&observer.pos.z>=-Aqua.ZH+30&&observer.pos.z<=Aqua.ZH-30);
}
{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
 scripts.forEach(source=>new vm.Script(source));
 ok('Browser inline JavaScript compiles',scripts.length>0);
}
console.log(passes+' observer-mode checks passed');
