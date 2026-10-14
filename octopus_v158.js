/* aqua.io deterministic octopus adversary. Server-authoritative, multiplayer-safe. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.AquaOctopus=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CFG=Object.freeze({topN:20,grace:12,searchPeriod:.75,retargetPeriod:9,walkSpeed:248,climbSpeed:188,windup:1.25,dashDuration:.82,dashSpeed:780,reach:410,hitRadius:73,hitCooldown:9,missCooldown:4,stunSeconds:2.3,warningRadius:380});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function decorate(Aqua){
 const sim=Aqua.create(),W=Aqua.WW,H=Aqua.WH,Z=Aqua.ZH;
 let o=null,rankTimer=0,retarget=0,leaders=[];
 const original={newMatch:sim.newMatch,step:sim.step,snapshot:sim.snapshot,restore:sim.restore};
 const empty=()=>({x:W*.25,y:H-22,z:0,face:'floor',mode:'patrol',target:-1,targetPid:null,cd:0,modeT:0,stun:0,t:0,hits:0,lunges:0,vx:0,vy:0,vz:0,aimX:0,aimY:0,aimZ:0});
 const eligible=f=>f&&f.alive&&!f.hooked&&!f.air&&!(f.prot>0)&&!(f.dodgeT>0)&&!(f.camoT>0)&&!((f.sp==='clown'||f.sp==='goldfish')&&f.abilT>0)&&!(f.sp==='puffer'&&f.abilT>0);
 function top20(){
   const tick=Math.floor(sim.t/4),list=sim.fishes.filter(f=>f?.alive&&!f.hooked).slice();
   list.sort((a,b)=>b.mass-a.mass||((a.i+tick)%Math.max(1,sim.fishes.length))-((b.i+tick)%Math.max(1,sim.fishes.length)));
   return list.slice(0,CFG.topN);
 }
 function bestTarget(){
   let best=null,score=-Infinity;
   for(const [rank,f] of leaders.entries()){
     if(!eligible(f))continue;
     const d=distance(o,f),surfaceGap=Math.min(H-f.y,f.x,W-f.x,Z-Math.abs(f.z));
     const s=260-rank*9-Math.min(d,3000)*.105-Math.max(0,surfaceGap-CFG.reach)*.5+(f.i===o.target?65:0);
     if(s>score){score=s;best=f;}
   }
   return best;
 }
 function setTarget(f){o.target=f?.i??-1;o.targetPid=f?.pid||null;retarget=CFG.retargetPeriod;}
 function traverse(f,dt){
   const dx=f?f.x-o.x:W*.5-o.x,dz=f?f.z-o.z:-o.z;
   const step=CFG.walkSpeed*dt,climb=CFG.climbSpeed*dt;
   if(o.face==='floor'){
     const d=Math.hypot(dx,dz)||1;o.x=clamp(o.x+dx/d*Math.min(step,d),22,W-22);o.z=clamp(o.z+dz/d*Math.min(step,d),-Z+22,Z-22);o.y=H-22;
     if(f&&f.y<H-185){if(o.x<=45&&f.x<250)o.face='west';else if(o.x>=W-45&&f.x>W-250)o.face='east';else if(o.z<=-Z+45&&f.z<-Z+250)o.face='north';else if(o.z>=Z-45&&f.z>Z-250)o.face='south'}
   }else{
     const exit=!f||(o.face==='west'&&f.x>380)||(o.face==='east'&&f.x<W-380)||(o.face==='north'&&f.z>-Z+380)||(o.face==='south'&&f.z<Z-380);
     const wantedY=exit?H-22:clamp(f.y+35,36,H-22);
     o.y+=clamp(wantedY-o.y,-climb,climb);
     if(o.face==='west'||o.face==='east'){
       o.x=o.face==='west'?22:W-22;o.z+=clamp((f?f.z:0)-o.z,-step,step);o.z=clamp(o.z,-Z+22,Z-22);
     }else{
       o.z=o.face==='north'?-Z+22:Z-22;o.x+=clamp((f?f.x:W*.5)-o.x,-step,step);o.x=clamp(o.x,22,W-22);
     }
     if(exit&&o.y>=H-23)o.face='floor';
   }
 }
 function stunByAbility(){
   for(const f of sim.fishes){if(!f?.alive||!f.abilT||distance(f,o)>160)continue;
     if(f.sp==='eel'){o.stun=Math.max(o.stun,CFG.stunSeconds);o.mode='stunned';o.modeT=0;return}
     if(f.sp==='goldfish'&&distance(f,o)<145){o.stun=Math.max(o.stun,1.1);o.mode='stunned';o.modeT=0;return}
   }
 }
 function strike(f){
   if(!f||!eligible(f)||!leaders.some(a=>a===f)||distance(o,f)>CFG.hitRadius+Math.min(60,Aqua.hitRadius(f))||Aqua.shipBlocked(o,f))return false;
   const before=f.mass;f.mass=Math.max(.01,before*.5);f.displayMass=Math.min(f.displayMass??f.mass,f.mass);
   f.octoHits=(f.octoHits||0)+1;o.hits++;
   if(f.human){sim.feed.push({s:'OCTOPUS STRIKE · MASS HALVED!',c:'bad',t:5,to:f.pid});if(sim.feed.length>12)sim.feed.shift();}
   return true;
 }
 function tick(dt){
   if(!o||sim.state!=='play'||!(dt>0))return;
   const was={x:o.x,y:o.y,z:o.z};o.t+=dt;o.cd=Math.max(0,o.cd-dt);o.stun=Math.max(0,o.stun-dt);
   rankTimer-=dt;retarget-=dt;
   if(rankTimer<=0){leaders=top20();rankTimer=CFG.searchPeriod;}
   let f=sim.fishes[o.target];
   if(retarget<=0||!leaders.includes(f)||!eligible(f)){setTarget(bestTarget());f=sim.fishes[o.target];}
   if(sim.t<CFG.grace){o.mode='patrol';traverse(f,dt);return;}
   stunByAbility();
   if(o.stun>0){o.mode='stunned';return;}
   if(o.mode==='windup'){
     o.modeT-=dt;
     if(!eligible(f)||!leaders.includes(f)){o.mode='recover';o.cd=CFG.missCooldown;}
     else if(o.modeT<=0){o.mode='dash';o.modeT=CFG.dashDuration;o.lunges++;o.aimX=f.x;o.aimY=f.y;o.aimZ=f.z;}
   }else if(o.mode==='dash'){
     const dx=o.aimX-o.x,dy=o.aimY-o.y,dz=o.aimZ-o.z,d=Math.hypot(dx,dy,dz);
     const a=Math.min(d,CFG.dashSpeed*dt);
     if(d>1e-8){o.x+=dx/d*a;o.y+=dy/d*a;o.z+=dz/d*a;}
     o.modeT-=dt;
     if(strike(f)){o.mode='recover';o.cd=CFG.hitCooldown;setTarget(null);}
     else if(o.modeT<=0||d<2){o.mode='recover';o.cd=CFG.missCooldown;}
   }else if(o.mode==='recover'){
     const gaps=[{face:'floor',d:H-o.y},{face:'west',d:o.x},{face:'east',d:W-o.x},{face:'north',d:Z+o.z},{face:'south',d:Z-o.z}].sort((a,b)=>a.d-b.d);
     const nearest=gaps[0],n=CFG.climbSpeed*1.5*dt;
     if(nearest.face==='floor')o.y+=Math.min(n,H-22-o.y);
     else if(nearest.face==='west')o.x-=Math.min(n,o.x-22);
     else if(nearest.face==='east')o.x+=Math.min(n,W-22-o.x);
     else if(nearest.face==='north')o.z-=Math.min(n,Z-22+o.z);
     else o.z+=Math.min(n,Z-22-o.z);
     if(nearest.d<=24){o.face=nearest.face;o.mode='hunt';}
   }else{
     o.mode='hunt';traverse(f,dt);
     if(f&&o.cd<=0&&distance(o,f)<CFG.reach&&Math.min(H-f.y,f.x,W-f.x,Z-Math.abs(f.z))<CFG.reach&&!Aqua.shipBlocked(o,f)){
       o.mode='windup';o.modeT=CFG.windup;o.aimX=f.x;o.aimY=f.y;o.aimZ=f.z;
     }
   }
   o.x=clamp(o.x,22,W-22);o.y=clamp(o.y,25,H-22);o.z=clamp(o.z,-Z+22,Z-22);
   o.vx=(o.x-was.x)/dt;o.vy=(o.y-was.y)/dt;o.vz=(o.z-was.z)/dt;
 }
 sim.newMatch=function(opts){const result=original.newMatch(opts);o=empty();rankTimer=0;retarget=0;leaders=[];return result;};
 sim.step=function(inputs,dt){const result=original.step(inputs,dt);tick(dt);return result;};
 sim.snapshot=function(){const s=original.snapshot();s.octopus=o?{...o}:null;return s;};
 sim.restore=function(s){const result=original.restore(s);o=s.octopus?{...s.octopus}:empty();rankTimer=0;retarget=0;leaders=[];return result;};
 sim.setOctopusState=function(value){if(value&&o)Object.assign(o,value);};
 Object.defineProperty(sim,'octopus',{get:()=>o,enumerable:true});
 sim.octopusConfig=CFG;
 return sim;
}
return {decorate,CFG};
});
