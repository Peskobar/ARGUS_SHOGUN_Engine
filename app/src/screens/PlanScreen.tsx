import type { ScreenId } from '../domain/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

export function PlanScreen({ navigate }: { navigate: (screen: ScreenId) => void }) {
  const { state, plans, selectPlan, setBatchLiters } = useAppStore();

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">PLAN</div>
        <h1>Wybierz wariant</h1>
        <p className="muted">Wybór natychmiast przelicza partię. Bez dodatkowej bramki zatwierdzania.</p>
      </div>

      <label className="field">
        <span>Objętość partii</span>
        <div className="liters-control">
          {[5, 10, 15, 20].map((value) => (
            <button key={value} className={state.batchLiters === value ? 'chip active' : 'chip'} onClick={() => setBatchLiters(value)}>
              {value} L
            </button>
          ))}
        </div>
      </label>

      <div className="plan-grid">
        {plans.map((plan) => (
          <button
            key={plan.id}
            className={state.selectedPlanId === plan.id ? 'plan-card selected' : 'plan-card'}
            onClick={() => selectPlan(plan.id)}
          >
            <div className="plan-card-top">
              <strong>{plan.label}</strong>
            </div>
            <p>{plan.description}</p>
            <small>{plan.ingredients.length} kroków · {plan.batchLiters} L</small>
          </button>
        ))}
      </div>

      <button className="primary" disabled={!state.selectedPlanId} onClick={() => navigate('preparation')}>
        PRZEJDŹ DO PRZYGOTOWANIA
      </button>
    </section>
  );
}
