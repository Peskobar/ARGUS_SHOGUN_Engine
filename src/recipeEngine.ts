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
  week?: number;
  waterType?: WaterType;
}

export interface RecipeExecutionStep {
  kind: 'PRODUCT';
  id: string;
  ingredient: RecipeIngredient;
  product: Product;
  order: number;
}

export interface ProtocolActionStep {
  kind: 'ACTION';
  id: string;
  order: number;
  title: string;
  detail?: string;
  measurement?: 'PRE_BASE_PH' | 'FINAL_EC' | 'FINAL_PH';
}

export type ExecutionProtocolStep = RecipeExecutionStep | ProtocolActionStep;

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
    | 'UNSAFE_MIX_ORDER'
    | 'RECIPE_UNVERIFIED'
    | 'RECIPE_CONFLICT'
    | 'PHYSICAL_EXECUTION_NOT_ALLOWED'
    | 'WEEK_MISMATCH';
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

/** Critical order policy. Custom mixOrder may refine order only if this monotonic role order is preserved. */
const ROOT_FEED_SAFE_ROLE_ORDER: MixingRole[] = [
  'SILICON' as MixingRole,
  'CALMAG' as MixingRole,
  'BASE' as MixingRole,
  'ROOTS' as MixingRole,
  'ENZYME' as MixingRole,
  'BOOSTER' as MixingRole,
  'PK' as MixingRole,
  'BIOLOGICAL' as MixingRole,
  'OTHER' as MixingRole,
  'PH_ADJUSTER' as MixingRole,
];

export function recipeMatchesWeek(recipe: Recipe, week?: number): boolean {
  if (week === undefined) return true;
  if (!Number.isInteger(week) || week < 1) return false;
  if (recipe.weekStart !== undefined && week < recipe.weekStart) return false;
  if (recipe.weekEnd !== undefined && week > recipe.weekEnd) return false;
  return true;
}

