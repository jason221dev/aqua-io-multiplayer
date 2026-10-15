'use strict';
/* Paired held-out validation: tuned species C vs the unchanged species U, same seeds for baseline and tuned.
 * node validate.js --out f.json [--params p.json] --seeds 8 --seed0 12000 */
const fs = require('node:fs');
const lab = require('./balance_lab');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const C = (arg('changed', 'sardine,puffer,piranha,koi')).split(','), U = lab.KEYS.filter(k => !C.includes(k) && !(arg('skip', '')).split(',').includes(k));
lab.applyParams(arg('params') ? JSON.parse(fs.readFileSync(arg('params'), 'utf8')) : null);
const n = +arg('seeds', 8), seeds = Array.from({ length: n }, (_, i) => +arg('seed0', 12000) + i * 7919);
const res = {}; for (const c of C) res[c] = seeds.map(() => 0);
for (let si = 0; si < n; si++) for (const c of C) {
  let tot = 0;
  for (const u of U) { const r = lab.duel(c, u, [seeds[si]], { T: 100, npcCount: 45 }); tot += r.share - .5; }
  res[c][si] = tot / U.length;
}
fs.writeFileSync(arg('out'), JSON.stringify({ C, U, seeds, res }));
for (const c of C) console.log(c.padEnd(9), (res[c].reduce((a, b) => a + b, 0) / n).toFixed(3));
