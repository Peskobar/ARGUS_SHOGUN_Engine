import { useState } from 'react';
import NutritionTechnicianPanel from './NutritionTechnicianPanel';
import PlannerV3 from './PlannerV3';

type TechnikZywieniaStage = 'DECISION' | 'PREPARATION';

/**
 * Canonical user-facing ARGUS nutrition workflow.
 *
 * One module, three visible semantic layers:
 * 1) manufacturer/source truth,
 * 2) ARGUS interpretation and safeguards,
 * 3) physical preparation/execution.
 *
 * Source order and physical order remain deliberately separate domain concepts.
 */
export default function TechnikZywieniaUnified() {
  const [stage, setStage] = useState<TechnikZywieniaStage>('DECISION');

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <div className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
          ARGUS Technik Żywienia · jedna ścieżka
        </div>
        <div className="mt-2 text-sm text-white/55">
          Producent → analiza ARGUS → przygotowanie i wykonanie. Jedne dane, ale dwie różne kolejności:
          źródłowa i fizyczna. Nie wolno ich już zamieniać miejscami.
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <WorkflowLayer
            number="1"
            title="Producent"
            text="Tabela SHOGUN · kolejność źródłowa"
            active={stage === 'DECISION'}
          />
          <WorkflowLayer
            number="2"
            title="ARGUS"
            text="Dawki, dowody i reguły bezpieczeństwa"
            active={stage === 'DECISION'}
          />
          <WorkflowLayer
            number="3"
            title="Wykonanie"
            text="Kolejność dodawania do zbiornika"
            active={stage === 'PREPARATION'}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/35 p-1">
          <button
            type="button"
            onClick={() => setStage('DECISION')}
            className={`rounded-lg px-3 py-2 text-xs font-black ${
              stage === 'DECISION' ? 'bg-cyan-500 text-black' : 'text-white/45'
            }`}
          >
            Producent + decyzja ARGUS
          </button>
          <button
            type="button"
            onClick={() => setStage('PREPARATION')}
            className={`rounded-lg px-3 py-2 text-xs font-black ${
              stage === 'PREPARATION' ? 'bg-emerald-500 text-black' : 'text-white/45'
            }`}
          >
            Przygotowanie + wykonanie
          </button>
        </div>
      </div>

      {stage === 'DECISION' ? (
        <>
          <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs leading-relaxed text-cyan-100/75">
            <strong className="text-cyan-200">Tabela SHOGUN — kolejność źródłowa.</strong>{' '}
            To zapis kolejności z tabeli nawożenia producenta. To nie jest kolejność dodawania preparatów do wody.
          </div>
          <div className="-mx-5 -my-6 [&>main>div:first-child]:hidden">
            <NutritionTechnicianPanel />
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs leading-relaxed text-emerald-100/75">
            <strong className="text-emerald-200">Kolejność dodawania do zbiornika — ARGUS.</strong>{' '}
            To fizyczna procedura robocza. Kontrola bezpieczeństwa ARGUS (technicznie: Reality Lock) prowadzi przez kolejne kroki i punkty kontrolne.
          </div>
          <PlannerV3 />
        </>
      )}
    </main>
  );
}

function WorkflowLayer({
  number,
  title,
  text,
  active,
}: {
  number: string;
  title: string;
  text: string;
  active: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${active ? 'border-white/20 bg-white/10' : 'border-white/10 bg-black/25'}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${active ? 'bg-white text-black' : 'bg-white/10 text-white/45'}`}>
          {number}
        </span>
        <strong className="text-xs">{title}</strong>
      </div>
      <div className="mt-2 text-[10px] leading-relaxed text-white/40">{text}</div>
    </div>
  );
}
