// Continental tournaments: group draw + group stage + single-leg knockout.
// Field = top 16 of the league table (user always in it when qualified).
// Neutral venue throughout (hfa 0). Draws in knockouts go to penalties.
// Seeded: same league seed replays the same tournament.
import { playMatch } from '../engine/match.js';
import { mulberry32 } from '../engine/rng.js';
import { fixtures } from '../engine/season.js';
import { playDetailed } from './season.js';

function shootout(rng) {
  // Best of 5, then sudden death. Each kick converts at 0.75.
  let h = 0, a = 0;
  for (let i = 0; i < 5; i++) {
    if (rng() < 0.75) h++;
    if (rng() < 0.75) a++;
    const left = 4 - i;
    if (h > a + left || a > h + left) break;
  }
  while (h === a) {
    const hb = rng() < 0.75 ? 1 : 0;
    const ab = rng() < 0.75 ? 1 : 0;
    h += hb; a += ab;
  }
  return { h, a };
}

function tableOf(rows) {
  return [...rows.values()].sort((x, y) => y.p - x.p || y.gd - x.gd || y.gf - x.gf || (x.name < y.name ? -1 : 1));
}

function playTie(home, away, rng, sRng, userId, userOverall, userSquad, stage) {
  const ho = home.id === userId ? userOverall : home.overall;
  const ao = away.id === userId ? userOverall : away.overall;
  const involves = home.id === userId || away.id === userId;
  const { h, a, scorers } = involves
    ? playDetailed(ho, ao, rng, sRng, userSquad, home.id === userId, 0)
    : (() => { const r = playMatch(ho, ao, rng, 0); return { h: r.h, a: r.a, scorers: [] }; })();
  let pens = null;
  let winnerId;
  if (h > a) winnerId = home.id;
  else if (a > h) winnerId = away.id;
  else {
    pens = shootout(rng);
    winnerId = pens.h > pens.a ? home.id : away.id;
  }
  const tie = { stage, home: home.name, away: away.name, hg: h, ag: a, pens, winnerId, userInvolved: involves };
  let userMatch = null;
  if (involves) {
    const ugf = home.id === userId ? h : a;
    const uga = home.id === userId ? a : h;
    userMatch = {
      stage, res: ugf > uga ? 'W' : ugf < uga ? 'L' : ugf === uga && winnerId === userId ? 'Wpens' : 'Lpens',
      opp: home.id === userId ? away.name : home.name, gf: ugf, ga: uga, pens,
      scorers, through: winnerId === userId,
    };
  }
  return { tie, userMatch };
}

export function playTournament(standings, userId, seed, userOverall, userSquad, label = 'Champions League') {
  const rng = mulberry32(seed);
  return playTournamentWithRng(standings, userId, rng, userOverall, userSquad, label);
}

