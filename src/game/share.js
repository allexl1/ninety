// Share: hash-encoded runs (no backend), text caption, canvas image card.
import { wheel } from '../data/index.js';

const b64url = {
  enc(s) {
    return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  },
};

// Minimal run envelope: setup + picks (slot, team, name) + gaffer + january + result.
export function encodeShare(payload) {
  return `#/s/${b64url.enc(JSON.stringify(payload))}`;
}

export function decodeShare(hash) {
  const m = String(hash).match(/^#\/s\/([A-Za-z0-9\-_]+)$/);
  if (!m) return null;
  try {
    const p = JSON.parse(b64url.dec(m[1]));
    if (!p || !Array.isArray(p.picks) || p.picks.length !== 11) return null;
    return p;
  } catch {
    return null;
  }
}

export function findPlayer(teamId, name) {
  const team = wheel.teams.find((t) => t.id === teamId);
  return team?.players.find((p) => p.name === name) ?? null;
}

export function captionText({ displayName, w, d, l, pts, pos, projected, overall, topScorer, gaffer }) {
  const me = displayName || 'My XI';
  return `${me} went ${w}-${d}-${l} (${pts} pts, ${pos}${ordinal(pos)}) with an ${overall} XI, projected ${projected}${ordinal(projected)}. Top scorer: ${topScorer}. Gaffer: ${gaffer}. Build your XI. Sim the season. (NINETY)`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}

// 1080x1350 share card. Descriptive colors only, no logos.
export function drawShareCard(canvas, { displayName, w, d, l, pts, pos, overall, rows, gaffer }) {
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(1, '#05080f');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#d9ff3d';
  c.fillRect(0, 0, W, 10);
  c.fillStyle = '#d9ff3d';
  c.font = '700 34px system-ui';
  c.fillText('NINETY', 70, 90);
  c.fillStyle = '#9aa6b8';
  c.font = '500 28px system-ui';
  c.fillText('Build your XI. Sim the season.', 70, 130);
  c.fillStyle = '#f2f5f9';
  c.font = '800 120px system-ui';
  c.fillText(`${w}-${d}-${l}`, 70, 260);
  c.fillStyle = '#9aa6b8';
  c.font = '500 34px system-ui';
  c.fillText(`${pts} PTS · FINISHED ${pos}${ordinal(pos)} · OVR ${overall}`, 70, 315);
  c.font = '600 30px system-ui';
  c.fillStyle = '#f2f5f9';
  let y = 400;
  for (const r of rows.slice(0, 11)) {
    c.fillStyle = '#9aa6b8';
    c.fillText(r.slot, 70, y);
    c.fillStyle = '#f2f5f9';
    c.fillText(r.name.slice(0, 26), 190, y);
    c.fillStyle = '#d9ff3d';
    c.textAlign = 'right';
    c.fillText(String(r.rating), W - 70, y);
    c.textAlign = 'left';
    y += 62;
  }
  c.fillStyle = '#9aa6b8';
  c.font = '500 30px system-ui';
  c.fillText(`Gaffer: ${gaffer} · ${displayName || 'You'}`, 70, H - 70);
  return canvas.toDataURL('image/png');
}
