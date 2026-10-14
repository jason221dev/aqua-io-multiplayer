'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Aqua=require('./aqua_sim');const MV=require('./motion_v2');const {upgrade}=require('./ws_lite');
const PORT=Number(process.env.PORT)||3000, HOST=process.env.HOST||'0.0.0.0';
const ROOT=__dirname,rooms=new Map(),players=new Map(),peers=new Set();
const SIM_HZ=[30,60].includes(Number(process.env.SIM_HZ))?Number(process.env.SIM_HZ):30; // Heavy AI roster: low-cost hosting
const TICK=1/SIM_HZ, MOTION_MS=65, NPC_MS=260, PLANK_MS=950, MAX_ROOMS=Number(process.env.MAX_ROOMS)||2, ROOM_TTL=180_000;
// Free test instances can deliberately lower admission, while full rooms accept 400 people.
const ROOM_CAP=Math.max(2,Math.min(400,Number(process.env.ROOM_CAP)||10));
const MAX_PEERS=Math.max(ROOM_CAP+10,Math.min(1000,Number(process.env.MAX_PEERS)||Math.max(50,ROOM_CAP+10)));
const META_MS=350;
const id=(n=6)=>crypto.randomBytes(n).toString('base64url').replace(/[-_]/g,'').slice(0,n).toUpperCase();
const stamp=()=>Date.now();
function send(ws,o){if(ws&&!ws.closed)ws.send(o)}
function members(room){return [...room.users.values()].filter(p=>p.ws&&!p.ws.closed)}
function broadcast(room,o){for(const p of members(room))send(p.ws,o)}
function lobby(room){broadcast(room,{type:'lobby',room:room.code,host:room.host,players:[...room.users.values()].map(p=>({pid:p.pid,name:p.name,role:p.role,sp:p.sp,online:!!p.ws&&!p.ws.closed})),started:room.started,mode:room.mode})}
function fail(ws,s){send(ws,{type:'error',message:s})}
function stateFor(room,p){
  const s=room.sim.snapshot();
  // Keep only recipient-visible feed. The full simulation snapshot is never sent unfiltered.
  s.feed=s.feed.filter(m=>(!m.to||m.to===p.pid)&&m.except!==p.pid);
  s.rng=1; // RNG state is server-private; presentation never advances the simulation.
  // Remove AI steering internals. The browser only renders NPCs; it never steps them.
  for(const n of s.npcs){delete n.wx;delete n.wy;delete n.wz;delete n.wt}
  if(p.role==='fish'){
    // The fish client sees the disguised lure, not tackle controls, line length,
    // drag, rod settings, tension or the fisher's private aim target.
    for(const r of s.fishers){
      if(r.cast){
        const c=r.cast;
        const keep=['state','x','y','z','lureSp','lureMass','kind','fish','biteEsc','biteId','biteAge','trolling','depthLocked','retrievePhase'];
        r.cast=Object.fromEntries(keep.filter(k=>Object.prototype.hasOwnProperty.call(c,k)).map(k=>[k,c[k]]));
        // A hooked player can read tension feedback; others cannot.
        if(c.state==='fight'&&c.fish?.some(ref=>ref?.__r==='f'&&s.fishes[ref.i]?.pid===p.pid))r.cast.tension=c.tension;
      }
      delete r.in;delete r.aimX;delete r.aimZ;delete r.reelBuffer;
    }
  }
  // Players can only see their own session input state; raw inputs are not public.
  for(const f of s.fishes)delete f.in;
  for(const r of s.fishers)if(r.pid!==p.pid)delete r.in;
  return s;
}
function issueSnapshots(room){for(const p of members(room)){send(p.ws,{type:'snapshot',room:room.code,tick:room.tick,state:stateFor(room,p)})}}

