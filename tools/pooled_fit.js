'use strict';
/* Pools every duel-matrix evaluation (optimizer iterations + baseline runs) and fits, per species,
 *   avgPayoff = a + b * ln(knob)
 * with a shrinkage prior on the slope b (ability leverage). Small/negative fitted b means the ability
 * is NOT what drives that species' results, so tuning it cannot fix the imbalance. */
const fs = require('node:fs');
const { KEYS, rowMeans } = require('./balance_lab');
const dir = process.argv[2] || require('node:path').join(__dirname,'results');
const obs = KEYS.map(() => []);
for (const r of JSON.parse(fs.readFileSync(dir + '/trail.json', 'utf8'))) KEYS.forEach((k, i) => obs[i].push([Math.log(r.s[k]), r.m[i]]));
for (const f of (process.argv[3] || '').split(',').filter(Boolean)) {
  const m = rowMeans(JSON.parse(fs.readFileSync(f, 'utf8')).A); KEYS.forEach((k, i) => obs[i].push([0, m[i]]));
}
const b0 = .30, w = 4, damp = +(process.argv[4] || .75), out = {};
console.log('species    n   slope(raw)  slope(shrunk)  a@s=1   s*     s_final   verdict');
KEYS.forEach((k, i) => {
  const o = obs[i], n = o.length, mx = o.reduce((a, p) => a + p[0], 0) / n, my = o.reduce((a, p) => a + p[1], 0) / n;
  const sxx = o.reduce((a, p) => a + (p[0] - mx) ** 2, 0), sxy = o.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
  const braw = sxx > 1e-9 ? sxy / sxx : 0;
  // posterior slope: data precision ~ sxx, prior precision ~ w*0.02
  const bs = (sxy + w * .02 * b0) / (sxx + w * .02);
  const a = o.reduce((s, p) => s + (p[1] - bs * p[0]), 0) / n;
  const star = Math.min(1.4, Math.max(.7, Math.exp(-a / Math.max(bs, .05))));
  const fin = Math.exp(damp * Math.log(star));
  const lever = braw > .12 ? 'ability has leverage' : 'WEAK leverage: imbalance is mostly passive stats';
  out[k] = +fin.toFixed(3);
  console.log(k.padEnd(9), String(n).padStart(2), braw.toFixed(2).padStart(10), bs.toFixed(2).padStart(13), (a >= 0 ? '+' : '') + a.toFixed(3), star.toFixed(2).padStart(6), fin.toFixed(2).padStart(8), '  ' + lever);
});
fs.writeFileSync(dir + '/knobs_pooled.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
