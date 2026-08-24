import { useEffect, useState } from 'react';
import { SHOGUN_PRODUCTS, FACTORY_RECIPES } from './data';
import { evaluateExecutionReadiness, type ExecutionBlocker } from './executionPolicy';
import type {
  ApplicationMethod,
  ExecutionMeasurements,
  GrowthStage,
  HistoryItem,
  Medium,
  Product,
  Recipe,
  RecipeExecutionPolicy,
  RecipeVerificationStatus,
  ToolAuditItem,
  WaterType,
} from './types';

const STATE_VERSION = 4;
const STORAGE_KEY = 'shogun_planner_state';
const MAX_HISTORY_ITEMS = 1000;
const MAX_SAFE_VOLUME = 10000;
const MAX_SAFE_CONCENTRATION_ML_L = 1000;

export interface AppState {
  stateVersion: number;
  inventory: Product[];
  recipes: Recipe[];
  history: HistoryItem[];
  currentMedium: Medium;
  currentWaterProfile: WaterType;
}

export interface ExecuteRecipeRequest {
  recipeId: string;
  stage: GrowthStage;
  week?: number;
  volumeLitres: number;
  readyToUseVolumeMl?: number;
  measurements: ExecutionMeasurements;
  confirmedProtocolStepIds: string[];
}

export interface ExecuteRecipeResult {
  ok: boolean;
  blockers: ExecutionBlocker[];
  historyItem?: HistoryItem;
}

const DEFAULT_STATE: AppState = {
  stateVersion: STATE_VERSION,
  inventory: SHOGUN_PRODUCTS,
  recipes: FACTORY_RECIPES,
  history: [],
  currentMedium: 'TERRA' as Medium,
  currentWaterProfile: 'CUSTOM' as WaterType,
};

const validMedium = (value: unknown): value is Medium => ['TERRA', 'COCO', 'HYDRO', 'CUSTOM'].includes(String(value));
const validWater = (value: unknown): value is WaterType => ['SOFT', 'HARD', 'RO', 'CUSTOM'].includes(String(value));
const validMethod = (value: unknown): value is ApplicationMethod => ['ROOT_FEED', 'FOLIAR', 'READY_TO_SPRAY', 'SOAK', 'MEDIA_TREATMENT'].includes(String(value));
const validStage = (value: unknown): value is GrowthStage => ['SEEDLING', 'VEG', 'BLOOM', 'FLUSH', 'ALL'].includes(String(value));
const validVerification = (value: unknown): value is RecipeVerificationStatus => ['UNVERIFIED', 'VERIFIED', 'CONFLICT'].includes(String(value));
const validExecutionPolicy = (value: unknown): value is RecipeExecutionPolicy => ['SIMULATION_ONLY', 'PHYSICAL_ALLOWED'].includes(String(value));
const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const safeString = (value: unknown, max = 300) => typeof value === 'string' ? value.slice(0, max) : '';

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => loadPersistedState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist planner state', error);
    }
  }, [state]);

  const updateMedium = (medium: Medium) => {
    if (!validMedium(medium)) return;
    setState(current => ({ ...current, currentMedium: medium }));
  };

  const updateWater = (water: WaterType) => {
    if (!validWater(water)) return;
    setState(current => ({ ...current, currentWaterProfile: water }));
  };

  const addRecipe = (recipe: Recipe) => {
    const safeRecipe = sanitizeCustomRecipe(recipe);
    if (!safeRecipe) return false;
    setState(current => ({
      ...current,
      recipes: [...current.recipes.filter(item => item.id !== safeRecipe.id), safeRecipe],
    }));
    return true;
  };

  /**
   * The only public physical-execution mutation. It recalculates readiness from
   * current state and creates inventory + audit history in one transition.
   */
  const executeRecipe = (request: ExecuteRecipeRequest): ExecuteRecipeResult => {
    const recipe = state.recipes.find(item => item.id === request.recipeId);
    if (!recipe) {
      return { ok: false, blockers: [{ code: 'RECIPE_VALIDATION', message: 'Nie znaleziono receptury.' }] };
    }

    const readiness = evaluateExecutionReadiness({
      recipe,
      products: state.inventory,
      medium: state.currentMedium,
      stage: request.stage,
      week: request.week,
      waterType: state.currentWaterProfile,
      volumeLitres: request.volumeLitres,
      readyToUseVolumeMl: request.readyToUseVolumeMl,
      measurements: request.measurements,
      confirmedProtocolStepIds: request.confirmedProtocolStepIds,
    });

    if (!readiness.allowed) return { ok: false, blockers: readiness.blockers };

    const requirementMap = new Map(readiness.requirements.map(item => [item.productId, item.amountMl]));
    const totalMl = roundMl(readiness.requirements.reduce((sum, item) => sum + item.amountMl, 0));
    const isReadyToSpray = String(recipe.method) === 'READY_TO_SPRAY';
    const historyItem: HistoryItem = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      volume: isReadyToSpray ? (request.readyToUseVolumeMl ?? 0) : request.volumeLitres,
      volumeUnit: isReadyToSpray ? 'ml' : 'L',
      recipeId: recipe.id,
      method: recipe.method,
      doses: Object.fromEntries(recipe.ingredients.map(ingredient => [ingredient.productId, ingredient.concentration])),
      totalMl,
      stage: request.stage,
      week: request.week,
      medium: state.currentMedium,
      waterProfile: state.currentWaterProfile,
      recipeVerificationStatus: recipe.verificationStatus,
      recipeExecutionPolicy: recipe.executionPolicy,
      recipeSource: recipe.source,
      recipeSourceUrl: recipe.sourceUrl,
      recipeSourceVersion: recipe.sourceVersion,
      measurements: { ...request.measurements },
      tools: toolAudit(readiness.toolSet.assignments),
      confirmedProtocolStepIds: [...request.confirmedProtocolStepIds],
      lifecycleStatus: 'EXECUTED',
      approvalState: 'VERIFIED_RECIPE',
    };

    setState(current => {
      // Recheck stock inside the functional transition to prevent stale UI data
      // from silently clamping an operation after another state change.
      const staleShortage = readiness.requirements.some(requirement => {
        const product = current.inventory.find(item => item.id === requirement.productId);
        return !product || product.remainingCapacity + 0.005 < requirement.amountMl;
      });
      if (staleShortage) return current;

      return {
        ...current,
        inventory: current.inventory.map(product => {
          const amount = requirementMap.get(product.id) ?? 0;
          return amount > 0
            ? { ...product, remainingCapacity: roundMl(product.remainingCapacity - amount) }
            : product;
        }),
        history: [historyItem, ...current.history].slice(0, MAX_HISTORY_ITEMS),
      };
    });

    return { ok: true, blockers: [], historyItem };
  };

  const getProduct = (id: string) => state.inventory.find(product => product.id === id);
  const getRecipe = (id: string) => state.recipes.find(recipe => recipe.id === id);

  return {
    ...state,
    updateMedium,
    updateWater,
    addRecipe,
    executeRecipe,
    getProduct,
    getRecipe,
  };
}