// Initial/reconnect full snapshot only. Subsequent packets mutate existing client
// entities instead of serializing/restoring the entire 200 KB simulation 10x/sec.
const q=v=>Number.isFinite(v)?Math.round(v*10)/10:0;
const coord3=e=>[q(e.x),q(e.y),q(e.z),q(e.vx),q(e.vy),q(e.vz)];
const hookedRef=(h,room)=>h&&h.fr?{r:room.sim.fishers.indexOf(h.fr),esc:q(h.esc||0),tool:h.tool}:null;
function castView(c,room,player){
  if(!c)return null;
  const view={};
  const publicKeys=['state','x','y','z','lureSp','lureMass','kind','biteEsc','biteId','biteAge','trolling','depthLocked','retrievePhase'];
  for(const [k,v] of Object.entries(c)){
    if(k==='fish')continue;
    if(player.role==='fish'&&!publicKeys.includes(k))continue;
    if(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))view[k]=typeof v==='number'?q(v):v;
  }
  view.fish=Array.isArray(c.fish)?c.fish.map(f=>f?(f.sp?['f',f.i]:['n',f.id]):null):[];
  if(player.role==='fish'&&c.state==='fight'&&c.fish?.some(f=>f.pid===player.pid))view.tension=q(c.tension);
  return view;
}
function issueMotion(room){
  const sim=room.sim,now=stamp();
  const withNpc=now-(room.lastNpc||0)>=NPC_MS;
  const withPlank=now-(room.lastPlank||0)>=PLANK_MS;
  const withMeta=now-(room.lastMeta||0)>=META_MS;
  if(withMeta)room.lastMeta=now;
  if(withNpc)room.lastNpc=now;
  if(withPlank)room.lastPlank=now;
  const dense=sim.fishes.length>16;
  if(dense){issueBinaryMotion(room,now,withNpc,withPlank,withMeta);return}
  const base={type:'motion',tick:room.tick,t:Math.round(sim.t*1000)/1000,state:sim.state,L:sim.L,
    f:sim.fishes.map(f=>({p:coord3(f),h:[q(f.hx),q(f.hz)],mass:q(f.mass),alive:f.alive,
      ...(withMeta?{air:f.air,prot:q(f.prot||0),respawn:q(f.respawn||0),abilT:q(f.abilT||0),abilCD:q(f.abilCD||0),
      markT:q(f.markT||0),shockT:q(f.shockT||0),camoT:q(f.camoT||0),whirlT:q(f.whirlT||0),
      surge:q(f.surge||0),inflateBlend:q(f.inflateBlend||0),fightStamina:q(f.fightStamina||0),
      peak:q(f.peak||0),kills:f.kills||0,fishEaten:f.fishEaten||0,esc:f.esc||0,hooked:hookedRef(f.hooked,room)}:{})})),
    r:sim.fishers.map(fr=>({p:[q(fr.x),0,q(fr.z),q(fr.vx),0,q(fr.vz)],heading:q(fr.heading||0),
      cd:q(fr.cd||0),score:q(fr.score||0),caught:fr.caught||0,breaks:fr.breaks||0})),
    pings:sim.pings.map(z=>({x:q(z.x),z:q(z.z),t:q(z.t)})),
    splashes:sim.splashes.map(z=>({x:q(z.x),z:q(z.z),t:q(z.t),pw:q(z.pw)}))};
  if(withNpc)base.n=sim.npcs.map(n=>({p:coord3(n),mass:q(n.mass),
    ...(withMeta?{kind:n.kind,alive:n.alive!==false,hooked:hookedRef(n.hooked,room)}:{})}));
  if(withPlank)base.plank=sim.plank.map(z=>[q(z.x),q(z.y),q(z.z)]);
  for(const p of members(room)){
    if(p.ws.socket?.writableLength>256_000)continue;
    const view={...base,feed:sim.feed.filter(m=>(!m.to||m.to===p.pid)&&m.except!==p.pid),
      r:base.r.map((r,i)=>({...r,cast:castView(sim.fishers[i].cast,room,p),
        ...(p.role==='fisher'&&sim.fishers[i].pid===p.pid?{aimX:q(sim.fishers[i].aimX||0),aimZ:q(sim.fishers[i].aimZ||0)}:{})}))};
    send(p.ws,view);
  }
}
// Whole-aquarium visibility. All competitors, schooling minnows and food
// remain visible from any world position. Distance changes UPDATE cadence
// rather than removing entities from the client's rendering roster.
const MOTION_REFRESH_MS=1700, FAR_MOTION_MS=360, MID_MOTION_MS=165;
const equalIds=(a,b)=>MV.eq(a,b);
function issueBinaryMotion(room,now,withNpc,withPlank,withMeta){
  const sim=room.sim;
  // Pre-quantize once. Every recipient compares only these reusable bytes.
  const fRecord=sim.fishes.map((f,i)=>MV.fishRecord(i,f,f.hooked?.fr?sim.fishers.indexOf(f.hooked.fr):-1,f.hooked?.esc||0));
  const nRecord=withNpc?sim.npcs.map((n,i)=>MV.npcRecord(i,n,n.hooked?.fr?sim.fishers.indexOf(n.hooked.fr):-1,n.hooked?.esc||0)):null;
  const pRecord=withPlank?sim.plank.map((z,i)=>MV.plankRecord(i,z)):null;
  const meta=withMeta?sim.fishes.map((f,i)=>[i,f.air?1:0,q(f.prot||0),q(f.respawn||0),q(f.abilT||0),q(f.abilCD||0),
      q(f.markT||0),q(f.shockT||0),q(f.camoT||0),q(f.whirlT||0),q(f.surge||0),
      q(f.inflateBlend||0),q(f.fightStamina||0),q(f.peak||0),f.kills||0,
      f.fishEaten||0,f.esc||0]):null;
  const byPid=new Map();for(const f of sim.fishes)if(f.pid)byPid.set(f.pid,f);for(const f of sim.fishers)if(f.pid&&!byPid.has(f.pid))byPid.set(f.pid,f);
  // Share compact global roster membership between every recipient.
  const allF=sim.fishes.map((_,i)=>i),allN=sim.npcs.map((_,i)=>i);
  const rBase=sim.fishers.map(fr=>({p:[q(fr.x),0,q(fr.z),q(fr.vx),0,q(fr.vz)],heading:q(fr.heading||0),cd:q(fr.cd||0),
    score:q(fr.score||0),caught:fr.caught||0,breaks:fr.breaks||0}));
  const pings=sim.pings.map(z=>({x:q(z.x),z:q(z.z),t:q(z.t)}));
  const splashes=sim.splashes.map(z=>({x:q(z.x),z:q(z.z),t:q(z.t),pw:q(z.pw)}));
  for(const p of members(room)){
    if(p.ws.socket?.writableLength>256_000)continue;
    const self=byPid.get(p.pid);if(!self)continue;
    const cx=self.x||0,cz=self.z||0;
    const dist2=e=>(e.x-cx)**2+(e.z-cz)**2;
    const fv=allF,nv=withNpc?allN:[];
    const cache=p.motionV2||(p.motionV2={f:new Map(),n:new Map(),pl:new Map(),fSentAt:new Map(),vis:null,nvis:null,stamp:0,init:false});
    cache.fSentAt??=new Map();
    const hardRefresh=now-cache.stamp>=MOTION_REFRESH_MS;
    const sendF=[],sendN=[],sendPl=[];
    for(const i of fv){
      const rec=fRecord[i],old=cache.f.get(i),fish=sim.fishes[i],d=dist2(fish);
      const cadence=fish.pid===p.pid||d<700*700?0:d<1800*1800?MID_MOTION_MS:FAR_MOTION_MS;
      const changed=!MV.same(rec,old);
      // Distant position changes are less frequent; elimination, mass and
      // hook state propagate immediately for correct game rules.
      const critical=old&&(old[20]!==rec[20]||old[18]!==rec[18]||old[19]!==rec[19]||old[21]!==rec[21]||old[22]!==rec[22]);
      if(!old||hardRefresh||critical||(changed&&now-(cache.fSentAt.get(i)||0)>=cadence))sendF.push(rec);
    }
    if(withNpc)for(const i of nv){const rec=nRecord[i],old=cache.n.get(i);if(hardRefresh||!MV.same(rec,old))sendN.push(rec)}
    // All clients must see consumed pellets disappear, regardless of AOI.
    // The existing binary delta cache avoids resending unchanged records.
    if(withPlank)for(let i=0;i<pRecord.length;i++){
      const rec=pRecord[i],old=cache.pl.get(i);
      if(hardRefresh||!MV.same(rec,old))sendPl.push(rec)}
    const visChanged=!equalIds(cache.vis,fv),nvisChanged=withNpc&&!equalIds(cache.nvis,nv);
    const extra={state:sim.state,L:sim.L,
      r:rBase.map((r,i)=>({...r,cast:castView(sim.fishers[i].cast,room,p),
        ...(p.role==='fisher'&&sim.fishers[i].pid===p.pid?{aimX:q(sim.fishers[i].aimX||0),aimZ:q(sim.fishers[i].aimZ||0)}:{})})),
      pings,splashes};
    // Feed stays in client memory until it actually changes. Avoid sending
    // the same 10-message history to 400 sockets 10 times a second.
    const feed=sim.feed.filter(m=>(!m.to||m.to===p.pid)&&m.except!==p.pid);
    const feedSig=JSON.stringify(feed);
    if(feedSig!==cache.feedSig){extra.feed=feed;cache.feedSig=feedSig}
    if(withMeta){
      // Far fish need geometry, position, mass and life state, but not the
      // detailed ability telemetry of opponents across the aquarium.
      extra.fm=fv.filter(i=>sim.fishes[i].pid===p.pid||dist2(sim.fishes[i])<900*900).map(i=>meta[i]);extra.mc=1;
    }
    const bytes=MV.encode({tick:room.tick,t:sim.t,f:sendF,n:sendN,pl:sendPl,
      vis:visChanged?fv:null,nvis:nvisChanged?nv:null,npc:withNpc,plank:withPlank,extra});
    p.ws.sendBinary(bytes);
    if(visChanged){cache.vis=fv;for(const k of cache.f.keys())if(!fv.includes(k))cache.f.delete(k)}
    if(nvisChanged){cache.nvis=nv;for(const k of cache.n.keys())if(!nv.includes(k))cache.n.delete(k)}
    for(const rec of sendF){const i=(rec[0]<<8)|rec[1];cache.f.set(i,rec);cache.fSentAt.set(i,now)}
    for(const rec of sendN)cache.n.set((rec[0]<<8)|rec[1],rec);
    for(const rec of sendPl)cache.pl.set((rec[0]<<8)|rec[1],rec);
    if(hardRefresh||!cache.init){cache.stamp=now;cache.init=true;}
  }
}

