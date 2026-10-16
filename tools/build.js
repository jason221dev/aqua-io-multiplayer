#!/usr/bin/env node
'use strict';
/** Deterministic single-file HTML build. Node and browser consume the SAME canonical files. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const template=fs.readFileSync(path.join(root,'index.template.html'),'utf8');
const sim=fs.readFileSync(path.join(root,'aqua_sim.js'),'utf8').replace(/\nif\(typeof module!=='undefined'&&module\.exports\)module\.exports=Aqua;\s*$/,'\n');
const motion=fs.readFileSync(path.join(root,'motion_v2.js'),'utf8');
const placeholders=[['/* AQUA_BUILD_MOTION_V2 */',motion.trimEnd()],['/* AQUA_BUILD_SIM */',sim.trimEnd()]];
let output=template;
for(const [marker,value] of placeholders){
 const found=output.split(marker).length-1;
 if(found!==1)throw Error(`index.template.html: expected one ${marker} marker; found ${found}`);
 if(value.includes('</script'))throw Error('Embedded module contains a script-closing tag');
 output=output.replace(marker,value);
}
output=output.replace(/\r\n/g,'\n');
const pathOut=path.join(root,'index.html');
const digest=crypto.createHash('sha256').update(output).digest('hex');
if(process.argv.includes('--check')){
 if(!fs.existsSync(pathOut)||fs.readFileSync(pathOut,'utf8')!==output){
  console.error('FAIL index.html is stale. Run npm run build and commit regenerated output.');process.exit(1);
 }
 console.log('PASS generated browser simulation + binary transport match canonical sources: '+digest.slice(0,16));
}else{
 if(!fs.existsSync(pathOut)||fs.readFileSync(pathOut,'utf8')!==output)fs.writeFileSync(pathOut,output);
 console.log('Generated index.html ('+Buffer.byteLength(output)+' bytes, sha256 '+digest.slice(0,16)+')');
}