/** Strict context filter. READY_TO_SPRAY is never a wildcard. */
export function filterRecipes(recipes: Recipe[], context: RecipeContext): Recipe[] {
  return recipes.filter(recipe => {
    if (!recipe.medium.includes(context.medium)) return false;
    if (recipe.method !== context.method) return false;
    if (!(recipe.stage === context.stage || String(recipe.stage) === 'ALL')) return false;
    if (!recipeMatchesWeek(recipe, context.week)) return false;
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

/** Explicit mixOrder wins only for sorting. validateRecipeContext still enforces the safe sequence policy. */
export function buildExecutionSteps(recipe: Recipe, products: Product[]): RecipeExecutionStep[] {
  const productMap = new Map(products.map(product => [product.id, product]));

  return recipe.ingredients
    .map((ingredient, sourceIndex) => {
      const product = productMap.get(ingredient.productId);
      if (!product) return null;
      return {
        kind: 'PRODUCT' as const,
        id: `product:${product.id}`,
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

export function orderIngredientsByRole(ingredients: RecipeIngredient[], products: Product[]): RecipeIngredient[] {
  const productMap = new Map(products.map(product => [product.id, product]));
  return ingredients
    .map((ingredient, sourceIndex) => ({
      ingredient,
      sourceIndex,
      order: roleOrder(productMap.get(ingredient.productId)?.mixingRole),
    }))
    .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex)
    .map(({ ingredient }, index) => ({ ...ingredient, mixOrder: (index + 1) * 100 }));
}

export function buildExecutionProtocol(recipe: Recipe, products: Product[]): ExecutionProtocolStep[] {
  const productSteps = buildExecutionSteps(recipe, products);
  if (recipe.method !== ('ROOT_FEED' as ApplicationMethod)) return productSteps;

  const protocol: ExecutionProtocolStep[] = [
    {
      kind: 'ACTION',
      id: 'water-start',
      order: 0,
      title: 'Woda bazowa',
      detail: 'Rozpocznij od odmierzonej objętości wody. Koncentratów nie łącz bezpośrednio ze sobą.',
    },
  ];

  const siliconSteps = productSteps.filter(step => String(step.product.mixingRole) === 'SILICON');
  const lastSilicon = siliconSteps[siliconSteps.length - 1];

  for (const step of productSteps) {
    protocol.push(step);
    if (lastSilicon && step.id === lastSilicon.id) {
      protocol.push({
        kind: 'ACTION',
        id: 'pre-base-ph-gate',
        order: step.order + 0.001,
        title: 'PRE-BASE pH gate',
        detail: 'Po Silicon wymieszaj roztwór i potwierdź rzeczywisty pomiar pH przed kolejnymi koncentratami.',
        measurement: 'PRE_BASE_PH',
      });
    }
  }

  protocol.push(
    {
      kind: 'ACTION',
      id: 'final-ec-gate',
      order: 9000,
      title: 'Końcowy pomiar EC',
      detail: 'Wprowadź rzeczywisty odczyt EC gotowego roztworu.',
      measurement: 'FINAL_EC',
    },
    {
      kind: 'ACTION',
      id: 'final-ph-gate',
      order: 9100,
      title: 'Końcowy pomiar pH',
      detail: 'Wprowadź rzeczywisty odczyt pH po pełnym wymieszaniu.',
      measurement: 'FINAL_PH',
    },
  );

  return protocol;
}

export function validateRecipeContext(
  recipe: Recipe,
  products: Product[],
  context: Pick<RecipeContext, 'medium' | 'method' | 'week'>,
  intent: 'SIMULATION' | 'PHYSICAL_EXECUTION' = 'SIMULATION',
): RecipeValidationWarning[] {
  const productMap = new Map(products.map(product => [product.id, product]));
  const warnings: RecipeValidationWarning[] = [];
  const seenProducts = new Set<string>();

  if (!recipeMatchesWeek(recipe, context.week)) {
    warnings.push({ code: 'WEEK_MISMATCH', severity: 'ERROR', message: 'Receptura nie obejmuje wybranego tygodnia.' });
  }

  if (recipe.verificationStatus === 'UNVERIFIED' || !recipe.verificationStatus) {
    warnings.push({
      code: 'RECIPE_UNVERIFIED',
      severity: intent === 'PHYSICAL_EXECUTION' ? 'ERROR' : 'WARNING',
      message: intent === 'PHYSICAL_EXECUTION'
        ? 'Receptura jest UNVERIFIED. Fizyczne wykonanie jest zablokowane; dostępna pozostaje symulacja.'
        : 'Receptura jest UNVERIFIED. Wynik jest tylko podglądem/symulacją.',
    });
  }

  if (recipe.verificationStatus === 'CONFLICT') {
    warnings.push({
      code: 'RECIPE_CONFLICT',
      severity: 'ERROR',
      message: 'Receptura ma nierozwiązany konflikt źródeł.',
    });
  }

  if (intent === 'PHYSICAL_EXECUTION' && recipe.executionPolicy !== 'PHYSICAL_ALLOWED') {
    warnings.push({
      code: 'PHYSICAL_EXECUTION_NOT_ALLOWED',
      severity: 'ERROR',
      message: 'Ta receptura nie ma jawnego uprawnienia PHYSICAL_ALLOWED.',
    });
  }

  if (recipe.method === ('READY_TO_SPRAY' as ApplicationMethod) && recipe.ingredients.length !== 1) {
    warnings.push({
      code: 'READY_TO_SPRAY_INGREDIENT_COUNT',
      severity: 'ERROR',
      message: 'READY_TO_SPRAY musi wskazywać dokładnie jeden gotowy produkt.',
    });
  }

  for (const ingredient of recipe.ingredients) {
    if (seenProducts.has(ingredient.productId)) {
      warnings.push({
        code: 'DUPLICATE_PRODUCT',
        productId: ingredient.productId,
        severity: 'ERROR',
        message: `Produkt ${ingredient.productId} występuje więcej niż raz.`,
      });
    }
    seenProducts.add(ingredient.productId);

    if (!Number.isFinite(ingredient.concentration) || ingredient.concentration < 0) {
      warnings.push({
        code: 'INVALID_CONCENTRATION',
        productId: ingredient.productId,
        severity: 'ERROR',
        message: `Nieprawidłowa koncentracja dla ${ingredient.productId}.`,
      });
    }

    const product = productMap.get(ingredient.productId);
    if (!product) {
      warnings.push({
        code: 'PRODUCT_NOT_FOUND',
        productId: ingredient.productId,
        severity: 'ERROR',
        message: `Brak produktu ${ingredient.productId} w modelu danych.`,
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
        message: `${product.name} używa jednostki ${product.unit}; ten silnik wykonawczy obsługuje wyłącznie dawkowanie objętościowe w ml.`,
      });
    }

    if (context.method === ('FOLIAR' as ApplicationMethod) && !product.foliarAllowed) {
      warnings.push({
        code: 'FOLIAR_NOT_ALLOWED',
        productId: product.id,
        severity: 'ERROR',
        message: `${product.name} nie ma zgody na aplikację dolistną w danych produktu.`,
      });
    }

    if (context.method === ('READY_TO_SPRAY' as ApplicationMethod) && product.type !== 'READY_TO_USE') {
      warnings.push({
        code: 'READY_TO_SPRAY_PRODUCT_MISMATCH',
        productId: product.id,
        severity: 'ERROR',
        message: `${product.name} nie jest produktem READY_TO_USE.`,
      });
    }
  }

  if (context.method === ('ROOT_FEED' as ApplicationMethod) && !hasSafeRootFeedOrder(recipe, products)) {
    warnings.push({
      code: 'UNSAFE_MIX_ORDER',
      severity: 'ERROR',
      message: 'Jawny mixOrder narusza bezpieczną kolejność ról ROOT_FEED. Własna kolejność nie może omijać polityki wykonawczej.',
    });
  }

  return warnings;
}

export function findInventoryShortages(recipe: Recipe, products: Product[], volumeLitres: number): InventoryShortage[] {
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

function hasSafeRootFeedOrder(recipe: Recipe, products: Product[]): boolean {
  const roleRank = new Map(ROOT_FEED_SAFE_ROLE_ORDER.map((role, index) => [String(role), index]));
  let previousRank = -1;

  for (const step of buildExecutionSteps(recipe, products)) {
    const role = String(step.product.mixingRole ?? 'OTHER');
    if (role === 'READY_TO_USE') return false;
    const rank = roleRank.get(role) ?? roleRank.get('OTHER') ?? 999;
    if (rank < previousRank) return false;
    previousRank = rank;
  }
  return true;
}

function roleOrder(role?: MixingRole): number {
  if (!role) return ROLE_ORDER.OTHER;
  return ROLE_ORDER[String(role)] ?? ROLE_ORDER.OTHER;
}

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}
