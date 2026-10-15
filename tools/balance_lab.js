'use strict';
/* Aqua.io ability balance lab.
 * Drives the REAL authoritative simulation (aqua_sim.js) headlessly.
 *  - matrix : every species-vs-species duel (4v4, common random numbers) -> payoff matrix
 *  - field  : all 13 species in one arena -> per-species share vs fair 1/13
 *  - nash   : mixed-strategy equilibrium of the symmetric zero-sum matrix game
 * Ability use by every fish is driven by the same species-specific tactical policy, so the
 * comparison measures ability design, not the quality of a particular bot script.
 */
const fs = require('node:fs');
const Aqua = process.env.AQUA_SIM ? require(require('node:path').resolve(process.env.AQUA_SIM)) : require('../aqua_sim');
const { SP, ABILITY, BALANCE, WRECK } = Aqua;
const KEYS = Object.keys(SP);
const N = KEYS.length;
const DT = 1 / 30;

/* ---------- parameter overrides (applied to live exported config objects) ---------- */
const BASE = JSON.parse(JSON.stringify({ SP, ABILITY, BALANCE }));
function applyParams(p) {
  for (const k of Object.keys(BASE.SP)) Object.assign(SP[k], BASE.SP[k]);
  Object.assign(ABILITY, BASE.ABILITY);
  Object.assign(BALANCE, BASE.BALANCE);
  if (!p) return;
  for (const k in (p.SP || {})) Object.assign(SP[k], p.SP[k]);
  Object.assign(ABILITY, p.ABILITY || {});
  Object.assign(BALANCE, p.BALANCE || {});
}

/* ---------- tactical policy: when does a competent player press the ability? ---------- */
function scan(s, f, R) {
  let threat = null, td = R, prey = null, pd = R, plank = null;
  const cm = Aqua.combatMass(f);
  const look = o => {
    if (o === f || o.alive === false) return;
    const d = Aqua.dist(o, f); if (d >= R) return;
    const om = Aqua.combatMass(o);
    if (om > cm && d < td) { td = d; threat = o; }
    else if (om < cm && !(o.prot > 0) && d < pd) { pd = d; prey = o; }
  };
  for (const o of s.fishes) if (o.alive) look(o);
  for (const o of s.npcs) look(o);
  return { threat, td, prey, pd };
}
function wantsAbility(s, f) {
  if (f.abilCD > 0 || f.hooked || f.air || f.abilT > 0) return false;
  const r = scan(s, f, 260);
  const hx = f.hx || 1, hz = f.hz || 0;
  const ahead = o => { const dx = o.x - f.x, dz = o.z - f.z, h = Math.hypot(dx, dz) || 1; return (dx * hx + dz * hz) / h > .35; };
  switch (f.sp) {
    case 'guppy': return !!r.threat && r.td < 105;
    case 'sardine': return (!!r.threat && r.td < 170);
    case 'puffer': return (!!r.threat && r.td < 100) || (!!r.prey && r.pd < 70 && Aqua.combatMass(r.prey) < f.mass * 2.9);
    case 'barra': return !!r.prey && r.pd < 235 && ahead(r.prey);
    case 'piranha': return !!r.prey && r.pd < 120;
    case 'goldfish': return (!!r.threat && r.td < 115) || (!!r.prey && r.pd < 100);
    case 'koi': return !!r.threat && r.td < 130 && (f.y <= ABILITY.leapMaxY || s.inKelp(f));
    case 'clown': return !!r.threat && r.td < 85;
    case 'eel': return (!!r.threat && r.td < 105) || (!!r.prey && r.pd < 95);
    case 'tuna': return (!!r.prey && r.pd < 210 && ahead(r.prey)) || (!!r.threat && r.td < 150);
    case 'angel': return !!r.prey && r.pd < 85;
    case 'seahorse': return (!!r.threat && r.td < 190) || (!!r.prey && r.pd < 110);
    case 'sunfish': {
      if (f.y >= 110 + Aqua.hitRadius(f)) return false;
      for (const p of s.plank) if (p.alive && Math.hypot(p.x - f.x, p.z - f.z) < 110 && Math.abs(p.y - f.y) < 90) return true;
      return false;
    }
  }
  return false;
}

