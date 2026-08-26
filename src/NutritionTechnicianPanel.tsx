import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { DecisionScenario } from './evidenceMatrix';
import { resolveManufacturerProfile, type ManufacturerProfileSelection } from './manufacturerProfiles';
import { buildMediumIdentityState } from './mediumState';
import { DEFAULT_CHANGE_CONTROL_POLICY, type ChangeControlPolicy } from './nutritionAuditLock';
import { resolveNutritionConflicts } from './nutritionConflictResolver';
import { evaluateNutritionDecisionKernel } from './nutritionDecisionKernel';
import { type IrrigationObservationEvent, type TrendPolicy } from './nutritionObservationHistory';
import { buildObservedNutritionState, type SubstrateEcMethod } from './observedNutritionState';
import { buildWeeklyNutritionPlan, compareScenario } from './nutritionTechnician';
import { RELEASE_SECURITY_GATE } from './releaseStatus';
import { useAppStore } from './store';
import { GrowthStage, WaterType } from './types';
import { plBoolean, plLabel, plPhrase } from './uiPolish';
import { buildWaterChemistryState } from './waterChemistry';

const OBSERVATION_KEY = 'argus_nutrition_observations_v1';
const SCENARIOS: Array<{ id: DecisionScenario; label: string }> = [
  { id: 'BASELINE', label: 'Dlaczego' },
  { id: 'LESS', label: 'Mniej' },
  { id: 'MORE', label: 'Więcej' },
  { id: 'OMIT', label: 'Pomiń' },
];
const stageMaxWeek = (stage: GrowthStage) => stage === GrowthStage.SEEDLING ? 2 : stage === GrowthStage.VEG ? 4 : stage === GrowthStage.BLOOM ? 8 : 1;

