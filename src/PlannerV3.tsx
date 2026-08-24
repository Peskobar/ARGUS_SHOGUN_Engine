import React, { useMemo, useState } from 'react';
import { AlertCircle, Beaker, CheckCircle2, Droplet, Play, Syringe, Wind } from 'lucide-react';
import { PHYSICAL_SYRINGES } from './data';
import { buildExecutionSteps, filterRecipes, validateRecipeContext } from './recipeEngine';
import { useAppStore } from './store';
import { allocateToolSet } from './syringeEngine';
import { FINAL_MIX, getMixingInstruction, SETTLE_SECONDS } from './mixingProtocol';
import { AllocationMode, ApplicationMethod, GrowthStage, Medium, MixingRole, WaterType } from './types';

const ALLOCATION_MODES: Array<{ value: AllocationMode; label: string; description: string }> = [
  {
    value: 'PRECISION',
    label: 'Precyzja',
    description: 'Dobiera możliwie małe i wygodne narzędzia do dokładnego odmierzania.',
  },
  {
    value: 'SPEED',
    label: 'Szybkość',
    description: 'Preferuje szybki przydział i zwykłe strzykawki. Dla małych dawek wynik może być taki sam jak w Precyzji.',
  },
  {
    value: 'MIN_TOOLS',
    label: 'Minimum',
    description: 'Próbuje ograniczać liczbę zajętych narzędzi. Gdy każda dawka mieści się w jednej strzykawce, wynik może być identyczny.',
  },
];

type ActiveTimer = {
  key: string;
  remaining: number;
  total: number;
  finished: boolean;
};

