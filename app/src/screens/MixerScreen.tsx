import { useEffect, useState } from 'react';
import type { ScreenId } from '../domain/types.ts';
import { useAppStore } from '../store/AppStore.tsx';

function signalDone() {
  try { navigator.vibrate?.(180); } catch { /* no-op */ }
  try {
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    oscillator.connect(ctx.destination);
    oscillator.frequency.value = 760;
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch { /* no-op */ }
}

export function MixerScreen({ navigate }: { navigate: (screen: ScreenId) => void }) {
  const { state, selectedPlan, setMixerStep, completeExecution, completeOperatorExecution } = useAppStore();
  const stepIndex = Math.min(state.mixerStep, Math.max(0, (selectedPlan?.ingredients.length ?? 1) - 1));
  const ingredient = selectedPlan?.ingredients[stepIndex];
  const [added, setAdded] = useState(false);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(ingredient?.mixSeconds ?? 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAdded(false);
    setRunning(false);
    setRemaining(ingredient?.mixSeconds ?? 0);
  }, [stepIndex, ingredient?.id, ingredient?.mixSeconds]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [running, remaining]);

  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      signalDone();
    }
  }, [running, remaining]);

  if (!selectedPlan) {
    return (
      <section className="screen stack-lg">
        <div className="blocker">⛔ Brak wybranego planu.</div>
        <button className="primary" onClick={() => navigate('plan')}>DO PLANU</button>
      </section>
    );
  }

  if (!ingredient) {
    const finishAsOperator = () => {
      const result = completeOperatorExecution();
      if (result) setError(result);
      else navigate('history');
    };

    return (
      <section className="screen stack-lg">
        <div className="mixer-head">
          <div>
            <div className="eyebrow">MIXER · OPERATOR</div>
            <h1>{selectedPlan.label}</h1>
          </div>
          <span className="badge orange">OPERATOR</span>
        </div>

        <div className="warning">
          ⚠️ ARGUS nie ma automatycznych dawek dla tego dokładnego kontekstu. To nie jest zakaz wykonania.
        </div>

        <div className="mixer-card">
          <span className="eyebrow">RZECZYWISTOŚĆ MA PIERWSZEŃSTWO</span>
          <h2>Wykonaj według stanu rzeczywistego</h2>
          <p className="muted">Aplikacja nie wpisze nieznanych dawek do Historii. Zapisze tylko, że operator świadomie wykonał sesję poza automatycznym profilem ARGUS.</p>
        </div>

        {error ? <div className="blocker">⛔ {error}</div> : null}

        <div className="action-row">
          <button className="secondary" onClick={() => navigate('preparation')}>WRÓĆ</button>
          <button className="primary neon" onClick={finishAsOperator}>WYKONANIE ZAKOŃCZONE · OPERATOR</button>
        </div>
      </section>
    );
  }

  const last = stepIndex === selectedPlan.ingredients.length - 1;
  const hasTimer = ingredient.mixSeconds > 0;

  const next = () => {
    if (!last) {
      setMixerStep(stepIndex + 1);
      return;
    }
    const result = completeExecution();
    if (result) setError(result);
    else navigate('history');
  };

  return (
    <section className="screen stack-lg">
      <div className="mixer-head">
        <div>
          <div className="eyebrow">MIXER</div>
          <h1>Krok {stepIndex + 1}/{selectedPlan.ingredients.length}</h1>
        </div>
        <span className="badge orange">{state.controlMode}</span>
      </div>

      <div className="mixer-card">
        <span className="eyebrow">DODAJ</span>
        <h2>{ingredient.name}</h2>
        <div className="dose">{ingredient.amountMl} ml</div>
        <p>{ingredient.tool}</p>
        <button className={added ? 'secondary done' : 'primary'} onClick={() => setAdded(true)}>
          {added ? 'DODANO ✓' : 'DODAJ'}
        </button>
      </div>

      <div className="timer-card">
        <span className="eyebrow">MIESZANIE</span>
        {hasTimer ? (
          <>
            <div className="timer">{remaining}s</div>
            <div className="action-row">
              <button className="primary" disabled={running || remaining === 0} onClick={() => setRunning(true)}>
                START MIESZANIA
              </button>
              <button className="secondary" onClick={() => { setRunning(false); setRemaining(0); }}>
                POMIŃ TIMER
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Wymieszaj dokładnie</h2>
            <p className="muted">Brak zweryfikowanego czasu mieszania. ARGUS nie wymyśla timera.</p>
          </>
        )}
      </div>

      {error ? <div className="blocker">⛔ {error}</div> : null}

      <button className="primary neon" onClick={next}>
        {last ? 'PODLEWANIE ZAKOŃCZONE' : 'NASTĘPNY KROK'}
      </button>
    </section>
  );
}
