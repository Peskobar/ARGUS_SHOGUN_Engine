import React, { useState, useMemo } from 'react';
import { 
  Droplets, Syringe, CheckCircle2, AlertCircle, FlaskConical, Beaker, 
  Layers, Info, History as HistoryIcon, Save, Settings, Play, Database,
  Sprout, Wind, Droplet, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from './store';
import { 
  Medium, WaterType, ApplicationMethod, GrowthStage, 
  Recipe, Product, RecipeIngredient 
} from './types';
import { calculateSyringes, AllocationPlan } from './syringeEngine';
import { PHYSICAL_SYRINGES } from './data';

type Tab = 'PLANNER' | 'INVENTORY' | 'BUILDER' | 'CAPABILITIES' | 'HISTORY';

export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('PLANNER');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30 pb-24">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FlaskConical className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">System Wykonawczy SHOGUN</h1>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Syringe Engine 2.0</p>
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

// ==========================================
// VIEWS
// ==========================================

function PlannerView({ store }: { store: ReturnType<typeof useAppStore> }) {
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [method, setMethod] = useState<ApplicationMethod>(ApplicationMethod.ROOT_FEED);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [volume, setVolume] = useState<number>(5);
  
  // Filter available recipes based on selections
  const availableRecipes = useMemo(() => {
    return store.recipes.filter(r => 
      r.medium.includes(store.currentMedium) && 
      (r.method === method || r.method === ApplicationMethod.READY_TO_SPRAY) &&
      (r.stage === stage || r.stage === GrowthStage.ALL)
    );
  }, [store.recipes, store.currentMedium, method, stage]);

  const selectedRecipe = store.getRecipe(selectedRecipeId);

  // Auto-select if only one available or clear if none
  React.useEffect(() => {
    if (availableRecipes.length === 1 && selectedRecipeId !== availableRecipes[0].id) {
      setSelectedRecipeId(availableRecipes[0].id);
    } else if (availableRecipes.length === 0) {
      setSelectedRecipeId('');
    }
  }, [availableRecipes, selectedRecipeId]);

  // Allocation Logic
  const allocation = useMemo(() => {
    if (!selectedRecipe) return [];
    
    const plan: (AllocationPlan & { product: Product })[] = [];
    
    selectedRecipe.ingredients.forEach(ing => {
      const product = store.getProduct(ing.productId);
      if (!product) return;

      // Calculate total volume needed for this product
      // If concentration is 0 (READY_TO_SPRAY), volume required is just the container volume
      // although READY_TO_SPRAY doesn't use syringes.
      if (ing.concentration === 0 || selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY) {
         plan.push({
           productId: product.id,
           product,
           totalVolumeRequired: 0,
           syringes: []
         });
         return;
      }

      const totalRequired = ing.concentration * volume;
      const syringes = calculateSyringes(totalRequired, PHYSICAL_SYRINGES);
      
      plan.push({
        productId: product.id,
        product,
        totalVolumeRequired: totalRequired,
        syringes
      });
    });

    return plan;
  }, [selectedRecipe, volume, store]);

  const totalMl = allocation.reduce((acc, curr) => acc + curr.totalVolumeRequired, 0);

  const handleExecute = () => {
    if (!selectedRecipe) return;
    
    // Deduct from inventory
    allocation.forEach(a => {
      if (a.totalVolumeRequired > 0) {
        store.deductFromInventory(a.productId, a.totalVolumeRequired);
      }
    });

    // Save history
    store.addHistoryItem({
      id: crypto.randomUUID(),
      date: new Date().toLocaleString(),
      volume,
      recipeId: selectedRecipe.id,
      method: selectedRecipe.method,
      doses: Object.fromEntries(selectedRecipe.ingredients.map(i => [i.productId, i.concentration])),
      totalMl
    });

    alert('Wykonano! Zaktualizowano magazyn i historię.');
  };

  return (
    <div className="space-y-8">
      {/* Context Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-wrap gap-6 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Medium</label>
          <select 
            value={store.currentMedium}
            onChange={(e) => store.updateMedium(e.target.value as Medium)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:border-emerald-500 transition-colors"
          >
            <option value={Medium.TERRA}>TERRA / SOIL</option>
            <option value={Medium.COCO}>COCO</option>
            <option value={Medium.HYDRO}>HYDRO</option>
            <option value={Medium.CUSTOM}>CUSTOM</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Woda Baza</label>
          <select 
            value={store.currentWaterProfile}
            onChange={(e) => store.updateWater(e.target.value as WaterType)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:border-emerald-500 transition-colors"
          >
            <option value={WaterType.SOFT}>Miękka (Soft)</option>
            <option value={WaterType.HARD}>Twarda (Hard)</option>
            <option value={WaterType.RO}>Odwrócona Osmoza (RO)</option>
            <option value={WaterType.CUSTOM}>Własna</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Faza Wzrostu</label>
          <select 
            value={stage}
            onChange={(e) => setStage(e.target.value as GrowthStage)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:border-emerald-500 transition-colors"
          >
            <option value={GrowthStage.SEEDLING}>Siewki / Klony</option>
            <option value={GrowthStage.VEG}>Wegetacja</option>
            <option value={GrowthStage.BLOOM}>Kwitnienie</option>
            <option value={GrowthStage.FLUSH}>Płukanie (Flush)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Metoda Aplikacji</label>
          <select 
            value={method}
            onChange={(e) => setMethod(e.target.value as ApplicationMethod)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:border-emerald-500 transition-colors"
          >
            <option value={ApplicationMethod.ROOT_FEED}>Nawożenie Dokorzeniowe</option>
            <option value={ApplicationMethod.FOLIAR}>Oprysk Dolistny</option>
            <option value={ApplicationMethod.READY_TO_SPRAY}>Gotowy Oprysk (RTS)</option>
            <option value={ApplicationMethod.SOAK}>Moczenie</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Recipe Selection & Volume */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6">Wybór Receptury</h3>
            
            <div className="space-y-3">
              {availableRecipes.length > 0 ? availableRecipes.map(r => (
                <div 
                  key={r.id}
                  onClick={() => setSelectedRecipeId(r.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedRecipeId === r.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-black border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{r.name}</span>
                    {r.isFactory && <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-widest text-white/60">Factory</span>}
                  </div>
                  {r.source && <div className="text-[10px] text-white/40">Źródło: {r.source} ({r.sourceDate})</div>}
                </div>
              )) : (
                <div className="text-sm text-white/40 p-4 border border-dashed border-white/10 rounded-xl text-center">
                  Brak receptur dla tych kryteriów.
                </div>
              )}
            </div>

            {selectedRecipe && selectedRecipe.method !== ApplicationMethod.READY_TO_SPRAY && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex justify-between">
                  <span>Ilość Wody Bazy</span>
                  <span className="text-emerald-400 font-mono">{volume} L</span>
                </label>
                <input 
                  type="range" min="0.5" max="50" step="0.5" 
                  value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}
            
            {selectedRecipe && selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY && (
              <div className="mt-8 pt-8 border-t border-white/10 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-fuchsia-500/20 flex items-center justify-center mb-4">
                  <Wind className="w-8 h-8 text-fuchsia-400" />
                </div>
                <h4 className="font-bold text-fuchsia-400 uppercase tracking-widest text-sm mb-2">Gotowe do użycia</h4>
                <p className="text-xs text-white/60">Ten preparat nie wymaga rozcieńczania ani wyliczania zapotrzebowania z bazy wodnej.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Execution Engine / Work Tray */}
        <div className="lg:col-span-7">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[500px] flex flex-col">
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-emerald-400" /> Syringe Engine Allocation
            </h3>

            {!selectedRecipe ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                <Layers className="w-12 h-12 mb-4" />
                <p>Wybierz recepturę, aby wygenerować plan</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  
                  {selectedRecipe.notes && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 text-sm text-blue-200">
                      <Info className="w-5 h-5 shrink-0" />
                      <p>{selectedRecipe.notes}</p>
                    </div>
                  )}

                  <AnimatePresence>
                    {allocation.map((item, idx) => {
                      const isReadyToSpray = selectedRecipe.method === ApplicationMethod.READY_TO_SPRAY;
                      const hasWarning = !item.product.foliarAllowed && (method === ApplicationMethod.FOLIAR || method === ApplicationMethod.READY_TO_SPRAY);

                      return (
                        <motion.div 
                          key={item.productId}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-4 ${hasWarning ? 'bg-red-500/10 border-red-500/30' : 'bg-black border-white/10'}`}
                        >
                          <div className={`w-12 h-12 shrink-0 rounded-lg ${item.product.color} flex items-center justify-center shadow-lg`}>
                            {isReadyToSpray ? <Wind className="text-black w-6 h-6" /> : <Droplet className="text-black w-6 h-6" />}
                          </div>
                          
                          <div className="flex-1 min-w-[120px]">
                            <h4 className="font-bold text-sm">{item.product.name}</h4>
                            {!isReadyToSpray && (
                              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                                Dawka: {selectedRecipe.ingredients.find(i => i.productId === item.productId)?.concentration} ml/L
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end">
                            {hasWarning && (
                              <div className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2 border border-red-500/20">
                                <AlertCircle className="w-4 h-4" /> BŁĄD: Producent nie przewiduje użycia dolistnego
                              </div>
                            )}

                            {isReadyToSpray ? (
                              <div className="px-4 py-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-xs font-bold tracking-widest uppercase">
                                Aplikacja Bezpośrednia
                              </div>
                            ) : (
                              item.syringes.map((s, sIdx) => (
                                <div key={sIdx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                                  <Syringe className="w-3 h-3 text-white/40" />
                                  <div className="text-xs">
                                    <span className="text-white/40 mr-1">{s.type}:</span>
                                    <span className="font-mono text-emerald-400 font-bold">{s.amount}ml</span>
                                  </div>
                                </div>
                              ))
                            )}
                            
                            {!isReadyToSpray && item.syringes.length === 0 && !hasWarning && (
                              <div className="text-xs text-white/40 italic px-3 py-1.5">0 ml</div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Footer Execution */}
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Całkowite zapotrzebowanie preparatów</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{totalMl.toFixed(1)} <span className="text-sm text-white/40">ml</span></div>
                  </div>
                  <button 
                    onClick={handleExecute}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Play className="w-5 h-5 fill-current" /> Wykonaj Mieszankę
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

function InventoryView({ store }: { store: ReturnType<typeof useAppStore> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Database className="text-emerald-400" /> Magazyn Preparatów</h2>
        <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 font-mono">Stan na żywo</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {store.inventory.map(p => {
          const percentage = (p.remainingCapacity / p.initialCapacity) * 100;
          return (
            <div key={p.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex gap-4">
              <div className={`w-3 h-auto rounded-full ${p.color} shadow-sm shrink-0`} />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold">{p.name}</h4>
                    <span className="text-[9px] uppercase tracking-widest text-white/40">{p.brand} • {p.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">{p.remainingCapacity.toFixed(0)}</div>
                    <div className="text-[9px] text-white/40 uppercase">z {p.initialCapacity} {p.unit}</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden mt-3">
                  <div 
                    className={`h-full ${percentage < 10 ? 'bg-red-500' : percentage < 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-1">
                  {p.foliarAllowed && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold tracking-widest uppercase">Foliar ✅</span>}
                  {p.compatibleMedia.map(m => (
                    <span key={m} className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-[9px] font-bold tracking-widest uppercase">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

function CapabilitiesView({ store }: { store: ReturnType<typeof useAppStore> }) {
  // Mode: "Co mogę zrobić z tego co mam?"
  
  const possibleRecipes = store.recipes.filter(r => {
    // Check if we have enough of all required ingredients (at least > 0)
    return r.ingredients.every(ing => {
      const prod = store.getProduct(ing.productId);
      return prod && prod.remainingCapacity > 0;
    });
  });

  const impossibleRecipes = store.recipes.filter(r => !possibleRecipes.includes(r));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Search className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold">Możliwości Operacyjne</h2>
          <p className="text-sm text-white/40">Analiza dostępnych receptur na podstawie stanu magazynu</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Gotowe do wykonania ({possibleRecipes.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {possibleRecipes.map(r => (
              <div key={r.id} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="font-bold">{r.name}</div>
                <div className="text-xs text-white/40 mt-1">{r.method} • {r.medium.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Braki w magazynie ({impossibleRecipes.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {impossibleRecipes.map(r => {
              const missing = r.ingredients.filter(ing => {
                const p = store.getProduct(ing.productId);
                return !p || p.remainingCapacity <= 0;
              }).map(ing => store.getProduct(ing.productId)?.name || ing.productId);

              return (
                <div key={r.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 opacity-70">
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-red-400 mt-2 font-bold flex gap-2">
                    Brakujące: {missing.join(', ')}
                  </div>
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
      <h2 className="text-xl font-bold flex items-center gap-2"><HistoryIcon className="text-emerald-400" /> Dziennik Operacji</h2>
      
      <div className="space-y-4">
        {store.history.length === 0 ? (
          <div className="text-center p-12 text-white/40 border border-dashed border-white/10 rounded-2xl">Brak zapisanych operacji.</div>
        ) : store.history.map(item => {
          const recipe = item.recipeId ? store.getRecipe(item.recipeId) : null;
          return (
            <div key={item.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">{item.date}</div>
                <div className="font-bold">{recipe ? recipe.name : 'Niestandardowa Mieszanka'}</div>
                <div className="text-xs text-emerald-400 font-mono mt-1">
                  {item.method} • {item.volume}L wody • {item.totalMl.toFixed(1)}ml preparatów
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
                {Object.entries(item.doses).map(([pId, dose]) => {
                  const p = store.getProduct(pId);
                  return p ? (
                    <span key={pId} className="px-2 py-1 rounded bg-black border border-white/5">
                      {p.name}: {dose}ml/L
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

function BuilderView({ store, setActiveTab }: { store: ReturnType<typeof useAppStore>, setActiveTab: (t: Tab) => void }) {
  const [name, setName] = useState('');
  const [medium, setMedium] = useState<Medium>(Medium.TERRA);
  const [method, setMethod] = useState<ApplicationMethod>(ApplicationMethod.ROOT_FEED);
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  const handleAddIngredient = (productId: string) => {
    if (!ingredients.find(i => i.productId === productId)) {
      setIngredients([...ingredients, { productId, concentration: 1.0 }]);
    }
  };

  const updateIngredient = (productId: string, val: number) => {
    setIngredients(ingredients.map(i => i.productId === productId ? { ...i, concentration: val } : i));
  };

  const removeIngredient = (productId: string) => {
    setIngredients(ingredients.filter(i => i.productId !== productId));
  };

  const handleSave = () => {
    if (!name.trim() || ingredients.length === 0) return alert('Wpisz nazwę i dodaj składniki');
    store.addRecipe({
      id: crypto.randomUUID(),
      name,
      medium: [medium],
      method,
      stage,
      ingredients,
      isFactory: false,
      source: 'Custom User Recipe',
      sourceDate: new Date().toLocaleDateString()
    });
    alert('Zapisano recepturę!');
    setActiveTab('PLANNER');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold">Kreator Receptur</h2>
          <p className="text-sm text-white/40">Zbuduj własną mieszankę nawozów</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2">Nazwa Receptury</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="np. Mój Zestaw Weg..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Medium</label>
                <select value={medium} onChange={e => setMedium(e.target.value as Medium)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
                  {Object.values(Medium).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Faza</label>
                <select value={stage} onChange={e => setStage(e.target.value as GrowthStage)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
                  {Object.values(GrowthStage).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2">Metoda</label>
              <select value={method} onChange={e => setMethod(e.target.value as ApplicationMethod)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
                {Object.values(ApplicationMethod).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-white/40 uppercase mb-4">Dostępne Składniki</h3>
            <div className="flex flex-wrap gap-2">
              {store.inventory.map(p => {
                const isSelected = ingredients.some(i => i.productId === p.id);
                if (isSelected) return null;
                return (
                  <button key={p.id} onClick={() => handleAddIngredient(p.id)} className="px-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs hover:border-emerald-500 transition-colors">
                    + {p.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xs font-bold text-white/40 uppercase mb-4">Skład Receptury</h3>
          
          <div className="flex-1 space-y-3">
            {ingredients.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-white/40 text-sm">Brak składników</div>
            ) : ingredients.map(ing => {
              const product = store.getProduct(ing.productId);
              if (!product) return null;
              return (
                <div key={ing.productId} className="flex items-center gap-4 bg-black p-3 rounded-xl border border-white/10">
                  <div className={`w-8 h-8 rounded-lg ${product.color} shrink-0`} />
                  <div className="flex-1 font-bold text-sm">{product.name}</div>
                  <input type="number" step="0.1" min="0" value={ing.concentration} onChange={e => updateIngredient(ing.productId, parseFloat(e.target.value) || 0)} className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-right text-sm" />
                  <span className="text-xs text-white/40">ml/L</span>
                  <button onClick={() => removeIngredient(ing.productId)} className="text-red-400 p-1 hover:bg-red-400/10 rounded-lg">×</button>
                </div>
              )
            })}
          </div>

          <button onClick={handleSave} className="w-full mt-6 py-3 rounded-xl bg-emerald-500 text-black font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors">
            <Save className="w-4 h-4" /> Zapisz Recepturę
          </button>
        </div>
      </div>
    </div>
  );
}
