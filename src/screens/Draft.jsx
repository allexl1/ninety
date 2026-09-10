import { useEffect, useMemo, useRef, useState } from 'react';
import { xiStrength } from '../engine/ratings.js';
import { wheel } from '../data/index.js';
import { buildCustom, PRESETS, SLOT_LINE } from '../game/formations.js';
import { createRng, availableSquad, eligibleSlots, filterWheel, picksToXI, primeMap, ratingFor, spinWheel, squadHasMove } from '../game/draft.js';
import { Button } from '../ui/Button.jsx';
import { Card, Row } from '../ui/Card.jsx';
import { Toast } from '../ui/Feedback.jsx';
import { SegmentedControl } from '../ui/Modal.jsx';

const SLOT_NAMES = { GK: 'Goalkeeper', RB: 'Right Back', CB: 'Centre Back', LB: 'Left Back', RWB: 'Right Wing-Back', LWB: 'Left Wing-Back', CDM: 'Holding Mid', CM: 'Central Mid', CAM: 'Attacking Mid', RM: 'Right Mid', LM: 'Left Mid', RW: 'Right Wing', LW: 'Left Wing', ST: 'Striker' };
const LINE_CLASS = { keeper: 'text-amber-300', defenders: 'text-sky-300', midfielders: 'text-emerald-300', attackers: 'text-red-300' };

