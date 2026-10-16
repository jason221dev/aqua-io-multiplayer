'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const template=fs.readFileSync(path.join(root,'index.template.html'),'utf8');
const built=fs.readFileSync(path.join(root,'index.html'),'utf8');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name)}
for(const [file,html] of [['template',template],['built',built]]){
 test(file+': single restaurant scene and all four wall aspect definitions',()=>{
  assert.equal((html.match(/const LOBBY=\{/g)||[]).length,1);
  assert.match(html,/px:\[\[2048,640\],\[2048,640\],\[1280,720\],\[1280,720\]\]/);
  assert.match(html,/for\(const \[i,x,z,w,ry\] of \[\[0,WW\/2,-roomD\/2,roomW,0\]/);
  assert.match(html,/function roomTexture\(side\)/);
  assert.match(html,/lobbyOverlays\(grp,i,w,LOBBY\.notes\[i\]\)/);
 });
 test(file+': cinematic details and reduced motion',()=>{
  for(const marker of ["['lantern'","['halo'","['cat'","['steam'","['tank'",'function lobbyAssets()','function animLobby()','function lobbyBlur(c)'])
   assert.ok(html.includes(marker),`${file}: missing ${marker}`);
  assert.match(html,/prefers-reduced-motion: reduce/);
  assert.match(html,/const T=performance\.now\(\)\/1000,q=LOBBY\.still\?0:1/);
  assert.match(html,/animateSwallows\(\);updBubbles\(dt\);animProps\(\);animLobby\(\);/);
 });
 test(file+': texture generation one time, not per frame',()=>{
  const sceneBuilder=html.slice(html.indexOf('function buildLivingRoom()'),html.indexOf('function buildCoralGardens()'));
  assert.match(sceneBuilder,/LOBBY\.tex=lobbyAssets\(\)/);
  assert.doesNotMatch(sceneBuilder.slice(sceneBuilder.indexOf('function animLobby()')),/new THREE\.CanvasTexture|document\.createElement/);
  assert.match(html,/g\.filter='blur\(8px\)'/);
 });
}
test('build leaves authoritative simulation unchanged',()=>{
 assert.match(template,/\/\* AQUA_BUILD_SIM \*\//);
 assert.match(template,/\/\* AQUA_BUILD_MOTION_V2 \*\//);
 assert.match(built,/\bfunction buildLivingRoom\(\)/);
 assert.match(fs.readFileSync(path.join(root,'package.json'),'utf8'),/"version": "1\.5\.47"/);
});
console.log(`${count} lobby scene checks passed`);
