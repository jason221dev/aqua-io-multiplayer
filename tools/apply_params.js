'use strict';
/* Rounds the optimizer's knobs to shippable numbers, writes final_params.json, and patches
 * aqua_sim.js (ability data) + index.html (mirrored SIM block and ability tutorial text) consistently. */
const fs = require('node:fs');
const lab = require('./balance_lab');
const { paramsFromKnobs } = require('./optimize');
const dir = process.argv[2] || require('node:path').join(__dirname,'results');
const target = process.argv[3] || 'aqua_sim.js';
const knobs = JSON.parse(fs.readFileSync(dir + '/knobs.json', 'utf8'));
const P = paramsFromKnobs(knobs), r = (v, st) => +(Math.round(v / st) * st).toFixed(4);
const A = P.ABILITY, F = { SP: {}, ABILITY: {}, BALANCE: {} };
for (const k of lab.KEYS) F.SP[k] = { cd: r(P.SP[k].cd, .1) };
for (const k of ['puffer', 'clown', 'seahorse']) F.SP[k].dur = r(P.SP[k].dur, .05);
Object.assign(F.ABILITY, {
  guppyDodge: r(A.guppyDodge, .01), guppyProt: Math.min(r(A.guppyProt, .01), r(A.guppyDodge, .01)),
  schoolBoostMin: r(A.schoolBoostMin, .01), schoolBoostMax: r(A.schoolBoostMax, .01),
  lungeRefund: r(A.lungeRefund, .05), lungeMiss: r(A.lungeMiss, .1),
  goldProt: r(A.goldProt, .01), dazzleTime: r(A.dazzleTime, .01),
  leapPeak: Math.round(A.leapPeak), kelpProt: r(A.kelpProt, .01), clownAllyProt: r(A.clownAllyProt, .01),
  eelStun: r(A.eelStun, .05), shockRadius: r(A.shockRadius, 5),
  torpedoRamp: [A.torpedoRamp[0], r(A.torpedoRamp[1], .1)],
  whirlPullMax: Math.round(A.whirlPullMax), whirlRadius: r(A.whirlRadius, 5),
  camoSpeed: Math.round(A.camoSpeed), magnetPull: Math.round(A.magnetPull), magnetRadius: r(A.magnetRadius, 5) });
F.BALANCE.piranhaConversion = r(P.BALANCE.piranhaConversion, .01);
fs.writeFileSync(dir + '/final_params.json', JSON.stringify(F, null, 1));
if (process.argv[4] !== '--write') { console.log(JSON.stringify(F)); process.exit(0); }

/* ---- patch source text ---- */
const B = lab.BASE, num = v => String(+v.toFixed(3));
let src = fs.readFileSync(target, 'utf8');
function sub(text, from, to, n = 1) { const c = text.split(from).length - 1; if (c !== n) throw new Error('expected ' + n + ' of ' + from + ' got ' + c); return text.split(from).join(to); }
for (const k of lab.KEYS) {
  const dur0 = F.SP[k].dur != null ? F.SP[k].dur : B.SP[k].dur;
  if (F.SP[k].cd === B.SP[k].cd && dur0 === B.SP[k].dur) continue;
  const re = new RegExp('(\\n  ' + k + ':\\{[^\\n]*?\\bcd:)[\\d.]+(,dur:)[\\d.]+', '');
  if (!re.test(src)) throw new Error('row ' + k);
  const dur = F.SP[k].dur != null ? F.SP[k].dur : B.SP[k].dur;
  src = src.replace(re, (m, a, b) => a + F.SP[k].cd + b + dur);
}
for (const [key, val] of Object.entries(F.ABILITY)) {
  if (JSON.stringify(val) === JSON.stringify(B.ABILITY[key])) continue;
  if (key === 'torpedoRamp') { src = sub(src, 'torpedoRamp:[' + B.ABILITY.torpedoRamp.join(',') + ']', 'torpedoRamp:[' + val.join(',') + ']'); continue; }
  const old = new RegExp('(\\b' + key + ':)[\\d.]+'); if (!old.test(src)) throw new Error('const ' + key);
  src = src.replace(old, '$1' + num(val));
}
if (F.BALANCE.piranhaConversion !== B.BALANCE.piranhaConversion) src = sub(src, 'piranhaConversion:' + B.BALANCE.piranhaConversion, 'piranhaConversion:' + num(F.BALANCE.piranhaConversion));
/* tutorial / hint text that quotes ability numbers */
const T = [];
const pct = v => Math.round((v - 1) * 100);
T.push(['for ' + num(B.ABILITY.guppyDodge) + 's of evasion', 'for ' + num(F.ABILITY.guppyDodge) + 's of evasion', 'hint']);
T.push(['boosts nearby sardines by ' + pct(B.ABILITY.schoolBoostMin) + '–' + pct(B.ABILITY.schoolBoostMax) + '%', 'boosts nearby sardines by ' + pct(F.ABILITY.schoolBoostMin) + '–' + pct(F.ABILITY.schoolBoostMax) + '%', 'hint']);
T.push(['Inflate to 3× combat mass for ' + num(B.SP.puffer.dur) + 's', 'Inflate to 3× combat mass for ' + num(F.SP.puffer.dur) + 's', 'hint']);
T.push(['misses add ' + num(B.ABILITY.lungeMiss) + 's', 'misses add ' + num(F.ABILITY.lungeMiss) + 's', 'hint']);
T.push(['from 1.3× to ' + num(B.ABILITY.torpedoRamp[1]) + '×', 'from 1.3× to ' + num(F.ABILITY.torpedoRamp[1]) + '×', 'hint']);
T.push(['Plankton within ' + B.ABILITY.magnetRadius + ' units', 'Plankton within ' + F.ABILITY.magnetRadius + ' units', 'hint']);
for (const [a, b] of T) src = sub(src, a, b);
fs.writeFileSync(target, src);

