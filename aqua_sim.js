/* aqua.io simulation core: deterministic, DOM-free, instance-scoped. Generated region; edit freely between SIM markers. */
const Aqua=(()=>{
'use strict';
const CFG={eatMargin:1,tiers:[[0,'Fry'],[250,'Juvenile'],[650,'Adult'],[1400,'Apex'],[10000,'Max size']],
  fishPar:700,fisherPar:1800,catchExp:.7,catchK:10,markT:10,markMult:1.5,bountyMult:1.4,hookR:48,netR:110};
const WW=5600,WH=900,ZH=960,GRAV=700;
// Preserve the landing tangent briefly while a movement control is held.
// No auto-depth, auto-propulsion or fixed underwater dive distance.
const REENTRY_BLEND_TIME=.22;
const SP={
  guppy:{name:'Dart guppy',abil:'Quick dart',col:'#ffb347',spd:200,cd:5.8,dur:0.95,mult:1.0,mul:1.5,turn:1.27,gain:0.9,hk:1.26,r:[6,7,5,8,2,2],sh:[1.2,.85],hint:'Sidestep a larger threat for 0.28s of evasion, but slower than a straight-line sprint.'},
  sardine:{name:'Silver sardine',abil:'School surge',col:'#cfe3ee',spd:190,cd:8.3,dur:1.7,mult:1.0,mul:1.1,turn:1.16,gain:1.0,hk:1.05,r:[5,6,4,6,4,5],sh:[1.4,.6],hint:'School surge boosts nearby sardines by 10–35%; strongest when four schoolmates are together.'},
  puffer:{name:'Pufferfish',abil:'Inflate',col:'#e9d26a',spd:170,cd:13.0,dur:2.2,mult:1.0,mul:0.46,turn:1.16,gain:1.1,hk:0.84,r:[3,6,3,4,6,8],sh:[1.1,1],hint:'Inflate to 3× combat mass for 2.2s; predators that swallow you are slowed for 1.2s.'},
  barra:{name:'Barracuda',abil:'Strike lunge',col:'#8fb0c4',spd:200,cd:9.9,dur:0.8,mult:1.25,mul:1.65,turn:0.94,gain:1.05,hk:1.26,r:[6,4,8,4,5,2],sh:[1.6,.5],hint:'Lock a smaller target in front and briefly home in; catches refund cooldown, misses add 1.8s.'},
  piranha:{name:'Piranha',abil:'Frenzy',col:'#d4503c',spd:190,cd:11.1,dur:2.5,mult:1.1,mul:1.0,turn:1.38,gain:1.15,hk:1.33,r:[5,8,6,3,7,1],sh:[1.15,.95],hint:'Frenzy feeds on consecutive catches, up to three +5% speed stacks and 3.2s duration.'},
  goldfish:{name:'Goldfish',abil:'Shimmer',col:'#ffc83d',spd:170,cd:10.2,dur:1.65,mult:0.9,mul:1.08,turn:0.94,gain:1.25,hk:0.98,r:[3,4,3,5,9,6],sh:[1.15,1],hint:'Shimmer dazzles AI pursuit and interrupts player bite targeting, with a short dodge shield.'},
  koi:{name:'Koi carp',abil:'Lotus dash',col:'#f4a96d',spd:180,cd:9.4,dur:1.7,mult:1.0,mul:1.2,turn:1.16,gain:1.12,hk:0.98,r:[4,6,5,5,6,4],sh:[1.35,.8],hint:'Near the surface, leap clear of the water for brief protection; use kelp for cover below.'},
  clown:{name:'Clownfish',abil:'Anemone shield',col:'#ff6a2a',spd:180,cd:12.8,dur:1.35,mult:1.0,mul:0.95,turn:1.38,gain:1.05,hk:0.84,r:[4,8,2,3,5,8],sh:[1.1,.8],hint:'Anemone shield protects you and nearby clownfish; contact slows would-be predators.'},
  eel:{name:'Electric eel',abil:'Shock pulse',col:'#5a8f6a',spd:180,cd:11.1,dur:1.6,mult:1.0,mul:1.12,turn:0.94,gain:1.1,hk:0.98,r:[4,4,5,5,6,6],sh:[2,.35],hint:'Shock stuns unshielded fish nearby, disrupting camouflage and active attacks; interrupts reelers.'},
  tuna:{name:'Bluefin tuna',abil:'Torpedo',col:'#4f78a8',spd:230,cd:9.7,dur:0.9,mult:1.25,mul:1.0,turn:0.72,gain:1.0,hk:1.19,r:[9,2,6,5,4,3],sh:[1.6,.8],hint:'Torpedo accelerates from 1.3× to 2.8× in a committed heading; hard to steer or stop.'},
  angel:{name:'Angelfish',abil:'Whirl',col:'#e8e0a0',spd:180,cd:7.2,dur:1.3,mult:1.0,mul:1.3,turn:1.49,gain:0.9,hk:1.26,r:[4,9,4,9,2,2],sh:[.95,1.25],hint:'Whirl pulls and spins smaller unprotected prey inwards, stronger late in the pulse.'},
  seahorse:{name:'Seahorse',abil:'Camouflage',col:'#d9a35c',spd:150,cd:9.7,dur:2.25,mult:0.85,mul:0.78,turn:1.38,gain:1.05,hk:0.77,r:[1,8,3,4,5,9],sh:[.75,1],hint:'Camouflage holds while moving cautiously, with a higher speed limit in kelp.'},
  sunfish:{name:'Sunfish',abil:'Moon glide',col:'#9fb0bd',spd:170,cd:9.2,dur:2.3,mult:1.15,mul:1.28,turn:0.72,gain:1.3,hk:0.98,r:[3,2,5,3,10,6],sh:[1.2,1.3],hint:'Plankton within 130 units is drawn toward you while gliding, but turning remains sluggish.'}
};
const SPECIES_KEYS=Object.keys(SP);
const STARTER_FISH_MASS=100;
const LURE_MASS=STARTER_FISH_MASS+1;
const LURE_KEYS=SPECIES_KEYS;
const PH=['Nursery','Growth','Hunt','Apex'];
const PHD=['Protected. Fishers wait.','Food rises. Fishers gain tools.','All fish can bite a lure. Sonar shows size on the fish finder.','No respawns. Highest side wins.'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const GROWTH={ambientPrey:.68,rivalPrey:.50,plankton:3,maxMass:10000};
const ABILITY={pufferVolume:3,pufferRadius:Math.cbrt(3),shockRadius:150,whirlRadius:115,
  schoolRadius:225,glimmerRadius:145,clownRadius:125,spinLength:.8,
  eelStun:1.05,eelFisherInterrupt:.48,schoolBoost:1.25,anglerHookMiss:.20,
  flickerSpeed:300,flickerTime:.25,schoolBoostMin:1.10,schoolBoostMax:1.35,
  lungeRange:260,lungeCone:.35,lungeRefund:.4,lungeMiss:1.8,torpedoRamp:[1.3,2.8],
  frenzyStack:.05,frenzyMaxStack:3,frenzyCap:3.2,dazzleSlow:.62,leapMaxY:120,leapPeak:60,
  stingSlow:.9,stingGrace:3,whirlSwirl:.45,whirlPullMax:96,kelpCamoSpeed:175,
  magnetRadius:130,magnetPull:90,toxinSlow:1.2};
// Ability counterplay: power always costs time, radius, manoeuvrability, or exposure.
// Fishermen maintain a small initiative advantage, but never auto-hook a player.
const BALANCE={fisherTargetCatchShare:.55,redAiReaction:.51,fishSpawnShield:6,
  fishMassEpsilon:0,piranhaConversion:1.30};
const activeAbility=f=>!!f&&f.alive!==false&&(f.abilT||0)>0;
const puffing=f=>!!f&&f.sp==='puffer'&&activeAbility(f);
// Permanent biomass and temporary combat mass are deliberately separate.
// The inflated puffer competes at 3x mass while its real size/growth stays unchanged.
const combatMass=f=>(f.mass||0)*(puffing(f)?ABILITY.pufferVolume:1);
// Initial 6s spawn invulnerability and timed defensive abilities block predation;
// ordinary NPC schooling food is never protected by a competitor spawn shield.
const predationProtected=f=>!!f.sp&&((f.prot||0)>0||(f.dodgeT||0)>0||!!f.air);
const rad=m=>5+Math.sqrt(Math.max(0,m))*.95;
const hitRadius=f=>rad(f.mass)*(puffing(f)?ABILITY.pufferRadius:1);
const lerpAng=(a,b,k)=>{const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*k};
const CELL=160;
const gk=(x,y,z)=>(Math.floor(x/CELL)+1)*100000+(Math.floor(y/CELL)+1)*1000+(Math.floor(z/CELL)+8);
/* Collision volumes of the sunken ship (static data; the renderer builds matching meshes). */
const shipSolids=[{"x":2968,"y":877,"z":0,"xh":540,"yh":11,"zh":215},{"x":2578,"y":756,"z":-232,"xh":150,"yh":115,"zh":9},{"x":3318,"y":756,"z":-232,"xh":190,"yh":115,"zh":9},{"x":2958,"y":658,"z":-232,"xh":130,"yh":15,"zh":9},{"x":2438,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":2513,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":2598,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":2693,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":3133,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":3228,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":3328,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":3418,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":3493,"y":755,"z":-219,"xh":6.5,"yh":115,"zh":7.5},{"x":2968,"y":632,"z":-235,"xh":545,"yh":9,"zh":12},{"x":2578,"y":756,"z":232,"xh":150,"yh":115,"zh":9},{"x":3318,"y":756,"z":232,"xh":190,"yh":115,"zh":9},{"x":2958,"y":658,"z":232,"xh":130,"yh":15,"zh":9},{"x":2438,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":2513,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":2598,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":2693,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":3133,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":3228,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":3328,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":3418,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":3493,"y":755,"z":219,"xh":6.5,"yh":115,"zh":7.5},{"x":2968,"y":632,"z":235,"xh":545,"yh":9,"zh":12},{"x":2611,"y":640,"z":0,"xh":183,"yh":9,"zh":226},{"x":3325,"y":640,"z":0,"xh":183,"yh":9,"zh":226},{"x":2968,"y":640,"z":-180,"xh":174,"yh":9,"zh":46},{"x":2968,"y":640,"z":180,"xh":174,"yh":9,"zh":46},{"x":3503,"y":755,"z":-168,"xh":9,"yh":115,"zh":64},{"x":3503,"y":755,"z":168,"xh":9,"yh":115,"zh":64},{"x":2448,"y":552,"z":0,"xh":10,"yh":82,"zh":224},{"x":2668,"y":551,"z":-167,"xh":9,"yh":83,"zh":58},{"x":2668,"y":551,"z":167,"xh":9,"yh":83,"zh":58},{"x":2668,"y":477,"z":0,"xh":9,"yh":10,"zh":110},{"x":2558,"y":458,"z":0,"xh":130,"yh":10,"zh":240},{"x":2558,"y":627,"z":0,"xh":120,"yh":6,"zh":222.5},{"x":2558,"y":605,"z":-231,"xh":112.5,"yh":22,"zh":7},{"x":2558,"y":482,"z":-231,"xh":112.5,"yh":15,"zh":7},{"x":2457,"y":548,"z":-231,"xh":10,"yh":60,"zh":7},{"x":2658,"y":548,"z":-231,"xh":10,"yh":60,"zh":7},{"x":2558,"y":605,"z":231,"xh":112.5,"yh":22,"zh":7},{"x":2558,"y":482,"z":231,"xh":112.5,"yh":15,"zh":7},{"x":2457,"y":548,"z":231,"xh":10,"yh":60,"zh":7},{"x":2658,"y":548,"z":231,"xh":10,"yh":60,"zh":7},{"x":2433,"y":756,"z":-167,"xh":9,"yh":116,"zh":63},{"x":2433,"y":756,"z":167,"xh":9,"yh":116,"zh":63},{"x":2798,"y":430,"z":0,"xh":10,"yh":210,"zh":10},{"x":3253,"y":477.5,"z":0,"xh":10,"yh":162.5,"zh":10},{"x":2548,"y":837,"z":-145,"xh":22.5,"yh":30,"zh":22.5},{"x":2603,"y":837,"z":-145,"xh":22.5,"yh":30,"zh":22.5},{"x":3333,"y":837,"z":145,"xh":22.5,"yh":30,"zh":22.5},{"x":3398,"y":837,"z":145,"xh":22.5,"yh":30,"zh":22.5},{"x":2548,"y":568,"z":0,"xh":50,"yh":5,"zh":37.5},{"x":3263,"y":849,"z":-135,"xh":50,"yh":24,"zh":34}];
// Supplement hull/deck/cabin AABBs with the visible upper railings, splinters,
// hatch rim, spars and rigging. Intact structures are physical; the intentionally
// modelled breaches, cabin entry, central hatch and bow passage stay open.
for(const side of [-1,1]){
  for(let a=-520;a<=520;a+=104)shipSolids.push({x:2968+a,y:598,z:side*234,xh:4.5,yh:30,zh:4.5});
  shipSolids.push({x:2968,y:567,z:side*234,xh:540,yh:5,zh:6});
  for(let i=0;i<7;i++)shipSolids.push({x:2968-150+i*8,y:713+i*17,z:side*232,xh:(35+i*3)/2,yh:9,zh:6.5});
}
for(const z of [-127,127])shipSolids.push({x:2968,y:624,z,xh:175,yh:7,zh:6});
for(const a of [-174,174])shipSolids.push({x:2968+a,y:624,z:0,xh:6,yh:7,zh:133});
// Small, solid obstructions omitted by the original hand-maintained collider list.
for(const a of [-400,330,445])for(const z of [-185,185])shipSolids.push({x:2968+a,y:608,z,xh:31,yh:12.5,zh:24});
const shipCapsules=[];
function shipRod(a,b,r){shipCapsules.push({a:{x:2968+a[0],y:a[1],z:a[2]},b:{x:2968+b[0],y:b[1],z:b[2]},r})}
for(const side of [-1,1]){
  shipRod([535,635,side*232],[630,682,side*25],10);
  shipRod([535,875,side*220],[610,860,0],12);
}
shipRod([480,600,0],[740,485,0],10);
for(const [a,top,w] of [[-170,220,350],[285,315,275]]){
  shipRod([a-w/2,top+35,0],[a+w/2,top+35,0],7);
  for(const z of [-225,225]){
    shipRod([a,top+15,0],[a-170,631,z],2.1);
    shipRod([a,top+15,0],[a+170,631,z],2.1);
  }
  // Intact canvas is a deforming surface approximately 32 units off centre.
  // Use three shallow bands instead of an impassable mast-to-mast wall.
  shipSolids.push({x:2968+a,y:top+115,z:13,xh:w/2,yh:75,zh:19});
}
for(const z of [-185,185])for(const a of [-400,330,445])shipRod([a,591,z-42],[a,591,z+42],15);
shipRod([610,807,180],[610,874,180],7);
shipRod([570,843,180],[650,843,180],5);
shipRod([575,859,180],[610,882,180],7);
shipRod([610,882,180],[648,859,180],7);
// Squared separation of finite segments: works for LOS rays and rigging.
function shipSegmentDistance2(p0,p1,q0,q1){
 const u=[p1.x-p0.x,p1.y-p0.y,p1.z-p0.z],v=[q1.x-q0.x,q1.y-q0.y,q1.z-q0.z],w=[p0.x-q0.x,p0.y-q0.y,p0.z-q0.z];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const a=dot(u,u),b=dot(u,v),c=dot(v,v),d=dot(u,w),e=dot(v,w);
 let sn,sd=a*c-b*b,tn,td=sd;
 if(a<1e-9){sn=0;sd=1;tn=e;td=c||1}
 else if(c<1e-9){tn=0;td=1;sn=-d;sd=a}
 else if(sd<1e-9){sn=0;sd=1;tn=e;td=c}
 else{sn=b*e-c*d;tn=a*e-b*d;
   if(sn<0){sn=0;tn=e;td=c}else if(sn>sd){sn=sd;tn=e+b;td=c}}
 if(tn<0){tn=0;if(-d<0)sn=0;else if(-d>a)sn=sd;else{sn=-d;sd=a}}
 else if(tn>td){tn=td;if(-d+b<0)sn=0;else if(-d+b>a)sn=sd;else{sn=-d+b;sd=a}}
 const t=Math.abs(sd)<1e-9?0:sn/sd,h=Math.abs(td)<1e-9?0:tn/td;
 const dx=w[0]+t*u[0]-h*v[0],dy=w[1]+t*u[1]-h*v[1],dz=w[2]+t*u[2]-h*v[2];
 return dx*dx+dy*dy+dz*dz;
}
const WRECK={x:WW*.53,z:0};
function inWreck(f){const x=f.x-WRECK.x,z=f.z-WRECK.z;return Math.abs(x)<485&&Math.abs(z)<205&&f.y>650&&f.y<865 || x>-495&&x<-290&&Math.abs(z)<205&&f.y>465&&f.y<630}
function shipBlocked(a,b){
  if(Math.max(a.x,b.x)<WRECK.x-640||Math.min(a.x,b.x)>WRECK.x+790||Math.min(a.y,b.y)>895||Math.max(a.y,b.y)<105)return false;
  for(const q of shipSolids){let lo=0,hi=1;for(const k of ['x','y','z']){const d=b[k]-a[k];if(Math.abs(d)<1e-8){if(a[k]<q[k]-q[k+'h']||a[k]>q[k]+q[k+'h']){hi=-1;break}}else{let u=(q[k]-q[k+'h']-a[k])/d,v=(q[k]+q[k+'h']-a[k])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v)}}if(lo<=hi)return true}
  for(const c of shipCapsules)if(shipSegmentDistance2(a,b,c.a,c.b)<=c.r*c.r)return true;
  return false;
}
function unstickShip(f){
  if(f.x<WRECK.x-650||f.x>WRECK.x+800||Math.abs(f.z)>360||f.y<90)return;
  const r=rad(f.mass)*.8;
  for(let pass=0;pass<3;pass++)for(const q of shipSolids){
    const dx=f.x-q.x,dy=f.y-q.y,dz=f.z-q.z,px=q.xh+r-Math.abs(dx),py=q.yh+r-Math.abs(dy),pz=q.zh+r-Math.abs(dz);
    if(px<=0||py<=0||pz<=0)continue;
    if(px<=py&&px<=pz){f.x+=Math.sign(dx||1)*px;f.vx=0}
    else if(py<=pz){f.y+=Math.sign(dy||-1)*py;f.vy=0}
    else{f.z+=Math.sign(dz||1)*pz;f.vz=0}
  }
  for(const c of shipCapsules){
    const vx=c.b.x-c.a.x,vy=c.b.y-c.a.y,vz=c.b.z-c.a.z;
    const u=clamp(((f.x-c.a.x)*vx+(f.y-c.a.y)*vy+(f.z-c.a.z)*vz)/(vx*vx+vy*vy+vz*vz||1),0,1);
    const px=c.a.x+vx*u,py=c.a.y+vy*u,pz=c.a.z+vz*u;
    let dx=f.x-px,dy=f.y-py,dz=f.z-pz,dist2=dx*dx+dy*dy+dz*dz;
    const safe=r+c.r;if(dist2>=safe*safe)continue;
    const d=Math.sqrt(dist2)||1,nx=dist2>1e-8?dx/d:1,ny=dist2>1e-8?dy/d:0,nz=dist2>1e-8?dz/d:0;
    const shift=safe-d+.0001;
    f.x+=nx*shift;f.y+=ny*shift;f.z+=nz*shift;
    const approach=f.vx*nx+f.vy*ny+f.vz*nz;
    if(approach<0){f.vx-=nx*approach;f.vy-=ny*approach;f.vz-=nz*approach}
  }
}
function shipMove(f,old){
  const destX=f.x,destY=f.y,destZ=f.z;
  const n=Math.min(160,Math.max(1,Math.ceil(Math.hypot(destX-old.x,destY-old.y,destZ-old.z)/7)));
  const dx=(destX-old.x)/n,dy=(destY-old.y)/n,dz=(destZ-old.z)/n;
  f.x=old.x;f.y=old.y;f.z=old.z;
  // If the ENTIRE segment misses the wreck's conservative interaction region,
  // collision resolution cannot change its path. Keep the original integration
  // order (and floating-point results) while avoiding repeated collision calls.
  const away=(old.x<WRECK.x-650&&destX<WRECK.x-650)||
    (old.x>WRECK.x+800&&destX>WRECK.x+800)||
    (old.z< -360&&destZ< -360)||(old.z>360&&destZ>360)||
    (old.y<90&&destY<90);
  if(away){for(let i=0;i<n;i++){f.x+=dx;f.y+=dy;f.z+=dz}return}
  for(let i=0;i<n;i++){f.x+=dx;f.y+=dy;f.z+=dz;unstickShip(f)}
}
const COLLISION_DIMS={};
for(const k of Object.keys(SP)){
  const s=SP[k].sh,mod={sardine:[1.05,.55,.45],puffer:[.78,1.08,1.02],barra:[1.35,.46,.38],piranha:[.92,.92,.58],goldfish:[.92,.82,.66],clown:[.96,.72,.60],eel:[1.55,.26,.24],tuna:[1.25,.58,.50],angel:[.78,1.12,.44],seahorse:[.55,.78,.38],sunfish:[.92,1.22,.24],koi:[1.08,.68,.52]}[k]||[1,1,.75];
  // Match fishBodyDims (defined in the renderer); keep a conservative core.
  COLLISION_DIMS[k]=[s[0]*mod[0],s[1]*mod[1],s[1]*mod[2]];
}
const FISHER_CFG={rodMin:10,rodRange:60,k:.016,damper:.0024,maxReelSpeed:235,
  maxPayoutSpeed:380,boatTopSpeed:170,landingRange:160,biteTapGain:.05,biteTapMaxRate:8,biteDecay:.05,pullRise:.14,pullWindow:.3,biteStrokePx:18,setHookButton:false,
  aiTapMinDelay:.25,aiTapMaxDelay:.6,aiTapMinRate:3.5,aiTapMaxRate:6.5,
  aiHookMissChance:.20,aiHookMinDelay:.32,aiHookMaxDelay:1.95,aiCastSpeed:300,aiLureDrift:28,aiHoldMin:5,aiHoldMax:9,
  solverHz:60,landingDepth:155,loadBreak:1.0};
const CAST_CFG={aimSpeed:610,aimRadius:870,defaultRange:390,sinkSpeed:112,maxSinkDepth:720,
  horizontalMin:17,surfaceLift:5,aimMarkerRadius:31};
// Server and client agree on one deterministic tension scale.
// GREEN: outward swimming feeds slack; YELLOW: reeling retrieves and pulls;
// RED: hooked fish may break the line with one button press.
const FIGHT_GREEN_MAX=.42,FIGHT_RED_MIN=.82;
const FIGHT_STEP=1/60;
const FISH_FIGHT_PROFILES={
 guppy:{burst:1.1,turn:1.8,power:.7,dive:.65},sardine:{burst:1.2,turn:1.5,power:.88,dive:.6},
 puffer:{burst:.6,turn:.8,power:1.05,dive:.65},barra:{burst:1.6,turn:1.15,power:1.25,dive:1.0},
 piranha:{burst:1.4,turn:1.7,power:.95,dive:.7},goldfish:{burst:.75,turn:1.2,power:.85,dive:.5},
 koi:{burst:1.0,turn:.9,power:1.2,dive:.8},clown:{burst:1.3,turn:1.5,power:.75,dive:.7},
 eel:{burst:1.5,turn:1.6,power:1.0,dive:1.4},tuna:{burst:1.7,turn:.7,power:1.35,dive:.85},
 angel:{burst:1.0,turn:1.8,power:.8,dive:1.0},seahorse:{burst:.7,turn:1.7,power:.45,dive:.95},
 sunfish:{burst:.55,turn:.65,power:1.3,dive:.6}
};
function create(){
  /* ---- all mutable simulation state lives here; nothing is read from the DOM, WebGL, devices or Math.random ---- */
  let L=300,t=0,state='menu',fishes=[],npcs=[],plank=[],foodPatches=[],nextFoodPatchAt=0,foodPatchSerial=0,miniSchool=null,fishers=[],kelp=[],pings=[],revealT=0,feed=[],splashes=[],drops=[],npcGrid=new Map(),biteSeq=0,events=[];
  let rngState=1, populationCap=Infinity;const rules={nurseryProtect:false};
  // Recycle occupied spatial-hash buckets between passes. Stable NPC order and query order.
  const npcBucketPool=[];
  const ZERO3=Object.freeze({x:0,y:0,z:0});
  function seedRng(s){rngState=(s>>>0)||1}
  function rand(){rngState=rngState+0x6D2B79F5|0;let x=Math.imul(rngState^rngState>>>15,1|rngState);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296}
  const rnd=(a,b)=>a+rand()*(b-a),rz=()=>rnd(-ZH+40,ZH-40);
  const emit=e=>{events.push(e)};
  const vib=(to,p)=>{if(to)emit({k:'vib',to,p})};
  /* Feed entries are addressed: to=pid shows only to that player, except=pid hides it from that player. */
  function addFeed(s,c,to,except){feed.push({s,c,t:6,to:to||null,except:except||null});if(feed.length>12)feed.shift()}
  function sideNames(f){return f.human?(f.name||'A player'):'A '+SP[f.sp].name.toLowerCase()}
  function nmFor(x,v){return x===v?'You':sideNames(x)}
  function feedAbout(f,tail,toneSelf,toneOthers){if(f.human)addFeed('You'+tail,toneSelf,f.pid);addFeed(sideNames(f)+tail,toneOthers,null,f.human?f.pid:null)}
  const rodOf=fr=>fr.in.rod,dragOf=fr=>fr.in.drag;
  const mvOf=f=>{const m=f.in.mv;return{x:m.x,y:m.y,z:m.z}};
  const btOf=f=>{if(state!=='play')return null;const b=f.in.bt;if(!b)return null;return(b.g==='f'?fishes:npcs)[b.i]||null};
  function newMatch(o){
    const spKey=typeof o.sp==='string'&&Object.prototype.hasOwnProperty.call(SP,o.sp)?o.sp:'guppy',auto=!!o.auto,slots=o.slots||{},fslots=slots.fish||[],hslots=slots.fishers||[];
    seedRng(o.seed==null?1:o.seed);
    rules.nurseryProtect=!!o.nurseryProtect;
    rules.mode=['free','last'].includes(o.mode)?o.mode:'timed';
    // Optional arena cap; omitted for experimental 400-player benchmark rooms.
    populationCap=Number.isInteger(o.maxTotalFish)?Math.max(8,Math.min(2000,o.maxTotalFish)):Infinity;
    L=o.quick?150:300;t=auto?L*.25:0;state=auto?'menu':'play';feed=[];events=[];biteSeq=0;
    kelp=[];for(let i=0;i<60;i++){const k={x:rnd(130,WW-130),z:rnd(-ZH+130,ZH-130),rx:rnd(65,105),ry:rnd(105,165),rzz:rnd(65,105),ph:rnd(0,6)};k.y=WH-k.ry;
      if(Math.abs(k.x-WRECK.x)>690||Math.abs(k.z)>340)kelp.push(k)}
    const ks=SPECIES_KEYS;fishes=[];
    // All visible aquarium fish are genuine competing fish. Unclaimed slots are
    // autonomous opponents using exactly the same growth/death rules as players.
    const count=Math.min(populationCap,Math.max(8,Math.min(400,Number.isInteger(o.competitorCount)?o.competitorCount:fslots.length)));
    const pool=ks.filter(k=>k!==spKey);
    // Seeded Fisher-Yates: unlike Array.sort(random), replays are reproducible.
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
    for(let i=0;i<count;i++){
      const sl=fslots[i],requested=sl&&sl.sp,valid=typeof requested==='string'&&Object.prototype.hasOwnProperty.call(SP,requested);
      const sp=i===0&&!valid?spKey:(valid?requested:pool[(i-1+pool.length)%pool.length]);
      const f=mkFish(sp,(sl&&sl.pid)||false,i);
      if(sl&&sl.name)f.name=sl.name;
      // Last Fish Standing must not put human fish 55 metres beneath the
      // only early food source while competitors are already feeding above.
      // Everyone begins at mass 100, in reachable upper water, and receives
      // an identical brief opening grace period against rival predation.
      f.prot=BALANCE.fishSpawnShield; // Identical protection for all contestants in both game modes.
      if(rules.mode==='last')f.y=rnd(70,155);
      fishes.push(f);
    }
    const f0=fishes[0];f0.x=WRECK.x+40;f0.y=rules.mode==='last'?85:570;f0.z=360;
    npcs=[];const requestedNpcs=Number.isInteger(o.npcCount)&&o.npcCount>=0?Math.min(o.npcCount,2000):480;
    const nn=Math.max(0,Math.min(requestedNpcs,populationCap-fishes.length));
    for(let i=0;i<nn;i++){const p=mkNpc(ks[i%ks.length]);p.id=i;npcs.push(p)}
    // Mini-fish are non-competitive FOOD, never ambient AI opponents: the
    // competitive roster and last-fish-standing winner condition exclude them.
    const minis=Number.isInteger(o.miniFishCount)?clamp(o.miniFishCount,0,60):0;
    miniSchool={x:clamp(f0.x+270,250,WW-250),y:clamp(f0.y-90,135,WH-110),
      z:clamp(f0.z+90,-ZH+200,ZH-200),tx:0,ty:0,tz:0,roamT:0,birthT:0};
    chooseSchoolWaypoint();
    for(let i=0;i<minis;i++){const p=makeMiniFish(i);p.id=npcs.length;npcs.push(p)}
    // Start within reach of a small, spread-out nursery school: the first bite
    // teaches the game instead of demanding random exploration of a giant tank.
    for(let i=0;i<Math.min(18,nn);i++){
      const p=npcs[i],a=i*2.39996,rr=80+Math.sqrt(i/18)*105;
      p.x=clamp(f0.x+Math.cos(a)*rr,50,WW-50);
      p.y=clamp(f0.y+Math.sin(a*2.2)*55,50,WH-50);
      p.z=clamp(f0.z+Math.sin(a)*rr*.64,ZH*-1+45,ZH-45);
      p.mass=rnd(16,48);p.displayMass=p.mass;
    }
    // Finite floating food patches. A consumed pellet remains gone; only a
    // newly created patch fills vacant pellet slots, with a NEW patch ID.
    foodPatches=[];foodPatchSerial=0;
    plank=Array.from({length:320},()=>({x:0,y:0,z:0,patchId:0,alive:false}));
    for(let k=0;k<6;k++)spawnFoodPatch(k===0,f0);
    nextFoodPatchAt=t+10+rnd(0,3);
    fishers=[0,1].map(i=>{const hs=hslots[i];return{x:WW*(i?.7:.3),z:i?90:-90,cd:1.5,cast:null,score:0,breaks:0,caught:0,pingT:6+i*5,target:null,name:(hs&&hs.name)||'Fisher '+(i+1),human:!!(hs&&hs.pid),pid:(hs&&hs.pid)||null,heading:0,vx:0,vz:0,reelBuffer:0,
      bestFight:0,shockT:0,reel:{active:false,budget:0,depthStroke:false},in:{stick:{x:0,y:0},mode:'aim',rod:.53,roll:0,drag:.44,hook:0}}});
    if(fishers[0].human){
      initializeCastAim(fishers[0]);
      // Local nursery fish provide a discoverable fishing start, not automatic catches.
      for(let i=1;i<=3;i++){
        const f=fishes[i];f.x=clamp(fishers[0].x+170+i*110,160,WW-160);
        f.z=clamp(fishers[0].z-180+(i-1)*140,-ZH+70,ZH-70);f.y=125+i*50;
        f.wx=-1;f.wz=0;f.wt=0; // Keep first-spawn protection even near the fishermen.
      }
    }
    for(const fr of fishers)if(fr.human&&fr!==fishers[0])initializeCastAim(fr);
    pings=[];splashes=[];drops=[];revealT=0;
    for(const f of fishes)unstickShip(f);for(const p of npcs)unstickShip(p);
    buildNpcGrid();buildPlayerGrid();
  }
  /* ---- input frames: the only way players influence the simulation ----
     fish frame   {mv:{x,y,z}, tap:int, bt:{g:'f'|'n',i}|null}
     fisher frame {stick:{x,y}, mode:'aim'|'boat', aim:{x,z}|null, rod:.53, drag:.44,
                   reel:{hold:boolean,up:boolean}, ev:[{t:'cast',lure}|{t:'land'}], hook:biteId}  */
  function tapFish(f){
    if(state!=='play'||!f.alive)return;
    if(f.hooked){
      const fr=f.hooked.fr,c=fr?.cast;
      // The server owns this eligibility. A tap outside the red window is
      // only a normal struggle; it cannot pre-arm a future break.
      if(c?.state==='fight'&&c.fish?.[0]===f&&c.breakWindow===true&&fr.reel.active&&c.tension>=FIGHT_RED_MIN){
        releaseHumanFish(fr,c,'break');return;
      }
      f.hooked.esc+=f.hooked.tool==='net'?.045:.05;
    }
    else{const b=biteCastOf(f);if(b)biteTap(b.fr,b.c,f);else useAbility(f)}
  }
  function applyFisherInput(fr,inp){
    const I=fr.in,rr=fr.reel;
    if(inp.stick&&typeof inp.stick==='object'){
      I.stick.x=clamp(Number(inp.stick.x)||0,-1,1);
      I.stick.y=clamp(Number(inp.stick.y)||0,-1,1);
    }
    I.mode=inp.mode==='boat'?'boat':'aim';
    // Legacy rod/drag remain optional for backwards-compatible replays. The new
    // mobile controller provides stable assisted defaults without calibration.
    if(Number.isFinite(inp.rod))I.rod=clamp(inp.rod,0,1);
    if(Number.isFinite(inp.drag))I.drag=clamp(inp.drag,0,1);
    if(Number.isFinite(inp.roll))I.roll=clamp(inp.roll,-25,25);
    if(inp.aim&&Number.isFinite(inp.aim.x)&&Number.isFinite(inp.aim.z)){
      const dx=inp.aim.x-fr.x,dz=inp.aim.z-fr.z,d=Math.hypot(dx,dz)||1;
      const scale=Math.min(1,CAST_CFG.aimRadius/d);
      fr.aimX=clamp(fr.x+dx*scale,35,WW-35);
      fr.aimZ=clamp(fr.z+dz*scale,-ZH+35,ZH-35);
    }
    // Rising REEL press locks a sinking lure at its current depth. Never
    // infer a new press from repeated held frames or animation ticks.
    const reelPressed=inp.reel?.down===true||(inp.reel?.hold===true&&!rr.active);
    rr.active=inp.reel?.hold===true;
    if(inp.reel?.up)rr.active=false;
    const prior=fr.cast;
    if(reelPressed&&prior?.state==='bait'&&!prior.depthLocked){
      prior.depthLocked=true;
      prior.lockedDepth=prior.y;
      prior.retrievePhase='horizontal';
      prior.justLocked=true; // the press locks; retrieval starts on following tick
      addFeed('DEPTH LOCKED · '+(prior.lockedDepth/10).toFixed(1)+' m · reel toward boat','good',fr.pid);
      vib(fr.pid,24);
    }
    const E=Array.isArray(inp.ev)?inp.ev:[];
    if(state==='play')for(let k=0;k<E.length&&k<3;k++){
      const e=E[k],c=fr.cast;
      if(e?.t==='cast'&&(!c||c.state==='bait'))castHumanLure(fr,e.lure);
      else if(e?.t==='land'&&c?.state==='fight'&&c.fish[0]&&canLandFish(fr,c,c.fish[0]))landHumanFish(fr,c,c.fish[0]);
    }
    const c=fr.cast;
    if(Number.isInteger(inp.hook)&&inp.hook>0&&c?.state==='bite'&&c.biteId===inp.hook&&c.biteAge>=.10)setHumanHook(fr);
  }
  /* Fisher inputs apply first, so a hook-set and a break-free tap landing in the same tick resolve in the fisher's favour. */
  /* Untrusted input is clamped here, so no client can inject NaN/Infinity into the world. */
  function cleanFishInput(inp){
    let mv=ZERO3;
    if(inp&&inp.mv&&typeof inp.mv==='object'){
      let x=clamp(+inp.mv.x||0,-1,1),y=clamp(+inp.mv.y||0,-1,1),z=clamp(+inp.mv.z||0,-1,1);const m=Math.hypot(x,y,z);
      if(m>1){x/=m;y/=m;z/=m}mv={x,y,z};
    }
    let bt=null;const b=inp&&inp.bt;
    if(b&&(b.g==='f'||b.g==='n')&&Number.isInteger(b.i)&&b.i>=0)bt={g:b.g,i:b.i};
    return{mv,bt};
  }
  function applyInputs(inputs){
    for(const fr of fishers)if(fr.human){const inp=Object.prototype.hasOwnProperty.call(inputs,fr.pid)?inputs[fr.pid]:null;
      if(inp)applyFisherInput(fr,inp);else fr.reel.active=false;}
    for(const f of fishes)if(f.human){
      const inp=Object.prototype.hasOwnProperty.call(inputs,f.pid)?inputs[f.pid]:null;
      f.in=cleanFishInput(inp);
      if(inp&&inp.tap)for(let k=0;k<Math.min(inp.tap|0,4);k++)tapFish(f);
    }
  }
  function eatEvent(f,o){
    if(!f.human||state!=='play')return;
    f.biteAt=t;f.biteSize=clamp(o.mass/Math.max(1,f.mass),0,1);
    emit({k:'eat',pid:f.pid,x:o.x,y:o.y,z:o.z,mass:o.mass,sp:o.sp||null,kind:o.kind||null,ang:o.ang||0,o:{g:o.sp?'f':'n',i:o.sp?o.i:o.id}});
  }
  function endMatch(){if(state==='end')return;state='end';emit({k:'end'})}
  function idle(dt){t+=dt}
  function setState(s){state=s}
  function drainEvents(){const e=events;events=[];return e}
  /* ---- snapshot / restore: JSON-safe, so a server can send it and a client can resume from it ---- */
  function snapshot(){
    const fi=new Map(fishes.map((f,i)=>[f,i])),ni=new Map(npcs.map((o,i)=>[o,i])),ri=new Map(fishers.map((r,i)=>[r,i]));
    const sv=v=>{
      if(v&&typeof v==='object'){
        if(fi.has(v))return{__r:'f',i:fi.get(v)};if(ni.has(v))return{__r:'n',i:ni.get(v)};if(ri.has(v))return{__r:'r',i:ri.get(v)};
        if(Array.isArray(v))return v.map(sv);const o={};for(const k in v)o[k]=sv(v[k]);return o}
      return typeof v==='number'&&!Number.isFinite(v)?{__n:String(v)}:v};
    const se=e=>{const o={};for(const k in e)o[k]=sv(e[k]);return o}; // entities serialize their fields; references between entities become {__r}
    return{v:1,rng:rngState,t,L,state,revealT,biteSeq,rules:{...rules},
      ...(Number.isFinite(populationCap)?{populationCap}:{}),
      fishes:fishes.map(se),npcs:npcs.map(se),miniSchool:sv(miniSchool),fishers:fishers.map(se),
      plank:plank.map(sv),foodPatches:foodPatches.map(sv),nextFoodPatchAt,foodPatchSerial,kelp:kelp.map(sv),pings:pings.map(sv),splashes:splashes.map(sv),drops:drops.map(sv),feed:feed.map(sv)};
  }
  function restore(s){
    rngState=s.rng;t=s.t;L=s.L;state=s.state;revealT=s.revealT;biteSeq=s.biteSeq;Object.assign(rules,s.rules);
    populationCap=Number.isInteger(s.populationCap)?Math.max(8,Math.min(2000,s.populationCap)):Infinity;events=[];
    const F=s.fishes.map(()=>({})),N=s.npcs.map(()=>({})),R=s.fishers.map(()=>({}));
    const dv=v=>{
      if(v&&typeof v==='object'){
        if(v.__r)return(v.__r==='f'?F:v.__r==='n'?N:R)[v.i];if(v.__n)return Number(v.__n);
        if(Array.isArray(v))return v.map(dv);const o={};for(const k in v)o[k]=dv(v[k]);return o}
      return v};
    s.fishes.forEach((e,i)=>Object.assign(F[i],dv(e)));s.npcs.forEach((e,i)=>Object.assign(N[i],dv(e)));s.fishers.forEach((e,i)=>Object.assign(R[i],dv(e)));
    fishes=F;npcs=N;miniSchool=s.miniSchool?dv(s.miniSchool):null;fishers=R;plank=s.plank.map(dv);foodPatches=(s.foodPatches||[]).map(dv);nextFoodPatchAt=s.nextFoodPatchAt??(t+12);foodPatchSerial=s.foodPatchSerial??Math.max(0,...foodPatches.map(p=>p.id||0));kelp=s.kelp.map(dv);pings=s.pings.map(dv);splashes=s.splashes.map(dv);drops=s.drops.map(dv);feed=s.feed.map(dv);
    buildNpcGrid();buildPlayerGrid();
  }
  function absorbPrey(predator,preyMass,fraction,maxMass=GROWTH.maxMass){
    const before=predator.mass;
    const gained=Math.max(0,preyMass)*Math.max(0,fraction);
    predator.mass=Math.min(maxMass,before+gained);
    const deltaR=rad(predator.mass)-rad(before);
    if(deltaR>0){predator.growthDelta=(predator.growthDelta||0)+deltaR;predator.growthAt=t;}
    return deltaR;
  }
  function phase(){if(rules.mode==='free'||rules.mode==='last')return 2;const k=t/L*300;return k<20?0:k<120?1:k<240?2:3}
  function mkFish(sp,isHuman,i){return{i,sp,human:!!isHuman,pid:isHuman||null,in:{mv:ZERO3,bt:null},x:rnd(150,WW-150),y:rnd(150,700),z:isHuman?0:rz(),hx:1,hz:0,air:false,airT:0,reentryT:0,minY:0,jumps:0,best:0,vx:0,vy:0,vz:0,mass:100,displayMass:100,alive:true,respawn:0,spectateTarget:-1,spectateT:0,surv:0,esc:0,catches:0,kills:0,fishEaten:0,markT:0,abilT:0,abilCD:0,surge:0,surgeMul:1,prot:0,shockT:0,camoT:0,whirlT:0,inflateBlend:0,dodgeT:0,flickT:0,flickX:0,flickZ:0,lungeT:0,lungeActive:false,lungeHit:false,lungeTarget:null,slowT:0,stingT:0,dazzledT:0,frenzyChain:0,hooked:null,agi:rnd(.6,1),wx:0,wy:0,wz:0,wt:0,abilReq:false,peak:100}}
  function buildNpcGrid(){
    for(const bucket of npcGrid.values()){bucket.length=0;npcBucketPool.push(bucket)}
    npcGrid.clear();
    for(const o of npcs){
      if(o.alive===false)continue;
      const key=gk(o.x,o.y,o.z);let bucket=npcGrid.get(key);
      if(!bucket){bucket=npcBucketPool.pop()||[];npcGrid.set(key,bucket)}
      bucket.push(o);
    }
  }
  // Offset lists preserve the original x/y/z neighbour traversal order,
  // removing three nested loops and repeated key arithmetic per proximity query.
  const npcOffsets1=[],npcOffsets2=[];
  for(const [reach,out] of [[1,npcOffsets1],[2,npcOffsets2]])
    for(let a=-reach;a<=reach;a++)for(let b=-reach;b<=reach;b++)for(let c=-reach;c<=reach;c++)
      out.push(a*100000+b*1000+c);
  function nearEach(o,fn,reach=1){
    const key=gk(o.x,o.y,o.z),offsets=reach===1?npcOffsets1:reach===2?npcOffsets2:null;
    if(offsets){for(let j=0;j<offsets.length;j++){
      const bucket=npcGrid.get(key+offsets[j]);if(bucket)for(let i=0;i<bucket.length;i++)fn(bucket[i]);
    }}else{const cx=Math.floor(o.x/CELL)+1,cy=Math.floor(o.y/CELL)+1,cz=Math.floor(o.z/CELL)+8;
      for(let a=-reach;a<=reach;a++)for(let b=-reach;b<=reach;b++)for(let c=-reach;c<=reach;c++){
        const bucket=npcGrid.get((cx+a)*100000+(cy+b)*1000+(cz+c));
        if(bucket)for(let i=0;i<bucket.length;i++)fn(bucket[i]);
      }
    }
  }
  // Spatial indexing for the 400-player roster. Player positions are indexed
  // twice per tick, before fish updates and before ambient-fish collision queries.
  // 8-player offline mode uses its original scan order for strict replay parity.
  const playerGrid=new Map(),playerBucketPool=[];
  function buildPlayerGrid(){
    for(const bucket of playerGrid.values()){bucket.length=0;playerBucketPool.push(bucket)}
    playerGrid.clear();
    if(fishes.length<=16)return;
    for(const f of fishes){if(!f.alive)continue;
      const key=gk(f.x,f.y,f.z);let bucket=playerGrid.get(key);
      if(!bucket){bucket=playerBucketPool.pop()||[];playerGrid.set(key,bucket)}bucket.push(f);
    }
  }
  // Share fixed spatial offsets and allocation-free bucket traversal between
  // all 200 competitors. Preserve index order for deterministic eat resolution.
  const playerOffsets3=[];
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++)for(let c=-3;c<=3;c++)playerOffsets3.push(a*100000+b*1000+c);
  const nearPlayerScratch=[];
  function nearPlayers(o,fn,reach=2){
    if(fishes.length<=16){for(const f of fishes)fn(f);return}
    const key=gk(o.x,o.y,o.z),offsets=reach===1?npcOffsets1:reach===2?npcOffsets2:playerOffsets3;
    const found=nearPlayerScratch;found.length=0;
    for(let i=0;i<offsets.length;i++){
      const bucket=playerGrid.get(key+offsets[i]);if(bucket)for(let j=0;j<bucket.length;j++)found.push(bucket[j]);
    }
    found.sort((a,b)=>a.i-b.i);
    // Copying is unnecessary because callbacks never recursively call nearPlayers
    // in the core bite/AI decision paths; verified by regression suite.
    for(let i=0,n=found.length;i<n;i++)fn(found[i]);
  }
  function addFishPlayer(slot){
    if(!slot||typeof slot.pid!=='string'||fishes.some(f=>f.pid===slot.pid))return null;
    const species=Object.prototype.hasOwnProperty.call(SP,slot.sp)?slot.sp:'guppy';
    // Reclaim an idle AI/backfill slot before allocating. This keeps the fish
    // roster at 400 maximum while permitting 400 real fish players to join.
    const idle=fishes.find(f=>!f.pid&&!f.human&&!f.hooked);
    if(!idle&&(fishes.length>=400||fishes.length+npcs.filter(o=>!o.mini).length>=populationCap))return null;
    const index=idle?idle.i:fishes.length;
    const candidate=mkFish(species,slot.pid,index);
    candidate.name=String(slot.name||'Player').slice(0,18);candidate.prot=BALANCE.fishSpawnShield;
    if(idle){Object.assign(idle,candidate);buildPlayerGrid();return idle;}
    fishes.push(candidate);buildPlayerGrid();return candidate;
  }
  function addFisherPlayer(slot){
    if(!slot||typeof slot.pid!=='string'||fishers.some(f=>f.pid===slot.pid))return null;
    const fr=fishers.find(f=>!f.human);
    if(!fr)return null;
    fr.pid=slot.pid;fr.human=true;fr.name=String(slot.name||'Fisher').slice(0,18);
    fr.cast=null;fr.target=null;initializeCastAim(fr);return fr;
  }
  function disconnectPlayer(pid){
    const f=fishes.find(x=>x.pid===pid);if(f){f.human=false;f.pid=null;f.in={mv:ZERO3,bt:null};return true;}
    const fr=fishers.find(x=>x.pid===pid);if(fr){fr.human=false;fr.pid=null;fr.in={stick:{x:0,y:0},mode:'aim',rod:.44,roll:0,drag:.35,hook:0};return true}
    return false;
  }
  const eraseFood=p=>{p.alive=false;p.x=0;p.y=0;p.z=0};
  function makeFood(patch){
    const a=rnd(0,Math.PI*2),radius=Math.sqrt(rand())*135;
    return{x:clamp(patch.x+Math.cos(a)*radius,35,WW-35),
      y:rnd(14,27),z:clamp(patch.z+Math.sin(a)*radius,-ZH+35,ZH-35),patchId:patch.id,alive:true};
  }
  function spawnFoodPatch(nearStarter=false,starter=null){
    // Pick a fresh location, preferably away from surviving clusters.
    let x=WW*.5,z=0;
    if(nearStarter&&starter){
      const offset=rules.mode==='last'?95:155;
      x=clamp(starter.x+offset,180,WW-180);
      z=clamp(starter.z+(rules.mode==='last'?25:65),-ZH+175,ZH-175);
    }
    else for(let tries=0;tries<12;tries++){
      const tx=rnd(190,WW-190),tz=rnd(-ZH+180,ZH-180);
      x=tx;z=tz;
      if(foodPatches.every(p=>(p.x-tx)**2+(p.z-tz)**2>360*360))break;
    }
    const patch={id:++foodPatchSerial,x,z,born:t,expires:t+95};
    let count=0;
    for(const p of plank){if(p.alive)continue;
      Object.assign(p,makeFood(patch));count++;if(count>=40)break;
    }
    if(count){foodPatches.push(patch);return count}
    return 0;
  }
  function updateSurfaceFood(){
    if(state!=='play'||t<nextFoodPatchAt)return;
    // Expire depleted/very old patches. A depleted patch is NEVER refilled.
    const liveIds=new Set(plank.filter(p=>p.alive).map(p=>p.patchId));
    for(const patch of foodPatches)if(t>=patch.expires){
      for(const p of plank)if(p.alive&&p.patchId===patch.id)eraseFood(p);
      liveIds.delete(patch.id);
    }
    foodPatches=foodPatches.filter(p=>liveIds.has(p.id));
    let available=0;for(const p of plank)if(!p.alive)available++;
    // Keep new swarms appearing even if untouched, without growing the world.
    if(available<35&&foodPatches.length){
      const oldest=foodPatches.shift();
      for(const p of plank)if(p.alive&&p.patchId===oldest.id){eraseFood(p);available++}
    }
    if(available>=25)spawnFoodPatch();
    // More frequent fresh patches when competition consumes the surface food.
    let living=0;for(const p of plank)if(p.alive)living++;
    nextFoodPatchAt=t+(living<70?4+rnd(0,2):living<150?7+rnd(0,2):10+rnd(0,3));
  }
  function mkNpc(kind){const m=rand()<.1?rnd(250,700):Math.exp(rnd(Math.log(12),Math.log(240)));let x,y,z,k=0;
    do{x=rnd(40,WW-40);y=rnd(60,WH-40);z=rz();k++}while(k<8&&fishes.some(f=>f.alive&&Math.hypot(f.x-x,f.y-y,f.z-z)<220));
    return{x,y,z,vx:0,vy:0,vz:0,mass:m,displayMass:m,hooked:null,wx:0,wy:0,wz:0,wt:0,ang:rnd(0,6.28),hue:rnd(170,230),kind:kind||SPECIES_KEYS[Math.floor(rand()*SPECIES_KEYS.length)]}}
  // An autonomous, cohesive shoal of tiny edible sardines. Its fixed roster
  // never competes for victory; all movement derives from the seeded sim clock.
  function chooseSchoolWaypoint(){
    if(!miniSchool)return;
    miniSchool.tx=rnd(240,WW-240);miniSchool.ty=rnd(170,Math.min(WH-140,590));
    miniSchool.tz=rnd(-ZH+190,ZH-190);miniSchool.roamT=rnd(6,13);
  }
  function makeMiniFish(i){
    const p=mkNpc('sardine'),a=i*2.399963229728653;
    const r=22+Math.sqrt(i/30)*70;
    p.x=clamp(miniSchool.x+Math.cos(a)*r,20,WW-20);
    p.y=clamp(miniSchool.y+Math.sin(a*1.6)*28,35,WH-35);
    p.z=clamp(miniSchool.z+Math.sin(a)*r*.75,-ZH+25,ZH-25);
    p.mass=16;p.displayMass=16;p.kind='sardine';p.mini=true;
    p.alive=true;p.respawn=0;p.grace=.7;p.vx=p.vy=p.vz=0;
    p.ang=a;return p;
  }
  function consumeMini(p){
    p.alive=false;p.respawn=1;p.vx=p.vy=p.vz=0;
    // Births are scheduled by the school, never by individual fish timers.
    // The fewer minnows left, the shorter the next reproductive interval.
    if(miniSchool)miniSchool.birthT=Math.min(miniSchool.birthT||Infinity,0.65+0.13*npcs.filter(o=>o.mini&&o.alive).length);
  }
  function updateMiniSchool(dt){
    if(!miniSchool||!npcs.some(p=>p.mini))return;
    const c=miniSchool;
    c.roamT-=dt;
    const tx=c.tx-c.x,ty=c.ty-c.y,tz=c.tz-c.z,d=Math.hypot(tx,ty,tz)||1;
    if(d<100||c.roamT<=0)chooseSchoolWaypoint();
    // One collective escape direction: scattered reactions per minnow cause
    // the school to fragment in crowded competitive aquariums.
    let fleeX=0,fleeY=0,fleeZ=0;
    nearPlayers(c,f=>{if(!f.alive)return;
      const ax=c.x-f.x,ay=c.y-f.y,az=c.z-f.z,dd=ax*ax+ay*ay+az*az;
      if(dd<270*270&&dd>1){const w=(270-Math.sqrt(dd))*.5;
        fleeX+=ax/Math.sqrt(dd)*w;fleeY+=ay/Math.sqrt(dd)*w;fleeZ+=az/Math.sqrt(dd)*w}
    },2);
    const leadX=tx/d*80+fleeX,leadY=ty/d*80+fleeY,leadZ=tz/d*80+fleeZ;
    const leadNorm=Math.hypot(leadX,leadY,leadZ)||1;
    const speed=Math.min(95*dt,d+95);
    c.x=clamp(c.x+leadX/leadNorm*speed,175,WW-175);
    c.y=clamp(c.y+leadY/leadNorm*speed,120,WH-95);
    c.z=clamp(c.z+leadZ/leadNorm*speed,-ZH+145,ZH-145);
    // One birth at a time, governed by total survivors rather than 30
    // independent respawn clocks. Low populations recover rapidly; a nearly
    // full school regrows slowly. The existing 30 slots are the hard cap.
    let living=0,empty=null;
    for(const o of npcs)if(o.mini){if(o.alive)living++;else if(!empty)empty=o}
    if(empty){
      const delay=.65+.13*living;
      c.birthT=Math.min(c.birthT||delay,delay)-dt;
      if(c.birthT<=0){
        const id=empty.id,replacement=makeMiniFish(id);
        Object.assign(empty,replacement,{id,grace:1.25,respawn:0});
        living++;c.birthT=.65+.13*living;
      }
    }else c.birthT=0;
    for(const o of npcs){if(!o.mini||!o.alive)continue;
      if(o.hooked||fishers.some(fr=>fr.cast?.state==='bite'&&fr.cast.fish[0]===o))continue;
      o.grace=Math.max(0,(o.grace||0)-dt);
      const a=o.id*2.399963229728653,radial=24+Math.sqrt(o.id/30)*66;
      const targetX=c.x+Math.cos(a+t*.52)*radial,
            targetY=c.y+Math.sin(a*1.6+t*.38)*27,
            targetZ=c.z+Math.sin(a+t*.52)*radial*.78;
      let dx=targetX-o.x,dy=targetY-o.y,dz=targetZ-o.z;
      // Stay cohesive; the school leader handles predator evasion for all 30.
      // Individual small oscillations give a natural, flickering shoal. 
      const len=Math.hypot(dx,dy,dz)||1,m=Math.min(235,len*5.5),k=Math.min(1,dt*9);
      o.vx+=(dx/len*m-o.vx)*k;o.vy+=(dy/len*m-o.vy)*k;o.vz+=(dz/len*m-o.vz)*k;
      const old={x:o.x,y:o.y,z:o.z};
      o.x=clamp(o.x+o.vx*dt,20,WW-20);
      o.y=clamp(o.y+o.vy*dt,35,WH-35);
      o.z=clamp(o.z+o.vz*dt,-ZH+20,ZH-20);
      // Tiny schooling fish follow their common path through the ship's
      // swim-through passages; collisions with competing fish remain physical.
    }
  }
  function spawnSplash(x,z,pw){splashes.push({x,z,t:0,pw});const n=Math.round(6+10*pw);
    for(let i=0;i<n;i++)drops.push({x,y:0,z,vx:rnd(-110,110),vy:-rnd(120,300)*pw,vz:rnd(-110,110),life:1.2});
    if(drops.length>150)drops.splice(0,drops.length-150)}
  function inKelp(f){for(const k of kelp){const a=(f.x-k.x)/k.rx,b=(f.y-k.y)/k.ry,c=(f.z-k.z)/k.rzz;if(a*a+b*b+c*c<1)return true}return false}
  function bodySurfaceRadius(f,dx,dy,dz,distance){
    const d=COLLISION_DIMS[f.sp||f.kind]||[1,1,.75];
    const blend=f.sp==='puffer'?clamp(f.inflateBlend||0,0,1):0;
    const s=rad(f.mass)*(1+(ABILITY.pufferRadius-1)*blend);
    const hs=Math.hypot(f.hx||0,f.hz||0)||1;
    const fx=f.sp?(f.hx??1)/hs:Math.cos(f.ang||0),fz=f.sp?(f.hz??0)/hs:-Math.sin(f.ang||0);
    const lx=(dx*fx+dz*fz)/distance,ly=dy/distance,lz=(dz*fx-dx*fz)/distance;
    const inflation=1+.13*blend;
    const a=d[0]*s*(1-.03*blend),b=d[1]*s*inflation,c=d[2]*s*inflation;
    return 1/Math.sqrt(lx*lx/(a*a)+ly*ly/(b*b)+lz*lz/(c*c));
  }
  function bodyContact(a,b){
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d2=dx*dx+dy*dy+dz*dz;
    // A generous broad-phase bounding sphere still avoids most trig/sqrt work.
    const A=COLLISION_DIMS[a.sp||a.kind]||[1,1,.75];
    const B=COLLISION_DIMS[b.sp||b.kind]||[1,1,.75];
    const ab=a.sp==='puffer'?clamp(a.inflateBlend||0,0,1):0,bb=b.sp==='puffer'?clamp(b.inflateBlend||0,0,1):0;
    const ra=rad(a.mass)*(1+(ABILITY.pufferRadius-1)*ab)*Math.max(A[0],A[1],A[2])*(1+.13*ab);
    const rb=rad(b.mass)*(1+(ABILITY.pufferRadius-1)*bb)*Math.max(B[0],B[1],B[2])*(1+.13*bb);
    if(d2>(ra+rb)*(ra+rb))return false;
    if(d2<.000001)return true;
    const d=Math.sqrt(d2);
    // 0.97 contact tolerance: no visible distance-eating from narrow misses.
    return d<=.97*(bodySurfaceRadius(a,dx,dy,dz,d)+bodySurfaceRadius(b,-dx,-dy,-dz,d));
  }
  function biteMetrics(f,o){
    const r=hitRadius(f),dx=o.x-f.x,dy=o.y-f.y,dz=o.z-f.z;
    const speed=Math.hypot(f.vx,f.vy,f.vz),v=speed>12?{x:f.vx/speed,y:f.vy/speed,z:f.vz/speed}:{x:f.hx,y:0,z:f.hz};
    const forward=dx*v.x+dy*v.y+dz*v.z,distance=Math.hypot(dx,dy,dz),side2=Math.max(0,distance*distance-forward*forward);
    const reach=r*6.9+rad(o.mass)*.75,width=r*3.45+rad(o.mass)*.6;
    return {distance,forward,reach,score:Math.pow(Math.max(0,forward)/reach,2)+side2/(width*width),contact:bodyContact(f,o)};
  }
  function biteEligible(f,o){return o!==f&&o.alive!==false&&f.alive!==false&&Number.isFinite(f.mass)&&Number.isFinite(o.mass)&&combatMass(f)>combatMass(o)&&!predationProtected(o)}
  function canBite(f,o){
    // Even lunge/torpedo abilities must touch the target. No remote capture.
    return o.alive!==false&&f.alive!==false&&(bodyContact(f,o)||dist(f,o)<=(rad(f.mass)+rad(o.mass))*1.10)&&!shipBlocked(f,o);
  }
  function useAbility(f){
    if(f.abilCD>0||f.hooked||!f.alive||f.air)return false;
    const spec=SP[f.sp];f.abilT=spec.dur;f.abilCD=spec.cd;
    switch(f.sp){
      case 'guppy':{
        f.dodgeT=.28;f.prot=Math.max(f.prot,.26);
        let threat=null,nearest=260;
        for(const group of [fishes,npcs])for(const o of group){
          if(o===f||o.alive===false||combatMass(o)<=combatMass(f))continue;
          const d=dist(o,f);if(d<nearest){nearest=d;threat=o}
        }
        const ax=threat?f.x-threat.x:(f.hx||1),az=threat?f.z-threat.z:(f.hz||0),h=Math.hypot(ax,az)||1;
        const lat=threat?(threat.vx||0)*az-(threat.vz||0)*ax:0;
        const approach=threat?(threat.vx||0)*ax+(threat.vz||0)*az:0;
        const side=(lat>=0?1:-1)*(approach>=0?1:-1);
        f.flickT=ABILITY.flickerTime;
        f.flickX=(-az/h*side*ABILITY.flickerSpeed)||0;
        f.flickZ=(ax/h*side*ABILITY.flickerSpeed)||0;
        break} 
      case 'sardine':{
        const mates=[];
        for(const o of fishes)if(o.alive&&o.sp==='sardine'&&dist(o,f)<ABILITY.schoolRadius)mates.push(o);
        for(const o of npcs)if(o.alive!==false&&o.kind==='sardine'&&dist(o,f)<ABILITY.schoolRadius)mates.push(o);
        const n=Math.min(4,Math.max(1,mates.length));
        const boost=ABILITY.schoolBoostMin+(ABILITY.schoolBoostMax-ABILITY.schoolBoostMin)*(n-1)/3;
        for(const o of mates){
          o.surgeMul=o.surge>0?Math.max(o.surgeMul||1,boost):boost;
          o.surge=Math.max(o.surge||0,spec.dur);
        }
        break} 
      case 'puffer':
        // Threefold VOLUME grants temporary combat mass, never permanent biomass.
        f.inflateBlend=Math.max(f.inflateBlend||0,.08);break;
      case 'barra':{
        f.lungeT=spec.dur;f.lungeActive=true;f.lungeHit=false;f.lungeTarget=null;
        const hs=Math.hypot(f.hx||1,f.hz||0)||1,fx=(f.hx||1)/hs,fz=(f.hz||0)/hs;
        let closest=ABILITY.lungeRange;
        const scan=o=>{
          if(!biteEligible(f,o)||shipBlocked(f,o))return;
          const dx=o.x-f.x,dy=o.y-f.y,dz=o.z-f.z,d=Math.hypot(dx,dy,dz)||1;
          if(d<closest&&(dx*fx+dz*fz)/d>ABILITY.lungeCone){closest=d;f.lungeTarget=o}
        };
        for(const o of fishes)scan(o);
        for(const o of npcs)scan(o);
        f.lungeHX=fx;f.lungeHZ=fz;break} 
      case 'piranha':
        f.frenzyChain=0;break;
      case 'goldfish':
        f.prot=Math.max(f.prot,.32);
        for(const other of fishes)if(other!==f&&other.alive&&dist(other,f)<ABILITY.glimmerRadius)
          other.dazzledT=Math.max(other.dazzledT||0,.68);
        for(const other of npcs)if(dist(other,f)<ABILITY.glimmerRadius)
          other.dazzledT=Math.max(other.dazzledT||0,.68);
        break;
      case 'koi':
        if(f.y<=ABILITY.leapMaxY){
          f.air=true;f.airT=0;f.reentryT=0;f.minY=f.y;
          f.vx*=1.15;f.vz*=1.15;
          f.vy=-Math.sqrt(2*GRAV*(Math.max(0,f.y)+ABILITY.leapPeak));
          spawnSplash(f.x,f.z,.8);
        }else if(inKelp(f))f.prot=Math.max(f.prot,.55);
        break;
      case 'clown':
        f.prot=Math.max(f.prot,spec.dur);
        for(const other of fishes)if(other!==f&&other.alive&&other.sp==='clown'&&dist(other,f)<ABILITY.clownRadius)
          other.prot=Math.max(other.prot,.5);
        break;
      case 'eel':{
        const R=ABILITY.shockRadius,fall=d=>d<R*.5?1:1.5-d/R;
        for(const other of fishes)if(other!==f&&other.alive&&!predationProtected(other)){
          const d=dist(other,f);if(d>=R)continue;
          other.shockT=Math.max(other.shockT||0,ABILITY.eelStun*fall(d));
          other.camoT=0;
          if(other.abilT>0){other.abilT=Math.min(other.abilT,.1);other.lungeT=0;other.lungeActive=false;other.flickT=0}
        }
        for(const other of npcs){const d=dist(other,f);if(other.alive!==false&&d<R)
          other.shockT=Math.max(other.shockT||0,ABILITY.eelStun*fall(d))}
        for(const fr of fishers)if(Math.hypot(fr.x-f.x,fr.z-f.z)<ABILITY.shockRadius){
          fr.shockT=Math.max(fr.shockT||0,ABILITY.eelFisherInterrupt); // Brief reel interruption, never auto-cancel a cast.
        }
        break}
      case 'tuna':
        f.torpedoHX=f.hx||1;f.torpedoHZ=f.hz||0;f.torpedoY=Math.sign(f.vy||0)*.1;break;
      case 'angel':
        f.whirlT=spec.dur;break;
      case 'seahorse':
        f.camoT=spec.dur;break;
      case 'sunfish':
        f.glideHX=f.hx||1;f.glideHZ=f.hz||0;break;
    }
    if(f.human)addFeed(spec.abil+(f.sp==='puffer'?' · effective mass ×3':''),'good',f.pid);
    return true;
  }
  function abilityOnEat(f){
    if(f.sp==='piranha'&&activeAbility(f)){
      f.frenzyChain=(f.frenzyChain||0)+1;
      f.abilT=Math.min(ABILITY.frenzyCap,f.abilT+.25);
    }
    if(f.sp==='barra'&&f.lungeActive&&f.lungeT>0){
      f.lungeHit=true;
      f.abilCD=Math.max(0,f.abilCD-SP.barra.cd*ABILITY.lungeRefund);
    }
  }
  function inflateRadiusFactor(f){
    return 1+(ABILITY.pufferRadius-1)*clamp(f.inflateBlend||0,0,1);
  }
  function influenceWhirl(f,dt){
    if(f.sp!=='angel'||!activeAbility(f))return;
    for(const group of [npcs,fishes])for(const o of group){
      if(o===f||(o.sp&&!o.alive)||o.air||dist(f,o)>ABILITY.whirlRadius||
         combatMass(o)>=combatMass(f)||predationProtected(o)||shipBlocked(f,o))continue;
      const dx=f.x-o.x,dy=f.y-o.y,dz=f.z-o.z,d=Math.hypot(dx,dy,dz)||1;
      const progress=1-clamp(f.abilT/SP.angel.dur,0,1);
      const pull=ABILITY.whirlPullMax*(.65+.35*progress)*(1-d/ABILITY.whirlRadius)*dt;
      const horizontal=Math.hypot(dx,dz)||1,tx=-dz/horizontal*ABILITY.whirlSwirl,tz=dx/horizontal*ABILITY.whirlSwirl;
      o.vx=(o.vx||0)+pull*(dx/d+tx);
      o.vy=(o.vy||0)+pull*dy/d;
      o.vz=(o.vz||0)+pull*(dz/d+tz);
    }
  }
  function plankMagnet(f,dt){
    if(f.sp!=='sunfish'||!activeAbility(f)||f.y>=110+hitRadius(f))return;
    const R=ABILITY.magnetRadius,R2=R*R;
    for(const p of plank){if(!p.alive)continue;
      const dx=f.x-p.x,dz=f.z-p.z,dy=f.y-p.y,d2=dx*dx+dy*dy+dz*dz;
      if(d2>R2||d2<1||shipBlocked(f,p))continue;
      const d=Math.sqrt(d2),horizontal=Math.hypot(dx,dz)||1;
      const move=Math.min(horizontal,ABILITY.magnetPull*(1.25-d/R)*dt);
      p.x+=dx/horizontal*move;p.z+=dz/horizontal*move;
    }
  }
  function botThink(f){
    if((f.dazzledT||0)>0){f.wx=rnd(-1,1);f.wy=rnd(-.4,.4);f.wz=rnd(-1,1);f.abilReq=false;return}
    for(const fr of fishers){
      const bait=fr.cast;
      if(!(bait&&bait.state==='bait'&&f.alive&&!f.hooked&&f.prot<=0))continue;
      const dx=bait.x-f.x,dy=bait.y-f.y,dz=bait.z-f.z,d=Math.hypot(dx,dy,dz);
      // The lure must be encountered. Fish no longer detect it through the entire arena.
      // Different species assess the moving bait before abandoning food/predator avoidance.
      const interested=true; // Every competitor species can investigate and eat fish-shaped bait.
      const baitSpeed=bait.trolling?Math.hypot(fr.vx,fr.vz):(bait.drift||0);
      const compatible=baitSpeed<105||['tuna','barra'].includes(f.sp);
      if(interested&&compatible&&d<255&&d>22&&!shipBlocked(f,bait)){
        f.lureInterest=(f.lureInterest||0)+.25;
        if(f.lureInterest>1.0){f.wx=dx;f.wy=dy;f.wz=dz;return;}
      }else f.lureInterest=Math.max(0,(f.lureInterest||0)-.5);
    }
    let fx=0,fy=0,fz=0,danger=0;
    const away=(o,range,wgt)=>{const d=dist(f,o)+1;if(d<range){const w=(range-d)/range*wgt;fx+=(f.x-o.x)/d*w;fy+=(f.y-o.y)/d*w;fz+=(f.z-o.z)/d*w;danger=Math.max(danger,w)}};
    nearPlayers(f,o=>{if(o===f||!o.alive)return;if(combatMass(f)<combatMass(o)*margin(o))away(o,240,1)},2);
    for(const o of npcs)if(o.alive!==false&&combatMass(f)<combatMass(o))away(o,200,1);
    if(danger>.15){f.wx=fx;f.wy=fy;f.wz=fz;if(danger>.5)f.abilReq=true;return}
    let best=null,bs=0;const consider=o=>{const d=dist(f,o)+10;if((o.camoT||0)>0&&d>38)return;if(d<380&&shipBlocked(f,o))return;if(d>380)return;const s=o.mass/d;if(s>bs){bs=s;best=o}};
    for(const o of npcs)if(o.alive!==false&&combatMass(o)<combatMass(f))consider(o);
    nearPlayers(f,o=>{if(o!==f&&o.alive&&!predationProtected(o)&&combatMass(o)<combatMass(f))consider(o)},3);
    if(best){f.wx=best.x-f.x;f.wy=best.y-f.y;f.wz=best.z-f.z;if((['barra','piranha','tuna','angel','puffer'].includes(f.sp)&&dist(f,best)<(f.sp==='puffer'?105:175)))f.abilReq=true;return}
    // 200 AI competitors must intentionally seek food at the water surface
    // before they are large enough to eat each other.
    let bp=null,bd=Infinity;
    for(const p of plank){if(!p.alive)continue;const x=p.x-f.x,y=p.y-f.y,z=p.z-f.z,d=x*x+y*y+z*z;
      if(d<bd){bd=d;bp=p}}
    if(bp){f.wx=bp.x-f.x;f.wy=bp.y-f.y;f.wz=bp.z-f.z;return}
    f.wx=rnd(-1,1);f.wy=rnd(-.4,.4);f.wz=rnd(-1,1);
  }
  function kill(f,why,predator=null){if(f.hooked){const c=f.hooked.fr.cast;if(c)c.fish=c.fish.filter(x=>x!==f);f.hooked=null}
    // A victim observes its actual eater; -1 is an indefinite spectator
    // duration used only in Last Fish Standing, ending with the match.
    // Free Roam keeps its existing six-second respawn/replay behavior.
    const eaten=why==='eaten'&&predator&&predator.sp&&predator!==f;
    f.spectateTarget=eaten?predator.i:-1;
    f.spectateT=eaten?(rules.mode==='last'?-1:6):0;
    f.alive=false;f.respawn=rules.mode==='last'?0:eaten?6:3.5;f.lungeActive=false;f.lungeTarget=null;f.flickT=0;f.vx=f.vy=f.vz=0;if(f.mass>f.peak)f.peak=f.mass}
  function spawnFish(f){f.air=false;f.airT=0;f.reentryT=0;f.alive=true;f.spectateTarget=-1;f.spectateT=0;f.mass=100;f.displayMass=100;f.x=rnd(150,WW-150);f.y=rnd(150,700);f.z=rz();f.vx=f.vy=f.vz=0;f.prot=BALANCE.fishSpawnShield;f.abilCD=0;f.abilT=0;f.shockT=0;f.camoT=0;f.whirlT=0;f.dodgeT=0;f.inflateBlend=0;f.flickT=0;f.flickX=0;f.flickZ=0;f.lungeT=0;f.lungeActive=false;f.lungeHit=false;f.lungeTarget=null;f.surge=0;f.surgeMul=1;f.slowT=0;f.stingT=0;f.dazzledT=0;f.frenzyChain=0;f.abilReq=false;f.hooked=null}
  function margin(f){return 1} // Strict size-only contact rule: any positive mass advantage wins.
  function gainMul(f){
    const species=f.sp||f.kind;
    return SP[species].gain*(species==='piranha'&&activeAbility(f)?BALANCE.piranhaConversion:1);
  }
  function absorbFish(predator,prey,preyType){
    const conversion=preyType==='rival'?GROWTH.rivalPrey:GROWTH.ambientPrey;
    return absorbPrey(predator,prey.mass,conversion*gainMul(predator));
  }
  function absorbPlankton(fish){
    // Faster, readable early growth in one-life matches: two pellets can
    // cross the 10% size advantage required to consume an equal starter.
    // Free Roam keeps its original feeding economy.
    const nutrition=rules.mode==='last'?6:GROWTH.plankton;
    const deltaR=absorbPrey(fish,nutrition,1);
    if(fish.human&&t>=(fish.nextFoodNotice??-1)){
      addFeed('Surface food +'+nutrition+' · Mass '+Math.round(fish.mass),'good',fish.pid);
      fish.nextFoodNotice=t+.85;
    }
    return deltaR;
  }
  function immune(f){return f.air||f.prot>0||(f.sp==='puffer'&&f.abilT>0)}
  function catchValue(f){let v=CFG.catchK*Math.pow(f.mass,CFG.catchExp)*SP[f.sp||f.kind].mult;if(f.markT>0)v*=CFG.markMult;if(phase()>=2&&f.mass>=650)v*=CFG.bountyMult;return v}
  function startCast(fr,f){
    const netOK=t/L*300>=40,near=fishes.filter(o=>o.alive&&dist(o,f)<110).length;
    const tool='hook'; // Rival fisher uses the same single-fish line solver as the player.
    const tx=clamp(f.x+f.vx*.55+rnd(-25,25),20,WW-20),ty=clamp(f.y+f.vy*.55+rnd(-25,25),30,WH-10),tz=clamp(f.z+f.vz*.55+rnd(-25,25),-ZH+10,ZH-10);
    fr.cast={state:'down',x:fr.x,y:0,z:fr.z,tx,ty,tz,tool,fish:[],lureSp:LURE_KEYS[Math.floor(rand()*LURE_KEYS.length)],lureMass:LURE_MASS};
  }
  function fisherStep(fr,i,dt,ph){
    fr.shockT=Math.max(0,(fr.shockT||0)-dt);
    if(fr.human){playerFisherStep(fr,dt);return;}
    fr.pingT-=dt;
    // Sonar is a private 2D fish-finder display. Never ping/reveal or mark fish in the 3D world.
    if(fr.pingT<=0)fr.pingT=4;
    const c=fr.cast;
    if(!c){
      fr.cd-=dt;
      if(ph===0){fr.x+=Math.sin(t+i)*20*dt;return}
      const other=fishers[1-i];let best=null,bu=0;
      for(const f of fishes){if(!f.alive||f.hooked||immune(f))continue;
        if(inWreck(f)||(f.camoT||0)>0)continue;
        const covered=inKelp(f),vis=covered?.2:1;if(vis<.3)continue;
        let u=f.mass*vis/(Math.hypot(f.x-fr.x,f.y,f.z-fr.z)+60)*rnd(.85,1.15);if(other?.target===f)u*=.6;if(u>bu){bu=u;best=f}}
      fr.target=best;
      if(best){const dx=best.x-fr.x,dz=best.z-fr.z,d=Math.hypot(dx,dz)||1,s=Math.min(d,130*dt);fr.x+=dx/d*s;fr.z+=dz/d*s;if(fr.cd<=0&&d<60)startCast(fr,best)}
      fr.x=clamp(fr.x,40,WW-40);fr.z=clamp(fr.z,-ZH+20,ZH-20);return;
    }
    if(c.state==='fight'){updatePhysicalFight(fr,dt);return;}
    if(c.state==='down'){const dx=c.tx-c.x,dy=c.ty-c.y,dz=c.tz-c.z,d=Math.hypot(dx,dy,dz),s=FISHER_CFG.aiCastSpeed*dt;
      if(d<=s){c.x=c.tx;c.y=c.ty;c.z=c.tz;c.state='bait';c.time=0;c.holdT=rnd(FISHER_CFG.aiHoldMin,FISHER_CFG.aiHoldMax)}else{c.x+=dx/d*s;c.y+=dy/d*s;c.z+=dz/d*s}}
    else if(c.state==='bait')aiBaitStep(fr,c,dt);
    else if(c.state==='bite')updateBite(fr,c,dt);
    else if(c.state==='reel'){
      for(const f of c.fish.slice()){const h=f.hooked;if(!h)continue;
        h.reel+=(c.tool==='net'?.3:.24)/Math.pow(f.mass/300,.25)*dt;
        if(f.human&&state==='play')h.esc=Math.max(0,h.esc-.09*dt);else h.esc+=f.agi*.2*dt;
        f.x+=(fr.x-f.x)*dt*h.reel*2.2;f.z+=(fr.z-f.z)*dt*h.reel*2.2;f.y+=(10-f.y)*dt*h.reel*.8;c.x=f.x;c.y=f.y;c.z=f.z;
        if(h.esc>=1){c.fish=c.fish.filter(x=>x!==f);f.hooked=null;f.esc++;f.prot=1.5;f.abilT=.6;f.abilCD=2;f.vy=60;
          if(c.tool==='hook')fr.breaks++;feedAbout(f,' escaped'+(c.tool==='hook'?' (line break)':''),'good','');}
        else if(h.reel>=1){const v=catchValue(f);fr.score+=v;fr.caught++;if(fr.caught%3===0)fr.score+=50;f.catches++;c.fish=c.fish.filter(x=>x!==f);
          feedAbout(f,' caught +'+Math.round(v),'bad','good');kill(f,'caught')}}
      if(!c.fish.length)c.state='up';
    }else{const dx=fr.x-c.x,dy=-c.y,dz=fr.z-c.z,d=Math.hypot(dx,dy,dz),s=600*dt;
      if(d<=s){fr.cast=null;fr.cd=c.tool==='net'?3:2.2}else{c.x+=dx/d*s;c.y+=dy/d*s;c.z+=dz/d*s}}
  }
  // Arcade contact is intentionally a little wider than the narrow species
  // ellipsoids, so visible bodies and tails cannot clip through one another.
  // A swept closest-approach test also catches fast fish that cross paths
  // between two simulation ticks. This applies equally to human players,
  // autonomous competitors, ordinary NPC fish, and tiny schooling minnows.
  function fishPairContact(a,b,previous){
    const pa=previous.get(a)||a,pb=previous.get(b)||b;
    const reach=(rad(a.mass)+rad(b.mass))*1.10;
    const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z;
    const d2=x*x+y*y+z*z;
    if(d2<=reach*reach||bodyContact(a,b))return !shipBlocked(a,b);
    const sx=pb.x-pa.x,sy=pb.y-pa.y,sz=pb.z-pa.z;
    // Schooling minnows may swim apart during this tick: a contact at the
    // *start* of the tick is still real even if the end positions separate.
    if(sx*sx+sy*sy+sz*sz<=reach*reach&&!shipBlocked(pa,pb))return true;
    const vx=x-sx,vy=y-sy,vz=z-sz;
    const v2=vx*vx+vy*vy+vz*vz;
    if(v2<1e-8)return false;
    const u=clamp(-(sx*vx+sy*vy+sz*vz)/v2,0,1);
    if(u<=0||u>=1)return false;
    const dx=sx+vx*u,dy=sy+vy*u,dz=sz+vz*u;
    if(dx*dx+dy*dy+dz*dz>reach*reach)return false;
    const hitA={x:pa.x+(a.x-pa.x)*u,y:pa.y+(a.y-pa.y)*u,z:pa.z+(a.z-pa.z)*u};
    const hitB={x:pb.x+(b.x-pb.x)*u,y:pb.y+(b.y-pb.y)*u,z:pb.z+(b.z-pb.z)*u};
    return !shipBlocked(hitA,hitB);
  }
  function resolveUniversalPredation(previous){
    const live=[];
    for(const f of fishes)if(f.alive)live.push(f);
    for(const f of npcs)if(f.alive!==false)live.push(f);
    // One symmetric, post-movement contact pass. Higher *effective combat mass*
    // wins; equal effective masses do nothing. Protection on the intended prey
    // overrides any size advantage. Neither direction nor input order matters.
    const hits=[];
    // Cache conservative bounds and displacement once per fish. Most of the
    // 200-fish fleet is far apart, so the inexpensive axis checks eliminate
    // almost every pair before any trigonometry, collision mesh or ship query.
    const bounds=live.map(f=>{
      const dims=COLLISION_DIMS[f.sp||f.kind]||[1,1,.75];
      const old=previous.get(f)||f;
      const travel=Math.hypot(f.x-old.x,f.y-old.y,f.z-old.z);
      const inflation=puffing(f)?ABILITY.pufferRadius:1;
      return rad(f.mass)*Math.max(1,dims[0],dims[1],dims[2])*inflation*1.18+travel;
    });
    for(let i=0;i<live.length;i++){
      const a=live[i],ra=bounds[i];
      for(let j=i+1;j<live.length;j++){
        const b=live[j];
        const am=combatMass(a),bm=combatMass(b);
        if(am===bm)continue;
        const predator=am>bm?a:b,prey=am>bm?b:a;
        const guarded=predationProtected(prey);
        // Only clownfish's active contact shield has a retaliatory effect.
        if(guarded&&!(prey.sp==='clown'&&activeAbility(prey)&&prey.prot>0))continue;
        const reach=ra+bounds[j];
        if(Math.abs(a.x-b.x)>reach||Math.abs(a.y-b.y)>reach||Math.abs(a.z-b.z)>reach)continue;
        if(!fishPairContact(a,b,previous))continue;
        if(guarded){
          if(predator.sp&&(predator.stingT||0)<=0){
            predator.slowT=Math.max(predator.slowT||0,ABILITY.stingSlow);
            predator.stingT=ABILITY.stingGrace;
          }
          continue;
        }
        hits.push({predator,prey,mass:Math.max(am,bm),order:i*live.length+j});
      }
    }
    hits.sort((a,b)=>b.mass-a.mass||a.order-b.order);
    const consumed=new Set();
    for(const {predator,prey} of hits){
      if(consumed.has(predator)||consumed.has(prey)||predator.alive===false||prey.alive===false)continue;
      // Re-check current, authoritative state after earlier captures. Active
      // abilities may change the size comparison; expiry removes the bonus.
      if(!(combatMass(predator)>combatMass(prey))||predationProtected(prey))continue;
      const victimIsPlayer=!!prey.sp;
      eatEvent(predator,prey);
      absorbFish(predator,prey,victimIsPlayer?'rival':'ambient');
      if(prey.sp==='puffer'&&predator.sp)predator.slowT=Math.max(predator.slowT||0,ABILITY.toxinSlow);
      predator.fishEaten=(predator.fishEaten||0)+1;
      if(predator.sp){
        abilityOnEat(predator);
        if(victimIsPlayer){predator.markT=CFG.markT;predator.kills=(predator.kills||0)+1;}
      }
      if(victimIsPlayer){
        for(const f of [predator,prey])if(f.human){
          const attacker=predator.human?nmFor(predator,f):predator.sp?nmFor(predator,f):'A reef fish';
          const victim=nmFor(prey,f).toLowerCase();
          addFeed(attacker+' ate '+victim,f===prey?'bad':'good',f.pid);
        }
        kill(prey,'eaten',predator);
      }else if(prey.mini)consumeMini(prey);
      else{
        // Retain the fixed ambient roster and keep its respawn out of this tick.
        Object.assign(prey,mkNpc(prey.kind),{alive:true});
      }
      consumed.add(prey);
    }
  }
  function step(inputs,dt){
    // Invalid host clock deltas must never corrupt persistent room state.
    if(!Number.isFinite(dt)||dt<0)return;
    applyInputs(inputs&&typeof inputs==='object'?inputs:{});
    t+=dt;const ph=phase();
    updateSurfaceFood();
    // Ephemeral positions for continuous collision; never stored in snapshots.
    const previous=new Map();
    for(const f of fishes)if(f.alive)previous.set(f,{x:f.x,y:f.y,z:f.z});
    for(const f of npcs)if(f.alive!==false)previous.set(f,{x:f.x,y:f.y,z:f.z});
    revealT-=dt;
    // Refresh before predator contact queries; moving NPCs cannot disappear from
    // the spatial hash at cell boundaries. A second refresh after captures keeps
    // ambient AI neighbour queries correct following NPC respawns.
    buildNpcGrid();buildPlayerGrid();
    for(const f of fishes){
      if(!f.alive){if(f.spectateT>0)f.spectateT=Math.max(0,f.spectateT-dt);if(rules.mode!=='last'&&(rules.mode==='free'||ph<3)){f.respawn-=dt;if(f.respawn<=0)spawnFish(f)}continue}
      f.surv+=dt;f.abilT-=dt;f.abilCD-=dt;f.prot-=dt;f.markT-=dt;f.surge-=dt;
      f.shockT=Math.max(0,(f.shockT||0)-dt);f.dazzledT=Math.max(0,(f.dazzledT||0)-dt);
      f.camoT=Math.max(0,(f.camoT||0)-dt);f.dodgeT=Math.max(0,(f.dodgeT||0)-dt);
      f.flickT=Math.max(0,(f.flickT||0)-dt);
      f.stingT=Math.max(0,(f.stingT||0)-dt);
      f.lungeT=Math.max(0,(f.lungeT||0)-dt);
      if(f.sp==='barra'&&f.lungeActive&&f.lungeT<=0){
        if(!f.lungeHit)f.abilCD+=ABILITY.lungeMiss;
        f.lungeActive=false;f.lungeTarget=null;
      }
      f.inflateBlend+=(+(puffing(f))-(f.inflateBlend||0))*Math.min(1,dt*(puffing(f)?11:8));
      if(ph===0&&rules.nurseryProtect)f.prot=Math.max(f.prot,.5);
      if(f.mass>f.peak)f.peak=f.mass;
      if(f.hooked){continue;} // The shared line solver owns hooked-fish motion.
      if(f.air){
        // Water is y=0 (positive y points DOWN). A breach is a true inverted
        // parabola: lateral velocity and heading stay continuous while gravity
        // reverses vertical velocity at the apex, then points the nose DOWN.
        // Integrate the exact quadratic rather than Euler-stepping through the
        // surface, which caused a visible pop on splash frames.
        const y0=f.y,vy0=f.vy,atApex=vy0<0&&vy0+GRAV*dt>0;
        const endY=y0+vy0*dt+.5*GRAV*dt*dt;
        const landing=endY>=0&&vy0+GRAV*dt>0;
        const discriminant=Math.max(0,vy0*vy0-2*GRAV*y0);
        const flightDt=landing?clamp((-vy0+Math.sqrt(discriminant))/GRAV,0,dt):dt;
        f.x=clamp(f.x+f.vx*dt,10,WW-10);
        f.z=clamp(f.z+f.vz*dt,-ZH+10,ZH-10);
        f.y=y0+vy0*flightDt+.5*GRAV*flightDt*flightDt;
        f.vy=vy0+GRAV*flightDt;f.airT+=flightDt;
        if(atApex&&flightDt>=-vy0/GRAV)f.minY=Math.min(f.minY,y0-vy0*vy0/(2*GRAV));
        f.minY=Math.min(f.minY,f.y);
        if(landing){
          const h=-f.minY,submergedDt=dt-flightDt;
          f.air=false;f.reentryT=REENTRY_BLEND_TIME;f.jumps++;if(h>f.best)f.best=h;
          // Resolve the exact surface intercept, then finish the remainder of
          // this frame DOWNWARD below the surface. Keep vx/vz and downward vy;
          // the existing motion carries through the crossing without a speed snap.
          f.y=Math.min(WH-10,Math.max(0,f.vy*submergedDt));
          spawnSplash(f.x,f.z,clamp(f.vy/450,.4,1.6));
          if(f.human&&h>60)addFeed('Breach! '+Math.round(h)+' high','good',f.pid);
        }
        continue}
      const splashRecovery=Math.max(0,f.reentryT||0);
      if(splashRecovery>0)f.reentryT=Math.max(0,splashRecovery-dt);
      let d;
      if(f.human&&state==='play')d=mvOf(f);
      else{f.wt-=dt;if(f.wt<=0){botThink(f);f.wt=fishes.length>32?.38+(f.i%7)*.02:.25}d={x:f.wx,y:f.wy,z:f.wz};const m=Math.hypot(d.x,d.y,d.z);if(m>1){d.x/=m;d.y/=m;d.z/=m}
        if(f.abilReq){useAbility(f);f.abilReq=false}}
      let sp=SP[f.sp].spd*(1-.35*Math.min(1,f.mass/1400));
      if(f.abilT>0){sp*=SP[f.sp].mul;if(SP[f.sp].mul>1.4&&Math.hypot(d.x,d.y,d.z)<.1)d={x:f.hx,y:0,z:f.hz}}
      if(f.sp==='tuna'&&f.abilT>0){
        const progress=1-clamp(f.abilT/SP.tuna.dur,0,1),r=ABILITY.torpedoRamp;
        sp*=r[0]+(r[1]-r[0])*progress;
      }
      if(f.sp==='piranha'&&f.abilT>0)sp*=1+ABILITY.frenzyStack*Math.min(f.frenzyChain||0,ABILITY.frenzyMaxStack);
      if(f.surge>0)sp*=f.surgeMul||ABILITY.schoolBoost;
      if(f.slowT>0){f.slowT-=dt;sp*=.4}
      if(f.shockT>0)sp*=.3;
      if(f.dazzledT>0)sp*=ABILITY.dazzleSlow;
      if(f.sp==='sunfish'&&activeAbility(f)){
        // Stable cruise even when the stick is released; turning is deliberately slow.
        d={x:f.glideHX||f.hx||1,y:d.y*.35,z:f.glideHZ||f.hz||0};
        sp*=1.1;
      }
      if(f.sp==='tuna'&&activeAbility(f))d={x:f.torpedoHX||f.hx||1,y:f.torpedoY||0,z:f.torpedoHZ||f.hz||0};
      if(f.sp==='barra'&&f.lungeT>0){
        const target=f.lungeTarget;
        let dx=f.lungeHX||f.hx||1,dy=0,dz=f.lungeHZ||f.hz||0;
        if(target&&target.alive!==false&&biteEligible(f,target)&&!shipBlocked(f,target)){
          const bx=target.x-f.x,by=target.y-f.y,bz=target.z-f.z,bl=Math.hypot(bx,by,bz)||1;
          dx=dx*.7+bx/bl*.3;dy=by/bl*.3;dz=dz*.7+bz/bl*.3;
        }
        d={x:dx,y:dy,z:dz};
      }
      // Seahorse camouflage breaks early if it sprints; slow swimming preserves stealth.
      if(f.sp==='seahorse'&&f.camoT>0&&Math.hypot(f.vx,f.vy,f.vz)>(inKelp(f)?ABILITY.kelpCamoSpeed:122)){f.camoT=0;f.abilT=Math.min(f.abilT,.12);}
      if(f.sp==='angel'&&activeAbility(f))influenceWhirl(f,dt);
      if(f.sp==='sunfish'&&activeAbility(f))plankMagnet(f,dt);

      const bT=f.human?btOf(f):null;
      if(bT&&!(f.dazzledT>0)&&biteEligible(f,bT)&&!shipBlocked(f,bT)){
        const b=biteMetrics(f,bT),dm=Math.hypot(d.x,d.y,d.z);
        if(dm>.3&&b.distance<225&&b.forward>0&&b.score<4.2){
          const bx=bT.x-f.x,by=bT.y-f.y,bz=bT.z-f.z;
          const pull=.10+.24*(1-b.distance/225),den=Math.hypot(bx,by,bz)||1;
          // Assist direction only; never teleport fish or capture through solid objects.
          d={x:d.x*(1-pull)+bx/den*pull,y:d.y*(1-pull)+by/den*pull,z:d.z*(1-pull)+bz/den*pull};
        }
      }
      // Splash is a trajectory handoff, not an underwater autopilot. While
      // propulsion is held, blend the actual descending impact tangent into
      // the currently requested swim vector, so the fish keeps going forward
      // and down without the player correcting the pitch. Steering takes over
      // smoothly as the short momentum blend ends, at ANY water depth.
      const inputHeld=Math.hypot(d.x,d.y,d.z)>.001;
      const reentryBlend=inputHeld&&splashRecovery>0?
        clamp(splashRecovery/REENTRY_BLEND_TIME,0,1):0;
      if(reentryBlend>0){
        const vmag=Math.hypot(f.vx,f.vy,f.vz)||1;
        const landing={x:f.vx/vmag,y:Math.max(0,f.vy)/vmag,z:f.vz/vmag};
        d={x:landing.x*reentryBlend+d.x*(1-reentryBlend),
          y:landing.y*reentryBlend+d.y*(1-reentryBlend),
          z:landing.z*reentryBlend+d.z*(1-reentryBlend)};
      }
      // Touch release is a hard stop for human fish, including passive-glide
      // species. Preserve hx/hz and the player's camera trajectory; do not
      // change capture/combat resolution, collision, or ambient AI behavior.
      if(f.human&&state==='play'&&!(f.sp==='barra'&&f.lungeT>0)&&Math.hypot(mvOf(f).x,mvOf(f).y,mvOf(f).z)<.001){
        d=ZERO3;f.vx=f.vy=f.vz=0;f.reentryT=0;
      }
      // Avoid an instantaneous velocity change at impact. Do not invent
      // thrust when no control is held, and do not steer toward a fixed depth.
      const k=Math.min(1,dt*(reentryBlend>0?(3+9*(1-reentryBlend)):
        ((f.sp==='sunfish'&&activeAbility(f))?2.3:(f.abilT>0?14:(f.human?10:6)*SP[f.sp].turn))));
      f.vx+=(d.x*sp-f.vx)*k;f.vy+=(d.y*sp-f.vy)*k;f.vz+=(d.z*sp-f.vz)*k;
      const old={x:f.x,y:f.y,z:f.z};
      const flickX=f.flickT>0?f.flickX:0,flickZ=f.flickT>0?f.flickZ:0;
      f.x=clamp(f.x+(f.vx+flickX)*dt,10,WW-10);f.z=clamp(f.z+(f.vz+flickZ)*dt,-ZH+10,ZH-10);const ny=f.y+f.vy*dt;
      if(ny<22&&f.vy<-110){const v0=Math.min(560,-f.vy*1.35);
        if(v0*v0/(2*GRAV)>30){f.air=true;f.vy=-v0;f.airT=0;f.reentryT=0;f.minY=f.y;f.y=ny;spawnSplash(f.x,f.z,clamp(v0/450,.4,1.6))}else f.y=22}
      else f.y=clamp(ny,22,WH-10);
      shipMove(f,old);
      const hh=Math.hypot(f.vx,f.vz);if(hh>12){f.hx=f.vx/hh;f.hz=f.vz/hh}
      if(f.air)continue;
      // Fish-vs-fish consumption is resolved *once after all movement* by the
      // universal symmetric contact pass. The old directional/immune checks
      // let fish overlap without either participant eating the other.
      const R=hitRadius(f);
      // Same plankton collision radius, checked without 300+ square-roots per fish/frame.
      const foodReach=R+(f.sp==='sunfish'&&activeAbility(f)?48:6),foodR2=foodReach*foodReach;
      if(f.y<110+R)for(let j=0;j<plank.length;j++){
        const p=plank[j];if(!p.alive)continue;const dy=p.y-f.y;
        if(Math.abs(dy)>foodReach)continue;
        const dx=p.x-f.x,dz=p.z-f.z;
        if(dx*dx+dy*dy+dz*dz<foodR2&&!shipBlocked(f,p)){
          absorbPlankton(f);eraseFood(p);
        }
      }
    }
    buildPlayerGrid();updateMiniSchool(dt);buildNpcGrid();
    for(const o of npcs){
      if(o.mini||o.alive===false)continue; // Mini food fish use schooling/flee AI.
      if(o.hooked)continue; // Ordinary NPC prey keep their shared line solver.
      o.surge=Math.max(0,(o.surge||0)-dt);o.shockT=Math.max(0,(o.shockT||0)-dt);o.dazzledT=Math.max(0,(o.dazzledT||0)-dt);
      o.wt-=dt;if(o.wt<=0){o.wt=rnd(1,3);const a=rnd(0,6.28);o.wx=Math.cos(a);o.wz=Math.sin(a);o.wy=rnd(-.4,.4)}
      o.ds=(o.ds||0)-dt;
      if(o.ds<=0){o.ds=rnd(.18,.32);
      let fx=0,fy=0,fz=0,fl=false,prey=null,pd=95;
      const look=(p,isFish)=>{if(p===o||(isFish&&!p.alive))return;const d=Math.hypot(o.x-p.x,o.y-p.y,o.z-p.z)+1;
        if(combatMass(o)<combatMass(p)){if(d<130){fx+=(o.x-p.x)/d;fy+=(o.y-p.y)/d;fz+=(o.z-p.z)/d;fl=true}}
        else if(combatMass(p)<combatMass(o)&&d<pd&&(!isFish||!predationProtected(p))&&!shipBlocked(o,p)){pd=d;prey=p}};
      nearPlayers(o,f=>look(f,true),2);nearEach(o,p=>look(p,false));
      let dx,dy,dz,sp;
      if(fl){dx=fx;dy=fy;dz=fz;sp=115}else if(prey){dx=prey.x-o.x;dy=prey.y-o.y;dz=prey.z-o.z;sp=68}else{dx=o.wx;dy=o.wy;dz=o.wz;sp=45}
      o.dx=dx;o.dy=dy;o.dz=dz;o.sp_=sp}
      const dx=o.dx||0,dy=o.dy||0,dz=o.dz||0,sp=(o.sp_||45)*(o.shockT>0?.25:1)*(o.dazzledT>0?.45:1)*(o.surge>0?(o.surgeMul||ABILITY.schoolBoost):1);
      const m=Math.hypot(dx,dy,dz)||1,k=Math.min(1,dt*4);
      o.vx+=(dx/m*sp-o.vx)*k;o.vy+=(dy/m*sp-o.vy)*k;o.vz+=(dz/m*sp-o.vz)*k;
      const old={x:o.x,y:o.y,z:o.z};
      o.x=clamp(o.x+o.vx*dt,10,WW-10);o.y=clamp(o.y+o.vy*dt,30,WH-10);o.z=clamp(o.z+o.vz*dt,-ZH+10,ZH-10);
      shipMove(o,old);
      // NPC-vs-player and NPC-vs-NPC collisions use the same shared pass.
    }
    fishers.forEach((fr,i)=>fisherStep(fr,i,dt,ph));
    resolveUniversalPredation(previous);
    for(const p of pings)p.t+=dt;pings=pings.filter(p=>p.t<1.6);
    for(const q of splashes)q.t+=dt;splashes=splashes.filter(q=>q.t<.9);
    for(const d of drops){d.vy+=GRAV*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.life-=dt}drops=drops.filter(d=>d.life>0&&!(d.y>0&&d.vy>0));
    for(const m of feed)m.t-=dt;feed=feed.filter(m=>m.t>0);
    if(state==='play'){
      if(rules.mode==='last'){
        // Competing fish alone determine survival; ambient prey do not count.
        if(fishes.reduce((n,f)=>n+(f.alive?1:0),0)<=1)endMatch();
      }else if(rules.mode!=='free'&&(t>=L||(ph===3&&fishes.every(f=>!f.alive))))endMatch();
    }
  }
  function sides(){
    const k=.6+.4*L/300;
    const fs=fishes.map(f=>f.surv+f.mass*.5+f.esc*15-f.catches*5);
    const fisherScore=fishers.reduce((a,fr)=>a+fr.score-fr.breaks*3,0);
    return{fs,fish:fs.reduce((a,b)=>a+b,0)/(fishes.length*CFG.fishPar*k),fisher:fisherScore/(2*CFG.fisherPar*k),fisherScore};
  }
  function initializeCastAim(fr){
   if(!fr)return;
   const dx=Math.sin(fr.heading||0),dz=-Math.cos(fr.heading||0);
   fr.aimX=clamp(fr.x+dx*CAST_CFG.defaultRange,40,WW-40);
   fr.aimZ=clamp(fr.z+dz*CAST_CFG.defaultRange,-ZH+40,ZH-40);
  }
  function castRodBase(fr){const dx=Math.sin(fr.heading),dz=-Math.cos(fr.heading);
   return{x:fr.x+dx*16,z:fr.z+dz*16};}
  function updateCastAim(fr,dt){
   if(fr.aimX===undefined||fr.aimZ===undefined)initializeCastAim(fr);
   const sx=fr.in.stick.x,sy=fr.in.stick.y;
   const speed=CAST_CFG.aimSpeed*dt;
   const fX=Math.sin(fr.heading),fZ=-Math.cos(fr.heading);
   const rX=Math.cos(fr.heading),rZ=Math.sin(fr.heading);
   fr.aimX=clamp(fr.aimX+(rX*sx+fX*sy)*speed,35,WW-35);
   fr.aimZ=clamp(fr.aimZ+(rZ*sx+fZ*sy)*speed,-ZH+35,ZH-35);
   // Keep casts bounded to a reachable circle around the stationary boat.
   const dx=fr.aimX-fr.x,dz=fr.aimZ-fr.z,d=Math.hypot(dx,dz);
   if(d>CAST_CFG.aimRadius){fr.aimX=fr.x+dx/d*CAST_CFG.aimRadius;fr.aimZ=fr.z+dz/d*CAST_CFG.aimRadius;}
  }
  function castHumanLure(fr,lure){
   if(typeof lure!=='string'||!Object.prototype.hasOwnProperty.call(SP,lure))lure='goldfish';
   if(fr.aimX===undefined||fr.aimZ===undefined)initializeCastAim(fr);
   fr.in.mode='aim';emit({k:'mode',to:fr.pid,mode:'aim'});
   fr.vx=0;fr.vz=0;
   const x=clamp(fr.aimX,30,WW-30),z=clamp(fr.aimZ,-ZH+30,ZH-30);
   // Immediate re-cast replaces the previous lure; never strand an angler at
   // an incorrect depth with an unresponsive reel control.
   fr.cast={state:'bait',x,y:0,z,fish:[],tool:'hook',time:0,lureSp:lure,lureMass:LURE_MASS,
     trolling:false,castRange:Math.hypot(x-fr.x,z-fr.z),depthLocked:false,
     retrievePhase:'sinking',lockedDepth:null};
   spawnSplash(x,z,.78);vib(fr.pid,[22,35,35]);
   if(fr.human)addFeed(SP[lure].name+' lure sinking · press REEL to lock depth','good',fr.pid);
  }
  function physicalRodTip(fr){
   const amount=fr.human?rodOf(fr):clamp(fr.aiRod??.35,0,1);
   const a=(FISHER_CFG.rodMin+FISHER_CFG.rodRange*amount)*Math.PI/180;
   // Rod tracks the actual target, while boat heading and optional phone roll
   // provide the direction of side-pressure. No automatic line retrieval occurs.
   let aim=fr.heading;
   const target=fr.cast?.fish?.[0];
   if(fr.cast?.state==='fight'&&target){
     const desired=Math.atan2(target.x-fr.x,-(target.z-fr.z));
     aim=lerpAng(fr.heading,desired,.70);
   }
   const sideRoll=fr.human?clamp(fr.in.roll/90,-.16,.16):0;
   aim+=sideRoll;
   const fx=Math.sin(aim),fz=-Math.cos(aim);
   const reelX=fr.x+fx*16,reelZ=fr.z+fz*16;
   return{x:reelX+fx*Math.cos(a)*115,y:31+Math.sin(a)*115,z:reelZ+fz*Math.cos(a)*115};
  }
  function humanRodTip(fr){return physicalRodTip(fr)}
  function beginPhysicalFight(fr,c,f){
    if(!f||f.hooked||f.alive===false)return false;
    f.hooked={fr,tool:'hook',esc:0,reel:0};
    f.prot=0;f.fightStamina=1;f.fightBurstT=.32;f.fightTime=0;f.fightMode='run';
    f.fightModeUntil=0;f.fightThinkT=0;f.fightPulseAt=-1;
    c.state='fight';c.fish=[f];c.kind=f.sp||f.kind;
    const tip=physicalRodTip(fr);const d=Math.hypot(f.x-tip.x,f.y+tip.y,f.z-tip.z);
    c.lineOut=d+18;c.prevDistance=d;c.tension=0;c.damage=0;c.hookSecurity=1;c.reelHeat=0;c.breakWindow=false;c.redExposure=0;c.zone='green';
    c.time=0;c.landReady=false;c.netGrace=0;c.netting=0;c.physicsRemainder=0;c.landingT=0;
    c.prevBoatX=fr.x;c.prevBoatZ=fr.z;c.reelTurns=0;c.payout=0;c.slack=18;
    fr.reelBuffer=0;fr.reel.budget=12;
    if(fr.human){vib(fr.pid,[95,35,70]);addFeed('HOOKED! Hold REEL: green gives slack, yellow pulls; red lets fish BREAK LINE','good',fr.pid);}
    return true;
  }
  function findBiter(c){
   const lm=c.lureMass||LURE_MASS;let prey=null,pd=Infinity;
   const consider=f=>{if(f.alive===false||f.hooked||(f.prot||0)>0||f.air)return;
     const d=Math.hypot(f.x-c.x,f.y-c.y,f.z-c.z);if(d>=rad(f.mass)+rad(lm)*.8||d>=pd||shipBlocked(f,c))return;pd=d;prey=f};
   nearPlayers(c,consider,2);
   nearEach(c,consider,1);
   return prey;
  }
  function aiBaitStep(fr,c,dt){
   c.time=(c.time||0)+dt;c.holdT-=dt;
   const dx=fr.x-c.x,dz=fr.z-c.z,d=Math.hypot(dx,dz);
   if(d>40){const s=Math.min(d-40,FISHER_CFG.aiLureDrift*dt);c.x+=dx/d*s;c.z+=dz/d*s} // AI casts from <60 away, so never retrieve on proximity
   const prey=findBiter(c);if(prey){startBite(fr,c,prey);return}
   if(c.holdT<=0)c.state='up';
  }
  function biteCastOf(f){for(const fr of fishers){const c=fr.cast;if(c&&c.state==='bite'&&c.fish[0]===f)return{fr,c}}return null}
  function startBite(fr,c,prey){
   c.state='bite';c.fish=[prey];c.biteId=++biteSeq;c.biteEsc=0;c.biteAge=0;c.lastTap=-9;
   c.aiHookDelay=rand()<FISHER_CFG.aiHookMissChance?Infinity:rnd(FISHER_CFG.aiHookMinDelay,FISHER_CFG.aiHookMaxDelay); // AI fisher reaction; Infinity = missed bite
   c.aiTapStart=rnd(FISHER_CFG.aiTapMinDelay,FISHER_CFG.aiTapMaxDelay);c.aiTapRate=rnd(FISHER_CFG.aiTapMinRate,FISHER_CFG.aiTapMaxRate);
   if(fr.human){vib(fr.pid,[80,30,110]);addFeed('BITE! Tap STRIKE before the fish escapes','good',fr.pid);}
   else if(prey.human){vib(prey.pid,[60,40,60]);addFeed('You took a lure! Tap to spit it out','bad',prey.pid);}
  }
  function breakFreeFromBite(fr,c,f){
   f.prot=Math.max(f.prot||0,1.1);f.esc=(f.esc||0)+1;fr.cast=null;fr.reelBuffer=0;if(!fr.human)fr.cd=Math.max(fr.cd||0,2.2);
   if(f.human)addFeed('You spat out the lure','good',f.pid);
   if(fr.human)addFeed('Fish spat out the lure','bad',fr.pid);
   if(!f.human&&!fr.human)addFeed('Fish spat out the lure','');
   if(fr.human)vib(fr.pid,[45,30,35]);
  }
  function biteTap(fr,c,f){
   if(t-c.lastTap<1/FISHER_CFG.biteTapMaxRate)return; // tap-rate cap
   c.lastTap=t;c.biteEsc=Math.min(1,c.biteEsc+FISHER_CFG.biteTapGain);
   if(c.biteEsc>=1)breakFreeFromBite(fr,c,f);
  }
  function updateBite(fr,c,dt){
   const f=c.fish[0];if(!f||f.alive===false||f.hooked){fr.cast=null;return} // Any living fish can keep a bite regardless of mass
   c.x=f.x;c.y=f.y;c.z=f.z;c.biteAge+=dt;
   if(!fr.human&&c.biteAge>=c.aiHookDelay){setHumanHook(fr);return} // humans hook via their input frame (hook:biteId)
   if(!f.human&&c.biteAge>=c.aiTapStart)c.biteEsc+=c.aiTapRate*FISHER_CFG.biteTapGain*dt;
   c.biteEsc=Math.max(0,c.biteEsc-FISHER_CFG.biteDecay*dt);
   if(c.biteEsc>=1)breakFreeFromBite(fr,c,f);
  }
  function setHumanHook(fr){
   const c=fr.cast;if(!c||c.state!=='bite'||!c.fish.length)return false;
   const f=c.fish[0];if(f.alive===false||f.hooked){fr.cast=null;return false;}
   return beginPhysicalFight(fr,c,f);
  }
  function releaseHumanFish(fr,c,reason){
   if(c&&c.fish)for(const f of c.fish)if(f&&f.hooked&&f.hooked.fr===fr){f.hooked=null;f.prot=Math.max(f.prot||0,1.1);f.fightBurstT=0;f.esc=(f.esc||0)+1;}
   if(reason==='break')fr.breaks++;
   if(reason==='break'&&c?.fish?.[0]?.human)addFeed('BREAK LINE! You escaped with one tap','good',c.fish[0].pid);
   fr.cast=null;fr.reelBuffer=0;
   if(fr.human){vib(fr.pid,reason==='break'?[140,35,40]:[45,30,35]);
   addFeed(reason==='break'?'LINE SNAPPED!':reason==='slack'?'Fish shook the hook!':'Fish escaped','bad',fr.pid);}
  }
  function canLandFish(fr,c,f){
   if(!fr||!c||c.state!=='fight'||!f||!f.hooked||f.hooked.fr!==fr||f.alive===false)return false;
   const horiz=Math.hypot(f.x-fr.x,f.z-fr.z);
   return horiz<FISHER_CFG.landingRange+10&&f.y<FISHER_CFG.landingDepth+12&&
     (c.landReady||c.netGrace>0)&&c.tension<1.02;
  }
  function landHumanFish(fr,c,f){
   if(!canLandFish(fr,c,f))return false;
   emit({k:'net',to:null,pid:fr.pid||null,x:f.x,y:f.y,z:f.z,sp:f.sp||f.kind,mass:f.mass,fishIndex:f.i??null,
     fisherIndex:fishers.indexOf(fr)});
   spawnSplash(f.x,f.z,.6);

   fr.bestFight=Math.max(fr.bestFight||0,c.time||0);
   fr.caught++;fr.score+=catchValue(f);f.catches=(f.catches||0)+1;
   if(fr.human){addFeed('LANDED '+(SP[f.sp||f.kind]?.name||'Reef fish')+' · +'+Math.round(catchValue(f)),'good',fr.pid);
   vib(fr.pid,[80,50,90,50,130]);}
   f.hooked=null;fr.cast=null;fr.reelBuffer=0;
   if(f.mini)consumeMini(f);else if(f.sp)kill(f,'caught');else Object.assign(f,mkNpc(f.kind));
   return true;
  }
  function chooseFishTactic(f,c,fr,dt){
   f.fightThinkT=(f.fightThinkT||0)-dt;
   if(f.fightThinkT>0)return;
   f.fightThinkT=.30+((f.i||0)%5)*.035;
   const toBoat=Math.hypot(f.x-fr.x,f.z-fr.z);
   const boatTowards=((fr.vx||0)*(f.x-fr.x)+(fr.vz||0)*(f.z-fr.z))/Math.max(1,toBoat);
   const energy=f.fightStamina||0,pressure=c.tension||0;
   const boundary=Math.min(f.x,WW-f.x,ZH-f.z,ZH+f.z);
   const nearWreck=Math.abs(f.x-WRECK.x)<650&&Math.abs(f.z-WRECK.z)<310;
   // Tactical choices respond to boat closing, pressure, terrain and fish stamina.
   if(energy<.20)f.fightMode='rest';
   else if(boatTowards>55&&toBoat<340)f.fightMode='slack';
   else if(pressure>.86)f.fightMode='cut';
   else if(nearWreck&&energy>.4)f.fightMode='obstacle';
   else if(boundary<130)f.fightMode='cut';
   else if(energy>.37&&((Math.floor(f.fightTime*.75+(f.i||0)*1.7)%5)===0))f.fightMode='dive';
   else if(energy>.30)f.fightMode='run';
   else f.fightMode='rest';
  }
  function advanceHookedFish(f,c,fr,dt){
   f.fightTime=(f.fightTime||0)+dt;
   const profile=FISH_FIGHT_PROFILES[f.sp||f.kind]||FISH_FIGHT_PROFILES.sardine;
   let ux=f.x-fr.x,uz=f.z-fr.z,d=Math.hypot(ux,uz)||1;ux/=d;uz/=d;
   let dx=ux,dz=uz,dy=0;
   if(f.human){
     const v=mvOf(f),strength=Math.hypot(v.x,v.y,v.z);
     if(strength>.12){dx=v.x;dy=v.y;dz=v.z;}
     if(f.hooked.esc>.05&&f.fightStamina>.04){
       f.fightBurstT=Math.max(f.fightBurstT||0,.19);
       f.hooked.esc=Math.max(0,f.hooked.esc-.10);
     }
   }else{
     chooseFishTactic(f,c,fr,dt);
     const mode=f.fightMode;
     if(mode==='slack'){dx=-ux;dz=-uz;dy=-.1;}
     else if(mode==='cut'){dx=-uz*(f.i%2?1:-1);dz=ux*(f.i%2?1:-1);dy=.12;}
     else if(mode==='dive'){dx=ux*.66;dz=uz*.66;dy=profile.dive;}
     else if(mode==='obstacle'){dx=(WRECK.x-f.x)*.003;dz=(WRECK.z-f.z)*.003;dy=.18;}
     else if(mode==='rest'){dx=ux*.32;dz=uz*.32;dy=0;}
     else{dx=ux;dz=uz;dy=.08;}
     if(f.fightStamina>.33&&!(f.fightBurstT>0)&&mode!=='rest'&&
        (f.fightTime-(f.fightPulseAt||-10))>2.1+(f.i||0)*.09){
       f.fightBurstT=.30+profile.burst*.13;f.fightPulseAt=f.fightTime;
     }
   }
   f.fightBurstT=Math.max(0,(f.fightBurstT||0)-dt);
   const burst=f.fightBurstT>0&&f.fightStamina>.04;
   const norm=Math.hypot(dx,dy,dz)||1;dx/=norm;dy/=norm;dz/=norm;
   const endurance=.42+.58*clamp(f.fightStamina,0,1);
   const speed=(60+Math.min(56,Math.sqrt(f.mass)*1.45))*profile.power*endurance*(burst?1+profile.burst*.57:1);
   const response=Math.min(1,dt*(2.6+profile.turn));
   f.vx+=(dx*speed-f.vx)*response;f.vy+=(dy*speed*.72-f.vy)*response;f.vz+=(dz*speed-f.vz)*response;
   const swimLen=Math.hypot(f.vx,f.vz);
   if(swimLen>10){f.hx=f.vx/swimLen;f.hz=f.vz/swimLen;}
   const old={x:f.x,y:f.y,z:f.z};
   f.x=clamp(f.x+f.vx*dt,18,WW-18);f.y=clamp(f.y+f.vy*dt,28,WH-22);
   f.z=clamp(f.z+f.vz*dt,-ZH+18,ZH-18);
   shipMove(f,old);
   // Stamina changes in exactly one place each physics tick.
   const expenditure=burst?.13*profile.burst:0;
   const sustained=(c.tension||0)>.28?.030*(c.tension||0):0;
   const recovery=burst?0:(c.tension||0)<.17?.035:.012;
   f.fightStamina=clamp(f.fightStamina+dt*(recovery-sustained-expenditure),0,1);
  }
  function solveSharedLine(fr,c,dt){
   const f=c.fish[0];if(!f||f.alive===false||!f.hooked||f.hooked.fr!==fr){fr.cast=null;return}
   advanceHookedFish(f,c,fr,dt);
   // Pressing REEL is the single contextual control for both striking and
   // fighting. Releasing pressure cools the meter; tension persists for a
   // short, readable reaction interval without creating extra button states.
   const isReeling=(fr.shockT||0)<=0&&(fr.human?fr.reel.active:fr.aiReeling===true);
   c.reelHeat=clamp((c.reelHeat||0)+(isReeling?.265:-.58)*dt,0,1.22);
   const ux=(f.x-fr.x)/(Math.hypot(f.x-fr.x,f.z-fr.z)||1),uz=(f.z-fr.z)/(Math.hypot(f.x-fr.x,f.z-fr.z)||1);
   const outwardSpeed=Math.max(0,((f.vx||0)-(fr.vx||0))*ux+((f.vz||0)-(fr.vz||0))*uz);
   const orientationAway=Math.max(0,(f.hx??ux)*ux+(f.hz??uz)*uz);
   const forecast=Math.max(c.tension||0,c.reelHeat);
   if(isReeling&&forecast<FIGHT_GREEN_MAX){
     // No magical reeling through a running fish in green: outgoing line
     // length/slack is proportional to both swim speed and facing direction.
     c.lineOut=Math.min(6500,c.lineOut+outwardSpeed*orientationAway*1.20*dt);
   }else if(isReeling&&forecast<FIGHT_RED_MIN){
     // The productive yellow zone is the only zone that retrieves line.
     const amount=Math.min(FISHER_CFG.maxReelSpeed*.69*dt,Math.max(0,c.lineOut-28));
     c.lineOut-=amount;c.reelTurns=(c.reelTurns||0)+amount/13;
     const toBoat=Math.hypot(f.x-fr.x,f.z-fr.z)||1;
     const pull=Math.min(42*dt,Math.max(0,toBoat-18));
     f.x=clamp(f.x-(f.x-fr.x)/toBoat*pull,18,WW-18);
     f.z=clamp(f.z-(f.z-fr.z)/toBoat*pull,-ZH+18,ZH-18);
     unstickShip(f);
   }
   const tip=physicalRodTip(fr),ex=f.x-tip.x,ey=f.y+tip.y,ez=f.z-tip.z;
   const d=Math.max(.001,Math.hypot(ex,ey,ez));
   const stretch=Math.max(0,d-c.lineOut);
   const radialSpeed=clamp((d-(c.prevDistance??d))/dt,-380,380);c.prevDistance=d;
   const a=fr.human?rodOf(fr):fr.aiRod||.35;
   // Raised rods absorb more shock; combined rod/line spring acts only when taut.
   const rodCompliance=1/(1+.80*a);
   const elastic=stretch*FISHER_CFG.k*rodCompliance;
   const damping=radialSpeed>0?radialSpeed*FISHER_CFG.damper*rodCompliance:0;
   let load=Math.max(0,elastic+damping);
   const setting=fr.human?dragOf(fr):(fr.aiDrag??.4);
   const dragThreshold=.12+.83*setting;
   c.payout=0;
   if(load>dragThreshold){
     const delta=Math.min(FISHER_CFG.maxPayoutSpeed*dt,(load-dragThreshold)*440*dt);
     c.lineOut=Math.min(6500,c.lineOut+delta);c.payout=delta/dt;
     load=Math.max(0,Math.max(0,d-c.lineOut)*FISHER_CFG.k*rodCompliance+damping);
   }
   c.tension=clamp(Math.max(load,c.reelHeat||0),0,1.3);
   c.zone=c.tension>=FIGHT_RED_MIN?'red':c.tension>=FIGHT_GREEN_MAX?'yellow':'green';
   c.breakWindow=!!(isReeling&&c.zone==='red');
   // AI-controlled fish also use the same break opportunity, with a small
   // reaction delay. A human fish gets an actual one-tap decision instead.
   c.redExposure=c.breakWindow?(c.redExposure||0)+dt:0;
   if(c.breakWindow&&!f.human&&c.redExposure>=BALANCE.redAiReaction+((f.i||0)%5)*.065){
     releaseHumanFish(fr,c,'break');return;
   }
   c.slack=Math.max(0,c.lineOut-d);
   // Same force acts against the fish and gently on the boat. Size influences inertia.
   if(stretch>0){
     const massScale=clamp(.65+Math.sqrt(f.mass)/36,.65,2.5);
     const pull=(28+c.tension*180)*dt/massScale;
     f.vx-=ex/d*pull;f.vy-=ey/d*pull;f.vz-=ez/d*pull;
     // Limited corrective integration prevents unlimited spring stretch without teleporting.
     const correction=Math.min(Math.max(0,stretch-12)*.14,dt*32);
     f.x=clamp(f.x-ex/d*correction,18,WW-18);
     f.y=clamp(f.y-ey/d*correction,28,WH-22);
     f.z=clamp(f.z-ez/d*correction,-ZH+18,ZH-18);unstickShip(f);
     fr.vx+=(ex/d)*(c.tension*11)*dt;fr.vz+=(ez/d)*(c.tension*11)*dt;
   }
   const shaking=(f.fightBurstT||0)>0;
   c.damage=clamp((c.damage||0)+dt*(c.tension>1?(c.tension-1)*1.7:-.10),0,1.3);
   c.hookSecurity=clamp((c.hookSecurity||0)-dt*(c.slack>55?(shaking?.105:.07):.0015)+(c.tension>.2?dt*.004:0),0,1);
   c.x=f.x;c.y=f.y;c.z=f.z;
   const horiz=Math.hypot(f.x-fr.x,f.z-fr.z);
   // The net is physical: near the boat AND at the surface. Do not silently
   // require near-zero stamina or a single exact-frame tension threshold.
   // A brief net window absorbs one or two frames of fish movement/network jitter.
   const netGeometry=horiz<FISHER_CFG.landingRange&&f.y<FISHER_CFG.landingDepth;
   const netControlled=c.tension<FIGHT_RED_MIN+.13&&c.slack<170;
   c.landReady=!!(netGeometry&&netControlled);
   c.netGrace=c.landReady?.40:Math.max(0,(c.netGrace||0)-dt);
   // The new red zone is an intentional fish-triggered escape mechanic,
   // not an automatic line snap while the fish has not tapped BREAK LINE.
   if(c.lineOut>=6450){releaseHumanFish(fr,c,'break');return;}
   if(c.hookSecurity<=0){releaseHumanFish(fr,c,'slack');return;}
   if(fr.human){
     const tier=c.tension>1.0?3:c.tension>.81?2:c.tension>.60?1:0;
     const interval=tier===3?.32:tier===2?.68:tier===1?1.5:Infinity;
     if(tier&&t-(c.hapticAt??-100)>interval){c.hapticAt=t;vib(fr.pid,tier===3?[38,22,48]:tier===2?[25,22,28]:[13]);}
     if(c.payout>48&&t-(c.lastDragBuzz||-50)>.85){c.lastDragBuzz=t;vib(fr.pid,[12,26,12]);}
   }
  }
  function updatePhysicalFight(fr,dt){
   const c=fr.cast;if(!c||c.state!=='fight')return;
   c.physicsRemainder=(c.physicsRemainder||0)+dt;
   // Time-step integration isolates tension from rendering FPS. Bound catch-up on slow phones.
   let n=0;while(c.physicsRemainder>=FIGHT_STEP&&n<4&&fr.cast===c){
     c.physicsRemainder-=FIGHT_STEP;
     if(!fr.human){
       // AI may reposition, but its boat is slower than bursts and uses the same line forces.
       const victim=c.fish[0];
       if(victim){
         const dx=victim.x-fr.x,dz=victim.z-fr.z,range=Math.hypot(dx,dz)||1;
         const chase=range>FISHER_CFG.landingRange*1.1&&c.tension<.78;
         const speed=chase?Math.min(72,(range-FISHER_CFG.landingRange)*.38):0;
         fr.vx+=(dx/range*speed-fr.vx)*Math.min(1,FIGHT_STEP*1.9);
         fr.vz+=(dz/range*speed-fr.vz)*Math.min(1,FIGHT_STEP*1.9);
         fr.x=clamp(fr.x+fr.vx*FIGHT_STEP,42,WW-42);
         fr.z=clamp(fr.z+fr.vz*FIGHT_STEP,-ZH+42,ZH-42);
         fr.heading=lerpAng(fr.heading||0,Math.atan2(dx,-dz),Math.min(1,FIGHT_STEP*1.9));
       }
       // The AI angler uses the very same rod, drag and line solver, not a catch timer.
       fr.aiRod=clamp((fr.aiRod??.40)+(c.tension>.86?-.24:.13)*FIGHT_STEP,.12,.81);
       fr.aiDrag=clamp((fr.aiDrag??.40)+(c.tension>.95?-.09:.015)*FIGHT_STEP,.2,.72);
       // The same green/yellow/red solver governs AI anglers and humans.
       fr.aiReeling=c.tension<FIGHT_RED_MIN-.055||((c.time||0)%6)>4.2;
     }
     solveSharedLine(fr,c,FIGHT_STEP);n++;
     if(!fr.human&&fr.cast===c){
       c.netting=c.landReady?(c.netting||0)+FIGHT_STEP:0;
       if(c.netting>.65&&landHumanFish(fr,c,c.fish[0]))break;
     }
   }
   if(n===4)c.physicsRemainder=Math.min(c.physicsRemainder,FIGHT_STEP);
  }
  function dragSafeThreshold(fr){return .12+.83*(fr.aiDrag??.4)}
  function fightFishMove(f,dt){/* compatibility: updatePhysicalFight owns hooked-fish movement */}
  function playerFisherStep(fr,dt){
   const c=fr.cast,inp=fr.in;
   if(inp.mode==='aim'){
     fr.vx=0;fr.vz=0;
     if(!c||c.state==='bait')updateCastAim(fr,dt);
   }else{
     const steer=inp.stick.x,throttle=inp.stick.y;
     fr.heading+=clamp(steer,-1,1)*dt*1.9;
     const engine=FISHER_CFG.boatTopSpeed*clamp(throttle,-1,1),fx=Math.sin(fr.heading),fz=-Math.cos(fr.heading);
     const response=Math.min(1,dt*1.8);
     fr.vx+=(fx*engine-fr.vx)*response;fr.vz+=(fz*engine-fr.vz)*response;
     fr.x=clamp(fr.x+fr.vx*dt,42,WW-42);fr.z=clamp(fr.z+fr.vz*dt,-ZH+42,ZH-42);
     if(!c)initializeCastAim(fr);
   }
   if(!c)return;
   c.time=(c.time||0)+dt;
   if(c.state==='bait'){
     // Original manual depth selection: the lure sinks freely until REEL is
     // pressed. That press freezes its Y (depth), even on a very short tap.
     if(!c.depthLocked){
       c.retrievePhase='sinking';
       c.y=Math.min(CAST_CFG.maxSinkDepth,c.y+CAST_CFG.sinkSpeed*dt);
     }else{
       const skipRetrieve=c.justLocked===true;
       c.justLocked=false;
       const base=castRodBase(fr),speed=fr.reel.active&&!skipRetrieve?FISHER_CFG.maxReelSpeed*dt:0;
       if(c.retrievePhase==='horizontal'){
         c.y=c.lockedDepth; // exact plane: no vertical motion until under rod
         if(speed>0){
           const dx=base.x-c.x,dz=base.z-c.z,d=Math.hypot(dx,dz);
           const change=Math.min(speed,d);
           if(d>0){c.x+=dx/d*change;c.z+=dz/d*change;}
           if(d-change<=CAST_CFG.horizontalMin){
             c.x=base.x;c.z=base.z;c.retrievePhase='vertical';
             addFeed('Lure under rod · keep reeling to surface','good',fr.pid);
           }
         }
       }else if(c.retrievePhase==='vertical'){
         c.x=base.x;c.z=base.z;
         c.y=Math.max(0,c.y-speed*.75);
         if(speed>0&&c.y<=CAST_CFG.surfaceLift){
           fr.cast=null;vib(fr.pid,15);addFeed('Lure retrieved · cast again','good',fr.pid);return;
         }
       }
     }
     const prey=findBiter(c);if(prey)startBite(fr,c,prey);
     return;
   }
   if(c.state==='bite'){updateBite(fr,c,dt);return;}
   if(c.state==='fight'){
     // All retrieval/payout and fish-pull decisions happen in the fixed-step,
     // server-authoritative solver using the currently displayed bar zone.
     updatePhysicalFight(fr,dt);
   }
  }
  function reelStroke(fr,dy){ /* legacy replay adapter; mobile touch uses reel.hold */
    if(!fr||!(dy>0)||!fr.cast)return;
    if(fr.cast.state==='fight')fr.cast.lineOut=Math.max(28,fr.cast.lineOut-Math.min(32,dy*.30));
  }
  return{combatMass,predationProtected,addFishPlayer,addFisherPlayer,disconnectPlayer,buildPlayerGrid,nearPlayers,absorbPrey,phase,mkFish,buildNpcGrid,nearEach,mkNpc,spawnSplash,inKelp,bodySurfaceRadius,bodyContact,biteMetrics,biteEligible,canBite,useAbility,abilityOnEat,inflateRadiusFactor,influenceWhirl,plankMagnet,botThink,kill,spawnFish,margin,gainMul,absorbFish,absorbPlankton,immune,catchValue,startCast,fisherStep,step,sides,initializeCastAim,castRodBase,updateCastAim,castHumanLure,physicalRodTip,humanRodTip,beginPhysicalFight,findBiter,aiBaitStep,biteCastOf,startBite,breakFreeFromBite,biteTap,updateBite,setHumanHook,releaseHumanFish,landHumanFish,chooseFishTactic,advanceHookedFish,solveSharedLine,updatePhysicalFight,dragSafeThreshold,fightFishMove,playerFisherStep,reelStroke,newMatch,snapshot,restore,drainEvents,idle,setState,endMatch,applyInputs,tapFish,get L(){return L},get t(){return t},get state(){return state},get fishes(){return fishes},get npcs(){return npcs},get plank(){return plank},get foodPatches(){return foodPatches},get miniSchool(){return miniSchool},get fishers(){return fishers},get kelp(){return kelp},get pings(){return pings},get revealT(){return revealT},get feed(){return feed},get splashes(){return splashes},get drops(){return drops},get rules(){return rules}};
}
return{create,CFG,WW,WH,ZH,GRAV,SP,STARTER_FISH_MASS,LURE_MASS,LURE_KEYS,PH,PHD,clamp,dist,GROWTH,ABILITY,BALANCE,activeAbility,puffing,combatMass,rad,hitRadius,lerpAng,CELL,gk,WRECK,inWreck,shipBlocked,unstickShip,shipMove,COLLISION_DIMS,FISHER_CFG,CAST_CFG,FIGHT_GREEN_MAX,FIGHT_RED_MIN,FIGHT_STEP,FISH_FIGHT_PROFILES};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Aqua;
