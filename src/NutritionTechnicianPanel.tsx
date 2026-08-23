import { type ReactNode, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, ChevronRight, Droplets, FlaskConical, ShieldCheck, X } from 'lucide-react';
import { DecisionScenario } from './evidenceMatrix';
import { buildWeeklyNutritionPlan, compareScenario, ProductDecision } from './nutritionTechnician';
import { useAppStore } from './store';
import { GrowthStage, WaterType } from './types';

const SCENARIOS: Array<{ id: DecisionScenario; label: string }> = [
  { id: 'BASELINE', label: 'Dlaczego' },
  { id: 'LESS', label: 'Mniej' },
  { id: 'MORE', label: 'Więcej' },
  { id: 'OMIT', label: 'Wyłącz' },
];

const stageMaxWeek = (stage: GrowthStage) => stage === GrowthStage.SEEDLING ? 2 : stage === GrowthStage.VEG ? 4 : stage === GrowthStage.BLOOM ? 8 : 1;
const stageLabel = (stage: GrowthStage) => stage === GrowthStage.SEEDLING ? 'Siewki / klony' : stage === GrowthStage.VEG ? 'Wegetacja' : stage === GrowthStage.BLOOM ? 'Kwitnienie' : 'Płukanie';
const waterLabel = (water: WaterType) => water === WaterType.HARD ? 'HARD' : water === WaterType.SOFT ? 'SOFT' : water === WaterType.RO ? 'RO' : 'Kranowa / nie wiem';

export default function NutritionTechnicianPanel() {
  const store = useAppStore();
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [week, setWeek] = useState(1);
  const [waterType, setWaterType] = useState<WaterType>(store.currentWaterProfile);
  const [backgroundEcInput, setBackgroundEcInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DecisionScenario>('BASELINE');

  const parsedEc = backgroundEcInput.trim() === '' ? undefined : Number(backgroundEcInput);
  const backgroundEc = parsedEc !== undefined && Number.isFinite(parsedEc) && parsedEc >= 0 ? parsedEc : undefined;
  const context = useMemo(() => ({ stage, week, waterType, backgroundEc, medium: 'TERRA_SOIL_PERLITE' }), [stage, week, waterType, backgroundEc]);
  const plan = useMemo(() => buildWeeklyNutritionPlan(context), [context]);
  const scenarioPack = useMemo(() => selectedProductId ? compareScenario(selectedProductId, context) : null, [selectedProductId, context]);
  const decision = scenarioPack
    ? scenario === 'BASELINE' ? scenarioPack.baseline : scenario === 'LESS' ? scenarioPack.less : scenario === 'MORE' ? scenarioPack.more : scenarioPack.omit
    : null;

  const changeStage = (next: GrowthStage) => {
    setStage(next);
    setWeek(1);
    setSelectedProductId(null);
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300"><ShieldCheck className="h-4 w-4" /> Nutrition Technician v1 · Evidence Mode</div>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/55">Producent ustala punkt odniesienia. Nauka ustawia bariery. Pomiary i stan rośliny korygują decyzję. Brak danych nie jest zaproszeniem do kreatywnego liczenia.</p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Control label="Faza">
          <select className="w-full bg-black px-3 py-2 text-sm outline-none" value={stage} onChange={event => changeStage(event.target.value as GrowthStage)}>
            <option value={GrowthStage.SEEDLING}>Siewki / klony</option><option value={GrowthStage.VEG}>Wegetacja</option><option value={GrowthStage.BLOOM}>Kwitnienie</option><option value={GrowthStage.FLUSH}>Płukanie</option>
          </select>
        </Control>
        <Control label="Tydzień">
          <select className="w-full bg-black px-3 py-2 text-sm outline-none" value={week} onChange={event => setWeek(Number(event.target.value))}>
            {Array.from({ length: stageMaxWeek(stage) }, (_, index) => index + 1).map(value => <option key={value} value={value}>Tydzień {value}</option>)}
          </select>
        </Control>
        <Control label="Profil wody" hint="Gdy nie wiemy, system pokazuje kandydatów HARD/SOFT zamiast zgadywać.">
          <select className="w-full bg-black px-3 py-2 text-sm outline-none" value={waterType} onChange={event => setWaterType(event.target.value as WaterType)}>
            <option value={WaterType.CUSTOM}>Kranowa / nie wiem</option><option value={WaterType.HARD}>HARD</option><option value={WaterType.SOFT}>SOFT</option><option value={WaterType.RO}>RO</option>
          </select>
        </Control>
        <Control label="Background EC · mS/cm" hint="Pusty = brak pomiaru. Dane wodociągu są tylko referencją.">
          <input className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm outline-none focus:border-cyan-500/50" inputMode="decimal" type="number" min="0" step="0.01" placeholder="np. 0.53" value={backgroundEcInput} onChange={event => setBackgroundEcInput(event.target.value)} />
        </Control>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Card title="Stan wejścia" icon={<Droplets className="h-4 w-4 text-cyan-300" />}>
            <div className="space-y-3 text-sm"><InfoRow label="Medium" value="TERRA / SOIL + PERLIT" /><InfoRow label="Faza" value={`${stageLabel(stage)} · W${week}`} /><InfoRow label="Woda" value={waterLabel(waterType)} /><InfoRow label="Status wody" value={plan.waterStatus} /><InfoRow label="EC z pomiaru" value={backgroundEc === undefined ? 'BRAK' : `${backgroundEc.toFixed(2)} mS/cm`} /></div>
          </Card>
          {plan.waterNotes.length > 0 && <Notice title="Woda · kontekst" tone="blue" lines={plan.waterNotes} />}
          {plan.systemWarnings.length > 0 && <Notice title="Blokady i zależności" tone="amber" lines={plan.systemWarnings} />}
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-end justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Plan producenta + guardrails</div><div className="mt-1 text-xl font-black">{stageLabel(stage)} · tydzień {week}</div></div><div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black text-white/45">{plan.products.length} aktywnych pozycji</div></div>
            {!plan.products.length ? <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">Brak zweryfikowanych pozycji dla tego tygodnia. System nie uzupełnia dziur wyobraźnią.</div> : (
              <div className="mt-5 space-y-3">{plan.products.map(product => <div key={product.productId}><ProductRow decision={product} name={store.getProduct(product.productId)?.name ?? product.productId} onOpen={() => { setSelectedProductId(product.productId); setScenario('BASELINE'); }} /></div>)}</div>
            )}
          </div>
        </div>
      </section>

      {selectedProductId && decision && <DecisionModal name={store.getProduct(selectedProductId)?.name ?? selectedProductId} decision={decision} scenario={scenario} setScenario={setScenario} onClose={() => setSelectedProductId(null)} />}
    </main>
  );
}

