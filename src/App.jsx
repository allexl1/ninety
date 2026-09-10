import { useEffect, useMemo, useState } from 'react';
import { Dices, Shield, Swords, Trophy } from 'lucide-react';
import { wheelTeams } from './data/index.js';
import { Button } from './ui/Button.jsx';
import { Card, Row } from './ui/Card.jsx';
import { EmptyState, SkeletonGrid, Toast } from './ui/Feedback.jsx';
import { Modal } from './ui/Modal.jsx';

function useApiHealth() {
  const [state, setState] = useState({ status: 'loading' });
  const load = async () => {
    setState({ status: 'loading' });
    try {
      const r = await fetch('/api/health');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setState({ status: 'ok', data: j });
    } catch (e) {
      setState({ status: 'error', error: String(e?.message ?? e) });
    }
  };
  useEffect(() => { load(); }, []);
  return { ...state, retry: load };
}

export default function App() {
  const api = useApiHealth();
  const [toast, setToast] = useState('');
  const teams = useMemo(() => wheelTeams(), []);
  const [openId, setOpenId] = useState(null);
  const open = teams.find((t) => t.id === openId);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('team');
    if (q && teams.some((t) => t.id === q)) setOpenId(q);
  }, [teams]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-screen">
      <div className="ny-ambient" aria-hidden="true">
        <div className="ny-ambient-a" />
        <div className="ny-ambient-b" />
      </div>

      <div className="ny-content mx-auto max-w-6xl px-4 pb-20">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <span className="ny-accent-bg ny-display rounded-lg px-2 py-1 text-lg font-bold">90</span>
            <span className="ny-display text-xl font-bold tracking-wide text-white">NINETY</span>
          </div>
          <nav aria-label="Primary" className="flex gap-2">
            <Button variant="ghost" aria-label="How it works">How it works</Button>
            <Button aria-label="Start drafting" onClick={() => setToast('Draft loop lands in P2 — engine lab is live below.')}>
              Build your XI
            </Button>
          </nav>
        </header>

        <section className="ny-hero" aria-label="NINETY hero">
          <img
            className="sharp"
            src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&q=60&auto=format&fit=crop"
            alt="Floodlit football pitch at night"
            loading="eager"
          />
          <div className="ghost" aria-hidden="true" />
          <div className="scrim" aria-hidden="true" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
            <p className="ny-accent text-xs font-bold tracking-[0.2em]">DRAFT + SEASON SIMULATOR</p>
            <h1 className="ny-display mt-1 max-w-2xl text-4xl font-bold text-white sm:text-6xl">
              Build your XI. Sim the season.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
              Spin the historic wheel, draft 11 into detailed slots, then take your XI into the
              26/27 season. Engine: Elo + Poisson/Dixon–Coles, measured — never vibes.
            </p>
          </div>
        </section>

        <section aria-label="Game loop" className="ny-grid mt-6">
          {[
            { icon: <Dices size={20} />, t: 'Spin the wheel', d: 'Historic club-seasons from 1992/93. Season vs Prime-global, custom eras.' },
            { icon: <Shield size={20} />, t: 'Draft your XI', d: 'Squad-First or Position-First. 11 detailed slots, rerolls 0–11, blind toggle.' },
            { icon: <Swords size={20} />, t: 'Sim the season', d: 'Weekly reveal, scorers+minutes, spoiler curtain + skip. January gamble.' },
            { icon: <Trophy size={20} />, t: 'Chase Europe', d: 'League position sends you to UCL / UEL / Conference. Carry the same XI.' },
          ].map((c) => (
            <Card key={c.t} className="glass-hover cv">
              <div className="text-slate-300" aria-hidden="true">{c.icon}</div>
              <h2 className="mt-2 text-base font-semibold text-white">{c.t}</h2>
              <p className="mt-1 text-sm text-slate-400">{c.d}</p>
            </Card>
          ))}
        </section>

        <section aria-label="P0 engine lab" className="mt-6 grid gap-3 md:grid-cols-3">
          <Card className="cv md:col-span-2">
            <h2 className="ny-display text-lg font-bold text-white">P0 ENGINE LAB</h2>
            <p className="mt-1 text-sm text-slate-400">
              Elo We=1/(1+10<sup>−dr/400</sup>) · HFA +35 · Poisson + Dixon–Coles ρ=−0.12 ·
              xG 1.42/1.24 + slope. Full 10,000-season numbers print in terminal via{' '}
              <code className="rounded bg-white/10 px-1 text-xs text-white">npm run engine-lab</code>.
            </p>
            <div className="mt-3">
              <Row left="Elite 88 vs weak 71 (home) — target 65–70%" right="see terminal" sub="HARD RULE · draws count as non-wins" />
              <Row left="Miracle runs (champ <72)" right="rare" sub="No regular Lille-in-the-semis" />
              <Row left="Title concentration top-2" right="measured" sub="Printed per harness run" />
            </div>
          </Card>
          <Card className="cv">
            <h2 className="text-sm font-semibold text-white">API status</h2>
            {api.status === 'loading' ? (
              <div className="mt-3"><SkeletonGrid n={1} /></div>
            ) : api.status === 'error' ? (
              <EmptyState
                icon="⚠"
                title="API unreachable"
                description={api.error}
                action={<Button onClick={api.retry} aria-label="Retry API check">Retry</Button>}
              />
            ) : (
              <p className="mt-2 text-sm text-slate-300">
                <span className="ny-accent font-bold">●</span> /api/health OK · {api.data?.env} · {api.data?.game}
              </p>
            )}
          </Card>
        </section>

        <section aria-label="Starter dataset" className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="ny-display text-lg font-bold text-white">STARTER DATASET · 8 WHEEL TEAMS</h2>
            <span className="text-xs text-slate-500">EA FC-scale v0 · snapshot 2026-09-10</span>
          </div>
          <div className="ny-rail" role="list" aria-label="Wheel teams">
            {teams.map((t) => (
              <button
                key={t.id}
                role="listitem"
                type="button"
                onClick={() => setOpenId(t.id)}
                aria-label={`View ${t.club} ${t.season} squad`}
                className="ny-focus glass glass-hover cv p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-widest text-slate-400">{t.competition} · {t.shape}</span>
                  <span className="ny-num ny-accent text-2xl font-bold">{t.computed.overall.toFixed(0)}</span>
                </div>
                <div className="ny-display mt-1 text-xl font-bold text-white">{t.club}</div>
                <div className="text-sm text-slate-400">{t.season} — {t.note}</div>
                <div className="ny-num mt-2 text-xs text-slate-500">
                  K{t.computed.keeper} · D{t.computed.defence.toFixed(0)} · M{t.computed.midfield.toFixed(0)} · A{t.computed.attack.toFixed(0)}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Coming next" className="mt-6">
          <EmptyState
            icon={<Trophy size={22} />}
            title="Draft loop lands in P2"
            description="Dataset is live: 8 sourced wheel teams + verified 26/27 EPL field. Next: wheel spin → squad list → eligibility → live line ratings → rerolls."
            action={<Button variant="ghost" aria-label="Run checks hint" onClick={() => setToast('Run `npm run p1-check` for YOU@88/78/70 season projections.')}>How your XI projects</Button>}
          />
        </section>

        <footer className="mt-10 flex flex-col gap-1 text-xs text-slate-500">
          <span>NINETY · private prototype · ratings are an editorial FC-scale snapshot, not affiliated with EA, UEFA or the Premier League · no logos/photos shipped</span>
          <a href="/api/health" className="ny-focus underline">health</a>
        </footer>
      </div>
      <Modal open={!!open} onClose={() => setOpenId(null)} label={open ? `${open.club} ${open.season} squad` : 'Squad'}>
        {open ? (
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="ny-display text-xl font-bold text-white">{open.club} <span className="text-slate-400">{open.season}</span></h2>
              <span className="ny-num ny-accent text-2xl font-bold">{open.computed.overall.toFixed(1)}</span>
            </div>
            <p className="text-xs text-slate-500">{open.note} · {open.shape} · {open.competition}</p>
            <h3 className="mt-3 text-xs font-bold tracking-widest text-slate-400">STARTING XI</h3>
            {open.players.filter((p) => p.xi).map((p) => (
              <Row key={p.name} left={p.name} right={p.rating} sub={`${p.pos.join('/')} · ${p.nation}`} />
            ))}
            <h3 className="mt-3 text-xs font-bold tracking-widest text-slate-400">SUBS</h3>
            {open.players.filter((p) => !p.xi).map((p) => (
              <Row key={p.name} left={p.name} right={p.rating} sub={`${p.pos.join('/')} · ${p.nation}`} />
            ))}
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setOpenId(null)} aria-label="Close squad view">Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Toast msg={toast} />
    </div>
  );
}
