import { getCycleDay } from '../domain/planEngine.ts';
import { PHASE_LABELS, type ScreenId } from '../domain/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

export function TodayScreen({ navigate }: { navigate: (screen: ScreenId) => void }) {
  const { state, selectedPlan } = useAppStore();
  const cycleDay = getCycleDay(state.cycleStartDate);
  const attention = state.pots
    .map((pot) => {
      const items = pot.measurements;
      if (items.length < 2) return null;
      const previous = items[items.length - 2].kg;
      const latest = items[items.length - 1].kg;
      return { id: pot.id, delta: latest - previous };
    })
    .filter((item): item is { id: 'D1' | 'D2' | 'D3' | 'D4'; delta: number } => Boolean(item))
    .sort((a, b) => a.delta - b.delta)[0];

  const selectedLabel = selectedPlan?.label ?? 'Wybierz wariant';

  return (
    <section className="screen stack-lg">
      <div className="eyebrow">DZISIAJ</div>
      <div className="hero-row">
        <div>
          <h1>{new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</h1>
          <p className="muted">Dzień cyklu: {cycleDay} · Faza: {PHASE_LABELS[state.phase]}</p>
        </div>
        <span className="status-dot">ONLINE/OFFLINE READY</span>
      </div>

      <div className="forecast-card">
        <span>Stan operatora</span>
        <strong>{state.history.length === 0 ? 'Brak wykonanej sesji' : `Ostatnie wykonania: ${state.history.length}`}</strong>
      </div>

      {attention && attention.delta < 0 ? (
        <button className="attention-card" onClick={() => navigate('pots')}>
          <span>{attention.id}</span>
          <strong>Masa spadła o {Math.abs(attention.delta).toFixed(2)} kg</strong>
          <small>Otwórz historię donicy</small>
        </button>
      ) : null}

      <button className="plan-hero" onClick={() => navigate('plan')}>
        <span className="eyebrow">PLAN NA DZIŚ</span>
        <strong>{selectedLabel}</strong>
        <span>{state.batchLiters} L · {PHASE_LABELS[state.phase]} · przejdź do planu →</span>
      </button>
    </section>
  );
}
