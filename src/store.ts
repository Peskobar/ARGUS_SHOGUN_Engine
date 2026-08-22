import { useState, useEffect } from 'react';
import { Product, Recipe, HistoryItem, Medium, WaterType } from './types';
import { SHOGUN_PRODUCTS, FACTORY_RECIPES } from './data';

const STATE_VERSION = 2;

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
  currentWaterProfile: WaterType.CUSTOM
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('shogun_planner_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isLegacyState = parsed.stateVersion !== STATE_VERSION;

        // Merge with factory defaults to ensure new factory recipes/products are loaded if we update data.
        // Older builds silently defaulted water to SOFT. We cannot know that from reality,
        // so the v2 migration resets only that field to "unknown/custom" once.
        return {
          ...DEFAULT_STATE,
          ...parsed,
          stateVersion: STATE_VERSION,
          currentWaterProfile: isLegacyState
            ? WaterType.CUSTOM
            : (parsed.currentWaterProfile ?? DEFAULT_STATE.currentWaterProfile),
          inventory: mergeInventory(DEFAULT_STATE.inventory, parsed.inventory || []),
          recipes: mergeRecipes(DEFAULT_STATE.recipes, parsed.recipes || []),
        };
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('shogun_planner_state', JSON.stringify(state));
  }, [state]);

  const updateMedium = (medium: Medium) => setState(s => ({ ...s, currentMedium: medium }));
  const updateWater = (water: WaterType) => setState(s => ({ ...s, currentWaterProfile: water }));

  const deductFromInventory = (productId: string, amount: number) => {
    setState(s => ({
      ...s,
      inventory: s.inventory.map(p =>
        p.id === productId
          ? { ...p, remainingCapacity: Math.max(0, p.remainingCapacity - amount) }
          : p
      )
    }));
  };

  const addHistoryItem = (item: HistoryItem) => {
    setState(s => ({ ...s, history: [item, ...s.history] }));
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
    addRecipe,
    getProduct,
    getRecipe
  };
}

// Helpers to prevent wiping out factory data on updates
function mergeInventory(factory: Product[], saved: Product[]): Product[] {
  const result = [...factory];
  saved.forEach(savedItem => {
    const index = result.findIndex(p => p.id === savedItem.id);
    if (index >= 0) {
      result[index].remainingCapacity = savedItem.remainingCapacity;
    } else {
      result.push(savedItem); // Custom products
    }
  });
  return result;
}

function mergeRecipes(factory: Recipe[], saved: Recipe[]): Recipe[] {
  const customRecipes = saved.filter(r => !r.isFactory);
  return [...factory, ...customRecipes];
}
