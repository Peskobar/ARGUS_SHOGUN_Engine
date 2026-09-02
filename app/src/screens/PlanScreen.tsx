import { getCycleCoverage } from '../data/cycleCoverage.ts';
import {
  GROWTH_PHASES,
  PHASE_LABELS,
  SCHEDULE_PROFILES,
  SCHEDULE_PROFILE_LABELS,
  WATER_PROFILES,
  WATER_PROFILE_LABELS,
  type ScreenId,
} from '../domain/types.ts';
import { getManufacturerRuntime } from '../manufacturerRuntime/getManufacturerRuntime.ts';
import type { GuidanceStatus } from '../manufacturerRuntime/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

const GUIDANCE_LABELS: Record<GuidanceStatus, string> = {
  VERIFIED_AUTO: 'VERIFIED AUTO',
  PARTIAL_VERIFIED: 'PARTIAL VERIFIED',
  OPERATOR_GUIDANCE: 'OPERATOR + GUIDANCE',
  CONFLICT: 'CONFLICT',
  NO_EVIDENCE: 'NO EVIDENCE',
};

export function PlanScreen({ navigate }: { navigate: (screen: ScreenId) => void }) {
  const {
    state,
    plans,
    selectedPlan,
    selectPlan,
    setBatchLiters,
    setPhase,
    setPhaseWeek,
    setWaterProfile,
    setCustomWaterEc,
    setScheduleProfile,
  } = useAppStore();

  const needsDetailedManufacturerContext = state.phase === 'VEG' || state.phase === 'FLOWER';
  const runtimeQuery = {
    phase: state.phase,
    phaseWeek: state.phaseWeek,
    waterProfile: state.waterProfile,
    customWaterEc: state.customWaterEc,
    scheduleProfile: state.scheduleProfile,
  };
  const coverage = getCycleCoverage({
    batchLiters: state.batchLiters,
    cycleDay: plans[0]?.cycleDay ?? 1,
    ...runtimeQuery,
  });
  const manufacturerRuntime = getManufacturerRuntime(runtimeQuery);

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">PLAN</div>
        <h1>Wybierz wariant</h1>
        <p className="muted">ARGUS doradza i ostrzega. Operator wybiera i zawsze może przejść dalej.</p>
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

      <div className="plan-card stack-lg">
        <div>
          <div className="eyebrow">KONTEKST PRODUCENTA</div>
          <p className="muted">Pomaga wybrać dokładny profil. Brak danych nie odbiera operatorowi prawa do kontynuacji.</p>
        </div>

        <label className="field">
          <span>Tydzień fazy</span>
          <div className="weight-entry">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              placeholder="np. 1"
              value={state.phaseWeek ?? ''}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setPhaseWeek(value === '' ? null : Number(value));
              }}
            />
          </div>
        </label>

        {needsDetailedManufacturerContext ? (
          <>
            <label className="field">
              <span>Woda</span>
              <div className="liters-control">
                {WATER_PROFILES.map((profile) => (
                  <button
                    key={profile}
                    className={state.waterProfile === profile ? 'chip active' : 'chip'}
                    onClick={() => setWaterProfile(profile)}
                  >
                    {WATER_PROFILE_LABELS[profile]}
                  </button>
                ))}
              </div>
              <small className="muted">Kategorie 1:1 z kalkulatora producenta.</small>
            </label>

            {state.waterProfile === 'CUSTOM' ? (
              <label className="field">
                <span>EC własnej wody</span>
                <div className="weight-entry">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="wartość z miernika EC"
                    value={state.customWaterEc ?? ''}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setCustomWaterEc(value === '' ? null : Number(value));
                    }}
                  />
                </div>
              </label>
            ) : null}

            <label className="field">
              <span>Profil karmienia</span>
              <div className="liters-control">
                {SCHEDULE_PROFILES.map((profile) => (
                  <button
                    key={profile}
                    className={state.scheduleProfile === profile ? 'chip active' : 'chip'}
                    onClick={() => setScheduleProfile(profile)}
                  >
                    {SCHEDULE_PROFILE_LABELS[profile]}
                  </button>
                ))}
              </div>
            </label>
          </>
        ) : null}

        <div className={coverage.mode === 'AUTOMATED' ? 'status-dot' : 'warning'}>
          {coverage.mode === 'AUTOMATED' ? 'AUTO' : 'OPERATOR'} · {coverage.reason}
        </div>
      </div>

      <div className="plan-card stack-lg">
        <div className="plan-card-top">
          <div>
            <div className="eyebrow">CO MÓWI PRODUCENT?</div>
            <strong>{PHASE_LABELS[state.phase]}{state.phaseWeek ? ` · tydzień ${state.phaseWeek}` : ''}</strong>
          </div>
          <span className={manufacturerRuntime.verifiedRecipeAvailable ? 'badge' : 'badge orange'}>
            {GUIDANCE_LABELS[manufacturerRuntime.guidanceStatus]}
          </span>
        </div>

        {manufacturerRuntime.products.length > 0 ? (
          <div className="ingredient-list">
            {manufacturerRuntime.products.map((product) => (
              <div className="ingredient-row" key={product.productId}>
                <div>
                  <strong>{product.officialName}</strong>
                  <small>{product.purpose.value ?? 'Brak potwierdzonego opisu funkcji.'}</small>
                </div>
                <b>GUIDANCE</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Brak produktu przypisanego do tego dokładnego okna. Kontekst fazy nadal pozostaje dostępny.</p>
        )}

        {manufacturerRuntime.mixingGuidance.map((text) => (
          <div className="warning" key={text}>⚠️ {text}</div>
        ))}

        <div>
          <div className="eyebrow">WSKAZÓWKI</div>
          {manufacturerRuntime.manufacturerGuidance.slice(0, 4).map((text) => (
            <p className="muted" key={text}>• {text}</p>
          ))}
        </div>

        {manufacturerRuntime.missingEvidence.length > 0 ? (
          <div>
            <div className="eyebrow">BRAKUJE DO AUTO</div>
            {manufacturerRuntime.missingEvidence.slice(0, 4).map((text) => (
              <p className="muted" key={text}>• {text}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="plan-grid">
        {plans.map((plan) => (
          <button
            key={plan.id}
            className={state.selectedPlanId === plan.id ? 'plan-card selected' : 'plan-card'}
            onClick={() => selectPlan(plan.id)}
          >
            <div className="plan-card-top">
              <strong>{plan.label}</strong>
              {plan.id === 'manufacturer' && plan.verifiedProfileAvailable ? (
                <span className="badge">ZWERYFIKOWANY</span>
              ) : plan.id === 'manufacturer' ? (
                <span className="badge orange">OPERATOR</span>
              ) : null}
            </div>
            <p>{plan.description}</p>
            {plan.availabilityReason ? <small className="muted">{plan.availabilityReason}</small> : null}
            <small>Dzień {plan.cycleDay} · {PHASE_LABELS[plan.phase]} · {plan.ingredients.length} kroków · {plan.batchLiters} L</small>
          </button>
        ))}
      </div>

      <button className="primary" disabled={!selectedPlan} onClick={() => navigate('preparation')}>
        PRZEJDŹ DO PRZYGOTOWANIA
      </button>
    </section>
  );
}
