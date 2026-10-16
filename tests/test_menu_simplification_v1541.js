'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const template=fs.readFileSync(path.join(root,'index.template.html'),'utf8');
const compiled=fs.readFileSync(path.join(root,'index.html'),'utf8');
const {SP}=require('../aqua_sim.js');
for(const page of [template,compiled]){
  for(const id of ['menu','roleChoice','fishShowcase','spList','showName','showAbility','showCanvas','showSummary','showStrength','showWeakness','showRolePill','showFxGlyph','showDurationMeta','showCooldownMeta','showInputMeta','showStats','showEffect','showWhen','showLimit','showControls','showReplay','showTimeline','showNarration','showPhase','modeFree','modeLast','menuSettings','steerSensitivity','fpsDiagnostics','swap','play','onlineButton']){
    const matches=[...page.matchAll(new RegExp('<[a-zA-Z][^>]*\\bid="'+id+'"','g'))];
    assert.equal(matches.length,1,`${id} must occur in exactly one DOM element`);
  }
  const menu=page.slice(page.indexOf('<div id="menu" class="ov">'),page.indexOf('<div id="onlinePanel"'));
  assert.match(menu,/<details id="abilityDetails">/);
  assert.match(menu,/<details id="menuSettings">/);
  assert.doesNotMatch(menu,/id="menuSettings"[^>]*\bopen\b/);
  assert.doesNotMatch(menu,/id="abilityDetails"[^>]*\bopen\b/);
  assert.match(menu,/STRENGTH/);
  assert.match(menu,/WATCH OUT/);
  assert.doesNotMatch(menu,/<img\b[^>]*\bsrc=/); // Portraits require no external image fetch.
}
const start=template.indexOf('const SPECIES_INPUT_TIPS=');
const stop=template.indexOf('function setGameMode(mode){',start);
assert.ok(start>0&&stop>start);
const piece=template.slice(start,stop);
const mock={innerHTML:''};
const output=vm.runInNewContext(piece+'\n({portraits:Object.fromEntries(Object.keys(SP).map(k=>[k,fishPortrait(k)])),traits:SPECIES_TRAITS,html:$("spList").innerHTML});',{
  SP,$:()=>mock
});
assert.equal(Object.keys(output.portraits).length,13);
for(const sp of Object.keys(SP)){
  assert.match(output.portraits[sp],/^<svg viewBox=/,sp);
  assert.equal(output.traits[sp].length,3,sp);
  assert.match(output.html,new RegExp('data-k="'+sp+'"'));
}
const allBodies=Object.values(output.portraits);
assert.equal(new Set(allBodies).size,13,'all 13 fish portraits must be distinct');
assert.match(output.traits.piranha[1],/Normal speed/);
assert.match(output.traits.seahorse[1],/edible by contact/);
assert.match(template,/angel:'HALO SNARE'/);
assert.doesNotMatch(template,/const dash=\[[^\]]*'piranha'/);
assert.match(template,/G\.boltTex/);
console.log('PASS v1.5.41 simplified menu: 13 portraits, strength/weakness, accessibility, advanced settings, correct demo cues');
