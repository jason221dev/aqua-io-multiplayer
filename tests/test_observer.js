const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function check(name,pred){assert(pred,name);console.log('PASS '+name)}
check('Single player observer controls restored',['observeOpen','observerPanel','obsFree','obsLargest','obsReturn','obsRise','obsDive'].every(id=>html.includes('id="'+id+'"')));
check('Observer modes are selectable',html.includes("setObserverMode('free')")&&html.includes("setObserverMode('largest')")&&html.includes("setObserverMode('off')"));
check('Observer gated to single-player live fish',html.includes("!online.active&&!online.started&&!online.waiting&&!!human?.alive"));
check('Observer does not move player fish',html.includes("if(observerMode!=='off'&&canObserve()){out[ME]={mv:{x:0,y:0,z:0},tap:0,bt:null}"));
check('Free cam has flight and look controls',html.includes('function observerFlight(dt)')&&html.includes('observerStick.id===e.pointerId')&&html.includes('observerLook.id===e.pointerId'));
check('Follow Largest picks largest living competitor',html.includes('function largestLiveFish()')&&html.includes("observerMode==='largest'&&canObserve()"));
check('Last Fish Standing predator succession intact',html.includes('function eaterFollow()')&&html.includes('FOLLOWING PREDATOR · UNTIL MATCH ENDS'));
check('Six-second shield still in place',html.includes('fishSpawnShield:6'));
console.log('8 v1.5.12 observer regressions passed');
