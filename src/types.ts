export enum Medium {
  TERRA = 'TERRA',
  COCO = 'COCO',
  HYDRO = 'HYDRO',
  CUSTOM = 'CUSTOM',
}

export enum WaterType {
  SOFT = 'SOFT',
  HARD = 'HARD',
  RO = 'RO',
  CUSTOM = 'CUSTOM',
}

export enum ApplicationMethod {
  ROOT_FEED = 'ROOT_FEED',
  FOLIAR = 'FOLIAR',
  READY_TO_SPRAY = 'READY_TO_SPRAY',
  SOAK = 'SOAK',
  MEDIA_TREATMENT = 'MEDIA_TREATMENT',
}

export enum GrowthStage {
  SEEDLING = 'SEEDLING',
  VEG = 'VEG',
  BLOOM = 'BLOOM',
  FLUSH = 'FLUSH',
  ALL = 'ALL',
}

export enum MixingRole {
  SILICON = 'SILICON',
  CALMAG = 'CALMAG',
  BASE = 'BASE',
  ROOTS = 'ROOTS',
  ENZYME = 'ENZYME',
  BOOSTER = 'BOOSTER',
  PK = 'PK',
  BIOLOGICAL = 'BIOLOGICAL',
  READY_TO_USE = 'READY_TO_USE',
  OTHER = 'OTHER',
  PH_ADJUSTER = 'PH_ADJUSTER',
}

export type RecipeVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'CONFLICT';
export type RecipeExecutionPolicy = 'SIMULATION_ONLY' | 'PHYSICAL_ALLOWED';
export type AllocationMode = 'PRECISION' | 'SPEED' | 'MIN_TOOLS';
export type ExecutionVolumeUnit = 'L' | 'ml';
export type ExecutionLifecycleStatus = 'PROPOSED' | 'IN_PROGRESS' | 'EXECUTED' | 'ABORTED';
export type ExecutionApprovalState = 'SIMULATION_ONLY' | 'VERIFIED_RECIPE';

export interface Product {
  id: string;
  name: string;
  brand: string;
  color: string;
  initialCapacity: number;
  remainingCapacity: number;
  unit: string;
  foliarAllowed: boolean;
  compatibleMedia: Medium[];
  type: 'FERTILIZER' | 'ADDITIVE' | 'BIOLOGICAL' | 'READY_TO_USE';
  mixingRole?: MixingRole;
}

export interface RecipeIngredient {
  productId: string;
  /** Liquid engine concentration. Non-liquid products must use a dedicated future dosing engine. */
  concentration: number;
  /** Optional explicit operator order. Safe-sequence validation still has final authority. */
  mixOrder?: number;
}

export interface Recipe {
  id: string;
  name: string;
  medium: Medium[];
  method: ApplicationMethod;
  stage: GrowthStage;
  ingredients: RecipeIngredient[];
  waterProfiles?: WaterType[];
  /** Inclusive week window within the selected growth stage. Omitted means all weeks. */
  weekStart?: number;
  weekEnd?: number;
  source?: string;
  sourceDate?: string;
  sourceUrl?: string;
  sourceVersion?: string;
  verificationStatus?: RecipeVerificationStatus;
  executionPolicy?: RecipeExecutionPolicy;
  isFactory: boolean;
  notes?: string;
}

export interface SyringeType {
  id: string;
  capacity: number;
  count: number;
  label: string;
  type: 'SYRINGE' | 'PIPETTE';
  precisionStep?: number;
}

export interface ToolAuditItem {
  productId: string;
  instanceId: string;
  label: string;
  amountMl: number;
  precisionStep: number;
}

export interface ExecutionMeasurements {
  preBasePh?: number;
  finalEc?: number;
  finalPh?: number;
}

export interface HistoryItem {
  id: string;
  date: string;
  volume: number;
  volumeUnit?: ExecutionVolumeUnit;
  recipeId?: string;
  method: ApplicationMethod;
  doses: Record<string, number>;
  totalMl: number;
  stage?: GrowthStage;
  week?: number;
  medium?: Medium;
  waterProfile?: WaterType;
  recipeVerificationStatus?: RecipeVerificationStatus;
  recipeExecutionPolicy?: RecipeExecutionPolicy;
  recipeSource?: string;
  recipeSourceUrl?: string;
  recipeSourceVersion?: string;
  measurements?: ExecutionMeasurements;
  tools?: ToolAuditItem[];
  confirmedProtocolStepIds?: string[];
  lifecycleStatus?: ExecutionLifecycleStatus;
  approvalState?: ExecutionApprovalState;
}
