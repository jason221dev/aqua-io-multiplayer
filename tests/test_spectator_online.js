'use strict';
const assert=require('node:assert/strict');
const MV=require('../motion_v2');
const {setTimeout:delay}=require('node:timers/promises');
const port=36050+Math.floor(Math.random()*1500);
process.env.PORT=String(port);
const {server,rooms,issueBinaryMotion}=require('../server');
const clients=[];
async function connect(){
 const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);ws.binaryType='arraybuffer';
 const messages=[];ws.onmessage=e=>{try{messages.push(typeof e.data==='string'?JSON.parse(e.data):MV.decode(e.data))}catch(err){console.error(err)}};
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 clients.push(ws);return{ws,messages,send:x=>ws.send(JSON.stringify(x))}
}
async function wait(c,fn,timeout=6500){const end=Date.now()+timeout;while(Date.now()<end){const i=c.messages.findIndex(fn);if(i>=0)return c.messages.splice(i,1)[0];await delay(25)}throw Error('Timed out waiting for '+fn)}
(async()=>{
 await new Promise(r=>server.listening?r():server.once('listening',r));
 const a=await connect();a.send({type:'join',mode:'last',role:'fish',name:'Victim'});
 const one=await wait(a,m=>m.type==='welcome');
 const b=await connect();b.send({type:'join',room:one.room,mode:'last',role:'fish',name:'Pred1'});
 await wait(b,m=>m.type==='welcome');await wait(a,m=>m.type==='start');await wait(a,m=>m.type==='snapshot');
 const room=rooms.get(one.room),sim=room.sim;room.started=false;const victim=sim.fishes.find(f=>f.pid===one.pid),pred=sim.fishes.find(f=>f.pid!==one.pid),next=sim.fishes.find(f=>f!==victim&&f!==pred);
 Object.assign(victim,{x:550,y:350,z:0,prot:0,mass:100});
 Object.assign(pred,{x:3500,y:350,z:0,prot:0,mass:500});
 Object.assign(next,{x:4900,y:350,z:0,prot:0,mass:950});
 sim.kill(victim,'eaten',pred);sim.kill(pred,'eaten',next);
 assert.strictEqual(victim.spectateTarget,pred.i);assert.strictEqual(pred.spectateTarget,next.i);
 a.messages.length=0;issueBinaryMotion(room,Date.now()+1200,false,false,true);
 let packet=await wait(a,m=>m.type==='motion'&&Array.isArray(m.fm)&&m.fm.some(x=>x[0]===pred.i)&&m.fm.some(x=>x[0]===next.i));
 const p=packet.fm.find(x=>x[0]===pred.i)[1];assert.strictEqual(p.spectateTarget,next.i);
 const pnext=packet.fm.find(x=>x[0]===next.i)[1];assert.notEqual(pnext,undefined);
 console.log('PASS remote predator and successor metadata delivered to eliminated player despite >900-unit separation');
 console.log('PASS encoded death-chain successor ID survived actual WebSocket binary transport');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const c of clients)try{c.close()}catch{};server.close()});
