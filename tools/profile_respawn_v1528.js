'use strict';
const A=require('../aqua_sim'),{performance}=require('node:perf_hooks');
for(const population of [25,100,200]){
 const sim=A.create();sim.newMatch({sp:'guppy',mode:'free',seed:1528,competitorCount:population,maxTotalFish:population,npcCount:0,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}});
 const h=sim.fishes[0];sim.kill(h,'caught');
 const phases={};let dt=1/30;
 for(let k=0;k<1200;k++){
 const before=sim.t;const mark=performance.now();sim.step({},dt);const ms=performance.now()-mark;
 const phase=before>=9.7&&before<10.4?'batch':before>=10.4&&before<12?'post':before>=4&&before<9.7?'held':before>=12?'later':'early';
 const p=phases[phase]||(phases[phase]={n:0,sum:0,max:0,spikes:0});p.n++;p.sum+=ms;p.max=Math.max(p.max,ms);p.spikes+=ms>5?1:0;
 }
 console.log(population,Object.fromEntries(Object.entries(phases).map(([phase,p])=>[phase,{n:p.n,avg:+(p.sum/p.n).toFixed(3),max:+p.max.toFixed(3),spikes:p.spikes}])));
}
