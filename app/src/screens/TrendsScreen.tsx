import { useAppStore } from '../store/AppStore.tsx';

export function TrendsScreen() {
  const { state } = useAppStore();
  const variantCounts = state.history.reduce<Record<string, number>>((acc, item) => {
    acc[item.planLabel] = (acc[item.planLabel] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">TRENDY</div>
        <h1>Minimum danych, zero wróżenia</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><span>Sesje</span><strong>{state.history.length}</strong></div>
        <div className="stat-card"><span>Pomiary donic</span><strong>{state.pots.reduce((sum, pot) => sum + pot.measurements.length, 0)}</strong></div>
      </div>

      <div className="trend-list">
        {state.pots.map((pot) => {
          const values = pot.measurements.slice(-8);
          const max = Math.max(1, ...values.map((item) => item.kg));
          return (
            <div className="trend-card" key={pot.id}>
              <strong>{pot.id}</strong>
              {values.length === 0 ? <small>Brak danych</small> : (
                <div className="bars">
                  {values.map((item) => <div key={item.at} className="bar" style={{ height: `${Math.max(8, (item.kg / max) * 100)}%` }} title={`${item.kg} kg`} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="history-card">
        <strong>Użyte warianty</strong>
        {Object.keys(variantCounts).length === 0 ? <small>Brak danych</small> : Object.entries(variantCounts).map(([label, count]) => <span key={label}>{label}: {count}</span>)}
      </div>
    </section>
  );
}