function Control({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="rounded-xl border border-white/10 bg-white/5 p-3"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{label}</span>{children}{hint && <span className="mt-2 block text-[10px] leading-relaxed text-white/30">{hint}</span>}</label>;
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">{icon}{title}</div>{children}</div>;
}

function Notice({ title, tone, lines }: { title: string; tone: 'blue' | 'amber'; lines: string[] }) {
  const amber = tone === 'amber';
  return <div className={`rounded-2xl border p-5 ${amber ? 'border-amber-500/20 bg-amber-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}><div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] ${amber ? 'text-amber-300' : 'text-blue-300'}`}>{amber && <AlertTriangle className="h-4 w-4" />}{title}</div><ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/60">{lines.map(line => <li key={line}>• {line}</li>)}</ul></div>;
}

function ProductRow({ decision, name, onOpen }: { decision: ProductDecision; name: string; onOpen: () => void }) {
  const doseLabel = decision.doseWindows.map(window => {
    const range = window.minMlPerL === window.maxMlPerL ? `${window.minMlPerL} ml/L` : `${window.minMlPerL}–${window.maxMlPerL} ml/L`;
    return window.waterType ? `${window.waterType}: ${range}` : range;
  }).join(' · ') || 'brak okna';
  return <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-black/45 p-4 text-left transition hover:border-cyan-500/35 hover:bg-cyan-500/5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300"><FlaskConical className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{name}</span><Badge text={decision.role} /><Badge text={decision.confidence} tone={decision.confidence === 'HIGH' ? 'green' : 'amber'} /></div><div className="mt-1 text-xs text-white/45">{doseLabel}</div>{decision.unresolved.length > 0 && <div className="mt-2 text-[10px] text-amber-300/75">{decision.unresolved.length} nierozstrzygniętych danych</div>}</div><ChevronRight className="h-5 w-5 shrink-0 text-white/25" /></button>;
}

function DecisionModal({ name, decision, scenario, setScenario, onClose }: { name: string; decision: ProductDecision; scenario: DecisionScenario; setScenario: (scenario: DecisionScenario) => void; onClose: () => void }) {
  const heading = scenario === 'BASELINE' ? 'Dlaczego teraz' : scenario === 'LESS' ? 'Jeżeli damy mniej' : scenario === 'MORE' ? 'Jeżeli damy więcej' : 'Jeżeli zrezygnujemy';
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"><div className="mx-auto my-6 max-w-3xl rounded-2xl border border-white/10 bg-[#101010] shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-white/10 p-5"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Evidence Decision</div><h2 className="mt-1 text-xl font-black">{name}</h2><div className="mt-2 flex gap-2"><Badge text={decision.role} /><Badge text={decision.confidence} tone={decision.confidence === 'HIGH' ? 'green' : 'amber'} /></div></div><button type="button" onClick={onClose} className="rounded-lg bg-white/5 p-2 text-white/45"><X className="h-5 w-5" /></button></div><div className="p-5"><div className="grid grid-cols-4 gap-2">{SCENARIOS.map(item => <button key={item.id} type="button" onClick={() => setScenario(item.id)} className={`rounded-lg border px-2 py-2 text-[10px] font-black uppercase ${scenario === item.id ? 'border-cyan-500 bg-cyan-500 text-black' : 'border-white/10 bg-black text-white/45'}`}>{item.label}</button>)}</div>{decision.blocked && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">Ten scenariusz jest domyślnie zablokowany. Ominięcie bazy wymaga jawnego override i alternatywnego pełnego źródła żywienia.</div>}<Section title={heading}>{decision.decisionText.map(text => <p key={text}>{text}</p>)}</Section>{decision.interactions.length > 0 && <Section title="Co jeszcze się zmienia">{decision.interactions.map(text => <p key={text}>{text}</p>)}</Section>}{decision.hardRules.length > 0 && <Section title="Twarde reguły" tone="amber">{decision.hardRules.map(text => <p key={text}>• {text}</p>)}</Section>}{decision.unresolved.length > 0 && <Section title="Czego jeszcze nie wiemy" tone="amber">{decision.unresolved.map(text => <p key={text}>• {text}</p>)}</Section>}<div className="mt-6 rounded-xl border border-white/10 bg-black/35 p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/40"><BookOpen className="h-4 w-4" /> Dowody</div><div className="mt-3 space-y-2">{decision.refs.map(ref => <a key={ref.id} href={ref.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-white/5 bg-white/5 p-3 text-xs hover:border-cyan-500/30"><div className="font-bold text-white/70">{ref.title}</div><div className="mt-1 text-[10px] text-white/30">{ref.sourceType} · {ref.applicability} · {ref.confidence}{ref.year ? ` · ${ref.year}` : ''}</div></a>)}</div></div></div></div></div>;
}

function Section({ title, children, tone = 'default' }: { title: string; children: ReactNode; tone?: 'default' | 'amber' }) {
  const amber = tone === 'amber';
  return <div className={`mt-5 rounded-xl border p-4 ${amber ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10 bg-white/[0.03]'}`}><div className={`text-[10px] font-black uppercase tracking-[0.16em] ${amber ? 'text-amber-300' : 'text-white/40'}`}>{title}</div><div className="mt-3 space-y-2 text-sm leading-relaxed text-white/65">{children}</div></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-white/35">{label}</span><strong className="text-right font-mono text-white/75">{value}</strong></div>;
}

function Badge({ text, tone = 'default' }: { text: string; tone?: 'default' | 'green' | 'amber' }) {
  const classes = tone === 'green' ? 'bg-emerald-500/15 text-emerald-300' : tone === 'amber' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/10 text-white/45';
  return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${classes}`}>{text}</span>;
}
