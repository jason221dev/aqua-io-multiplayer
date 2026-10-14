'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Aqua=require('../aqua_sim');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.js','utf8');
let checks=0;
function ok(cond,label){assert.ok(cond,label);checks++;console.log('PASS',label)}
ok(/const SOLO_FISH_CAP=200, SOLO_COMPETING=8, NNPC=SOLO_FISH_CAP-SOLO_COMPETING;/.test(html),'one source of truth for solo 200-fish split');
ok(/npcCount:NNPC,maxTotalFish:SOLO_FISH_CAP/.test(html),'single-player always passes total cap to sim');
ok(/const capped=ROOM_CAP<=200/.test(server)&&/Math\.min\(192,Math\.max\(0,200-ROOM_CAP\)\)/.test(server),'normal multiplayer rooms reserve population for late joins');
function mk(slots, opts={}){const sim=Aqua.create();sim.newMatch({sp:'guppy',seed:1234,quick:true,slots,npcCount:192,maxTotalFish:200,...opts});return sim}
for(const role of ['fish','fisher']){
 const slots=role==='fish'?{fish:[{pid:'you',sp:'guppy'}]}:{fishers:[{pid:'you'}]};
 const sim=mk(slots);
 ok(sim.fishes.length===8,`${role}: 8 competing fish`);
 ok(sim.npcs.length===192,`${role}: 192 ambient fish`);
 ok(sim.fishes.length+sim.npcs.length===200,`${role}: exact total 200 fish`);
 ok(sim.fishers.length===2,`${role}: at most 2 fishermen`);
 for(let i=0;i<150;i++)sim.step({},1/60);
 ok(sim.fishes.length+sim.npcs.length===200,`${role}: total remains 200 during play`);
 const restored=Aqua.create();restored.restore(JSON.parse(JSON.stringify(sim.snapshot())));
 ok(restored.fishes.length+restored.npcs.length===200&&restored.snapshot().populationCap===200,`${role}: snapshot/restore retains cap`);
}
{
 const s=mk({fish:[{pid:'p0'}]}, {npcCount:9999});
 ok(s.npcs.length===192,'excess NPC request is clamped to 200 total');
}
{
 const s=mk({fish:Array.from({length:200},(_,i)=>({pid:'p'+i}))},{npcCount:300});
 ok(s.fishes.length===200&&s.npcs.length===0,'200 competing fish leave zero ambient slots');
 ok(!s.addFishPlayer({pid:'overflow',sp:'koi'}),'201st competing fish rejected when cap is full');
 ok(s.fishers.length===2,'two fishermen remain available alongside maximum fish');
}
{
 const s=mk({fish:Array.from({length:8},(_,i)=>({pid:'p'+i}))},{npcCount:190});
 ok(s.fishes.length+s.npcs.length===198,'multiplayer starts below cap with reserved slots');
 ok(!!s.addFishPlayer({pid:'late1',sp:'koi'}),'first late join admitted');
 ok(!!s.addFishPlayer({pid:'late2',sp:'koi'}),'second late join admitted');
 ok(s.fishes.length+s.npcs.length===200,'late joins use reserved fish slots up to 200');
 for(let i=0;i<7;i++)s.addFishPlayer({pid:'extra'+i,sp:'koi'});
 ok(s.fishes.length+s.npcs.length<=200,'late human joins cannot exceed 200 fish');
}
{
 const s=mk({fish:[{pid:'p0'}],fishers:Array.from({length:5},(_,i)=>({pid:'f'+i}))});
 ok(s.fishers.length===2&&s.fishers.filter(f=>f.human).length===2,'overfull fisherman roster clamped to two');
}
{
 const s=Aqua.create();s.newMatch({seed:8,npcCount:240,slots:{fish:[{pid:'p1'}]}});
 ok(s.npcs.length===240&&s.snapshot().populationCap===undefined,'legacy large benchmark remains separately configurable');
}
new vm.Script(html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1]);
ok(true,'standalone browser client parses');
console.log(`\n${checks} population and browser checks passed`);
