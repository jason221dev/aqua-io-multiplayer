/* Procedural cartoon octopus: one lightweight AI creature outside the fish roster. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.AquaOctopusVisual=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(THREE,scene){
 const group=new THREE.Group();scene.add(group);
 const skin=new THREE.MeshStandardMaterial({color:0x9849c4,roughness:.7,metalness:.07}),bottom=new THREE.MeshStandardMaterial({color:0xc68be0,roughness:.8}),eyeWhite=new THREE.MeshStandardMaterial({color:0xf9f4ff,roughness:.45}),iris=new THREE.MeshStandardMaterial({color:0x142035,roughness:.3}),ringMat=new THREE.MeshBasicMaterial({color:0xff9c49,transparent:true,opacity:.76,depthWrite:false});
 const sph=new THREE.SphereGeometry(1,16,12);
 function ellipsoid(x,y,z,sx,sy,sz,mat,parent=group){const m=new THREE.Mesh(sph,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
 ellipsoid(0,23,-1,21,26,21,skin);ellipsoid(0,45,-4,27,22,25,skin);ellipsoid(0,25,13,19,11,11,bottom);
 for(const side of [-1,1]){ellipsoid(side*12,29,16,8,9,6,eyeWhite);ellipsoid(side*12,29,21,3.8,5.6,2.5,iris);ellipsoid(side*13,32,23.3,1.6,1.8,1.2,eyeWhite)}
 const arms=[];
 for(let i=0;i<8;i++){
   const a=i*Math.PI/4,arm=new THREE.Group();arm.rotation.y=a;group.add(arm);
   const points=[new THREE.Vector3(0,11,0),new THREE.Vector3(12,7,17),new THREE.Vector3(35,4,33),new THREE.Vector3(62,7,38),new THREE.Vector3(86,9,33)];
   const curve=new THREE.CatmullRomCurve3(points),tentacle=new THREE.Mesh(new THREE.TubeGeometry(curve,14,4.9,6,false),skin);arm.add(tentacle);
   ellipsoid(86,9,33,6,6,6,skin,arm);
   for(const fraction of [.3,.48,.64,.8]){const p=curve.getPoint(fraction);ellipsoid(p.x,Math.max(2,p.y-4),p.z,4.5,1.9,4.5,bottom,arm)}
   arms.push(arm);
 }
 const ring=new THREE.Mesh(new THREE.RingGeometry(65,72,36),ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=4;group.add(ring);
 const baseUp=new THREE.Vector3(0,1,0),up=new THREE.Vector3(),rotation=new THREE.Quaternion();
 let age=0,hasPosition=false;const desired=new THREE.Vector3();
 function draw(o,dt){
   group.visible=!!o;if(!o)return;
   age+=Math.max(0,dt);desired.set(o.x,-o.y,o.z);
   if(!hasPosition||group.position.distanceToSquared(desired)>1e6){group.position.copy(desired);hasPosition=true;}
   else group.position.lerp(desired,1-Math.exp(-Math.max(0,dt)*12));
   const normal=o.face==='west'?[1,0,0]:o.face==='east'?[-1,0,0]:o.face==='north'?[0,0,1]:o.face==='south'?[0,0,-1]:[0,1,0];
   up.set(...normal);rotation.setFromUnitVectors(baseUp,up);group.quaternion.slerp(rotation,Math.min(1,Math.max(0,dt)*8));
   const fast=o.mode==='dash',wind=o.mode==='windup',stun=o.mode==='stunned';
   const freq=fast?19:wind?12:stun?2:5.1;
   arms.forEach((a,i)=>{a.rotation.x=Math.sin(age*freq+i*.82)*(.07+(fast?.24:.11));a.rotation.z=Math.sin(age*(freq*.75)+i*.94)*.13});
   ring.visible=wind||fast;ring.material.opacity=wind?.45+.3*Math.sin(age*13):.83;
   group.scale.setScalar(fast?1.05:1+.025*Math.sin(age*3.3));
 }
 return{group,draw};
}
return{create};
});