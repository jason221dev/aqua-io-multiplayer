'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Aqua=require('../aqua_sim_mobile_ability_pass2');
const dt=1/60;
let passed=0;
const ok=(name,value)=>{assert.ok(value,name);passed++;console.log('PASS '+name)};
function fixture(sp='guppy'){
 const sim=Aqua.create();sim.newMatch({sp,mode:'free',seed:317,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,slots:{fish:[{pid:'P1',sp}]}});
 sim.fishes.slice(1).forEach(f=>Object.assign(f,{alive:false,respawn:1e6}));
 const fish=sim.fishes[0];
 Object.assign(fish,{x:1300,y:-35,z:110,vx:175,vy:-200,vz:45,air:true,airT:0,reentryT:0,minY:-35,prot:0});
 return{sim,fish};
}
const idle={P1:{mv:{x:0,y:0,z:0}}};
{
 const {sim,fish}=fixture(),x=fish.x,y=fish.y,z=fish.z,v=fish.vy;
 sim.step(idle,dt);
 ok('Airborne horizontal speed is unaffected by released movement',fish.air&&fish.vx===175&&fish.vz===45);
 ok('Forward position stays continuous',Math.abs(fish.x-x-175*dt)<1e-8&&Math.abs(fish.z-z-45*dt)<1e-8);
 ok('Vertical position follows exact quadratic arc',Math.abs(fish.y-(y+v*dt+.5*Aqua.GRAV*dt*dt))<1e-8);
}
{
 const {sim,fish}=fixture();let apex=false,descending=false;
 for(let i=0;i<140&&fish.air;i++){
  const vx=fish.vx,x=fish.x,oldVy=fish.vy;
  sim.step({P1:{mv:{x:-1,y:1,z:1}}},dt);
  assert.ok(Math.abs(fish.x-x-vx*dt)<1e-7,'Unexpected sideways momentum change in air');
  if(oldVy<0&&fish.vy>=0)apex=true;
  if(fish.air&&fish.vy>0&&fish.y<0)descending=true;
 }
 ok('Fish reaches apex and descends before splashing',apex&&descending);
 ok('Return underwater is downward, not inverted or teleported',!fish.air&&fish.y>=0&&fish.y<25&&fish.vy>0);
 ok('Horizontal velocity does not snap down by 20% at splash',fish.vx===175&&fish.vz===45);
 ok('Splash initiates a short water-recovery window',fish.reentryT===1.45&&fish.jumps===1&&fish.best>35);
 const y=fish.y,x=fish.x;sim.step(idle,dt);
 ok('Reentry retains forward travel after releasing controls',fish.x>x&&fish.vx>175*.9);
 ok('Reentry keeps the nose aimed down',fish.y>y&&fish.vy>0);
 for(let i=0;i<120;i++)sim.step(idle,dt);
 ok('After easing, normal release-to-stop handling resumes',fish.reentryT===0&&fish.vx===0&&fish.vz===0);
}
{
 const {sim,fish}=fixture('koi');
 Object.assign(fish,{air:false,y:55,vx:130,vy:0,vz:22,abilCD:0});
 assert.equal(sim.useAbility(fish),true);
 let descending=false;for(let i=0;i<150&&fish.air;i++){sim.step(idle,dt);if(fish.vy>0&&fish.y<0)descending=true;}
 ok('Koi Lotus Dash follows the same descending parabola',descending&&!fish.air&&fish.vx>130&&fish.y>=0);
}
{
 const {sim,fish}=fixture();Object.assign(fish,{y:-2,vy:180,vx:141,vz:-41,minY:-50});
 const h=(-180+Math.sqrt(180**2-2*Aqua.GRAV*(-2)))/Aqua.GRAV;
 const step=.05;sim.step(idle,step);
 ok('Surface intersection uses exact time-of-impact',Math.abs(fish.y-(180+Aqua.GRAV*h)*(step-h))<1e-7);
 ok('Splash crossing preserves both horizontal velocity components',fish.vx===141&&fish.vz===-41);
 const restored=Aqua.create();restored.restore(JSON.parse(JSON.stringify(sim.snapshot())));
 ok('Recovery state is snapshot/restore compatible',restored.fishes[0].reentryT===fish.reentryT);
}
{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'fisherman-mobile-ability-pass2.html'),'utf8');
 const sim=fs.readFileSync(path.join(root,'aqua_sim_mobile_ability_pass2.js'),'utf8');
 const source=html.slice(html.indexOf('/*SIM:BEGIN*/')+'/*SIM:BEGIN*/'.length,html.indexOf('/*SIM:END*/')).trim()+"\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;\n";
 ok('Browser and authoritative server use the same physics',source===sim);
 ok('Close-up and distant fish keep dive-pitch continuity',html.includes('(f.air||(f.reentryT||0)>0)?1.3:.9')&&html.includes('?1.3:.38'));
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8'),codec=fs.readFileSync(path.join(root,'motion_v2.js'),'utf8');
 ok('Binary metadata includes compatible appended recovery timer',server.includes('q(f.reentryT||0)]):null;')&&codec.includes("'lockF','lockN','reentryT'"));
}
console.log(passed+' breach parabola checks passed');
