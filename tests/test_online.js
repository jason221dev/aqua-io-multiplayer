'use strict';
// End-to-end test of actual Node WebSockets and authoritative match state.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const port=33400+Math.floor(Math.random()*2000),url=`ws://127.0.0.1:${port}/ws`;
const server=spawn(process.execPath,['server.js'],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
server.stderr.on('data',x=>process.stderr.write('[server] '+x));
const clients=[];let passes=0;function ok(desc,condition){assert.ok(condition,desc);console.log('PASS',desc);passes++}
async function connect(){const ws=new WebSocket(url);clients.push(ws);const msgs=[];ws.addEventListener('message',e=>{try{msgs.push(JSON.parse(e.data))}catch{}});
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
 const f2=await wait(fish,m=>m.type==='snapshot'&&m.tick>20);
 ok('simulation advances under authoritative server',f2.tick>20&&f2.state.t>0.3);
 ok('fish movement reaches the authoritative sim',f2.state.fishes[0].x>fs.state.fishes[0].x+1);
 ok('fisher boat movement reaches the authoritative sim',f2.state.fishers[0].z<hs.state.fishers[0].z-1);
 other.send({type:'input',frame:{hook:999999}});await delay(150);
 const protectedSnap=await wait(fish,m=>m.type==='snapshot'&&m.tick>f2.tick);
 ok('guessing hooks without a bite does not start fight',protectedSnap.state.fishers.every(r=>!r.cast||r.cast.state!=='fight'));
 const cross=await fetch(`http://127.0.0.1:${port}/`);const html=await cross.text();
 ok('browser client served with multiplayer controls',html.includes('onlinePanel')&&html.includes('onlineJoin'));
 const invite=await fetch(`http://127.0.0.1:${port}/?room=${a.room}&utm_source=share`);
 ok('invite link with room/query loads game',invite.status===200&&(await invite.text()).includes('onlinePanel'));
 const deep=await fetch(`http://127.0.0.1:${port}/index.html?room=${a.room}`);
 ok('index.html with room/query loads game',deep.status===200&&(await deep.text()).includes('onlinePanel'));
 const method=await fetch(`http://127.0.0.1:${port}/`,{method:'HEAD'});
 ok('HEAD responds 200',method.status===200);
 const missing=await fetch(`http://127.0.0.1:${port}/unrecognized-page`);
 ok('unrecognized path still returns 404',missing.status===404);
 const alt=await connect();alt.send({type:'join',role:'fish',name:'OtherRoom'});
 const altWelcome=await wait(alt,m=>m.type==='welcome');
 ok('independent second room receives a different code',altWelcome.room!==a.room);
 const c=await connect();c.send({type:'join',room:a.room,role:'fish',name:'Late'});
 const deny=await wait(c,m=>m.type==='error');ok('late join to started match rejected',/already started/i.test(deny.message));
 c.ws.close();other.ws.close();await delay(100);
 const reconnect=await connect();reconnect.send({type:'join',room:a.room,role:'fisher',token:b.token,name:'Angler'});
 const rec=await wait(reconnect,m=>m.type==='welcome');ok('reconnect token reclaims same player',rec.pid===b.pid);
 await wait(reconnect,m=>m.type==='snapshot');
 ok('reconnected client receives current world',true);
 console.log(`\n${passes} integration checks passed`);
})().catch(e=>{console.error(e.stack);process.exitCode=1}).finally(async()=>{for(const c of clients){try{c.close()}catch{}}server.kill('SIGTERM');await delay(100)});
