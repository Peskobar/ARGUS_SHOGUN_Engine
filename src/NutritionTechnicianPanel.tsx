import { type ReactNode, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, ChevronRight, Droplets, FlaskConical, ShieldCheck, Sprout, X } from 'lucide-react';
import { DecisionScenario } from './evidenceMatrix';
import { buildDryRunNutritionPlan } from './dryRunNutritionPlan';
import { ManufacturerProfileSelection } from './manufacturerProfiles';
import { PRODUCT_VERIFICATION } from './nutritionEvidencePolicy';
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
const waterLabel = (water: WaterType) => water === WaterType.HARD ? 'Twarda' : water === WaterType.SOFT ? 'Miękka' : water === WaterType.RO ? 'RO' : 'Kranowa / nie wiem';

function parseOptionalNumber(raw: string) {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export default function NutritionTechnicianPanel() {
  const store = useAppStore();
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [week, setWeek] = useState(1);
  const [waterType, setWaterType] = useState<WaterType>(store.currentWaterProfile);
  const [manufacturerProfile, setManufacturerProfile] = useState<ManufacturerProfileSelection>('AUTO');
  const [backgroundEcInput, setBackgroundEcInput] = useState('');
  const [leafTempInput, setLeafTempInput] = useState('');
  const [rhInput, setRhInput] = useState('');
  const [usesLed, setUsesLed] = useState(true);
  const [closedLoopCo2, setClosedLoopCo2] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DecisionScenario>('BASELINE');

  const parsedEc = parseOptionalNumber(backgroundEcInput);
  const backgroundEc = parsedEc !== undefined && parsedEc >= 0 && parsedEc <= 20 ? parsedEc : undefined;
  const leafTemperatureC = parseOptionalNumber(leafTempInput);
  const relativeHumidity = parseOptionalNumber(rhInput);

  const context = useMemo(() => ({
    stage,
    week,
    waterType,
    backgroundEc,
    medium: 'TERRA_SOIL_PERLITE',
    manufacturerProfile,
    environment: {
      leafTemperatureC,
      relativeHumidity: relativeHumidity !== undefined && relativeHumidity >= 0 && relativeHumidity <= 100 ? relativeHumidity : undefined,
      usesLed,
      closedLoopActiveCoolingWithCo2: closedLoopCo2,
    },
    scheduleProfileResolved: false,
  }), [stage, week, waterType, backgroundEc, manufacturerProfile, leafTemperatureC, relativeHumidity, usesLed, closedLoopCo2]);

  const plan = useMemo(() => buildWeeklyNutritionPlan(context), [context]);
  const dryRun = useMemo(() => buildDryRunNutritionPlan({
    stage,
    week,
    waterType,
    backgroundEc,
    usesLed,
    manufacturerProfile,
  }), [stage, week, waterType, backgroundEc, usesLed, manufacturerProfile]);

  const scenarioPack = useMemo(
    () => selectedProductId ? compareScenario(selectedProductId, context) : null,
    [selectedProductId, context],
  );
  const decision = scenarioPack
    ? scenario === 'BASELINE'
      ? scenarioPack.baseline
      : scenario === 'LESS'
        ? scenarioPack.less
        : scenario === 'MORE'
          ? scenarioPack.more
          : scenarioPack.omit
    : null;

  const changeStage = (next: GrowthStage) => {
    setStage(next);
    setWeek(1);
    setSelectedProductId(null);
  };

  const waterClassText = plan.manufacturerWaterClass === WaterType.HARD
    ? 'TWARDA wg zmierzonego EC'
    : plan.manufacturerWaterClass === WaterType.SOFT
      ? 'MIĘKKA wg zmierzonego EC'
      : plan.manufacturerWaterClass === 'BOUNDARY'
        ? 'GRANICA 0.40'
        : 'BRAK POMIARU';

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
          <ShieldCheck className="h-4 w-4" /> Technik Żywienia ARGUS · źródła + analiza
        </div>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/55">
          Producent daje dane źródłowe. ARGUS ocenia kontekst i dawki. Fizyczna kolejność mieszania jest osobną warstwą i nigdy nie zmienia kolejności zapisanej w tabeli producenta.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Control label="Faza">
          <select className="w-full bg-black px-3 py-2 text-sm outline-none" value={stage} onChange={event => changeStage(event.target.value as GrowthStage)}>
            <option value={GrowthStage.SEEDLING}>Siewki / klony</option>
            <option value={GrowthStage.VEG}>Wegetacja</option>
            <option value={GrowthStage.BLOOM}>Kwitnienie</option>
            <option value={GrowthStage.FLUSH}>Płukanie</option>
          </select>
        </Control>
        <Control label="Tydzień">
          <select className="w-full bg-black px-3 py-2 text-sm outline-none" value={week} onChange={event => setWeek(Number(event.target.value))}>
            {Array.from({ length: stageMaxWeek(stage) }, (_, index) => index + 1).map(value => <option key={value} value={value}>Tydzień {value}</option>)}
          </select>
        </Control>
        <Control label="Tabela / profil producenta" hint="AUTO wybiera profil LED przy aktywnym LED. Profile historyczne i LED nie są łączone.">
          <select className="w-full bg-black px-3 py-2 text-sm outline-none" value={manufacturerProfile} onChange={event => setManufacturerProfile(event.target.value as ManufacturerProfileSelection)}>
            <option value="AUTO">AUTO</option>
            <option value="TERRA_LED_2024">TERRA LED · zaimportowany profil</option>
            <option value="TERRA_LEGACY_HARD_SOFT">HISTORYCZNA HARD/SOFT</option>
          </select>
        </Control>
        <Control label="Profil wody" hint="To deklaracja. Zmierzony EC wody jest osobnym faktem wejściowym.">
          <select className="w-full bg-black px-3 py-2 text-sm outline-none" value={waterType} onChange={event => setWaterType(event.target.value as WaterType)}>
            <option value={WaterType.CUSTOM}>Kranowa / nie wiem</option>
            <option value={WaterType.HARD}>Twarda</option>
            <option value={WaterType.SOFT}>Miękka</option>
            <option value={WaterType.RO}>RO</option>
          </select>
        </Control>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Control label="EC wody źródłowej · mS/cm" hint="Wpisz pomiar wody przed nawozami. Pomiędzy punktami producenta ARGUS nie interpoluje procentów.">
          <input className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm outline-none focus:border-cyan-500/50" inputMode="decimal" type="number" min="0" max="20" step="0.01" placeholder="np. 0.53" value={backgroundEcInput} onChange={event => setBackgroundEcInput(event.target.value)} />
        </Control>
        <Control label="Temperatura liścia · °C" hint="Dodatkowy sygnał środowiskowy. Nie zmienia samodzielnie tabeli producenta.">
          <input className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm outline-none" inputMode="decimal" type="number" step="0.1" placeholder="np. 24.5" value={leafTempInput} onChange={event => setLeafTempInput(event.target.value)} />
        </Control>
        <Control label="Wilgotność RH · %" hint="Razem z temperaturą liścia opisuje warunki, ale nie tworzy nowej dawki z powietrza.">
          <input className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm outline-none" inputMode="numeric" type="number" min="0" max="100" step="1" placeholder="np. 60" value={rhInput} onChange={event => setRhInput(event.target.value)} />
        </Control>
        <ToggleControl label="Oświetlenie LED" checked={usesLed} onChange={setUsesLed} hint="Przy AUTO wybiera zaimportowany profil LED." />
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ToggleControl label="Obieg zamknięty + chłodzenie + CO₂" checked={closedLoopCo2} onChange={setClosedLoopCo2} hint="Sygnał kontekstowy producenta. Nie zwiększa dawki automatycznie." />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Card title="Stan wejścia" icon={<Droplets className="h-4 w-4 text-cyan-300" />}>
            <div className="space-y-3 text-sm">
              <InfoRow label="Medium" value="TERRA / SOIL + PERLIT" />
              <InfoRow label="Faza" value={`${stageLabel(stage)} · W${week}`} />
              <InfoRow label="Profil producenta" value={plan.manufacturerProfileLabel} />
              <InfoRow label="Woda" value={waterLabel(waterType)} />
              <InfoRow label="Status pomiaru wody" value={waterStatusLabel(plan.waterStatus)} />
              <InfoRow label="EC z pomiaru" value={backgroundEc === undefined ? 'BRAK' : `${backgroundEc.toFixed(2)} mS/cm`} />
              <InfoRow label="Klasa SHOGUN wg EC" value={waterClassText} />
              <InfoRow label="Reguła wody dla LED" value={plan.waterAdjustment ? `${plan.waterAdjustment.percent > 0 ? '+' : ''}${plan.waterAdjustment.percent}%` : 'NIE DOTYCZY'} />
              <InfoRow label="Sygnał intensywności" value={plan.scheduleSignals.join(' + ') || 'BRAK'} />
            </div>
          </Card>
          {plan.waterNotes.length > 0 && <Notice title="Woda · kontekst" tone="blue" lines={plan.waterNotes} />}
          {plan.systemWarnings.length > 0 && <Notice title="Blokady i zależności" tone="amber" lines={plan.systemWarnings} />}
        </div>

        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">ARGUS · dawki robocze</div>
                <div className="mt-1 text-lg font-black">{dryRun.profileLabel} · {stageLabel(stage)} W{week}</div>
                <div className="mt-1 text-[10px] text-emerald-100/45">Kolejność tej listy = kolejność wykonawcza ARGUS. Nie jest to druga tabela producenta.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge text={dryRun.readyForExecutionCandidate ? 'KANDYDAT GOTOWY' : 'KANDYDAT WSTRZYMANY'} tone={dryRun.readyForExecutionCandidate ? 'green' : 'amber'} />
                <Badge text="AUTOMATYCZNE WYKONANIE WYŁĄCZONE" tone="amber" />
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {dryRun.executionDoses.length ? dryRun.executionDoses.map((dose, index) => (
                <div key={dose.productId} className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] font-black text-emerald-300">{index + 1}</span><div className="text-sm font-bold">{store.getProduct(dose.productId)?.name ?? dose.productId}</div></div>
                  <div className="mt-1 font-mono text-sm text-emerald-200">{dose.resolvedMlPerL} ml/L</div>
                  <div className="mt-1 text-[10px] text-white/35">punkt źródłowy {dose.baselineMlPerL} · korekta {dose.adjustmentPercent > 0 ? '+' : ''}{dose.adjustmentPercent}% · {doseStatusLabel(dose.status)}</div>
                </div>
              )) : <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/35">Brak bezpośrednich punktów dla tego profilu i fazy.</div>}
            </div>
            {dryRun.conflicts.length > 0 && (
              <div className="mt-4 space-y-2">
                {dryRun.conflicts.map(conflict => (
                  <div key={`${conflict.code}-${conflict.title}`} className={`rounded-lg border p-3 text-xs ${conflict.severity === 'BLOCK' ? 'border-red-500/25 bg-red-500/10 text-red-200' : conflict.severity === 'WARN' ? 'border-amber-500/20 bg-amber-500/5 text-amber-100' : 'border-white/10 bg-white/5 text-white/55'}`}>
                    <strong>{conflictSeverityLabel(conflict.severity)} · {conflict.title}</strong>
                    <div className="mt-1">{conflict.action}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {plan.applicationProtocols.length > 0 && (
            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-300"><Sprout className="h-4 w-4" /> Protokół specjalny producenta</div>
              <div className="mt-4 space-y-3">
                {plan.applicationProtocols.map(protocol => (
                  <div key={`${protocol.productId}-${protocol.method}`} className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="flex flex-wrap items-center gap-2"><strong>{store.getProduct(protocol.productId)?.name ?? protocol.productId}</strong><Badge text={methodLabel(protocol.method)} /><Badge text={cadenceLabel(protocol.cadence)} tone="green" /></div>
                    <div className="mt-2 font-mono text-sm text-fuchsia-200">{protocol.concentrationMlPerL} ml/L{protocol.durationMinutes ? ` · ${protocol.durationMinutes} min` : ''}</div>
                    <div className="mt-2 text-xs leading-relaxed text-white/50">{protocol.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Tabela SHOGUN — kolejność źródłowa</div>
                <div className="mt-1 text-xl font-black">{stageLabel(stage)} · tydzień {week}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-cyan-100/45">To kolejność pozycji z tabeli nawożenia producenta. To nie jest kolejność dodawania preparatów do wody.</div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black text-white/45">{plan.manufacturerProducts.length} pozycji</div>
            </div>
            {!plan.manufacturerProducts.length ? (
              <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">Brak pozycji źródłowych dla tego tygodnia. System nie uzupełnia braków zgadywaniem.</div>
            ) : (
              <div className="mt-5 space-y-3">
                {plan.manufacturerProducts.map((product, index) => (
                  <ProductRow
                    key={product.productId}
                    index={index + 1}
                    decision={product}
                    name={store.getProduct(product.productId)?.name ?? product.productId}
                    onOpen={() => { setSelectedProductId(product.productId); setScenario('BASELINE'); }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Kolejność dodawania do zbiornika — ARGUS</div>
            <div className="mt-1 text-[10px] text-emerald-100/45">Ta sama pula aktywnych preparatów, ułożona przez kanoniczny silnik wykonawczy. Ta lista ma prowadzić rękę, a nie udawać tabelę producenta.</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.executionProducts.map((product, index) => (
                <span key={product.productId} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-black/40 px-3 py-2 text-xs">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 font-mono text-[9px] font-black text-emerald-300">{index + 1}</span>
                  <strong>{store.getProduct(product.productId)?.name ?? product.productId}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {selectedProductId && decision && (
        <DecisionModal
          name={store.getProduct(selectedProductId)?.name ?? selectedProductId}
          decision={decision}
          scenario={scenario}
          setScenario={setScenario}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </main>
  );
}

function Control({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="rounded-xl border border-white/10 bg-white/5 p-3"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{label}</span>{children}{hint && <span className="mt-2 block text-[10px] leading-relaxed text-white/30">{hint}</span>}</label>;
}

function ToggleControl({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  return <label className="flex cursor-pointer flex-col rounded-xl border border-white/10 bg-white/5 p-3"><span className="mb-3 block text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{label}</span><span className="flex items-center gap-3"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-5 w-5 accent-cyan-500" /><strong className={checked ? 'text-cyan-300' : 'text-white/35'}>{checked ? 'TAK' : 'NIE'}</strong></span>{hint && <span className="mt-2 block text-[10px] leading-relaxed text-white/30">{hint}</span>}</label>;
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">{icon}{title}</div>{children}</div>;
}

function Notice({ title, tone, lines }: { title: string; tone: 'blue' | 'amber'; lines: string[] }) {
  const amber = tone === 'amber';
  return <div className={`rounded-2xl border p-5 ${amber ? 'border-amber-500/20 bg-amber-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}><div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] ${amber ? 'text-amber-300' : 'text-blue-300'}`}>{amber && <AlertTriangle className="h-4 w-4" />}{title}</div><ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/60">{lines.map(line => <li key={line}>• {line}</li>)}</ul></div>;
}

function ProductRow({ index, decision, name, onOpen }: { key?: string; index: number; decision: ProductDecision; name: string; onOpen: () => void }) {
  const verification = PRODUCT_VERIFICATION[decision.productId];
  const doseLabel = decision.doseWindows.map(window => {
    const range = window.minMlPerL === window.maxMlPerL ? `${window.minMlPerL} ml/L` : `${window.minMlPerL}–${window.maxMlPerL} ml/L`;
    return window.waterType ? `${waterLabel(window.waterType)}: ${range}` : range;
  }).join(' · ') || 'brak okna dawki';

  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-black/45 p-4 text-left transition hover:border-cyan-500/35 hover:bg-cyan-500/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300"><span className="font-mono text-xs font-black">{index}</span></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{name}</span><Badge text={roleLabel(decision.role)} /><Badge text={`PEWNOŚĆ: ${confidenceLabel(decision.confidence)}`} tone={decision.confidence === 'HIGH' ? 'green' : 'amber'} /></div>
        <div className="mt-1 text-xs text-white/45">{doseLabel}</div>
        {verification && <div className="mt-2 flex flex-wrap gap-1"><TinyStatus label="dawka" value={verification.doseStatus} /><TinyStatus label="proces" value={verification.processStatus} /><TinyStatus label="skład" value={verification.compositionStatus} /></div>}
        {decision.unresolved.length > 0 && <div className="mt-2 text-[10px] text-amber-300/75">{decision.unresolved.length} nierozstrzygniętych danych</div>}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/25" />
    </button>
  );
}

function DecisionModal({ name, decision, scenario, setScenario, onClose }: { name: string; decision: ProductDecision; scenario: DecisionScenario; setScenario: (scenario: DecisionScenario) => void; onClose: () => void }) {
  const heading = scenario === 'BASELINE' ? 'Dlaczego teraz' : scenario === 'LESS' ? 'Jeżeli damy mniej' : scenario === 'MORE' ? 'Jeżeli damy więcej' : 'Jeżeli zrezygnujemy';
  const verification = PRODUCT_VERIFICATION[decision.productId];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 max-w-3xl rounded-2xl border border-white/10 bg-[#101010] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Decyzja na podstawie dowodów</div>
            <h2 className="mt-1 text-xl font-black">{name}</h2>
            <div className="mt-2 flex flex-wrap gap-2"><Badge text={roleLabel(decision.role)} /><Badge text={`PEWNOŚĆ: ${confidenceLabel(decision.confidence)}`} tone={decision.confidence === 'HIGH' ? 'green' : 'amber'} /></div>
            {verification && <div className="mt-3 flex flex-wrap gap-1"><TinyStatus label="dawka" value={verification.doseStatus} /><TinyStatus label="proces" value={verification.processStatus} /><TinyStatus label="skład" value={verification.compositionStatus} /><TinyStatus label="nauka" value={verification.scienceGuardrailStatus} /></div>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/5 p-2 text-white/45"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-2">{SCENARIOS.map(item => <button key={item.id} type="button" onClick={() => setScenario(item.id)} className={`rounded-lg border px-2 py-2 text-[10px] font-black uppercase ${scenario === item.id ? 'border-cyan-500 bg-cyan-500 text-black' : 'border-white/10 bg-black text-white/45'}`}>{item.label}</button>)}</div>
          {decision.blocked && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">Ten wariant jest domyślnie zablokowany. Ominięcie bazy wymaga jawnego potwierdzenia i alternatywnego pełnego źródła żywienia.</div>}
          <Section title={heading}>{decision.decisionText.map(text => <p key={text}>{text}</p>)}</Section>
          {decision.interactions.length > 0 && <Section title="Co jeszcze się zmienia">{decision.interactions.map(text => <p key={text}>{text}</p>)}</Section>}
          {decision.hardRules.length > 0 && <Section title="Twarde reguły" tone="amber">{decision.hardRules.map(text => <p key={text}>• {text}</p>)}</Section>}
          {decision.unresolved.length > 0 && <Section title="Czego jeszcze nie wiemy" tone="amber">{decision.unresolved.map(text => <p key={text}>• {text}</p>)}</Section>}
          <div className="mt-6 rounded-xl border border-white/10 bg-black/35 p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/40"><BookOpen className="h-4 w-4" /> Dowody</div>
            <div className="mt-3 space-y-2">{decision.refs.map(ref => <a key={ref.id} href={ref.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-white/5 bg-white/5 p-3 text-xs hover:border-cyan-500/30"><div className="font-bold text-white/70">{ref.title}</div><div className="mt-1 text-[10px] text-white/30">{sourceTypeLabel(ref.sourceType)} · {applicabilityLabel(ref.applicability)} · pewność {confidenceLabel(ref.confidence)}{ref.year ? ` · ${ref.year}` : ''}</div></a>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
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

function TinyStatus({ label, value }: { label: string; value: string }) {
  const tone = value === 'VERIFIED' ? 'text-emerald-300 bg-emerald-500/10' : value === 'PARTIAL' ? 'text-amber-300 bg-amber-500/10' : 'text-red-300 bg-red-500/10';
  return <span className={`rounded px-2 py-1 text-[9px] font-bold uppercase ${tone}`}>{label}: {verificationStatusLabel(value)}</span>;
}

function verificationStatusLabel(value?: string) {
  if (value === 'VERIFIED') return 'ZWERYFIKOWANE';
  if (value === 'PARTIAL') return 'CZĘŚCIOWE';
  if (value === 'CONFLICT') return 'KONFLIKT';
  if (value === 'UNVERIFIED') return 'NIEZWERYFIKOWANE ŹRÓDŁOWO';
  return value ? value.replaceAll('_', ' ') : 'BRAK';
}

function confidenceLabel(value: string) {
  if (value === 'HIGH') return 'WYSOKA';
  if (value === 'MEDIUM') return 'ŚREDNIA';
  if (value === 'LOW') return 'NISKA';
  return value;
}

function roleLabel(value: string) {
  const labels: Record<string, string> = {
    BASE: 'BAZA', ROOTS: 'KORZENIE', ENZYME: 'ENZYMY', SILICON: 'SILICON', CALMAG: 'CALMAG', BOOSTER: 'STYMULATOR', PK: 'PK', BIOLOGICAL: 'BIOLOGIA', OTHER: 'INNE', READY_TO_USE: 'GOTOWY DO UŻYCIA',
  };
  return labels[value] ?? value;
}

function waterStatusLabel(value: string) {
  if (value === 'MEASURED') return 'ZMIERZONA';
  if (value === 'REFERENCE_ONLY') return 'TYLKO REFERENCJA';
  return 'NIEZNANY';
}

function doseStatusLabel(value: string) {
  if (value === 'DIRECT_PREVIEW') return 'BEZPOŚREDNI PUNKT ŹRÓDŁOWY';
  if (value === 'CONDITIONAL') return 'WARUNKOWA';
  return verificationStatusLabel(value);
}

function conflictSeverityLabel(value: string) {
  if (value === 'BLOCK') return 'BLOKADA';
  if (value === 'WARN') return 'OSTRZEŻENIE';
  return 'INFORMACJA';
}

function methodLabel(value: string) {
  const labels: Record<string, string> = {
    ROOT_FEED: 'DOKORZENIOWO', FOLIAR: 'DOLISTNIE', SOAK: 'MOCZENIE', PROP_WATER: 'PODLEWANIE PROPAGACYJNE', READY_TO_SPRAY: 'GOTOWY DO UŻYCIA — BEZ ROZCIEŃCZANIA',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

function cadenceLabel(value: string) {
  const labels: Record<string, string> = { ONCE: 'JEDNORAZOWO', WEEKLY: 'CO TYDZIEŃ', EVERY_FEED: 'PRZY KAŻDYM NAWOŻENIU', WINDOW_ONLY: 'TYLKO W OKNIE', UNSPECIFIED: 'NIEOKREŚLONE' };
  return labels[value] ?? value.replaceAll('_', ' ');
}

function sourceTypeLabel(value: string) {
  const labels: Record<string, string> = { MANUFACTURER: 'PRODUCENT', SCIENCE: 'LITERATURA NAUKOWA', LOCAL: 'DANE LOKALNE', OTHER: 'INNE' };
  return labels[value] ?? value;
}

function applicabilityLabel(value: string) {
  const labels: Record<string, string> = { DIRECT: 'BEZPOŚREDNIO', SUPPORTING: 'WSPIERAJĄCO', CONTEXT: 'KONTEKST' };
  return labels[value] ?? value;
}
