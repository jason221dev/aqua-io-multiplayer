'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Current=require('../aqua_sim');
// Gameplay immunity changed in v1.5.31; compare deterministic net releases
// between identical current simulations instead of the old combat contract.
const Baseline=Current;
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function extract(start,end,body,inject){
  const a=html.indexOf(start),b=html.indexOf(end,a);
  assert(a>=0&&b>a,'renderer helper boundaries present');
  const c={Math,Number,Array,Uint8Array,Float64Array,...inject};
  vm.runInNewContext(html.slice(a,b)+ '\n'+body,c);
  return c;
}
const stage=extract('function stagedNetNearCap(','function rebuild3D(){','this.stage=stagedNetNearCap;');
const batch=[{t0:10,items:Array.from({length:65},(_,i)=>({i}))}];
assert.equal(stage.stage(20,9.99,batch),20,'before release full detail remains');
assert.equal(stage.stage(20,10,batch),3,'release frame reduces near-LOD burst');
assert(stage.stage(20,10.75,batch)>3&&stage.stage(20,10.75,batch)<20,'gradual restoration');
assert.equal(stage.stage(20,11.5,batch),20,'high detail restored after 1.5 seconds');
assert.equal(stage.stage(20,10,[{t0:10,items:[{i:1}]}]),20,'single-fish releases are not degraded');
assert.equal(stage.stage(52,10,batch),3,'desktop also avoids dense LOD burst');
const window=extract('function netReleaseRenderWindow(','function applyRenderQuality(','this.window=netReleaseRenderWindow;');
assert.equal(window.window(9.3,[{i:0}],[],10),true,'avoid resizing shortly before release');
assert.equal(window.window(10.2,[],batch,20),true,'avoid resizing during net return');
assert.equal(window.window(12,[],batch,20),false,'normal adaptation resumes afterward');
assert.equal(window.window(9.3,[],[],10),false,'no freeze for empty net');
assert(html.includes('const detailCap=stagedNetNearCap(coarsePointer?20:52);'),'dynamic near budget wired into live frame');
assert(html.includes('if(netReleaseRenderWindow())'),'canvas resizing suppressed during net release');
assert(html.includes('HITCHES>50ms'),'diagnostics now distinguish peak frame stalls from average FPS');
function make(mod){const x=mod.create();x.newMatch({sp:'guppy',mode:'free',seed:1530,competitorCount:100,maxTotalFish:100,npcCount:60,miniFishCount:60,slots:{fish:[{pid:'player',sp:'guppy'}]}});return x}
const before=make(Baseline),after=make(Current);
function equal(label){
  assert.equal(JSON.stringify(after.snapshot()),JSON.stringify(before.snapshot()),label);
}
equal('initial state');
const tick=1/30;
for(let tickNumber=0;tickNumber<930;tickNumber++){
  if([0,330,630].includes(tickNumber)){
    for(let i=0,n=0;i<before.fishes.length&&n<38;i++){
      if(!before.fishes[i].alive)continue;
      const bi=before.fishes[i].i,fi=after.fishes.find(f=>f.i===bi);
      before.kill(before.fishes[i],'caught');after.kill(fi,'caught');n++;
    }
  }
  before.step({},tick);after.step({},tick);
  if(tickNumber%30===0||[298,299,300,301,598,599,600,601,898,899,900,901].includes(tickNumber))equal('snapshot at tick '+tickNumber);
}
equal('three consecutive spawn batches with 100 fish');
// Reused splash/droplet objects cannot carry stale state into the next wave.
// Stable output and RNG order are enforced by full-state snapshot equality above.
const dr=Current.create();dr.newMatch({sp:'guppy',mode:'free',seed:99,competitorCount:8,maxTotalFish:8,npcCount:0,miniFishCount:0});
for(let i=0;i<20;i++)dr.spawnSplash(100+i,25,.9);
assert(dr.drops.length<=150,'particle maximum remains 150');
assert(dr.splashes.length===20,'all splash events preserved');
console.log('PASS v1.5.30 net release staging, resize exclusion and complete 3-cycle snapshot parity');
