'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Aqua=require('../aqua_sim');
const html=fs.readFileSync('index.html','utf8'),server=fs.readFileSync('server.js','utf8');
let n=0;function ok(label,value){assert.ok(value,label);console.log('PASS',label);n++}
function make(mode,slots={fish:[{pid:'human'}]}){const s=Aqua.create();s.newMatch({mode,npcCount:0,seed:654,slots,quick:true});return s}
for(const mode of ['free','last']){
 const s=make(mode);ok(`${mode}: mode preserved in simulation`,s.rules.mode===mode);
 const backup=JSON.parse(JSON.stringify(s.snapshot()));const other=Aqua.create();other.restore(backup);
 ok(`${mode}: snapshot/restore mode`,other.rules.mode===mode);
 other.restore({...backup,t:900});other.step({},1/60);
 ok(`${mode}: no clock timeout after 900 seconds`,other.state==='play');
 ok(`${mode}: two fishermen maximum`,other.fishers.length===2);
}
{
 const s=make('free');const fish=s.fishes[0];s.kill(fish,'test');
 ok('free roam: capture kills temporarily',!fish.alive);
 for(let i=0;i<230;i++)s.step({},1/60);
 ok('free roam: fish respawns',fish.alive);
 ok('free roam: match continues',s.state==='play');
}
{
 const s=make('last');const fish=s.fishes[0];s.kill(fish,'test');
 for(let i=0;i<240;i++)s.step({},1/60);
 ok('last fish standing: eliminated fish never respawns',!fish.alive);
 ok('last fish standing: other fish keep playing',s.state==='play');
 let events=[];for(const f of s.fishes.slice(1,-1))s.kill(f,'test');
 s.step({},1/60);events=s.drainEvents();
 ok('last fish standing: final surviving competing fish ends round',s.state==='end');
 ok('last fish standing: end event emitted',events.some(e=>e.k==='end'));
 ok('last fish standing: one competitor remains alive',s.fishes.filter(f=>f.alive).length===1);
}
{
 const s=make('last');s.fishes.forEach(f=>s.kill(f,'test'));s.step({},1/60);
 ok('last fish standing: zero survivors ends round',s.state==='end');
}
{
 const s=make('free');s.fishes.forEach(f=>s.kill(f,'test'));s.step({},1/60);
 ok('free roam: even zero living competitors does not end game',s.state==='play');
}
ok('UI offers both un-timed modes',html.includes('modeFree')&&html.includes('modeLast')&&!html.includes('Quick match 2:30'));
ok('UI has accessible exit game button',html.includes('id="exitGame"')&&html.includes('aria-label="Exit to main menu"'));
ok('UI Exit releases pointers and online WebSocket',html.includes('function exitToMenu()')&&html.includes('quitOnline();')&&html.includes('swimPointers.clear()'));
ok('UI never triggers fish throttle when Exit pressed',html.includes('.tackle-shade:not(.hidden), #exitGame'));
ok('server pins room mode to creator',server.includes("mode:msg.mode==='last'?'last':'free'")&&server.includes('mode:room.mode'));
ok('last-fish late joins cannot insert new competitors',server.includes("room.started&&room.mode==='last'&&role==='fish'"));
new vm.Script(html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1]);ok('browser script compiles',true);
console.log(`${n} endless game-mode checks passed`);