/* ---------- one arena run ---------- */
function runArena(species, seed, opt = {}) {
  const T = opt.T || 200, npcCount = opt.npcCount == null ? 90 : opt.npcCount;
  const s = Aqua.create();
  s.newMatch({ sp: species[0], mode: 'last', seed, competitorCount: Math.max(8, species.length), maxTotalFish: 400,
    npcCount, miniFishCount: 0, slots: { fish: species.map(sp => ({ sp })) } });
  // Concentrate everyone around the opening food so duels actually happen.
  const f0 = s.fishes[0], cx = WRECK.x + 40, cz = 360;
  let k = 0;
  for (const f of s.fishes) {
    const a = (k++) * 2.39996, rr = 60 + 30 * Math.sqrt(k) * (opt.spread || 1);
    f.x = cx + Math.cos(a) * rr * 1.4; f.z = cz + Math.sin(a) * rr; f.y = 70 + (k * 37) % 85;
  }
  const team = s.fishes.map(f => f.sp);
  const stats = {};
  for (const sp of new Set(team)) stats[sp] = { n: 0, alive: 0, mass: 0, uses: 0 };
  for (const f of s.fishes) stats[f.sp].n++;
  let polT = 0;
  const steps = Math.floor(T / DT);
  for (let i = 0; i < steps; i++) {
    polT -= DT;
    if (polT <= 0 && opt.policy !== false) {
      polT = .2;
      for (const f of s.fishes) if (f.alive && wantsAbility(s, f)) { if (s.useAbility(f)) stats[f.sp].uses++; }
    }
    s.step({}, DT);
    if (s.state === 'end') break;
  }
  for (const f of s.fishes) if (f.alive) { stats[f.sp].alive++; stats[f.sp].mass += f.mass; }
  return { stats, t: s.t };
}

/* ---------- duel matrix ---------- */
function duel(a, b, seeds, opt) {
  let share = 0, wins = 0;
  const teamA = [a, b, a, b, a, b, a, b], used = { a: 0, b: 0 };
  for (const seed of seeds) {
    const r = runArena(teamA, seed, opt);
    const ma = r.stats[a].mass, mb = r.stats[b].mass;
    const sh = ma + mb > 0 ? ma / (ma + mb) : .5;
    share += sh; wins += sh > .5 ? 1 : sh === .5 ? .5 : 0;
  }
  return { share: share / seeds.length, win: wins / seeds.length };
}
function matrix(seeds, opt) {
  const A = Array.from({ length: N }, () => Array(N).fill(0)), W = Array.from({ length: N }, () => Array(N).fill(.5));
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const r = duel(KEYS[i], KEYS[j], seeds, opt);
    A[i][j] = r.share - .5; A[j][i] = -(r.share - .5); W[i][j] = r.win; W[j][i] = 1 - r.win;
  }
  return { A, W };
}

/* ---------- field test: all species at once ---------- */
function field(seeds, opt) {
  const per = opt && opt.per || 3, out = {};
  for (const k of KEYS) out[k] = { alive: 0, mass: 0, share: 0, wins: 0, uses: 0, n: 0 };
  for (const seed of seeds) {
    const roster = []; for (let r = 0; r < per; r++) for (const k of KEYS) roster.push(k);
    const res = runArena(roster, seed, { policy: opt && opt.policy, T: opt && opt.T || 240, npcCount: opt && opt.npcCount == null ? 150 : (opt && opt.npcCount) || 150, spread: 1.6 });
    let tot = 0, best = null, bm = -1;
    for (const k of KEYS) { tot += res.stats[k].mass; if (res.stats[k].mass > bm) { bm = res.stats[k].mass; best = k; } }
    for (const k of KEYS) {
      out[k].alive += res.stats[k].alive / per; out[k].mass += res.stats[k].mass; out[k].uses += res.stats[k].uses / per;
      out[k].share += tot ? res.stats[k].mass / tot : 0;
    }
    if (best) out[best].wins++;
  }
  for (const k of KEYS) { out[k].alive /= seeds.length; out[k].share /= seeds.length; out[k].uses /= seeds.length; out[k].mass /= seeds.length; }
  return out;
}

