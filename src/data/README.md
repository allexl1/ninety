# NINETY data posture (P0)

Starter scope (locked): **8 iconic club-seasons + 19 EPL 26/27 opponent strengths**.

- YOUR XI comes from the historic wheel (UCL-era 1992/93+, EPL, nationals).
- Opponents are 26/27 single-strength numbers (EA FC 26 snapshot, dated).
- P0 ships schema + harness only — **no player rows yet, nothing invented**.
- P1 hand-enters the EA FC 26 snapshot: source = EA Sports FC 26 in-game
  overalls (proprietary, private prototype only, not redistributable),
  snapshot date recorded in `sources.md`, one row per player-season.
- No club logos, no player photos in the public repo. Local `/public`
  thumbnails (Wikimedia Commons, fair-use) stay git-ignored; UI falls back
  to initial-letter crests so `npm run build` never needs them.

Files (P1): `teams.json` (wheel), `opponents-26-27.json` (strengths),
`sources.md` (which source, which stats, era-adjustment, license per row).
