/* aqua.io binary, change-only motion protocol. v2, big-endian, no dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.AquaMotionV2=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAGIC=0x41514d32, VERSION=2, HEADER=26, F_SIZE=24, N_SIZE=20, P_SIZE=8;
 // Wire metadata schema: one canonical ordering shared by server serializer and browser decoder.
 // Position 0 in each packed row is the fish's roster index.
 const META_FIELDS=Object.freeze(['air','prot','respawn','abilT','abilCD','markT','shockT','eelSlowT','camoT','whirlT','surge','inflateBlend','fightStamina','peak','kills','fishEaten','esc','flickT','lungeT','stingT','slowT','dazzledT','lockF','lockN','reentryT','spectateT','spectateTarget','holding','clownSlowT','clownGuardT']);
 const enc=new TextEncoder(),dec=new TextDecoder();
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:0));
 const u16=v=>Math.round(clamp(v,0,65535)),i16=v=>Math.round(clamp(v,-32768,32767));
 const eq=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
 function fishRecord(i,e,hookIndex=e.hooked?.r??-1,hookEsc=e.hooked?.esc??0){
  const b=new Uint8Array(F_SIZE),d=new DataView(b.buffer);
  d.setUint16(0,i);d.setUint16(2,u16(e.x*10));d.setUint16(4,u16(e.y*10));d.setInt16(6,i16(e.z*10));
  d.setInt16(8,i16((e.vx||0)*10));d.setInt16(10,i16((e.vy||0)*10));d.setInt16(12,i16((e.vz||0)*10));
  d.setInt16(14,i16((e.hx||0)*10000));d.setInt16(16,i16((e.hz||0)*10000));
  d.setUint16(18,u16(e.mass));d.setUint8(20,e.alive!==false?1:0);
  d.setInt16(21,i16(hookIndex));d.setUint8(23,u16(hookEsc*255));return b;
 }
 function npcRecord(i,e,hookIndex=e.hooked?.r??-1,hookEsc=e.hooked?.esc??0){
  const b=new Uint8Array(N_SIZE),d=new DataView(b.buffer);
  d.setUint16(0,i);d.setUint16(2,u16(e.x*10));d.setUint16(4,u16(e.y*10));d.setInt16(6,i16(e.z*10));
  d.setInt16(8,i16((e.vx||0)*10));d.setInt16(10,i16((e.vy||0)*10));d.setInt16(12,i16((e.vz||0)*10));
  d.setUint16(14,u16(e.mass));d.setUint8(16,e.alive!==false?1:0);
  d.setInt16(17,i16(hookIndex));d.setUint8(19,u16(hookEsc*255));return b;
 }
 function plankRecord(i,e){const b=new Uint8Array(P_SIZE),d=new DataView(b.buffer);
  d.setUint16(0,i);d.setUint16(2,u16(e.x*10));d.setUint16(4,u16(e.y*10));d.setInt16(6,i16(e.z*10));return b;}
 function packFishMeta(f,index,q){
  const target=f.lungeTarget;
  return [index,...META_FIELDS.map(k=>{
   if(k==='air'||k==='holding')return f[k]?1:0;
   if(k==='lockF')return target?.sp?target.i:-1;
   if(k==='lockN')return target&&!target.sp?target.id:-1;
   if(k==='spectateTarget')return f.spectateTarget??-1;
   if(k==='kills'||k==='fishEaten'||k==='esc')return f[k]||0;
   return q(f[k]||0);
  })];
 }
 function unpackFishMeta(row){
  if(!Array.isArray(row)||row.length!==META_FIELDS.length+1)throw Error('incorrect motion metadata field count');
  const o={};for(let i=0;i<META_FIELDS.length;i++){
    const k=META_FIELDS[i],v=row[i+1];o[k]=k==='air'||k==='holding'?v===1:v;
  }return [row[0],o];
 }
 function same(a,b){if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
 function encode(msg){
  const {f=[],n=[],pl=[],vis=null,nvis=null,extra={}}=msg;
  const npc=!!msg.npc,plank=!!msg.plank;
  const flags=(vis?1:0)|(nvis?2:0)|(npc?4:0)|(plank?8:0);
  const json=enc.encode(JSON.stringify(extra));if(json.length>65535)throw Error('motion extra too large');
  const len=HEADER+f.length*F_SIZE+n.length*N_SIZE+pl.length*P_SIZE+(vis?.length||0)*2+(nvis?.length||0)*2+json.length;
  const b=new Uint8Array(len),d=new DataView(b.buffer);d.setUint32(0,MAGIC);d.setUint8(4,VERSION);d.setUint8(5,flags);
  for(const [o,v] of [[6,f.length],[8,n.length],[10,pl.length],[12,vis?.length||0],[14,nvis?.length||0]])d.setUint16(o,u16(v));
  d.setUint32(16,(msg.tick||0)>>>0);d.setUint32(20,Math.max(0,Math.round((msg.t||0)*1000))>>>0);d.setUint16(24,json.length);
  let off=HEADER;for(const e of f){if(e.length!==F_SIZE)throw Error('bad fish record');b.set(e,off);off+=F_SIZE}
  for(const e of n){if(e.length!==N_SIZE)throw Error('bad NPC record');b.set(e,off);off+=N_SIZE}
  for(const e of pl){if(e.length!==P_SIZE)throw Error('bad plank record');b.set(e,off);off+=P_SIZE}
  if(vis)for(const i of vis){d.setUint16(off,i);off+=2}if(nvis)for(const i of nvis){d.setUint16(off,i);off+=2}
  b.set(json,off);return b;
 }
 function decode(data){
  const b=data instanceof Uint8Array?data:new Uint8Array(data),d=new DataView(b.buffer,b.byteOffset,b.byteLength);
  if(b.length<HEADER||d.getUint32(0)!==MAGIC||d.getUint8(4)!==VERSION)throw Error('unsupported aqua.io binary motion');
  const flags=d.getUint8(5),fc=d.getUint16(6),nc=d.getUint16(8),pc=d.getUint16(10),vc=d.getUint16(12),nvc=d.getUint16(14),jl=d.getUint16(24);
  const required=HEADER+fc*F_SIZE+nc*N_SIZE+pc*P_SIZE+vc*2+nvc*2+jl;if(required!==b.length)throw Error('truncated or trailing motion data');
  let off=HEADER;const f=[],n=[],plank=[];
  for(let k=0;k<fc;k++,off+=F_SIZE){const i=d.getUint16(off),h=d.getInt16(off+21),esc=d.getUint8(off+23)/255;
   f.push([i,d.getUint16(off+2)/10,d.getUint16(off+4)/10,d.getInt16(off+6)/10,d.getInt16(off+8)/10,d.getInt16(off+10)/10,d.getInt16(off+12)/10,d.getInt16(off+14)/10000,d.getInt16(off+16)/10000,d.getUint16(off+18),d.getUint8(off+20),h,esc]);}
  for(let k=0;k<nc;k++,off+=N_SIZE){n.push([d.getUint16(off),d.getUint16(off+2)/10,d.getUint16(off+4)/10,d.getInt16(off+6)/10,d.getInt16(off+8)/10,d.getInt16(off+10)/10,d.getInt16(off+12)/10,d.getUint16(off+14),d.getUint8(off+16),d.getInt16(off+17),d.getUint8(off+19)/255]);}
  for(let k=0;k<pc;k++,off+=P_SIZE)plank.push([d.getUint16(off),[d.getUint16(off+2)/10,d.getUint16(off+4)/10,d.getInt16(off+6)/10]]);
  let vis,nvis;if(flags&1){vis=[];for(let k=0;k<vc;k++){vis.push(d.getUint16(off));off+=2}}else if(vc)throw Error('bad visibility flag');
  if(flags&2){nvis=[];for(let k=0;k<nvc;k++){nvis.push(d.getUint16(off));off+=2}}else if(nvc)throw Error('bad npc visibility flag');
  const extra=JSON.parse(dec.decode(b.subarray(off,off+jl)));
  if(extra.mc===1&&Array.isArray(extra.fm)){
    extra.fm=extra.fm.map(unpackFishMeta);delete extra.mc;
  }
  const result={...extra,type:'motion',fmt:'c1',b2:true,sparse:true,tick:d.getUint32(16),t:d.getUint32(20)/1000,f};
  if(flags&4)result.n=n;if(flags&8)result.plank=plank;
  if(vis)result.vis=vis;if(nvis)result.nvis=nvis;
  return result;
 }
 return{VERSION,META_FIELDS,packFishMeta,unpackFishMeta,fishRecord,npcRecord,plankRecord,encode,decode,same,eq};
});
