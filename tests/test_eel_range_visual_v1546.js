'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const A=require('../aqua_sim');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const template=fs.readFileSync(path.join(__dirname,'../index.template.html'),'utf8');
assert.equal(A.ABILITY.shockRadius,85,'effective radius halved');
assert.equal(A.ABILITY.clownRadius,170,'clown protection remains 170');
assert.equal(A.ABILITY.shockRadius*2,A.ABILITY.clownRadius);
for(const source of [html,template]){
  for(const token of ['SHOCK REACH · 85 UNIT RADIUS','function buildEelReachFX()','function updateEelReachFX()','radius=Aqua.ABILITY.shockRadius','eelReachFX.group.visible=visible','updateRespawnNets();updateEelReachFX();', 'elapsed>=.98?elapsed-.98:elapsed'])
    assert(source.includes(token),'Missing range feedback '+token);
  assert(source.includes("f.sp==='eel'&&(f.abilT||0)>0"),'Only Eel activation shows range');
  assert(source.includes("playerRole==='fish'&&observerMode==='off'"),'No spectator / fisherman indicator');
  assert(source.includes('fx.group.position.set(f.x,-f.y,f.z)'),'Guide centered on own fish');
  assert(source.includes('new THREE.SphereGeometry(1,24,12)'),'3D area, not an inaccurate flat ring');
  assert(!source.includes('RELEASE 170-UNIT SHOCK'),'No stale Eel demo range');
}
assert.match(fs.readFileSync(path.join(__dirname,'../aqua_sim.js'),'utf8'),/const EEL_SHOCK_RADIUS=85;/);
console.log('PASS v1.5.46 Eel: 85-unit authoritative radius, two-wave player-only 3D reach visualization, correct menu messaging');
