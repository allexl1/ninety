import { useEffect, useMemo, useState } from 'react';
import { Dices, RotateCcw } from 'lucide-react';
import { xiStrength } from '../engine/ratings.js';
import { wheel } from '../data/index.js';
import { createRng, picksToXI, primeMap } from '../game/draft.js';
import { slotsFor } from '../game/formations.js';
import { spinGaffer } from '../game/gaffers.js';
import { leagueField, preseasonOdds } from '../game/season.js';
import { Button } from '../ui/Button.jsx';
import { Card, Row } from '../ui/Card.jsx';
import { SkeletonGrid, Toast } from '../ui/Feedback.jsx';

const LINE_LABEL = { keeper: 'Keeper', defence: 'Defence', midfield: 'Midfield', attack: 'Attack' };

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function Gaffer({ run, onSimulate, onRestart }) {
  const primes = useMemo(() => primeMap(wheel.teams), []);
  const slots = useMemo(() => slotsFor(run.setup), [run.setup]);
  const [gaffer, setGaffer] = useState(run.gaffer ?? null);
  const [spun, setSpun] = useState(!!run.gaffer);
  const [step, setStep] = useState('gaffer');
  const [odds, setOdds] = useState(null);
  const [toast, setToast] = useState('');
  const activeGaffer = step === 'odds' ? gaffer : (gaffer ?? run.gaffer);
  const strength = useMemo(() => {
    const xi = picksToXI(run.picks, slots, run.setup.ratingMode, primes);
    const shape = run.setup.preset === 'custom'
      ? `${run.setup.custom.df}-${run.setup.custom.mf}-${run.setup.custom.fw}`
      : run.setup.preset;
    return { ...xiStrength(xi, shape, activeGaffer), shape };
  }, [run, slots, primes, activeGaffer]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const userOverall = strength.overall;
  const field = useMemo(() => leagueField([{ name: run.setup.displayName || 'YOU', overall: userOverall }]), [run.setup.displayName, userOverall]);

  useEffect(() => {
    if (step !== 'odds' || odds) return;
    const t = setTimeout(() => {
      try {
        setOdds(preseasonOdds(field.field, run.seed, 'YOU-1', userOverall, 400));
      } catch {
        setToast('Odds failed, simulating anyway');
        onSimulate({ ...run, gaffer }, field, null);
      }
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function spin() {
    const rng = createRng((run.seed ^ 0x51ab) >>> 0);
    // Avoid instant repeat of the same gaffer card feeling rigged: draw until different (max 8 tries).
    let g = spinGaffer(rng);
    for (let i = 0; i < 8 && gaffer && g.id === gaffer.id; i++) g = spinGaffer(rng);
    setGaffer(g);
    setSpun(true);
  }

  function cont(useGaffer) {
    setStep('odds');
    setGaffer(useGaffer ? gaffer : null);
    window.scrollTo(0, 0);
  }

  if (step === 'odds') {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="ny-accent text-xs font-bold tracking-[0.2em]">SQUAD COMPLETE</p>
        <h1 className="ny-display mt-1 text-3xl font-bold text-white">Here’s what the pundits make of it</h1>
        {!odds ? (
          <div className="mt-4"><SkeletonGrid n={3} /><p className="mt-2 text-sm text-slate-400" role="status">Simulating 400 seasons…</p></div>
        ) : (
          <>
            <Card className="mt-4 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm text-slate-400">PROJECTED FINISH</span>
                <span className="ny-num text-5xl font-bold text-white">{odds.projected}<span className="text-xl text-slate-500">{ordinal(odds.projected)}</span></span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm text-slate-400">EXPECTED POINTS</span>
                <span className="ny-num text-3xl font-bold ny-accent">{odds.expectedPts}</span>
              </div>
              <div className="mt-3">
                <Row left="Win the league" right={`${odds.title.toFixed(1)}%`} sub="Title" />
                <Row left="Top 4" right={`${odds.top4.toFixed(1)}%`} sub="Champions League" />
                <Row left="Top 6" right={`${odds.top6.toFixed(1)}%`} sub="Europe" />
                <Row left="Top 10" right={`${odds.top10.toFixed(1)}%`} sub="Respectability" />
                <Row left="Relegation" right={`${odds.relegated.toFixed(1)}%`} sub="Disaster" />
              </div>
              <p className="mt-3 text-xs text-slate-500">What an overall {userOverall.toFixed(0)} XI should produce over 400 simmed seasons. Simulate to see if you beat it.</p>
            </Card>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => onSimulate({ ...run, gaffer }, field, odds)} aria-label="Simulate season" className="flex-1 py-3 text-base">Simulate Season →</Button>
              <Button variant="ghost" onClick={onRestart} aria-label="Restart"><RotateCcw size={14} aria-hidden="true" /> Restart</Button>
            </div>
          </>
        )}
        <Toast msg={toast} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="ny-accent text-xs font-bold tracking-[0.2em]">XI COMPLETE · <span className="ny-num">{strength.overall.toFixed(1)}</span></p>
      <h1 className="ny-display mt-1 text-3xl font-bold text-white">Add a gaffer?</h1>
      <p className="mt-1 text-sm text-slate-400">A gaffer changes the style of your season, not your odds. One line gets +1. {field.replaced.length ? `You replace ${field.replaced.join(', ')}.` : ''}</p>

      <Card className="mt-4 p-5 text-center" aria-label="Gaffer spin" aria-live="polite">
        {!spun || !gaffer ? (
          <>
            <p className="text-sm text-slate-400">Optional. Random parody gaffer, tiny nudge, big quotes.</p>
            <Button onClick={spin} aria-label="Spin for a gaffer" className="mt-3 px-8 py-3"><Dices size={18} aria-hidden="true" /> Spin for a gaffer</Button>
          </>
        ) : (
          <>
            <p className="text-[11px] tracking-[0.2em] text-slate-400">YOUR GAFFER</p>
            <h2 className="ny-display mt-1 text-3xl font-bold ny-accent">{gaffer.name}</h2>
            <p className="text-sm font-semibold text-white">{gaffer.epithet}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">{gaffer.blurb}</p>
            <p className="ny-num mt-2 text-xs text-slate-300">+1 {LINE_LABEL[gaffer.line]}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="ghost" onClick={spin} aria-label="Re-spin gaffer">↻ Re-spin</Button>
            </div>
          </>
        )}
      </Card>

      <div className="mt-4 flex gap-2">
        <Button disabled={!spun} onClick={() => cont(true)} aria-label="Continue with gaffer" className="flex-1 py-3">Continue{gaffer ? ` with ${gaffer.name.split(' ').pop()}` : ''} →</Button>
        <Button variant="ghost" onClick={() => cont(false)} aria-label="No gaffer">No gaffer (classic)</Button>
      </div>
      <div className="mt-2"><Button variant="ghost" onClick={onRestart} aria-label="Restart"><RotateCcw size={14} aria-hidden="true" /> Restart run</Button></div>
      <Toast msg={toast} />
    </div>
  );
}
