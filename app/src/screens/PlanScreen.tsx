import { GROWTH_PHASES, PHASE_LABELS, type ScreenId } from '../domain/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

export function PlanScreen({ navigate }: { navigate: (screen: ScreenId) => void }) {
  const { state, plans, selectedPlan, selectPlan, setBatchLiters, setPhase } = useAppStore();

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">PLAN</div>
        <h1>Wybierz wariant</h1>
        <p className="muted">Wybór natychmiast przelicza partię. Bez dodatkowej bramki zatwierdzania.</p>
      </div>

      <label className="field">
        <span>Faza cyklu</span>
        <div className="liters-control">
          {GROWTH_PHASES.map((phase) => (
            <button
              key={phase}
              className={state.phase === phase ? 'chip active' : 'chip'}
              onClick={() => setPhase(phase)}
            >
              {PHASE_LABELS[phase]}
            </button>
          ))}
        </div>
        <small className="muted">Fazę wybiera operator. ARGUS nie przełącza jej automatycznie.</small>
      </label>

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
            disabled={!plan.selectable}
            onClick={() => selectPlan(plan.id)}
          >
            <div className="plan-card-top">
              <strong>{plan.label}</strong>
              {!plan.selectable ? <span className="badge orange">BRAK ZWERYFIKOWANEGO PLANU</span> : null}
            </div>
            <p>{plan.description}</p>
            {plan.availabilityReason ? <small className="muted">{plan.availabilityReason}</small> : null}
            <small>Dzień {plan.cycleDay} · {PHASE_LABELS[plan.phase]} · {plan.ingredients.length} kroków · {plan.batchLiters} L</small>
          </button>
        ))}
      </div>

      <button className="primary" disabled={!selectedPlan?.selectable} onClick={() => navigate('preparation')}>
        PRZEJDŹ DO PRZYGOTOWANIA
      </button>
    </section>
  );
}
