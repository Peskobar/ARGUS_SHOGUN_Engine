import { useState } from 'react';
import LegacyApp from './AppLegacy';
import PlannerV3 from './PlannerV3';

export default function App() {
  const [view, setView] = useState<'PLANNER_V3' | 'LEGACY'>('PLANNER_V3');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div>
            <div className="text-sm font-black tracking-tight">ARGUS SHOGUN Engine</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">UI integration v1.2 · Mixing Timer</div>
          </div>
          <div className="flex rounded-xl bg-white/5 p-1">
            <button type="button" onClick={() => setView('PLANNER_V3')} className={`rounded-lg px-3 py-2 text-xs font-bold ${view === 'PLANNER_V3' ? 'bg-emerald-500 text-black' : 'text-white/45'}`}>Planer 2.2</button>
            <button type="button" onClick={() => setView('LEGACY')} className={`rounded-lg px-3 py-2 text-xs font-bold ${view === 'LEGACY' ? 'bg-white/15 text-white' : 'text-white/45'}`}>Pozostałe moduły</button>
          </div>
        </div>
      </header>
      {view === 'PLANNER_V3' ? (
        <main className="mx-auto max-w-6xl px-5 py-6"><PlannerV3 /></main>
      ) : (
        <LegacyApp />
      )}
    </div>
  );
}
