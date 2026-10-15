'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../vendor/three.r128.min.js');
const html=fs.readFileSync(path.join(__dirname,'../fisherman-mobile-ability-pass2.html'),'utf8');
assert.ok(html.includes('FishForge v4'),'FishForge v4 not found');
const begin=html.indexOf('function fishBodyDims('),end=html.indexOf('// The close-up player retains',begin);
assert.ok(begin>0&&end>begin,'Fish geometry region missing');
const source="(function(THREE){const SP=new Proxy({},{get:()=>({sh:[1.3,.8]})});\n"+html.slice(begin,end)+"\nreturn {CARTOON_STYLE,cartoonFishGeometry};})";
const api=vm.runInThisContext(source,{filename:'fishforge-v4-geometry.js'})(THREE);
const species=['guppy','sardine','puffer','barra','piranha','goldfish','koi','clown','eel','tuna','angel','seahorse','sunfish'];
assert.deepEqual(Object.keys(api.CARTOON_STYLE).sort(),species.slice().sort());
let count=0,nearTriangles=0,farTriangles=0;
for(const sp of species){
  for(const near of [true,false]){
    for(const mode of ['all','body','dorsal','pect','tail','extras']){
      const g=api.cartoonFishGeometry(sp,near,mode);
      assert.ok(g.isBufferGeometry&&g.index&&g.index.count>0,sp+'/'+mode+' missing geometry');
      for(const attr of ['position','normal','color']){
        assert.ok(g.getAttribute(attr),sp+'/'+mode+' missing '+attr);
        for(const n of g.getAttribute(attr).array)assert.ok(Number.isFinite(n),sp+'/'+mode+' invalid '+attr);
      }
      if(mode==='all'){
        const flex=g.getAttribute('fishFlex');
        assert.ok(flex,sp+' missing swim flex');
        for(const n of flex.array)assert.ok(Number.isFinite(n),sp+' invalid flex');
        if(near)nearTriangles+=g.index.count/3;else farTriangles+=g.index.count/3;
      }
      if(['dorsal','pect','tail'].includes(mode))
        assert.ok(Array.isArray(g.userData.root)&&g.userData.root.length===3&&g.userData.root.every(Number.isFinite),sp+'/'+mode+' fin attachment');
      count++;
    }
  }
  const g=api.cartoonFishGeometry(sp,true,'body'),p=g.getAttribute('position').array,n=g.getAttribute('normal').array,ix=g.index.array;
  let outward=0,backward=0;
  for(let i=0;i<ix.length;i+=3){
    const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3;
    const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
    const vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
    const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;
    const dot=x*(n[a]+n[b]+n[c])+y*(n[a+1]+n[b+1]+n[c+1])+z*(n[a+2]+n[b+2]+n[c+2]);
    if(dot>1e-11)outward++;else if(dot<-1e-11)backward++;
  }
  assert.ok(outward>100&&backward===0,sp+' body has backward triangles '+backward);
}
console.log('PASS FishForge v4: '+species.length+' species / '+count+' mode-LOD combinations / outward body faces; near triangles='+nearTriangles+' far triangles='+farTriangles);