function start(room,p){
  if(room.started)return fail(p.ws,'Match already running');
  if(p.pid!==room.host)return fail(p.ws,'Only the room host can start');
  const fish=[...room.users.values()].filter(u=>u.role==='fish').slice(0,Math.min(400,ROOM_CAP));
  const fisher=[...room.users.values()].filter(u=>u.role==='fisher').slice(0,2);
  if(fish.length+fisher.length===0)return fail(p.ws,'No players');
  const slots={fish:fish.map(x=>({pid:x.pid,sp:x.sp,name:x.name})),fishers:fisher.map(x=>({pid:x.pid,name:x.name}))};
  const sim=Aqua.create(),seed=crypto.randomBytes(4).readUInt32LE();
  // Each fish is a genuine competitor. Unclaimed slots are autonomous rivals,
  // taken over in place by late-arriving humans in Free Roam.
  // The 400-player load-testing configuration remains isolated.
  const competitiveCount=ROOM_CAP>200?400:200;
  sim.newMatch({sp:fish[0]?.sp||'guppy',seed,npcCount:0,miniFishCount:30,competitorCount:competitiveCount,
    maxTotalFish:competitiveCount,mode:room.mode,quick:false,nurseryProtect:false,slots});
  room.sim=sim;room.tick=0;room.started=true;room.last=stamp();room.lastSnap=0;room.lastNpc=0;room.lastPlank=0;room.lastMeta=0;room.lastFar=0;room.acc=0;
  broadcast(room,{type:'start',room:room.code,mode:room.mode,seed,slots});issueSnapshots(room);
  console.log('match started',room.code,'participants',fish.length,fisher.length);
}
function queueFrame(p,frame){
  if(!frame||typeof frame!=='object'||Array.isArray(frame))return;
  const q=p.queue;
  if(p.role==='fish'){
    const mv=frame.mv&&typeof frame.mv==='object'?frame.mv:{};
    q.mv={x:val(mv.x,-1,1),y:val(mv.y,-1,1),z:val(mv.z,-1,1)};
    q.bt=frame.bt&&(['f','n'].includes(frame.bt.g))?{g:frame.bt.g,i:Math.max(0,Math.min(2000,Math.trunc(Number(frame.bt.i)||0)))}:null;
    q.tap=Math.min(4,(q.tap||0)+Math.max(0,Math.min(4,Math.trunc(Number(frame.tap)||0))));
  } else {
    const st=frame.stick&&typeof frame.stick==='object'?frame.stick:{};
    const prev=q.rod??.44;
    q.stick={x:val(st.x,-1,1),y:val(st.y,-1,1)};q.mode=frame.mode==='boat'?'boat':'aim';q.rod=val(frame.rod,0,1,prev);q.roll=val(frame.roll,-25,25);q.drag=val(frame.drag,0,1,.35);
    p.rodHistory??=[];p.rodHistory.push({v:q.rod,t:stamp()});
    p.rodHistory=p.rodHistory.filter(h=>stamp()-h.t<=350).slice(-20);
    const reel=frame.reel&&typeof frame.reel==='object'?frame.reel:{};
    if(!q.reel)q.reel={strokes:[],down:false,up:false};
    q.reel.down||=reel.down===true;q.reel.up||=reel.up===true;
    if(Array.isArray(reel.strokes))for(const dy of reel.strokes.slice(0,12))if(Number.isFinite(dy)&&dy>0)q.reel.strokes.push(Math.min(dy,120));
    q.reel.strokes=q.reel.strokes.slice(-16);
    if(Array.isArray(frame.ev))for(const e of frame.ev.slice(0,3)){
      if(!e||!['cast','troll','land'].includes(e.t))continue;
      q.ev??=[];if(q.ev.length<3)q.ev.push({t:e.t,lure:Aqua.SP[e.lure]?e.lure:'goldfish'});
    }
    if(Number.isInteger(frame.hook)&&frame.hook>0){
      // An attacker cannot hook by guessing biteId; the server must have observed
      // a fresh reel stroke or a sufficiently recent rod pull for this player.
      const c=p.room.sim?.fishers.find(f=>f.pid===p.pid)?.cast;
      if(c?.state==='bite'&&c.biteId===frame.hook){
        const recentMin=Math.min(...p.rodHistory.map(h=>h.v));
        if(q.reel.strokes.reduce((a,b)=>a+b,0)>=Aqua.FISHER_CFG.biteStrokePx || (q.rod-recentMin)>.11){q.hook=frame.hook}
      }
    }
  }
}
function val(x,lo,hi,def=0){x=Number(x);return Number.isFinite(x)?Math.min(hi,Math.max(lo,x)):def}
function playerFrame(p){
  const q=p.queue;
  if(p.role==='fish'){const f={mv:q.mv||{x:0,y:0,z:0},bt:q.bt||null,tap:q.tap||0};q.tap=0;return f}
  const f={stick:q.stick||{x:0,y:0},mode:q.mode||'aim',rod:q.rod??.44,roll:q.roll||0,drag:q.drag??.35,
    reel:{strokes:q.reel?.strokes||[],down:q.reel?.down||false,up:q.reel?.up||false},ev:q.ev||[],hook:q.hook||0};
  q.reel={strokes:[],down:false,up:false};q.ev=[];q.hook=0;return f;
}
function stepRoom(room,elapsed){
  if(!room.started||room.sim.state!=='play')return;
  const tick=TICK;
  room.acc=Math.min(.12,room.acc+elapsed);
  let n=0;while(room.acc>=tick&&n<8){
    const frames={};for(const p of room.users.values()){if(p.ws&&!p.ws.closed)frames[p.pid]=playerFrame(p)}
    const simStart=process.hrtime.bigint();
    room.sim.step(frames,tick);room.tick++;room.acc-=tick;n++;
    const simMs=Number(process.hrtime.bigint()-simStart)/1e6;
    room.avgTickMs=(room.avgTickMs||simMs)*.97+simMs*.03;
    room.peakTickMs=Math.max((room.peakTickMs||0)*.995,simMs);
    for(const e of room.sim.drainEvents()){
      if(e.to){const recipient=room.users.get(e.to);if(recipient)send(recipient.ws,{type:'event',event:e,tick:room.tick})}
      else if(e.k==='end'){
        // Push the definitive terminal state even if end occurs between
        // scheduled snapshots; the client must not keep rendering an active fight.
        issueSnapshots(room);
        broadcast(room,{type:'event',event:e,tick:room.tick});
      }
      else if(e.k!=='vib'&&e.k!=='mode'&&e.k!=='eat')broadcast(room,{type:'event',event:e,tick:room.tick});
    }
  }
  // Crowd rooms trade redundant distant updates for usable control latency.
  const sendMs=room.users.size>100?100:MOTION_MS;
  if(stamp()-room.lastSnap>=sendMs){room.lastSnap=stamp();issueMotion(room)}
}
function message(ws,msg){
  if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
  let p=players.get(ws);
  if(msg.type==='join'){
    if(p)return fail(ws,'Already joined');
    const role=msg.role==='fisher'?'fisher':'fish';
    const code=typeof msg.room==='string'?msg.room.trim().toUpperCase():'';
    let room=code?rooms.get(code):null;
    if(code&&!room)return fail(ws,'Room not found');
    if(!room){if(rooms.size>=MAX_ROOMS)return fail(ws,'Server is at capacity');room={code:id(6),host:null,users:new Map(),started:false,sim:null,tick:0,acc:0,last:stamp(),lastSnap:0,mode:msg.mode==='last'?'last':'free'};while(rooms.has(room.code))room.code=id(6);rooms.set(room.code,room)}
    const existing=[...room.users.values()].find(x=>x.token===msg.token&&typeof msg.token==='string'&&msg.token.length>=24);
    if(existing){if(existing.ws&&!existing.ws.closed)return fail(ws,'That session is already connected');p=existing;p.ws=ws;p.queue={};}
    else {
      if(room.started&&room.mode==='last'&&role==='fish')return fail(ws,'Last Fish Standing is underway; no new fish may join');
      if(room.started&&room.sim?.state!=='play')return fail(ws,'Match finished. Create a new room');
      if(room.users.size>=ROOM_CAP)return fail(ws,'Room is full ('+ROOM_CAP+' players)');
      if([...room.users.values()].filter(x=>x.role===role).length>=(role==='fish'?400:2))return fail(ws,role+' slots full');
      p={pid:'p'+crypto.randomBytes(6).toString('hex'),token:crypto.randomBytes(24).toString('base64url'),ws,room,role,
        sp:(typeof msg.sp==='string'&&Object.prototype.hasOwnProperty.call(Aqua.SP,msg.sp))?msg.sp:'guppy',
        name:typeof msg.name==='string'?msg.name.replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,18)||'Player':'Player',queue:{},last:stamp()};
      room.users.set(p.pid,p);if(!room.host)room.host=p.pid;
      if(room.started){
        const entity=role==='fish'?room.sim.addFishPlayer({pid:p.pid,sp:p.sp,name:p.name}):room.sim.addFisherPlayer({pid:p.pid,name:p.name});
        if(!entity){room.users.delete(p.pid);return fail(ws,'No available role slot');}
        if(role==='fish'){
          const idx=room.sim.fishes.indexOf(entity),serialized={...entity};
          for(const peer of members(room))send(peer.ws,{type:'roster_add',role:'fish',index:idx,entity:serialized});
        }else{
          const idx=room.sim.fishers.indexOf(entity),serialized={...entity};
          for(const peer of members(room))send(peer.ws,{type:'roster_add',role:'fisher',index:idx,entity:serialized});
        }
      }
    }
    players.set(ws,p);room.last=stamp();
    send(ws,{type:'welcome',room:room.code,pid:p.pid,token:p.token,role:p.role,mode:room.mode,host:room.host===p.pid});
    if(!room.started)lobby(room);
    if(room.started){send(ws,{type:'start',room:room.code,slots:null,mode:room.mode,resumed:true});send(ws,{type:'snapshot',room:room.code,tick:room.tick,state:stateFor(room,p)})}
    else if(members(room).length>=2)start(room,room.users.get(room.host));
    return;
  }
  if(!p)return fail(ws,'Join a room first');
  p.last=stamp();p.room.last=stamp();
  if(msg.type==='probe')return send(ws,{type:'probe',id:Number.isFinite(msg.id)?msg.id:0});
  if(msg.type==='start')return start(p.room,p);
  if(msg.type==='input'&&p.room.started){
    const now=stamp();
    if(!p.rateWindow||now-p.rateWindow>=1000){p.rateWindow=now;p.rateInputs=0;}
    // 20 Hz normal input frames; allow a burst margin without giving packet
    // flooding clients disproportionate authority or simulation CPU.
    if(++p.rateInputs>45)return;
    return queueFrame(p,msg.frame);
  }
  if(msg.type==='leave'){
    // Intentional exit forfeits the fish in elimination mode and releases
    // the human-control slot. Unexpected disconnects remain reconnectable.
    const room=p.room;
    if(room.started){
      if(room.mode==='last'&&p.role==='fish'){
        const fish=room.sim.fishes.find(f=>f.pid===p.pid);
        if(fish&&fish.alive)room.sim.kill(fish,'forfeit');
      }
      room.sim.disconnectPlayer(p.pid);
    }
    room.users.delete(p.pid);
    if(room.host===p.pid)room.host=room.users.keys().next().value||null;
    lobby(room);
    return ws.close();
  }
}
function disconnect(ws){const p=players.get(ws);players.delete(ws);if(!p)return;p.ws=null;p.last=stamp();p.queue={};lobby(p.room)}
const html=fs.readFileSync(path.join(ROOT,'index.html'));
const motionJs=fs.readFileSync(path.join(ROOT,'motion_v2.js'));
const server=http.createServer((req,res)=>{
  // Match URL *pathnames*, not raw req.url: invite links contain ?room=...
  // and would otherwise return HTTP 404 before the game can load.
  let pathname;
  try { pathname=new URL(req.url,'http://localhost').pathname; }
  catch (_) { res.writeHead(400);return res.end('Bad request'); }
  if(pathname==='/motion_v2.js'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end(motionJs);
  }
  if(pathname==='/health'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    return res.end(JSON.stringify({ok:true,rooms:rooms.size,connections:peers.size,
      matches:[...rooms.values()].filter(r=>r.started).map(r=>({participants:r.users.size,
        connected:members(r).length,ticks:r.tick,simulationSeconds:Math.round(r.sim.t*1000)/1000,
        simHz:SIM_HZ,avgSimTickMs:Math.round((r.avgTickMs||0)*100)/100,
        peakSimTickMs:Math.round((r.peakTickMs||0)*100)/100}))}));
  }
  if(!['GET','HEAD'].includes(req.method)||!['/','/index.html'].includes(pathname)){
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
    return res.end('Not found');
  }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')return res.end();
  res.end(html);
});
server.on('upgrade',(req,socket,head)=>{
  if(peers.size>=MAX_PEERS){socket.destroy();return}
  if(new URL(req.url,'http://localhost').pathname!=='/ws'){socket.destroy();return}
  if(req.headers.origin){
    try{if(new URL(req.headers.origin).host!==req.headers.host){socket.destroy();return}}
    catch(_){socket.destroy();return}
  }
  let ws;ws=upgrade(req,socket,head,m=>message(ws,m),()=>{peers.delete(ws);disconnect(ws)});
  if(ws)peers.add(ws);
});
let previous=process.hrtime.bigint();
const pump=setInterval(()=>{
  const cur=process.hrtime.bigint(),dt=Math.min(.1,Number(cur-previous)/1e9);previous=cur;
  for(const room of rooms.values())stepRoom(room,dt);
},16);pump.unref();
const maintenance=setInterval(()=>{
  for(const ws of peers){if(stamp()-ws.lastPong>60_000)ws.close();else ws.ping()}
  for(const [code,room] of rooms){if(!members(room).length&&stamp()-room.last>ROOM_TTL)rooms.delete(code)}
},30_000);maintenance.unref();
server.listen(PORT,HOST,()=>console.log(`aqua.io multiplayer ready on ${HOST}:${PORT}`));
module.exports={server,rooms,stepRoom,stateFor,queueFrame,playerFrame,issueBinaryMotion};