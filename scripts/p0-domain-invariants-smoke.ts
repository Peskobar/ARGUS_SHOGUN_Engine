import assert from 'node:assert/strict';
import { FACTORY_RECIPES, SHOGUN_PRODUCTS } from '../src/data';
import { evaluateExecutionReadiness } from '../src/executionPolicy';
import {
  createPlanSnapshot,
  PLAN_EXECUTION_MODEL_VERSION,
  PLAN_SNAPSHOT_SCHEMA_VERSION,
  validatePlanSnapshot,
} from '../src/planSnapshot';
import { buildExecutionProtocol } from '../src/recipeEngine';
import { GrowthStage, Medium, WaterType } from '../src/types';

const factoryRecipe = FACTORY_RECIPES.find(recipe => recipe.id === 'rec-terra-veg-early');
assert.ok(factoryRecipe, 'Expected rec-terra-veg-early fixture');

const verifiedRecipe = {
  ...factoryRecipe,
  id: 'p0-domain-invariants-verified-fixture',
  verificationStatus: 'VERIFIED' as const,
  executionPolicy: 'PHYSICAL_ALLOWED' as const,
};

function protocolIds(recipe = verifiedRecipe, products = SHOGUN_PRODUCTS) {
  return buildExecutionProtocol(recipe, products).map(step => step.id);
}

function readiness(overrides: Partial<Parameters<typeof evaluateExecutionReadiness>[0]> = {}) {
  return evaluateExecutionReadiness({
    recipe: verifiedRecipe,
    products: SHOGUN_PRODUCTS,
    medium: Medium.TERRA,
    stage: GrowthStage.VEG,
    week: 1,
    waterType: WaterType.CUSTOM,
    volumeLitres: 5,
    measurements: { preBasePh: 6.5, finalEc: 1.2, finalPh: 6.2 },
    confirmedProtocolStepIds: protocolIds(),
    ...overrides,
  });
}

// 1. Domain volume invariant: 0, negative, NaN and Infinity are all fail-closed.
for (const volumeLitres of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  const result = readiness({ volumeLitres });
  assert.equal(result.allowed, false);
  assert.ok(result.blockers.some(blocker => blocker.code === 'INVALID_VOLUME'));
}

// 2. Duplicate productId is rejected before stock mutation can ever be attempted.
{
  const duplicateRecipe = {
    ...verifiedRecipe,
    ingredients: [
      ...verifiedRecipe.ingredients.map(ingredient => ({ ...ingredient })),
      { ...verifiedRecipe.ingredients[0] },
    ],
  };
  const result = readiness({
    recipe: duplicateRecipe,
    confirmedProtocolStepIds: protocolIds(duplicateRecipe),
  });
  assert.equal(result.allowed, false);
  assert.ok(result.blockers.some(blocker => blocker.code === 'DUPLICATE_PRODUCT_ID'));
}

// 3. The liquid execution engine must not silently ignore a gram-based product.
{
  const targetProductId = verifiedRecipe.ingredients[0].productId;
  const products = SHOGUN_PRODUCTS.map(product =>
    product.id === targetProductId ? { ...product, unit: 'g' } : { ...product },
  );
  const result = readiness({
    products,
    confirmedProtocolStepIds: protocolIds(verifiedRecipe, products),
  });
  assert.equal(result.allowed, false);
  assert.ok(result.blockers.some(blocker => blocker.code === 'UNIT_MISMATCH'));
}

// 4. Non-finite measured gates remain invalid evidence.
for (const measurements of [
  { preBasePh: Number.NaN, finalEc: 1.2, finalPh: 6.2 },
  { preBasePh: 6.5, finalEc: Number.POSITIVE_INFINITY, finalPh: 6.2 },
  { preBasePh: 6.5, finalEc: 1.2, finalPh: Number.NaN },
]) {
  const result = readiness({ measurements });
  assert.equal(result.allowed, false);
  assert.ok(result.blockers.some(blocker =>
    ['PRE_BASE_PH_REQUIRED', 'FINAL_EC_REQUIRED', 'FINAL_PH_REQUIRED', 'INVALID_MEASUREMENT'].includes(blocker.code),
  ));
}

function semanticSnapshotInput() {
  return {
    schemaVersion: PLAN_SNAPSHOT_SCHEMA_VERSION,
    executionModelVersion: PLAN_EXECUTION_MODEL_VERSION,
    origin: 'TECHNICIAN' as const,
    sourceStateRevision: 0,
    recipeId: verifiedRecipe.id,
    recipeSourceVersion: verifiedRecipe.sourceVersion,
    recipeVerificationStatus: 'VERIFIED' as const,
    recipeExecutionPolicy: 'PHYSICAL_ALLOWED' as const,
    method: verifiedRecipe.method,
    stage: GrowthStage.VEG,
    week: 1,
    medium: Medium.TERRA,
    waterContext: {
      waterType: WaterType.CUSTOM,
      provenanceKind: 'USER_MEASURED' as const,
      sourceId: 'water-fixture',
      sourceVersion: '1',
    },
    volumeLitres: 5,
    verdict: 'GO' as const,
    capability: 'PHYSICAL_ALLOWED' as const,
    blockers: [],
    doseLines: verifiedRecipe.ingredients.flatMap((ingredient, index) => {
      const product = SHOGUN_PRODUCTS.find(item => item.id === ingredient.productId);
      if (!product || product.unit !== 'ml') return [];
      return [{
        lineId: `line-${index}`,
        productId: ingredient.productId,
        concentrationPerL: ingredient.concentration,
        calculatedAmount: Number((ingredient.concentration * 5).toFixed(2)),
        unit: 'ml' as const,
        sourceRef: 'fixture:v1',
      }];
    }),
    canonicalStepIds: protocolIds(),
  };
}

// 5. planId/createdAt are identity metadata, not semantic hash inputs.
{
  const input = semanticSnapshotInput();
  const first = createPlanSnapshot({
    ...input,
    planId: 'plan-a',
    createdAt: '2026-08-26T18:00:00.000Z',
  });
  const second = createPlanSnapshot({
    ...input,
    planId: 'plan-b',
    createdAt: '2026-08-26T19:00:00.000Z',
  });
  assert.equal(first.contentHash, second.contentHash);
}

// 6. A semantic change must change contentHash.
{
  const input = semanticSnapshotInput();
  const first = createPlanSnapshot({
    ...input,
    planId: 'plan-semantic-a',
    createdAt: '2026-08-26T18:00:00.000Z',
  });
  const second = createPlanSnapshot({
    ...input,
    volumeLitres: 6,
    planId: 'plan-semantic-b',
    createdAt: '2026-08-26T18:00:00.000Z',
  });
  assert.notEqual(first.contentHash, second.contentHash);
}

// 7. Duplicate lineId/productId in PlanSnapshot are invalid even with a matching hash.
{
  const input = semanticSnapshotInput();
  assert.ok(input.doseLines.length > 0);
  const duplicate = { ...input.doseLines[0], lineId: input.doseLines[0].lineId };
  const snapshot = createPlanSnapshot({
    ...input,
    planId: 'plan-duplicate-lines',
    createdAt: '2026-08-26T18:00:00.000Z',
    doseLines: [...input.doseLines, duplicate],
  });
  const issues = validatePlanSnapshot(snapshot);
  assert.ok(issues.some(issue => issue.code === 'DUPLICATE_LINE_ID'));
  assert.ok(issues.some(issue => issue.code === 'DUPLICATE_PRODUCT_ID'));
}

console.log('P0 domain invariants smoke: PASS');
