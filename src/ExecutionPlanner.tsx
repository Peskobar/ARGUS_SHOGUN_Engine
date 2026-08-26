import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Beaker, CheckCircle2, Gauge, LockKeyhole, Play, ShieldCheck, Syringe } from 'lucide-react';
import { evaluateExecutionReadiness } from './executionPolicy';
import { buildExecutionProtocol, buildExecutionSteps, filterRecipes, validateRecipeContext } from './recipeEngine';
import { useAppStore } from './store';
import { ApplicationMethod, GrowthStage, type ExecutionMeasurements } from './types';
import { plLabel, plPhrase } from './uiPolish';

const stageMaxWeek = (stage: GrowthStage) => stage === GrowthStage.SEEDLING ? 2 : stage === GrowthStage.VEG ? 4 : stage === GrowthStage.BLOOM ? 8 : 1;

export default function ExecutionPlanner() {
  const store = useAppStore();
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [week, setWeek] = useState(1);
  const [method, setMethod] = useState<ApplicationMethod>(ApplicationMethod.ROOT_FEED);
  const [recipeId, setRecipeId] = useState('');
  const [volumeLitres, setVolumeLitres] = useState(5);
  const [readyToUseVolumeMl, setReadyToUseVolumeMl] = useState(0);
  const [measurements, setMeasurements] = useState<ExecutionMeasurements>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const executionLock = useRef(false);

  const recipes = useMemo(() => filterRecipes(store.recipes, {
    medium: store.currentMedium,
    method,
    stage,
    week,
    waterType: store.currentWaterProfile,
  }), [store.recipes, store.currentMedium, store.currentWaterProfile, method, stage, week]);

  useEffect(() => {
    if (!recipes.some(recipe => recipe.id === recipeId)) setRecipeId(recipes[0]?.id ?? '');
  }, [recipes, recipeId]);

  useEffect(() => {
    setConfirmed([]);
    setMeasurements({});
    setMessage('');
    executionLock.current = false;
  }, [recipeId, stage, week, method, store.currentMedium, store.currentWaterProfile]);

  const recipe = recipes.find(item => item.id === recipeId);
  const protocol = useMemo(() => recipe ? buildExecutionProtocol(recipe, store.inventory) : [], [recipe, store.inventory]);
  const productSteps = useMemo(() => recipe ? buildExecutionSteps(recipe, store.inventory) : [], [recipe, store.inventory]);
  const simulationWarnings = useMemo(() => recipe ? validateRecipeContext(
    recipe,
    store.inventory,
    { medium: store.currentMedium, method: recipe.method, week },
    'SIMULATION',
  ) : [], [recipe, store.inventory, store.currentMedium, week]);

  const readiness = useMemo(() => recipe ? evaluateExecutionReadiness({
    recipe,
    products: store.inventory,
    medium: store.currentMedium,
    stage,
    week,
    waterType: store.currentWaterProfile,
    volumeLitres,
    readyToUseVolumeMl,
    measurements,
    confirmedProtocolStepIds: confirmed,
  }) : null, [recipe, store.inventory, store.currentMedium, store.currentWaterProfile, stage, week, volumeLitres, readyToUseVolumeMl, measurements, confirmed]);

  const toggleConfirmed = (id: string) => {
    setConfirmed(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const setMeasurement = (key: keyof ExecutionMeasurements, raw: string) => {
    const parsed = raw.trim() === '' ? undefined : Number(raw);
    setMeasurements(current => ({ ...current, [key]: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined }));
  };

  const execute = () => {
    if (!recipe || !readiness?.allowed || executionLock.current) return;
    executionLock.current = true;
    const result = store.executeRecipe({
      recipeId: recipe.id,
      stage,
      week,
      volumeLitres,
      readyToUseVolumeMl,
      measurements,
      confirmedProtocolStepIds: confirmed,
    });

    if (!result.ok) {
      executionLock.current = false;
      setMessage(plPhrase(result.blockers[0]?.message ?? 'Operacja została zatrzymana przez Blokadę Rzeczywistości.'));
      return;
    }

    setMessage('Operacja wykonana i zapisana z pełnym śladem audytowym.');
    setConfirmed([]);
    setMeasurements({});
    setReadyToUseVolumeMl(0);
    executionLock.current = false;
  };

  const isRts = recipe?.method === ApplicationMethod.READY_TO_SPRAY;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-5 py-6">
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300"><ShieldCheck className="h-4 w-4" /> Blokada Rzeczywistości · jedna ścieżka wykonania</div>
        <p className="mt-2 text-sm text-white/55">Plan można oglądać jako symulację. Fizyczne wykonanie wymaga statusu ZWERYFIKOWANE + MOŻNA WYKONAĆ, wszystkich potwierdzonych kroków, prawidłowych pomiarów, zapasu preparatów i mierzalnego zestawu narzędzi.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Select label="Podłoże" value={store.currentMedium} onChange={value => store.updateMedium(value as typeof store.currentMedium)} options={['TERRA', 'COCO', 'HYDRO', 'CUSTOM']} />
        <Select label="Woda" value={store.currentWaterProfile} onChange={value => store.updateWater(value as typeof store.currentWaterProfile)} options={['CUSTOM', 'SOFT', 'HARD', 'RO']} />
        <Select label="Faza" value={stage} onChange={value => { setStage(value as GrowthStage); setWeek(1); }} options={[GrowthStage.SEEDLING, GrowthStage.VEG, GrowthStage.BLOOM, GrowthStage.FLUSH]} />
        <Select label="Tydzień" value={String(week)} onChange={value => setWeek(Number(value))} options={Array.from({ length: stageMaxWeek(stage) }, (_, index) => String(index + 1))} />
        <Select label="Metoda" value={method} onChange={value => setMethod(value as ApplicationMethod)} options={[ApplicationMethod.ROOT_FEED, ApplicationMethod.FOLIAR, ApplicationMethod.READY_TO_SPRAY]} />
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/35">{isRts ? 'Zużycie gotowego oprysku ml' : 'Woda bazowa L'}</label>
          <input className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm" type="number" min="0" step={isRts ? 1 : 0.5} value={isRts ? readyToUseVolumeMl || '' : volumeLitres} onChange={event => isRts ? setReadyToUseVolumeMl(Math.max(0, Number(event.target.value) || 0)) : setVolumeLitres(Math.max(0.5, Number(event.target.value) || 0.5))} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/40">Receptura dla dokładnego tygodnia</div>
            <div className="space-y-2">
              {recipes.length ? recipes.map(item => (
                <button key={item.id} type="button" onClick={() => setRecipeId(item.id)} className={`w-full rounded-xl border p-3 text-left ${recipeId === item.id ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-black/30'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{item.name}</span><StatusBadge text={plLabel(item.verificationStatus ?? 'UNVERIFIED')} ok={item.verificationStatus === 'VERIFIED'} /></div>
                  <div className="mt-1 text-[10px] text-white/35">{plLabel(item.executionPolicy ?? 'SIMULATION_ONLY')} · tydz. {item.weekStart ?? '*'}–{item.weekEnd ?? '*'}</div>
                </button>
              )) : <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/35">Brak receptury dla tego tygodnia i kontekstu.</div>}
            </div>
          </div>

          {recipe && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-black uppercase tracking-wider text-white/40">Status symulacji</div>
              <div className="mt-3 space-y-2">
                {simulationWarnings.length ? simulationWarnings.map((warning, index) => <Notice key={`${warning.code}-${index}`} text={plPhrase(warning.message)} error={warning.severity === 'ERROR'} />) : <Notice text="Kontekst receptury jest spójny." />}
              </div>
            </div>
          )}

          {readiness && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-wider text-white/40">Bramka wykonania</span><StatusBadge text={plLabel(readiness.allowed ? 'READY' : 'LOCKED')} ok={readiness.allowed} /></div>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                {readiness.blockers.length ? readiness.blockers.map((blocker, index) => <Notice key={`${blocker.code}-${index}`} text={plPhrase(blocker.message)} error />) : <Notice text="Wszystkie twarde bramki zaliczone." />}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center gap-2"><Beaker className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-black uppercase tracking-wider">Protokół wykonawczy</h2></div>
            {!recipe ? <div className="p-10 text-center text-white/30">Wybierz kontekst z dostępną recepturą.</div> : (
              <div className="space-y-3">
                {protocol.map((step, index) => {
                  const checked = confirmed.includes(step.id);
                  if (step.kind === 'ACTION') {
                    return (
                      <div key={step.id} className={`rounded-xl border p-4 ${checked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}>
                        <div className="flex items-start gap-3">
                          <button type="button" onClick={() => toggleConfirmed(step.id)} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-emerald-400 bg-emerald-500 text-black' : 'border-white/20 bg-black'}`}>{checked && <CheckCircle2 className="h-4 w-4" />}</button>
                          <div className="flex-1"><div className="text-[10px] uppercase tracking-widest text-cyan-300/70">Krok {index + 1} · punkt kontrolny</div><div className="font-bold">{plPhrase(step.title)}</div><div className="mt-1 text-xs text-white/45">{plPhrase(step.detail ?? '')}</div>{step.measurement && <MeasurementInput type={step.measurement} measurements={measurements} onChange={setMeasurement} />}</div>
                        </div>
                      </div>
                    );
                  }

                  const required = isRts ? readyToUseVolumeMl : Number((step.ingredient.concentration * volumeLitres).toFixed(2));
                  const tools = readiness?.toolSet.assignments[step.product.id] ?? [];
                  return (
                    <div key={step.id} className={`rounded-xl border p-4 ${checked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-black/30'}`}>
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => toggleConfirmed(step.id)} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-emerald-400 bg-emerald-500 text-black' : 'border-white/20'}`}>{checked && <CheckCircle2 className="h-4 w-4" />}</button>
                        <div className="flex-1"><div className="text-[10px] uppercase tracking-widest text-white/30">Krok {index + 1} · {plLabel(step.product.mixingRole ?? 'OTHER')}</div><div className="font-bold">{step.product.name}</div><div className="mt-1 font-mono text-xs text-emerald-300">{isRts ? `${required} ml bezpośrednio` : `${step.ingredient.concentration} ml/L · ${required} ml razem`}</div>{tools.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{tools.map(tool => <span key={tool.instanceId} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px]"><Syringe className="mr-1 inline h-3 w-3" />{tool.instanceId}: {tool.amount} ml · podziałka {tool.precisionStep} ml</span>)}</div>}</div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-white/45">Potwierdzone {confirmed.length}/{protocol.length} kroków.</div>
                  <button type="button" disabled={!readiness?.allowed} onClick={execute} className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black ${readiness?.allowed ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'cursor-not-allowed bg-white/10 text-white/30'}`}>{readiness?.allowed ? <Play className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}{readiness?.allowed ? 'Wykonaj i zapisz' : 'Wykonanie zablokowane'}</button>
                </div>
                {message && <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/65">{message}</div>}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MeasurementInput({ type, measurements, onChange }: { type: 'PRE_BASE_PH' | 'FINAL_EC' | 'FINAL_PH'; measurements: ExecutionMeasurements; onChange: (key: keyof ExecutionMeasurements, raw: string) => void }) {
  const key: keyof ExecutionMeasurements = type === 'PRE_BASE_PH' ? 'preBasePh' : type === 'FINAL_EC' ? 'finalEc' : 'finalPh';
  const label = type === 'PRE_BASE_PH' ? 'pH przed bazą' : type === 'FINAL_EC' ? 'Końcowe EC' : 'Końcowe pH';
  return <div className="mt-3 flex max-w-xs items-center gap-2"><Gauge className="h-4 w-4 text-cyan-300" /><input className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm" type="number" step="0.01" min="0" max={type === 'FINAL_EC' ? 20 : 14} placeholder={label} value={measurements[key] ?? ''} onChange={event => onChange(key, event.target.value)} /></div>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><label className="text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</label><select className="mt-2 w-full bg-black px-2 py-2 text-sm outline-none" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{plLabel(option)}</option>)}</select></div>;
}

function StatusBadge({ text, ok }: { text: string; ok: boolean }) {
  return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{text}</span>;
}

function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`flex gap-2 rounded-lg border p-2 text-xs ${error ? 'border-red-500/20 bg-red-500/5 text-red-200' : 'border-emerald-500/15 bg-emerald-500/5 text-emerald-100'}`}>{error ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}<span>{text}</span></div>;
}
