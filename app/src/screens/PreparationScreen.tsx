import { getAdvisories, validatePlanForExecution } from '../domain/planEngine.ts';
import type { ScreenId } from '../domain/types.ts';
import { getManufacturerRuntime } from '../manufacturerRuntime/getManufacturerRuntime.ts';
import { useAppStore } from '../store/AppStore.tsx';

export function PreparationScreen({ navigate }: { navigate: (screen: ScreenId) => void }) {
  const { state, selectedPlan, setMixerStep } = useAppStore();
  const blockers = validatePlanForExecution(selectedPlan);
  const advisories = getAdvisories(selectedPlan, state.controlMode);
  const automaticMixerReady = blockers.length === 0;
  const manufacturerRuntime = getManufacturerRuntime({
    phase: state.phase,
    phaseWeek: state.phaseWeek,
    waterProfile: state.waterProfile,
    customWaterEc: state.customWaterEc,
    scheduleProfile: state.scheduleProfile,
  });
  const showManufacturerGuidance = selectedPlan?.id === 'manufacturer';

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">PRZYGOTOWANIE</div>
        <h1>{selectedPlan?.label ?? 'Brak planu'}</h1>
        <p className="muted">{selectedPlan?.batchLiters ?? 0} L · produkt + ilość + narzędzie</p>
      </div>

      {advisories.map((text) => <div className="warning" key={text}>⚠️ {text}</div>)}
      {blockers.map((text) => <div className="blocker" key={text}>⚙️ {text}</div>)}

      {selectedPlan?.ingredients.length ? (
        <div className="ingredient-list">
          {selectedPlan.ingredients.map((ingredient) => (
            <div className="ingredient-row" key={ingredient.id}>
              <div><strong>{ingredient.name}</strong><small>{ingredient.tool}</small></div>
              <b>{ingredient.amountMl} ml</b>
            </div>
          ))}
        </div>
      ) : null}

      {showManufacturerGuidance ? (
        <div className="plan-card stack-lg">
          <div className="plan-card-top">
            <div>
              <div className="eyebrow">WSKAZÓWKI PRODUCENTA</div>
              <strong>{manufacturerRuntime.executionMode === 'AUTO' ? 'Pełny profil' : 'Operator + guidance'}</strong>
            </div>
            <span className={manufacturerRuntime.verifiedRecipeAvailable ? 'badge' : 'badge orange'}>
              {manufacturerRuntime.guidanceStatus}
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
                  <b>INFO</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Producent nie ma przypisanego produktu w tej warstwie dla tego dokładnego okna. Operator nadal może kontynuować.</p>
          )}

          {manufacturerRuntime.mixingGuidance.map((text) => (
            <div className="warning" key={text}>⚠️ {text}</div>
          ))}

          {manufacturerRuntime.warnings.slice(0, 3).map((text) => (
            <p className="muted" key={text}>• {text}</p>
          ))}
        </div>
      ) : null}

      {!automaticMixerReady && selectedPlan ? (
        <div className="warning">⚠️ Automatyczny Mixer nie ma kompletu danych. Operator nadal może przejść dalej i zapisać wykonanie jako decyzję operatora.</div>
      ) : null}

      <div className="action-row">
        <button className="secondary" onClick={() => navigate('plan')}>WRÓĆ</button>
        <button
          className="primary"
          disabled={!selectedPlan}
          onClick={() => { setMixerStep(0); navigate('mixer'); }}
        >
          {automaticMixerReady ? 'START MIXERA' : 'DALEJ JAKO OPERATOR'}
        </button>
      </div>
    </section>
  );
}
