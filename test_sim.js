const A=require('./aqua_sim.js');
let pass=0,fail=0;const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n)};
const dtv=.016;
const mk=(seed,slots,extra={})=>{const s=A.create();s.newMatch({sp:'guppy',quick:true,seed,npcCount:200,nurseryProtect:false,slots,...extra});return s};
const J=o=>JSON.stringify(o);
const calm=s=>{s.fishes.forEach((f,i)=>{if(!f.human){f.x=3000+i*40;f.z=-800;f.y=600;f.vx=f.vy=f.vz=0;f.prot=0}});s.npcs.forEach(o=>{o.x=5400;o.z=800;o.y=850;o.vx=o.vy=o.vz=0;o.mass=20})};
const idle=()=>({});
// 1. determinism
{const run=seed=>{const s=mk(seed,{fish:[{pid:'p1'}],fishers:[{pid:'f1'}]});for(let i=0;i<1500;i++)s.step({p1:{mv:{x:Math.sin(i/50),y:0,z:Math.cos(i/70)},tap:i%90===0?1:0},f1:{stick:{x:.2,y:0},mode:'boat',rod:.5}},dtv);return J(s.snapshot())};
 ok('same seed + same inputs => identical snapshot',run(7)===run(7));ok('different seed => different world',run(7)!==run(8))}
// 2. instance isolation
{const solo=mk(11,{fish:[{pid:'p1'}]});for(let i=0;i<800;i++)solo.step({p1:{mv:{x:1,y:0,z:0}}},dtv);
 const a=mk(11,{fish:[{pid:'p1'}]}),b=mk(99,{fish:[{pid:'p9'}]});for(let i=0;i<800;i++){a.step({p1:{mv:{x:1,y:0,z:0}}},dtv);b.step({p9:{mv:{x:0,y:0,z:1}},p1:{mv:{x:-1,y:0,z:0}}},dtv)}
 ok('two live instances do not share state (interleaved run == solo run)',J(a.snapshot())===J(solo.snapshot()))}
// 3. snapshot / restore round trip through JSON
{const s=mk(5,{fish:[{pid:'p1'}],fishers:[{pid:'f1'}]});const inp=i=>({p1:{mv:{x:Math.cos(i/40),y:0,z:Math.sin(i/40)},tap:i%120===0?1:0},f1:{stick:{x:0,y:0},mode:'aim',rod:.4}});
 for(let i=0;i<900;i++)s.step(inp(i),dtv);
 const snap=JSON.parse(J(s.snapshot()));const r=A.create();r.restore(snap);
 for(let i=900;i<1800;i++){s.step(inp(i),dtv);r.step(inp(i),dtv)}
 ok('restore from JSON snapshot then 900 steps == original continued',J(s.snapshot())===J(r.snapshot()))}
// 4. two human fish + two human fishers
{const s=mk(21,{fish:[{pid:'p1',name:'Ann'},null,null,null,null,null,null,null].map((x,i)=>i===3?{pid:'p2',name:'Bo'}:x),fishers:[{pid:'f1',name:'Cy'},{pid:'f2',name:'Di'}]});
 calm(s);const [fr1,fr2]=s.fishers,p1=s.fishes[0],p2=s.fishes[3];
 ok('roster: 2 human fish, 2 human fishers',p1.human&&p2.human&&fr1.human&&fr2.human&&p1.pid==='p1'&&p2.pid==='p2'&&fr1.pid==='f1'&&fr2.pid==='f2');
 // f1 casts at p2's location; f2 does nothing
 fr1.aimX=1000;fr1.aimZ=200;p2.x=1000;p2.z=200;p2.y=300;p2.mass=400;p1.mass=100;p1.x=3000;p1.y=600;p1.z=-800;
 s.step({f1:{ev:[{t:'cast',lure:'koi'}]}},dtv);
 ok('f1 cast a lure; f2 untouched',!!fr1.cast&&fr2.cast===null&&fr1.cast.lureSp==='koi');
 fr1.cast.y=300;for(let i=0;i<3&&fr1.cast.state==='bait';i++)s.step({},dtv);
 ok('human fish p2 (400) touching lure => bite on p2',fr1.cast&&fr1.cast.state==='bite'&&fr1.cast.fish[0]===p2);
 const ev=s.drainEvents();
 ok('bite vibrates only f1 (fisher) -- events addressed by pid',ev.some(e=>e.k==='vib'&&e.to==='f1')&&!ev.some(e=>e.k==='vib'&&e.to!=='f1'));
 ok('feed is addressed to f1',s.feed.some(m=>m.to==='f1'&&/BITE/.test(m.s)));
 const id=fr1.cast.biteId;
 s.step({f1:{hook:id+7}},dtv);ok('hook for a stale/wrong biteId is ignored',fr1.cast.state==='bite');
 s.step({f2:{hook:id}},dtv);ok("f2 cannot hook f1's bite",fr1.cast.state==='bite');
 // p1 (not bitten) tapping must not fill p2's meter
 s.step({p1:{tap:3}},dtv);ok("p1's taps do not touch p2's bite meter",fr1.cast.biteEsc<.0001);
 // p2 taps: rate cap, then frees
 let freed=false,n=0;for(let i=0;i<200&&!freed;i++){s.step({p2:{tap:2}},dtv);n++;freed=fr1.cast===null}
 ok('p2 tap meter frees p2 (tap cap: 2 taps/frame still needs >=2.4 s) ('+(n*dtv).toFixed(2)+' s)',freed&&n*dtv>=2.3);
 ok('p2 protected after break-free + escape counted',p2.prot>0&&p2.esc===1);
 ok('p2 sees "You spat out", f1 sees "Fish spat out"',s.feed.some(m=>m.to==='p2'&&/You spat/.test(m.s))&&s.feed.some(m=>m.to==='f1'&&/Fish spat/.test(m.s)));
 // second bite, fisher hooks first
 fr1.cast=null;fr1.cd=0;s.step({f1:{ev:[{t:'cast',lure:'koi'}]}},dtv);fr1.cast.y=300;fr1.cast.x=p2.x;fr1.cast.z=p2.z;p2.prot=0;s.step({},dtv);
 ok('re-bite',fr1.cast&&fr1.cast.state==='bite');
 const id2=fr1.cast.biteId;ok('bite ids are unique and increasing',id2>id);
 s.step({f1:{hook:id2}},dtv);
 ok('fisher hook with matching biteId => human fish p2 is hooked',!!p2.hooked&&p2.hooked.fr===fr1&&fr1.cast.state==='fight');
 const before=p2.hooked.esc;s.step({p2:{tap:1}},dtv);ok('tap while hooked adds to escape meter (+0.05)',Math.abs(p2.hooked.esc-before-.05)<1e-9);
 ok('hook event addressed to f1 only, "HOOKED" feed',s.feed.some(m=>m.to==='f1'&&/HOOKED/.test(m.s)))}
