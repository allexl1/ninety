# NINETY data sources (P1 starter — snapshot 2026-09-10)

## What this is
8 iconic wheel club-seasons (XI + 4 subs each, 120 player-season rows) plus
20 EPL 2026/27 opponent strengths. Every row carries `src` + `conf` so any
number traces to a method — nothing invented silently.

## Rating method (v0)
Scale is EA FC 40–99. Anchor = the player's contemporary FIFA overall for
that season (recalled from the FIFA edition of that year), adjusted at most
±2 for that season's actual form. Tags:
- `fifa-contemp` — anchored to that year's FIFA edition (e.g. FIFA 17 for
  2016/17, FIFA 23 for 2022/23).
- `icon` — anchored to the player's EA FC Icon/Hero card band.
- `fc-scale` — editorial FC-scale calibration where no anchor is recalled.
Confidence: `high` (anchor certain), `med` (±1), `low` (±2, verify).
Tightening plan: cross-check every `low` row against FIFA Index archives /
FC 26 Icons and record the edition in `src` (e.g. `fifa17:94`).

## Wheel teams (why these 8)
One per UCL era, all champions, all 1992/93+: Ajax 94/95 · Utd 98/99 ·
Arsenal 03/04 · Barça 08/09 · Inter 09/10 · Bayern 12/13 · Madrid 16/17 ·
City 22/23. Positions/nationalities are football facts (general knowledge);
ratings follow the method above.

## EPL 2026/27 opponents
Membership verified 2026-09-10 via Wikipedia 2026–27 Premier League, NBC,
premierleague.com: Coventry City, Ipswich Town, Hull City promoted;
West Ham, Burnley, Wolves relegated. Season started 21 Aug 2026, window shut.
Strengths are FC-scale team-overall estimates (`fc-scale`, conf `low`) —
verify against FC 26 club ratings. User XI auto-replaces the weakest club.

## Licensing (public-repo posture)
- Player/club names: factual, shown with a no-affiliation disclaimer in-app
  (same posture as 38-0's disclaimer). No logos, no photos shipped.
- Ratings: numbers are our v0 editorial snapshot "in the style of" EA FC;
  not copied from any EA database dump. EA Sports FC ratings © EA.
- No affiliation with EA, FIFA/FC, UEFA, or the Premier League.
