'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','fisherman-mobile-ability-pass2.html'),'utf8');
const sim=fs.readFileSync(path.join(__dirname,'..','aqua_sim_mobile_ability_pass2.js'),'utf8');
let passes=0;const ok=(name,x)=>{assert.ok(x,name);passes++;console.log('PASS '+name)};
const start=html.indexOf('const chaseView={yaw:NaN,pitch:NaN}'),end=html.indexOf('const biteFloatScreenPos=',start);
assert.ok(start>0&&end>start,'Camera damping functions missing');
const ctx={yaw:0,pitch:.32,cam:{x:0,y:100,z:0},
 clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),
 lerpAng:(a,b,k)=>{const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*k}};
vm.runInNewContext(html.slice(start,end)+
 '\nthis.api={angles:advanceChaseView,target:advanceChaseTarget,surface:cameraSurfaceBlend};',ctx);
const {angles,target,surface}=ctx.api,D=1/60;
function delta(a,b){return Math.abs(a-b)}
const init=angles(D);ok('Follow camera initializes to requested yaw and pitch',init.yaw===0&&init.pitch===.32);
ctx.pitch=.95;
let maxPitchStep=0;for(let i=0;i<90;i++){
 const old=angles(0).pitch,now=angles(D).pitch;maxPitchStep=Math.max(maxPitchStep,delta(old,now));
 ok('Frame '+i+' camera pitch remains finite and smooth',Number.isFinite(now)&&delta(old,now)<=2.6*D+1e-10);
}
ok('Re-entry steering jump is visually eased',maxPitchStep>0&&maxPitchStep<.045);
ok('Camera catches up to downward pitch',delta(angles(0).pitch,ctx.pitch)<.003);
ctx.yaw=Math.PI;let maxYawStep=0;
for(let i=0;i<140;i++){const old=angles(0).yaw,next=angles(D).yaw;maxYawStep=Math.max(maxYawStep,delta(next,old))}
ok('Yaw rotates without a 180-degree camera cut',maxYawStep<=4.8*D+1e-10&&maxYawStep>.01);
ok('Camera converges on new heading',delta(Math.abs(angles(0).yaw),Math.PI)<.005);
ctx.pitch=-.25;
for(let i=0;i<100;i++)angles(D);
ok('Camera smoothly follows opposite breaching pitch',delta(angles(0).pitch,ctx.pitch)<.005);
ctx.cam={x:0,y:200,z:0};
let largeCorrections=true;
for(let i=0;i<90;i++){
 const old={...ctx.cam};target({x:3000,y:-40,z:900},D);
 const step=Math.hypot(ctx.cam.x-old.x,ctx.cam.y-old.y,ctx.cam.z-old.z);
 if(!(step<=(850+1650)*D+1e-8))largeCorrections=false;
}
ok('Respawn/network target corrections have bounded camera movement',largeCorrections);
ok('Camera eventually travels toward corrected target',ctx.cam.x>1500&&ctx.cam.z>400);
ok('Sky is reached smoothly above the surface',surface(-44)===0&&surface(-60)===0);
ok('Underwater environment is reached below the surface',surface(44)===1&&surface(70)===1);
ok('At waterline the visual blend is halfway',delta(surface(0),.5)<1e-12);
let maxBlendStep=0,monotonic=true,previous=surface(-44);
for(let depth=-43.8;depth<=44;depth+=.2){
 const value=surface(depth);if(value<previous||!Number.isFinite(value))monotonic=false;
 maxBlendStep=Math.max(maxBlendStep,value-previous);previous=value;
}
ok('Crossing water surface has no abrupt atmosphere change',monotonic&&maxBlendStep<.005);
{
 const a=html.indexOf('function cameraTarget(){'),b=html.indexOf('const cameraCollisionTarget=',a);
 assert.ok(a>0&&b>a,'Player follow target function not found');
 const local={playerRole:'fish',human:{x:120,y:300,z:150,mass:100,alive:false},
   fishes:[{x:120,y:300,z:150,alive:false},{x:4000,y:500,z:30,alive:true}]};
 vm.runInNewContext(html.slice(a,b)+'\nthis.camTarget=cameraTarget;',local);
 ok('Camera does not switch to a remote fish when player dies',local.camTarget()===local.human);
}
ok('Game camera always uses filtered yaw and pitch',html.includes('Math.sin(viewYaw)*Math.cos(viewPitch)*dd')&&html.includes('Math.sin(viewPitch)*dd'));
ok('Sky/water transition has no binary depth switch',!html.includes("if(cd<0){_c.copy(cSky)")&&html.includes('fogGoal=.000035+.000030*surfaceBlend'));
ok('Re-entry still only moves fish while controller is held',sim.includes('inputHeld&&splashRecovery>0')&&!sim.includes('REENTRY_DEPTH'));
const embedded=html.slice(html.indexOf('/*SIM:BEGIN*/')+13,html.indexOf('/*SIM:END*/')).trim()+
 "\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;\n";
ok('Client and authoritative server simulation remain byte-identical',embedded===sim);
{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
 for(const source of scripts)new vm.Script(source);
 ok('All inline game scripts are syntactically valid',scripts.length>=3);
}
console.log(passes+' continuous follow-camera checks passed');
