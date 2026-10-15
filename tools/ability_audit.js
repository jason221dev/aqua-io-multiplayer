'use strict';
/* Controlled single-ability scenarios against the real simulation: does each ability do what its hint promises? */
const Aqua = require('../aqua_sim');
const { SP, ABILITY } = Aqua;
const DT = 1 / 30;
function arena(roster, seed = 5) {
  const s = Aqua.create();
  s.newMatch({ sp: roster[0], mode: 'last', seed, competitorCount: Math.max(8, roster.length), maxTotalFish: 400, npcCount: 0, miniFishCount: 0,
    slots: { fish: roster.map(sp => ({ sp })) } });
  s.fishes.forEach((f, i) => { f.x = 300 + i * 450; f.z = -700 + i * 60; f.y = 400; f.prot = 0; f.mass = 100; });
  s.fishers.forEach(fr => { fr.x = 5000; fr.z = 800; fr.cd = 9999; });
  s.fishes.forEach(f => { f.abilCD = 999; });
  return s;
}
const run = (s, secs, each) => { for (let i = 0; i < Math.round(secs / DT); i++) { each && each(i); s.step({}, DT); } };
const out = {};

// 1) Angelfish whirl: how far toward the angel is a fleeing smaller fish pulled vs the same chase without whirl?
function whirl(use) {
  const s = arena(['angel', 'guppy']); const a = s.fishes[0], p = s.fishes[1];
  a.mass = 200; a.x = 1000; a.y = 400; a.z = 0; p.x = 1070; p.y = 400; p.z = 0; p.prot = 0; a.prot = 0;
  a.hx = 1; a.hz = 0;
  if (use) { a.abilCD = 0; s.useAbility(a); }
  let minD = 1e9; const d0 = Aqua.dist(a, p);
  run(s, 1.3, () => { minD = Math.min(minD, Aqua.dist(a, p)); });
  return { gap: Aqua.dist(a, p) - d0, eaten: !p.alive };
}
out.whirl_off = whirl(false); out.whirl_on = whirl(true);

// 2) Puffer: inflated puffer must beat a predator 2x its mass on contact; deflated must lose.
function puff(use) {
  const s = arena(['puffer', 'tuna']); const a = s.fishes[0], p = s.fishes[1];
  a.mass = 100; p.mass = 200; a.x = 1000; a.z = 0; a.y = 400; p.x = 1040; p.z = 0; p.y = 400; p.hx = -1;
  if (use) { a.abilCD = 0; s.useAbility(a); }
  run(s, .4);
  return { pufferAlive: a.alive, tunaAlive: p.alive, combat: Aqua.combatMass(a) };
}
out.puffer_off = puff(false); out.puffer_on = puff(true);

// 3) Seahorse camo vs a hunter bot: is the camouflaged fish ignored beyond 38 units?
function camo(use) {
  const s = arena(['seahorse', 'barra']); const a = s.fishes[0], p = s.fishes[1];
  a.mass = 100; p.mass = 400; a.x = 1000; a.z = 0; a.y = 400; p.x = 1160; p.z = 0; p.y = 400; p.prot = 0;
  if (use) { a.abilCD = 0; s.useAbility(a); }
  let eatenAt = null;
  run(s, 2.2, i => { if (!a.alive && eatenAt === null) eatenAt = i * DT; });
  return { seahorseAlive: a.alive, eatenAt };
}
out.camo_off = camo(false); out.camo_on = camo(true);

// 4) Uptime / cooldown economics straight from the species table.
out.table = Object.fromEntries(Object.keys(SP).map(k => [k, { cd: SP[k].cd, dur: SP[k].dur, uptime: +(SP[k].dur / (SP[k].cd + SP[k].dur) * 100).toFixed(1) + '%', mul: SP[k].mul }]));
console.log(JSON.stringify(out, null, 1));
