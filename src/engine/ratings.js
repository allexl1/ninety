// XI strength: keeper / defence / midfield / attack + formation effects.
// Model choice (cited): Elo-style curve (We = 1/(1+10^(-dr/400)), ClubElo /
// eloratings.net, HFA +70) feeding Poisson xG (Dixon & Coles 1997, rho=-0.12).
// Absurd shapes (1-1-8, 0-0-10) concede accordingly via balance penalty.

export function parseShape(shape) {
  // "4-4-2" / "4-2-3-1" / "1-1-8" / "0-0-10" — outfield numbers must sum to 10.
  const parts = String(shape).split('-').map(Number);
  const sum = parts.reduce((a, b) => a + b, 0);
  if (parts.some((n) => Number.isNaN(n) || n < 0) || sum !== 10) {
    throw new Error(`Bad shape "${shape}" — outfield must sum to 10.`);
  }
  // Map variable-length shapes onto DF/MF/FW: first=DF block, last=FW block, middle=MF.
  if (parts.length === 3) return { df: parts[0], mf: parts[1], fw: parts[2] };
  const df = parts[0];
  const fw = parts[parts.length - 1];
  const mf = parts.slice(1, -1).reduce((a, b) => a + b, 0);
  return { df, mf, fw };
}

export function balanceReport(shape) {
  const { df, mf, fw } = parseShape(shape);
  const notes = [];
  let penalty = 0; // Elo points subtracted from overall
  if (df === 0) {
    notes.push('No defence — every counter is a 1v1 with your keeper.');
    penalty += 260;
  } else if (df < 3) {
    notes.push('Skeleton defence — wide channels wide open.');
    penalty += 90 + (3 - df) * 40;
  } else if (df > 5) {
    notes.push('Overloaded at the back — no outlet, attack starves.');
    penalty += (df - 5) * 55;
  }
  if (mf < 2) {
    notes.push(mf === 0 ? 'No midfield — defence and attack unconnected.' : 'Outnumbered in midfield — second balls lost.');
    penalty += mf === 0 ? 200 : 80 + (2 - mf) * 30;
  } else if (mf > 5) {
    notes.push('Congested middle — no penalty-box presence.');
    penalty += (mf - 5) * 40;
  }
  if (fw === 0) {
    notes.push('No striker — possession with no punch.');
    penalty += 170;
  } else if (fw > 3) {
    notes.push(`${fw} forwards — glorious chaos, nobody tracks back.`);
    penalty += (fw - 3) * 65;
  }
  const label = penalty === 0 ? 'Balanced' : penalty < 80 ? 'Stretched' : penalty < 170 ? 'Fragile' : 'Absurd';
  if (penalty === 0) notes.push('Balanced shape — lines connected, full strength.');
  return { df, mf, fw, penalty, label, notes };
}

// xi: { keeper, defenders[], midfielders[], attackers[] } as 40–99 numbers.
// gaffer: { line: 'defence'|'midfield'|'attack'|'keeper'|null, delta } tiny +/-1.
export function xiStrength(xi, shape = '4-3-3', gaffer = null) {
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 40);
  const keeper = xi.keeper ?? 70;
  const defence = avg(xi.defenders ?? []);
  const midfield = avg(xi.midfielders ?? []);
  const attack = avg(xi.attackers ?? []);
  const bal = balanceReport(shape);
  let overall = keeper * 0.12 + defence * 0.3 + midfield * 0.3 + attack * 0.28 - bal.penalty / 10;
  // Gaffer: tiny +/-1 to one line ≈ +/-0.3 overall. Flavor, not fate.
  if (gaffer?.line && typeof gaffer.delta === 'number') {
    const w = { keeper: 0.12, defence: 0.3, midfield: 0.3, attack: 0.28 }[gaffer.line] ?? 0;
    overall += gaffer.delta * w;
  }
  overall = Math.max(40, Math.min(99, overall));
  return { keeper, defence, midfield, attack, overall, balance: bal };
}

export const ratingToElo = (r) => 1000 + r * 10; // 70→1700, 88→1880
