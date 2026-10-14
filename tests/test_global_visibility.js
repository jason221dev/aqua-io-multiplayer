'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Aqua=require('../aqua_sim'),MV=require('../motion_v2'),{server,issueBinaryMotion}=require('../server');
const sim=Aqua.create();
sim.newMatch({seed:87654,mode:'free',competitorCount:200,maxTotalFish:200,miniFishCount:30,npcCount:0,slots:{fish:[{pid:'left',sp:'guppy'},{pid:'right',sp:'tuna'}]}});
sim.fishes[0].x=80;sim.fishes[1].x=5510;
const far=sim.fishes[10];far.x=5400;far.z=150;
const minnow=sim.npcs[0];minnow.x=5300;minnow.z=150;
const pellet=sim.plank[0];pellet.x=5400;pellet.y=20;pellet.z=130;pellet.alive=true;
const peer=pid=>{const frames=[];return {pid,role:'fish',frames,ws:{closed:false,socket:{writableLength:0},sendBinary:b=>{frames.push(MV.decode(b));return true}}}};
const a=peer('left'),b=peer('right'),room={sim,tick:0,users:new Map([['left',a],['right',b]])};
const send=(t,{npc=true,plank=true,meta=true}={})=>{room.tick++;issueBinaryMotion(room,t,npc,plank,meta)};
try{
 send(1000);
 for(const p of [a,b]){
  const m=p.frames.at(-1);
  assert.equal(m.vis.length,200);
  assert.equal(m.f.length,200);
  assert.equal(m.nvis.length,30);
  assert.equal(m.n.length,30);
  assert.equal(m.plank.length,320);
  assert(m.f.some(r=>r[0]===10&&r[1]>5200),'distant competitor included');
  assert(m.n.some(r=>r[0]===0&&r[1]>5100),'distant minnow included');
  assert(m.plank.some(([i,v])=>i===0&&v[0]>5200),'distant surface food included');
 }
 far.x+=10;
 send(1070,{npc:false,plank:false,meta:false});
 assert(!a.frames.at(-1).f.some(r=>r[0]===10),'distant changes use throttled deltas');
 send(1450,{npc:true,plank:true,meta:false});
 assert(a.frames.at(-1).f.some(r=>r[0]===10),'distant motion eventually updates');
 assert.equal(a.frames.at(-1).vis,undefined,'global visibility list sent only when changed');
 far.alive=false;
 send(1490,{npc:false,plank:false,meta:false});
 assert(a.frames.at(-1).f.some(r=>r[0]===10&&r[10]===0),'elimination bypasses update throttle');
 pellet.alive=false;pellet.x=pellet.y=pellet.z=0;
 send(1550,{npc:false,plank:true,meta:false});
 assert(a.frames.at(-1).plank.some(([i,v])=>i===0&&v.every(n=>n===0)),'eaten distant food clears');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(!html.includes('if(dist2>1800*1800)continue;'));
 assert(!html.includes('!online.visible.fishes.has(i))continue'));
 assert(!html.includes('!online.visible.npcs.has(i))continue'));
 assert.match(html,/sizeAttenuation:false/);
 assert(html.includes('scene.fog.density=.000065'));
 console.log('PASS whole-tank visibility: 200 competitors, 30 schooling minnows, all food, delayed far deltas and instant deaths');
}finally{server.close()}
