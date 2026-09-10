import { useMemo, useState } from 'react';
import { balanceReport } from '../engine/ratings.js';
import { wheel } from '../data/index.js';
import { buildCustom, PRESETS } from '../game/formations.js';
import { filterWheel } from '../game/draft.js';
import { DEFAULT_SETUP } from '../game/store.js';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { SegmentedControl } from '../ui/Modal.jsx';

function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs text-slate-400">{label}</span>
      <button type="button" aria-label={`Decrease ${label}`} className="ny-focus glass h-8 w-8 rounded-lg text-white" disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span aria-live="polite" className="ny-num w-8 text-center text-lg font-bold text-white">{value}</span>
      <button type="button" aria-label={`Increase ${label}`} className="ny-focus glass h-8 w-8 rounded-lg text-white" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function SectionLabel({ children }) {
  return <h2 className="mb-2 text-xs font-bold tracking-[0.2em] text-slate-400">{children}</h2>;
}

const DECADES = [
  { label: 'All eras', from: 1992, to: 2026 },
  { label: '90s', from: 1992, to: 1999 },
  { label: '00s', from: 2000, to: 2009 },
  { label: '10s', from: 2010, to: 2019 },
  { label: '20s', from: 2020, to: 2026 },
];

export default function Setup({ initial, onStart, onBack }) {
  const [s, setS] = useState({ ...DEFAULT_SETUP, ...initial });
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const custom = useMemo(() => buildCustom(s.custom), [s.custom]);
  const shape = s.preset === 'custom' ? (custom.slots ? `${s.custom.df}-${s.custom.mf}-${s.custom.fw}` : '?') : s.preset;
  const bal = useMemo(() => {
    try {
      const key = s.preset === 'custom' ? (custom.slots ? shape : null) : shape;
      return key ? balanceReport(key) : null;
    } catch { return null; }
  }, [shape, s.preset, custom.slots]);

  const pool = useMemo(() => filterWheel(wheel.teams, s.era), [s.era]);
  const activeDecade = DECADES.find((d) => d.from === s.era.from && d.to === s.era.to)?.label;
  const canStart = pool.length > 0 && (s.preset !== 'custom' || !custom.error);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="ny-display text-3xl font-bold text-white">SETUP</h1>
        <Button variant="ghost" onClick={onBack} aria-label="Back">Back</Button>
      </div>

      <div className="grid gap-4">
        <Card>
          <SectionLabel>YOUR NAME</SectionLabel>
          <input
            aria-label="Display name"
            value={s.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            placeholder="e.g. Alex — shown on tables, no account needed"
            maxLength={24}
            className="ny-focus glass w-full rounded-xl bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </Card>

        <Card>
          <SectionLabel>FORMATION</SectionLabel>
          <div className="ny-grid" role="radiogroup" aria-label="Formation presets">
            {PRESETS.map((p) => (
              <button
                key={p.shape}
                role="radio"
                aria-checked={s.preset === p.shape}
                type="button"
                onClick={() => set({ preset: p.shape })}
                className={`ny-focus rounded-xl border p-3 text-left transition-transform hover:scale-[1.02] ${s.preset === p.shape ? 'ny-accent-bg border-transparent' : 'glass'}`}
              >
                <div className="ny-num text-xl font-bold">{p.shape}</div>
                <div className={`mt-1 text-xs ${s.preset === p.shape ? '' : 'text-slate-400'}`}>{p.blurb}</div>
              </button>
            ))}
            <button
              role="radio"
              aria-checked={s.preset === 'custom'}
              type="button"
              onClick={() => set({ preset: 'custom' })}
              className={`ny-focus rounded-xl border p-3 text-left transition-transform hover:scale-[1.02] ${s.preset === 'custom' ? 'ny-accent-bg border-transparent' : 'glass'}`}
            >
              <div className="ny-num text-xl font-bold">Custom</div>
              <div className={`mt-1 text-xs ${s.preset === 'custom' ? '' : 'text-slate-400'}`}>Any shape. The engine judges you.</div>
            </button>
          </div>
          {s.preset === 'custom' ? (
            <div className="glass mt-3 rounded-xl p-3">
              <div className="flex flex-wrap gap-4">
                <Stepper label="DEF" value={s.custom.df} min={0} max={8} onChange={(df) => set({ custom: { ...s.custom, df } })} />
                <Stepper label="MID" value={s.custom.mf} min={0} max={9} onChange={(mf) => set({ custom: { ...s.custom, mf } })} />
                <Stepper label="FWD" value={s.custom.fw} min={0} max={9} onChange={(fw) => set({ custom: { ...s.custom, fw } })} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <SegmentedControl label="Full-backs style" value={s.custom.wingbacks ? 'wb' : 'fb'} onChange={(v) => set({ custom: { ...s.custom, wingbacks: v === 'wb' } })} options={[{ value: 'fb', label: 'Full-backs' }, { value: 'wb', label: 'Wing-backs' }]} />
                <SegmentedControl label="Midfield width" value={s.custom.wideMF ? 'wide' : 'narrow'} onChange={(v) => set({ custom: { ...s.custom, wideMF: v === 'wide' } })} options={[{ value: 'narrow', label: 'Narrow' }, { value: 'wide', label: 'Wide' }]} />
              </div>
              {custom.error ? (
                <p role="alert" className="mt-2 text-sm text-red-300">{custom.error}</p>
              ) : (
                <p className="ny-num mt-2 text-sm text-slate-300">Shape <span className="ny-accent font-bold">{shape}</span> → {custom.slots.join(' ')}</p>
              )}
            </div>
          ) : null}
          {bal ? (
            <div className="mt-3" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Balance: <strong className={bal.penalty === 0 ? 'ny-accent' : 'text-red-300'}>{bal.label}</strong></span>
                <span className="ny-num text-xs text-slate-500">{bal.penalty === 0 ? 'full strength' : `−${(bal.penalty / 10).toFixed(1)} overall`}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Formation balance" aria-valuenow={Math.max(0, 100 - bal.penalty / 3)} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full ${bal.penalty === 0 ? 'ny-accent-bg' : 'bg-red-400'}`} style={{ width: `${Math.max(4, 100 - bal.penalty / 3)}%` }} />
              </div>
              {bal.notes.map((n) => <p key={n} className="mt-1 text-xs text-slate-400">{n}</p>)}
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionLabel>DRAFT HANDICAP · PURE CUSTOM, NO TIERS</SectionLabel>
          <div className="flex flex-wrap items-center gap-4">
            <Stepper label="REROLLS" value={s.rerolls} min={0} max={11} onChange={(rerolls) => set({ rerolls })} />
            <SegmentedControl label="Ratings visibility" value={s.blind ? 'blind' : 'open'} onChange={(v) => set({ blind: v === 'blind' })} options={[{ value: 'open', label: 'Ratings visible' }, { value: 'blind', label: 'Blind' }]} />
          </div>
          <p className="mt-1 text-xs text-slate-500">Re-spins cost one reroll. Blind hides every number — trust your gut.</p>
        </Card>

        <Card>
          <SectionLabel>DRAFT MODE</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Draft mode">
            {[
              { v: 'squad', t: 'Squad First', d: 'Spin a club, pick any player, choose their slot.' },
              { v: 'position', t: 'Position First', d: 'Pick a slot, then spin for a club to fill it.' },
            ].map((o) => (
              <button key={o.v} role="radio" aria-checked={s.draftMode === o.v} type="button" onClick={() => set({ draftMode: o.v })}
                className={`ny-focus rounded-xl border p-3 text-left ${s.draftMode === o.v ? 'ny-accent-bg border-transparent' : 'glass'}`}>
                <div className="font-bold">{o.t}</div>
                <div className={`text-xs ${s.draftMode === o.v ? '' : 'text-slate-400'}`}>{o.d}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>PLAYER RATINGS</SectionLabel>
          <SegmentedControl label="Ratings basis" value={s.ratingMode} onChange={(ratingMode) => set({ ratingMode })}
            options={[{ value: 'season', label: 'Season' }, { value: 'prime', label: 'Prime' }]} />
          <p className="mt-1 text-xs text-slate-500">{s.ratingMode === 'season' ? 'Rated as they were that exact season.' : 'Every player at their best-ever rating across the pool.'}</p>
        </Card>

        <Card>
          <SectionLabel>ERA FILTER · CUSTOM RANGE + DECADES</SectionLabel>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Era presets">
            {DECADES.map((d) => (
              <button key={d.label} role="radio" aria-checked={activeDecade === d.label} type="button"
                onClick={() => set({ era: { from: d.from, to: d.to } })}
                className={`ny-focus rounded-lg px-3 py-1.5 text-sm ${activeDecade === d.label ? 'ny-accent-bg font-bold' : 'glass text-slate-300'}`}>{d.label}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <Stepper label="FROM" value={s.era.from} min={1992} max={s.era.to} onChange={(from) => set({ era: { ...s.era, from } })} />
            <Stepper label="TO" value={s.era.to} min={s.era.from} max={2026} onChange={(to) => set({ era: { ...s.era, to } })} />
          </div>
          <p className="mt-2 text-sm" aria-live="polite">
            {pool.length === 0
              ? <span role="alert" className="text-red-300">No club-seasons in {s.era.from}–{s.era.to} — widen the range.</span>
              : <span className="text-slate-300"><strong className="ny-accent">{pool.length}</strong> of {wheel.teams.length} club-seasons in the wheel ({s.era.from}–{s.era.to})</span>}
          </p>
        </Card>

        <Card>
          <SectionLabel>SEASON OPTIONS</SectionLabel>
          <SegmentedControl label="January window" value={s.january ? 'on' : 'off'} onChange={(v) => set({ january: v === 'on' })}
            options={[{ value: 'on', label: 'January ON' }, { value: 'off', label: 'January OFF' }]} />
          <p className="mt-1 text-xs text-slate-500">Leagues only. At halfway: one optional swap from a fresh spin. No undo.</p>
        </Card>

        <Button disabled={!canStart} onClick={() => onStart(s)} aria-label={canStart ? 'Spin the wheel' : 'Fix setup to start'} className="py-3 text-base">
          {canStart ? `Spin the wheel →` : `Fix setup to start`}
        </Button>
      </div>
    </div>
  );
}
