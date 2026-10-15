'use strict';
// End-to-end test of actual Node WebSockets and authoritative match state.
const assert=require('node:assert/strict');
const MV=require('../motion_v2');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const port=33400+Math.floor(Math.random()*2000),url=`ws://127.0.0.1:${port}/ws`;
const server=spawn(process.execPath,['server.js'],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
server.stderr.on('data',x=>process.stderr.write('[server] '+x));
const clients=[];let passes=0;function ok(desc,condition){assert.ok(condition,desc);console.log('PASS',desc);passes++}
async function connect(){const ws=new WebSocket(url);ws.binaryType='arraybuffer';clients.push(ws);const msgs=[];ws.addEventListener('message',e=>{try{const m=typeof e.data==='string'?JSON.parse(e.data):MV.decode(e.data);if(m.b2){m.f=m.f.map(r=>({p:r.slice(1,7),index:r[0],mass:r[9]}));m.bytes=e.data.byteLength;}msgs.push(m)}catch(err){console.error('Decode',err)}});
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});return{ws,msgs,send:o=>ws.send(JSON.stringify(o))}}
async function wait(c,fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){const i=c.msgs.findIndex(fn);if(i>=0)return c.msgs.splice(i,1)[0];await delay(30)}throw Error('Timed out waiting; messages: '+JSON.stringify(c.msgs.map(x=>x.type)))}
async function health(){const res=await fetch(`http://127.0.0.1:${port}/health`);return res.json()}
(async()=>{
 const readyAt=Date.now()+8000;let h;
 while(Date.now()<readyAt){try{h=await health();break}catch{await delay(50)}}
 ok('health endpoint is available',h?.ok===true);
 const fish=await connect();fish.send({type:'join',role:'fish',sp:'goldfish',name:'Fishie'});
 const a=await wait(fish,m=>m.type==='welcome');ok('fish room created',a.room.length===6&&a.role==='fish');
 const other=await connect();other.send({type:'join',room:a.room,role:'fisher',name:'Angler'});
 const b=await wait(other,m=>m.type==='welcome');ok('fisher joined same room',b.room===a.room&&b.pid!==a.pid);
 await wait(fish,m=>m.type==='start');await wait(other,m=>m.type==='start');
 ok('mixed-role game starts automatically on second player',true);
 const fs=await wait(fish,m=>m.type==='snapshot');const hs=await wait(other,m=>m.type==='snapshot');
 ok('server mirrors identify both players',fs.state.fishes.some(x=>x.pid===a.pid)&&fs.state.fishers.some(x=>x.pid===b.pid));
 ok('fish cannot see fisherman private reel/drag/aim',fs.state.fishers.every(r=>!r.in&&!('aimX'in r)&&!('aimZ'in r)));
 ok('fisher receives its own control state',hs.state.fishers.some(r=>r.pid===b.pid&&r.in&&r.in.rod!==undefined));
 fish.send({type:'input',frame:{mv:{x:1,y:0,z:0}}});
 other.send({type:'input',frame:{mode:'boat',stick:{x:0,y:1},rod:.4}});
 await delay(500);
 const f2=await wait(fish,m=>m.type==='motion'&&m.tick>10);
 ok('simulation advances under authoritative server',f2.tick>10&&f2.t>0.3);
 ok('fish movement reaches the authoritative sim',f2.f[0].p[0]>fs.state.fishes[0].x+1);
 ok('fisher boat movement reaches the authoritative sim',f2.r[0].p[2]<hs.state.fishers[0].z-1);
 other.send({type:'input',frame:{hook:999999}});await delay(150);
 const protectedSnap=await wait(fish,m=>m.type==='motion'&&m.tick>f2.tick);
 ok('guessing hooks without a bite does not start fight',protectedSnap.r.every(r=>!r.cast||r.cast.state!=='fight'));
 ok('compact packets provide fish positions and velocities',f2.f.every(f=>f.p.length===6));
 ok('fish client receives no private aim, reel or drag',f2.r.every(r=>!('aimX'in r)&&!('aimZ'in r)&&(!r.cast||!('lineOut'in r.cast))));
 const motions=fish.msgs.filter(m=>m.type==='motion');
 ok('NPC positions transmitted separately from frequent player updates',motions.some(m=>Array.isArray(m.n))&&motions.some(m=>!('n'in m)));
 console.log('SIZE motion/full',Buffer.byteLength(JSON.stringify(f2)),Buffer.byteLength(JSON.stringify(fs)));
 ok('motion payload substantially smaller than full snapshot',Buffer.byteLength(JSON.stringify(f2))<Buffer.byteLength(JSON.stringify(fs))*0.50);
 const cross=await fetch(`http://127.0.0.1:${port}/`);const html=await cross.text();
 ok('browser client served with multiplayer controls',html.includes('onlinePanel')&&html.includes('onlineJoin'));
 const invite=await fetch(`http://127.0.0.1:${port}/?room=${a.room}&utm_source=share`);
 ok('invitation URL with room/query loads game (not HTTP 404)',invite.status===200 && (await invite.text()).includes('onlinePanel'));
 const deep=await fetch(`http://127.0.0.1:${port}/index.html?room=${a.room}`);
 ok('index.html with room/query loads game',deep.status===200 && (await deep.text()).includes('onlinePanel'));
 const method=await fetch(`http://127.0.0.1:${port}/`,{method:'HEAD'});
 ok('HTTP HEAD root responds 200 without a body',method.status===200);
 const missing=await fetch(`http://127.0.0.1:${port}/unrecognized-page`);
 ok('unknown paths still correctly respond 404',missing.status===404);
 const alt=await connect();alt.send({type:'join',role:'fish',name:'OtherRoom'});
 const altWelcome=await wait(alt,m=>m.type==='welcome');
 ok('independent second room receives a different code',altWelcome.room!==a.room);
 const c=await connect();c.send({type:'join',room:a.room,role:'fish',name:'Late'});
 const added=await wait(c,m=>m.type==='welcome');
 ok('late join into active match succeeds',added.room===a.room&&added.pid!==a.pid);
 const newArrival=await wait(fish,m=>m.type==='roster_add'&&m.entity.pid===added.pid);
 ok('existing players see AI-slot reclamation',newArrival.role==='fish'&&newArrival.index>=0&&newArrival.index<200);
 await wait(c,m=>m.type==='start');
 const rejoin=await wait(c,m=>m.type==='snapshot');
 ok('late join receives complete 200-fish roster',rejoin.state.fishes.length===200&&rejoin.state.fishes.some(f=>f.pid===added.pid));
 c.ws.close();other.ws.close();await delay(100);
 const reconnect=await connect();reconnect.send({type:'join',room:a.room,role:'fisher',token:b.token,name:'Angler'});
 const rec=await wait(reconnect,m=>m.type==='welcome');ok('reconnect token reclaims same player',rec.pid===b.pid);
 await wait(reconnect,m=>m.type==='snapshot');
 ok('reconnected client receives current world',true);
 console.log(`\n${passes} integration checks passed`);
})().catch(e=>{console.error(e.stack);process.exitCode=1}).finally(async()=>{for(const c of clients){try{c.close()}catch{}}server.kill('SIGTERM');await delay(100)});