const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Aqua=require('../aqua_sim');
const {predatorChain}=require('../spectator_metadata');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
let passed=0;function check(name,fn){fn();console.log('PASS '+name);passed++}
function fixture(){
 const s=Aqua.create();s.newMatch({sp:'guppy',mode:'last',seed:9,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,
 slots:{fish:[{pid:'Victim',sp:'guppy'},{pid:'Pred1',sp:'tuna'},{pid:'Pred2',sp:'barra'},{pid:'Pred3',sp:'koi'}]}});
 return s;
}
check('Remote predator succession chain traverses multiple fish and includes remote IDs',()=>{
 const s=fixture(),[victim,a,b,c]=s.fishes;
 s.kill(victim,'eaten',a);s.kill(a,'eaten',b);s.kill(b,'eaten',c);
 const result=predatorChain(s.fishes,victim.i);
 assert.deepEqual([...result],[a.i,b.i,c.i]);
 assert(c.alive);
});
check('Remote predator metadata terminates on capture and safely excludes unrelated fish',()=>{
 const s=fixture(),[victim,a,b,c]=s.fishes;
 s.kill(victim,'eaten',a);s.kill(a,'caught');
 assert.deepEqual([...predatorChain(s.fishes,victim.i)],[a.i]);
 assert.equal(predatorChain(s.fishes,victim.i).has(c.i),false);
});
check('Corrupt or cyclic spectator target chains terminate deterministically',()=>{
 const s=fixture(),[v,a,b]=s.fishes;
 v.spectateTarget=a.i;a.alive=false;a.spectateTarget=b.i;b.alive=false;b.spectateTarget=a.i;
 assert.deepEqual([...predatorChain(s.fishes,v.i)],[a.i,b.i]);
 assert.deepEqual([...predatorChain(s.fishes,999)],[]);
});
check('Deployment selects predator metadata beyond 900-unit proximity filter',()=>{
 assert(server.includes('predatorChain(sim.fishes,self.i)'));
 assert(server.includes('||watched?.has(i)'));
});
check('Fishing NET HUD gates precisely on server-matching canLandFish predicate',()=>{
 assert(html.includes("const ready=!!(c?.state==='fight'&&canLandFish(fr,c,c.fish?.[0]))"));
 assert(html.includes("if(canLandFish(fr,c,c.fish?.[0])){evQ.push({t:'land'})"));
 assert(!html.includes("if(c.landReady||c.netGrace>0){evQ.push({t:'land'})"));
});
check('Net button and authoritative netting both reject invalid depth and line tension',()=>{
 const s=Aqua.create();s.newMatch({sp:'guppy',mode:'free',seed:5,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0,
 slots:{fish:[{pid:'F'}],fishers:[{pid:'A'}]}});
 const fr=s.fishers[0],f=s.fishes[0];
 f.x=fr.x+85;f.z=fr.z;f.y=100;f.prot=0;
 const cast={state:'bite',fish:[f],x:f.x,y:f.y,z:f.z};fr.cast=cast;
 assert(s.beginPhysicalFight(fr,cast,f));cast.landReady=true;cast.netGrace=.3;
 cast.tension=1.10;s.applyInputs({A:{ev:[{t:'land'}]}});assert.equal(fr.caught,0);
 cast.tension=.4;f.y=280;s.applyInputs({A:{ev:[{t:'land'}]}});assert.equal(fr.caught,0);
 f.y=100;s.applyInputs({A:{ev:[{t:'land'}]}});assert.equal(fr.caught,1);
});
check('Last Fish Standing winner ends match without a spectator timeout',()=>{
 const s=fixture(),[victim,a]=s.fishes;
 s.kill(victim,'eaten',a);
 assert.equal(victim.spectateT,-1);assert.equal(victim.respawn,0);
 for(const f of s.fishes.slice(2))s.kill(f,'caught');
 s.step({},.1);assert.equal(s.state,'end');
});
check('Build and standalone source embed all three camera paths and six-second protection',()=>{
 assert.match(html,/function observerFlight\(dt\)/);
 assert.match(html,/function eaterFollow\(\)/);
 assert.match(html,/function largestLiveFish\(\)/);
 assert.match(html,/fishSpawnShield:6/);
});
console.log(`${passed} v1.5.13 hardening checks passed`);
