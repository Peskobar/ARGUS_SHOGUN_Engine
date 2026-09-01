export type ScreenId = 'today' | 'plan' | 'preparation' | 'pots' | 'mixer' | 'history' | 'trends';

export type ControlMode = 'PRO' | 'STANDARD' | 'UNLOCKED';
export type PlanId = 'manufacturer' | 'balanced' | 'growth';
export type SourceStatus = 'DEMO_DATA_NOT_FOR_USE' | 'VERIFIED' | 'OPERATOR';

export interface IngredientDose {
  id: string;
  name: string;
  amountMl: number;
  tool: string;
  mixSeconds: number;
  sourceStatus: SourceStatus;
}

export interface PlanVariant {
  id: PlanId;
  label: string;
  description: string;
  batchLiters: number;
  ingredients: IngredientDose[];
}

export interface PotMeasurement {
  at: string;
  kg: number;
}

export interface PotState {
  id: 'D1' | 'D2' | 'D3' | 'D4';
  measurements: PotMeasurement[];
}

export interface HistoryRecord {
  id: string;
  completedAt: string;
  planId: PlanId;
  planLabel: string;
  batchLiters: number;
  controlMode: ControlMode;
  ingredients: IngredientDose[];
}

export interface AppState {
  controlMode: ControlMode;
  batchLiters: number;
  cycleStartDate: string;
  selectedPlanId: PlanId | null;
  mixerStep: number;
  history: HistoryRecord[];
  pots: PotState[];
}
