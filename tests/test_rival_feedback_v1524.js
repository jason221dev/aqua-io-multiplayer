'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),A=require('../aqua_sim');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const c=vm.createContext({console,SP:A.SP,Math,activeAbility:A.activeAbility,inKelp:f=>!!f.testKelp,ME:'local'});
vm.runInContext(scripts.find(s=>s.includes('const e="128"')),c);
vm.runInContext(html.slice(html.indexOf('function fishBodyDims'),html.indexOf('function buildFish')),c);
vm.runInContext(html.slice(html.indexOf('const ABILITY_VFX_PROFILES'),html.indexOf('function buildPlayer(f)')),c);
let passed=0;function test(n,f){f();passed++;console.log('PASS '+n)}
test('All 13 species preserve visual feedback state without rival overlay submission',()=>{
 for(const sp of Object.keys(A.SP)){
  const f={sp,alive:true,abilT:2,camoT:sp==='seahorse'?2:0,prot:1},out=c.fishAbilityFeedback(f,5,2.3);
  assert.equal(out.aura,true);assert.equal(out.auraColor,A.SP[sp].col);assert.equal(out.shield,true);
  assert(out.auraScale>0&&out.auraOpacity>0);assert.equal(out.opacity,sp==='seahorse'?.28:1);
  f.abilT=0;f.camoT=0;f.prot=0;const off=c.fishAbilityFeedback(f,5,2.4);assert.equal(off.aura,false);assert.equal(off.shield,false);assert.equal(off.opacity,1);
 }
 assert(html.includes('fishAbilityFeedback(f,i,t,e.feedback'));
 assert(html.includes('fishAbilityFeedback(f,i,t,remoteIM.feedback)'));
});
test('Local-player camouflage ghost and kelp opacity retain their visual priority',()=>{
 const f={sp:'seahorse',alive:true,abilT:2,camoT:2};assert.equal(c.fishAbilityFeedback(f,0,0).opacity,.28);
 f.testKelp=true;assert.equal(c.fishAbilityFeedback(f,0,0).opacity,.4);
 f.abilT=0;f.camoT=0;f.testKelp=false;assert.equal(c.fishAbilityFeedback(f,0,0).opacity,1);
});
test('Dart and sting flashes retain color, offset and activation gates',()=>{
 const f={sp:'guppy',alive:true,flickT:.3};let r=c.fishAbilityFeedback(f,0,0);assert(r.flash);assert.equal(r.flashColor,0x75eafa);assert.equal(r.flashX,-1.35);
 f.flickT=0;f.stingT=1;f.slowT=1;r=c.fishAbilityFeedback(f,0,0);assert(r.flash);assert.equal(r.flashColor,0xff8c3e);assert.equal(r.flashX,0);
 f.slowT=0;assert.equal(c.fishAbilityFeedback(f,0,0).flash,false);
});
test('Opacity hooks preserve swim shader and multiply alpha in real Three shader sources',()=>{
 const base=c.cartoonFishMaterial(),material=base.clone();c.withInstanceOpacity(material,s=>base.onBeforeCompile(s));
 const shader={vertexShader:c.THREE.ShaderLib.lambert.vertexShader,fragmentShader:c.THREE.ShaderLib.lambert.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader);
 assert(shader.vertexShader.includes('fishTime'));assert(shader.vertexShader.includes('vAquaOpacity=aquaOpacity;'));
 assert(shader.fragmentShader.includes('diffuseColor.a *= vAquaOpacity;'));assert.equal((shader.vertexShader.match(/attribute float aquaOpacity/g)||[]).length,1);
});
c.dyn=new c.THREE.Group();c.camera3=new c.THREE.PerspectiveCamera();
c.remoteIM={fxDummy:new c.THREE.Object3D(),fxColor:new c.THREE.Color()};
test('Independent fade geometry cannot change the shared fish or respawn-net attributes',()=>{
 const original=c.cartoonFishGeometry('seahorse',true),copy=original.clone();c.addOpacityAttribute(copy,400);
 assert.equal(original.attributes.aquaOpacity,undefined);assert.equal(copy.attributes.aquaOpacity.count,400);
 copy.attributes.aquaOpacity.setX(0,.28);assert.equal(original.attributes.aquaOpacity,undefined);
});
test('Dormant effect batching primitives still have bounded safe transforms',()=>{
 const mesh=c.buildRivalFeedbackBatch(new c.THREE.PlaneGeometry(1,1),{color:0xffffff});
 c.emitRivalFeedback(mesh,{x:10,y:20,z:30},15,3.3,.25,0x75eafa,-1.35);
 assert.equal(mesh.count,1);assert.equal(mesh.geometry.attributes.aquaOpacity.getX(0),.25);
 const mat=new c.THREE.Matrix4();mesh.getMatrixAt(0,mat);assert(mat.elements.every(Number.isFinite));assert.equal(mat.elements[13],-20);
 c.flushRivalBatch(mesh);assert.equal(mesh.instanceMatrix.updateRange.count,16);assert.equal(mesh.instanceColor.updateRange.count,3);assert.equal(mesh.geometry.attributes.aquaOpacity.updateRange.count,1);
 mesh.count=400;c.emitRivalFeedback(mesh,{x:0,y:0,z:0},15,3,.2,0xffffff);assert.equal(mesh.count,400);
 mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();
});
test('Rival feedback has no private barracuda targeting or mass-based glow',()=>{
 const i=html.indexOf('// Species-specific cartoon models with vertex coloured markings and fins.'),j=html.indexOf('// Species silhouettes plus individually placed eyes',i),block=html.slice(i,j);
 assert(!block.includes('lockF'));assert(!block.includes('lockN'));assert(!block.includes('emitRivalFeedback(remoteIM.auras'));assert(!block.includes('emitRivalFeedback(remoteIM.shields')); 
 assert(block.includes('mesh.count=0'));assert(block.includes('if(!f?.alive||rivalSeahorseHidden(f))continue;'));
});
test('Actual rival render path transitions all species from active to normal without stale effects',()=>{
 c.G={sphLo:new c.THREE.SphereGeometry(1,6,4),torus:new c.THREE.TorusGeometry(1,.035,4,8),glowTex:new c.THREE.Texture()};
 const start=html.indexOf('    remoteIM={kinds:{},dummy:new THREE.Object3D(),fxDummy:');
 const end=html.indexOf('  if(!kelpMaterial)',start);
 const setup=html.slice(start,end);vm.runInContext(setup.slice(0,setup.lastIndexOf('  }')),c);
 c.fishes=Object.keys(A.SP).map((sp,i)=>({sp,i,alive:true,mass:100,displayMass:100,x:i*10,y:200,z:0,vx:30,vy:0,vz:0,abilT:1,prot:1,inflateBlend:sp==='puffer'?1:0,flickT:sp==='guppy'?.5:0,camoT:sp==='seahorse'?1:0}));
 vm.runInContext(html.slice(html.indexOf('function stagedNetNearCap('),html.indexOf('function rebuild3D(){')),c);
 Object.assign(c,{coarsePointer:false,fm:[],playerRole:'fisher',t:3,respawnBatches:[],cam:{x:0,y:200,z:0},rad:A.rad,inflateRadiusFactor:A.create().inflateRadiusFactor,lerpAng:A.lerpAng,clamp:A.clamp,k10:.2});
 const b=html.indexOf('  if(remoteIM){\n    cartoonSwimTime.value=t;'),e=html.indexOf('  // Species silhouettes plus individually placed eyes',b),block=html.slice(b,e);
 vm.runInContext(block,c);
 assert.equal(c.remoteIM.auras,null);assert.equal(c.remoteIM.shields,null);assert.equal(c.remoteIM.flashes,null);
 assert.equal(c.remoteIM.kinds.seahorse.fadeNear?.count||0,0);assert.equal(c.remoteIM.kinds.seahorse.near.count,0);
 assert.equal(c.remoteIM.kinds.seahorse.far.count,0,'camouflaged opponent does not enter any render batch');
 for(const f of c.fishes){f.abilT=0;f.camoT=0;f.prot=0;f.flickT=0;}
 vm.runInContext(block,c);assert.equal(c.remoteIM.auras,null);assert.equal(c.remoteIM.shields,null);assert.equal(c.remoteIM.flashes,null);assert.equal(c.remoteIM.kinds.seahorse.fadeNear?.count||0,0);assert.equal(c.remoteIM.kinds.seahorse.near.count,1);
 for(const f of c.fishes)f.alive=false;vm.runInContext(block,c);for(const pair of Object.values(c.remoteIM.kinds))assert.equal(pair.near.count+pair.far.count,0);
});
console.log(`${passed} rival feedback checks passed`);
