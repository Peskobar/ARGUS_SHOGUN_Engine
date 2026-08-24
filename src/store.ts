import { useState, useEffect } from 'react';
import { Product, Recipe, HistoryItem, Medium, WaterType, ApplicationMethod, GrowthStage } from './types';
import { SHOGUN_PRODUCTS, FACTORY_RECIPES } from './data';

const STATE_VERSION = 3;
const STORAGE_KEY = 'shogun_planner_state';
const MAX_HISTORY_ITEMS = 1000;
const MAX_SAFE_VOLUME_L = 10000;
const MAX_SAFE_CONCENTRATION_ML_L = 1000;

export interface AppState {
  stateVersion: number;
  inventory: Product[];
  recipes: Recipe[];
  history: HistoryItem[];
  currentMedium: Medium;
  currentWaterProfile: WaterType;
}

const DEFAULT_STATE: AppState = {
  stateVersion: STATE_VERSION,
  inventory: SHOGUN_PRODUCTS,
  recipes: FACTORY_RECIPES,
  history: [],
  currentMedium: Medium.TERRA,
  currentWaterProfile: WaterType.CUSTOM,
};

const validMedium = (value: unknown): value is Medium => Object.values(Medium).includes(value as Medium);
const validWater = (value: unknown): value is WaterType => Object.values(WaterType).includes(value as WaterType);
const validMethod = (value: unknown): value is ApplicationMethod => Object.values(ApplicationMethod).includes(value as ApplicationMethod);
const validStage = (value: unknown): value is GrowthStage => Object.values(GrowthStage).includes(value as GrowthStage);
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
    setState(s => ({ ...s, currentMedium: medium }));
  };

  const updateWater = (water: WaterType) => {
    if (!validWater(water)) return;
    setState(s => ({ ...s, currentWaterProfile: water }));
  };

  const deductFromInventory = (productId: string, amount: number) => {
    if (!productId || !finiteNumber(amount) || amount < 0) return;
    setState(s => ({
      ...s,
      inventory: s.inventory.map(p =>
        p.id === productId
          ? { ...p, remainingCapacity: Math.max(0, p.remainingCapacity - amount) }
          : p,
      ),
    }));
  };

  const addHistoryItem = (item: HistoryItem) => {
    const safeItem = sanitizeHistoryItem(item);
    if (!safeItem) return;
    setState(s => ({ ...s, history: [safeItem, ...s.history].slice(0, MAX_HISTORY_ITEMS) }));
  };

  const addRecipe = (recipe: Recipe) => {
    const safeRecipe = sanitizeCustomRecipe(recipe);
    if (!safeRecipe) return;
    setState(s => ({ ...s, recipes: [...s.recipes.filter(r => r.id !== safeRecipe.id), safeRecipe] }));
  };

  const getProduct = (id: string) => state.inventory.find(p => p.id === id);
  const getRecipe = (id: string) => state.recipes.find(r => r.id === id);

  return {
    ...state,
    updateMedium,
    updateWater,
    deductFromInventory,
    addHistoryItem,
    addRecipe,
    getProduct,
    getRecipe,
  };
}

function loadPersistedState(): AppState {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to read persisted planner state', error);
  }
  return rehydratePersistedState(saved);
}

/**
 * Pure trust-boundary function used by runtime and adversarial tests.
 * Persisted JSON is always treated as untrusted input.
 */
export function rehydratePersistedState(saved: string | null): AppState {
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
      // Older builds silently defaulted water to SOFT. A migration cannot recover reality,
      // so every pre-v3 state is deliberately reset once to unknown/custom.
      currentWaterProfile: isLegacyState
        ? WaterType.CUSTOM
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
    inventory: DEFAULT_STATE.inventory.map(product => ({ ...product, compatibleMedia: [...product.compatibleMedia] })),
    recipes: DEFAULT_STATE.recipes.map(recipe => ({
      ...recipe,
      medium: [...recipe.medium],
      waterProfiles: recipe.waterProfiles ? [...recipe.waterProfiles] : undefined,
      ingredients: recipe.ingredients.map(ingredient => ({ ...ingredient })),
    })),
    history: [],
  };
}