export default function NutritionTechnicianPanel() {
  const store = useAppStore();
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [week, setWeek] = useState(1);
  const [profileSelection, setProfileSelection] = useState<ManufacturerProfileSelection>('AUTO');
  const [usesLed, setUsesLed] = useState(true);
  const [waterType, setWaterType] = useState<WaterType>(store.currentWaterProfile);
  const [sourceEc, setSourceEc] = useState('');
  const [waterPh, setWaterPh] = useState('');
  const [calcium, setCalcium] = useState('');
  const [magnesium, setMagnesium] = useState('');
  const [alkalinity, setAlkalinity] = useState('');
  const [mediumName, setMediumName] = useState('');
  const [initialChargeKnown, setInitialChargeKnown] = useState(false);
  const [perlitePct, setPerlitePct] = useState('');
  const [potVolume, setPotVolume] = useState('');
  const [preparedEc, setPreparedEc] = useState('');
  const [finalPh, setFinalPh] = useState('');
  const [runoffEc, setRunoffEc] = useState('');
  const [runoffFraction, setRunoffFraction] = useState('');
  const [substrateEc, setSubstrateEc] = useState('');
  const [substrateMethod, setSubstrateMethod] = useState<SubstrateEcMethod>('UNKNOWN');
  const [dryback, setDryback] = useState('');
  const [meterModel, setMeterModel] = useState('');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [samplingProtocol, setSamplingProtocol] = useState('');
  const [minimumSamples, setMinimumSamples] = useState('');
  const [maxDelta, setMaxDelta] = useState('');
  const [observationWindowHours, setObservationWindowHours] = useState('');
  const [stopCriteriaDefined, setStopCriteriaDefined] = useState(false);
  const [rollbackCriteriaDefined, setRollbackCriteriaDefined] = useState(false);
  const [physiologicalLockoutExcluded, setPhysiologicalLockoutExcluded] = useState(false);
  const [finalEcConfirmed, setFinalEcConfirmed] = useState(false);
  const [finalPhConfirmed, setFinalPhConfirmed] = useState(false);
  const [humanApproved, setHumanApproved] = useState(false);
  const [objective, setObjective] = useState<'STABILITY' | 'QUALITY' | 'YIELD' | 'RECOVERY' | 'UNKNOWN'>('STABILITY');
  const [riskTolerance, setRiskTolerance] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'UNSET'>('LOW');
  const [observations, setObservations] = useState<IrrigationObservationEvent[]>(loadObservations);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DecisionScenario>('BASELINE');

  useEffect(() => {
    try { localStorage.setItem(OBSERVATION_KEY, JSON.stringify(observations.slice(-100))); } catch { /* fail closed: persistence is optional */ }
  }, [observations]);

  const profile = useMemo(() => resolveManufacturerProfile(profileSelection, usesLed), [profileSelection, usesLed]);
  const numericSourceEc = numberOrUndefined(sourceEc);
  const numericFinalPh = numberOrUndefined(finalPh);
  const numericPreparedEc = numberOrUndefined(preparedEc);

  const water = useMemo(() => buildWaterChemistryState({
    backgroundEc: numericSourceEc,
    pH: numberOrUndefined(waterPh),
    calciumMgL: numberOrUndefined(calcium),
    magnesiumMgL: numberOrUndefined(magnesium),
    alkalinityMmolLToPh43: numberOrUndefined(alkalinity),
  }, true), [numericSourceEc, waterPh, calcium, magnesium, alkalinity]);

  const medium = useMemo(() => buildMediumIdentityState({
    productName: mediumName.trim() || undefined,
    initialChargeKnown,
    perlitePct: numberOrUndefined(perlitePct),
    soilOrPeatPct: perlitePct.trim() ? Math.max(0, 100 - (numberOrUndefined(perlitePct) ?? 0)) : undefined,
    potVolumeL: numberOrUndefined(potVolume),
  }), [mediumName, initialChargeKnown, perlitePct, potVolume]);

  const observed = useMemo(() => buildObservedNutritionState({
    measuredPh: numericFinalPh,
    sourceEc: numericSourceEc,
    preparedInputEc: numericPreparedEc,
    runoffEc: numberOrUndefined(runoffEc),
    runoffFractionPct: numberOrUndefined(runoffFraction),
    substrateEc: numberOrUndefined(substrateEc),
    substrateEcMethod: substrateMethod,
    drybackPct: numberOrUndefined(dryback),
    perlitePct: numberOrUndefined(perlitePct),
    potVolumeL: numberOrUndefined(potVolume),
    measurementQuality: {
      meterModel: meterModel.trim() || undefined,
      calibrationDate: calibrationDate || undefined,
      sampleTimestamp: new Date().toISOString(),
      samplingProtocol: samplingProtocol.trim() || undefined,
    },
  }), [numericFinalPh, numericSourceEc, numericPreparedEc, runoffEc, runoffFraction, substrateEc, substrateMethod, dryback, perlitePct, potVolume, meterModel, calibrationDate, samplingProtocol]);

  const plan = useMemo(() => buildWeeklyNutritionPlan({
    stage,
    week,
    waterType,
    backgroundEc: numericSourceEc,
    measuredPh: numericFinalPh,
    medium: 'TERRA_SOIL_PERLITE',
    manufacturerProfile: profileSelection,
    environment: { usesLed },
    scheduleProfileResolved: false,
  }), [stage, week, waterType, numericSourceEc, numericFinalPh, profileSelection, usesLed]);

  const conflictResolution = useMemo(() => resolveNutritionConflicts({
    profile,
    stage,
    week,
    productIds: plan.products.map(product => product.productId),
    waterType,
    backgroundEc: numericSourceEc,
  }), [profile, stage, week, plan.products, waterType, numericSourceEc]);

  const trendPolicy: TrendPolicy = useMemo(() => ({
    minimumRepeatableSamples: integerOrUndefined(minimumSamples),
    requireSameMeasurementMethod: true,
  }), [minimumSamples]);

  const changeControl: ChangeControlPolicy = useMemo(() => ({
    ...DEFAULT_CHANGE_CONTROL_POLICY,
    maxDeltaPct: numberOrUndefined(maxDelta),
    observationWindowHours: numberOrUndefined(observationWindowHours),
    stopCriteriaDefined,
    rollbackCriteriaDefined,
  }), [maxDelta, observationWindowHours, stopCriteriaDefined, rollbackCriteriaDefined]);

  const manufacturerConflictFree = conflictResolution.findings.every(finding => finding.severity !== 'BLOCK' && finding.code !== 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT');

  const kernel = useMemo(() => evaluateNutritionDecisionKernel({
    profile,
    manufacturerConflictFree,
    water,
    medium,
    observed,
    history: observations,
    trendPolicy,
    changeControl,
    physiologicalLockoutExcluded,
    finalInputEcConfirmed: finalEcConfirmed && numericPreparedEc !== undefined,
    finalPhConfirmed: finalPhConfirmed && numericFinalPh !== undefined,
    securityGatePassed: RELEASE_SECURITY_GATE.passed,
    humanApproved,
    objectiveAndRisk: { objective, riskTolerance },
  }), [profile, manufacturerConflictFree, water, medium, observed, observations, trendPolicy, changeControl, physiologicalLockoutExcluded, finalEcConfirmed, numericPreparedEc, finalPhConfirmed, numericFinalPh, humanApproved, objective, riskTolerance]);

  const scenarioPack = useMemo(() => selectedProductId ? compareScenario(selectedProductId, {
    stage,
    week,
    waterType,
    backgroundEc: numericSourceEc,
    measuredPh: numericFinalPh,
    medium: 'TERRA_SOIL_PERLITE',
    manufacturerProfile: profileSelection,
    environment: { usesLed },
    scheduleProfileResolved: false,
  }) : null, [selectedProductId, stage, week, waterType, numericSourceEc, numericFinalPh, profileSelection, usesLed]);
  const selectedDecision = scenarioPack ? scenario === 'BASELINE' ? scenarioPack.baseline : scenario === 'LESS' ? scenarioPack.less : scenario === 'MORE' ? scenarioPack.more : scenarioPack.omit : null;

  const addObservation = () => {
    const hasComparable = observed.preparedInputEc !== undefined || observed.runoffEc !== undefined || observed.substrateEc !== undefined;
    if (!hasComparable) return;
    setObservations(current => [...current, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      sourceEc: observed.sourceEc,
      inputEcGross: observed.preparedInputEc,
      finalPh: observed.measuredPh,
      runoffFractionPct: observed.runoffFractionPct,
      runoffEc: observed.runoffEc,
      substrateEc: observed.substrateEc,
      substrateEcMethod: observed.substrateEcMethod !== 'UNKNOWN' ? observed.substrateEcMethod : undefined,
      drybackPct: observed.drybackPct,
    }].slice(-100));
  };

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-5 py-6">
      <section className={`rounded-2xl border p-5 ${kernel.disposition === 'PROCEED' ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/25 bg-amber-500/5'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]"><ShieldCheck className="h-4 w-4" /> Rdzeń Decyzyjny</div>
            <div className="mt-2 text-2xl font-black">{plLabel(kernel.disposition)}</div>
          </div>
          <Badge text={RELEASE_SECURITY_GATE.passed ? 'KONTROLA BEZPIECZEŃSTWA ZALICZONA' : 'KONTROLA BEZPIECZEŃSTWA OCZEKUJE'} ok={RELEASE_SECURITY_GATE.passed} />
        </div>
        <p className="mt-2 text-sm text-white/55">Technik nie ma osobnej drogi do Planera. Najpierw przechodzi przez pełny rdzeń źródeł, wody, podłoża, pomiarów, trendu, kontroli zmian i zatwierdzenia przez człowieka.</p>
        {kernel.readiness.reasons.length > 0 && <div className="mt-4 grid gap-2 md:grid-cols-2">{kernel.readiness.reasons.map(reason => <div key={reason.code} className="rounded-xl border border-amber-500/15 bg-black/20 p-3 text-xs"><strong className="text-amber-200">Powód blokady</strong><div className="mt-1 text-white/55">{plPhrase(reason.message)}</div>{reason.minimumNextMeasurement && <div className="mt-1 text-cyan-200/70">Następny krok: {plPhrase(reason.minimumNextMeasurement)}</div>}</div>)}</div>}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Control label="Faza"><Select value={stage} onChange={value => { setStage(value as GrowthStage); setWeek(1); }} options={[GrowthStage.SEEDLING, GrowthStage.VEG, GrowthStage.BLOOM, GrowthStage.FLUSH]} /></Control>
        <Control label="Tydzień"><Select value={String(week)} onChange={value => setWeek(Number(value))} options={Array.from({ length: stageMaxWeek(stage) }, (_, index) => String(index + 1))} /></Control>
        <Control label="Profil producenta"><Select value={profileSelection} onChange={value => setProfileSelection(value as ManufacturerProfileSelection)} options={['AUTO', 'TERRA_LED_2024', 'TERRA_LEGACY_HARD_SOFT']} /></Control>
        <Control label="Profil wody"><Select value={waterType} onChange={value => setWaterType(value as WaterType)} options={[WaterType.CUSTOM, WaterType.SOFT, WaterType.HARD, WaterType.RO]} /></Control>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="1. Woda" subtitle="Bieżąca próbka ma pierwszeństwo; analiza miejska pozostaje tylko punktem odniesienia.">
          <Field label="EC wody źródłowej mS/cm" value={sourceEc} onChange={setSourceEc} />
          <Field label="pH wody" value={waterPh} onChange={setWaterPh} />
          <Field label="Wapń Ca mg/L" value={calcium} onChange={setCalcium} />
          <Field label="Magnez Mg mg/L" value={magnesium} onChange={setMagnesium} />
          <Field label="Alkaliczność mmol/L" value={alkalinity} onChange={setAlkalinity} />
        </Card>
        <Card title="2. Podłoże" subtitle="Tożsamość i początkowy ładunek nie są zgadywane.">
          <TextField label="Produkt / nazwa podłoża" value={mediumName} onChange={setMediumName} />
          <Toggle label="Znany początkowy ładunek nawozowy" checked={initialChargeKnown} onChange={setInitialChargeKnown} />
          <Field label="Perlit %" value={perlitePct} onChange={setPerlitePct} />
          <Field label="Objętość donicy L" value={potVolume} onChange={setPotVolume} />
        </Card>
        <Card title="3. Pomiary" subtitle="EC bez znanej metody i jakości pomiaru nie dostaje prawa do sterowania decyzją.">
          <Field label="Końcowe EC pożywki" value={preparedEc} onChange={setPreparedEc} />
          <Field label="Końcowe pH" value={finalPh} onChange={setFinalPh} />
          <Field label="EC odpływu" value={runoffEc} onChange={setRunoffEc} />
          <Field label="Odpływ %" value={runoffFraction} onChange={setRunoffFraction} />
          <Field label="EC podłoża" value={substrateEc} onChange={setSubstrateEc} />
          <Control label="Metoda pomiaru EC podłoża"><Select value={substrateMethod} onChange={value => setSubstrateMethod(value as SubstrateEcMethod)} options={['UNKNOWN', 'POUR_THROUGH', 'PORE_WATER', 'SME', 'IN_SITU_SENSOR', 'OTHER']} /></Control>
          <Field label="Przesuszenie %" value={dryback} onChange={setDryback} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="4. Jakość pomiaru">
          <TextField label="Model miernika" value={meterModel} onChange={setMeterModel} />
          <TextField label="Data kalibracji" value={calibrationDate} onChange={setCalibrationDate} type="date" />
          <TextField label="Protokół pobrania próbki" value={samplingProtocol} onChange={setSamplingProtocol} />
          <button type="button" onClick={addObservation} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm font-bold text-cyan-200"><Plus className="h-4 w-4" />Dodaj bieżący pomiar do historii</button>
          <div className="mt-2 flex items-center justify-between text-xs text-white/40"><span>Historia: {observations.length}</span>{observations.length > 0 && <button type="button" onClick={() => setObservations([])} className="flex items-center gap-1 text-red-300"><Trash2 className="h-3 w-3" />wyczyść</button>}</div>
        </Card>
        <Card title="5. Trend + kontrola zmian">
          <Field label="Minimalna liczba porównywalnych próbek" value={minimumSamples} onChange={setMinimumSamples} />
          <Field label="Maksymalna zmiana %" value={maxDelta} onChange={setMaxDelta} />
          <Field label="Okno obserwacji h" value={observationWindowHours} onChange={setObservationWindowHours} />
          <Toggle label="Kryteria ZATRZYMANIA zdefiniowane" checked={stopCriteriaDefined} onChange={setStopCriteriaDefined} />
          <Toggle label="Kryteria WYCOFANIA zdefiniowane" checked={rollbackCriteriaDefined} onChange={setRollbackCriteriaDefined} />
        </Card>
        <Card title="6. Autoryzacja">
          <Toggle label="Wykluczono blokadę pobierania / problem fizjologiczny" checked={physiologicalLockoutExcluded} onChange={setPhysiologicalLockoutExcluded} />
          <Toggle label="Końcowe EC potwierdzone" checked={finalEcConfirmed} onChange={setFinalEcConfirmed} />
          <Toggle label="Końcowe pH potwierdzone" checked={finalPhConfirmed} onChange={setFinalPhConfirmed} />
          <Toggle label="Zatwierdzenie przez człowieka" checked={humanApproved} onChange={setHumanApproved} />
          <Toggle label="Oświetlenie LED" checked={usesLed} onChange={setUsesLed} />
          <Control label="Cel działania"><Select value={objective} onChange={value => setObjective(value as typeof objective)} options={['STABILITY', 'QUALITY', 'YIELD', 'RECOVERY', 'UNKNOWN']} /></Control>
          <Control label="Tolerancja ryzyka"><Select value={riskTolerance} onChange={value => setRiskTolerance(value as typeof riskTolerance)} options={['LOW', 'MEDIUM', 'HIGH', 'UNSET']} /></Control>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Card title="Podgląd dowodów" subtitle={`${profile.label} · status audytu: ${plLabel(profile.auditStatus)} · zamrożony zestaw źródeł: ${plBoolean(profile.snapshotFrozen)}`}>
            <div className="space-y-2">{conflictResolution.findings.map(finding => <div key={`${finding.code}-${finding.title}`} className={`rounded-xl border p-3 text-xs ${finding.severity === 'BLOCK' ? 'border-red-500/20 bg-red-500/5' : finding.severity === 'WARN' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10 bg-black/20'}`}><strong>{plLabel(finding.severity)} · {plPhrase(finding.title)}</strong><div className="mt-1 text-white/45">{plPhrase(finding.action)}</div></div>)}</div>
          </Card>
        </div>
        <div className="lg:col-span-7">
          <Card title="DLACZEGO / MNIEJ / WIĘCEJ / POMIŃ" subtitle="Warstwa wyjaśniająca. Sama nie nadaje prawa do fizycznego wykonania.">
            <div className="flex flex-wrap gap-2">{plan.products.map(product => <button key={product.productId} type="button" onClick={() => setSelectedProductId(product.productId)} className={`rounded-lg border px-2 py-1 text-xs ${selectedProductId === product.productId ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 bg-black/20'}`}>{store.getProduct(product.productId)?.name ?? product.productId}</button>)}</div>
            {selectedProductId && <div className="mt-3 flex gap-1">{SCENARIOS.map(item => <button key={item.id} type="button" onClick={() => setScenario(item.id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${scenario === item.id ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/50'}`}>{item.label}</button>)}</div>}
            {selectedDecision && <div className="mt-4 space-y-3"><div className="flex flex-wrap gap-2"><Badge text={plLabel(selectedDecision.status)} ok={selectedDecision.status === 'VERIFIED'} /><Badge text={`Pewność: ${plLabel(selectedDecision.confidence)}`} ok={selectedDecision.confidence === 'HIGH'} /></div>{selectedDecision.decisionText.map((text, index) => <p key={`d-${index}`} className="text-sm leading-relaxed text-white/60">{plPhrase(text)}</p>)}{selectedDecision.hardRules.length > 0 && <List title="Twarde reguły" items={selectedDecision.hardRules.map(plPhrase)} />}{selectedDecision.unresolved.length > 0 && <List title="Nierozstrzygnięte" items={selectedDecision.unresolved.map(plPhrase)} warning />}{selectedDecision.refs.length > 0 && <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="mb-2 flex items-center gap-1 text-xs font-bold"><BookOpen className="h-3.5 w-3.5" />Źródła</div>{selectedDecision.refs.map(ref => <div key={ref.id} className="text-[11px] text-white/45">{plLabel(ref.sourceType)} · {ref.title} · zastosowanie: {plLabel(ref.applicability)} · pewność: {plLabel(ref.confidence)}</div>)}</div>}</div>}
          </Card>
        </div>
      </section>
    </main>
  );
}

function numberOrUndefined(raw: string) { if (!raw.trim()) return undefined; const value = Number(raw); return Number.isFinite(value) ? value : undefined; }
function integerOrUndefined(raw: string) { const value = numberOrUndefined(raw); return value !== undefined && Number.isInteger(value) && value > 0 ? value : undefined; }
function loadObservations(): IrrigationObservationEvent[] { try { const raw = JSON.parse(localStorage.getItem(OBSERVATION_KEY) ?? '[]'); if (!Array.isArray(raw)) return []; return raw.filter(item => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.timestamp === 'string').slice(-100); } catch { return []; } }
function Control({ label, children }: { label: string; children: React.ReactNode }) { return <label className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}<div className="mt-2">{children}</div></label>; }
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-black">{title}</h3>{subtitle && <p className="mt-1 text-xs text-white/35">{subtitle}</p>}<div className="mt-4 space-y-2">{children}</div></section>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs text-white/40">{label}<input className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm text-white" type="number" step="0.01" value={value} onChange={event => onChange(event.target.value)} /></label>; }
function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-xs text-white/40">{label}<input className="mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" type={type} value={value} onChange={event => onChange(event.target.value)} /></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55"><span>{label}</span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /></label>; }
function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <select className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{plLabel(option)}</option>)}</select>; }
function Badge({ text, ok }: { text: string; ok: boolean }) { return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{text}</span>; }
function List({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) { return <div className={`rounded-xl border p-3 ${warning ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10 bg-black/20'}`}><div className="mb-2 flex items-center gap-1 text-xs font-bold">{warning && <AlertTriangle className="h-3.5 w-3.5" />}{title}</div><ul className="space-y-1 text-xs text-white/50">{items.map((item, index) => <li key={index}>• {item}</li>)}</ul></div>; }
