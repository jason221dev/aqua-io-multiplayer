#!/usr/bin/env node
/* Regenerates aqua_sim.js (the server-runnable simulation) from the SIM region of index.html.
   usage: node extract_sim.js          write aqua_sim.js
          node extract_sim.js --check  exit 1 if aqua_sim.js is stale (use in CI)            */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const a=html.indexOf('/*SIM:BEGIN*/'),b=html.indexOf('/*SIM:END*/');
if(a<0||b<0){console.error('SIM markers not found');process.exit(2)}
const out=html.slice(a+'/*SIM:BEGIN*/'.length,b).trim()+"\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;\n";
const file=path.join(__dirname,'aqua_sim.js');
if(process.argv.includes('--check')){const cur=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';if(cur!==out){console.error('aqua_sim.js is stale: run node extract_sim.js');process.exit(1)}console.log('aqua_sim.js is up to date');process.exit(0)}
fs.writeFileSync(file,out);console.log('wrote aqua_sim.js ('+out.split('\n').length+' lines)');
