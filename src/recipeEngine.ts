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

export type ExecutionProtocolStep =
  | {
      kind: 'ACTION';
      id: string;
      order: number;
      title: string;
      detail?: string;
    }
  | ({ kind: 'PRODUCT' } & RecipeExecutionStep);

export interface RecipeValidationWarning {
  code:
    | 'PRODUCT_NOT_FOUND'
    | 'FOLIAR_NOT_ALLOWED'
    | 'READY_TO_SPRAY_PRODUCT_MISMATCH'
    | 'READY_TO_SPRAY_INGREDIENT_COUNT'
    | 'MEDIUM_MISMATCH'
    | 'INVALID_CONCENTRATION'
    | 'DUPLICATE_PRODUCT'
    | 'UNSUPPORTED_DOSING_UNIT'
    | 'SILICON_AFTER_BASE'
    | 'RECIPE_UNVERIFIED'
    | 'RECIPE_CONFLICT';
  productId?: string;
  severity: 'WARNING' | 'ERROR';
  message: string;
}

export interface InventoryShortage {
  productId: string;
  productName: string;
  requiredMl: number;
  availableMl: number;
}

/**
 * Default product-addition order. It is deliberately separate from process
 * checkpoints such as pH measurements.
 */
const ROLE_ORDER: Record<string, number> = {
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

/** Strict context filter. READY_TO_SPRAY is never a wildcard. */
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

/**
 * Produces only product-addition steps. Explicit mixOrder always wins.
 * Equal-order products preserve recipe source order; alphabetical sorting is
 * intentionally avoided because chemistry should not depend on a product name.
 */
export function buildExecutionSteps(
  recipe: Recipe,
  products: Product[],
): RecipeExecutionStep[] {
  const productMap = new Map(products.map(product => [product.id, product]));

  return recipe.ingredients
    .map((ingredient, sourceIndex) => {
      const product = productMap.get(ingredient.productId);
      if (!product) return null;

      return {
        ingredient,
        product,
        sourceIndex,
        order: ingredient.mixOrder ?? roleOrder(product.mixingRole),
      };
    })
    .filter((step): step is RecipeExecutionStep & { sourceIndex: number } => Boolean(step))
    .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex)
    .map(({ sourceIndex: _sourceIndex, ...step }) => step);
}

/**
 * Returns a safe default ingredient order based on product roles. Existing
 * explicit mixOrder values are intentionally ignored. The caller may then let
 * the operator override this order explicitly.
 */
export function orderIngredientsByRole(
  ingredients: RecipeIngredient[],
  products: Product[],
): RecipeIngredient[] {
  const productMap = new Map(products.map(product => [product.id, product]));

  return ingredients
    .map((ingredient, sourceIndex) => ({
      ingredient,
      sourceIndex,
      order: roleOrder(productMap.get(ingredient.productId)?.mixingRole),
    }))
    .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex)
    .map(({ ingredient }, index) => ({
      ...ingredient,
      mixOrder: (index + 1) * 100,
    }));
}

/**
 * Full operator-facing protocol. For ROOT_FEED it models the water start,
 * the post-Silicon pH checkpoint, EC verification and final pH verification.
 * Other application methods receive product steps only because their procedure
 * is recipe-specific and must not inherit ROOT_FEED assumptions.
 */
export function buildExecutionProtocol(
  recipe: Recipe,
  products: Product[],
): ExecutionProtocolStep[] {
  const productSteps = buildExecutionSteps(recipe, products);

  if (String(recipe.method) !== 'ROOT_FEED') {
    return productSteps.map(step => ({ kind: 'PRODUCT' as const, ...step }));
  }

  const protocol: ExecutionProtocolStep[] = [
    {
      kind: 'ACTION',
      id: 'water-start',
      order: 0,
      title: 'Woda bazowa',
      detail: 'Zacznij od odmierzonej objętości wody. Nie mieszaj koncentratów ze sobą poza wodą.',
    },
  ];

  const siliconSteps = productSteps.filter(
    step => String(step.product.mixingRole) === 'SILICON',
  );
  const lastSiliconStep = siliconSteps[siliconSteps.length - 1];

  for (const step of productSteps) {
    protocol.push({ kind: 'PRODUCT', ...step });

    if (lastSiliconStep && step === lastSiliconStep) {
      protocol.push({
        kind: 'ACTION',
        id: 'post-silicon-ph',
        order: step.order + 0.001,
        title: 'Wymieszaj i skontroluj pH po Silicon',
        detail: 'To osobny checkpoint przed kolejnymi koncentratami. Korektę wykonuj według aktualnej instrukcji producenta/receptury.',
      });
    }
  }

  protocol.push(
    {
      kind: 'ACTION',
      id: 'final-ec',
      order: 9000,
      title: 'Pomiar EC',
      detail: 'Zmierz EC kompletnego roztworu przed końcową korektą.',
    },
    {
      kind: 'ACTION',
      id: 'final-ph',
      order: 9100,
      title: 'Końcowa kontrola pH',
      detail: 'Po pełnym wymieszaniu wykonaj końcowy pomiar i ewentualną korektę pH.',
    },
  );

  return protocol;
}