export function playTournamentWithRng(standings, userId, rng, userOverall, userSquad, label = 'Champions League') {
  const sRng = mulberry32(Math.floor(rng() * 0xffffffff));
  const field = standings.slice(0, 16).map((t) => ({ id: t.id, name: t.name, overall: t.id === userId ? userOverall : t.overall }));
  // Seeded draw: 4 pots by strength, one club per pot per group.
  const byStrength = [...field].sort((a, b) => b.overall - a.overall);
  const pots = [byStrength.slice(0, 4), byStrength.slice(4, 8), byStrength.slice(8, 12), byStrength.slice(12, 16)];
  const groups = ['A', 'B', 'C', 'D'].map((name) => ({ name, teams: [], table: null, rounds: [] }));
  for (const pot of pots) {
    const order = [...pot];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((team, gi) => groups[gi].teams.push(team));
  }

  const userMatches = [];
  const scorerTable = new Map();
  const bump = (name, k) => scorerTable.set(name, { g: (scorerTable.get(name)?.g ?? 0) + (k === 'g' ? 1 : 0), a: (scorerTable.get(name)?.a ?? 0) + (k === 'a' ? 1 : 0) });

  // Group stage: single round-robin (first 3 rounds of the fixture grid).
  for (const g of groups) {
    const rows = new Map(g.teams.map((t) => [t.id, { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }]));
    const rounds = fixtures(g.teams.map((t) => t.id), rng).slice(0, 3);
    g.rounds = [];
    rounds.forEach((pairs, ri) => {
      pairs.forEach(([hid, aid]) => {
        const h = rows.get(hid);
        const a = rows.get(aid);
        const ho = hid === userId ? userOverall : h.overall;
        const ao = aid === userId ? userOverall : a.overall;
        const involves = hid === userId || aid === userId;
        const { h: hg, a: ag, scorers } = involves
          ? playDetailed(ho, ao, rng, sRng, userSquad, hid === userId, 0)
          : (() => { const r = playMatch(ho, ao, rng, 0); return { h: r.h, a: r.a, scorers: [] }; })();
        h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
        h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
        if (hg > ag) { h.w++; a.l++; h.p += 3; }
        else if (hg < ag) { a.w++; h.l++; a.p += 3; }
        else { h.d++; a.d++; h.p++; a.p++; }
        if (involves) {
          scorers.forEach((s) => { bump(s.name, 'g'); if (s.assist) bump(s.assist, 'a'); });
          const ugf = hid === userId ? hg : ag;
          const uga = hid === userId ? ag : hg;
          userMatches.push({
            stage: `Group ${g.name} · MD${ri + 1}`, res: ugf > uga ? 'W' : ugf < uga ? 'L' : 'D',
            opp: hid === userId ? a.name : h.name, gf: ugf, ga: uga, scorers,
          });
          g.rounds.push({ md: ri + 1, opp: hid === userId ? a.name : h.name, gf: ugf, ga: uga, res: ugf > uga ? 'W' : ugf < uga ? 'L' : 'D', scorers });
        }
      });
    });
    g.table = tableOf(rows);
  }

  // Knockout: A1vB2, B1vA2, C1vD2, D1vC2.
  const adv = (gi, pos) => ({ ...groups[gi].table[pos] });
  const qfPairs = [
    [adv(0, 0), adv(1, 1)], [adv(1, 0), adv(0, 1)],
    [adv(2, 0), adv(3, 1)], [adv(3, 0), adv(2, 1)],
  ];
  const bracket = { qf: [], sf: [], f: null };
  const byId = new Map(field.map((t) => [t.id, t]));
  const playRound = (pairs, stage) => pairs.map(([h, a]) => {
    const { tie, userMatch } = playTie(byId.get(h.id) ?? h, byId.get(a.id) ?? a, rng, sRng, userId, userOverall, userSquad, stage);
    if (userMatch) {
      userMatch.scorers.forEach((s) => { bump(s.name, 'g'); if (s.assist) bump(s.assist, 'a'); });
      userMatches.push(userMatch);
    }
    return tie;
  });
  bracket.qf = playRound(qfPairs, 'Quarter-final');
  const nameOf = (id) => byId.get(id)?.name ?? id;
  const sfTeams = [
    [{ id: bracket.qf[0].winnerId }, { id: bracket.qf[2].winnerId }],
    [{ id: bracket.qf[1].winnerId }, { id: bracket.qf[3].winnerId }],
  ].map(([h, a]) => [{ ...h, name: nameOf(h.id), overall: (byId.get(h.id) ?? { overall: 75 }).overall }, { ...a, name: nameOf(a.id), overall: (byId.get(a.id) ?? { overall: 75 }).overall }]);
  bracket.sf = playRound(sfTeams, 'Semi-final');
  const fTeams = [[{ id: bracket.sf[0].winnerId }, { id: bracket.sf[1].winnerId }]].map(([h, a]) => [{ ...h, name: nameOf(h.id), overall: (byId.get(h.id) ?? { overall: 75 }).overall }, { ...a, name: nameOf(a.id), overall: (byId.get(a.id) ?? { overall: 75 }).overall }])[0];
  bracket.f = playRound([fTeams], 'Final')[0];
  const winnerId = bracket.f.winnerId;

  const scorers = [...scorerTable.entries()].map(([name, s]) => ({ name, ...s })).sort((x, y) => y.g - x.g || (y.g + y.a) - (x.g + x.a));
  const userOut = winnerId === userId ? 'champion' : (() => {
    const last = [...userMatches].reverse().find((m) => m.stage !== undefined && m.stage.includes('Group') === false);
    return last ? last.stage : 'Group stage';
  })();
  return { label, groups, bracket, winner: nameOf(winnerId), winnerId, userMatches, scorers, userOut };
}