function toolAudit(assignments: Record<string, Array<{ instanceId: string; type: string; amount: number; precisionStep: number }>>): ToolAuditItem[] {
  return Object.entries(assignments).flatMap(([productId, tools]) =>
    tools.map(tool => ({
      productId,
      instanceId: tool.instanceId,
      label: tool.type,
      amountMl: tool.amount,
      precisionStep: tool.precisionStep,
    })),
  );
}

function loadPersistedState(): AppState {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneDefaultState();

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return cloneDefaultState();
    const raw = parsed as Record<string, unknown>;
    const isLegacyState = raw.stateVersion !== STATE_VERSION;

    return {
      stateVersion: STATE_VERSION,
      inventory: mergeInventory(DEFAULT_STATE.inventory, Array.isArray(raw.inventory) ? raw.inventory : []),
      recipes: mergeRecipes(DEFAULT_STATE.recipes, Array.isArray(raw.recipes) ? raw.recipes : []),
      history: sanitizeHistory(Array.isArray(raw.history) ? raw.history : []),
      currentMedium: validMedium(raw.currentMedium) ? raw.currentMedium : DEFAULT_STATE.currentMedium,
      currentWaterProfile: isLegacyState
        ? ('CUSTOM' as WaterType)
        : validWater(raw.currentWaterProfile) ? raw.currentWaterProfile : DEFAULT_STATE.currentWaterProfile,
    };
  } catch (error) {
    console.error('Failed to load state', error);
    return cloneDefaultState();
  }
}

function cloneDefaultState(): AppState {
  return {
    ...DEFAULT_STATE,
    inventory: DEFAULT_STATE.inventory.map(cloneProduct),
    recipes: DEFAULT_STATE.recipes.map(cloneRecipe),
    history: [],
  };
}

function cloneProduct(product: Product): Product {
  return { ...product, compatibleMedia: [...product.compatibleMedia] };
}

function cloneRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    medium: [...recipe.medium],
    waterProfiles: recipe.waterProfiles ? [...recipe.waterProfiles] : undefined,
    ingredients: recipe.ingredients.map(ingredient => ({ ...ingredient })),
  };
}

/** Persisted state is untrusted. Factory metadata cannot be replaced from localStorage. */
function mergeInventory(factory: Product[], saved: unknown[]): Product[] {
  const result = factory.map(cloneProduct);

  for (const rawItem of saved) {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) continue;
    const candidate = rawItem as Record<string, unknown>;
    const id = safeString(candidate.id, 120);
    if (!id) continue;

    const index = result.findIndex(product => product.id === id);
    if (index >= 0) {
      if (finiteNumber(candidate.remainingCapacity) && candidate.remainingCapacity >= 0) {
        const max = result[index].initialCapacity;
        result[index] = {
          ...result[index],
          remainingCapacity: Math.min(max, Math.max(0, candidate.remainingCapacity)),
        };
      }
      continue;
    }

    const custom = sanitizeCustomProduct(candidate);
    if (custom) result.push(custom);
  }

  return result;
}

function sanitizeCustomProduct(raw: Record<string, unknown>): Product | null {
  const id = safeString(raw.id, 120);
  const name = safeString(raw.name, 160);
  const brand = safeString(raw.brand, 120) || 'Custom';
  const initialCapacity = raw.initialCapacity;
  const remainingCapacity = raw.remainingCapacity;
  const compatibleMedia = Array.isArray(raw.compatibleMedia) ? raw.compatibleMedia.filter(validMedium) : [];
  const type = raw.type;

  if (!id || !name || !finiteNumber(initialCapacity) || initialCapacity <= 0 || !finiteNumber(remainingCapacity) || remainingCapacity < 0) return null;
  if (!['FERTILIZER', 'ADDITIVE', 'BIOLOGICAL', 'READY_TO_USE'].includes(String(type))) return null;

  return {
    id,
    name,
    brand,
    color: safeString(raw.color, 120) || 'bg-white/20',
    initialCapacity,
    remainingCapacity: Math.min(initialCapacity, remainingCapacity),
    unit: safeString(raw.unit, 20) || 'ml',
    foliarAllowed: raw.foliarAllowed === true,
    compatibleMedia: compatibleMedia.length ? compatibleMedia : ['CUSTOM' as Medium],
    type: type as Product['type'],
    mixingRole: undefined,
  };
}

function mergeRecipes(factory: Recipe[], saved: unknown[]): Recipe[] {
  const factoryCopies = factory.map(cloneRecipe);
  const customRecipes = saved
    .map(raw => sanitizeCustomRecipe(raw))
    .filter((recipe): recipe is Recipe => Boolean(recipe));
  return [...factoryCopies, ...customRecipes.filter(custom => !factoryCopies.some(factoryRecipe => factoryRecipe.id === custom.id))];
}

function sanitizeCustomRecipe(raw: unknown): Recipe | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;
  const id = safeString(candidate.id, 120);
  const name = safeString(candidate.name, 200);
  const media = Array.isArray(candidate.medium) ? candidate.medium.filter(validMedium) : [];
  const method = candidate.method;
  const stage = candidate.stage;
  const rawIngredients = Array.isArray(candidate.ingredients) ? candidate.ingredients : [];

  if (!id || !name || !media.length || !validMethod(method) || !validStage(stage)) return null;

  const ingredients = rawIngredients.flatMap(rawIngredient => {
    if (!rawIngredient || typeof rawIngredient !== 'object' || Array.isArray(rawIngredient)) return [];
    const ingredient = rawIngredient as Record<string, unknown>;
    const productId = safeString(ingredient.productId, 120);
    const concentration = ingredient.concentration;
    if (!productId || !finiteNumber(concentration) || concentration < 0 || concentration > MAX_SAFE_CONCENTRATION_ML_L) return [];
    const mixOrder = finiteNumber(ingredient.mixOrder) ? ingredient.mixOrder : undefined;
    return [{ productId, concentration, mixOrder }];
  });

  if (!ingredients.length) return null;

  const waterProfiles = Array.isArray(candidate.waterProfiles) ? candidate.waterProfiles.filter(validWater) : undefined;
  const weekStart = finiteNumber(candidate.weekStart) && Number.isInteger(candidate.weekStart) && candidate.weekStart >= 1 ? candidate.weekStart : undefined;
  const weekEnd = finiteNumber(candidate.weekEnd) && Number.isInteger(candidate.weekEnd) && candidate.weekEnd >= (weekStart ?? 1) ? candidate.weekEnd : undefined;

  return {
    id,
    name,
    medium: media,
    method,
    stage,
    ingredients,
    waterProfiles: waterProfiles?.length ? waterProfiles : undefined,
    weekStart,
    weekEnd,
    source: safeString(candidate.source, 300) || 'Custom recipe',
    sourceDate: safeString(candidate.sourceDate, 60) || undefined,
    sourceUrl: safeString(candidate.sourceUrl, 500) || undefined,
    sourceVersion: safeString(candidate.sourceVersion, 120) || undefined,
    verificationStatus: 'UNVERIFIED',
    executionPolicy: 'SIMULATION_ONLY',
    isFactory: false,
    notes: safeString(candidate.notes, 2000) || undefined,
  };
}

