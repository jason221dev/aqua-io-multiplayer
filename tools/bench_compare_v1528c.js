'use strict';
const {performance}=require('node:perf_hooks');
const before=require('../audit/baseline_aqua_sim_v1528b.js');
const after=require('../aqua_sim.js');
const spec={sp:'guppy',mode:'free',seed:1528,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}};
const phases=[['early',0,150],['held',150,300],['post',300,450],['late',450,1200]];
function bench(A){const sim=A.create();sim.newMatch(spec);sim.kill(sim.fishes[0],'caught');const perf=[];
for(let k=0;k<1200;k++){const start=performance.now();sim.step({},1/30);perf.push(performance.now()-start)}
return Object.fromEntries(phases.map(([name,start,end])=>[name,perf.slice(start,end).reduce((a,b)=>a+b,0)/(end-start)]));}
const results=[];
for(let run=0;run<4;run++){const record={run};for(const [name,engine] of (run%2?[['after',after],['before',before]]:[['before',before],['after',after]])) record[name]=bench(engine);results.push(record);console.log(JSON.stringify(record))}
const avg=(version,phase)=>results.reduce((sum,v)=>sum+v[version][phase],0)/results.length;
console.log('SUMMARY '+JSON.stringify(Object.fromEntries(phases.map(([phase])=>[phase,{before:+avg('before',phase).toFixed(3),after:+avg('after',phase).toFixed(3),deltaPct:+((avg('after',phase)/avg('before',phase)-1)*100).toFixed(1)}]))));
