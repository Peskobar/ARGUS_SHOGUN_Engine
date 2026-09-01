import { getAdvisories, validatePlanForExecution } from '../domain/planEngine.ts';
import type { ScreenId } from '../domain/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

export function PreparationScreen({ navigate }: { navigate: (screen: ScreenId) => void }) {
  const { state, selectedPlan, setMixerStep } = useAppStore();
  const blockers = validatePlanForExecution(selectedPlan);
  const advisories = getAdvisories(selectedPlan, state.controlMode);

  return (
    <section className="screen stack-lg">
      <div>
        <div className="eyebrow">PRZYGOTOWANIE</div>
        <h1>{selectedPlan?.label ?? 'Brak planu'}</h1>
        <p className="muted">{selectedPlan?.batchLiters ?? 0} L · produkt + ilość + narzędzie</p>
      </div>

      {advisories.map((text) => <div className="warning" key={text}>⚠️ {text}</div>)}
      {blockers.map((text) => <div className="blocker" key={text}>⛔ {text}</div>)}

      <div className="ingredient-list">
        {selectedPlan?.ingredients.map((ingredient) => (
          <div className="ingredient-row" key={ingredient.id}>
            <div><strong>{ingredient.name}</strong><small>{ingredient.tool}</small></div>
            <b>{ingredient.amountMl} ml</b>
          </div>
        ))}
      </div>

      <div className="action-row">
        <button className="secondary" onClick={() => navigate('plan')}>WRÓĆ</button>
        <button
          className="primary"
          disabled={blockers.length > 0}
          onClick={() => { setMixerStep(0); navigate('mixer'); }}
        >
          START MIXERA
        </button>
      </div>
    </section>
  );
}
