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
}

export interface RecipeIngredient {
  productId: string;
  concentration: number; // ml/L, 0 if READY_TO_SPRAY
}

export interface Recipe {
  id: string;
  name: string;
  medium: Medium[];
  method: ApplicationMethod;
  stage: GrowthStage;
  ingredients: RecipeIngredient[];
  source?: string;
  sourceDate?: string;
  isFactory: boolean;
  notes?: string;
}

export interface SyringeType {
  id: string;
  capacity: number;
  count: number;
  label: string;
  type: 'SYRINGE' | 'PIPETTE';
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
