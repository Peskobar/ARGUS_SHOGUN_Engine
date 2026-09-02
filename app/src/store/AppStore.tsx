import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { INVENTORY_SEED } from '../data/inventorySeed.ts';
import { buildPlanVariants, getCycleDay, validatePlanForExecution } from '../domain/planEngine.ts';
import {
  GROWTH_PHASES,
  INVENTORY_UNITS,
  SCHEDULE_PROFILES,
  WATER_PROFILES,
  type AppState,
  type ControlMode,
  type GrowthPhase,
  type InventoryItem,
  type InventoryUnit,
  type PlanId,
  type PlanVariant,
  type ScheduleProfile,
  type WaterProfile,
} from '../domain/types.ts';

const STORAGE_KEY = 'argus-shogun-v1-state';

const freshInventory = (): InventoryItem[] => INVENTORY_SEED.map((item) => ({ ...item }));

function normalizeInventory(value: unknown): InventoryItem[] {
  const stored = Array.isArray(value) ? value : [];
  const byId = new Map<string, InventoryItem>();

  for (const raw of stored) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Partial<InventoryItem>;
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') continue;
    if (!INVENTORY_UNITS.includes(candidate.unit as InventoryUnit)) continue;
    const quantity = candidate.quantity === null
      ? null
      : Number.isFinite(candidate.quantity) && (candidate.quantity ?? -1) >= 0
        ? Number(candidate.quantity)
        : null;
    byId.set(candidate.id, {
      id: candidate.id,
      name: candidate.name,
      quantity,
      unit: candidate.unit as InventoryUnit,
    });
  }

  return INVENTORY_SEED.map((seed) => byId.get(seed.id) ?? { ...seed });
}

const createInitialState = (): AppState => ({
  controlMode: 'STANDARD',
  batchLiters: 10,
  cycleStartDate: new Date().toISOString().slice(0, 10),
  phase: 'SEEDLING',
  phaseWeek: null,
  waterProfile: null,
  customWaterEc: null,
  scheduleProfile: null,
  selectedPlanId: 'balanced',
  mixerStep: 0,
  history: [],
  pots: [
    { id: 'D1', measurements: [] },
    { id: 'D2', measurements: [] },
    { id: 'D3', measurements: [] },
    { id: 'D4', measurements: [] },
  ],
  inventory: freshInventory(),
});

function loadState(): AppState {
  const initial = createInitialState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;

    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || !Array.isArray(parsed.pots) || !Array.isArray(parsed.history)) return initial;

    const phase = GROWTH_PHASES.includes(parsed.phase as GrowthPhase)
      ? (parsed.phase as GrowthPhase)
      : initial.phase;
    const phaseWeek = Number.isInteger(parsed.phaseWeek) && (parsed.phaseWeek ?? 0) > 0
      ? parsed.phaseWeek as number
      : null;
    const waterProfile = WATER_PROFILES.includes(parsed.waterProfile as WaterProfile)
      ? (parsed.waterProfile as WaterProfile)
      : null;
    const customWaterEc = waterProfile === 'CUSTOM' && Number.isFinite(parsed.customWaterEc) && (parsed.customWaterEc ?? -1) >= 0
      ? parsed.customWaterEc as number
      : null;
    const scheduleProfile = SCHEDULE_PROFILES.includes(parsed.scheduleProfile as ScheduleProfile)
      ? (parsed.scheduleProfile as ScheduleProfile)
      : null;
    const selectedPlanId: PlanId | null =
      parsed.selectedPlanId === 'manufacturer' || parsed.selectedPlanId === 'balanced' || parsed.selectedPlanId === 'growth'
        ? parsed.selectedPlanId
        : initial.selectedPlanId;

    return {
      ...initial,
      ...parsed,
      phase,
      phaseWeek,
      waterProfile,
      customWaterEc,
      scheduleProfile,
      selectedPlanId,
      pots: parsed.pots,
      history: parsed.history,
      inventory: normalizeInventory(parsed.inventory),
    } as AppState;
  } catch {
    return initial;
  }
}

