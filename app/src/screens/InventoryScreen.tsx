import { INVENTORY_UNITS, type InventoryUnit } from '../domain/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

export function InventoryScreen() {
  const { state, setInventoryQuantity, setInventoryUnit } = useAppStore();
  const filled = state.inventory.filter((item) => item.quantity !== null).length;

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">MAGAZYN</div>
        <h1>Twoje nawozy</h1>
        <p className="muted">Wpisujesz stan ręcznie. ARGUS niczego sam nie odejmuje i nie zgaduje.</p>
      </div>

      <div className="forecast-card">
        <span>Uzupełnione stany</span>
        <strong>{filled}/{state.inventory.length}</strong>
      </div>

      <div className="inventory-list">
        {state.inventory.map((item) => {
          const status = item.quantity === null ? 'BRAK STANU' : item.quantity === 0 ? 'PUSTY' : 'USTAWIONO';
          return (
            <article className="inventory-card" key={item.id}>
              <div className="inventory-title">
                <strong>{item.name}</strong>
                <span className={item.quantity !== null && item.quantity > 0 ? 'status-dot' : 'badge orange'}>{status}</span>
              </div>

              <div className="inventory-controls">
                <input
                  aria-label={`Ilość ${item.name}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  placeholder="wpisz ilość"
                  value={item.quantity ?? ''}
                  onChange={(event) => {
                    const raw = event.currentTarget.value;
                    setInventoryQuantity(item.id, raw === '' ? null : Number(raw));
                  }}
                />
                <select
                  aria-label={`Jednostka ${item.name}`}
                  value={item.unit}
                  onChange={(event) => setInventoryUnit(item.id, event.currentTarget.value as InventoryUnit)}
                >
                  {INVENTORY_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
            </article>
          );
        })}
      </div>

      <div className="warning">⚠️ Magazyn jest ewidencją operatora. Reset danych demo nie kasuje wpisanych tutaj ilości.</div>
    </section>
  );
}
