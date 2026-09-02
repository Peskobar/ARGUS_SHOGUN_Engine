import { useState } from 'react';
import type { ControlMode, ScreenId } from './domain/types.ts';
import { HistoryScreen } from './screens/HistoryScreen.tsx';
import { InventoryScreen } from './screens/InventoryScreen.tsx';
import { MixerScreen } from './screens/MixerScreen.tsx';
import { PlanScreen } from './screens/PlanScreen.tsx';
import { PotsScreen } from './screens/PotsScreen.tsx';
import { PreparationScreen } from './screens/PreparationScreen.tsx';
import { TodayScreen } from './screens/TodayScreen.tsx';
import { TrendsScreen } from './screens/TrendsScreen.tsx';
import { useAppStore } from './store/AppStore.tsx';
import './inventory.css';

const nav: Array<{ id: ScreenId; label: string; icon: string }> = [
  { id: 'today', label: 'Dzisiaj', icon: '◉' },
  { id: 'plan', label: 'Plan', icon: '▦' },
  { id: 'pots', label: 'Donice', icon: '◫' },
  { id: 'mixer', label: 'Mixer', icon: '⌁' },
  { id: 'inventory', label: 'Magazyn', icon: '▤' },
  { id: 'history', label: 'Historia', icon: '↺' },
  { id: 'trends', label: 'Trendy', icon: '⌁' },
];

export default function App() {
  const { state, setControlMode, resetDemo } = useAppStore();
  const [screen, setScreen] = useState<ScreenId>('today');

  let content;
  switch (screen) {
    case 'plan': content = <PlanScreen navigate={setScreen} />; break;
    case 'preparation': content = <PreparationScreen navigate={setScreen} />; break;
    case 'pots': content = <PotsScreen />; break;
    case 'mixer': content = <MixerScreen navigate={setScreen} />; break;
    case 'inventory': content = <InventoryScreen />; break;
    case 'history': content = <HistoryScreen />; break;
    case 'trends': content = <TrendsScreen />; break;
    default: content = <TodayScreen navigate={setScreen} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen('today')}>
          <span className="brand-mark">将</span>
          <span><strong>ARGUS</strong><small>SHOGUN</small></span>
        </button>
        <div className="mode-wrap">
          <label>TRYB</label>
          <select value={state.controlMode} onChange={(event) => setControlMode(event.target.value as ControlMode)}>
            <option value="PRO">PRO</option>
            <option value="STANDARD">STANDARD</option>
            <option value="UNLOCKED">UNLOCKED</option>
          </select>
        </div>
      </header>

      <div className="demo-banner">⚠ DANE DEMO · NIE UŻYWAJ JAKO RECEPTURY PRODUCENTA</div>

      <main>{content}</main>

      <button className="reset-link" onClick={resetDemo}>Reset danych demo · magazyn zostaje</button>

      <nav className="bottom-nav">
        {nav.map((item) => (
          <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}>
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
