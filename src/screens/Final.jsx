import { useRef, useState } from 'react';
import { europeSpot } from '../game/season.js';
import { captionText, drawShareCard, encodeShare } from '../game/share.js';
import { Button } from '../ui/Button.jsx';
import { Card, Row } from '../ui/Card.jsx';
import { EmptyState, Toast } from '../ui/Feedback.jsx';

function lineWord(v) {
  if (v >= 86) return 'Strong';
  if (v >= 80) return 'Solid';
  if (v >= 75) return 'Modest';
  return 'Shaky';
}

function verdict(pos, projected) {
  const d = projected - pos;
  if (d === 0) return { tag: 'TO THE LETTER', line: `Finished ${pos}${ordinal(pos)} — exactly what the projections said.` };
  if (d > 0) return { tag: 'ABOVE THE SCRIPT', line: `Finished ${pos}${ordinal(pos)} vs projected ${projected}${ordinal(projected)} — the XI beat the model.` };
  return { tag: 'BELOW THE SCRIPT', line: `Finished ${pos}${ordinal(pos)} vs projected ${projected}${ordinal(projected)} — the model wins this one.` };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

async function copyText(text, ok) {
  try {
    await navigator.clipboard.writeText(text);
    ok();
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok(); } catch { /* ignore */ }
    ta.remove();
  }
}

