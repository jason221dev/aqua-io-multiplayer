'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../aqua_sim');
let count=0;
function check(name,fn){fn();console.log('PASS',name);count++}
function hooked(species='guppy',y=85,range=130,seed=41){
  const s=A.create();s.newMatch({sp:species,seed,mode:'free',competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,
    slots:{fish:[{pid:'P',sp:species,name:'Player'}]}});
  const fr=s.fishers[0],f=s.fishes[0];assert(fr&&!fr.human);
  for(const x of s.fishes.slice(1)){x.alive=false;x.respawn=999999}
  f.human=false;f.prot=0;f.x=fr.x+range;f.z=fr.z+5;f.y=y;
  const c=fr.cast={state:'bite',fish:[f],x:f.x,y:f.y,z:f.z};
  assert(s.beginPhysicalFight(fr,c,f));
  return{s,fr,f,c};
}
check('lure is exactly same mass as starting fish',()=>{
 assert.equal(A.LURE_MASS,100);assert.equal(A.STARTER_FISH_MASS,100);
 const {s,fr}=hooked();s.castHumanLure(fr,'goldfish');
 assert.equal(fr.cast.lureMass,100);
 assert.equal(fr.cast.lureSp,'goldfish');
});
check('AI fisher completes a physically eligible net scoop without button input',()=>{
 const {s,fr,f}=hooked('guppy',85,130);
 let time=0;while(fr.cast&&time<25){s.updatePhysicalFight(fr,1/60);time+=1/60;}
 assert.equal(fr.caught,1,`AI did not net within 25s (t=${time.toFixed(2)})`);
 assert.equal(fr.cast,null);assert.equal(f.alive,false);
 const fx=s.drainEvents().filter(e=>e.k==='net');assert.equal(fx.length,1);
 assert.equal(fx[0].fisherIndex,0);assert.equal(fx[0].sp,'guppy');
});
check('AI cannot net fish far away even with accumulated netting',()=>{
 const {s,fr,c,f}=hooked();f.x=fr.x+450;f.z=fr.z;c.netting=.45;
 c.landReady=true;c.netGrace=.3;c.tension=.5;
 assert.equal(s.landHumanFish(fr,c,f),false);
 assert.equal(fr.caught,0);
});
check('AI cannot net a deep fish or one in break-line red',()=>{
 const {s,fr,c,f}=hooked();f.y=270;c.netting=.45;c.landReady=true;c.netGrace=.3;c.tension=.5;
 assert.equal(s.landHumanFish(fr,c,f),false);
 f.y=60;c.tension=1.2;
 assert.equal(s.landHumanFish(fr,c,f),false);
 assert.equal(fr.caught,0);
});
check('net does not bypass natural line solver and catch is scored once',()=>{
 const {s,fr}=hooked('sardine',135,110,73);
 let events=[];for(let i=0;i<60*35&&fr.cast;i++){s.updatePhysicalFight(fr,1/60);events.push(...s.drainEvents().filter(e=>e.k==='net'));}
 assert.equal(fr.caught,1);assert.equal(events.length,1);assert(fr.score>0);
 const score=fr.score;s.updatePhysicalFight(fr,1/60);assert.equal(fr.score,score);
});
check('fish-view decoys use same species fish geometry scaled to 100 mass',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert(html.includes('const LURE_MASS=STARTER_FISH_MASS;'));
 assert(html.includes('const model=buildFish(key,SP[key].col)'));
 assert(html.includes('m.yaw.scale.setScalar(rad(LURE_MASS))'));
 assert(html.includes("if(c?.state==='bait'&&SP[c.lureSp])consider({x:c.x"));
 assert(html.includes('mass:LURE_MASS,kind:c.lureSp'));
 assert(html.includes('isLure:true,lureCast:c'));
 assert(html.includes('!biteTarget.isLure'));
});
check('fish-view renders no fishing line or exposed hook for AI or human anglers',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const block=html.slice(html.indexOf('fishers.forEach((fr,i)=>{updateLureVisual'),html.indexOf('  // Sonar sweep exists in the fish finder only'));
 assert(block.includes('v.lines.forEach(m=>m.visible=false)'));
 assert(block.includes('v.hook.visible=v.net.visible=v.tele.visible=v.tline.visible=v.tring.visible=false'));
 assert(block.includes("if(playerRole!=='fisher')return;"));
 assert(block.includes("if(playerRole==='fisher'&&fr.pid===ME)drawFisherEquipment"));
 const lure=html.slice(html.indexOf('function updateLureVisual('),html.indexOf('function drawFisherEquipment('));
 assert(!lure.includes("c.state==='bite'"),'the swallowed bait must not overlap the hooked fish');
});
check('six-second spawn shield and upgraded species identity remain consistent',()=>{
 assert.equal(A.BALANCE.fishSpawnShield,6);
 assert.equal(A.SP.puffer.cd,12.8);
 assert.equal(A.SP.piranha.cd,11);
 assert.equal(A.ABILITY.ambushBonus,.9);
 assert.equal(A.ABILITY.overshootTime,.65);
});
console.log(`${count} AI-net and 100-mass lure checks passed`);
