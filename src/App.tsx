import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Beaker,
  CheckCircle2,
  Database,
  Droplet,
  FlaskConical,
  Gauge,
  History as HistoryIcon,
  Info,
  Layers,
  Play,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Syringe,
  Wind,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore } from './store';
import {
  ApplicationMethod,
  GrowthStage,
  Medium,
  Product,
  Recipe,
  RecipeIngredient,
  WaterType,
} from './types';
import { AllocationPlan, allocateToolSet } from './syringeEngine';
import { PHYSICAL_SYRINGES } from './data';
import {
  buildExecutionProtocol,
  buildExecutionSteps,
  filterRecipes,
  findInventoryShortages,
  orderIngredientsByRole,
  validateRecipeContext,
} from './recipeEngine';

type Tab = 'PLANNER' | 'INVENTORY' | 'BUILDER' | 'CAPABILITIES' | 'HISTORY';

export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('PLANNER');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30 pb-24">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FlaskConical className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ARGUS SHOGUN Engine</h1>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Reality Lock • Execution Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl flex-wrap">
            {(['PLANNER', 'INVENTORY', 'BUILDER', 'CAPABILITIES', 'HISTORY'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                {tab === 'PLANNER' && 'Planer'}
                {tab === 'INVENTORY' && 'Magazyn'}
                {tab === 'BUILDER' && 'Kreator'}
                {tab === 'CAPABILITIES' && 'Możliwości'}
                {tab === 'HISTORY' && 'Historia'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {activeTab === 'PLANNER' && <PlannerView store={store} />}
            {activeTab === 'INVENTORY' && <InventoryView store={store} />}
            {activeTab === 'BUILDER' && <BuilderView store={store} setActiveTab={setActiveTab} />}
            {activeTab === 'CAPABILITIES' && <CapabilitiesView store={store} />}
            {activeTab === 'HISTORY' && <HistoryView store={store} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function PlannerView({ store }: { store: ReturnType<typeof useAppStore> }) {
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [method, setMethod] = useState<ApplicationMethod>(ApplicationMethod.ROOT_FEED);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [volume, setVolume] = useState<number>(5);
  const [readyToUseVolumeMl, setReadyToUseVolumeMl] = useState<number>(0);
  const executionLock = React.useRef(false);

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
    const currentStillValid = availableRecipes.some(recipe => recipe.id === selectedRecipeId);
    if (!currentStillValid) {
      setSelectedRecipeId(availableRecipes[0]?.id ?? '');
      setReadyToUseVolumeMl(0);
    }
  }, [availableRecipes, selectedRecipeId]);

  React.useEffect(() => {
    executionLock.current = false;
  }, [store.inventory]);

  const selectedRecipe = useMemo(
    () => availableRecipes.find(recipe => recipe.id === selectedRecipeId),
    [availableRecipes, selectedRecipeId],
  );

  const executionSteps = useMemo(
    () => selectedRecipe ? buildExecutionSteps(selectedRecipe, store.inventory) : [],
    [selectedRecipe, store.inventory],
  );

  const protocol = useMemo(
    () => selectedRecipe ? buildExecutionProtocol(selectedRecipe, store.inventory) : [],
    [selectedRecipe, store.inventory],
  );

  const doseRequests = useMemo(() => {
    if (!selectedRecipe || selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY) return [];
    return executionSteps
      .filter(step => step.ingredient.concentration > 0 && step.product.unit === 'ml')
      .map(step => ({
        productId: step.product.id,
        volumeMl: Number((step.ingredient.concentration * volume).toFixed(2)),
      }));
  }, [selectedRecipe, executionSteps, volume]);

  const toolSet = useMemo(
    () => allocateToolSet(doseRequests, PHYSICAL_SYRINGES, 'PRECISION'),
    [doseRequests],
  );

  const allocation = useMemo(() => {
    if (!selectedRecipe) return [];

    return executionSteps.map(step => {
      const totalVolumeRequired = selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY
        ? readyToUseVolumeMl
        : Number((step.ingredient.concentration * volume).toFixed(2));

      return {
        productId: step.product.id,
        product: step.product,
        totalVolumeRequired,
        syringes: selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY
          ? []
          : (toolSet.assignments[step.product.id] ?? []),
      } satisfies AllocationPlan & { product: Product };
    });
  }, [selectedRecipe, executionSteps, volume, readyToUseVolumeMl, toolSet.assignments]);

  const validationWarnings = useMemo(
    () => selectedRecipe
      ? validateRecipeContext(selectedRecipe, store.inventory, {
          medium: store.currentMedium,
          method: selectedRecipe.method,
        })
      : [],
    [selectedRecipe, store.inventory, store.currentMedium],
  );

  const inventoryShortages = useMemo(
    () => selectedRecipe && selectedRecipe.method !== ApplicationMethod.READY_TO_SPRAY
      ? findInventoryShortages(selectedRecipe, store.inventory, volume)
      : [],
    [selectedRecipe, store.inventory, volume],
  );

  const directUseShortages = useMemo(() => {
    if (!selectedRecipe || selectedRecipe.method !== ApplicationMethod.READY_TO_SPRAY || readyToUseVolumeMl <= 0) {
      return [];
    }

    return executionSteps
      .filter(step => step.product.remainingCapacity + 0.005 < readyToUseVolumeMl)
      .map(step => ({
        productId: step.product.id,
        productName: step.product.name,
        requiredMl: readyToUseVolumeMl,
        availableMl: step.product.remainingCapacity,
      }));
  }, [selectedRecipe, executionSteps, readyToUseVolumeMl]);

  const totalMl = allocation.reduce((sum, item) => sum + item.totalVolumeRequired, 0);
  const blockingValidation = validationWarnings.filter(warning => warning.severity === 'ERROR');
  const hasToolShortage = selectedRecipe?.method !== ApplicationMethod.READY_TO_SPRAY && !toolSet.complete;
  const directUseQuantityMissing = selectedRecipe?.method === ApplicationMethod.READY_TO_SPRAY && readyToUseVolumeMl <= 0;
  const isBlocked = (
    blockingValidation.length > 0 ||
    inventoryShortages.length > 0 ||
    directUseShortages.length > 0 ||
    hasToolShortage ||
    directUseQuantityMissing
  );
  const allocationByProduct = new Map(allocation.map(item => [item.productId, item]));

  const handleExecute = () => {
    if (!selectedRecipe || isBlocked || executionLock.current) return;
    executionLock.current = true;

    const isReadyToSpray = selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY;
    const result = store.executeOperation(
      allocation
        .filter(item => item.totalVolumeRequired > 0)
        .map(item => ({ productId: item.productId, amountMl: item.totalVolumeRequired })),
      {
        id: crypto.randomUUID(),
        date: new Date().toLocaleString(),
        volume: isReadyToSpray ? readyToUseVolumeMl : volume,
        volumeUnit: isReadyToSpray ? 'ml' : 'L',
        recipeId: selectedRecipe.id,
        method: selectedRecipe.method,
        doses: Object.fromEntries(selectedRecipe.ingredients.map(i => [i.productId, i.concentration])),
        totalMl,
      },
    );

    if (!result.ok) {
      executionLock.current = false;
      alert('Operacja zatrzymana: stan magazynu zmienił się i nie wystarcza do wykonania receptury.');
      return;
    }

    if (isReadyToSpray) setReadyToUseVolumeMl(0);
    alert('Wykonano atomowo: magazyn i historia zostały zaktualizowane razem.');
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-wrap gap-6 items-center">
        <ContextSelect
          label="Medium"
          value={store.currentMedium}
          onChange={value => store.updateMedium(value as Medium)}
          options={[
            [Medium.TERRA, 'TERRA / SOIL'],
            [Medium.COCO, 'COCO'],
            [Medium.HYDRO, 'HYDRO'],
            [Medium.CUSTOM, 'CUSTOM'],
          ]}
        />
        <ContextSelect
          label="Woda bazowa"
          value={store.currentWaterProfile}
          onChange={value => store.updateWater(value as WaterType)}
          options={[
            [WaterType.SOFT, 'Miękka (Soft)'],
            [WaterType.HARD, 'Twarda (Hard)'],
            [WaterType.RO, 'Odwrócona osmoza (RO)'],
            [WaterType.CUSTOM, 'Własna'],
          ]}
        />
        <ContextSelect
          label="Faza"
          value={stage}
          onChange={value => setStage(value as GrowthStage)}
          options={[
            [GrowthStage.SEEDLING, 'Siewki / Klony'],
            [GrowthStage.VEG, 'Wegetacja'],
            [GrowthStage.BLOOM, 'Kwitnienie'],
            [GrowthStage.FLUSH, 'Płukanie (Flush)'],
          ]}
        />
        <ContextSelect
          label="Metoda"
          value={method}
          onChange={value => setMethod(value as ApplicationMethod)}
          options={[
            [ApplicationMethod.ROOT_FEED, 'Nawożenie dokorzeniowe'],
            [ApplicationMethod.FOLIAR, 'Oprysk dolistny'],
            [ApplicationMethod.READY_TO_SPRAY, 'Gotowy oprysk (RTS)'],
            [ApplicationMethod.SOAK, 'Moczenie'],
            [ApplicationMethod.MEDIA_TREATMENT, 'Obróbka medium'],
          ]}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6">Wybór receptury</h3>

            <div className="space-y-3">
              {availableRecipes.length > 0 ? availableRecipes.map(recipe => (
                <button
                  type="button"
                  key={recipe.id}
                  onClick={() => {
                    setSelectedRecipeId(recipe.id);
                    setReadyToUseVolumeMl(0);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedRecipeId === recipe.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-black border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm">{recipe.name}</span>
                    <VerificationBadge status={recipe.verificationStatus} />
                  </div>
                  {recipe.source && (
                    <div className="text-[10px] text-white/40">
                      Źródło: {recipe.source}{recipe.sourceDate ? ` (${recipe.sourceDate})` : ''}
                    </div>
                  )}
                </button>
              )) : (
                <div className="text-sm text-white/40 p-4 border border-dashed border-white/10 rounded-xl text-center">
                  Brak receptur dokładnie pasujących do medium, metody, fazy i profilu wody.
                </div>
              )}
            </div>

            {selectedRecipe && selectedRecipe.method !== ApplicationMethod.READY_TO_SPRAY && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex justify-between">
                  <span>Ilość wody bazowej</span>
                  <span className="text-emerald-400 font-mono">{volume} L</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={volume}
                  onChange={event => setVolume(Number(event.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}

            {selectedRecipe?.method === ApplicationMethod.READY_TO_SPRAY && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                  Zużycie gotowego preparatu
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={readyToUseVolumeMl || ''}
                    onChange={event => setReadyToUseVolumeMl(Math.max(0, Number(event.target.value) || 0))}
                    placeholder="np. 50"
                    className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-fuchsia-500"
                  />
                  <span className="text-sm font-mono text-fuchsia-300">ml</span>
                </div>
                <p className="text-[10px] text-white/40 mt-2">Podaj rzeczywistą ilość zużytą bez rozcieńczania. Dopiero wtedy magazyn może zostać poprawnie odjęty.</p>
              </div>
            )}
          </div>

          {selectedRecipe && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Reality Lock</h3>

              {validationWarnings.map((warning, index) => (
                <StatusBox
                  key={`${warning.code}-${warning.productId ?? 'recipe'}-${index}`}
                  tone={warning.severity === 'ERROR' ? 'error' : 'warning'}
                  text={warning.message}
                />
              ))}

              {inventoryShortages.map(shortage => (
                <StatusBox
                  key={shortage.productId}
                  tone="error"
                  text={`${shortage.productName}: potrzeba ${shortage.requiredMl} ml, dostępne ${shortage.availableMl} ml.`}
                />
              ))}

              {directUseShortages.map(shortage => (
                <StatusBox
                  key={`direct-${shortage.productId}`}
                  tone="error"
                  text={`${shortage.productName}: chcesz zużyć ${shortage.requiredMl} ml, dostępne ${shortage.availableMl} ml.`}
                />
              ))}

              {directUseQuantityMissing && (
                <StatusBox tone="error" text="Podaj rzeczywistą ilość gotowego preparatu do zużycia." />
              )}

              {toolSet.shortages.map(shortage => (
                <StatusBox
                  key={`tool-${shortage.productId}`}
                  tone="error"
                  text={`Brakuje fizyczznych strzykawek/pipet dla ${store.getProduct(shortage.productId)?.name ?? shortage.productId}: ${shortage.remainingMl} ml bez przydziału.`}
                />
              ))}

              {validationWarnings.length === 0 && inventoryShortages.length === 0 && directUseShortages.length === 0 && toolSet.shortages.length === 0 && !directUseQuantityMissing && (
                <StatusBox tone="ok" text="Kontekst, magazyn i zestaw narzędzi przechodzą walidację." />
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[560px] flex flex-col">
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-emerald-400" /> Protokół wykonawczy
            </h3>

            {!selectedRecipe ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                <Layers className="w-12 h-12 mb-4" />
                <p>Wybierz recepturę, aby wygenerować plan.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {selectedRecipe.notes && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 text-sm text-blue-200">
                      <Info className="w-5 h-5 shrink-0" />
                      <p>{selectedRecipe.notes}</p>
                    </div>
                  )}

                  {protocol.map((step, index) => {
                    if (step.kind === 'ACTION') {
                      return (
                        <div key={`action-${step.id}-${index}`} className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                            <Gauge className="w-5 h-5 text-cyan-300" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-cyan-300/70 mb-1">Krok {index + 1} • checkpoint</div>
                            <div className="font-bold text-sm">{step.title}</div>
                            {step.detail && <p className="text-xs text-white/50 mt-1 leading-relaxed">{step.detail}</p>}
                          </div>
                        </div>
                      );
                    }

                    const item = allocationByProduct.get(step.product.id);
                    const productWarnings = validationWarnings.filter(warning => warning.productId === step.product.id);
                    const hasError = productWarnings.some(warning => warning.severity === 'ERROR');
                    const isReadyToSpray = selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY;

                    return (
                      <motion.div
                        key={`product-${step.product.id}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-4 ${hasError ? 'bg-red-500/10 border-red-500/30' : 'bg-black border-white/10'}`}
                      >
                        <div className="w-8 text-center font-mono text-xs text-white/30">{index + 1}</div>
                        <div className={`w-12 h-12 shrink-0 rounded-lg ${step.product.color} flex items-center justify-center shadow-lg`}>
                          {isReadyToSpray ? <Wind className="text-black w-6 h-6" /> : <Droplet className="text-black w-6 h-6" />}
                        </div>

                        <div className="flex-1 min-w-[130px]">
                          <h4 className="font-bold text-sm">{step.product.name}</h4>
                          {isReadyToSpray ? (
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                              zużycie bezpośrednie • {item?.totalVolumeRequired ?? 0} ml
                            </p>
                          ) : (
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                              {step.ingredient.concentration} ml/L • razem {item?.totalVolumeRequired ?? 0} ml
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          {productWarnings.map((warning, warningIndex) => (
                            <span key={`${warning.code}-${warningIndex}`} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold flex items-center gap-2 border border-red-500/20">
                              <AlertCircle className="w-4 h-4" /> {warning.code}
                            </span>
                          ))}

                          {isReadyToSpray ? (
                            <span className="px-4 py-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-xs font-bold tracking-widest uppercase">
                              Aplikacja bezpośrednia
                            </span>
                          ) : (
                            item?.syringes.map(syringe => (
                              <span key={syringe.instanceId} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                                <Syringe className="w-3 h-3 text-white/40" />
                                <span className="text-xs">
                                  <span className="text-white/40 mr-1">{syringe.type}:</span>
                                  <span className="font-mono text-emerald-400 font-bold">{syringe.amount} ml</span>
                                </span>
                              </span>
                            ))
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Łączne zapotrzebowanie preparatów</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {totalMl.toFixed(1)} <span className="text-sm text-white/40">ml</span>
                    </div>
                  </div>

                  <button
                    onClick={handleExecute}
                    disabled={isBlocked}
                    className={`flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-xl transition-all ${isBlocked ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'}`}
                  >
                    {isBlocked ? <ShieldAlert className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                    {isBlocked ? 'Zablokowane przez Reality Lock' : 'Wykonaj mieszankę'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className="flex-1 min-w-[190px]">
      <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:border-emerald-500 transition-colors"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}

function VerificationBadge({ status }: { status?: string }) {
  if (status === 'VERIFIED') {
    return <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 uppercase tracking-widest">Verified</span>;
  }
  if (status === 'CONFLICT') {
    return <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 uppercase tracking-widest">Conflict</span>;
  }
  return <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 uppercase tracking-widest">Unverified</span>;
}

function StatusBox({ tone, text }: { tone: 'ok' | 'warning' | 'error'; text: string }) {
  const classes = tone === 'ok'
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
    : tone === 'warning'
      ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
      : 'bg-red-500/10 border-red-500/20 text-red-200';

  const Icon = tone === 'ok' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`p-3 rounded-xl border flex gap-2 text-xs leading-relaxed ${classes}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function InventoryView({ store }: { store: ReturnType<typeof useAppStore> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Database className="text-emerald-400" /> Magazyn preparatów</h2>
        <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 font-mono">Stan na żywo</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {store.inventory.map(product => {
          const percentage = product.initialCapacity > 0
            ? Math.max(0, Math.min(100, (product.remainingCapacity / product.initialCapacity) * 100))
            : 0;

          return (
            <div key={product.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex gap-4">
              <div className={`w-3 h-auto rounded-full ${product.color} shadow-sm shrink-0`} />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold">{product.name}</h4>
                    <span className="text-[9px] uppercase tracking-widest text-white/40">{product.brand} • {product.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">{product.remainingCapacity.toFixed(1)}</div>
                    <div className="text-[9px] text-white/40 uppercase">z {product.initialCapacity} {product.unit}</div>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full ${percentage < 10 ? 'bg-red-500' : percentage < 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-1">
                  {product.foliarAllowed && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold tracking-widest uppercase">Foliar</span>}
                  {product.compatibleMedia.map(medium => (
                    <span key={medium} className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-[9px] font-bold tracking-widest uppercase">{medium}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CapabilitiesView({ store }: { store: ReturnType<typeof useAppStore> }) {
  const availableIngredientRecipes = store.recipes.filter(recipe => recipe.ingredients.every(ingredient => {
    const product = store.getProduct(ingredient.productId);
    return product && product.remainingCapacity > 0;
  }));
  const unavailableRecipes = store.recipes.filter(recipe => !availableIngredientRecipes.includes(recipe));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Search className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold">Możliwości operacyjne</h2>
          <p className="text-sm text-white/40">Ta karta sprawdza obecność składników. Faktyczna wykonalność zależy jeszcze od objętości, walidacji i zestawu narzędzi.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Składniki obecne ({availableIngredientRecipes.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {availableIngredientRecipes.map(recipe => (
              <div key={recipe.id} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold">{recipe.name}</div>
                  <VerificationBadge status={recipe.verificationStatus} />
                </div>
                <div className="text-xs text-white/40 mt-1">{recipe.method} • {recipe.medium.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Braki składników ({unavailableRecipes.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {unavailableRecipes.map(recipe => {
              const missing = recipe.ingredients
                .filter(ingredient => {
                  const product = store.getProduct(ingredient.productId);
                  return !product || product.remainingCapacity <= 0;
                })
                .map(ingredient => store.getProduct(ingredient.productId)?.name ?? ingredient.productId);

              return (
                <div key={recipe.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 opacity-80">
                  <div className="font-bold">{recipe.name}</div>
                  <div className="text-xs text-red-400 mt-2 font-bold">Brakujące: {missing.join(', ')}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ store }: { store: ReturnType<typeof useAppStore> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><HistoryIcon className="text-emerald-400" /> Dziennik operacji</h2>

      <div className="space-y-4">
        {store.history.length === 0 ? (
          <div className="text-center p-12 text-white/40 border border-dashed border-white/10 rounded-2xl">Brak zapisanych operacji.</div>
        ) : store.history.map(item => {
          const recipe = item.recipeId ? store.getRecipe(item.recipeId) : null;
          return (
            <div key={item.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">{item.date}</div>
                <div className="font-bold">{recipe ? recipe.name : 'Niestandardowa mieszanka'}</div>
                <div className="text-xs text-emerald-400 font-mono mt-1">
                  {item.method} • {item.volume} {item.volumeUnit ?? 'L'} • {item.totalMl.toFixed(1)} ml preparatów
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
                {Object.entries(item.doses).map(([productId, dose]) => {
                  const product = store.getProduct(productId);
                  return product ? (
                    <span key={productId} className="px-2 py-1 rounded bg-black border border-white/5">
                      {product.name}: {dose} ml/L
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuilderView({
  store,
  setActiveTab,
}: {
  store: ReturnType<typeof useAppStore>;
  setActiveTab: (tab: Tab) => void;
}) {
  const [name, setName] = useState('');
  const [medium, setMedium] = useState<Medium>(Medium.TERRA);
  const [method, setMethod] = useState<ApplicationMethod>(ApplicationMethod.ROOT_FEED);
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  const selectableProducts = store.inventory.filter(product => {
    if (product.unit !== 'ml') return false;
    if (method === ApplicationMethod.FOLIAR) return product.foliarAllowed;
    if (method === ApplicationMethod.READY_TO_SPRAY) return product.type === 'READY_TO_USE';
    return true;
  });

  const normalizeOrder = (items: RecipeIngredient[]) => items.map((ingredient, index) => ({
    ...ingredient,
    mixOrder: (index + 1) * 100,
  }));

  const handleAddIngredient = (productId: string) => {
    if (ingredients.some(ingredient => ingredient.productId === productId)) return;

    const next = [
      ...ingredients,
      {
        productId,
        concentration: method === ApplicationMethod.READY_TO_SPRAY ? 0 : 1.0,
      },
    ];

    setIngredients(
      method === ApplicationMethod.ROOT_FEED
        ? orderIngredientsByRole(next, store.inventory)
        : normalizeOrder(next),
    );
  };

  const updateIngredient = (productId: string, concentration: number) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.productId === productId ? { ...ingredient, concentration } : ingredient,
    ));
  };

  const removeIngredient = (productId: string) => {
    setIngredients(normalizeOrder(ingredients.filter(ingredient => ingredient.productId !== productId)));
  };

  const moveIngredient = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ingredients.length) return;
    const next = [...ingredients];
    [next[index], next[target]] = [next[target], next[index]];
    setIngredients(normalizeOrder(next));
  };

  const handleSave = () => {
    if (!name.trim() || ingredients.length === 0) {
      alert('Wpisz nazwę i dodaj składniki.');
      return;
    }

    const candidate: Recipe = {
      id: crypto.randomUUID(),
      name: name.trim(),
      medium: [medium],
      method,
      stage,
      ingredients: normalizeOrder(ingredients),
      isFactory: false,
      verificationStatus: 'UNVERIFIED',
      source: 'Custom User Recipe',
      sourceDate: new Date().toISOString().slice(0, 10),
    };

    const errors = validateRecipeContext(candidate, store.inventory, { medium, method })
      .filter(warning => warning.severity === 'ERROR');

    if (errors.length > 0) {
      alert(`Nie zapisano: ${errors[0].message}`);
      return;
    }

    store.addRecipe(candidate);
    alert('Zapisano recepturę jako UNVERIFIED.');
    setActiveTab('PLANNER');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold">Kreator receptur</h2>
          <p className="text-sm text-white/40">ROOT_FEED startuje od bezpiecznego porządku ról. Ręczne przesunięcie zapisuje jawny mixOrder, ale Reality Lock nie pozwoli umieścić Silicon po nawozie bazowym.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2">Nazwa receptury</label>
              <input
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="np. Mój zestaw..."
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Medium</label>
                <select value={medium} onChange={event => setMedium(event.target.value as Medium)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
                  {Object.values(Medium).map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Faza</label>
                <select value={stage} onChange={event => setStage(event.target.value as GrowthStage)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
                  {Object.values(GrowthStage).map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2">Metoda</label>
              <select value={method} onChange={event => setMethod(event.target.value as ApplicationMethod)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
                {Object.values(ApplicationMethod).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-white/40 uppercase mb-4">Dostępne składniki</h3>
            <div className="flex flex-wrap gap-2">
              {selectableProducts.map(product => {
                if (ingredients.some(ingredient => ingredient.productId === product.id)) return null;
                return (
                  <button key={product.id} onClick={() => handleAddIngredient(product.id)} className="px-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs hover:border-emerald-500 transition-colors">
                    + {product.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xs font-bold text-white/40 uppercase mb-4">Skład i kolejność</h3>

          <div className="flex-1 space-y-3">
            {ingredients.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-white/40 text-sm">Brak składników</div>
            ) : ingredients.map((ingredient, index) => {
              const product = store.getProduct(ingredient.productId);
              if (!product) return null;

              return (
                <div key={ingredient.productId} className="flex items-center gap-3 bg-black p-3 rounded-xl border border-white/10">
                  <div className="text-xs font-mono text-white/30 w-5">{index + 1}</div>
                  <div className={`w-8 h-8 rounded-lg ${product.color} shrink-0`} />
                  <div className="flex-1 font-bold text-sm min-w-0">{product.name}</div>
                  <div className="flex flex-col">
                    <button onClick={() => moveIngredient(index, -1)} disabled={index === 0} className="text-white/40 hover:text-white disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveIngredient(index, 1)} disabled={index === ingredients.length - 1} className="text-white/40 hover:text-white disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  {method === ApplicationMethod.READY_TO_SPRAY ? (
                    <span className="text-xs text-fuchsia-300 font-bold">RTS</span>
                  ) : (
                    <>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={ingredient.concentration}
                        onChange={event => updateIngredient(ingredient.productId, Math.max(0, Number(event.target.value) || 0))}
                        className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-right text-sm"
                      />
                      <span className="text-xs text-white/40">ml/L</span>
                    </>
                  )}
                  <button onClick={() => removeIngredient(ingredient.productId)} className="text-red-400 p-1 hover:bg-red-400/10 rounded-lg">×</button>
                </div>
              );
            })}
          </div>

          <button onClick={handleSave} className="w-full mt-6 py-3 rounded-xl bg-emerald-500 text-black font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors">
            <Save className="w-4 h-4" /> Zapisz recepturę
          </button>
        </div>
      </div>
    </div>
  );
}
