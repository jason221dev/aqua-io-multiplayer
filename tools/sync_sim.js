'use strict';
/* Mirror aqua_sim.js into the index.html SIM block (what tests/test_sim_sync.js checks). */
const fs = require('node:fs');
const src = fs.readFileSync('aqua_sim.js', 'utf8').replace(/\nif\(typeof module!=='undefined'&&module\.exports\)module\.exports=Aqua;\s*$/, '\n');
let html = fs.readFileSync('index.html', 'utf8');
const bi = html.indexOf('/*SIM:BEGIN*/') + '/*SIM:BEGIN*/'.length, ei = html.indexOf('/*SIM:END*/');
fs.writeFileSync('index.html', html.slice(0, bi) + '\n' + src.trim() + '\n' + html.slice(ei));
console.log('index.html SIM block synced');
