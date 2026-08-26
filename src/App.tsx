import { useState } from 'react';
import ExecutionPlanner from './ExecutionPlanner';
import HistoryPanel from './HistoryPanel';
import InventoryPanel from './InventoryPanel';
import NutritionTechnicianPanel from './NutritionTechnicianPanel';
import RecipeBuilderPanel from './RecipeBuilderPanel';

type View = 'EXECUTION' | 'NUTRITION' | 'INVENTORY' | 'BUILDER' | 'HISTORY';

export default function App() {
  const [view, setView] = useState<View>('EXECUTION');
  const tabs: Array<[View, string]> = [
    ['EXECUTION', 'Planer wykonania'],
    ['NUTRITION', 'Technik Żywienia'],
    ['INVENTORY', 'Magazyn'],
    ['BUILDER', 'Kreator receptur'],
    ['HISTORY', 'Historia'],
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-black tracking-tight">ARGUS SHOGUN</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Blokada Rzeczywistości · jedna ścieżka wykonania</div>
          </div>
          <nav className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setView(id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${view === id ? 'bg-emerald-500 text-black' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}>{label}</button>
            ))}
          </nav>
        </div>
      </header>
      {view === 'EXECUTION' && <ExecutionPlanner />}
      {view === 'NUTRITION' && <NutritionTechnicianPanel />}
      {view === 'INVENTORY' && <InventoryPanel />}
      {view === 'BUILDER' && <RecipeBuilderPanel />}
      {view === 'HISTORY' && <HistoryPanel />}
    </div>
  );
}
