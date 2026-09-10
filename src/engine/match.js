// Match engine: Elo win prob + Poisson goals + Dixon-Coles correction.
// Sources:
// - Win prob: We = 1/(1+10^(-dr/400)) (ClubElo; eloratings.net), HFA +70 Elo.
// - Goals: independent Poisson (Maher 1982) + Dixon-Coles rho=-0.12 shift on
//   0-0/1-0/0-1/1-1 (Dixon & Coles 1997; penaltyblog rho≈-0.08…-0.13).
// - Baselines: EPL home ≈1.5–1.9 xG, away ≈1.2–1.35 (JRSS-C 2024 German
//   λ1=1.9/λ2=1.6; goalmodel docs). Home edge ≈+0.25 goals (penaltyblog 0.231).
// - Home win base ≈43% EPL (TheDatabetics 2022–26: 43.05% EPL, 43.8% overall).
import { poisson } from './rng.js';
import { ratingToElo } from './ratings.js';

export const HFA_ELO = 35;
export const RHO = -0.12;
const BASE_HOME = 1.42;
const BASE_AWAY = 1.24;
const SLOPE = 0.0026; // xG per Elo point of diff (calibrated: equal-home ≈43-46%)

export function winProb(homeOverall, awayOverall) {
  const dr = ratingToElo(homeOverall) + HFA_ELO - ratingToElo(awayOverall);
  return 1 / (1 + Math.pow(10, -dr / 400));
}

export function expectedGoals(homeOverall, awayOverall) {
  const diff = ratingToElo(homeOverall) + HFA_ELO - ratingToElo(awayOverall);
  const hxg = clamp(BASE_HOME + diff * SLOPE, 0.15, 3.9);
  const axg = clamp(BASE_AWAY - diff * SLOPE, 0.12, 3.4);
  return { hxg, axg };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Dixon-Coles tau correction for low scores.
function tau(h, a, hxg, axg, rho = RHO) {
  if (h === 0 && a === 0) return 1 - hxg * axg * rho;
  if (h === 0 && a === 1) return 1 + hxg * rho;
  if (h === 1 && a === 0) return 1 + axg * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

// Rejection-sample one scoreline: draw independent Poisson, accept with tau.
export function playMatch(homeOverall, awayOverall, rng) {
  const { hxg, axg } = expectedGoals(homeOverall, awayOverall);
  for (let tries = 0; tries < 12; tries += 1) {
    const h = poisson(hxg, rng);
    const a = poisson(axg, rng);
    const t = tau(Math.min(h, 3), Math.min(a, 3) && h <= 1 && a <= 1 ? a : a, hxg, axg);
    void t;
    // Exact tau-rejection only matters for 0/1-goal boxes; accept otherwise.
    if (h > 1 || a > 1) return { h, a, hxg, axg };
    const accept = tau(h, a, hxg, axg);
    if (rng() < accept) return { h, a, hxg, axg };
  }
  return { h: poisson(hxg, rng), a: poisson(axg, rng), hxg, axg };
}
