'use strict';
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {WS}=require('../ws_lite');
const crypto=require('node:crypto');
class FakeSocket extends EventEmitter{
  constructor(){super();this.writable=true;this.writableLength=0;this.writes=[];this.destroyed=false;}
  cork(){} uncork(){}
  write(b){this.writes.push(Buffer.from(b));return true;}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.writable=false;this.emit('close');}
}
function maskedFrame(object){
 const body=Buffer.from(JSON.stringify(object)),mask=crypto.randomBytes(4);
 assert(body.length<126);
 const data=Buffer.alloc(2+4+body.length);data[0]=0x81;data[1]=0x80|body.length;mask.copy(data,2);
 for(let i=0;i<body.length;i++)data[6+i]=body[i]^mask[i%4];return data;
}
const socket=new FakeSocket(),received=[];const ws=new WS(socket,m=>received.push(m),()=>{});
const p1=maskedFrame({type:'input',tap:1}),p2=maskedFrame({type:'probe',id:4});
socket.emit('data',p1);
assert.equal(received.length,1);assert.equal(received[0].tap,1);
assert.equal(ws.buf.length,0);console.log('PASS complete frame consumes buffer without copy');
socket.emit('data',p2.subarray(0,3));assert.equal(received.length,1);
socket.emit('data',p2.subarray(3));assert.equal(received.length,2);assert.equal(received[1].id,4);
assert.equal(ws.buf.length,0);console.log('PASS fragmented TCP delivery reassembled');
socket.emit('data',Buffer.concat([p1,p2]));assert.equal(received.length,4);assert.equal(ws.buf.length,0);
console.log('PASS multiple WebSocket frames in one TCP chunk');
const invalid=Buffer.from([0x81,0x01,0x61]);socket.emit('data',invalid);
assert(ws.closed&&socket.destroyed);console.log('PASS unmasked client frames rejected');
