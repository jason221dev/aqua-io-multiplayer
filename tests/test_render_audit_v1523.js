'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),A=require('../aqua_sim');
let passed=0;
function test(n,f){f();passed++;console.log('PASS '+n)}
function section(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i);return html.slice(i,j)}
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
test('Every inline script parses',()=>scripts.forEach(s=>new vm.Script(s)));
const ctx=vm.createContext({console,SP:A.SP,Math});vm.runInContext(scripts.find(s=>s.includes('const e="128"')),ctx);
vm.runInContext(section('function fishBodyDims','function buildFish'),ctx);
const geometryStats=[];
test('All 13 species and both LODs have finite indexed geometry and valid bounds',()=>{
 for(const sp of Object.keys(A.SP))for(const near of [true,false]){
  const g=ctx.cartoonFishGeometry(sp,near),p=g.attributes.position;
  for(const a of Object.values(g.attributes))for(const n of a.array)assert(Number.isFinite(n),sp);
  for(const i of g.index.array)assert(i>=0&&i<p.count,sp);
  assert(Number.isFinite(g.boundingSphere.radius)&&g.boundingSphere.radius>0,sp);assert.equal(g.attributes.fishFlex.count,p.count);
  geometryStats.push({species:sp,lod:near?'near':'far',triangles:g.index.count/3,vertices:p.count});
 }
});
test('Instance disposal emits cleanup without destroying shared geometry',()=>{
 const g=ctx.cartoonFishGeometry('puffer',true),mat=ctx.cartoonFishMaterial(),m=new ctx.THREE.InstancedMesh(g,mat,400);let disposed=0,geoDisposed=0;
 m.addEventListener('dispose',()=>disposed++);g.addEventListener('dispose',()=>geoDisposed++);m.dispose();assert.equal(disposed,1);assert.equal(geoDisposed,0);
});
test('Focus reset clears keyboard, observer movement, pending abilities and sends stop',()=>{
 let stops=0;const c=vm.createContext({swimPointers:new Set(),keys:{w:1},joy:{on:true},orb:{},observerStick:{id:2,dx:1,dy:-1},observerLook:{id:3},observerVertical:{rise:true,dive:true},tapQ:2,playerRole:'fish',stopSwimNow:()=>stops++});
 vm.runInContext(section('function resetInput(){',"C.addEventListener('pointerdown'"),c);c.resetInput();
 assert.equal(stops,1);assert.equal(c.observerStick.dx,0);assert.equal(c.observerStick.id,null);assert.equal(c.observerLook.id,null);assert.equal(c.observerVertical.rise,false);assert.equal(c.tapQ,0);assert.equal(Object.keys(c.keys).length,0);
});
test('Swallow meshes are released when player mesh is absent',()=>{
 let removed=0,disposed=0;const c=vm.createContext({fm:[],human:{i:0,alive:false},swallows:[{e:{wrap:{}}}],scene:{remove:()=>removed++},disposeTree:()=>disposed++});
 vm.runInContext(section('function animateSwallows(){','const JR='),c);c.animateSwallows();assert.equal(removed,1);assert.equal(disposed,1);assert.equal(c.swallows.length,0);
});
test('Animation phase is continuous across a sudden speed change late in a match',()=>{
 const code=section('const spd=Math.min(1,sp/260);','const drive=');
 const c=vm.createContext({Math,e:{swimPhase:1},sp:0,dt:1/60,m:{frequency:9},i:0});vm.runInContext('{'+code+'}',c);const before=c.e.swimPhase;c.sp=260;vm.runInContext('{'+code+'}',c);assert(Math.abs(c.e.swimPhase-before)<.24);
});
test('Remote inflation and LOD remain wired, without rival ability indicators',()=>{
 const block=section('// Species-specific cartoon models with vertex coloured markings and fins.','// Species silhouettes plus individually placed eyes');
 assert(block.includes('inflateRadiusFactor(f)'));assert(!block.includes('emitRivalFeedback(remoteIM.shields'));assert(block.includes('n>=mesh.instanceMatrix.count'));assert(block.includes('selectRivalNearDetail(fishes,fm,cam,camera3.position,detailCap)'));assert(html.includes('const limit=f.cartoonNear?650:540'));assert(html.includes('if(document.hidden||(tackleOpen&&!online.started))'));
});
test('Tackle pauses offline play but online interpolation and rendering continue',()=>{
 for(const started of [false,true]){
  let stepped=0,smoothed=0,drawn=0,scheduled=0;
  const c=vm.createContext({Math,last:0,document:{hidden:false},tackleOpen:true,online:{started,active:started},state:'play',playerRole:'fisher',observerMode:'off',renderer:{},hudN:0,
   SHOW_PERF:false,recordSplashPerformance:()=>{},stepLocal:()=>stepped++,smoothOnline:()=>smoothed++,applyAutomaticWaterEntryPitch:()=>{},chooseBiteTarget:()=>{},flushBiteHaptic:()=>{},hud:()=>{},$:()=>({style:{}}),draw3D:()=>drawn++,graphicsFailure:e=>{throw e},requestAnimationFrame:()=>scheduled++});
  vm.runInContext(section('function loop(now){','const rodCal='),c);c.loop(16);
  assert.equal(stepped,0);assert.equal(smoothed,Number(started));assert.equal(drawn,Number(started));assert.equal(scheduled,1);
 }
});
test('Server neutralizes stale fish and boat inputs after packet loss',()=>{
 const server=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
 let now=1000;const c=vm.createContext({stamp:()=>now});
 vm.runInContext(server.slice(server.indexOf('function playerFrame(p){'),server.indexOf('function stepRoom(')),c);
 const p={role:'fish',queue:{inputAt:1000,mv:{x:1,y:0,z:0},tap:1}};
 assert.equal(c.playerFrame(p).mv.x,1);now=1751;assert.equal(c.playerFrame(p).mv.x,0);
 const boat={role:'fisher',queue:{inputAt:1000,stick:{x:1,y:1},ev:[{t:'cast'}],hook:7,reel:{hold:true,holdAt:1750}}};
 const f=c.playerFrame(boat);assert.equal(f.stick.x,0);assert.equal(f.reel.hold,false);assert.equal(f.hook,0);assert.equal(f.ev.length,0);
});
console.log(JSON.stringify({passed,geometryStats},null,2));
