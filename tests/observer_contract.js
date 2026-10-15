const assert=require('node:assert/strict'),fs=require('node:fs');
const h=fs.readFileSync('index.html','utf8');const sim=require('../aqua_sim');
assert(h.includes('id="observeOpen"'));assert(h.includes('id="obsFree"'));assert(h.includes('id="obsLargest"'));
assert(h.includes('function observerFlight('));assert(h.includes('function cameraTarget()'));
assert(h.includes('FOLLOWING PREDATOR · UNTIL MATCH ENDS'));
assert(sim.BALANCE.fishSpawnShield===6);console.log('v1.5.12 deployment contract passed');
