import { useState } from 'react';
import LegacyApp from './AppLegacy';
import TechnikZywieniaUnified from './TechnikZywieniaUnified';

export default function App() {
  const [view, setView] = useState<'TECHNIK_ZYWIENIA' | 'LEGACY'>('TECHNIK_ZYWIENIA');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black tracking-tight">ARGUS SHOGUN Engine</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Technik Żywienia · źródło → decyzja → wykonanie</div>
          </div>
          <div className="grid grid-cols-2 rounded-xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setView('TECHNIK_ZYWIENIA')}
              className={`rounded-lg px-3 py-2 text-[10px] font-bold sm:text-xs ${
                view === 'TECHNIK_ZYWIENIA' ? 'bg-cyan-500 text-black' : 'text-white/45'
              }`}
            >
              Technik Żywienia
            </button>
            <button
              type="button"
              onClick={() => setView('LEGACY')}
              className={`rounded-lg px-3 py-2 text-[10px] font-bold sm:text-xs ${
                view === 'LEGACY' ? 'bg-white/15 text-white' : 'text-white/45'
              }`}
            >
              Pozostałe
            </button>
          </div>
        </div>
      </header>
      {view === 'TECHNIK_ZYWIENIA' ? <TechnikZywieniaUnified /> : <LegacyApp />}
    </div>
  );
}
