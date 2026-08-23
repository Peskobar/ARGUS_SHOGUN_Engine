import { useState } from 'react';
import LegacyApp from './AppLegacy';
import NutritionTechnicianPanel from './NutritionTechnicianPanel';
import PlannerV3 from './PlannerV3';

export default function App() {
  const [view, setView] = useState<'PLANNER_V3' | 'NUTRITION' | 'LEGACY'>('PLANNER_V3');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black tracking-tight">ARGUS SHOGUN Engine</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">UI integration v1.3 · Evidence + Execution</div>
          </div>
          <div className="grid grid-cols-3 rounded-xl bg-white/5 p-1">
            <button type="button" onClick={() => setView('PLANNER_V3')} className={`rounded-lg px-3 py-2 text-[10px] font-bold sm:text-xs ${view === 'PLANNER_V3' ? 'bg-emerald-500 text-black' : 'text-white/45'}`}>Planer 2.2</button>
            <button type="button" onClick={() => setView('NUTRITION')} className={`rounded-lg px-3 py-2 text-[10px] font-bold sm:text-xs ${view === 'NUTRITION' ? 'bg-cyan-500 text-black' : 'text-white/45'}`}>Technik Żywienia</button>
            <button type="button" onClick={() => setView('LEGACY')} className={`rounded-lg px-3 py-2 text-[10px] font-bold sm:text-xs ${view === 'LEGACY' ? 'bg-white/15 text-white' : 'text-white/45'}`}>Pozostałe</button>
          </div>
        </div>
      </header>
      {view === 'PLANNER_V3' ? (
        <main className="mx-auto max-w-6xl px-5 py-6"><PlannerV3 /></main>
      ) : view === 'NUTRITION' ? (
        <NutritionTechnicianPanel />
      ) : (
        <LegacyApp />
      )}
    </div>
  );
}
