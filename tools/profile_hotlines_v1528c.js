'use strict';
const inspector=require('node:inspector');
const fs=require('node:fs');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const A=require(process.argv[2]||'../aqua_sim');
const session=new inspector.Session();session.connect();
const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(e,r)=>e?reject(e):resolve(r)));
(async()=>{
const sim=A.create();sim.newMatch({sp:'guppy',mode:'free',seed:1528,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}});sim.kill(sim.fishes[0],'caught');
for(let i=0;i<150;i++)sim.step({},1/30);
await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
const t0=performance.now();for(let i=150;i<1500;i++)sim.step({},1/30);
const ms=performance.now()-t0;const {profile}=await post('Profiler.stop');session.disconnect();
const byFunc=new Map(),byLine=new Map();
for(const node of profile.nodes){
 if(!node.callFrame.url.endsWith('aqua_sim.js')&&!node.callFrame.url.endsWith('baseline_aqua_sim_v1528b.js'))continue;
 const name=node.callFrame.functionName||'anonymous';
 byFunc.set(name,(byFunc.get(name)||0)+(node.hitCount||0));
 for(const pos of node.positionTicks||[]){
   const key=`${name}:L${pos.line}`;
   byLine.set(key,(byLine.get(key)||0)+pos.ticks);
 }
}
const rank=m=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,35);
console.log(JSON.stringify({tickAvgMs:ms/1350,totalMs:ms,profileSamples:profile.samples.length,functionsBySamples:rank(byFunc),sourceLinesBySamples:rank(byLine)},null,2));
if(process.env.SAVE_PROFILE)fs.writeFileSync(path.resolve(process.env.SAVE_PROFILE),JSON.stringify(profile));
})().catch(e=>{console.error(e);process.exitCode=1});
