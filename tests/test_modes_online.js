'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const port=34600+Math.floor(Math.random()*1000),url='ws://127.0.0.1:'+port+'/ws';
const server=spawn(process.execPath,['server.js'],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,PORT:String(port),MAX_ROOMS:'4'},stdio:'ignore'});
const clients=[];
async function connect(){const ws=new WebSocket(url),msgs=[];clients.push(ws);ws.addEventListener('message',e=>{if(typeof e.data==='string'){try{msgs.push(JSON.parse(e.data))}catch{}}});await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});return{ws,msgs,send:x=>ws.send(JSON.stringify(x))}}
async function wait(c,fn){const end=Date.now()+12000;while(Date.now()<end){const i=c.msgs.findIndex(fn);if(i>=0)return c.msgs.splice(i,1)[0];await delay(25)}throw Error('Timeout waiting: '+c.msgs.map(m=>m.type))}
(async()=>{let ready=false;for(let i=0;i<150;i++){try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok){ready=true;break}}catch{}await delay(40)}assert.ok(ready);
 const host=await connect();host.send({type:'join',role:'fish',mode:'last'});const a=await wait(host,x=>x.type==='welcome');assert.equal(a.mode,'last');
 const guest=await connect();guest.send({type:'join',role:'fish',mode:'free',room:a.room});const b=await wait(guest,x=>x.type==='welcome');assert.equal(b.mode,'last');
 assert.equal((await wait(host,x=>x.type==='start')).mode,'last');assert.equal((await wait(host,x=>x.type==='snapshot')).state.rules.mode,'last');
 const late=await connect();late.send({type:'join',role:'fish',room:a.room});assert.match((await wait(late,x=>x.type==='error')).message,/underway/);
 const free=await connect();free.send({type:'join',role:'fish',mode:'free'});assert.equal((await wait(free,x=>x.type==='welcome')).mode,'free');free.send({type:'start'});
 await wait(free,x=>x.type==='start');assert.equal((await wait(free,x=>x.type==='snapshot')).state.rules.mode,'free');
 free.send({type:'leave'});await delay(150);assert.equal(free.ws.readyState,WebSocket.CLOSED);
 console.log('PASS multiplayer host mode, guest lock, elimination late join, free mode, Exit');
})().catch(e=>{console.error(e.stack);process.exitCode=1}).finally(async()=>{for(const ws of clients){try{ws.close()}catch{}}server.kill();await delay(80)});
