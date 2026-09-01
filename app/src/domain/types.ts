export type ScreenId = 'today' | 'plan' | 'preparation' | 'pots' | 'mixer' | 'history' | 'trends';

export type ControlMode = 'PRO' | 'STANDARD' | 'UNLOCKED';
export type PlanId = 'manufacturer' | 'balanced' | 'growth';
export type SourceStatus = 'DEMO_DATA_NOT_FOR_USE' | 'VERIFIED' | 'OPERATOR';
export type GrowthPhase = 'SEEDLING' | 'VEG' | 'FLOWER' | 'FLUSH';
export type WaterProfile = 'RO' | 'SOFT' | 'MODERATELY_HARD' | 'HARD' | 'CUSTOM';
export type ScheduleProfile = 'LIGHT' | 'STANDARD' | 'HEAVY';

export const GROWTH_PHASES: readonly GrowthPhase[] = ['SEEDLING', 'VEG', 'FLOWER', 'FLUSH'];
export const WATER_PROFILES: readonly WaterProfile[] = ['RO', 'SOFT', 'MODERATELY_HARD', 'HARD', 'CUSTOM'];
export const SCHEDULE_PROFILES: readonly ScheduleProfile[] = ['LIGHT', 'STANDARD', 'HEAVY'];

export const PHASE_LABELS: Record<GrowthPhase, string> = {
  SEEDLING: 'Siewka',
  VEG: 'Wega',
  FLOWER: 'Kwitnienie',
  FLUSH: 'Flush',
};

export const WATER_PROFILE_LABELS: Record<WaterProfile, string> = {
  RO: 'RO / destylowana',
  SOFT: 'Miękka',
  MODERATELY_HARD: 'Średnio twarda',
  HARD: 'Twarda',
  CUSTOM: 'Własna',
};

export const SCHEDULE_PROFILE_LABELS: Record<ScheduleProfile, string> = {
  LIGHT: 'Lekki',
  STANDARD: 'Standard',
  HEAVY: 'Mocny',
};

export interface PlanContext {
  batchLiters: number;
  cycleDay: number;
  phase: GrowthPhase;
  phaseWeek: number | null;
  waterProfile: WaterProfile | null;
  customWaterEc: number | null;
  scheduleProfile: ScheduleProfile | null;
}

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
  cycleDay: number;
  phase: GrowthPhase;
  selectable: boolean;
  contextReady?: boolean;
  availabilityReason?: string;
  evidenceLedger?: string;
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
  phase: GrowthPhase;
  phaseWeek: number | null;
  waterProfile: WaterProfile | null;
  customWaterEc: number | null;
  scheduleProfile: ScheduleProfile | null;
  selectedPlanId: PlanId | null;
  mixerStep: number;
  history: HistoryRecord[];
  pots: PotState[];
}
