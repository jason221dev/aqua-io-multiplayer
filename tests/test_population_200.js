'use strict';
const A=require('../aqua_sim'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),server=fs.readFileSync('server.js','utf8');
let n=0;const ok=(v,msg)=>{assert.ok(v,msg);n++;console.log('PASS',msg)};
const mk=(mode='free',slots={fish:[{pid:'me'}]})=>{const s=A.create();s.newMatch({seed:1977,mode,slots,npcCount:0,competitorCount:200,maxTotalFish:200});return s};
ok(html.includes('const SOLO_FISH_CAP=200, SOLO_COMPETING=200, NNPC=0;'),'solo 200 competitors, no ambient fish');
ok(html.includes('const dense=fishes.length>24;'),'mobile GPU instancing enabled in solo');
ok(server.includes('const competitiveCount=ROOM_CAP>200?400:200;'),'multiplayer mode uses competitive roster');
for(const role of ['fish','fisher']){
 const s=mk('free',role==='fish'?{fish:[{pid:'me'}]}:{fishers:[{pid:'me'}]});
 ok(s.fishes.length===200&&s.npcs.length===0,role+': 200 actual competing fish and zero ambient');
 ok(s.fishes.every(f=>f.alive&&f.mass===100),role+': equal start mass 100');
 ok(s.fishers.length===2,role+': max two fishermen');
 ok(s.plank.length===320&&s.plank.every(p=>p.y>=14&&p.y<=27),role+': surface food swarms');
 const r=A.create();r.restore(JSON.parse(JSON.stringify(s.snapshot())));
 ok(JSON.stringify(s.snapshot())===JSON.stringify(r.snapshot()),role+': restores food and roster');
}
{
 const s=mk(),f=s.fishes[0],p=s.plank[0];f.x=p.x;f.y=p.y;f.z=p.z;
 s.step({me:{mv:{x:0,y:0,z:0}}},1/60);
 ok(f.mass>100,'fish can eat floating pellets to grow');
 ok(p.y>=14&&p.y<=27,'pellet respawns at surface');
 s.botThink(s.fishes[12]);ok(s.fishes[12].wy<0,'AI moves toward surface food');
 ok(!!s.addFishPlayer({pid:'late'})&&s.fishes.length===200,'late player replaces a bot instead of adding 201st fish');
}
{
 const s=mk('last');for(const f of s.fishes.slice(1))s.kill(f,'eaten');
 s.step({},1/30);ok(s.state==='end'&&s.fishes.filter(f=>f.alive).length===1,'Last Fish Standing ends with a single living competitor');
}
{
 const s=mk();s.kill(s.fishes[12],'eaten');for(let i=0;i<115;i++)s.step({},1/30);
 ok(s.fishes[12].alive&&s.fishes.length===200,'Free Roam respawns without extra fish');
}
new vm.Script(html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1]);ok(true,'browser compiles');
console.log(n+' population assertions passed');
