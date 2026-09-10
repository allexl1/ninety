// Double round-robin season (20 teams → 38 rounds). Seeded + reproducible.
import { mulberry32 } from './rng.js';
import { playMatch } from './match.js';

export function fixtures(teamIds, rng) {
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push('__BYE__');
  const n = ids.length;
  const rounds = [];
  const arr = [...ids];
  for (let r = 0; r < n - 1; r += 1) {
    const pairs = [];
    for (let i = 0; i < n / 2; i += 1) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== '__BYE__' && b !== '__BYE__') pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  void rng;
  const second = rounds.map((pairs) => pairs.map(([a, b]) => [b, a]));
  return [...rounds, ...second];
}

export function simSeason(teams, seed) {
  // teams: [{ id, name, overall }]
  const rng = mulberry32(seed);
  const table = new Map(teams.map((t) => [t.id, { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }]));
  const byId = new Map(teams.map((t) => [t.id, t]));
  const rounds = fixtures(teams.map((t) => t.id), rng);
  const results = [];
  rounds.forEach((pairs, round) => {
    pairs.forEach(([hid, aid]) => {
      const h = byId.get(hid);
      const a = byId.get(aid);
      const { h: hg, a: ag } = playMatch(h.overall, a.overall, rng);
      const ht = table.get(hid);
      const at = table.get(aid);
      ht.gf += hg; ht.ga += ag; at.gf += ag; at.ga += hg;
      ht.gd = ht.gf - ht.ga; at.gd = at.gf - at.ga;
      if (hg > ag) { ht.w += 1; at.l += 1; ht.p += 3; }
      else if (hg < ag) { at.w += 1; ht.l += 1; at.p += 3; }
      else { ht.d += 1; at.d += 1; ht.p += 1; at.p += 1; }
      results.push({ round: round + 1, hid, aid, hg, ag });
    });
  });
  const standings = [...table.values()].sort((x, y) => y.p - x.p || y.gd - x.gd || y.gf - x.gf || (x.name < y.name ? -1 : 1));
  return { standings, results };
}
