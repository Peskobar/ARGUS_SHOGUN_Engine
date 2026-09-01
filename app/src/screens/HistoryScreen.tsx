import { PHASE_LABELS } from '../domain/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

export function HistoryScreen() {
  const { state } = useAppStore();

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">HISTORIA</div>
        <h1>Wykonane sesje</h1>
        <p className="muted">Snapshot wykonania, nie aktualna wersja planu.</p>
      </div>

      {state.history.length === 0 ? <div className="empty">Brak wykonanych sesji.</div> : null}

      <div className="history-list">
        {state.history.map((record) => {
          const operatorOverride = record.executionMode === 'OPERATOR_OVERRIDE';
          const phaseText = record.phase ? PHASE_LABELS[record.phase] : 'starszy zapis';
          const weekText = record.phaseWeek ? ` · T${record.phaseWeek}` : '';
          const dayText = record.cycleDay ? ` · Dzień ${record.cycleDay}` : '';
          return (
            <article className="history-card" key={record.id}>
              <div className="history-top">
                <strong>{record.planLabel}</strong>
                <span>{record.batchLiters} L</span>
              </div>
              <small>{new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.completedAt))}</small>
              <small>{phaseText}{weekText}{dayText}</small>
              <small>Tryb: {operatorOverride ? 'OPERATOR' : record.controlMode}</small>
              {operatorOverride ? (
                <div className="warning">⚠️ {record.executionNote ?? 'Wykonanie operatora. ARGUS nie posiadał pełnych danych składników.'}</div>
              ) : null}
              <div className="history-ingredients">
                {record.ingredients.map((item) => <span key={item.id}>{item.name}: {item.amountMl} ml</span>)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
