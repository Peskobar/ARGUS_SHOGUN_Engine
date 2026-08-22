export enum Medium {
  TERRA = 'TERRA',
  COCO = 'COCO',
  HYDRO = 'HYDRO',
  CUSTOM = 'CUSTOM'
}

export enum WaterType {
  SOFT = 'SOFT',
  HARD = 'HARD',
  RO = 'RO',
  CUSTOM = 'CUSTOM'
}

export enum ApplicationMethod {
  ROOT_FEED = 'ROOT_FEED',
  FOLIAR = 'FOLIAR',
  READY_TO_SPRAY = 'READY_TO_SPRAY',
  SOAK = 'SOAK',
  MEDIA_TREATMENT = 'MEDIA_TREATMENT'
}

export enum GrowthStage {
  SEEDLING = 'SEEDLING',
  VEG = 'VEG',
  BLOOM = 'BLOOM',
  FLUSH = 'FLUSH',
  ALL = 'ALL'
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
  PH_ADJUSTER = 'PH_ADJUSTER'
}

export type RecipeVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'CONFLICT';
export type AllocationMode = 'PRECISION' | 'SPEED' | 'MIN_TOOLS';

export interface Product {
  id: string;
  name: string;
  brand: string;
  color: string;
  initialCapacity: number; // ml
  remainingCapacity: number; // ml
  unit: string;
  foliarAllowed: boolean;
  compatibleMedia: Medium[];
  type: 'FERTILIZER' | 'ADDITIVE' | 'BIOLOGICAL' | 'READY_TO_USE';
  mixingRole?: MixingRole;
}

export interface RecipeIngredient {
  productId: string;
  concentration: number; // ml/L, 0 if READY_TO_SPRAY
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
  source?: string;
  sourceDate?: string;
  sourceUrl?: string;
  verificationStatus?: RecipeVerificationStatus;
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

export interface HistoryItem {
  id: string;
  date: string;
  volume: number;
  recipeId?: string;
  method: ApplicationMethod;
  doses: Record<string, number>;
  totalMl: number;
}
