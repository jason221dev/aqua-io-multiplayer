'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),A=require('../aqua_sim');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const c=vm.createContext({rad:A.rad,clamp:A.clamp,Aqua:A,FOV:50,inflateRadiusFactor:A.create().inflateRadiusFactor});
vm.runInContext(html.slice(html.indexOf('function playerOpenWaterDistance('),html.indexOf('function draw3D(dt){')),c);
assert(Math.abs(c.playerOpenWaterDistance({mass:100},false)-189.6)<1e-8);
assert(Math.abs(c.playerOpenWaterDistance({mass:100},true)-227.52)<1e-8);
for(const portrait of [false,true]){let prev=0;for(const mass of [100,200,500,1000,2000,5000,10000]){const d=c.playerOpenWaterDistance({mass},portrait);assert(d>=prev&&Number.isFinite(d));assert(d<=A.clamp(240+A.rad(mass)*5,250,520)*(portrait?1.5:1));prev=d;}}
assert.equal(c.playerOpenWaterDistance({mass:10000,displayMass:100},false),189.6);
assert(html.includes('livePlayerChase?playerOpenWaterDistance(ct,W<H,W/Math.max(1,H)):legacyDistance'));
assert(html.includes('Math.min(105,legacyDistance*.42)'));
assert(c.playerOpenWaterDistance({sp:'puffer',mass:10000,inflateBlend:1},true,.45)>c.playerOpenWaterDistance({sp:'puffer',mass:10000,inflateBlend:0},true,.45));
console.log('PASS closer growth-aware player camera, portrait framing and unchanged spectator/interior routes');
assert(html.includes('SOLO_COMPETING=200, NNPC=60'));assert(server.includes('miniFishCount:60'));
assert(html.includes("k==='sardine'?NNPC+5:5"));assert(html.includes('white:faceBatch(NNPC*2'));assert(html.includes('mouth:faceBatch(NNPC,'));
for(const mode of ['free','last']){
 const sim=A.create();sim.newMatch({sp:'guppy',mode,seed:1524,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:60});
 assert.equal(sim.fishes.length,200);assert.equal(sim.npcs.filter(f=>f.mini).length,60);
 const copy=A.create();copy.restore(sim.snapshot());assert.equal(copy.npcs.filter(f=>f.mini).length,60);
 for(let i=0;i<300;i++){sim.step({},1/30);assert.equal(sim.npcs.filter(f=>f.mini).length,60);for(const f of sim.npcs)assert([f.x,f.y,f.z,f.mass].every(Number.isFinite));}
}
console.log('PASS 60-minnow school in both modes, 200 competitors retained, snapshots and render capacities support doubled population');
