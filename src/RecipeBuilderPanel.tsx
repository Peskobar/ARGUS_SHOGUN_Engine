import { useMemo, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { orderIngredientsByRole, validateRecipeContext } from './recipeEngine';
import { useAppStore } from './store';
import { ApplicationMethod, GrowthStage, Medium, type Recipe, type RecipeIngredient } from './types';
import { plLabel } from './uiPolish';

export default function RecipeBuilderPanel() {
  const store = useAppStore();
  const [name, setName] = useState('');
  const [medium, setMedium] = useState<Medium>(Medium.TERRA);
  const [method, setMethod] = useState<ApplicationMethod>(ApplicationMethod.ROOT_FEED);
  const [stage, setStage] = useState<GrowthStage>(GrowthStage.VEG);
  const [weekStart, setWeekStart] = useState(1);
  const [weekEnd, setWeekEnd] = useState(1);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [message, setMessage] = useState('');

  const products = useMemo(() => store.inventory.filter(product => {
    if (product.unit !== 'ml') return false;
    if (method === ApplicationMethod.FOLIAR) return product.foliarAllowed;
    if (method === ApplicationMethod.READY_TO_SPRAY) return product.type === 'READY_TO_USE';
    return product.type !== 'READY_TO_USE';
  }), [store.inventory, method]);

  const add = (productId: string) => {
    if (ingredients.some(item => item.productId === productId)) return;
    const next = [...ingredients, { productId, concentration: method === ApplicationMethod.READY_TO_SPRAY ? 0 : 1 }];
    setIngredients(method === ApplicationMethod.ROOT_FEED ? orderIngredientsByRole(next, store.inventory) : normalize(next));
  };

  const save = () => {
    if (!name.trim() || ingredients.length === 0) {
      setMessage('Nazwa i co najmniej jeden składnik są wymagane.');
      return;
    }
    const candidate: Recipe = {
      id: crypto.randomUUID(),
      name: name.trim(),
      medium: [medium],
      method,
      stage,
      weekStart,
      weekEnd: Math.max(weekStart, weekEnd),
      ingredients: normalize(ingredients),
      isFactory: false,
      verificationStatus: 'UNVERIFIED',
      executionPolicy: 'SIMULATION_ONLY',
      source: 'Custom User Recipe',
      sourceDate: new Date().toISOString().slice(0, 10),
    };
    const errors = validateRecipeContext(candidate, store.inventory, { medium, method, week: weekStart }, 'SIMULATION').filter(item => item.severity === 'ERROR');
    if (errors.length) {
      setMessage(errors[0].message);
      return;
    }
    const ok = store.addRecipe(candidate);
    setMessage(ok ? 'Zapisano jako NIEZWERYFIKOWANE / TYLKO SYMULACJA. Osobny audyt może później nadać autoryzację do wykonania.' : 'Nie udało się zapisać receptury.');
    if (ok) { setName(''); setIngredients([]); }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-6">
      <div className="mb-5 flex items-center gap-2"><Settings className="h-5 w-5 text-amber-300" /><div><h2 className="font-black">Kreator receptur</h2><p className="text-xs text-white/40">Własna receptura zawsze zaczyna jako NIEZWERYFIKOWANA / TYLKO SYMULACJA. Kreator nie może sam nadać sobie prawa do fizycznego wykonania.</p></div></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <input className="w-full rounded-xl border border-white/10 bg-black px-3 py-2" placeholder="Nazwa receptury" value={name} onChange={event => setName(event.target.value)} />
          <div className="grid grid-cols-2 gap-3"><Select value={medium} onChange={value => setMedium(value as Medium)} options={Object.values(Medium)} /><Select value={stage} onChange={value => setStage(value as GrowthStage)} options={Object.values(GrowthStage).filter(value => value !== GrowthStage.ALL)} /></div>
          <Select value={method} onChange={value => { setMethod(value as ApplicationMethod); setIngredients([]); }} options={[ApplicationMethod.ROOT_FEED, ApplicationMethod.FOLIAR, ApplicationMethod.READY_TO_SPRAY]} />
          <div className="grid grid-cols-2 gap-3"><NumberField label="Od tygodnia" value={weekStart} onChange={setWeekStart} /><NumberField label="Do tygodnia" value={weekEnd} onChange={setWeekEnd} /></div>
          <div className="border-t border-white/10 pt-3"><div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/35">Dodaj składnik</div><div className="flex flex-wrap gap-2">{products.filter(product => !ingredients.some(item => item.productId === product.id)).map(product => <button key={product.id} type="button" onClick={() => add(product.id)} className="rounded-lg border border-white/10 bg-black px-2 py-1 text-xs hover:border-emerald-500/50">+ {product.name}</button>)}</div></div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/35">Skład i jawna kolejność mieszania</div><div className="space-y-2">{ingredients.map((ingredient, index) => { const product = store.getProduct(ingredient.productId); return product ? <div key={ingredient.productId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3"><span className="w-6 font-mono text-xs text-white/30">{index + 1}</span><span className="flex-1 text-sm font-bold">{product.name}</span>{method !== ApplicationMethod.READY_TO_SPRAY && <input className="w-20 rounded-lg border border-white/10 bg-black px-2 py-1 text-right font-mono text-sm" type="number" min="0" step="0.1" value={ingredient.concentration} onChange={event => setIngredients(current => current.map(item => item.productId === ingredient.productId ? { ...item, concentration: Math.max(0, Number(event.target.value) || 0) } : item))} />}<span className="text-[10px] text-white/35">{method === ApplicationMethod.READY_TO_SPRAY ? 'GOTOWY OPRYSK' : 'ml/L'}</span><button type="button" onClick={() => setIngredients(current => normalize(current.filter(item => item.productId !== ingredient.productId)))} className="text-red-300">×</button></div> : null; })}{ingredients.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">Brak składników</div>}</div><button type="button" onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-black"><Save className="h-4 w-4" />Zapisz do symulacji</button>{message && <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/60">{message}</div>}</section>
      </div>
    </main>
  );
}

function normalize(items: RecipeIngredient[]): RecipeIngredient[] { return items.map((item, index) => ({ ...item, mixOrder: (index + 1) * 100 })); }
function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <select className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{plLabel(option)}</option>)}</select>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs text-white/40">{label}<input className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 font-mono text-sm text-white" type="number" min="1" max="20" step="1" value={value} onChange={event => onChange(Math.max(1, Number(event.target.value) || 1))} /></label>; }
