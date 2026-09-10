// Dataset loader: wheel teams + 26/27 opponents, with engine-computed XI overalls.
import { xiStrength } from '../engine/ratings.js';
import opponents from './opponents-26-27.json' with { type: 'json' };
import wheel from './teams.json' with { type: 'json' };

export const POS_LINES = {
  GK: 'keeper',
  RB: 'defenders', CB: 'defenders', LB: 'defenders', RWB: 'defenders', LWB: 'defenders',
  CDM: 'midfielders', CM: 'midfielders', CAM: 'midfielders', RM: 'midfielders', LM: 'midfielders',
  RW: 'attackers', LW: 'attackers', ST: 'attackers',
};

export function teamXI(team) {
  const xi = { keeper: 70, defenders: [], midfielders: [], attackers: [] };
  for (const p of team.players.filter((p) => p.xi)) {
    const line = POS_LINES[p.pos[0]];
    if (line === 'keeper') xi.keeper = p.rating;
    else xi[line].push(p.rating);
  }
  return xi;
}

export function teamStrength(team, gaffer = null) {
  return xiStrength(teamXI(team), team.shape, gaffer);
}

export function wheelTeams() {
  return wheel.teams.map((t) => ({ ...t, computed: teamStrength(t) }));
}

// League field: 19 opponents (weakest auto-replaced) + user XIs.
export function leagueField(userXIs) {
  const sorted = [...opponents.opponents].sort((a, b) => a.overall - b.overall);
  const field = sorted.slice(userXIs.length).map((o) => ({ id: o.club, name: o.club, overall: o.overall }));
  userXIs.forEach((u, i) => field.push({ id: `YOU-${i + 1}`, name: u.name, overall: u.overall }));
  return { field, replaced: sorted.slice(0, userXIs.length).map((o) => o.club) };
}

export { opponents, wheel };
