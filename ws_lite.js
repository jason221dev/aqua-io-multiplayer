'use strict';
// Small RFC 6455 JSON transport for dependency-free test hosting.
// No WebSocket extensions, compression or fragmented client frames.
const crypto=require('node:crypto');
class WS {
  constructor(socket, onMessage, onClose) {
    this.socket=socket; this.onMessage=onMessage; this.onClose=onClose;
    this.buf=Buffer.alloc(0); this.closed=false; this.lastPong=Date.now();
    socket.on('data', chunk=>this.read(chunk));
    socket.on('close', ()=>this.close());socket.on('error',()=>this.close());
  }
  frame(op,payload) {
    if(this.closed||!this.socket.writable||this.socket.writableLength>1_500_000)return false;
    const data=Buffer.isBuffer(payload)?payload:Buffer.from(payload||'');
    const h=data.length<126?Buffer.allocUnsafe(2):data.length<=65535?Buffer.allocUnsafe(4):Buffer.allocUnsafe(10);
    h[0]=0x80|op;if(h.length===2)h[1]=data.length;
    else if(h.length===4){h[1]=126;h.writeUInt16BE(data.length,2)}
    else {h[1]=127;h.writeBigUInt64BE(BigInt(data.length),2)}
    this.socket.cork();
    try {this.socket.write(h);return this.socket.write(data)}
    finally {this.socket.uncork()}
  }
  send(obj){return this.frame(1,JSON.stringify(obj))}
  sendRaw(str){return this.frame(1,str)}
  sendBinary(bytes){return this.frame(2,bytes)}
  ping(){return this.frame(9,'hi')}
  read(chunk){
    if(this.closed)return;
    this.buf=Buffer.concat([this.buf,chunk]);
    if(this.buf.length>96_000){this.fail();return}
    while(this.buf.length>=2){
      const a=this.buf[0],b=this.buf[1],opcode=a&15,fin=(a&0x80)!==0,masked=(b&0x80)!==0;
      let len=b&127,off=2;
      if((a&0x70)||!fin||!masked||![1,8,9,10].includes(opcode)){this.fail();return}
      if(len===126){if(this.buf.length<4)return;len=this.buf.readUInt16BE(2);off=4}
      else if(len===127){if(this.buf.length<10)return;const v=this.buf.readBigUInt64BE(2);if(v>65536n){this.fail();return}len=Number(v);off=10}
      if(len>32768 ||(opcode>=8&&len>125)){this.fail();return}
      if(this.buf.length<off+4+len)return;
      const mask=this.buf.subarray(off,off+4), data=Buffer.from(this.buf.subarray(off+4,off+4+len));
      for(let i=0;i<data.length;i++)data[i]^=mask[i&3];
      this.buf=this.buf.subarray(off+4+len);
      if(opcode===8){this.close();return}
      if(opcode===9){this.frame(10,data);continue}
      if(opcode===10){this.lastPong=Date.now();continue}
      try{const txt=new TextDecoder('utf-8',{fatal:true}).decode(data);const msg=JSON.parse(txt);this.onMessage(msg)}catch(e){this.fail();return}
    }
  }
  fail(){if(!this.closed)this.socket.destroy();this.close()}
  close(){if(this.closed)return;this.closed=true;this.socket.destroy();this.onClose(this)}
}
function upgrade(req,socket,head,onMessage,onClose){
  const key=req.headers['sec-websocket-key'];
  if(req.url!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||typeof key!=='string'||Buffer.from(key,'base64').length!==16){socket.destroy();return null}
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  const ws=new WS(socket,onMessage,onClose);if(head.length)ws.read(head);return ws;
}
module.exports={WS,upgrade};