// Persisted state is untrusted input. We restore only mutable stock amounts for
// factory products; saved copies cannot replace factory names, roles or metadata.
function mergeInventory(factory: Product[], saved: unknown[]): Product[] {
  const result = factory.map(product => ({ ...product, compatibleMedia: [...product.compatibleMedia] }));

  for (const rawItem of saved) {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) continue;
    const candidate = rawItem as Record<string, unknown>;
    const id = safeString(candidate.id, 120);
    if (!id) continue;

    const index = result.findIndex(product => product.id === id);
    if (index >= 0) {
      if (finiteNumber(candidate.remainingCapacity) && candidate.remainingCapacity >= 0) {
        result[index] = {
          ...result[index],
          remainingCapacity: Math.min(candidate.remainingCapacity, result[index].initialCapacity),
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

  if (
    !id
    || !name
    || !finiteNumber(initialCapacity)
    || initialCapacity < 0
    || !finiteNumber(remainingCapacity)
    || remainingCapacity < 0
    || remainingCapacity > initialCapacity
  ) return null;
  if (!['FERTILIZER', 'ADDITIVE', 'BIOLOGICAL', 'READY_TO_USE'].includes(String(type))) return null;

  return {
    id,
    name,
    brand,
    color: safeString(raw.color, 120) || 'bg-white/20',
    initialCapacity,
    remainingCapacity,
    unit: safeString(raw.unit, 20) || 'ml',
    foliarAllowed: raw.foliarAllowed === true,
    compatibleMedia: compatibleMedia.length ? compatibleMedia : [Medium.CUSTOM],
    type: type as Product['type'],
    // Custom persisted products do not inherit privileged mixing metadata from raw JSON.
    mixingRole: undefined,
  };
}

function mergeRecipes(factory: Recipe[], saved: unknown[]): Recipe[] {
  const factoryCopies = factory.map(recipe => ({
    ...recipe,
    medium: [...recipe.medium],
    waterProfiles: recipe.waterProfiles ? [...recipe.waterProfiles] : undefined,
    ingredients: recipe.ingredients.map(ingredient => ({ ...ingredient })),
  }));
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

  if (!ingredients.length && method !== ApplicationMethod.READY_TO_SPRAY) return null;

  const waterProfiles = Array.isArray(candidate.waterProfiles)
    ? candidate.waterProfiles.filter(validWater)
    : undefined;

  return {
    id,
    name,
    medium: media,
    method,
    stage,
    ingredients,
    waterProfiles: waterProfiles?.length ? waterProfiles : undefined,
    source: safeString(candidate.source, 300) || 'Custom recipe',
    sourceDate: safeString(candidate.sourceDate, 60) || undefined,
    sourceUrl: safeString(candidate.sourceUrl, 500) || undefined,
    // Verification is a privilege. User/persisted recipes can only enter as UNVERIFIED.
    verificationStatus: 'UNVERIFIED',
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

  if (!id || !date || !finiteNumber(volume) || volume < 0 || volume > MAX_SAFE_VOLUME_L || !finiteNumber(totalMl) || totalMl < 0 || !validMethod(method)) return null;

  const doses: Record<string, number> = {};
  if (candidate.doses && typeof candidate.doses === 'object' && !Array.isArray(candidate.doses)) {
    for (const [productId, value] of Object.entries(candidate.doses as Record<string, unknown>)) {
      if (productId.length <= 120 && finiteNumber(value) && value >= 0 && value <= MAX_SAFE_CONCENTRATION_ML_L) doses[productId] = value;
    }
  }

  return {
    id,
    date,
    volume,
    recipeId: safeString(candidate.recipeId, 120) || undefined,
    method,
    doses,
    totalMl,
  };
}
