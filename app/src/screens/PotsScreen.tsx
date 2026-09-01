import { useState } from 'react';
import { useAppStore } from '../store/AppStore.tsx';

export function PotsScreen() {
  const { state, recordPotWeight } = useAppStore();
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">DONICE</div>
        <h1>D1–D4</h1>
        <p className="muted">Szybki wpis masy i historia. Bez zgadywania na podstawie jednego pomiaru.</p>
      </div>

      <div className="pot-grid">
        {state.pots.map((pot) => {
          const latest = pot.measurements.at(-1);
          const previous = pot.measurements.at(-2);
          const delta = latest && previous ? latest.kg - previous.kg : null;
          return (
            <div className="pot-card" key={pot.id}>
              <div className="pot-title"><strong>{pot.id}</strong><span>{latest ? `${latest.kg.toFixed(2)} kg` : 'brak pomiaru'}</span></div>
              {delta !== null ? <small className={delta < 0 ? 'delta down' : 'delta'}>{delta >= 0 ? '+' : ''}{delta.toFixed(2)} kg</small> : null}
              <div className="weight-entry">
                <input
                  inputMode="decimal"
                  placeholder="kg"
                  value={values[pot.id] ?? ''}
                  onChange={(event) => setValues((current) => ({ ...current, [pot.id]: event.target.value.replace(',', '.') }))}
                />
                <button
                  className="secondary"
                  onClick={() => {
                    const kg = Number(values[pot.id]);
                    if (Number.isFinite(kg) && kg > 0) {
                      recordPotWeight(pot.id, kg);
                      setValues((current) => ({ ...current, [pot.id]: '' }));
                    }
                  }}
                >
                  ZAPISZ
                </button>
              </div>
              <small>{pot.measurements.length} pomiarów</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
