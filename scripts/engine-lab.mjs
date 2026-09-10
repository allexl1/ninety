// P0 ENGINE LAB — 10,000-season harness. Run: npm run engine-lab
// Prints: title-winner concentration, miracle-run %, favorite win rate by
// rating gap. HARD RULE: elite XI beats weak XI ~65–70%, miracles rare.
// Model: Elo We=1/(1+10^(-dr/400)) HFA+70; Poisson+Dixon-Coles rho=-0.12.
import { mulberry32 } from '../src/engine/rng.js';
import { playMatch } from '../src/engine/match.js';
import { simSeason } from '../src/engine/season.js';

const SEASONS = 10000;
const rng = mulberry32(90);

// League spread: 2 elites (~88), 4 strong (~82), 8 mid (~77), 4 weak (~71), 2 minnows (~65).
function makeLeague() {
  const defs = [
    ['EL1', 88], ['EL2', 87.5], ['ST1', 83], ['ST2', 82.5], ['ST3', 82], ['ST4', 81.5],
    ...Array.from({ length: 8 }, (_, i) => [`MID${i + 1}`, 77.5 - (i % 3)]),
    ['WK1', 71], ['WK2', 70.5], ['WK3', 70], ['WK4', 69.5], ['MN1', 65], ['MN2', 64],
  ];
  return defs.map(([id, overall]) => ({ id, name: id, overall }));
}

const titleCounts = new Map();
let miracles = 0;
const buckets = new Map(); // gap -> { fav: wins, n }

for (let s = 1; s <= SEASONS; s += 1) {
  const league = makeLeague();
  const { standings } = simSeason(league, 9000 + s);
  const champ = standings[0];
  titleCounts.set(champ.id, (titleCounts.get(champ.id) ?? 0) + 1);
  if (champ.overall < 72) miracles += 1;
}

// Head-to-head favorite rates by gap: elite 88 vs 78/72/65, plus mid 77 vs 71.
const probes = [
  [88, 78], [88, 72], [88, 65], [82, 77], [77, 71], [77, 77],
];
for (const [h, a] of probes) {
  let fav = 0;
  const N = 20000;
  const r2 = mulberry32(h * 100 + a);
  for (let i = 0; i < N; i += 1) {
    const { h: hg, a: ag } = playMatch(h, a, r2);
    if (hg > ag) fav += 1;
  }
  buckets.set(`${h}v${a}`, { fav, n: N });
}

const sorted = [...titleCounts.entries()].sort((x, y) => y[1] - x[1]);
const top2 = sorted.slice(0, 2).reduce((acc, [, c]) => acc + c, 0);
console.log(`NINETY P0 ENGINE LAB — ${SEASONS.toLocaleString()} seasons, 20-team double round-robin`);
console.log('Model: Elo(400,HFA+35) + Poisson/Dixon-Coles(rho=-0.12); xG base 1.42/1.24 slope 0.0026');
console.log('--- title concentration ---');
for (const [id, c] of sorted.slice(0, 6)) console.log(`  ${id}: ${(100 * c / SEASONS).toFixed(2)}%`);
console.log(`  top-2 share: ${(100 * top2 / SEASONS).toFixed(1)}%`);
console.log(`--- miracles (champ rated <72): ${(100 * miracles / SEASONS).toFixed(2)}% of seasons`);
console.log('--- favorite (home) win rate by gap, draws excluded from numerator ---');
for (const [k, { fav, n }] of buckets) console.log(`  home ${k}: ${(100 * fav / n).toFixed(1)}% home wins (n=${n.toLocaleString()})`);
const eliteWeak = await (async () => {
  // Elite 88 home vs weak 71 ≈ the HARD RULE check (includes HFA).
  let w = 0; const N = 20000; const r = mulberry32(8871);
  for (let i = 0; i < N; i += 1) { const { h: hg, a: ag } = playMatch(88, 71, r); if (hg > ag) w += 1; }
  return 100 * w / N;
})();
console.log(`HARD RULE elite88 vs weak71 (home): ${eliteWeak.toFixed(1)}% — target 65–70% home wins`);
