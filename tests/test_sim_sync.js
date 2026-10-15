const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const simulation=html.slice(html.indexOf('/*SIM:BEGIN*/')+'/*SIM:BEGIN*/'.length,html.indexOf('/*SIM:END*/'));
const onDisk=fs.readFileSync('aqua_sim.js','utf8');
assert.equal(onDisk.trim(),(simulation.trim()+"\nif(typeof module!=='undefined'&&module.exports)module.exports=Aqua;").trim());
console.log('PASS deployed server simulation exactly matches in-browser simulation');
