'use strict';
/* Game-theoretic ability tuner.
 * Each species has ONE strength knob s (1 = shipped v1.5.13). A knob scales that ability's cooldown and its
 * signature effect numbers together, so a stronger knob never changes what the ability *is*, only how much.
 * Loop: build the 13x13 duel payoff matrix -> row means (payoff vs uniform field) + Nash support ->
 * replicator-style update (nerf over-performers, buff under-performers) -> repeat on fresh seeds; Polyak-average the tail.
 */
const fs = require('node:fs');
const lab = require('./balance_lab');
const { KEYS, BASE } = lab;
const out = process.argv[2] || require('node:path').join(__dirname,'results');
fs.mkdirSync(out, { recursive: true });
const log = (...a) => { const l = a.join(' '); console.log(l); fs.appendFileSync(out + '/log.txt', l + '\n'); };
const LO = .70, HI = 1.40, pw = (s, e) => Math.pow(s, e);

function paramsFromKnobs(s) {
  const B = BASE, P = { SP: {}, ABILITY: {}, BALANCE: {} };
  for (const k of KEYS) P.SP[k] = { cd: B.SP[k].cd / s[k] };
  const A = P.ABILITY;
  A.guppyDodge = B.ABILITY.guppyDodge * s.guppy; A.guppyProt = B.ABILITY.guppyProt * s.guppy;
  A.schoolBoostMin = 1 + (B.ABILITY.schoolBoostMin - 1) * s.sardine; A.schoolBoostMax = 1 + (B.ABILITY.schoolBoostMax - 1) * s.sardine;
  P.SP.puffer.dur = B.SP.puffer.dur * pw(s.puffer, .5);
  A.lungeRefund = Math.min(.7, B.ABILITY.lungeRefund * s.barra); A.lungeMiss = B.ABILITY.lungeMiss / s.barra;
  P.BALANCE.piranhaConversion = 1 + (B.BALANCE.piranhaConversion - 1) * s.piranha;
  A.goldProt = B.ABILITY.goldProt * s.goldfish; A.dazzleTime = B.ABILITY.dazzleTime * s.goldfish;
  A.leapPeak = B.ABILITY.leapPeak * s.koi; A.kelpProt = B.ABILITY.kelpProt * s.koi;
  P.SP.clown.dur = B.SP.clown.dur * pw(s.clown, .5); A.clownAllyProt = B.ABILITY.clownAllyProt * s.clown;
  A.eelStun = B.ABILITY.eelStun * s.eel; A.shockRadius = B.ABILITY.shockRadius * pw(s.eel, .5);
  A.torpedoRamp = [B.ABILITY.torpedoRamp[0], B.ABILITY.torpedoRamp[0] + (B.ABILITY.torpedoRamp[1] - B.ABILITY.torpedoRamp[0]) * s.tuna];
  A.whirlPullMax = B.ABILITY.whirlPullMax * s.angel; A.whirlRadius = B.ABILITY.whirlRadius * pw(s.angel, .5);
  P.SP.seahorse.dur = B.SP.seahorse.dur * pw(s.seahorse, .5); A.camoSpeed = B.ABILITY.camoSpeed * pw(s.seahorse, .5);
  A.magnetPull = B.ABILITY.magnetPull * s.sunfish; A.magnetRadius = B.ABILITY.magnetRadius * pw(s.sunfish, .5);
  return P;
}
module.exports = { paramsFromKnobs };
if (require.main !== module) return;

const ITERS = +(process.env.ITERS || 6), NS = +(process.env.NS || 3), MAXIT = +(process.env.MAXIT || 99), OPT = { T: 100, npcCount: 45 };
const update = (s, r) => { const eta = 1.7 * Math.pow(.82, r.it);
  KEYS.forEach((k, i) => { const signal = r.m[i] + .35 * (r.nash[i] - 1 / 13); s[k] = Math.min(HI, Math.max(LO, s[k] * Math.exp(-eta * signal))); }); };
// Resumable: replay saved iterations deterministically to recover the current knobs.
let trail = fs.existsSync(out + '/trail.json') ? JSON.parse(fs.readFileSync(out + '/trail.json', 'utf8')) : [];
let s = Object.fromEntries(KEYS.map(k => [k, 1]));
for (const r of trail) update(s, r);
const t0 = Date.now(), start = trail.length;
for (let it = start; it < ITERS && it < start + MAXIT; it++) {
  const seeds = Array.from({ length: NS }, (_, i) => 3000 + it * 131 + i * 7919);
  lab.applyParams(paramsFromKnobs(s));
  const { A } = lab.matrix(seeds, OPT);
  const m = lab.rowMeans(A), g = lab.nash(A);
  const spread = Math.max(...m) - Math.min(...m);
  log(`\n# iter ${it} t=${((Date.now() - t0) / 1000) | 0}s spread=${spread.toFixed(3)} exploit=${g.exploit.toFixed(3)} support=${g.mix.filter(v => v > .02).length}/13`);
  log(KEYS.map((k, i) => `${k}:s=${s[k].toFixed(2)} avg=${m[i] >= 0 ? '+' : ''}${m[i].toFixed(3)} nash=${(g.mix[i] * 100).toFixed(0)}%`).join(' | '));
  const rec = { it, s: { ...s }, m, nash: g.mix, spread };
  trail.push(rec); update(s, rec);
  fs.writeFileSync(out + '/trail.json', JSON.stringify(trail));
}
if (trail.length >= ITERS) {
  // Polyak (geometric) average over the last half of iterates, plus the final update.
  const tail = trail.slice(Math.floor(trail.length / 2)).map(r => r.s).concat([s]);
  const fin = Object.fromEntries(KEYS.map(k => [k, Math.exp(tail.reduce((a, r) => a + Math.log(r[k]), 0) / tail.length)]));
  fs.writeFileSync(out + '/knobs.json', JSON.stringify(fin, null, 1));
  fs.writeFileSync(out + '/params.json', JSON.stringify(paramsFromKnobs(fin), null, 1));
  log('\nFINAL KNOBS ' + JSON.stringify(Object.fromEntries(KEYS.map(k => [k, +fin[k].toFixed(3)]))));
} else log('paused after ' + trail.length + '/' + ITERS + ' iterations');
