import { useEffect, useState } from 'react';
import { Product, Recipe, HistoryItem, Medium, WaterType } from './types';
import { SHOGUN_PRODUCTS, FACTORY_RECIPES } from './data';

export interface AppState {
  inventory: Product[];
  recipes: Recipe[];
  history: HistoryItem[];
  currentMedium: Medium;
  currentWaterProfile: WaterType;
}

export interface InventoryRequirement {
  productId: string;
  amountMl: number;
}

export interface ExecutionResult {
  ok: boolean;
  shortages: Array<{
    productId: string;
    requiredMl: number;
    availableMl: number;
  }>;
}

const DEFAULT_STATE: AppState = {
  inventory: SHOGUN_PRODUCTS,
  recipes: FACTORY_RECIPES,
  history: [],
  currentMedium: Medium.TERRA,
  currentWaterProfile: WaterType.SOFT,
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => loadInitialState());

  useEffect(() => {
    localStorage.setItem('shogun_planner_state', JSON.stringify(state));
  }, [state]);

  const updateMedium = (medium: Medium) => setState(s => ({ ...s, currentMedium: medium }));
  const updateWater = (water: WaterType) => setState(s => ({ ...s, currentWaterProfile: water }));

  const deductFromInventory = (productId: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
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
    setState(s => ({ ...s, history: [item, ...s.history] }));
  };

  /**
   * Validates every dose first, then updates inventory and history in one state
   * transition. This prevents half-executed operations and silent stock clamps.
   */
  const executeOperation = (
    requirements: InventoryRequirement[],
    historyItem: HistoryItem,
  ): ExecutionResult => {
    const aggregated = aggregateRequirements(requirements);
    const stock = new Map(state.inventory.map(product => [product.id, product.remainingCapacity]));

    const shortages = aggregated
      .map(({ productId, amountMl }) => ({
        productId,
        requiredMl: roundMl(amountMl),
        availableMl: roundMl(stock.get(productId) ?? 0),
      }))
      .filter(item => item.availableMl + 0.005 < item.requiredMl);

    if (shortages.length > 0) {
      return { ok: false, shortages };
    }

    const requiredByProduct = new Map(aggregated.map(item => [item.productId, item.amountMl]));

    setState(s => ({
      ...s,
      inventory: s.inventory.map(product => {
        const required = requiredByProduct.get(product.id) ?? 0;
        if (required <= 0) return product;
        return {
          ...product,
          remainingCapacity: roundMl(Math.max(0, product.remainingCapacity - required)),
        };
      }),
      history: [historyItem, ...s.history],
    }));

    return { ok: true, shortages: [] };
  };

  const addRecipe = (recipe: Recipe) => {
    setState(s => ({ ...s, recipes: [...s.recipes, recipe] }));
  };

  const getProduct = (id: string) => state.inventory.find(p => p.id === id);
  const getRecipe = (id: string) => state.recipes.find(r => r.id === id);

  return {
    ...state,
    updateMedium,
    updateWater,
    deductFromInventory,
    addHistoryItem,
    executeOperation,
    addRecipe,
    getProduct,
    getRecipe,
  };
}

function loadInitialState(): AppState {
  const saved = localStorage.getItem('shogun_planner_state');
  if (!saved) return cloneDefaultState();

  try {
    const parsed = JSON.parse(saved) as Partial<AppState>;
    return {
      ...cloneDefaultState(),
      ...parsed,
      inventory: mergeInventory(DEFAULT_STATE.inventory, parsed.inventory ?? []),
      recipes: mergeRecipes(DEFAULT_STATE.recipes, parsed.recipes ?? []),
      history: Array.isArray(parsed.history) ? parsed.history : [],
      currentMedium: Object.values(Medium).includes(parsed.currentMedium as Medium)
        ? (parsed.currentMedium as Medium)
        : DEFAULT_STATE.currentMedium,
      currentWaterProfile: Object.values(WaterType).includes(parsed.currentWaterProfile as WaterType)
        ? (parsed.currentWaterProfile as WaterType)
        : DEFAULT_STATE.currentWaterProfile,
    };
  } catch (error) {
    console.error('Failed to load state', error);
    return cloneDefaultState();
  }
}

function cloneDefaultState(): AppState {
  return {
    inventory: DEFAULT_STATE.inventory.map(product => ({
      ...product,
      compatibleMedia: [...product.compatibleMedia],
    })),
    recipes: DEFAULT_STATE.recipes.map(recipe => ({
      ...recipe,
      medium: [...recipe.medium],
      waterProfiles: recipe.waterProfiles ? [...recipe.waterProfiles] : undefined,
      ingredients: recipe.ingredients.map(ingredient => ({ ...ingredient })),
    })),
    history: [],
    currentMedium: DEFAULT_STATE.currentMedium,
    currentWaterProfile: DEFAULT_STATE.currentWaterProfile,
  };
}

/** Merge persisted quantities without mutating factory objects. */
function mergeInventory(factory: Product[], saved: Product[]): Product[] {
  const result = factory.map(product => ({
    ...product,
    compatibleMedia: [...product.compatibleMedia],
  }));

  for (const savedItem of saved) {
    if (!savedItem || typeof savedItem.id !== 'string') continue;
    const index = result.findIndex(product => product.id === savedItem.id);

    if (index >= 0) {
      const max = result[index].initialCapacity;
      const raw = Number(savedItem.remainingCapacity);
      result[index] = {
        ...result[index],
        remainingCapacity: Number.isFinite(raw) ? Math.min(max, Math.max(0, raw)) : max,
      };
    } else if (isUsableCustomProduct(savedItem)) {
      result.push({
        ...savedItem,
        compatibleMedia: [...savedItem.compatibleMedia],
        remainingCapacity: Math.min(
          savedItem.initialCapacity,
          Math.max(0, savedItem.remainingCapacity),
        ),
      });
    }
  }

  return result;
}

function mergeRecipes(factory: Recipe[], saved: Recipe[]): Recipe[] {
  const factoryIds = new Set(factory.map(recipe => recipe.id));
  const customRecipes = saved.filter(
    recipe => recipe && !recipe.isFactory && typeof recipe.id === 'string' && !factoryIds.has(recipe.id),
  );

  return [
    ...factory.map(recipe => ({
      ...recipe,
      medium: [...recipe.medium],
      waterProfiles: recipe.waterProfiles ? [...recipe.waterProfiles] : undefined,
      ingredients: recipe.ingredients.map(ingredient => ({ ...ingredient })),
    })),
    ...customRecipes,
  ];
}

function aggregateRequirements(requirements: InventoryRequirement[]): InventoryRequirement[] {
  const totals = new Map<string, number>();

  for (const requirement of requirements) {
    if (!requirement.productId || !Number.isFinite(requirement.amountMl) || requirement.amountMl <= 0) {
      continue;
    }
    totals.set(
      requirement.productId,
      (totals.get(requirement.productId) ?? 0) + requirement.amountMl,
    );
  }

  return [...totals.entries()].map(([productId, amountMl]) => ({
    productId,
    amountMl: roundMl(amountMl),
  }));
}

function isUsableCustomProduct(product: Product): boolean {
  return (
    typeof product.name === 'string' &&
    Number.isFinite(product.initialCapacity) &&
    product.initialCapacity > 0 &&
    Number.isFinite(product.remainingCapacity) &&
    Array.isArray(product.compatibleMedia)
  );
}

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}
