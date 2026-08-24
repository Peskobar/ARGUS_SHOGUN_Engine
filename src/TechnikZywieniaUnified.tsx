import { useState } from 'react';
import NutritionTechnicianPanel from './NutritionTechnicianPanel';
import PlannerV3 from './PlannerV3';

type TechnikZywieniaStage = 'DECISION' | 'PREPARATION';

/**
 * Canonical user-facing ARGUS nutrition workflow.
 *
 * This component unifies navigation and data-entry flow without merging domain
 * engines into one monolith. Decision/evidence remains isolated from physical
 * preparation/execution, while both surfaces share canonical domain rules.
 */
export default function TechnikZywieniaUnified() {
  const [stage, setStage] = useState<TechnikZywieniaStage>('DECISION');

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <div className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
          ARGUS Technik Żywienia · Unified Workflow v2
        </div>
        <div className="mt-2 text-sm text-white/55">
          Jedna ścieżka: diagnoza i decyzja → receptura → przygotowanie → weryfikacja → historia.
          Warstwa decyzji nie uruchamia automatycznie wykonania.
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/35 p-1">
          <button
            type="button"
            onClick={() => setStage('DECISION')}
            className={`rounded-lg px-3 py-2 text-xs font-black ${
              stage === 'DECISION' ? 'bg-cyan-500 text-black' : 'text-white/45'
            }`}
          >
            1 · Decyzja i dowody
          </button>
          <button
            type="button"
            onClick={() => setStage('PREPARATION')}
            className={`rounded-lg px-3 py-2 text-xs font-black ${
              stage === 'PREPARATION' ? 'bg-emerald-500 text-black' : 'text-white/45'
            }`}
          >
            2 · Przygotowanie
          </button>
        </div>
      </div>

      {stage === 'DECISION' ? (
        <div className="-mx-5 -my-6">
          <NutritionTechnicianPanel />
        </div>
      ) : (
        <PlannerV3 />
      )}
    </main>
  );
}
