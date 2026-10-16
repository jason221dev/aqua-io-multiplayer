 'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const sim=fs.readFileSync(path.join(base,'aqua_sim.js'),'utf8');
const motion=fs.readFileSync(path.join(base,'motion_v2.js'),'utf8');
const MV=require('../motion_v2');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const transport=scripts.find(s=>s.includes('root.AquaMotionV2=api;'));
assert(transport);assert(transport.includes('const META_FIELDS='));assert(transport.includes('function packFishMeta('));
const ctx=vm.createContext({TextEncoder,TextDecoder,Uint8Array,DataView,ArrayBuffer,console,Math});vm.runInContext(transport,ctx);
assert.equal(ctx.AquaMotionV2.VERSION,MV.VERSION);
assert.deepEqual(Array.from(ctx.AquaMotionV2.META_FIELDS),Array.from(MV.META_FIELDS));
const fish={alive:true,air:true,holding:false,prot:0,shockT:.7,eelSlowT:3.2,clownSlowT:1.5,clownGuardT:0,spectateTarget:154,lungeTarget:{sp:'guppy',i:13},kills:3};
const pack=MV.packFishMeta(fish,5,v=>Math.round(v*10)/10);
assert.equal(pack.length,MV.META_FIELDS.length+1);
const packet=MV.encode({tick:77,t:1.5,f:[],extra:{mc:1,fm:[pack]}});
const node=MV.decode(packet),browser=ctx.AquaMotionV2.decode(packet);
assert.deepEqual(JSON.parse(JSON.stringify(browser.fm)),JSON.parse(JSON.stringify(node.fm)));
assert.equal(node.fm[0][1].spectateTarget,154);
assert.equal(node.fm[0][1].eelSlowT,3.2);
assert.equal(node.fm[0][1].clownSlowT,1.5);
const template=fs.readFileSync(path.join(base,'index.template.html'),'utf8');
assert(template.includes('/* AQUA_BUILD_SIM */'));assert(template.includes('/* AQUA_BUILD_MOTION_V2 */'));
assert(!template.includes('const Aqua=(()=>{'));
assert(!template.includes('root.AquaMotionV2=api;'));
assert(html.includes(motion.trimEnd()));
assert(html.includes(sim.trim().replace(/\nif\(typeof module!=='undefined'&&module\.exports\)module\.exports=Aqua;\s*$/,'')));
const result=cp.spawnSync(process.execPath,['tools/build.js','--check'],{cwd:base,encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
// Mutation must fail the build check, not silently overwrite the deployed artifact.
const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'aqua-build-contract-'));
try{
 fs.mkdirSync(path.join(tmp,'tools'));for(const name of ['index.template.html','index.html','aqua_sim.js','motion_v2.js'])fs.copyFileSync(path.join(base,name),path.join(tmp,name));
 fs.copyFileSync(path.join(base,'tools/build.js'),path.join(tmp,'tools/build.js'));
 fs.appendFileSync(path.join(tmp,'motion_v2.js'),'\n// deliberate drift\n');
 const bad=cp.spawnSync(process.execPath,['tools/build.js','--check'],{cwd:tmp,encoding:'utf8'});
 assert.notEqual(bad.status,0,'stale browser/client must fail the build gate');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
console.log('PASS v1.5.38 canonical build, metadata schema, browser/Node transport parity, stale-build rejection');
