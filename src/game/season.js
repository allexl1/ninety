// League season with scorer attribution + pre-season odds.
// Goal model: our Elo/Poisson core (engine/match.js). Attribution ports the
// isolated-RNG-stream pattern: a forked PRNG names scorers so names can never
// perturb scorelines. Weights: FWD 6 / MID 3 / DEF 1 × max(1, ovr−55),
// ~25% unassisted; assists MID 5 / FWD 4 / DEF 2.
import { expectedGoals, playMatch } from '../engine/match.js';
import { mulberry32, poisson } from '../engine/rng.js';
import { fixtures } from '../engine/season.js';
import { leagueField } from '../data/index.js';

const LINE_GROUP = { GK: 'GK', RB: 'DEF', CB: 'DEF', LB: 'DEF', RWB: 'DEF', LWB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID', RW: 'FWD', LW: 'FWD', ST: 'FWD' };
const SCORER_W = { FWD: 6, MID: 3, DEF: 1, GK: 0 };
const ASSIST_W = { FWD: 4, MID: 5, DEF: 2, GK: 0 };

export function userScorers(picks, slots, ratingOf) {
  // picks: [{slotIndex, player}], slots: code per index
  return picks.filter(Boolean).map((pk) => ({
    name: pk.player.name,
    group: LINE_GROUP[slots[pk.slotIndex]],
    ovr: ratingOf(pk.player),
  }));
}

function pickWeighted(rng, squad, weights) {
  let total = 0;
  const ws = squad.map((p) => {
    const w = (weights[p.group] ?? 0) * Math.max(1, p.ovr - 55);
    total += w;
    return w;
  });
  if (total <= 0) return squad[Math.floor(rng() * squad.length)];
  let r = rng() * total;
  for (let i = 0; i < squad.length; i++) {
    r -= ws[i];
    if (r <= 0) return squad[i];
  }
  return squad[squad.length - 1];
}

function minutesFor(rng, n) {
  // Spread across the 90 like a real scoresheet, slight jitter, sorted.
  const mins = [];
  for (let i = 0; i < n; i++) {
    const base = ((i + 1) * 90) / (n + 1);
    const m = Math.max(1, Math.min(90, Math.round(base + (rng() * 8 - 4))));
    mins.push(m);
  }
  return mins.sort((a, b) => a - b);
}

function stoppage(minute, rng) {
  if (minute === 90 && rng() < 0.3) return `90+${1 + Math.floor(rng() * 4)}′`;
  if (minute === 45 && rng() < 0.15) return `45+${1 + Math.floor(rng() * 2)}′`;
  return `${minute}′`;
}

// Simulate one match; if userSquad given and user scored, attribute names.
// rng: main stream (scores), sRng: isolated attribution stream.
function playDetailed(homeOverall, awayOverall, rng, sRng, userSquad, userIsHome) {
  const { hxg, axg } = expectedGoals(homeOverall, awayOverall);
  const h = poisson(hxg, rng);
  const a = poisson(axg, rng);
  const scorers = [];
  const userGoals = userIsHome ? h : a;
  if (userSquad && userGoals > 0) {
    const mins = minutesFor(sRng, userGoals);
    for (let i = 0; i < userGoals; i++) {
      const scorer = pickWeighted(sRng, userSquad, SCORER_W);
      let assist = null;
      if (sRng() >= 0.25) {
        const mates = userSquad.filter((p) => p.name !== scorer.name);
        if (mates.length) assist = pickWeighted(sRng, mates, ASSIST_W).name;
      }
      scorers.push({ name: scorer.name, minute: stoppage(mins[i], sRng), assist });
    }
  }
  return { h, a, scorers };
}

// Full league: rounds from..to (default 1..38). strengthAt(round) lets January
// swap mid-season: sim 1..19, then 20..38 with the new strength.
export function simLeague(field, seed, userId, strengthAt, userSquad, opts = {}) {
  const { from = 1, to = 38 } = opts;
  const rng = mulberry32(seed);
  const sRng = mulberry32(seed ^ 0x9e3779b9);
  const table = new Map(field.map((t) => [t.id, { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }]));
  const byId = new Map(field.map((t) => [t.id, t]));
  const rounds = fixtures(field.map((t) => t.id), rng);
  const userMatches = [];
  const scorerTable = new Map(); // name -> {g, a}
  const bump = (name, k) => scorerTable.set(name, { g: (scorerTable.get(name)?.g ?? 0) + (k === 'g' ? 1 : 0), a: (scorerTable.get(name)?.a ?? 0) + (k === 'a' ? 1 : 0) });

  rounds.forEach((pairs, ri) => {
    const round = ri + 1;
    if (round < from || round > to) return;
    pairs.forEach(([hid, aid]) => {
      const h = byId.get(hid);
      const a = byId.get(aid);
      const involvesUser = hid === userId || aid === userId;
      const userOverall = strengthAt(round);
      const { h: hg, a: ag, scorers } = involvesUser
        ? playDetailed(
            hid === userId ? userOverall : h.overall,
            aid === userId ? userOverall : a.overall,
            rng, sRng, userSquad, hid === userId,
          )
        : (() => { const r = playMatch(h.overall, a.overall, rng); return { h: r.h, a: r.a, scorers: [] }; })();
      const ht = table.get(hid);
      const at = table.get(aid);
      ht.gf += hg; ht.ga += ag; at.gf += ag; at.ga += hg;
      ht.gd = ht.gf - ht.ga; at.gd = at.gf - at.ga;
      if (hg > ag) { ht.w += 1; at.l += 1; ht.p += 3; }
      else if (hg < ag) { at.w += 1; ht.l += 1; at.p += 3; }
      else { ht.d += 1; at.d += 1; ht.p += 1; at.p += 1; }
      if (involvesUser) {
        scorers.forEach((s) => { bump(s.name, 'g'); if (s.assist) bump(s.assist, 'a'); });
        const ugf = hid === userId ? hg : ag;
        const uga = hid === userId ? ag : hg;
        userMatches.push({
          round, res: ugf > uga ? 'W' : ugf < uga ? 'L' : 'D',
          home: hid === userId, opp: hid === userId ? a.name : h.name,
          gf: ugf, ga: uga,
          scorers,
        });
      }
    });
  });
  const standings = [...table.values()].sort((x, y) => y.p - x.p || y.gd - x.gd || y.gf - x.gf || (x.name < y.name ? -1 : 1));
  const scorers = [...scorerTable.entries()].map(([name, s]) => ({ name, ...s })).sort((x, y) => y.g - x.g || (y.g + y.a) - (x.g + x.a));
  return { standings, userMatches, scorers };
}

// Pre-season odds: Monte Carlo over plain (fast) seasons.
export function preseasonOdds(field, seed, userId, userOverall, n = 400) {
  // Reuse engine simSeason via dynamic import shape — inlined here for speed parity:
  // (uses same fixtures/playMatch through simLeague with no scorers)
  let titles = 0, top4 = 0, top6 = 0, top10 = 0, relegated = 0, posSum = 0, ptsSum = 0;
  for (let s = 1; s <= n; s++) {
    const { standings } = simLeague(field, seed * 7919 + s, userId, () => userOverall, null);
    const idx = standings.findIndex((t) => t.id === userId);
    posSum += idx + 1;
    ptsSum += standings[idx].p;
    if (idx === 0) titles++;
    if (idx < 4) top4++;
    if (idx < 6) top6++;
    if (idx < 10) top10++;
    if (idx >= field.length - 3) relegated++;
  }
  const pct = (c) => (100 * c) / n;
  return {
    projected: Math.round(posSum / n), expectedPts: Math.round(ptsSum / n),
    title: pct(titles), top4: pct(top4), top6: pct(top6), top10: pct(top10), relegated: pct(relegated),
  };
}

// Merge two partial tables (e.g. rounds 1-19 + 20-38) into final standings.
export function mergeTables(a, b) {
  const map = new Map();
  for (const row of [...a, ...b]) {
    const cur = map.get(row.id) ?? { ...row, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 };
    cur.p += row.p; cur.w += row.w; cur.d += row.d; cur.l += row.l;
    cur.gf += row.gf; cur.ga += row.ga; cur.gd = cur.gf - cur.ga;
    map.set(row.id, cur);
  }
  return [...map.values()].sort((x, y) => y.p - x.p || y.gd - x.gd || y.gf - x.gf || (x.name < y.name ? -1 : 1));
}

export function mergeScorers(a, b) {
  const map = new Map();
  for (const s of [...a, ...b]) {
    map.set(s.name, { name: s.name, g: (map.get(s.name)?.g ?? 0) + s.g, a: (map.get(s.name)?.a ?? 0) + s.a });
  }
  return [...map.values()].sort((x, y) => y.g - x.g || (y.g + y.a) - (x.g + x.a));
}
export function europeSpot(pos) {
  if (pos <= 4) return { code: 'UCL', label: 'Champions League' };
  if (pos <= 6) return { code: 'UEL', label: 'Europa League' };
  if (pos === 7) return { code: 'UECL', label: 'Conference League' };
  return null;
}

export { leagueField };