export default function PlannerV3() {
  const store = useAppStore();
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [method, setMethod] = useState<ApplicationMethod>(ApplicationMethod.ROOT_FEED);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [volume, setVolume] = useState(8);
  const [directUseVolumeMl, setDirectUseVolumeMl] = useState(0);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('PRECISION');
  const [executionActive, setExecutionActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [preBasePhGateDone, setPreBasePhGateDone] = useState(false);
  const [preBasePh, setPreBasePh] = useState('');
  const [finalMixDone, setFinalMixDone] = useState(false);
  const [settleDone, setSettleDone] = useState(false);
  const [finalGateDone, setFinalGateDone] = useState(false);
  const [finalEc, setFinalEc] = useState('');
  const [finalPh, setFinalPh] = useState('');
  const [executionMessage, setExecutionMessage] = useState('');

  const availableRecipes = useMemo(
    () => filterRecipes(store.recipes, {
      medium: store.currentMedium,
      method,
      stage,
      waterType: store.currentWaterProfile,
    }),
    [store.recipes, store.currentMedium, store.currentWaterProfile, method, stage],
  );

  React.useEffect(() => {
    if (!availableRecipes.length) {
      setSelectedRecipeId('');
      return;
    }
    if (!availableRecipes.some(recipe => recipe.id === selectedRecipeId)) {
      setSelectedRecipeId(availableRecipes[0].id);
    }
  }, [availableRecipes, selectedRecipeId]);

  React.useEffect(() => {
    setExecutionActive(false);
    setCompletedSteps([]);
    setActiveTimer(null);
    setPreBasePhGateDone(false);
    setPreBasePh('');
    setFinalMixDone(false);
    setSettleDone(false);
    setFinalGateDone(false);
    setFinalEc('');
    setFinalPh('');
    setExecutionMessage('');
  }, [
    selectedRecipeId,
    volume,
    directUseVolumeMl,
    allocationMode,
    store.currentMedium,
    store.currentWaterProfile,
    method,
    stage,
  ]);

  React.useEffect(() => {
    if (!activeTimer || activeTimer.finished || activeTimer.remaining <= 0) return;

    const timeout = window.setTimeout(() => {
      setActiveTimer(current => {
        if (!current) return current;
        const next = Math.max(0, current.remaining - 1);
        if (next === 0) {
          const vibration = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
          vibration.vibrate?.([120, 80, 120]);
          return { ...current, remaining: 0, finished: true };
        }
        return { ...current, remaining: next };
      });
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [activeTimer]);

  const selectedRecipe = availableRecipes.find(recipe => recipe.id === selectedRecipeId);
  const executionSteps = useMemo(
    () => selectedRecipe ? buildExecutionSteps(selectedRecipe, store.inventory) : [],
    [selectedRecipe, store.inventory],
  );

  // This UI now implements both mandatory checkpoints, so the validator may
  // explicitly treat canonical execution gates as integrated.
  const warnings = useMemo(
    () => selectedRecipe
      ? validateRecipeContext(selectedRecipe, store.inventory, {
          medium: store.currentMedium,
          method,
          canonicalExecutionGatesIntegrated: true,
        })
      : [],
    [selectedRecipe, store.inventory, store.currentMedium, method],
  );

  const isReadyToUse = selectedRecipe?.method === ApplicationMethod.READY_TO_SPRAY;

  const toolSet = useMemo(() => {
    if (!selectedRecipe || isReadyToUse) {
      return allocateToolSet([], PHYSICAL_SYRINGES, allocationMode);
    }
    return allocateToolSet(
      executionSteps.map(step => ({
        productId: step.product.id,
        volumeMl: step.ingredient.concentration * volume,
      })),
      PHYSICAL_SYRINGES,
      allocationMode,
    );
  }, [selectedRecipe, isReadyToUse, executionSteps, volume, allocationMode]);

  const allocationSignatures = useMemo(() => {
    if (!selectedRecipe || isReadyToUse) return [];
    return ALLOCATION_MODES.map(mode => {
      const result = allocateToolSet(
        executionSteps.map(step => ({
          productId: step.product.id,
          volumeMl: step.ingredient.concentration * volume,
        })),
        PHYSICAL_SYRINGES,
        mode.value,
      );
      return executionSteps.map(step =>
        (result.assignments[step.product.id] ?? [])
          .map(tool => `${tool.toolTypeId}:${tool.amount}`)
          .join('|'),
      ).join('||');
    });
  }, [selectedRecipe, isReadyToUse, executionSteps, volume]);

  const modesAreIdentical = allocationSignatures.length > 1
    && new Set(allocationSignatures).size === 1;
  const selectedMode = ALLOCATION_MODES.find(mode => mode.value === allocationMode)!;

  const inventoryShortages = useMemo(() => {
    if (!selectedRecipe) return [];
    return executionSteps.flatMap(step => {
      const required = isReadyToUse ? directUseVolumeMl : step.ingredient.concentration * volume;
      if (required <= step.product.remainingCapacity + 0.005) return [];
      return [{
        productId: step.product.id,
        productName: step.product.name,
        required,
        available: step.product.remainingCapacity,
      }];
    });
  }, [selectedRecipe, executionSteps, isReadyToUse, directUseVolumeMl, volume]);

  const totalMl = isReadyToUse
    ? directUseVolumeMl
    : executionSteps.reduce((sum, step) => sum + step.ingredient.concentration * volume, 0);

  const directUseQuantityMissing = Boolean(isReadyToUse) && directUseVolumeMl <= 0;

  const canStart = Boolean(selectedRecipe)
    && warnings.length === 0
    && toolSet.complete
    && executionSteps.length > 0
    && inventoryShortages.length === 0
    && !directUseQuantityMissing;

  const allStepsCompleted = executionSteps.length > 0
    && completedSteps.length === executionSteps.length;

  const requiresFinalMix = Boolean(selectedRecipe) && !isReadyToUse;
  const hasSilicon = selectedRecipe?.method === ApplicationMethod.ROOT_FEED
    && executionSteps.some(step => step.product.mixingRole === MixingRole.SILICON);
  const siliconCompleted = executionSteps
    .filter(step => step.product.mixingRole === MixingRole.SILICON)
    .every(step => completedSteps.includes(step.product.id));
  const preBaseGatePending = Boolean(hasSilicon && siliconCompleted && !preBasePhGateDone);

  const readyToFinalize = Boolean(selectedRecipe)
    && executionActive
    && allStepsCompleted
    && (!requiresFinalMix || (finalMixDone && settleDone && finalGateDone));

  const startTimer = (key: string, seconds: number) => {
    setActiveTimer({
      key,
      remaining: seconds,
      total: seconds,
      finished: seconds === 0,
    });
  };

  const startExecution = () => {
    if (!canStart) return;
    setCompletedSteps([]);
    setActiveTimer(null);
    setPreBasePhGateDone(false);
    setPreBasePh('');
    setFinalMixDone(false);
    setSettleDone(false);
    setFinalGateDone(false);
    setFinalEc('');
    setFinalPh('');
    setExecutionActive(true);
    setExecutionMessage('Wykonanie aktywne. Dodawaj i mieszaj tylko aktualnie odblokowany krok.');
  };

  const startStepMixing = (productId: string, index: number) => {
    if (!executionActive || index !== completedSteps.length || activeTimer || preBaseGatePending) return;
    const step = executionSteps[index];
    if (!step || step.product.id !== productId) return;
    const instruction = getMixingInstruction(step.product.mixingRole);
    startTimer(`step:${productId}`, instruction.seconds);
  };

  const confirmStep = (productId: string, index: number) => {
    const key = `step:${productId}`;
    if (!executionActive || index !== completedSteps.length) return;
    if (!activeTimer || activeTimer.key !== key || !activeTimer.finished) return;
    setCompletedSteps(previous => [...previous, productId]);
    setActiveTimer(null);
    if (executionSteps[index]?.product.mixingRole === MixingRole.SILICON) {
      setExecutionMessage('Silicon wymieszany. Następny produkt jest zablokowany do wykonania punktu kontrolnego pH.');
    }
  };

  const confirmPreBasePhGate = () => {
    const value = Number(preBasePh);
    if (!preBaseGatePending || !Number.isFinite(value) || value <= 0 || value > 14) return;
    setPreBasePhGateDone(true);
    setExecutionMessage(`Punkt kontrolny pH po Silicon zapisany: ${value.toFixed(2)}. Możesz przejść do następnego preparatu.`);
  };

  const startFinalMix = () => {
    if (!executionActive || !allStepsCompleted || finalMixDone || activeTimer || preBaseGatePending) return;
    startTimer('final', FINAL_MIX.seconds);
  };

  const confirmFinalMix = () => {
    if (!activeTimer || activeTimer.key !== 'final' || !activeTimer.finished) return;
    setFinalMixDone(true);
    startTimer('settle', SETTLE_SECONDS);
    setExecutionMessage('Mieszanie końcowe potwierdzone. Zostaw roztwór w spokoju przed końcowym pomiarem EC/pH.');
  };

  const confirmSettle = () => {
    if (!activeTimer || activeTimer.key !== 'settle' || !activeTimer.finished) return;
    setSettleDone(true);
    setActiveTimer(null);
    setExecutionMessage('Stabilizacja zakończona. Wykonaj końcowy pomiar EC i pH.');
  };

  const confirmFinalGate = () => {
    const ec = Number(finalEc);
    const ph = Number(finalPh);
    if (!settleDone || !Number.isFinite(ec) || ec < 0 || ec > 20 || !Number.isFinite(ph) || ph <= 0 || ph > 14) return;
    setFinalGateDone(true);
    setExecutionMessage(`Końcowy punkt kontrolny zapisany: EC ${ec.toFixed(2)} mS/cm · pH ${ph.toFixed(2)}. Mieszankę można zakończyć i zapisać.`);
  };

  const finalizeExecution = () => {
    if (!selectedRecipe || !readyToFinalize) return;

    executionSteps.forEach(step => {
      const amount = isReadyToUse ? directUseVolumeMl : step.ingredient.concentration * volume;
      if (amount > 0) store.deductFromInventory(step.product.id, amount);
    });

    store.addHistoryItem({
      id: crypto.randomUUID(),
      date: new Date().toLocaleString(),
      volume: isReadyToUse ? directUseVolumeMl / 1000 : volume,
      recipeId: selectedRecipe.id,
      method: selectedRecipe.method,
      doses: Object.fromEntries(selectedRecipe.ingredients.map(i => [i.productId, i.concentration])),
      totalMl,
    });

    setExecutionActive(false);
    setActiveTimer(null);
    setExecutionMessage('Gotowe. Operacja zapisana w historii, a stan magazynu zaktualizowany.');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Kontrola bezpieczeństwa ARGUS · timer mieszania</div>
        <div className="mt-1 text-sm text-white/55">Dodanie preparatu, fizyczne mieszanie, punkt kontrolny i ręczne potwierdzenie są osobnymi krokami. Techniczna nazwa warstwy: Reality Lock.</div>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">FERM CDM1138 · profil operacyjny 5–10 L</div>
        <div className="mt-2 grid gap-2 text-xs text-white/55 sm:grid-cols-3">
          <div><strong className="text-white/80">Wiertarka:</strong> 12 V · 0–650 obr./min</div>
          <div><strong className="text-white/80">Cel:</strong> pełny obieg bez piany</div>
          <div><strong className="text-white/80">Wir:</strong> nie odsłaniać dna</div>
        </div>
        <div className="mt-2 text-[10px] leading-relaxed text-white/35">To czasy operacyjne do procesu ARGUS, nie deklaracje producenta nawozu. Bambus lub inne mieszadło musi pracować prosto i bez bicia.</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ContextSelect
          label="Medium"
          value={store.currentMedium}
          onChange={v => store.updateMedium(v as Medium)}
          hint="Ziemia z perlitem nadal należy do profilu TERRA / SOIL."
        >
          <option value={Medium.TERRA}>TERRA / SOIL + PERLIT</option>
          <option value={Medium.COCO}>COCO</option>
          <option value={Medium.HYDRO}>HYDRO</option>
          <option value={Medium.CUSTOM}>WŁASNE MEDIUM</option>
        </ContextSelect>

        <ContextSelect
          label="Woda"
          value={store.currentWaterProfile}
          onChange={v => store.updateWater(v as WaterType)}
          hint="Jeśli nie znasz parametrów kranówki, zostaw profil nieznany."
        >
          <option value={WaterType.CUSTOM}>Kranowa - nie wiem / własna</option>
          <option value={WaterType.SOFT}>Kranowa miękka</option>
          <option value={WaterType.HARD}>Kranowa twarda</option>
          <option value={WaterType.RO}>RO / demineralizowana</option>
        </ContextSelect>

        <ContextSelect label="Faza" value={stage} onChange={v => setStage(v as GrowthStage)}>
          <option value={GrowthStage.SEEDLING}>Siewki / Klony</option>
          <option value={GrowthStage.VEG}>Wegetacja</option>
          <option value={GrowthStage.BLOOM}>Kwitnienie</option>
          <option value={GrowthStage.FLUSH}>Płukanie</option>
        </ContextSelect>

        <ContextSelect
          label="Metoda"
          value={method}
          onChange={v => setMethod(v as ApplicationMethod)}
          hint="Brak receptury oznacza brak danych dla danego kontekstu."
        >
          <option value={ApplicationMethod.ROOT_FEED}>Nawożenie korzeniowe</option>
          <option value={ApplicationMethod.FOLIAR}>Oprysk dolistny</option>
          <option value={ApplicationMethod.READY_TO_SPRAY}>Gotowy do użycia — bez rozcieńczania</option>
          <option value={ApplicationMethod.SOAK}>Moczenie / namaczanie</option>
          <option value={ApplicationMethod.MEDIA_TREATMENT}>Dodatek do medium / podłoża</option>
        </ContextSelect>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Receptura</h2>
            <div className="mt-4 space-y-2">
              {!availableRecipes.length && (
                <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-white/35">
                  Brak receptur dla tego kontekstu. Nie zgadujemy dawek.
                </div>
              )}
              {availableRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedRecipeId === recipe.id
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-white/10 bg-black/40 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold">{recipe.name}</span>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                      recipe.verificationStatus === 'VERIFIED'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : recipe.verificationStatus === 'CONFLICT'
                          ? 'bg-red-500/15 text-red-300'
                          : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {verificationLabel(recipe.verificationStatus)}
                    </span>
                  </div>
                  {recipe.source && <div className="mt-2 text-[10px] text-white/35">Źródło: {recipe.source}{recipe.sourceDate ? ` · ${recipe.sourceDate}` : ''}</div>}
                </button>
              ))}
            </div>

            {selectedRecipe && !isReadyToUse && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between text-xs font-bold text-white/45">
                  <span>Ilość wody</span><span className="font-mono text-emerald-300">{volume} L</span>
                </div>
                <input className="mt-3 w-full accent-emerald-500" type="range" min="0.5" max="50" step="0.5" value={volume} onChange={e => setVolume(Number(e.target.value))} />
                {(volume < 5 || volume > 10) && (
                  <div className="mt-2 text-[10px] text-amber-300/80">Profil timerów jest ustawiony operacyjnie pod około 5–10 L. Dla tej objętości traktuj czasy jako punkt startowy.</div>
                )}

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {ALLOCATION_MODES.map(mode => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setAllocationMode(mode.value)}
                      className={`rounded-lg border px-2 py-2 text-[10px] font-black uppercase ${
                        allocationMode === mode.value
                          ? 'border-emerald-500 bg-emerald-500 text-black'
                          : 'border-white/10 bg-black/40 text-white/45'
                      }`}
                    >{mode.label}</button>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3 text-xs text-white/50">
                  <strong className="text-white/75">{selectedMode.label}:</strong> {selectedMode.description}
                  {modesAreIdentical && (
                    <div className="mt-2 text-amber-300/80">Dla tej objętości wszystkie trzy tryby dają ten sam zestaw. To nie błąd.</div>
                  )}
                </div>
              </div>
            )}

            {selectedRecipe && isReadyToUse && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <label className="block text-xs font-bold text-white/45">Rzeczywiste zużycie gotowego preparatu</label>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={directUseVolumeMl || ''}
                    onChange={e => setDirectUseVolumeMl(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="np. 50"
                    className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-500"
                  />
                  <span className="font-mono text-sm text-fuchsia-300">ml</span>
                </div>
                <div className="mt-2 text-[10px] text-white/35">Preparat gotowy do użycia. Nie rozcieńczaj go i nie wkładaj do sekwencji mieszania nawozów.</div>
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-8">
          <div className="min-h-[520px] rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/55">
                <Beaker className="h-4 w-4 text-emerald-300" /> Kolejność dodawania do zbiornika — ARGUS
              </div>
              {executionActive && (
                <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Wykonanie {completedSteps.length}/{executionSteps.length}
                </div>
              )}
            </div>

            {!selectedRecipe ? (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-white/25">Wybierz recepturę.</div>
            ) : (
              <div className="mt-5 space-y-4">
                {selectedRecipe.verificationStatus !== 'VERIFIED' && (
                  <WarningBox tone="amber">Status źródła: {verificationLabel(selectedRecipe.verificationStatus)}. Timer nie potwierdza dawki, tylko prowadzi wykonanie.</WarningBox>
                )}
                {selectedRecipe.notes && <WarningBox tone="blue">{selectedRecipe.notes}</WarningBox>}
                {warnings.map(warning => (
                  <div key={`${warning.code}-${warning.productId}`}>
                    <WarningBox tone="red">{warning.message}</WarningBox>
                  </div>
                ))}
                {inventoryShortages.map(shortage => (
                  <WarningBox key={`stock-${shortage.productId}`} tone="red">
                    {shortage.productName}: potrzeba {shortage.required.toFixed(2)} ml, dostępne {shortage.available.toFixed(2)} ml.
                  </WarningBox>
                ))}
                {directUseQuantityMissing && (
                  <WarningBox tone="red">Podaj rzeczywistą ilość gotowego preparatu do użycia.</WarningBox>
                )}
                {!toolSet.complete && (
                  <WarningBox tone="red">
                    Brak pełnego zestawu narzędzi. {toolSet.shortages.map(s => `${store.getProduct(s.productId)?.name ?? s.productId}: ${s.remainingMl} ml`).join(' · ')}
                  </WarningBox>
                )}
                {executionMessage && (
                  <div className={`rounded-xl border p-4 text-sm ${
                    executionActive
                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-200'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                  }`}>
                    {executionMessage}
                  </div>
                )}

                <div className="space-y-3">
                  {executionSteps.map((step, index) => {
                    const ready = Boolean(isReadyToUse);
                    const amount = ready ? directUseVolumeMl : step.ingredient.concentration * volume;
                    const tools = toolSet.assignments[step.product.id] ?? [];
                    const instruction = getMixingInstruction(step.product.mixingRole);
                    const key = `step:${step.product.id}`;
                    const isDone = completedSteps.includes(step.product.id);
                    const isCurrent = executionActive && index === completedSteps.length && !preBaseGatePending;
                    const timer = activeTimer?.key === key ? activeTimer : null;
                    const isSilicon = step.product.mixingRole === MixingRole.SILICON;

                    return (
                      <React.Fragment key={step.product.id}>
                        <div
                          className={`rounded-xl border p-4 transition ${
                            isDone
                              ? 'border-emerald-500/35 bg-emerald-500/10'
                              : isCurrent
                                ? 'border-blue-500/40 bg-blue-500/10'
                                : 'border-white/10 bg-black/50'
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div className="flex flex-1 items-start gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black ${
                                isDone ? 'bg-emerald-500 text-black' : isCurrent ? 'bg-blue-500 text-black' : 'bg-white/10 text-white/50'
                              }`}>
                                {isDone ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                              </div>
                              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${step.product.color}`}>
                                {ready ? <Wind className="h-5 w-5 text-black" /> : <Droplet className="h-5 w-5 text-black" />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold">{step.product.name}</div>
                                {ready
                                  ? <div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">bez rozcieńczania · {amount.toFixed(2)} ml</div>
                                  : <div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{step.ingredient.concentration} ml/L · {amount.toFixed(2)} ml</div>}
                                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                                  <span className="rounded-md bg-white/5 px-2 py-1 text-white/55">{instruction.intensity}</span>
                                  <span className="rounded-md bg-white/5 px-2 py-1 text-white/55">{instruction.seconds}s</span>
                                  <span className="rounded-md bg-white/5 px-2 py-1 text-white/55">{instruction.rpm}</span>
                                </div>
                                <div className="mt-2 text-[10px] leading-relaxed text-white/35">{instruction.note}</div>
                              </div>
                            </div>

                            <div className="flex flex-wrap justify-start gap-2 sm:max-w-[300px] sm:justify-end">
                              {ready ? (
                                <span className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-bold text-fuchsia-300">Gotowy do użycia · bez rozcieńczania</span>
                              ) : tools.length ? tools.map(tool => (
                                <span key={tool.instanceId} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                                  <Syringe className="h-3.5 w-3.5 text-white/35" />
                                  <span className="text-white/45">{tool.type}</span>
                                  <strong className="font-mono text-emerald-300">{tool.amount} ml</strong>
                                  <span className="text-[9px] text-white/25">{tool.instanceId}</span>
                                </span>
                              )) : <span className="text-xs text-white/25">0 ml</span>}
                            </div>
                          </div>

                          {isCurrent && !isDone && (
                            <div className="mt-4 border-t border-white/10 pt-4">
                              {!timer ? (
                                <button
                                  type="button"
                                  onClick={() => startStepMixing(step.product.id, index)}
                                  className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-black text-black"
                                >
                                  {ready ? 'ZASTOSOWANO → POTWIERDŹ' : instruction.useDrill ? 'DODANO + START MIESZANIA' : 'DODANO + START MIESZANIA RĘCZNEGO'}
                                </button>
                              ) : (
                                <TimerPanel timer={timer} label={ready ? 'Potwierdzenie aplikacji' : `${instruction.intensity} · ${instruction.rpm}`} />
                              )}

                              {timer?.finished && (
                                <button
                                  type="button"
                                  onClick={() => confirmStep(step.product.id, index)}
                                  className="mt-3 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black"
                                >
                                  {ready ? 'APLIKACJA OK → DALEJ' : 'MIESZANIE OK → DALEJ'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {executionActive && isSilicon && isDone && !preBasePhGateDone && (
                          <MeasurementGate
                            title="Punkt kontrolny pH po Silicon"
                            description="Zanim dodasz CalMag, bazę lub kolejny koncentrat, wymieszaj Silicon i sprawdź pH. Ten punkt kontrolny jest oddzielony od końcowej korekty pH."
                          >
                            <MeasurementInput label="pH" value={preBasePh} onChange={setPreBasePh} placeholder="np. 6.50" />
                            <button
                              type="button"
                              onClick={confirmPreBasePhGate}
                              disabled={!validPh(preBasePh)}
                              className={`w-full rounded-xl px-4 py-3 text-sm font-black ${validPh(preBasePh) ? 'bg-cyan-500 text-black' : 'cursor-not-allowed bg-white/10 text-white/25'}`}
                            >
                              POMIAR pH WYKONANY → ODBLOKUJ DALEJ
                            </button>
                          </MeasurementGate>
                        )}

                        {executionActive && isSilicon && isDone && preBasePhGateDone && (
                          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-200">
                            Punkt kontrolny po Silicon zaliczony · pH {Number(preBasePh).toFixed(2)}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {executionActive && allStepsCompleted && requiresFinalMix && (
                  <div className={`rounded-xl border p-4 ${finalMixDone ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-violet-500/30 bg-violet-500/10'}`}>
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">Mieszanie końcowe</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded-md bg-white/5 px-2 py-1 text-white/65">{FINAL_MIX.intensity}</span>
                      <span className="rounded-md bg-white/5 px-2 py-1 text-white/65">{FINAL_MIX.seconds}s</span>
                      <span className="rounded-md bg-white/5 px-2 py-1 text-white/65">{FINAL_MIX.rpm}</span>
                    </div>
                    <div className="mt-2 text-xs text-white/45">{FINAL_MIX.note}</div>

                    {!finalMixDone && activeTimer?.key !== 'settle' && (
                      <div className="mt-4">
                        {activeTimer?.key === 'final' ? (
                          <TimerPanel timer={activeTimer} label="Mieszanie końcowe" />
                        ) : (
                          <button type="button" onClick={startFinalMix} className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-black text-black">
                            START MIESZANIA KOŃCOWEGO · {FINAL_MIX.seconds}s
                          </button>
                        )}
                        {activeTimer?.key === 'final' && activeTimer.finished && (
                          <button type="button" onClick={confirmFinalMix} className="mt-3 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black">
                            MIESZANIE KOŃCOWE OK → SPOCZYNEK
                          </button>
                        )}
                      </div>
                    )}

                    {activeTimer?.key === 'settle' && (
                      <div className="mt-4">
                        <TimerPanel timer={activeTimer} label="Spoczynek przed EC/pH" />
                        {activeTimer.finished && (
                          <button type="button" onClick={confirmSettle} className="mt-3 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black">
                            SPOCZYNEK OK → POMIAR EC / pH
                          </button>
                        )}
                      </div>
                    )}

                    {finalMixDone && settleDone && !finalGateDone && (
                      <MeasurementGate
                        title="Końcowy punkt kontrolny EC / pH"
                        description="Zmierz kompletny, ustabilizowany roztwór. Ewentualna końcowa korekta pH odbywa się dopiero tutaj, po wszystkich preparatach."
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <MeasurementInput label="EC mS/cm" value={finalEc} onChange={setFinalEc} placeholder="np. 1.40" />
                          <MeasurementInput label="pH" value={finalPh} onChange={setFinalPh} placeholder="np. 6.20" />
                        </div>
                        <button
                          type="button"
                          onClick={confirmFinalGate}
                          disabled={!validEc(finalEc) || !validPh(finalPh)}
                          className={`w-full rounded-xl px-4 py-3 text-sm font-black ${validEc(finalEc) && validPh(finalPh) ? 'bg-cyan-500 text-black' : 'cursor-not-allowed bg-white/10 text-white/25'}`}
                        >
                          POMIAR EC / pH WYKONANY → ZATWIERDŹ
                        </button>
                      </MeasurementGate>
                    )}

                    {finalGateDone && (
                      <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                        Końcowy punkt kontrolny zaliczony · EC {Number(finalEc).toFixed(2)} mS/cm · pH {Number(finalPh).toFixed(2)}.
                      </div>
                    )}
                  </div>
                )}

                {!isReadyToUse && (
                  <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Fizyczny zestaw</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                      {toolSet.usage.map(tool => (
                        <div key={tool.toolTypeId} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                          <div className="text-[10px] text-white/40">{tool.label}</div>
                          <div className="font-mono text-sm font-black text-emerald-300">{tool.used}/{tool.total}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{isReadyToUse ? 'Zużycie preparatu' : 'Suma koncentratów'}</div>
                    <div className="font-mono text-2xl font-black text-emerald-300">{totalMl.toFixed(2)} ml</div>
                    {selectedRecipe.method === ApplicationMethod.ROOT_FEED && (
                      <div className="mt-1 text-[10px] text-white/35">Po mieszaniu końcowym i spoczynku obowiązkowy punkt kontrolny EC/pH. Końcowa korekta pH jest ostatnią czynnością.</div>
                    )}
                  </div>

                  {!executionActive ? (
                    <button
                      type="button"
                      onClick={startExecution}
                      disabled={!canStart}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-black ${
                        canStart ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'cursor-not-allowed bg-white/10 text-white/25'
                      }`}
                    >
                      <Play className="h-4 w-4 fill-current" /> Rozpocznij wykonanie
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={finalizeExecution}
                      disabled={!readyToFinalize}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-black ${
                        readyToFinalize ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'cursor-not-allowed bg-white/10 text-white/25'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Zakończ i zapisz
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function verificationLabel(status?: string) {
  if (status === 'VERIFIED') return 'ZWERYFIKOWANE';
  if (status === 'CONFLICT') return 'KONFLIKT ŹRÓDEŁ';
  return 'NIEZWERYFIKOWANE ŹRÓDŁOWO';
}

function validPh(value: string) {
  const number = Number(value);
  return value.trim() !== '' && Number.isFinite(number) && number > 0 && number <= 14;
}

function validEc(value: string) {
  const number = Number(value);
  return value.trim() !== '' && Number.isFinite(number) && number >= 0 && number <= 20;
}

function MeasurementGate({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">{title}</div>
      <div className="mt-2 text-xs leading-relaxed text-cyan-100/65">{description}</div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function MeasurementInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-white/40">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-cyan-500"
      />
    </label>
  );
}

function TimerPanel({ timer, label }: { timer: ActiveTimer; label: string }) {
  const progress = timer.total > 0 ? ((timer.total - timer.remaining) / timer.total) * 100 : 100;
  return (
    <div className={`rounded-xl border p-4 ${timer.finished ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-blue-500/30 bg-blue-500/10'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-white/60">{label}</div>
        <div className={`font-mono text-3xl font-black ${timer.finished ? 'text-emerald-300' : 'text-blue-300'}`}>
          {timer.finished ? 'OK' : `${timer.remaining}s`}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      {timer.finished && <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Timer zakończony · potwierdź fizycznie</div>}
    </div>
  );
}

function ContextSelect({
  label,
  value,
  onChange,
  children,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-black px-3 py-2 text-sm outline-none">{children}</select>
      {hint && <span className="mt-2 block text-[10px] leading-relaxed text-white/30">{hint}</span>}
    </label>
  );
}

function WarningBox({ tone, children }: { tone: 'amber' | 'red' | 'blue'; children: React.ReactNode }) {
  const classes = tone === 'red'
    ? 'border-red-500/20 bg-red-500/10 text-red-200'
    : tone === 'blue'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-200'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${classes}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