export default function Final({ data, onHome, onNew, onRestart, readOnly = false }) {
  const { setup, picks, slots, gaffer, xi, standings, userMatches, scorers, january, odds } = data;
  const [toast, setToast] = useState('');
  const canvasRef = useRef(null);
  const me = setup.displayName || 'You';
  const youRow = standings.find((t) => t.id === 'YOU-1');
  if (!youRow) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon="🔗"
          title="Broken share link"
          description="That link doesn't decode to a season. Ask your mate to copy it again."
          action={<Button onClick={onHome} aria-label="Home">Home</Button>}
        />
      </div>
    );
  }
  const pos = standings.findIndex((t) => t.id === 'YOU-1') + 1;
  const euro = europeSpot(pos);
  const v = verdict(pos, odds?.projected ?? pos);
  const boot = scorers[0] ?? null;
  const potm = [...scorers].sort((a, b) => (b.g + b.a) - (a.g + a.a))[0] ?? null;
  const best = [...(userMatches ?? [])].filter((m) => m.res === 'W').sort((a, b) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)[0] ?? null;
  const topLine = ['attack', 'midfield', 'defence', 'keeper'].reduce((a, b) => (xi[a] >= xi[b] ? a : b));

  const say = (m) => setToast(m) && setTimeout(() => setToast(''), 2600);

  function sharePayload() {
    return {
      v: 1,
      setup: { preset: setup.preset, custom: setup.custom, ratingMode: setup.ratingMode, blind: setup.blind, january: setup.january, name: setup.displayName },
      picks: picks.filter(Boolean).map((p) => ({ s: p.slotIndex, c: slots[p.slotIndex], t: p.teamId, n: p.player.name, r: setup.blind ? null : p.player.rating })),
      g: gaffer ? { id: gaffer.id, name: gaffer.name } : null,
      j: january ? { s: !!january.swapped, o: january.outName ?? null, i: january.inName ?? null } : null,
      res: { w: youRow.w, d: youRow.d, l: youRow.l, pts: youRow.p, pos, proj: odds?.projected ?? pos, ov: +xi.overall.toFixed(1) },
      sc: scorers.slice(0, 5).map((s) => ({ n: s.name, g: s.g, a: s.a })),
      st: standings.map((t) => ({ n: t.name, p: t.p, w: t.w, d: t.d, l: t.l, gf: t.gf, ga: t.ga })),
    };
  }

  function doCaption() {
    copyText(captionText({
      displayName: me, w: youRow.w, d: youRow.d, l: youRow.l, pts: youRow.p, pos,
      projected: odds?.projected ?? pos, overall: xi.overall.toFixed(0),
      topScorer: boot ? `${boot.name} (${boot.g})` : '—', gaffer: gaffer?.name ?? 'none',
    }), () => say('Caption copied'));
  }

  function doLink() {
    const url = `${window.location.origin}${window.location.pathname}${encodeShare(sharePayload())}`;
    copyText(url, () => say('Share link copied'));
  }

  function doImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawShareCard(canvas, {
      displayName: me, w: youRow.w, d: youRow.d, l: youRow.l, pts: youRow.p, pos,
      overall: xi.overall.toFixed(0),
      rows: picks.filter(Boolean).map((p) => ({ slot: slots[p.slotIndex], name: p.player.name, rating: setup.blind ? '?' : p.player.rating })),
      gaffer: gaffer?.name ?? 'No gaffer',
    });
    const a = document.createElement('a');
    a.download = `ninety-${youRow.w}-${youRow.d}-${youRow.l}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    say('Image saved');
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="ny-accent text-xs font-bold tracking-[0.2em]">FULL TIME · 38 PLAYED</p>
      <h1 className="ny-display mt-1 text-4xl font-bold text-white">
        {me} finish{me === 'You' ? '' : 'es'} <span className="ny-accent">{pos}{ordinal(pos)}</span>
      </h1>
      <p className="ny-num mt-1 text-xl text-slate-300">{youRow.w}-{youRow.d}-{youRow.l} · {youRow.p} PTS · GD {youRow.gd >= 0 ? '+' : ''}{youRow.gd}</p>

      <Card className="mt-4 p-5">
        <p className="ny-accent text-xs font-bold tracking-[0.2em]">{v.tag}</p>
        <p className="mt-1 text-sm text-slate-300">{v.line}</p>
        <div className="mt-3">
          <Row left="Attack" right={lineWord(xi.attack)} sub={`${xi.attack.toFixed(0)} — ${topLine === 'attack' ? 'carried the team' : 'did the job'}`} />
          <Row left="Midfield" right={lineWord(xi.midfield)} sub={`${xi.midfield.toFixed(0)} — ${topLine === 'midfield' ? 'carried the team' : 'did the job'}`} />
          <Row left="Defence" right={lineWord(xi.defence)} sub={`${xi.defence.toFixed(0)} — ${topLine === 'defence' ? 'carried the team' : 'did the job'}`} />
          <Row left="Keeper" right={lineWord(xi.keeper)} sub={`${xi.keeper.toFixed(0)} — ${topLine === 'keeper' ? 'carried the team' : 'did the job'}`} />
        </div>
      </Card>

      {euro && !readOnly ? (
        <Card className="mt-3 border-white/20 p-4">
          <p className="ny-accent text-xs font-bold tracking-[0.2em]">EUROPE QUALIFIED · {euro.code}</p>
          <p className="mt-1 text-sm text-slate-300">{pos}{ordinal(pos)} takes {me === 'You' ? 'your' : `${me}'s`} XI into the {euro.label}. The tournament itself lands in P4 — same XI carries over.</p>
        </Card>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-[11px] tracking-[0.2em] text-slate-400">🥇 GOLDEN BOOT</p>
          <p className="mt-1 text-lg font-bold text-white">{boot ? boot.name : '—'}</p>
          <p className="ny-num text-sm text-slate-400">{boot ? `${boot.g} goals` : ''}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] tracking-[0.2em] text-slate-400">🏆 PLAYER OF THE SEASON</p>
          <p className="mt-1 text-lg font-bold text-white">{potm ? potm.name : '—'}</p>
          <p className="ny-num text-sm text-slate-400">{potm ? `${potm.g}G · ${potm.a}A` : ''}</p>
        </Card>
      </div>

      <Card className="mt-3 p-4" aria-label="Season story">
        <p className="text-[11px] tracking-[0.2em] text-slate-400">THE STORY</p>
        <ul className="mt-1 space-y-1 text-sm text-slate-300">
          {best ? <li>Best afternoon: {best.gf}–{best.ga} vs {best.opp} (GW{best.round}).</li> : youRow.w > 0 ? <li>{youRow.w} wins sealed {pos}{ordinal(pos)} — the full match log lives in-app.</li> : <li>No wins. We don’t talk about this season.</li>}
          {boot ? <li>{boot.name} carried the scoring with {boot.g} goals.</li> : null}
          {january ? <li>{january.swapped ? `${january.inName} arrived for ${january.outName} in January — no undo, no regrets (probably).` : 'No January business. Backed the XI to the end.'}</li> : null}
          {gaffer ? <li>{gaffer.name} brought {gaffer.epithet.toLowerCase()}.</li> : null}
        </ul>
      </Card>

      <Card className="mt-3 p-4" aria-label="Final table">
        <p className="text-[11px] tracking-[0.2em] text-slate-400">FINAL TABLE</p>
        <div className="ny-num mt-1 text-sm">
          {standings.map((t, i) => (
            <div key={t.id ?? t.n} className={`flex items-center justify-between border-t border-white/5 py-1.5 ${t.id === 'YOU-1' || t.n === me ? 'ny-accent font-bold' : 'text-slate-300'}`}>
              <span className="w-8 text-slate-500">{i + 1}</span>
              <span className="flex-1 truncate">{t.name ?? t.n}</span>
              <span className="w-10 text-right">{t.p}</span>
              <span className="hidden w-24 text-right text-xs text-slate-500 sm:inline">{t.w}-{t.d}-{t.l} · {t.gd >= 0 ? '+' : ''}{t.gd}</span>
            </div>
          ))}
        </div>
      </Card>

      {!readOnly ? (
        <Card className="mt-3 p-4" aria-label="Share">
          <p className="text-[11px] tracking-[0.2em] text-slate-400">SHARE YOUR SEASON</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={doCaption} aria-label="Copy caption">📋 Copy caption</Button>
            <Button variant="ghost" onClick={doImage} aria-label="Save image">💾 Save image</Button>
            <Button variant="ghost" onClick={doLink} aria-label="Copy link">🔗 Copy link</Button>
          </div>
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={onNew} aria-label="New draft">New draft</Button>
            <Button variant="ghost" onClick={onHome} aria-label="Home">Home</Button>
            <Button variant="ghost" onClick={onRestart} aria-label="Restart">↺</Button>
          </div>
        </Card>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button onClick={onNew} aria-label="Build your own XI">Build your own XI</Button>
          <Button variant="ghost" onClick={onHome} aria-label="Home">Home</Button>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-600">NINETY · ratings are an editorial FC-scale snapshot, not affiliated with EA, UEFA or the Premier League · no logos/photos shipped</p>
      <Toast msg={toast} />
    </div>
  );
}

