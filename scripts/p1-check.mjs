// P1 CHECK — user XI inserted into the 26/27 field (weakest auto-replaced).
// Run: npm run p1-check. Prints titles / avg pos / avg pts / top-4% for an
// elite (88), mid (78) and weak (70) user XI over 2,000 seasons each.
import { simSeason } from '../src/engine/season.js';
import { leagueField, wheelTeams } from '../src/data/index.js';

console.log('Wheel-team XI overalls (engine-computed, shape-adjusted):');
for (const t of wheelTeams()) {
  console.log(`  ${t.club} ${t.season} [${t.shape}]: ${t.computed.overall.toFixed(1)} (K${t.computed.keeper} D${t.computed.defence.toFixed(0)} M${t.computed.midfield.toFixed(0)} A${t.computed.attack.toFixed(0)}${t.computed.balance.penalty ? ` −${t.computed.balance.label}` : ''})`);
}

for (const overall of [88, 78, 70]) {
  const N = 2000;
  let titles = 0, top4 = 0, posSum = 0, ptsSum = 0;
  for (let s = 1; s <= N; s += 1) {
    const { field } = leagueField([{ name: 'YOU', overall }]);
    const { standings } = simSeason(field, 50000 + s);
    const idx = standings.findIndex((t) => t.id === 'YOU-1');
    posSum += idx + 1; ptsSum += standings[idx].p;
    if (idx === 0) titles += 1;
    if (idx < 4) top4 += 1;
  }
  console.log(`YOU@${overall}: titles ${(100 * titles / N).toFixed(1)}% · top-4 ${(100 * top4 / N).toFixed(1)}% · avg pos ${(posSum / N).toFixed(1)} · avg pts ${(ptsSum / N).toFixed(0)} (n=${N})`);
}
