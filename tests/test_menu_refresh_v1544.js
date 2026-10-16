'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const file of ['index.template.html','index.html']){
  const page=fs.readFileSync(path.join(root,file),'utf8');
  const menu=page.slice(page.indexOf('<div id="menu" class="ov">'),page.indexOf('<div id="onlinePanel"'));
  assert.ok(menu.length>1000,file+': menu block found');
  const ids=[...menu.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const dupes=ids.filter((id,i)=>ids.indexOf(id)!==i);
  assert.deepEqual(dupes,[],file+': duplicate ids in menu: '+dupes.join(','));
  for(const id of ['spCount','menuFisherHelp','showScenario','showPhase','showReplay'])assert.ok(ids.includes(id),file+': missing #'+id);
  assert.match(menu,/class="stageSea"/);
  assert.match(menu,/class="brandMark"/);
  assert.doesNotMatch(menu,/<img\b[^>]*\bsrc=/);
  assert.ok(menu.indexOf('class="guide"')<menu.indexOf('class="dock"'),file+': dock must be the last element');
  assert.match(page,/@font-face\{font-family:"Fredoka"[^}]*data:font\/woff2;base64,/,file+': Fredoka embedded');
  assert.match(page,/<meta name="theme-color"/);
  assert.match(page,/function menuAccent\(\)/);
  assert.match(page,/function syncMenu\(\)\{menuAccent\(\);/);
  assert.match(page,/function wireSpeciesNav\(\)/);
  assert.doesNotMatch(page,/animation:kelpSway/,'decorative seabed must stay static for mobile performance');
  assert.match(page,/#menu #play:after\{[^}]*translateX/,'CTA shine must animate transform only');
  assert.match(page,/prefers-reduced-motion:reduce\)\{#menu #spList \.sp\.on \.portrait svg,#menu #play:after\{animation:none\}/);
}
console.log('PASS v1.5.44 main screen refresh: unique ids, embedded Fredoka, stage diorama, fisher card, dock order, motion budget');
