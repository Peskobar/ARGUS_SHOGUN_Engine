import { History } from 'lucide-react';
import { useAppStore } from './store';

export default function HistoryPanel() {
  const store = useAppStore();
  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <div className="mb-4 flex items-center gap-2"><History className="h-5 w-5 text-cyan-300" /><h2 className="font-black">Dziennik wykonania</h2></div>
      <div className="space-y-3">
        {store.history.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/30">Brak fizycznie wykonanych, autoryzowanych operacji.</div> : store.history.map(item => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-bold">{store.getRecipe(item.recipeId ?? '')?.name ?? item.recipeId ?? 'Operacja'}</div><div className="mt-1 font-mono text-[10px] text-white/35">{item.date} · {item.stage ?? '?'} W{item.week ?? '?'} · {item.medium ?? '?'} · {item.waterProfile ?? '?'}</div></div><div className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300">{item.lifecycleStatus ?? 'LEGACY'}</div></div>
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4"><Cell label="Autoryzacja" value={`${item.recipeVerificationStatus ?? '?'} / ${item.recipeExecutionPolicy ?? '?'}`} /><Cell label="Objętość" value={`${item.volume} ${item.volumeUnit ?? 'L'} · ${item.totalMl} ml preparatów`} /><Cell label="PRE-BASE pH" value={item.measurements?.preBasePh?.toString() ?? 'N/D'} /><Cell label="Final EC / pH" value={`${item.measurements?.finalEc ?? 'N/D'} / ${item.measurements?.finalPh ?? 'N/D'}`} /></div>
            <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-bold text-white/55">Ślad audytowy</summary><div className="mt-3 space-y-2 text-[11px] text-white/45"><div>Źródło: {item.recipeSource ?? 'brak'} {item.recipeSourceVersion ? `· ${item.recipeSourceVersion}` : ''}</div><div>Kroki: {item.confirmedProtocolStepIds?.join(' → ') ?? 'legacy'}</div><div>Narzędzia: {item.tools?.map(tool => `${tool.productId}:${tool.instanceId}=${tool.amountMl}ml@${tool.precisionStep}`).join(' | ') ?? 'legacy'}</div></div></details>
          </article>
        ))}
      </div>
    </main>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</div><div className="mt-1 font-mono text-white/70">{value}</div></div>;
}
