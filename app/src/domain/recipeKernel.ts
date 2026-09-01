import type {
  ApplicationMethod,
  GrowthStage,
  Medium,
  MixingRole,
  WaterType,
} from './taxonomy.ts';

export interface RecipeContext {
  medium: Medium;
  method: ApplicationMethod;
  stage: GrowthStage;
  waterType?: WaterType;
}

export interface RecipeIngredientDraft {
  productId: string;
  concentration: number;
  mixOrder?: number;
}

export interface RecipeDraft {
  id: string;
  medium: readonly Medium[];
  method: ApplicationMethod;
  stage: GrowthStage;
  waterProfiles?: readonly WaterType[];
  ingredients: readonly RecipeIngredientDraft[];
}

export interface ProductRoleLookup {
  id: string;
  mixingRole: MixingRole;
}

export interface OrderedIngredient extends RecipeIngredientDraft {
  sourceIndex: number;
  order: number;
}

export interface RecipeIssue {
  code: 'EMPTY_ID' | 'DUPLICATE_PRODUCT' | 'INVALID_CONCENTRATION' | 'UNKNOWN_PRODUCT';
  subjectId?: string;
  message: string;
}

const ROLE_ORDER: Readonly<Record<MixingRole, number>> = {
  SILICON: 100,
  CALMAG: 300,
  BASE: 400,
  ROOTS: 500,
  ENZYME: 600,
  BOOSTER: 700,
  PK: 800,
  BIOLOGICAL: 900,
  READY_TO_USE: 1000,
  OTHER: 1100,
  PH_ADJUSTER: 1200,
};

/** Strict context filter. No method acts as a wildcard. */
export function filterRecipesByContext<T extends RecipeDraft>(
  recipes: readonly T[],
  context: RecipeContext,
): T[] {
  return recipes.filter((recipe) => {
    if (!recipe.medium.includes(context.medium)) return false;
    if (recipe.method !== context.method) return false;
    if (!(recipe.stage === context.stage || recipe.stage === 'ALL')) return false;
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

/**
 * Produces deterministic ingredient order only.
 * It deliberately does not create operator gates or process checkpoints.
 */
export function orderRecipeIngredients(
  recipe: RecipeDraft,
  products: readonly ProductRoleLookup[],
): OrderedIngredient[] {
  const roles = new Map(products.map((product) => [product.id, product.mixingRole]));

  return recipe.ingredients
    .map((ingredient, sourceIndex) => ({
      ...ingredient,
      sourceIndex,
      order: ingredient.mixOrder ?? roleWeight(roles.get(ingredient.productId)),
    }))
    .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex);
}

/**
 * Structural validation only. Issues are data facts, not UI blocking decisions.
 * The control policy decides how an issue is presented to the operator.
 */
export function inspectRecipeShape(
  recipe: RecipeDraft,
  products: readonly ProductRoleLookup[],
): RecipeIssue[] {
  const issues: RecipeIssue[] = [];
  const knownProducts = new Set(products.map((product) => product.id));
  const seen = new Set<string>();

  if (!recipe.id.trim()) {
    issues.push({ code: 'EMPTY_ID', message: 'Recipe id must not be empty.' });
  }

  for (const ingredient of recipe.ingredients) {
    if (seen.has(ingredient.productId)) {
      issues.push({
        code: 'DUPLICATE_PRODUCT',
        subjectId: ingredient.productId,
        message: `Product ${ingredient.productId} occurs more than once.`,
      });
    }
    seen.add(ingredient.productId);

    if (!Number.isFinite(ingredient.concentration) || ingredient.concentration < 0) {
      issues.push({
        code: 'INVALID_CONCENTRATION',
        subjectId: ingredient.productId,
        message: `Product ${ingredient.productId} has an invalid concentration.`,
      });
    }

    if (!knownProducts.has(ingredient.productId)) {
      issues.push({
        code: 'UNKNOWN_PRODUCT',
        subjectId: ingredient.productId,
        message: `Product ${ingredient.productId} is not present in the supplied product role lookup.`,
      });
    }
  }

  return issues;
}

export function roleWeight(role: MixingRole | undefined): number {
  return role ? ROLE_ORDER[role] : ROLE_ORDER.OTHER;
}
