'use strict';
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {performance}=require('node:perf_hooks');
const A=require('../aqua_sim');
const old=fs.readFileSync(process.argv[2]||path.resolve(__dirname,'../../AquaIO_v1.5.36_Eel_Shock_Icon_Source/index.html'),'utf8');
const current=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
function load(html){const context=vm.createContext({Math,SP:A.SP,ME:'owner',activeAbility:A.activeAbility,inKelp:()=>false});
 vm.runInContext(html.slice(html.indexOf('const ABILITY_VFX_PROFILES='),html.indexOf('// Per-instance alpha lives')),context);
 const fish=Array.from({length:200},(_,i)=>({sp:Object.keys(A.SP)[i%13],alive:true,prot:i%27===0?.3:0,abilT:i%43===0?1.7:0,shockT:i%47===0?.4:0,eelSlowT:i%47===0?2.2:0,clownSlowT:0,stingT:0,slowT:0,camoT:0,markT:0,flickT:0,pid:null,human:false}));
 context.fish=fish;vm.runInContext(`function run(n){const out={};let count=0;for(let k=0;k<n;k++){const time=k/60;for(let i=0;i<fish.length;i++){fishAbilityFeedback(fish[i],i,time,out);if(out.eelShock)count++;}}return count;}`,context);
 return context;
}
const versions={baseline:load(old),optimized:load(current)},observations=[];
for(let n=0;n<4;n++){const order=n%2?['optimized','baseline']:['baseline','optimized'];const r={};for(const label of order){const c=versions[label];c.run(200);const a=performance.now();c.run(650);r[label]=+(performance.now()-a).toFixed(3);}
 observations.push(r);console.log(JSON.stringify({run:n,...r}));}
const avg=k=>observations.reduce((a,x)=>a+x[k],0)/observations.length;
console.log('SUMMARY '+JSON.stringify({baseline_ms:+avg('baseline').toFixed(2),optimized_ms:+avg('optimized').toFixed(2),improvement_pct:+((1-avg('optimized')/avg('baseline'))*100).toFixed(1),description:'130000 fish-feedback evaluations/run, CPU only; not WebGL FPS'}));
