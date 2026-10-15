'use strict';
/* Ability identity fingerprint. Every species runs the same probe scenarios against the real sim and we measure
 * 15 effect dimensions. Distinctness = how far each ability's normalised fingerprint is from its nearest neighbour.
 * AQUA_SIM=/path/to/older_aqua_sim.js node tools/identity_probe.js   (default: ../aqua_sim) */
const path = require('node:path');
const Aqua = require(process.env.AQUA_SIM ? path.resolve(process.env.AQUA_SIM) : '../aqua_sim');
const KEYS = Object.keys(Aqua.SP), DT = 1 / 30;
const FEATS = ['burst', 'invuln', 'cc', 'push', 'stealth', 'massFlip', 'air', 'plank', 'lock', 'interrupt', 'ccResist', 'eatBonus', 'refund', 'extend', 'reveal', 'swerve', 'allyBuff', 'thorns'];
function arena(sp) {
  const roster = [sp, 'barra', 'guppy', 'guppy', 'koi', 'koi', 'sardine', 'koi'];
  const s = Aqua.create();
  s.newMatch({ sp, mode: 'last', seed: 7, competitorCount: 8, maxTotalFish: 400, npcCount: 0, miniFishCount: 0, slots: { fish: roster.map(x => ({ sp: x })) } });
  s.fishers.forEach(fr => { fr.x = 5000; fr.z = 800; fr.cd = 9999; });
  s.fishes.forEach((f, i) => { f.prot = 0; f.abilCD = 999; f.wt = 1e9; f.wx = f.wy = f.wz = 0; f.vx = f.vy = f.vz = 0; f.mass = 80; f.x = 2600 + i * 400; f.z = -800 + i * 30; f.y = 60; });
  const [U, T, B1, B2, B3] = s.fishes;
  U.mass = 200; U.x = 1000; U.y = 60; U.z = 0; U.wx = 1; U.hx = 1; U.hz = 0; U.vx = 100; U.abilCD = 0;
  T.mass = 500; T.x = 860; T.y = 60; T.z = 0; T.wx = 1; T.vx = 100; T.hx = 1;
  B1.x = 1070; B1.z = 70; B2.x = 1120; B2.z = -100; B3.x = 1010; B3.z = -130;
  const B4 = s.fishes[5], PS = s.fishes[6]; B4.x = 1050; B4.z = -60; B4.wx = 1; B4.hx = 1; PS.x = 1030; PS.z = 40;
  s.plank.forEach(p => { p.alive = false; });
  [[1040, 50, 90], [1090, 50, -90], [1150, 50, 85]].forEach((q, i) => { const p = s.plank[i]; p.alive = true; p.x = q[0]; p.y = q[1]; p.z = q[2]; p.patchId = 0; });
  return { s, U, T, Bs: [B1, B2], B3, B4, PS, pellets: s.plank.slice(0, 3) };
}
const sp2 = f => Math.hypot(f.vx, f.vz);
function main(sp, use) {
  const a = arena(sp), { s, U, T, Bs, B3, B4, PS, pellets } = a, W = Aqua.SP[sp].dur + .7;
  B3.abilT = 1.5; const start = Bs.map(b => [b.x, b.y, b.z]), pst = pellets.map(p => [p.x, p.y, p.z]);
  let sg = 0, flips = 0; const o = { ally: 0, maxV: 0, inv: 0, cc: 0, push: 0, camo: 0, flip: 1, air: 0, plank: 0, lock: 0, intr: 0 };
  if (use) s.useAbility(U);
  const pk = Bs.map(() => 0), disp = Bs.map(() => 0), pd = pellets.map(() => 0);
  for (let i = 0; i < Math.round(W / DT); i++) {
    s.step({}, DT);
    o.maxV = Math.max(o.maxV, sp2(U)); if (s.predationProtected(U)) o.inv += DT;
    o.camo = Math.max(o.camo, U.camoT || 0); o.flip = Math.max(o.flip, Aqua.combatMass(U) / U.mass); o.air = Math.max(o.air, -U.y);
    o.lock = Math.max(o.lock, T.turnLockT || 0);
    if (PS.surge > 0) o.ally = Math.max(o.ally, (PS.surgeMul || 1) - 1);
    if (Math.abs(B4.vz) > 1.5) { const g = Math.sign(B4.vz); if (sg && g !== sg) flips++; sg = g; }
    Bs.forEach((b, k) => { pk[k] = Math.max(pk[k], b.shockT || 0, b.dazzledT || 0, b.slowT || 0); disp[k] = Math.max(disp[k], Math.hypot(b.x - start[k][0], b.y - start[k][1], b.z - start[k][2])); });
    pellets.forEach((p, k) => { if (p.alive) pd[k] = Math.max(pd[k], Math.hypot(p.x - pst[k][0], p.z - pst[k][2])); });
    if (i === 0) o.intr = Math.max(0, (1.5 - DT) - B3.abilT);
  }
  o.flips = flips; o.cc = pk.reduce((x, y) => x + y, 0) / pk.length; o.push = disp.reduce((x, y) => x + y, 0) / disp.length; o.plank = pd.reduce((x, y) => x + y, 0) / pd.length;
  return o;
}
function ccRun(sp, cc) {
  const { s, U } = arena(sp); s.useAbility(U);
  if (cc) { U.shockT = 1; U.slowT = 1; U.dazzledT = 1; }
  const x0 = U.x; for (let i = 0; i < 15; i++) { if (cc) { U.shockT = Math.max(U.shockT, .5); U.slowT = Math.max(U.slowT, .5); U.dazzledT = Math.max(U.dazzledT, .5); } s.step({}, DT); }
  return Math.hypot(U.x - x0, U.z);
}
function stingRun(sp) {
  const { s, U, T } = arena(sp); T.x = U.x - 30; T.vx = 100; T.mass = 500; s.useAbility(U);
  let pk = 0; for (let i = 0; i < 10; i++) { s.step({}, DT); pk = Math.max(pk, T.slowT || 0); }
  return pk;
}
function eatRun(sp, use) {
  const { s, U, T, Bs } = arena(sp); T.x = 2000; const P = Bs[0]; P.mass = 50; P.x = U.x + 48; P.z = 0; P.y = 60; P.vx = 0;
  if (use) s.useAbility(U);
  const m0 = U.mass, hadCamo = U.camoT > 0; let el = 0;
  for (let i = 0; i < 15; i++) { s.step({}, DT); el += DT; }
  return { gain: U.mass - m0, ate: !P.alive, refund: Math.max(0, (Aqua.SP[sp].cd - el) - U.abilCD), extend: Math.max(0, U.abilT - Math.max(0, Aqua.SP[sp].dur - el)), reveal: hadCamo && U.camoT === 0 ? 1 : 0 };
}
const raw = {};
for (const sp of KEYS) {
  const a = main(sp, true), c = main(sp, false), e1 = eatRun(sp, true), e0 = eatRun(sp, false);
  const cc1 = ccRun(sp, true), cc0 = ccRun(sp, false);
  raw[sp] = { burst: Math.max(0, a.maxV / c.maxV - 1), invuln: a.inv, cc: a.cc, push: Math.max(0, a.push - c.push), stealth: a.camo, massFlip: a.flip - 1,
    air: Math.max(0, a.air), plank: Math.max(0, a.plank - c.plank), lock: a.lock, interrupt: a.intr, ccResist: Math.max(0, cc1 / cc0 - .5) * 2,
    thorns: stingRun(sp), swerve: a.flips, allyBuff: a.ally, eatBonus: e0.gain > 0 && e1.ate ? Math.max(0, e1.gain / e0.gain - 1) : 0, refund: e1.refund, extend: e1.extend, reveal: e1.reveal };
}
const mx = Object.fromEntries(FEATS.map(f => [f, Math.max(1e-9, ...KEYS.map(k => raw[k][f]))]));
const norm = k => FEATS.map(f => raw[k][f] / mx[f]);
console.log('species   ' + FEATS.map(f => f.slice(0, 6).padStart(7)).join(''));
for (const k of KEYS) console.log(k.padEnd(9), FEATS.map(f => raw[k][f].toFixed(2).padStart(7)).join(''));
const nn = {}, pairs = [];
for (const a of KEYS) for (const b of KEYS) if (a < b) { const x = norm(a), y = norm(b), d = Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0)); pairs.push([d, a, b]); nn[a] = Math.min(nn[a] ?? 9, d); nn[b] = Math.min(nn[b] ?? 9, d); }
pairs.sort((p, q) => p[0] - q[0]);
const excl = k => FEATS.filter(f => raw[k][f] / mx[f] >= .5 && KEYS.every(o => o === k || raw[o][f] / mx[f] <= .25));
console.log('\nclosest pairs: ' + pairs.slice(0, 5).map(p => p[1] + '~' + p[2] + ' ' + p[0].toFixed(2)).join(', '));
console.log('nearest-neighbour distance per species: ' + KEYS.map(k => k + ' ' + nn[k].toFixed(2)).join(', '));
console.log('min NN=' + Math.min(...Object.values(nn)).toFixed(2) + '  mean NN=' + (Object.values(nn).reduce((a, b) => a + b, 0) / KEYS.length).toFixed(2));
console.log('exclusive effects: ' + KEYS.map(k => k + '[' + (excl(k).join('+') || '-') + ']').join(' '));
require('node:fs').writeFileSync(process.env.PROBE_OUT || '/tmp/probe.json', JSON.stringify({ raw, nn }));