export function ShareView({ payload, onHome, onNew }) {
  // Reconstruct a display-only Final from the hash payload (self-contained).
  const setup = { preset: payload.setup.preset, custom: payload.setup.custom, ratingMode: payload.setup.ratingMode, blind: payload.setup.blind, january: payload.setup.january, displayName: payload.setup.name ?? '' };
  const slots = Array(11).fill('?');
  const picks = payload.picks.map((p) => {
    slots[p.s] = p.c;
    return { slotIndex: p.s, teamId: p.t, player: { name: p.n, rating: p.r ?? '?', pos: [p.c], nation: '' } };
  });
  const ov = payload.res.ov;
  const standings = payload.st.map((t, i) => ({ id: `s${i}`, name: t.n, p: t.p, w: t.w, d: t.d, l: t.l, gf: t.gf, ga: t.ga, gd: t.gf - t.ga }));
  const youIdx = standings.findIndex((t) => t.p === payload.res.pts);
  if (youIdx >= 0) standings[youIdx].id = 'YOU-1';
  const data = {
    setup,
    picks,
    slots,
    gaffer: payload.g ? { id: payload.g.id, name: payload.g.name, epithet: '', blurb: '' } : null,
    xi: { overall: ov, attack: ov, midfield: ov, defence: ov, keeper: ov },
    standings,
    userMatches: [],
    scorers: payload.sc.map((s) => ({ name: s.n, g: s.g, a: s.a })),
    january: payload.j ? { swapped: !!payload.j.s, outName: payload.j.o ?? null, inName: payload.j.i ?? null } : null,
    odds: { projected: payload.res.proj },
  };
  return <Final data={data} onHome={onHome} onNew={onNew} onRestart={onHome} readOnly />;
}
