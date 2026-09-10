// Run store: setup config + draft state + localStorage (display name, runs).
// Backend-agnostic by design: swap these adapters for Supabase in P5.
const PROFILE_KEY = 'ninety.v1.profile';
const RUNS_KEY = 'ninety.v1.runs';

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? { displayName: '' };
  } catch {
    return { displayName: '' };
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch { /* private mode: play on without saving */ }
}

export function saveRunSummary(summary) {
  try {
    const runs = JSON.parse(localStorage.getItem(RUNS_KEY)) ?? [];
    runs.unshift({ ...summary, at: new Date().toISOString() });
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, 50)));
  } catch { /* ignore */ }
}

export function loadRunSummaries() {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export const DEFAULT_SETUP = {
  preset: '4-3-3',
  custom: { df: 4, mf: 3, fw: 3, wingbacks: false, wideMF: true },
  rerolls: 3,
  blind: false,
  draftMode: 'squad', // squad | position
  ratingMode: 'season', // season | prime
  era: { from: 1992, to: 2026 },
  january: true,
  displayName: '',
};

export function newRun(setup, seed) {
  return {
    id: `run-${seed.toString(36)}`,
    seed,
    setup: { ...setup },
    picks: Array(11).fill(null), // { slotIndex, player, teamId }
    spun: [], // team ids already drawn (no repeats per run)
    rerollsLeft: setup.rerolls,
    freeSpinsUsed: 0,
    currentTeam: null, // wheel team object on the table
    targetSlot: null, // position-first: slot index to fill
    selectedPlayer: null, // squad-first: player awaiting PLACE IN
    phase: 'draft',
    gaffer: null,
  };
}
