import { useEffect, useMemo, useRef, useState } from 'react';
import { wheel } from '../data/index.js';
import { xiStrength } from '../engine/ratings.js';
import { createRng, filterWheel, picksToXI, primeMap, ratingFor, spinWheel } from '../game/draft.js';
import { slotsFor } from '../game/formations.js';
import { mergeScorers, mergeTables, simLeague } from '../game/season.js';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { Toast } from '../ui/Feedback.jsx';
import { Select } from '../ui/Modal.jsx';

const PACE = 800;

function tally(matches) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of matches) {
    if (m.res === 'W') w++;
    else if (m.res === 'D') d++;
    else l++;
    gf += m.gf; ga += m.ga;
  }
  return { w, d, l, pts: w * 3 + d, gf, ga, gd: gf - ga };
}

export default function Season({ run, field, odds, onFinish, onRestart }) {
  const primes = useMemo(() => primeMap(wheel.teams), []);
  const slots = useMemo(() => slotsFor(run.setup), [run.setup]);
  const rate = (p) => ratingFor(p, run.setup.ratingMode, primes);
  const blind = run.setup.blind;

  const [week, setWeek] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [january, setJanuary] = useState(null); // {swapped, outName, inName, newOverall}
  const [janSlot, setJanSlot] = useState('');
  const [janTeam, setJanTeam] = useState(null);
  const [toast, setToast] = useState('');
  const rngRef = useRef(null);
  if (!rngRef.current) rngRef.current = createRng((run.seed ^ 0x5ea50) >>> 0);

  // First half precomputed on mount; second half too when January is off.
  const half1 = useMemo(() => simLeague(field.field, run.seed, 'YOU-1', () => run.xi.overall, run.userSquad, { to: 19 }), [field, run]);
  const [half2, setHalf2] = useState(() => run.setup.january
    ? null
    : simLeague(field.field, (run.seed ^ 0x1a0) >>> 0, 'YOU-1', () => run.xi.overall, run.userSquad, { from: 20 }));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Auto-advance timer; pauses at the January break and at full time.
  useEffect(() => {
    if (!playing) return;
    if (week === 19 && run.setup.january && !january) { setPlaying(false); return; }
    if (week >= 38) { setPlaying(false); return; }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setWeek((w) => Math.min(38, w + 1)), reduced ? 60 : PACE);
    return () => clearTimeout(t);
  }, [playing, week, january, run.setup.january]);

  const allMatches = useMemo(() => {
    const h2 = half2 ? half2.userMatches : [];
    return [...half1.userMatches, ...h2].sort((a, b) => a.round - b.round);
  }, [half1, half2]);
  const revealed = allMatches.filter((m) => m.round <= week);
  const stats = tally(revealed);
  const pace = week > 0 ? Math.round((stats.pts / week) * 38) : 0;

  const scorers = useMemo(() => mergeScorers(half1.scorers, half2 ? half2.scorers : []), [half1, half2]);

  function decideJanuary(swapped, extra = {}, overall = null, squad = null) {
    const seed2 = (run.seed ^ (swapped ? 0x1a4 : 0x1a0)) >>> 0;
    const ov = overall ?? run.xi.overall;
    const sq = squad ?? run.userSquad;
    const h2 = simLeague(field.field, seed2, 'YOU-1', () => ov, sq, { from: 20 });
    setHalf2(h2);
    setJanuary({ swapped, ...extra });
    setJanTeam(null);
    setPlaying(true);
    window.scrollTo(0, 0);
  }

  function janSpin() {
    if (janSlot === '') { setToast('Choose which slot to gamble on first'); return; }
    const si = Number(janSlot);
    const code = slots[si];
    const taken = new Set(run.picks.filter(Boolean).map((p) => p.player.name));
    for (let tries = 0; tries < 25; tries++) {
      const pool = filterWheel(wheel.teams, run.setup.era);
      const team = spinWheel(pool, rngRef.current);
      const cands = team.players.filter((p) => p.pos.includes(code) && !taken.has(p.name));
      if (cands.length) {
        cands.sort((a, b) => ratingFor(b, run.setup.ratingMode, primes) - ratingFor(a, run.setup.ratingMode, primes));
        setJanTeam({ ...team, cands });
        return;
      }
    }
    setToast('No fitting punts anywhere — keep the faith');
  }

  function janPick(player) {
    const si = Number(janSlot);
    const picks = [...run.picks];
    const out = picks[si].player.name;
    picks[si] = { slotIndex: si, player, teamId: janTeam.id };
    const xi = picksToXI(picks, slots, run.setup.ratingMode, primes);
    const shape = run.setup.preset === 'custom'
      ? `${run.setup.custom.df}-${run.setup.custom.mf}-${run.setup.custom.fw}`
      : run.setup.preset;
    const s = xiStrength(xi, shape, run.gaffer);
    // Rebuild scorer entries for the new XI (ratings may differ).
    const newSquad = picks.filter(Boolean).map((pk) => ({
      name: pk.player.name,
      group: ({ GK: 'GK', RB: 'DEF', CB: 'DEF', LB: 'DEF', RWB: 'DEF', LWB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID', RW: 'FWD', LW: 'FWD', ST: 'FWD' })[slots[pk.slotIndex]],
      ovr: rate(pk.player),
    }));
    setToast(`${player.name} in for ${out} — new overall ${s.overall.toFixed(0)}`);
    decideJanuary(true, { outName: out, inName: player.name, newOverall: s.overall, newSquad, picks }, s.overall, newSquad);
  }

  const janOpen = week === 19 && run.setup.january && !january && half2 === null;
  const half1Pos = half1.standings.findIndex((t) => t.id === 'YOU-1') + 1;

  useEffect(() => {
    if (week === 38 && half2) {
      const t = setTimeout(() => {
        const standings = mergeTables(half1.standings, half2.standings);
        onFinish({ standings, userMatches: allMatches, scorers, january, halfTime: { pos: half1Pos, table: half1.standings } });
      }, 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, half2]);

  function skipAll() {
    if (week < 19 && run.setup.january && !january) {
      // Must pass through January: jump there, decide, then jump to the end.
      setWeek(19);
      setPlaying(false);
      return;
    }
    if (!half2) {
      // Safety net only — all real paths precompute half2 before skipping.
      const seed2 = (run.seed ^ 0x1a0) >>> 0;
      setHalf2(simLeague(field.field, seed2, 'YOU-1', () => run.xi.overall, run.userSquad, { from: 20 }));
    }
    setWeek(38);
    setPlaying(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="ny-display text-2xl font-bold text-white">
          MATCHWEEK <span className="ny-accent">{Math.max(week, 1)}</span> / 38
        </h1>
        <div className="flex gap-2">
          {week === 0 ? (
            <Button onClick={() => setPlaying(true)} aria-label="Kick off the season">Kick off →</Button>
          ) : week < 38 ? (
            <>
              <Button variant="ghost" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause reveal' : 'Resume reveal'}>{playing ? '❚❚ Pause' : '▶ Resume'}</Button>
              {week < 19 && <Button variant="ghost" onClick={() => { setWeek(19); setPlaying(false); }} aria-label="Skip to January">Skip to January →</Button>}
              <Button variant="ghost" onClick={skipAll} aria-label="Skip to end">Skip all →</Button>
            </>
          ) : null}
          <Button variant="ghost" onClick={onRestart} aria-label="Restart">↺</Button>
        </div>
      </header>

      <Card className="p-4" aria-label="Running record" aria-live="polite">
        <div className="ny-num text-center text-2xl font-bold text-white">
          {stats.w} WON · {stats.d} DRAWN · {stats.l} LOST
        </div>
        <div className="ny-num mt-1 text-center text-sm text-slate-300">
          {stats.pts} PTS · GF {stats.gf} · GA {stats.ga} · GD {stats.gd >= 0 ? '+' : ''}{stats.gd}
          {week >= 19 ? <span className="text-slate-500"> · halfway {half1Pos}th</span> : null}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Season progress" aria-valuenow={week} aria-valuemin={0} aria-valuemax={38}>
          <div className="ny-accent-bg h-full" style={{ width: `${(week / 38) * 100}%` }} />
        </div>
      </Card>

      {janOpen ? (
        <Card className="mt-3 border-white/20 p-5" aria-label="January transfer window">
          <p className="ny-accent text-xs font-bold tracking-[0.2em]">JANUARY TRANSFER WINDOW</p>
          <h2 className="ny-display mt-1 text-2xl font-bold text-white">Halfway there</h2>
          <p className="mt-1 text-sm text-slate-300">
            {stats.w}-{stats.d}-{stats.l}, {stats.pts} points, GD {stats.gd >= 0 ? '+' : ''}{stats.gd}. {stats.gf} scored, {stats.ga} conceded.
            On this pace: ~{pace} pts{oddsPace(odds, pace)}.
          </p>
          <p className="mt-1 text-xs text-slate-500">One optional swap from a fresh spin. No undo.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select label="Slot to gamble on" value={janSlot} onChange={(e) => { setJanSlot(e.target.value); setJanTeam(null); }}>
              <option value="">Pick a slot…</option>
              {run.picks.map((p, i) => p ? <option key={i} value={i}>{slots[i]} — {p.player.name}{blind ? '' : ` (${rate(p.player)})`}</option> : null)}
            </Select>
            <Button variant="ghost" onClick={janSpin} aria-label="Spin for January option" className="self-end">🎰 Spin</Button>
          </div>
          {janTeam ? (
            <div className="mt-3">
              <p className="text-sm text-white">{janTeam.club} <span className="text-slate-400">{janTeam.season}</span> — fits {slots[Number(janSlot)]}:</p>
              <div className="ny-grid mt-2">
                {janTeam.cands.slice(0, 6).map((p) => (
                  <button key={p.name} type="button" onClick={() => janPick(p)}
                    aria-label={`Sign ${p.name} for ${slots[Number(janSlot)]}`}
                    className="ny-focus glass glass-hover p-3 text-left">
                    <div className="ny-num text-xl font-bold ny-accent">{blind ? '?' : ratingFor(p, run.setup.ratingMode, primes)}</div>
                    <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.pos.join('/')} · {p.nation}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={() => decideJanuary(false, {})} aria-label="Stick with your XI">Stick with your XI</Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-3 grid gap-2" aria-label="Matchweek feed" aria-live="off">
        {[...revealed].reverse().map((m) => (
          <Card key={m.round} className="cv p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-500">GW{m.round}</span>
              <span className={`ny-num text-lg font-bold ${m.res === 'W' ? 'text-emerald-300' : m.res === 'L' ? 'text-red-300' : 'text-slate-300'}`}>
                {m.res} {m.opp} ({m.home ? 'H' : 'A'}) {m.gf}–{m.ga}
              </span>
            </div>
            {m.scorers.length ? (
              <p className="mt-1 text-sm text-slate-300">
                {m.scorers.map((s) => `⚽ ${s.name} ${s.minute}`).join('  ')}
              </p>
            ) : null}
          </Card>
        ))}
        {week === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-400">Press Kick off — results appear here, latest first, never spoiled ahead.</Card>
        ) : null}
      </div>
      <Toast msg={toast} />
    </div>
  );
}

function oddsPace(odds, pace) {
  if (!odds) return '';
  if (pace >= odds.expectedPts + 8) return ', flying above projection';
  if (pace <= odds.expectedPts - 8) return ', below projection';
  return ', about as expected';
}