function surname(name) {
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

export default function Draft({ run: initialRun, onUpdate, onComplete, onRestart }) {
  const [run, setRun] = useState(initialRun);
  const [sort, setSort] = useState('rating');
  const [moveFrom, setMoveFrom] = useState(null);
  const [toast, setToast] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [spinLabel, setSpinLabel] = useState('');
  const [rng] = useState(() => {
    const r = createRng(initialRun.seed);
    // Resumed runs: fast-forward past already-consumed draws (one per spun team).
    for (let i = 0; i < (initialRun.spun?.length ?? 0); i++) r();
    return r;
  });
  const spinFnRef = useRef(null);

  const primes = useMemo(() => primeMap(wheel.teams), []);
  const slots = useMemo(() => {
    if (run.setup.preset !== 'custom') return PRESETS.find((p) => p.shape === run.setup.preset).slots;
    return buildCustom(run.setup.custom).slots;
  }, [run.setup]);
  const shape = useMemo(() => {
    const out = slots.filter((s) => s !== 'GK');
    const c = (l) => out.filter((s) => SLOT_LINE[s] === l).length;
    return `${c('defenders')}-${c('midfielders')}-${c('attackers')}`;
  }, [slots]);

  const { blind, ratingMode, draftMode } = run.setup;
  const rate = (p) => (blind ? '?' : ratingFor(p, ratingMode, primes));
  const filled = run.picks.filter(Boolean).length;
  const openIdx = run.picks.map((p, i) => (p ? null : i)).filter((i) => i !== null);

  const strength = useMemo(() => {
    const xi = picksToXI(run.picks, slots, ratingMode, primes);
    return xiStrength(xi, shape, run.gaffer);
  }, [run.picks, slots, shape, ratingMode, primes, run.gaffer]);

  useEffect(() => { onUpdate(run); }, [run, onUpdate]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Space to spin, Esc to cancel selection/move
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && !run.currentTeam && run.phase === 'draft' && !spinning && filled < 11) {
        e.preventDefault();
        spinFnRef.current?.();
      }
      if (e.key === 'Escape') {
        setRun((r) => ({ ...r, selectedPlayer: null }));
        setMoveFrom(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function drawTeam(excludeIds) {
    const pool = filterWheel(wheel.teams, run.setup.era).filter((t) => !excludeIds.includes(t.id));
    const list = pool.length ? pool : filterWheel(wheel.teams, run.setup.era);
    return spinWheel(list, rng);
  }

  function doSpin() {
    if (spinning || filled >= 11) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const finish = (team) => {
      // Position-first: squad must fit the target slot; squad-first: any open slot.
      // Drafted names are off the table everywhere (no-repeat players).
      const need = draftMode === 'position' && run.targetSlot !== null
        ? [slots[run.targetSlot]]
        : openIdx.map((i) => slots[i]);
      const avail = availableSquad(team.players, run.picks);
      if (!avail.length || !squadHasMove(avail, need)) {
        setRun((r) => ({ ...r, freeSpinsUsed: r.freeSpinsUsed + 1 }));
        setToast(draftMode === 'position' ? `Nobody fits ${slots[run.targetSlot]} — free re-spin` : 'Nobody fits an open slot — free re-spin');
        setSpinning(false);
        setTimeout(() => spinFnRef.current?.(), 350);
        return;
      }
      setRun((r) => ({ ...r, currentTeam: team, spun: [...r.spun, team.id], selectedPlayer: null }));
      setSpinning(false);
    };
    if (reduced) {
      finish(drawTeam(run.spun.concat(run.currentTeam ? [run.currentTeam.id] : [])));
      return;
    }
    setSpinning(true);
    const pool = filterWheel(wheel.teams, run.setup.era);
    let ticks = 0;
    const iv = setInterval(() => {
      setSpinLabel(pool[Math.floor(Math.random() * pool.length)]?.club ?? '');
      if (++ticks > 9) {
        clearInterval(iv);
        setSpinLabel('');
        finish(drawTeam(run.spun.concat(run.currentTeam ? [run.currentTeam.id] : [])));
      }
    }, 70);
  }
  useEffect(() => { spinFnRef.current = doSpin; });

  function reroll() {
    if (run.rerollsLeft <= 0) { setToast('No rerolls left — make it count'); return; }
    setRun((r) => ({ ...r, rerollsLeft: r.rerollsLeft - 1 }));
    setTimeout(() => spinFnRef.current?.(), 50);
  }

  function sortedSquad() {
    if (!run.currentTeam) return [];
    let list = availableSquad(run.currentTeam.players, run.picks).map((p) => ({ ...p, shown: rate(p) }));
    if (draftMode === 'position' && run.targetSlot !== null) {
      const code = slots[run.targetSlot];
      list = list.filter((p) => p.pos.includes(code));
    }
    if (sort === 'rating' && !blind) list.sort((a, b) => b.shown - a.shown);
    else if (sort === 'position') list.sort((a, b) => a.pos[0].localeCompare(b.pos[0]));
    else list.sort((a, b) => surname(a.name).localeCompare(surname(b.name)));
    return list;
  }

  function place(player, slotIndex) {
    const code = slots[slotIndex];
    if (run.picks[slotIndex] || !player.pos.includes(code)) {
      setToast(`Can't play there — ${player.name} covers ${player.pos.join('/')}`);
      return;
    }
    const picks = [...run.picks];
    picks[slotIndex] = { slotIndex, player, teamId: run.currentTeam.id };
    const done = picks.every(Boolean);
    setRun((r) => ({ ...r, picks, currentTeam: null, selectedPlayer: null, targetSlot: null, phase: done ? 'done' : 'draft' }));
    if (done) setTimeout(() => onComplete({ ...run, picks, phase: 'done' }), 350);
  }

  function moveTo(slotIndex) {
    if (moveFrom === null) return;
    const pick = run.picks[moveFrom];
    if (!pick || run.picks[slotIndex] || !pick.player.pos.includes(slots[slotIndex])) {
      setToast(`Can't play there`);
      setMoveFrom(null);
      return;
    }
    const picks = [...run.picks];
    picks[moveFrom] = null;
    picks[slotIndex] = { ...pick, slotIndex };
    setRun((r) => ({ ...r, picks }));
    setMoveFrom(null);
    setToast(`${pick.player.name} moved to ${slots[slotIndex]}`);
  }

  const squad = sortedSquad();
  const sel = run.currentTeam?.players.find((p) => p.name === run.selectedPlayer) ?? null;
  const placeOptions = sel ? eligibleSlots(sel, openIdx.map((i) => slots[i])).map((code) => openIdx.find((i) => slots[i] === code && !run.picks[i])).filter((i) => i !== undefined) : [];

  const lines = [
    ['attackers', 'Attack', strength.attack],
    ['midfielders', 'Midfield', strength.midfield],
    ['defenders', 'Defence', strength.defence],
    ['keeper', 'Keeper', strength.keeper],
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-300">
          <strong className="ny-display text-lg text-white">{shape}</strong>
          <span className="ml-2 text-slate-500">locked · restart to change</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="ny-num text-slate-300" aria-live="polite">Rerolls: {run.rerollsLeft}/{run.setup.rerolls}</span>
          <span className="ny-num text-slate-500">{filled}/11</span>
          <Button variant="ghost" onClick={onRestart} aria-label="Restart run">↺ Restart</Button>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        {/* Pitch + ratings */}
        <div>
          <Card className="cv p-3" aria-label="Pitch view">
            {['attackers', 'midfielders', 'defenders', 'keeper'].map((line) => (
              <div key={line} className="flex min-h-16 flex-wrap items-center justify-center gap-2 border-b border-white/5 py-2 last:border-0">
                {slots.map((code, i) => SLOT_LINE[code] !== line ? null : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (moveFrom !== null) { moveTo(i); return; }
                      if (run.picks[i]) { setMoveFrom(i); setToast(`${run.picks[i].player.name} armed — click an open eligible slot`); return; }
                      if (draftMode === 'position' && !run.picks[i]) setRun((r) => ({ ...r, targetSlot: i, selectedPlayer: null }));
                    }}
                    aria-label={run.picks[i] ? `${run.picks[i].player.name}, ${code}. Select to move.` : `${code} ${SLOT_NAMES[code]}${draftMode === 'position' ? '. Select as draft target.' : ', empty'}`}
                    aria-pressed={draftMode === 'position' && run.targetSlot === i}
                    className={`ny-focus flex h-14 w-14 flex-col items-center justify-center rounded-full border text-[11px] transition-transform hover:scale-105 ${
                      run.picks[i]
                        ? moveFrom === i ? 'ny-accent-bg border-transparent font-bold' : 'border-white/20 bg-white/10 text-white'
                        : draftMode === 'position' && run.targetSlot === i
                          ? 'ny-accent-bg border-transparent font-bold'
                          : 'border-dashed border-white/20 text-slate-400'
                    }`}
                  >
                    {run.picks[i] ? (
                      <>
                        <span className="ny-num text-sm font-bold">{blind ? '?' : ratingFor(run.picks[i].player, ratingMode, primes)}</span>
                        <span className="max-w-12 truncate text-[9px]">{surname(run.picks[i].player.name)}</span>
                      </>
                    ) : <span className="font-bold">{code}</span>}
                  </button>
                ))}
              </div>
            ))}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500" aria-hidden="true">
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />Keeper</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-300" />Defence</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-300" />Midfield</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-300" />Attack</span>
            </div>
          </Card>

          <Card className="cv mt-3 p-4" aria-label="Live ratings" aria-live="polite">
            <div className="flex items-baseline justify-between">
              <span className="text-xs tracking-[0.2em] text-slate-400">OVERALL</span>
              <span className="ny-num text-4xl font-bold text-white">{blind ? '?' : strength.overall.toFixed(0)}</span>
            </div>
            {lines.map(([line, label, v]) => (
              <div key={line} className="mt-2">
                <div className="flex justify-between text-xs"><span className={LINE_CLASS[line]}>{label}</span><span className="ny-num text-slate-300">{blind ? '?' : v.toFixed(0)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-white/60" style={{ width: blind ? '0%' : `${Math.min(100, v)}%` }} />
                </div>
              </div>
            ))}
            <Button variant="ghost" className="mt-3 w-full" onClick={() => (moveFrom !== null ? setMoveFrom(null) : setToast('Click a placed player, then an open eligible slot'))} aria-label="Move a player">
              ⇄ {moveFrom !== null ? 'Cancel move' : 'Move a player'}
            </Button>
            {moveFrom !== null ? <p className="mt-1 text-xs text-slate-400">Moving {run.picks[moveFrom]?.player.name} — click an open eligible slot.</p> : null}
          </Card>
        </div>

        {/* Wheel / squad column */}
        <div>
          {!run.currentTeam ? (
            <Card className="cv flex flex-col items-center gap-2 p-8 text-center">
              <p className="text-xs tracking-[0.2em] text-slate-400">CLUB × SEASON</p>
              <h2 className="ny-display text-2xl font-bold text-white">
                {filled >= 11 ? 'XI complete' : draftMode === 'position' && run.targetSlot !== null ? `Spin for a ${slots[run.targetSlot]}` : `${11 - filled} to fill — spin the wheel`}
              </h2>
              {draftMode === 'position' && run.targetSlot === null && filled < 11 ? (
                <p className="text-sm text-slate-400">Pick a slot on the pitch first, then spin for a club to fill it.</p>
              ) : null}
              {filled < 11 ? (
                <Button onClick={() => spinFnRef.current?.()} disabled={spinning || (draftMode === 'position' && run.targetSlot === null)} aria-label="Spin the wheel" className="px-8 py-3 text-base">
                  {spinning ? spinLabel || '…' : '🎰 Spin the Wheel'}
                </Button>
              ) : null}
              {!spinning ? <p className="text-xs text-slate-500">or press Space</p> : null}
            </Card>
          ) : (
            <div>
              <Card className="cv p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] tracking-[0.2em] text-slate-400">SQUAD SPUN · {ratingMode === 'prime' ? 'PRIME' : 'SEASON'}</p>
                    <h2 className="ny-display text-2xl font-bold text-white">{run.currentTeam.club} <span className="text-slate-400">{run.currentTeam.season}</span></h2>
                  </div>
                  <Button variant="ghost" onClick={reroll} disabled={run.rerollsLeft <= 0} aria-label={`Re-roll squad, ${run.rerollsLeft} left`}>
                    🔄 Re-roll ({run.rerollsLeft} left)
                  </Button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {draftMode === 'squad' ? 'Pick any player, then choose which open slot to fill.' : `Only ${slots[run.targetSlot]}-eligible players shown.`}
                  {run.currentTeam.players.length !== squad.length ? ` · ${run.currentTeam.players.length - squad.length} already drafted hidden` : ''}
                </p>
                <div className="mt-2">
                  <SegmentedControl label="Sort squad" value={sort} onChange={setSort} options={[
                    ...(blind ? [] : [{ value: 'rating', label: 'Rating ↓' }]),
                    { value: 'position', label: 'Position' },
                    { value: 'surname', label: 'Surname A–Z' },
                  ]} />
                </div>
              </Card>

              {sel && placeOptions.length > 0 ? (
                <Card className="cv mt-3 border-white/20 p-4" aria-label={`Place ${sel.name}`}>
                  <p className="text-sm text-white">PLACE IN <strong className="ny-accent">({placeOptions.length})</strong> <span className="text-slate-400">— {sel.name}</span></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {placeOptions.map((i) => (
                      <button key={i} type="button" onClick={() => place(sel, i)} aria-label={`Place in ${slots[i]} ${SLOT_NAMES[slots[i]]}`}
                        className="ny-focus ny-accent-bg rounded-lg px-3 py-1.5 text-sm font-bold">{slots[i]} · {SLOT_NAMES[slots[i]]}</button>
                    ))}
                  </div>
                </Card>
              ) : null}
              {sel && placeOptions.length === 0 ? (
                <Card className="cv mt-3 p-4"><p className="text-sm text-red-300" role="alert">{sel.name} ({sel.pos.join('/')}) fits no open slot — pick another or re-spin.</p></Card>
              ) : null}

              <div className="ny-grid mt-3" role="list" aria-label="Squad players">
                {squad.map((p) => (
                  <button
                    key={p.name}
                    role="listitem"
                    type="button"
                    onClick={() => setRun((r) => ({ ...r, selectedPlayer: p.name }))}
                    aria-pressed={run.selectedPlayer === p.name}
                    aria-label={`${p.name}, ${p.nation}, ${p.pos.join('/')}, rating ${rate(p)}`}
                    className={`ny-focus glass glass-hover p-3 text-left ${run.selectedPlayer === p.name ? 'ny-accent-bg border-transparent' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`ny-num text-2xl font-bold ${run.selectedPlayer === p.name ? '' : 'ny-accent'}`}>{p.shown}</span>
                      <span className="text-[11px] text-slate-400">{p.pos.join(' ')}</span>
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.nation}</div>
                  </button>
                ))}
              </div>
              {draftMode === 'position' ? (
                <div className="mt-3"><Button className="w-full" onClick={() => {
                  const chosen = squad.find((p) => p.name === run.selectedPlayer) ?? squad[0];
                  if (chosen && run.targetSlot !== null) place(chosen, run.targetSlot);
                }} aria-label="Draft player into targeted slot">Draft {squad.find((p) => p.name === run.selectedPlayer)?.name ?? squad[0]?.name ?? 'player'} → {run.targetSlot !== null ? slots[run.targetSlot] : ''}</Button></div>
              ) : null}
            </div>
          )}

          {/* XI list */}
          <Card className="cv mt-3 p-4" aria-label="Your XI so far">
            <h3 className="text-xs font-bold tracking-[0.2em] text-slate-400">YOUR XI · {filled}/11</h3>
            {slots.map((code, i) => {
              const pick = run.picks[i];
              return (
                <Row
                  key={i}
                  left={pick ? pick.player.name : `${code} — open`}
                  right={pick ? rate(pick.player) : '·'}
                  sub={pick ? `${code} · ${pick.player.pos.join('/')} · ${pick.player.nation}` : SLOT_NAMES[code]}
                />
              );
            })}
          </Card>
        </div>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