export function validateRecipeContext(
  recipe: Recipe,
  products: Product[],
  context: Pick<RecipeContext, 'medium' | 'method'>,
): RecipeValidationWarning[] {
  const productMap = new Map(products.map(product => [product.id, product]));
  const warnings: RecipeValidationWarning[] = [];
  const seenProducts = new Set<string>();

  if (recipe.verificationStatus === 'UNVERIFIED') {
    warnings.push({
      code: 'RECIPE_UNVERIFIED',
      severity: 'WARNING',
      message: 'Receptura ma status UNVERIFIED. Dawki wymagają osobnego audytu źródeł przed uznaniem ich za zweryfikowane.',
    });
  }

  if (recipe.verificationStatus === 'CONFLICT') {
    warnings.push({
      code: 'RECIPE_CONFLICT',
      severity: 'ERROR',
      message: 'Receptura ma status CONFLICT. Nie wykonuj jej do czasu rozstrzygnięcia sprzecznych danych źródłowych.',
    });
  }

  if (String(context.method) === 'READY_TO_SPRAY' && recipe.ingredients.length !== 1) {
    warnings.push({
      code: 'READY_TO_SPRAY_INGREDIENT_COUNT',
      severity: 'ERROR',
      message: 'Receptura READY_TO_SPRAY musi wskazywać dokładnie jeden gotowy produkt, aby zużycie magazynowe było jednoznaczne.',
    });
  }

  for (const ingredient of recipe.ingredients) {
    if (seenProducts.has(ingredient.productId)) {
      warnings.push({
        code: 'DUPLICATE_PRODUCT',
        productId: ingredient.productId,
        severity: 'ERROR',
        message: `Produkt ${ingredient.productId} występuje w recepturze więcej niż raz.`,
      });
    }
    seenProducts.add(ingredient.productId);

    if (!Number.isFinite(ingredient.concentration) || ingredient.concentration < 0) {
      warnings.push({
        code: 'INVALID_CONCENTRATION',
        productId: ingredient.productId,
        severity: 'ERROR',
        message: `Nieprawidłowe stężenie dla ${ingredient.productId}.`,
      });
    }

    const product = productMap.get(ingredient.productId);
    if (!product) {
      warnings.push({
        code: 'PRODUCT_NOT_FOUND',
        productId: ingredient.productId,
        severity: 'ERROR',
        message: `Brak produktu ${ingredient.productId} w magazynie/modelu danych.`,
      });
      continue;
    }

    if (!product.compatibleMedia.includes(context.medium)) {
      warnings.push({
        code: 'MEDIUM_MISMATCH',
        productId: product.id,
        severity: 'ERROR',
        message: `${product.name} nie jest oznaczony jako zgodny z medium ${context.medium}.`,
      });
    }

    if (ingredient.concentration > 0 && product.unit !== 'ml') {
      warnings.push({
        code: 'UNSUPPORTED_DOSING_UNIT',
        productId: product.id,
        severity: 'ERROR',
        message: `${product.name} ma jednostkę ${product.unit}. Obecny Syringe Engine obsługuje dawkowanie objętościowe tylko w ml.`,
      });
    }

    if (String(context.method) === 'FOLIAR' && !product.foliarAllowed) {
      warnings.push({
        code: 'FOLIAR_NOT_ALLOWED',
        productId: product.id,
        severity: 'ERROR',
        message: `${product.name} nie ma zgody na aplikację dolistną w danych produktu.`,
      });
    }

    if (String(context.method) === 'READY_TO_SPRAY' && product.type !== 'READY_TO_USE') {
      warnings.push({
        code: 'READY_TO_SPRAY_PRODUCT_MISMATCH',
        productId: product.id,
        severity: 'ERROR',
        message: `${product.name} nie jest produktem READY_TO_USE.`,
      });
    }
  }

  if (String(context.method) === 'ROOT_FEED') {
    const steps = buildExecutionSteps(recipe, products);
    const firstBaseIndex = steps.findIndex(step => String(step.product.mixingRole) === 'BASE');
    const lastSiliconIndex = steps.reduce(
      (lastIndex, step, index) => String(step.product.mixingRole) === 'SILICON' ? index : lastIndex,
      -1,
    );

    if (firstBaseIndex >= 0 && lastSiliconIndex > firstBaseIndex) {
      warnings.push({
        code: 'SILICON_AFTER_BASE',
        severity: 'ERROR',
        message: 'Silicon jest ustawiony po nawozie bazowym. Dla ROOT_FEED kolejność musi umieścić Silicon i jego checkpoint pH przed nawozem bazowym.',
      });
    }
  }

  return warnings;
}

export function findInventoryShortages(
  recipe: Recipe,
  products: Product[],
  volumeLitres: number,
): InventoryShortage[] {
  if (!Number.isFinite(volumeLitres) || volumeLitres <= 0) return [];

  const productMap = new Map(products.map(product => [product.id, product]));
  const shortages: InventoryShortage[] = [];

  for (const ingredient of recipe.ingredients) {
    if (ingredient.concentration <= 0) continue;
    const product = productMap.get(ingredient.productId);
    if (!product || product.unit !== 'ml') continue;

    const requiredMl = roundMl(ingredient.concentration * volumeLitres);
    if (product.remainingCapacity + 0.005 < requiredMl) {
      shortages.push({
        productId: product.id,
        productName: product.name,
        requiredMl,
        availableMl: roundMl(product.remainingCapacity),
      });
    }
  }

  return shortages;
}

function roleOrder(role?: MixingRole): number {
  if (!role) return ROLE_ORDER.OTHER;
  return ROLE_ORDER[String(role)] ?? ROLE_ORDER.OTHER;
}

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}
