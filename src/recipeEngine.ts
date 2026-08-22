import type {
  ApplicationMethod,
  GrowthStage,
  Medium,
  MixingRole,
  Product,
  Recipe,
  RecipeIngredient,
  WaterType,
} from './types';

export interface RecipeContext {
  medium: Medium;
  method: ApplicationMethod;
  stage: GrowthStage;
  waterType?: WaterType;
}

export interface RecipeExecutionStep {
  ingredient: RecipeIngredient;
  product: Product;
  order: number;
}

export interface RecipeValidationWarning {
  code:
    | 'PRODUCT_NOT_FOUND'
    | 'FOLIAR_NOT_ALLOWED'
    | 'READY_TO_SPRAY_PRODUCT_MISMATCH'
    | 'MEDIUM_MISMATCH';
  productId: string;
  message: string;
}

const ROLE_ORDER: Record<string, number> = {
  SILICON: 100,
  CALMAG: 200,
  BASE: 300,
  ROOTS: 400,
  ENZYME: 500,
  BOOSTER: 600,
  PK: 700,
  BIOLOGICAL: 800,
  READY_TO_USE: 900,
  OTHER: 950,
  PH_ADJUSTER: 1000,
};

/**
 * Strict context filter. READY_TO_SPRAY is not a wildcard and therefore cannot
 * leak into ROOT_FEED/FOLIAR lists just because it is marked as a factory recipe.
 */
export function filterRecipes(recipes: Recipe[], context: RecipeContext): Recipe[] {
  return recipes.filter(recipe => {
    if (!recipe.medium.includes(context.medium)) return false;
    if (recipe.method !== context.method) return false;
    if (!(recipe.stage === context.stage || String(recipe.stage) === 'ALL')) return false;
    if (
      context.waterType &&
      recipe.waterProfiles?.length &&
      !recipe.waterProfiles.includes(context.waterType)
    ) {
      return false;
    }
    return true;
  });
}

export function buildExecutionSteps(
  recipe: Recipe,
  products: Product[],
): RecipeExecutionStep[] {
  const productMap = new Map(products.map(product => [product.id, product]));

  return recipe.ingredients
    .map((ingredient, index) => {
      const product = productMap.get(ingredient.productId);
      if (!product) return null;

      return {
        ingredient,
        product,
        order: ingredient.mixOrder ?? roleOrder(product.mixingRole) + index / 1000,
      };
    })
    .filter((step): step is RecipeExecutionStep => Boolean(step))
    .sort((a, b) => a.order - b.order || a.product.name.localeCompare(b.product.name));
}

export function validateRecipeContext(
  recipe: Recipe,
  products: Product[],
  context: Pick<RecipeContext, 'medium' | 'method'>,
): RecipeValidationWarning[] {
  const productMap = new Map(products.map(product => [product.id, product]));
  const warnings: RecipeValidationWarning[] = [];

  for (const ingredient of recipe.ingredients) {
    const product = productMap.get(ingredient.productId);
    if (!product) {
      warnings.push({
        code: 'PRODUCT_NOT_FOUND',
        productId: ingredient.productId,
        message: `Brak produktu ${ingredient.productId} w magazynie/modelu danych.`,
      });
      continue;
    }

    if (!product.compatibleMedia.includes(context.medium)) {
      warnings.push({
        code: 'MEDIUM_MISMATCH',
        productId: product.id,
        message: `${product.name} nie jest oznaczony jako zgodny z medium ${context.medium}.`,
      });
    }

    if (String(context.method) === 'FOLIAR' && !product.foliarAllowed) {
      warnings.push({
        code: 'FOLIAR_NOT_ALLOWED',
        productId: product.id,
        message: `${product.name} nie ma zgody na aplikację dolistną w danych produktu.`,
      });
    }

    if (
      String(context.method) === 'READY_TO_SPRAY' &&
      product.type !== 'READY_TO_USE'
    ) {
      warnings.push({
        code: 'READY_TO_SPRAY_PRODUCT_MISMATCH',
        productId: product.id,
        message: `${product.name} nie jest produktem READY_TO_USE.`,
      });
    }
  }

  return warnings;
}

function roleOrder(role?: MixingRole): number {
  if (!role) return ROLE_ORDER.OTHER;
  return ROLE_ORDER[String(role)] ?? ROLE_ORDER.OTHER;
}