/* ---------- game-theory analysis ---------- */
// Symmetric zero-sum game: exploitable strategies get weight 0; equilibrium value is 0.
function nash(A, iters = 40000) {
  const n = A.length; let w = Array(n).fill(1 / n), avg = Array(n).fill(0);
  const eta = 0.08;
  for (let t = 1; t <= iters; t++) {
    const pay = A.map(row => row.reduce((s, v, j) => s + v * w[j], 0)); // payoff of pure i vs current mix
    let z = 0; const nw = w.map((x, i) => { const v = x * Math.exp(eta * pay[i] * 4 / Math.sqrt(t) * 6); z += v; return v; });
    w = nw.map(v => v / z);
    for (let i = 0; i < n; i++) avg[i] += w[i];
  }
  const p = avg.map(v => v / iters), z = p.reduce((a, b) => a + b, 0);
  const mix = p.map(v => v / z);
  const vs = A.map(row => row.reduce((s, v, j) => s + v * mix[j], 0));
  return { mix, exploit: Math.max(...vs), vs };
}
function dominance(A) {
  const dom = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) {
    let ge = true, gt = false;
    for (let k = 0; k < N; k++) { if (k === i || k === j) continue; if (A[i][k] < A[j][k] - .01) ge = false; if (A[i][k] > A[j][k] + .01) gt = true; }
    if (ge && gt && A[i][j] >= 0) dom.push(KEYS[i] + '>' + KEYS[j]);
  }
  return dom;
}
function rowMeans(A) { return A.map(r => r.reduce((a, b) => a + b, 0) / (N - 1)); }
function report(A, W, label) {
  const m = rowMeans(A), g = nash(A);
  const rank = KEYS.map((k, i) => ({ k, avg: m[i], nash: g.mix[i] })).sort((a, b) => b.avg - a.avg);
  console.log('\n== ' + label + ' ==');
  for (const r of rank) console.log(r.k.padEnd(9), (r.avg >= 0 ? '+' : '') + r.avg.toFixed(3), ' nash=' + (r.nash * 100).toFixed(1).padStart(5) + '%',
    ' ' + '#'.repeat(Math.round(Math.max(0, r.avg + .5) * 40)));
  console.log('spread(max-min avg)=' + (rank[0].avg - rank[N - 1].avg).toFixed(3) + '  exploitability=' + g.exploit.toFixed(3) +
    '  nash-support=' + g.mix.filter(v => v > .02).length + '/' + N + '  dominated pairs: ' + (dominance(A).join(' ') || 'none'));
  return { rank, g };
}

module.exports = { KEYS, applyParams, runArena, duel, matrix, field, nash, dominance, rowMeans, report, BASE };

if (require.main === module) {
  const cmd = process.argv[2] || 'bench';
  const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
  const nSeeds = +arg('seeds', 6), seedBase = +arg('seed0', 1000);
  const seeds = Array.from({ length: nSeeds }, (_, i) => seedBase + i * 7919);
  const params = arg('params') ? JSON.parse(fs.readFileSync(arg('params'), 'utf8')) : null;
  applyParams(params);
  const t0 = Date.now();
  if (cmd === 'bench') {
    const r = runArena(['tuna', 'eel', 'tuna', 'eel', 'tuna', 'eel', 'tuna', 'eel'], 1, { T: 200 });
    console.log(JSON.stringify(r.stats), 'sim t=' + r.t.toFixed(1), 'wall ms=' + (Date.now() - t0));
  } else if (cmd === 'matrix') {
    const { A, W } = matrix(seeds, { T: +arg('T', 100), npcCount: +arg('npc', 45) });
    report(A, W, 'duel matrix (' + nSeeds + ' seeds/pair)');
    if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify({ A, W, seeds }));
    console.log('wall s=' + ((Date.now() - t0) / 1000).toFixed(1));
  } else if (cmd === 'field') {
    const f = field(seeds, {});
    const rows = KEYS.map(k => ({ k, ...f[k] })).sort((a, b) => b.share - a.share);
    console.log('field share (fair = ' + (100 / N).toFixed(1) + '%)');
    for (const r of rows) console.log(r.k.padEnd(9), (r.share * 100).toFixed(1).padStart(5) + '%  alive/3=' + r.alive.toFixed(2) + '  wins=' + r.wins + '  uses=' + r.uses.toFixed(1));
    console.log('wall s=' + ((Date.now() - t0) / 1000).toFixed(1));
  }
}
