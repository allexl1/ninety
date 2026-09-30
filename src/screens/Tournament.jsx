import { useEffect, useMemo, useState } from 'react';
import { playTournament } from '../game/tournament.js';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { Toast } from '../ui/Feedback.jsx';

function Tie({ tie, winnerName }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className={tie.home === winnerName ? 'font-bold text-white' : 'text-slate-300'}>{tie.home}</span>
        <span className="ny-num font-bold text-white">{tie.hg}–{tie.ag}{tie.pens ? <span className="text-xs text-slate-400"> ({tie.pens.h}–{tie.pens.a} pens)</span> : null}</span>
        <span className={tie.away === winnerName ? 'font-bold text-white' : 'text-slate-300'}>{tie.away}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">{tie.stage}</p>
    </div>
  );
}

export default function Tournament({ run, standings, label, onDone, onRestart, onHome, onNew }) {
  const tourney = useMemo(
    () => playTournament(standings, 'YOU-1', (run.seed ^ 0xe020) >>> 0, run.xi.overall, run.userSquad, label),
    [standings, run, label],
  );
  const [phase, setPhase] = useState('draw');
  const [md, setMd] = useState(0);
  const [ko, setKo] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const nameById = useMemo(() => {
    const m = new Map();
    for (const g of tourney.groups) for (const t of g.teams) m.set(t.id, t.name);
    return m;
  }, [tourney]);

  // Auto-advance: draw -> 3 group MDs -> qf/sf/f -> done.
  useEffect(() => {
    if (!playing) return;
    if (phase === 'done') { setPlaying(false); return; }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => {
      if (phase === 'draw') setPhase('groups');
      else if (phase === 'groups' && md < 3) setMd(md + 1);
      else if (phase === 'groups') { setPhase('ko'); setKo(1); }
      else if (phase === 'ko' && ko < 3) setKo(ko + 1);
      else if (phase === 'ko') setPhase('done');
    }, reduced ? 80 : 1100);
    return () => clearTimeout(t);
  }, [playing, phase, md, ko]);

  const groupFeed = tourney.userMatches.filter((m) => m.stage.startsWith('Group') && Number(m.stage.slice(-1)) <= md);
  const isChamp = tourney.winnerId === 'YOU-1';
  const showQF = phase === 'done' || (phase === 'ko' && ko >= 1);
  const showSF = phase === 'done' || (phase === 'ko' && ko >= 2);
  const showF = phase === 'done' || (phase === 'ko' && ko >= 3);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => onDone(tourney), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="ny-accent text-xs font-bold tracking-[0.2em]">{label.toUpperCase()}</p>
          <h1 className="ny-display text-2xl font-bold text-white">
            {phase === 'draw' ? 'The draw' : phase === 'groups' ? `Group stage · MD${Math.max(md, 1)}/3` : phase === 'ko' ? 'Knockouts' : isChamp ? 'Champions' : 'Out'}
          </h1>
        </div>
        <div className="flex gap-2">
          {phase === 'draw' ? (
            <Button onClick={() => setPlaying(true)} aria-label="Kick off">Kick off</Button>
          ) : phase !== 'done' ? (
            <>
              <Button variant="ghost" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Resume'}>{playing ? 'Pause' : 'Resume'}</Button>
              <Button variant="ghost" onClick={() => { setPhase('done'); setPlaying(false); }} aria-label="Skip to result">Skip to result</Button>
            </>
          ) : null}
          <Button variant="ghost" onClick={onRestart} aria-label="Restart">Restart</Button>
        </div>
      </header>

      {(phase === 'groups' || phase === 'ko' || phase === 'done') && (
        <section aria-label="Groups" className="grid gap-3 sm:grid-cols-2">
          {tourney.groups.map((g) => (
            <Card key={g.name} className="cv p-3">
              <h2 className="text-xs font-bold tracking-[0.2em] text-slate-400">GROUP {g.name}</h2>
              <div className="ny-num mt-1 text-sm">
                {g.table.map((t, i) => (
                  <div key={t.id} className={`flex justify-between border-t border-white/5 py-1 ${t.id === 'YOU-1' ? 'ny-accent font-bold' : i < 2 ? 'text-white' : 'text-slate-500'}`}>
                    <span>{t.name}</span><span>{t.p}pts · {t.gd >= 0 ? '+' : ''}{t.gd}</span>
                  </div>
                ))}
              </div>
              {groupFeed.filter((m) => m.stage.includes(`Group ${g.name}`)).map((m, i) => (
                <p key={i} className="mt-1 text-xs text-slate-300">
                  <span className={m.res === 'W' ? 'text-emerald-300' : m.res === 'L' ? 'text-red-300' : 'text-slate-400'}>{m.res}</span> vs {m.opp} {m.gf}–{m.ga}
                  {m.scorers.length ? ` (${m.scorers.map((s) => `${s.name} ${s.minute}`).join(', ')})` : ''}
                </p>
              ))}
            </Card>
          ))}
        </section>
      )}

      {phase === 'draw' && (
        <section aria-label="Draw" className="grid gap-3 sm:grid-cols-2">
          {tourney.groups.map((g) => (
            <Card key={g.name} className="cv p-3">
              <h2 className="text-xs font-bold tracking-[0.2em] text-slate-400">GROUP {g.name}</h2>
              {g.teams.map((t) => (
                <p key={t.id} className={`text-sm ${t.id === 'YOU-1' ? 'ny-accent font-bold' : 'text-slate-300'}`}>{t.name} <span className="ny-num text-xs text-slate-500">{Math.round(t.overall)}</span></p>
              ))}
            </Card>
          ))}
        </section>
      )}

      {(phase === 'ko' || phase === 'done') && (
        <section aria-label="Bracket" className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            ['Quarter-finals', tourney.bracket.qf, showQF],
            ['Semi-finals', tourney.bracket.sf, showSF],
            ['Final', [tourney.bracket.f], showF],
          ].map(([title, ties, show]) => show ? (
            <div key={title}>
              <h2 className="mb-1 text-xs font-bold tracking-[0.2em] text-slate-400">{title.toUpperCase()}</h2>
              <div className="grid gap-2">
                {ties.map((t, i) => <Tie key={i} tie={t} winnerName={nameById.get(t.winnerId)} />)}
              </div>
            </div>
          ) : null)}
        </section>
      )}

      {phase === 'done' && (
        <Card className="mt-3 p-5 text-center" aria-label="Tournament result" aria-live="polite">
          {isChamp ? (
            <>
              <p className="ny-accent text-xs font-bold tracking-[0.2em]">CHAMPIONS OF EUROPE</p>
              <h2 className="ny-display mt-1 text-3xl font-bold text-white">{run.setup.displayName || 'You'} lift the {label}</h2>
              <p className="mt-1 text-sm text-slate-400">Beat {tourney.bracket.f.home === (run.setup.displayName || 'YOU') ? tourney.bracket.f.away : tourney.bracket.f.home} in the final{tourney.bracket.f.pens ? ' on penalties' : ''}.</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold tracking-[0.2em] text-slate-400">KNOCKED OUT · {tourney.userOut.toUpperCase()}</p>
              <h2 className="ny-display mt-1 text-3xl font-bold text-white">{tourney.winner} take it</h2>
              <p className="mt-1 text-sm text-slate-400">Your XI go home. The league finish stays on the record.</p>
            </>
          )}
          <div className="mt-3 flex justify-center gap-2">
            <Button onClick={onNew} aria-label="New draft">New draft</Button>
            <Button variant="ghost" onClick={onHome} aria-label="Home">Home</Button>
          </div>
        </Card>
      )}
      <Toast msg={toast} />
    </div>
  );
}
