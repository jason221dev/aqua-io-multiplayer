const A=require(process.argv[2]+'/aqua_sim'),{performance}=require('node:perf_hooks');
const sim=A.create();sim.newMatch({sp:'guppy',mode:'free',seed:1528,competitorCount:200,maxTotalFish:200,npcCount:0,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}});
sim.kill(sim.fishes[0],'caught');let sum=0,n=0;
for(let k=0;k<1500;k++){const m=performance.now();sim.step({},1/30);const d=performance.now()-m;if(k>=150){sum+=d;n++}}
console.log((sum/n).toFixed(3));
