import { useEffect, useState } from 'react';
import { Dices, Shield, Swords, Trophy } from 'lucide-react';
import { Button } from './ui/Button.jsx';
import { Card, Row } from './ui/Card.jsx';
import { EmptyState, SkeletonGrid, Toast } from './ui/Feedback.jsx';

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

        <section aria-label="Coming next" className="mt-6">
          <EmptyState
            icon={<Trophy size={22} />}
            title="Draft loop lands in P2"
            description="Scaffold is live: glass tokens, volt accent, guard, Vercel, engine + harness. Next: starter dataset (8 + 19), then wheel → squad list → eligibility → live ratings."
            action={<Button variant="ghost" aria-label="Run engine lab hint" onClick={() => setToast('Run `npm run engine-lab` in terminal for the 10k-season numbers.')}>How realism is measured</Button>}
          />
        </section>

        <footer className="mt-10 flex items-center justify-between text-xs text-slate-500">
          <span>NINETY · private prototype · EA FC snapshot dated in P1 · no logos/photos shipped</span>
          <a href="/api/health" className="ny-focus underline">health</a>
        </footer>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
