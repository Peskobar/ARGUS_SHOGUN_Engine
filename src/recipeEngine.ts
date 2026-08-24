import { canonicalRoleOrder } from './canonicalMixingSequence.ts';
import type {
  ApplicationMethod,
  GrowthStage,
  Medium,
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

export interface RecipeExecutionValidationContext extends Pick<RecipeContext, 'medium' | 'method'> {
  /**
   * True only for an execution surface that actually consumes the canonical
   * execution state machine including PRE_BASE_PH_GATE and FINAL_EC_PH_GATE.
   */
  canonicalExecutionGatesIntegrated?: boolean;
}

export interface RecipeExecutionStep {
  ingredient: RecipeIngredient;
  product: Product;
  /** Legacy compatibility alias for executionOrder. */
  order: number;
  /** Authoring/presentation metadata only. Never physical execution authority. */
  recipeOrder?: number;
  /** Derived exclusively from canonical domain chemistry rules. */
  executionOrder: number;
}

export interface RecipeValidationWarning {
  code:
    | 'PRODUCT_NOT_FOUND'
    | 'FOLIAR_NOT_ALLOWED'
    | 'READY_TO_SPRAY_PRODUCT_MISMATCH'
    | 'MEDIUM_MISMATCH'
    | 'MISSING_MIXING_ROLE'
    | 'MISSING_BASE_NUTRITION'
    | 'MULTIPLE_BASE_PRODUCTS'
    | 'PRE_BASE_PH_GATE_NOT_INTEGRATED';
  productId: string;
  message: string;
}

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
    .map((ingredient, index): RecipeExecutionStep | null => {
      const product = productMap.get(ingredient.productId);
      if (!product) return null;

      const executionOrder = canonicalRoleOrder(product.mixingRole) + index / 1000;
      return {
        ingredient,
        product,
        recipeOrder: ingredient.mixOrder,
        executionOrder,
        order: executionOrder,
      };
    })
    .filter((step): step is RecipeExecutionStep => step !== null)
    .sort((a, b) => a.executionOrder - b.executionOrder || a.product.name.localeCompare(b.product.name));
}

export function validateRecipeContext(
  recipe: Recipe,
  products: Product[],
  context: RecipeExecutionValidationContext,
): RecipeValidationWarning[] {
  const productMap = new Map(products.map(product => [product.id, product]));
  const warnings: RecipeValidationWarning[] = [];
  const resolvedProducts: Product[] = [];

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

    resolvedProducts.push(product);

    if (!product.compatibleMedia.includes(context.medium)) {
      warnings.push({
        code: 'MEDIUM_MISMATCH',
        productId: product.id,
        message: `${product.name} nie jest oznaczony jako zgodny z medium ${context.medium}.`,
      });
    }

    if (!product.mixingRole && String(context.method) !== 'READY_TO_SPRAY') {
      warnings.push({
        code: 'MISSING_MIXING_ROLE',
        productId: product.id,
        message: `${product.name} nie ma zaufanej roli mieszania. Fizyczne wykonanie pozostaje HOLD do przypisania zweryfikowanej roli domenowej.`,
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

  if (String(context.method) === 'ROOT_FEED' && String(recipe.stage) !== 'FLUSH') {
    const bases = resolvedProducts.filter(product => String(product.mixingRole) === 'BASE');
    if (resolvedProducts.length > 0 && bases.length === 0) {
      warnings.push({
        code: 'MISSING_BASE_NUTRITION',
        productId: '__recipe__',
        message: 'Receptura korzeniowa zawiera dodatki bez zweryfikowanej bazy. Dodatki nie mogą po cichu zastąpić pełnego żywienia bazowego.',
      });
    }
    if (bases.length > 1) {
      warnings.push({
        code: 'MULTIPLE_BASE_PRODUCTS',
        productId: '__recipe__',
        message: `Receptura zawiera wiele produktów bazowych (${bases.map(product => product.name).join(', ')}). Fizyczne wykonanie pozostaje HOLD do rozstrzygnięcia konfliktu.`,
      });
    }
  }

  const containsSilicon = resolvedProducts.some(product => String(product.mixingRole) === 'SILICON');
  if (
    String(context.method) === 'ROOT_FEED'
    && containsSilicon
    && context.canonicalExecutionGatesIntegrated !== true
  ) {
    warnings.push({
      code: 'PRE_BASE_PH_GATE_NOT_INTEGRATED',
      productId: 'silicon',
      message: 'Ta powierzchnia wykonawcza nie ma jeszcze podpiętej obowiązkowej bramki PRE_BASE_PH_GATE po Silicon. Wykonanie pozostaje HOLD do integracji canonical state machine.',
    });
  }

  return warnings;
}
