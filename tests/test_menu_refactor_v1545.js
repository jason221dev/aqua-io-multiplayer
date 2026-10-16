'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
for(const file of ['index.template.html','index.html']){
 const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 assert.match(source,/const SPECIES_KEYS=Object\.freeze\(Object\.keys\(SP\)\)/,file+': stable ordering');
 assert.match(source,/function menuAccent\(\)/,file+': dynamic accent');
 assert.match(source,/function syncMenu\(\)\{menuAccent\(\);/,file+': menu refresh contract');
 assert.match(source,/function chooseMenuSpecies\(key,focus=false\)/,file+': one species navigation path');
 assert.match(source,/const speciesButtons=Array\.from\(speciesList\.querySelectorAll/,file+': cached cards');
 assert.match(source,/function wireSpeciesNav\(\)/,file+': keyboard and stage swipe');
 assert.match(source,/setPointerCapture/,file+': robust touch gestures');
 assert.match(source,/event\.key==='ArrowRight'/,file+': keyboard navigation');
 assert.match(source,/button\.tabIndex=on\?0:-1/,file+': accessible roving focus');
 assert.match(source,/safeFishMenuPreview\(selSp\)/,file+': animation keeps selection');
 assert.match(source,/<title>aqua\.io — v1\.5\.(?:45|46)/,file+': version');
}
console.log('PASS v1.5.45 menu refactor: unified selection, cached cards, touch capture, arrow navigation and focus');
