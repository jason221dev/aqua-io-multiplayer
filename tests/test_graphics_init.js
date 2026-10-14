'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('  for(const k of Object.keys(npcIM.kinds)){\n    const K=npcIM.kinds[k],p=ambientMarkDefs[k];if(!p)continue;');
const end=html.indexOf('  npcIM.dR=new THREE.Object3D()',begin);
assert(begin>=0&&end>begin,'Failed to locate pigmentation batch initialization');
const species={koi:{body:{instanceMatrix:{count:5}}},sardine:{body:{instanceMatrix:{count:35}}}};
const calls=[];
class InstancedMesh{constructor(g,m,n){assert(Number.isInteger(n)&&n>0);this.capacity=n;calls.push(n)}}
class Color{constructor(value){this.value=value}}
class MeshPhongMaterial{constructor(options){this.options=options}}
const ctx={npcIM:{kinds:species},ambientMarkDefs:{koi:{color:'#ff0000',marks:[[1],[2],[3]]},sardine:{color:'#ffffff',marks:[[1],[2]]}},THREE:{InstancedMesh,Color,MeshPhongMaterial},G:{sphLo:{}},scene:{add(){}}};
vm.runInNewContext(html.slice(begin,end),ctx,{timeout:1000});
assert.deepEqual(calls,[15,70]);
assert.equal(species.koi.markMesh.capacity,15);
assert.equal(species.sardine.markMesh.capacity,70);
assert.match(html,/function graphicsFailure\(error\)/);
assert.match(html,/catch\(e\)\{graphicsFailure\(e\)\}/);
console.log('PASS: fish-mark instancing and graphics-error visibility');