// 5. simultaneous tie: hook + tap-completing in one tick => fisher wins
{const s=mk(31,{fish:[{pid:'p1'}],fishers:[{pid:'f1'}]});calm(s);const fr=s.fishers[0],p=s.fishes[0];p.mass=300;p.x=900;p.y=300;p.z=100;fr.aimX=900;fr.aimZ=100;
 s.step({f1:{ev:[{t:'cast',lure:'goldfish'}]}},dtv);fr.cast.y=300;s.step({},dtv);const c=fr.cast;c.biteEsc=.96;c.lastTap=-9;
 s.step({f1:{hook:c.biteId},p1:{tap:1}},dtv);ok('same-tick hook + final tap => fisher wins (fishers apply first)',!!p.hooked&&p.alive)}
// 6. mass gate + nearest with frames
{const s=mk(41,{fishers:[{pid:'f1'}]});calm(s);const fr=s.fishers[0];fr.aimX=900;fr.aimZ=100;
 s.step({f1:{ev:[{t:'cast',lure:'koi'}]}},dtv);const c=fr.cast;c.y=300;
 const a=s.fishes[1],b=s.fishes[2];a.mass=100;a.x=c.x;a.y=c.y;a.z=c.z;s.step({},dtv);ok('mass-100 fish ignored',fr.cast.state==='bait');
 a.mass=102;b.mass=105;b.x=c.x+3;b.y=c.y;b.z=c.z;a.x=c.x+1;a.y=c.y;a.z=c.z;fr.cast.x=c.x;s.step({},dtv);ok('nearest eligible fish bites (a at 1 vs b at 3)',fr.cast.state==='bite'&&fr.cast.fish[0]===a)}
// 7. depth lock + reel strokes through frames; strokes ignored during bite
{const s=mk(51,{fishers:[{pid:'f1'}]});calm(s);const fr=s.fishers[0];fr.aimX=900;fr.aimZ=100;
 s.step({f1:{ev:[{t:'cast',lure:'koi'}]}},dtv);for(let i=0;i<20;i++)s.step({},dtv);const y0=fr.cast.y;
 s.step({f1:{reel:{down:true,strokes:[10,10]}}},dtv);
 ok('first down-stroke (>=16px) locks depth',fr.cast.depthLocked===true&&fr.cast.retrievePhase==='horizontal');
 s.step({f1:{reel:{strokes:[20]}}},dtv);ok('remaining first-stroke travel does not reel',Math.hypot(fr.cast.x-900,fr.cast.z-100)<1);
 s.step({f1:{reel:{up:true}}},dtv);s.step({f1:{reel:{down:true,strokes:[20]}}},dtv);
 ok('a later stroke reels the lure toward the boat',Math.hypot(fr.cast.x-900,fr.cast.z-100)>5)}
// 8. hostile / malformed frames never throw
{const s=mk(61,{fish:[{pid:'p1'}],fishers:[{pid:'f1'}]});let threw=false;
 try{for(const bad of [null,undefined,{},{mv:null},{mv:{x:NaN,y:Infinity,z:'a'}},{tap:1e9},{ev:[{t:'nope'},null,{t:'cast',lure:'__proto__'}]},{reel:{strokes:new Array(500).fill(1e9)}},{stick:{x:1e9,y:-1e9},mode:'x',rod:'abc',drag:NaN,roll:1e9}]){s.step({p1:bad,f1:bad},dtv)}}catch(e){threw=e}
 ok('malformed input frames do not throw'+(threw?': '+threw.message:''),!threw);
 ok('state stays finite after hostile input',s.fishes.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)&&Number.isFinite(f.z)))}
// 9. match end is an event; sim stops stepping fish logic only by host choice
{const s=mk(71,{fish:[{pid:'p1'}]});let ended=false;for(let i=0;i<12000&&s.state==='play';i++){s.step({},dtv);if(s.drainEvents().some(e=>e.k==='end'))ended=true}
 ok('match ends by itself with an "end" event at t>=L',ended&&s.state==='end'&&s.t>=s.L)}
// 10. headless: the file really has no DOM/THREE dependence
ok('aqua_sim.js loaded in plain Node (no document/window/THREE)',typeof document==='undefined'&&typeof window==='undefined');
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