interface StoreValue {
  state: AppState;
  plans: PlanVariant[];
  selectedPlan: PlanVariant | undefined;
  setControlMode: (mode: ControlMode) => void;
  setBatchLiters: (liters: number) => void;
  setCycleStartDate: (date: string) => void;
  setPhase: (phase: GrowthPhase) => void;
  setPhaseWeek: (week: number | null) => void;
  setWaterProfile: (profile: WaterProfile) => void;
  setCustomWaterEc: (ec: number | null) => void;
  setScheduleProfile: (profile: ScheduleProfile) => void;
  selectPlan: (id: PlanId) => void;
  setMixerStep: (step: number) => void;
  recordPotWeight: (id: AppState['pots'][number]['id'], kg: number) => void;
  setInventoryQuantity: (id: string, quantity: number | null) => void;
  setInventoryUnit: (id: string, unit: InventoryUnit) => void;
  completeExecution: () => string | null;
  completeOperatorExecution: () => string | null;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => loadState());

  const commit = (updater: (current: AppState) => AppState) => {
    setState((current) => {
      const next = updater(current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Stan w pamięci nadal działa; błąd persistence zostanie ujawniony przy finalizacji.
      }
      return next;
    });
  };

  const cycleDay = getCycleDay(state.cycleStartDate);
  const plans = useMemo(
    () => buildPlanVariants({
      batchLiters: state.batchLiters,
      cycleDay,
      phase: state.phase,
      phaseWeek: state.phaseWeek,
      waterProfile: state.waterProfile,
      customWaterEc: state.customWaterEc,
      scheduleProfile: state.scheduleProfile,
    }),
    [state.batchLiters, cycleDay, state.phase, state.phaseWeek, state.waterProfile, state.customWaterEc, state.scheduleProfile],
  );
  const selectedPlan = plans.find((plan) => plan.id === state.selectedPlanId);

  const persistCompletedRecord = (record: AppState['history'][number]): string | null => {
    try {
      const next = { ...state, history: [record, ...state.history], mixerStep: 0 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
      return null;
    } catch {
      return 'Nie udało się zapisać wykonania lokalnie. Operacja nie została oznaczona jako zakończona.';
    }
  };

  const value: StoreValue = {
    state,
    plans,
    selectedPlan,
    setControlMode: (controlMode) => commit((current) => ({ ...current, controlMode })),
    setBatchLiters: (batchLiters) => commit((current) => ({ ...current, batchLiters })),
    setCycleStartDate: (cycleStartDate) => commit((current) => ({ ...current, cycleStartDate })),
    setPhase: (phase) => commit((current) => ({ ...current, phase, phaseWeek: null, mixerStep: 0 })),
    setPhaseWeek: (phaseWeek) => {
      if (phaseWeek !== null && (!Number.isInteger(phaseWeek) || phaseWeek < 1 || phaseWeek > 12)) return;
      commit((current) => ({ ...current, phaseWeek, mixerStep: 0 }));
    },
    setWaterProfile: (waterProfile) => commit((current) => ({
      ...current,
      waterProfile,
      customWaterEc: waterProfile === 'CUSTOM' ? current.customWaterEc : null,
      mixerStep: 0,
    })),
    setCustomWaterEc: (customWaterEc) => {
      if (customWaterEc !== null && (!Number.isFinite(customWaterEc) || customWaterEc < 0)) return;
      commit((current) => ({ ...current, customWaterEc, mixerStep: 0 }));
    },
    setScheduleProfile: (scheduleProfile) => commit((current) => ({ ...current, scheduleProfile, mixerStep: 0 })),
    selectPlan: (selectedPlanId) => {
      const candidate = plans.find((plan) => plan.id === selectedPlanId);
      if (!candidate) return;
      commit((current) => ({ ...current, selectedPlanId, mixerStep: 0 }));
    },
    setMixerStep: (mixerStep) => commit((current) => ({ ...current, mixerStep })),
    recordPotWeight: (id, kg) => {
      if (!Number.isFinite(kg) || kg <= 0) return;
      commit((current) => ({
        ...current,
        pots: current.pots.map((pot) =>
          pot.id === id
            ? { ...pot, measurements: [...pot.measurements, { at: new Date().toISOString(), kg }].slice(-30) }
            : pot,
        ),
      }));
    },
    setInventoryQuantity: (id, quantity) => {
      if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) return;
      commit((current) => ({
        ...current,
        inventory: current.inventory.map((item) => item.id === id ? { ...item, quantity } : item),
      }));
    },
    setInventoryUnit: (id, unit) => {
      if (!INVENTORY_UNITS.includes(unit)) return;
      commit((current) => ({
        ...current,
        inventory: current.inventory.map((item) => item.id === id ? { ...item, unit } : item),
      }));
    },
    completeExecution: () => {
      const blockers = validatePlanForExecution(selectedPlan);
      if (blockers.length > 0 || !selectedPlan) return blockers.join(' ');

      return persistCompletedRecord({
        id: crypto.randomUUID(),
        completedAt: new Date().toISOString(),
        planId: selectedPlan.id,
        planLabel: selectedPlan.label,
        batchLiters: selectedPlan.batchLiters,
        controlMode: state.controlMode,
        executionMode: 'PLAN',
        cycleDay,
        phase: state.phase,
        phaseWeek: state.phaseWeek,
        ingredients: selectedPlan.ingredients.map((ingredient) => ({ ...ingredient })),
      });
    },
    completeOperatorExecution: () => {
      if (!selectedPlan) return 'Brak wybranego planu do zapisania jako wykonanie operatora.';

      return persistCompletedRecord({
        id: crypto.randomUUID(),
        completedAt: new Date().toISOString(),
        planId: selectedPlan.id,
        planLabel: selectedPlan.label,
        batchLiters: selectedPlan.batchLiters,
        controlMode: state.controlMode,
        executionMode: 'OPERATOR_OVERRIDE',
        executionNote: 'Operator wykonał czynność według stanu rzeczywistego. ARGUS nie zapisuje nieznanych dawek jako danych planu.',
        cycleDay,
        phase: state.phase,
        phaseWeek: state.phaseWeek,
        ingredients: [],
      });
    },
    resetDemo: () => {
      const next = { ...createInitialState(), inventory: state.inventory.map((item) => ({ ...item })) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider');
  return value;
}
