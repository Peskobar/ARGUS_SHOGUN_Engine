import { Database } from 'lucide-react';
import { useAppStore } from './store';

export default function InventoryPanel() {
  const store = useAppStore();
  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <div className="mb-4 flex items-center gap-2"><Database className="h-5 w-5 text-emerald-300" /><h2 className="font-black">Magazyn</h2></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {store.inventory.map(product => {
          const percent = product.initialCapacity > 0 ? Math.max(0, Math.min(100, product.remainingCapacity / product.initialCapacity * 100)) : 0;
          return <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-bold">{product.name}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{product.type} · {product.mixingRole ?? 'OTHER'}</div></div><div className="text-right font-mono text-sm text-emerald-300">{product.remainingCapacity.toFixed(2)} {product.unit}<div className="text-[10px] text-white/30">z {product.initialCapacity}</div></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black"><div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} /></div></div>;
        })}
      </div>
    </main>
  );
}