function sanitizeHistory(raw: unknown[]): HistoryItem[] {
  return raw
    .map(sanitizeHistoryItem)
    .filter((item): item is HistoryItem => Boolean(item))
    .slice(0, MAX_HISTORY_ITEMS);
}

function sanitizeHistoryItem(raw: unknown): HistoryItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;
  const id = safeString(candidate.id, 120);
  const date = safeString(candidate.date, 120);
  const volume = candidate.volume;
  const totalMl = candidate.totalMl;
  const method = candidate.method;

  if (!id || !date || !finiteNumber(volume) || volume < 0 || volume > MAX_SAFE_VOLUME || !finiteNumber(totalMl) || totalMl < 0 || !validMethod(method)) return null;

  const doses: Record<string, number> = {};
  if (candidate.doses && typeof candidate.doses === 'object' && !Array.isArray(candidate.doses)) {
    for (const [productId, value] of Object.entries(candidate.doses as Record<string, unknown>)) {
      if (productId.length <= 120 && finiteNumber(value) && value >= 0 && value <= MAX_SAFE_CONCENTRATION_ML_L) doses[productId] = value;
    }
  }

  const measurements = sanitizeMeasurements(candidate.measurements);
  const confirmedProtocolStepIds = Array.isArray(candidate.confirmedProtocolStepIds)
    ? candidate.confirmedProtocolStepIds.map(value => safeString(value, 160)).filter(Boolean).slice(0, 100)
    : undefined;

  return {
    id,
    date,
    volume,
    volumeUnit: candidate.volumeUnit === 'ml' ? 'ml' : 'L',
    recipeId: safeString(candidate.recipeId, 120) || undefined,
    method,
    doses,
    totalMl,
    stage: validStage(candidate.stage) ? candidate.stage : undefined,
    week: finiteNumber(candidate.week) && Number.isInteger(candidate.week) && candidate.week >= 1 ? candidate.week : undefined,
    medium: validMedium(candidate.medium) ? candidate.medium : undefined,
    waterProfile: validWater(candidate.waterProfile) ? candidate.waterProfile : undefined,
    recipeVerificationStatus: validVerification(candidate.recipeVerificationStatus) ? candidate.recipeVerificationStatus : undefined,
    recipeExecutionPolicy: validExecutionPolicy(candidate.recipeExecutionPolicy) ? candidate.recipeExecutionPolicy : undefined,
    recipeSource: safeString(candidate.recipeSource, 300) || undefined,
    recipeSourceUrl: safeString(candidate.recipeSourceUrl, 500) || undefined,
    recipeSourceVersion: safeString(candidate.recipeSourceVersion, 120) || undefined,
    measurements,
    confirmedProtocolStepIds,
    lifecycleStatus: candidate.lifecycleStatus === 'EXECUTED' ? 'EXECUTED' : undefined,
    approvalState: candidate.approvalState === 'VERIFIED_RECIPE' ? 'VERIFIED_RECIPE' : undefined,
  };
}

function sanitizeMeasurements(raw: unknown): ExecutionMeasurements | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const candidate = raw as Record<string, unknown>;
  const result: ExecutionMeasurements = {};
  if (finiteNumber(candidate.preBasePh) && candidate.preBasePh >= 0 && candidate.preBasePh <= 14) result.preBasePh = candidate.preBasePh;
  if (finiteNumber(candidate.finalEc) && candidate.finalEc >= 0 && candidate.finalEc <= 20) result.finalEc = candidate.finalEc;
  if (finiteNumber(candidate.finalPh) && candidate.finalPh >= 0 && candidate.finalPh <= 14) result.finalPh = candidate.finalPh;
  return Object.keys(result).length ? result : undefined;
}

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}