const htmlPath = process.argv[5] || 'index.html';
let html = fs.readFileSync(htmlPath, 'utf8');
const bi = html.indexOf('/*SIM:BEGIN*/') + '/*SIM:BEGIN*/'.length, ei = html.indexOf('/*SIM:END*/');
const sim = src.replace(/\nif\(typeof module!=='undefined'&&module\.exports\)module\.exports=Aqua;\s*$/, '\n');
html = html.slice(0, bi) + '\n' + sim.trim() + '\n' + html.slice(ei);
const H = [
  ['Protection lasts about ' + num(B.ABILITY.guppyDodge) + ' seconds', 'Protection lasts about ' + num(F.ABILITY.guppyDodge) + ' seconds', 1],
  ['School speed increases ' + pct(B.ABILITY.schoolBoostMin) + '–' + pct(B.ABILITY.schoolBoostMax) + '% with nearby allies', 'School speed increases ' + pct(F.ABILITY.schoolBoostMin) + '–' + pct(F.ABILITY.schoolBoostMax) + '% with nearby allies', 1],
  ["after:'SPEED +" + pct(B.ABILITY.schoolBoostMax) + "%'", "after:'SPEED +" + pct(F.ABILITY.schoolBoostMax) + "%'", 1],
  ['3× effective combat mass for ' + num(B.SP.puffer.dur) + 's', '3× effective combat mass for ' + num(F.SP.puffer.dur) + 's', 1],
  ['Hit refunds ' + Math.round(B.ABILITY.lungeRefund * 100) + '% cooldown; miss adds ' + num(B.ABILITY.lungeMiss) + 's', 'Hit refunds ' + Math.round(F.ABILITY.lungeRefund * 100) + '% cooldown; miss adds ' + num(F.ABILITY.lungeMiss) + 's', 1],
  ['Enemies enter your ' + B.ABILITY.shockRadius + '-unit shock area', 'Enemies enter your ' + F.ABILITY.shockRadius + '-unit shock area', 1],
  ['Stuns up to ' + num(B.ABILITY.eelStun) + 's', 'Stuns up to ' + num(F.ABILITY.eelStun) + 's', 1],
  ['RAMPS UP TO ' + num(B.ABILITY.torpedoRamp[1]) + '×', 'RAMPS UP TO ' + num(F.ABILITY.torpedoRamp[1]) + '×', 1],
  ['from 1.3× up to ' + num(B.ABILITY.torpedoRamp[1]) + '× speed', 'from 1.3× up to ' + num(F.ABILITY.torpedoRamp[1]) + '× speed', 1],
  ["after:'" + num(B.ABILITY.torpedoRamp[1]) + "× SPEED'", "after:'" + num(F.ABILITY.torpedoRamp[1]) + "× SPEED'", 1],
  ["tuna:'TORPEDO " + num(B.ABILITY.torpedoRamp[1]) + "×'", "tuna:'TORPEDO " + num(F.ABILITY.torpedoRamp[1]) + "×'", 1],
  ['surface within ' + B.ABILITY.magnetRadius + ' units', 'surface within ' + F.ABILITY.magnetRadius + ' units', 1]];
for (const [a, b, n] of H) html = sub(html, a, b, n);
fs.writeFileSync(htmlPath, html);
console.log('patched', target, 'and', htmlPath);
