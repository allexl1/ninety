// Draft rules: wheel, Season/Prime ratings, eligibility, rerolls, dead-end guard.
// Steals (logic only) from the reference drive: one player per spin, PLACE IN
// panel of eligible slots, free re-spin when nothing fits, move-a-player.
import { mulberry32 } from '../engine/rng.js';
import { SLOT_LINE } from './formations.js';

export function teamYear(season) {
  const m = String(season).match(/(\d{4})/);
  return m ? +m[1] : 0;
}

export function filterWheel(teams, era) {
  const { from, to } = era;
  return teams.filter((t) => {
    const y = teamYear(t.season);
    return y >= from && y <= to;
  });
}

// Prime-global: best-ever rating for a name across the whole wheel pool.
export function primeMap(teams) {
  const map = new Map();
  for (const t of teams) for (const p of t.players) {
    map.set(p.name, Math.max(map.get(p.name) ?? 0, p.rating));
  }
  return map;
}

export function ratingFor(player, mode, primes) {
  if (mode === 'prime') return primes.get(player.name) ?? player.rating;
  return player.rating;
}

export function spinWheel(pool, rng) {
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

// Strict detailed eligibility: slot code must be in the player's position list.
export function eligibleSlots(player, openSlotCodes) {
  return openSlotCodes.filter((code) => player.pos.includes(code));
}

// Dead-end guard: nothing in this squad fits any open slot → free re-spin.
export function squadHasMove(squadPlayers, openSlotCodes) {
  return squadPlayers.some((p) => eligibleSlots(p, openSlotCodes).length > 0);
}

// No-repeat players: drafted names are removed from every future squad.
// (With an 8-team v0 pool, teams must repeat across 11 picks — players never do.)
export function availableSquad(teamPlayers, picks) {
  const taken = new Set(picks.filter(Boolean).map((pk) => pk.player.name));
  return teamPlayers.filter((p) => !taken.has(p.name));
}

// Map filled picks → engine XI (line arrays), applying rating mode + gaffer.
export function picksToXI(picks, slots, ratingMode, primes) {
  const xi = { keeper: 70, defenders: [], midfielders: [], attackers: [] };
  picks.forEach((pick) => {
    if (!pick) return;
    const code = slots[pick.slotIndex];
    const r = ratingFor(pick.player, ratingMode, primes);
    const line = SLOT_LINE[code];
    if (line === 'keeper') xi.keeper = r;
    else xi[line].push(r);
  });
  return xi;
}

export function createRng(seed) {
  return mulberry32(seed >>> 0);
}

export function dailySeed(date = new Date()) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}
