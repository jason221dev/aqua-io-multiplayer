'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const A=require('../aqua_sim');let tests=0;
const check=(label,fn)=>{fn();tests++;console.log('PASS '+label)};
const vmctx=vm.createContext({console,Math,ME:'owner',SP:A.SP,activeAbility:A.activeAbility,inKelp:()=>false});
const start=html.indexOf('const ABILITY_VFX_PROFILES='),end=html.indexOf('// Per-instance alpha lives',start);
vm.runInContext(html.slice(start,end),vmctx);
const f=(shockT=0,eelSlowT=0,clownSlowT=0,prot=0,alive=true)=>({sp:'guppy',shockT,eelSlowT,clownSlowT,prot,alive,human:false});
check('Eel stun and aftershock both display the icon only when eelSlowT is positive',()=>{
 assert.equal(vmctx.fishAbilityFeedback(f(.65,3.2),1,0).eelShock,true);
 assert.equal(vmctx.fishAbilityFeedback(f(0,1.2),1,0).eelShock,true);
 assert.equal(vmctx.fishAbilityFeedback(f(0,0),1,0).eelShock,false);
});
check('Clownfish retaliation does not impersonate Eel shock',()=>{
 assert.equal(vmctx.fishAbilityFeedback(f(.65,0,1.4),1,0).eelShock,false);
});
check('Protected, dead, and locally owned fish are not given rival-only bolt symbols',()=>{
 assert.equal(vmctx.fishAbilityFeedback(f(.65,3.2,0,6),1,0).eelShock,false);
 assert.equal(vmctx.fishAbilityFeedback(f(.65,3.2,0,0,false),1,0).eelShock,false);
 const fish=f(.65,3.2);fish.human=true;fish.pid='owner';
 assert.equal(vmctx.fishAbilityFeedback(fish,1,0).eelShock,false);
});
check('Status icon batching is available for both detailed and instanced opponents',()=>{
 assert(html.includes('e.shockIcon.visible=feedback.eelShock'));
 assert(html.includes('emitRivalFeedback(remoteIM.eelShock'));
 assert(html.includes('if(remoteIM.eelShock)remoteIM.eelShock.count=0'));
 assert(html.includes('if(remoteIM.eelShock)flushRivalBatch(remoteIM.eelShock)'));
});
check('Packed online metadata and JSON fallback transmit the eelSlowT timer',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert(server.includes('eelSlowT:q(f.eelSlowT||0)'));
 assert(server.includes('MV.packFishMeta(f,i,q)'));
 assert(html.includes("'shockT','eelSlowT','camoT'"));
 assert(html.includes("'shockT','eelSlowT','camoT','whirlT'"));
});
check('Binary status metadata round-trips all fields identically in Node and browser',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert(server.includes('MV.packFishMeta(f,i,q)'),'server must pack schema through shared transport module');
 const MV=require('../motion_v2');
 const data={};for(const [i,name] of ['air','prot','respawn','abilT','abilCD','markT','shockT','eelSlowT','camoT','whirlT','surge','inflateBlend','fightStamina','peak','kills','fishEaten','esc','flickT','lungeT','stingT','slowT','dazzledT','lockF','lockN','reentryT','spectateT','spectateTarget','holding','clownSlowT','clownGuardT'].entries())data[name]=(name==='air'||name==='holding')?1:i+1;
 const fields=Object.keys(data);
 const extra={mc:1,fm:[[4,...fields.map(k=>data[k])]]};
 const bytes=MV.encode({tick:9,t:10,extra});
 const node=MV.decode(bytes).fm[0][1];
 const inlineScripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const script=inlineScripts.find(x=>x.includes('root.AquaMotionV2=api'));
 assert(script,'missing browser binary decoder');
 const browser=vm.createContext({TextEncoder,TextDecoder,Uint8Array,DataView,ArrayBuffer,console,Math});
 vm.runInContext(script,browser);
 const client=browser.AquaMotionV2.decode(bytes).fm[0][1];
 for(const key of fields){
  const expected=(key==='air'||key==='holding')?true:data[key];
  assert.equal(node[key],expected,`Node metadata field ${key} at incorrect position`);
  assert.equal(client[key],expected,`Browser metadata field ${key} at incorrect position`);
 }
});
check('Net release lookup agrees with latest still-present batch and returns null when expired',()=>{
 const s=html.slice(html.indexOf('function latestVisibleRespawnBatch('),html.indexOf('function sharedRespawnNetPose()'));
 vm.runInContext(s,vmctx);
 vmctx.respawnBatches=[{t0:0,id:1},{t0:8,id:2},{t0:12,id:3}];
 assert.equal(vmctx.latestVisibleRespawnBatch(12.5).id,3);
 vmctx.respawnBatches=vmctx.respawnBatches.slice(0,2);
 assert.equal(vmctx.latestVisibleRespawnBatch(9).id,2);
 assert.equal(vmctx.latestVisibleRespawnBatch(15),null);
});
console.log(`${tests} audit regressions passed`);
