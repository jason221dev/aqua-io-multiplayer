'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Aqua=require('./aqua_sim');const {upgrade}=require('./ws_lite');
const PORT=Number(process.env.PORT)||3000, HOST=process.env.HOST||'0.0.0.0';
const ROOT=__dirname,rooms=new Map(),players=new Map(),peers=new Set();
const TICK=1/60, SNAP_MS=100, MAX_ROOMS=4, MAX_PEERS=50, ROOM_TTL=180_000;
const id=(n=6)=>crypto.randomBytes(n).toString('base64url').replace(/[-_]/g,'').slice(0,n).toUpperCase();
const stamp=()=>Date.now();
function send(ws,o){if(ws&&!ws.closed)ws.send(o)}
function members(room){return [...room.users.values()].filter(p=>p.ws&&!p.ws.closed)}
function broadcast(room,o){for(const p of members(room))send(p.ws,o)}
function lobby(room){broadcast(room,{type:'lobby',room:room.code,host:room.host,players:[...room.users.values()].map(p=>({pid:p.pid,name:p.name,role:p.role,sp:p.sp,online:!!p.ws&&!p.ws.closed})),started:room.started})}
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
function start(room,p){
  if(room.started)return fail(p.ws,'Match already running');
  if(p.pid!==room.host)return fail(p.ws,'Only the room host can start');
  const fish=[...room.users.values()].filter(u=>u.role==='fish').slice(0,8);
  const fisher=[...room.users.values()].filter(u=>u.role==='fisher').slice(0,2);
  if(fish.length+fisher.length===0)return fail(p.ws,'No players');
  const slots={fish:fish.map(x=>({pid:x.pid,sp:x.sp,name:x.name})),fishers:fisher.map(x=>({pid:x.pid,name:x.name}))};
  const sim=Aqua.create(),seed=crypto.randomBytes(4).readUInt32LE();
  sim.newMatch({sp:fish[0]?.sp||'guppy',seed,npcCount:320,quick:false,nurseryProtect:fish.length>0,slots});
  room.sim=sim;room.tick=0;room.started=true;room.last=stamp();room.lastSnap=0;room.acc=0;
  broadcast(room,{type:'start',room:room.code,seed,slots});issueSnapshots(room);
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
  room.acc=Math.min(.12,room.acc+elapsed);
  let n=0;while(room.acc>=TICK&&n<8){
    const frames={};for(const p of room.users.values()){if(p.ws&&!p.ws.closed)frames[p.pid]=playerFrame(p)}
    room.sim.step(frames,TICK);room.tick++;room.acc-=TICK;n++;
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
  if(stamp()-room.lastSnap>=SNAP_MS){room.lastSnap=stamp();issueSnapshots(room)}
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
    if(!room){if(rooms.size>=MAX_ROOMS)return fail(ws,'Server is at capacity');room={code:id(6),host:null,users:new Map(),started:false,sim:null,tick:0,acc:0,last:stamp(),lastSnap:0};while(rooms.has(room.code))room.code=id(6);rooms.set(room.code,room)}
    const existing=[...room.users.values()].find(x=>x.token===msg.token&&typeof msg.token==='string'&&msg.token.length>=24);
    if(existing){if(existing.ws&&!existing.ws.closed)return fail(ws,'That session is already connected');p=existing;p.ws=ws;p.queue={};}
    else {
      if(room.started)return fail(ws,'Match already started');
      if([...room.users.values()].filter(x=>x.role===role).length>=(role==='fish'?8:2))return fail(ws,role+' slots full');
      p={pid:'p'+crypto.randomBytes(6).toString('hex'),token:crypto.randomBytes(24).toString('base64url'),ws,room,role,
        sp:(typeof msg.sp==='string'&&Object.prototype.hasOwnProperty.call(Aqua.SP,msg.sp))?msg.sp:'guppy',
        name:typeof msg.name==='string'?msg.name.replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,18)||'Player':'Player',queue:{},last:stamp()};
      room.users.set(p.pid,p);if(!room.host)room.host=p.pid;
    }
    players.set(ws,p);room.last=stamp();
    send(ws,{type:'welcome',room:room.code,pid:p.pid,token:p.token,role:p.role,host:room.host===p.pid});
    lobby(room);
    if(room.started){send(ws,{type:'start',room:room.code,slots:null,resumed:true});send(ws,{type:'snapshot',room:room.code,tick:room.tick,state:stateFor(room,p)})}
    else if(members(room).length>=2)start(room,room.users.get(room.host));
    return;
  }
  if(!p)return fail(ws,'Join a room first');
  p.last=stamp();p.room.last=stamp();
  if(msg.type==='start')return start(p.room,p);
  if(msg.type==='input'&&p.room.started)return queueFrame(p,msg.frame);
  if(msg.type==='leave')ws.close();
}
function disconnect(ws){const p=players.get(ws);players.delete(ws);if(!p)return;p.ws=null;p.last=stamp();p.queue={};lobby(p.room)}
const html=fs.readFileSync(path.join(ROOT,'index.html'));
const server=http.createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,rooms:rooms.size,connections:peers.size}))}
  if(req.method!=='GET'||!['/','/index.html'].includes(req.url)){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(html);
});
server.on('upgrade',(req,socket,head)=>{
  if(peers.size>=MAX_PEERS){socket.destroy();return}
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
module.exports={server,rooms,stepRoom,stateFor,queueFrame,playerFrame};
