'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Aqua=require('../aqua_sim');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
let n=0;
function check(name,fn){fn();console.log('PASS',name);n++}
function createGame(mode='last'){
 const s=Aqua.create();s.newMatch({sp:'guppy',mode,seed:787,competitorCount:4,maxTotalFish:4,npcCount:0,miniFishCount:0,
 slots:{fish:[{pid:'VICTIM',sp:'guppy'},{pid:'EATER',sp:'tuna'},{pid:'SECOND',sp:'barra'},{pid:'THIRD',sp:'koi'}]}});
 const [v,e,second,third]=s.fishes;
 Object.assign(v,{x:1000,y:300,z:50,mass:100,prot:0});
 Object.assign(e,{x:1000,y:300,z:50,mass:850,prot:0});
 Object.assign(second,{x:2500,y:300,z:50,mass:600,prot:0});
 Object.assign(third,{x:3000,y:300,z:50,mass:700,prot:0});
 return {s,v,e,second,third};
}
const start=html.indexOf('// Free Roam replays the eater for six seconds; Last Fish Standing follows');
const stop=html.indexOf('const cameraCollisionTarget=',start);
assert.ok(start>=0&&stop>start,'complete spectator function block');
const block=html.slice(start,stop);
function cameraHarness(game, clock=1000){
 const context={human:game.v,sim:game.s,selectedMode:game.s.rules.mode,fishes:game.s.fishes,performance:{now:()=>clock}};
 vm.createContext(context);
 vm.runInContext(block,context);
 return {target:()=>vm.runInContext('cameraTarget()',context),follow:()=>vm.runInContext('eaterFollow()',context),remaining:()=>vm.runInContext('eaterFollowRemaining()',context),clock:v=>{clock=v}};
}
check('Last Fish Standing sets indefinite spectator duration and no respawn',()=>{
 const g=createGame();g.s.kill(g.v,'eaten',g.e);
 assert.equal(g.v.spectateTarget,g.e.i);assert.equal(g.v.spectateT,-1);assert.equal(g.v.respawn,0);
});
check('Last Fish Standing keeps -1 after more than six simulation seconds',()=>{
 const g=createGame();g.s.kill(g.v,'eaten',g.e);
 g.s.step({},8);assert.equal(g.v.alive,false);assert.equal(g.v.spectateT,-1);
});
check('camera tracks same predator after 6s, 30s, and 5min',()=>{
 const g=createGame();g.s.kill(g.v,'eaten',g.e);
 const cam=cameraHarness(g);
 assert.equal(cam.follow(),g.e);
 for(const time of [7001,30000,300000]){cam.clock(time);assert.equal(cam.follow(),g.e);assert.equal(cam.target(),g.e)}
});
check('if predator gets eaten, camera tracks the new predator continuously',()=>{
 const g=createGame();g.s.kill(g.v,'eaten',g.e);
 const cam=cameraHarness(g);
 assert.equal(cam.follow(),g.e);
 g.s.kill(g.e,'eaten',g.second);
 cam.clock(31000);assert.equal(cam.target(),g.second);
 g.s.kill(g.second,'eaten',g.third);
 cam.clock(300000);assert.equal(cam.follow(),g.third);
});
check('if original eater is caught by fisherman, camera targets largest living rival',()=>{
 const g=createGame();g.s.kill(g.v,'eaten',g.e);
 const cam=cameraHarness(g);assert.equal(cam.follow(),g.e);
 g.s.kill(g.e,'caught');assert.equal(cam.follow(),g.third);
});
check('camera fallback tolerates no survivors without errors',()=>{
 const g=createGame();g.s.kill(g.v,'eaten',g.e);
 const cam=cameraHarness(g);for(const f of g.s.fishes.slice(1))g.s.kill(f,'caught');
 assert.equal(cam.follow(),null);assert.equal(cam.target(),g.v);
});
check('free roam still expires at 6s, enters a holding net, then batch-drops protected',()=>{
 const g=createGame('free');g.s.kill(g.v,'eaten',g.e);
 const cam=cameraHarness(g);
 assert.equal(cam.follow(),g.e);cam.clock(7100);
 assert.equal(cam.follow(),null);
 g.s.step({},6.1);assert.equal(g.v.alive,false);assert.equal(g.v.holding,true);
 g.s.step({},3.8);assert.equal(g.v.alive,false);assert.equal(g.v.holding,true);
 g.s.step({},.11);assert.equal(g.v.alive,true);assert.equal(g.v.holding,false);assert.ok(g.v.prot>5.8&&g.v.prot<=6);
});
check('Last Fish Standing result overlay is not delayed at match conclusion',()=>{
 assert.match(html,/if\(playerRole==='fish'&&sim\.rules\.mode!=='last'&&eaterFollow\(\)\)/);
 assert.match(html,/if\(rules\.mode==='last'\)\{\s*\/\/ Competing fish alone/);
 assert.match(html,/FOLLOWING PREDATOR · UNTIL MATCH ENDS/);
});
check('network metadata can carry indefinite -1 value',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 const motion=fs.readFileSync(path.join(__dirname,'../motion_v2.js'),'utf8');
 assert.ok(src.includes('q(f.spectateT||0),f.spectateTarget??-1'));
 assert.ok(motion.includes("'spectateT','spectateTarget'"));
 const g=createGame();g.s.kill(g.v,'eaten',g.e);
 const ss=g.s.snapshot(),clone=Aqua.create();clone.restore(ss);
 assert.equal(clone.fishes[g.v.i].spectateT,-1);
 assert.equal(clone.fishes[g.v.i].spectateTarget,g.e.i);
});
console.log(`${n} v1.5.11 perpetual last-fish camera tests passed`);
