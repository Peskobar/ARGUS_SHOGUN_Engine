import assert from 'node:assert/strict';
import { SHOGUN_PRODUCTS } from '../src/data';
import { validateRecipeContext } from '../src/recipeEngine';
import { ApplicationMethod, GrowthStage, Medium } from '../src/types';

const ctx = { medium: Medium.TERRA, method: ApplicationMethod.ROOT_FEED };

const unknownCustom = {
  id: 'custom-unknown-role',
  name: 'Unknown role',
  medium: [Medium.TERRA],
  method: ApplicationMethod.ROOT_FEED,
  stage: GrowthStage.VEG,
  isFactory: false,
  ingredients: [{ productId: 'custom-safe-shape', concentration: 1 }],
};
const customProduct = {
  id: 'custom-safe-shape',
  name: 'Custom safe shape',
  brand: 'CUSTOM',
  color: '',
  initialCapacity: 100,
  remainingCapacity: 100,
  unit: 'ml',
  foliarAllowed: false,
  compatibleMedia: [Medium.TERRA],
  type: 'ADDITIVE' as const,
  mixingRole: undefined,
};
const unknownWarnings = validateRecipeContext(unknownCustom, [...SHOGUN_PRODUCTS, customProduct], ctx);
assert.ok(unknownWarnings.some(warning => warning.code === 'MISSING_MIXING_ROLE'));
assert.ok(unknownWarnings.some(warning => warning.code === 'MISSING_BASE_NUTRITION'));

const additivesOnly = {
  id: 'additives-only',
  name: 'Additives only',
  medium: [Medium.TERRA],
  method: ApplicationMethod.ROOT_FEED,
  stage: GrowthStage.VEG,
  isFactory: false,
  ingredients: [
    { productId: 'katana-roots', concentration: 0.2 },
    { productId: 'zenzym', concentration: 2.5 },
  ],
};
assert.ok(
  validateRecipeContext(additivesOnly, SHOGUN_PRODUCTS, ctx)
    .some(warning => warning.code === 'MISSING_BASE_NUTRITION'),
);

const multipleBases = {
  id: 'multiple-bases',
  name: 'Multiple bases',
  medium: [Medium.TERRA],
  method: ApplicationMethod.ROOT_FEED,
  stage: GrowthStage.VEG,
  isFactory: false,
  ingredients: [
    { productId: 'samurai-terra-grow', concentration: 2 },
    { productId: 'samurai-terra-bloom', concentration: 2 },
  ],
};
assert.ok(
  validateRecipeContext(multipleBases, SHOGUN_PRODUCTS, ctx)
    .some(warning => warning.code === 'MULTIPLE_BASE_PRODUCTS'),
);

const siliconRecipe = {
  id: 'silicon-gate',
  name: 'Silicon gate',
  medium: [Medium.TERRA],
  method: ApplicationMethod.ROOT_FEED,
  stage: GrowthStage.VEG,
  isFactory: false,
  ingredients: [
    { productId: 'silicon', concentration: 1 },
    { productId: 'samurai-terra-grow', concentration: 2 },
  ],
};
assert.ok(
  validateRecipeContext(siliconRecipe, SHOGUN_PRODUCTS, ctx)
    .some(warning => warning.code === 'PRE_BASE_PH_GATE_NOT_INTEGRATED'),
  'legacy PlannerV3 execution must remain HOLD for Silicon until canonical gate UI is wired',
);

const simpleBaseOnly = {
  id: 'simple-base-only',
  name: 'Simple base only',
  medium: [Medium.TERRA],
  method: ApplicationMethod.ROOT_FEED,
  stage: GrowthStage.VEG,
  isFactory: false,
  ingredients: [{ productId: 'samurai-terra-grow', concentration: 2 }],
};
const simpleWarnings = validateRecipeContext(simpleBaseOnly, SHOGUN_PRODUCTS, ctx);
assert.equal(simpleWarnings.some(warning => warning.code === 'MISSING_BASE_NUTRITION'), false);
assert.equal(simpleWarnings.some(warning => warning.code === 'MULTIPLE_BASE_PRODUCTS'), false);
assert.equal(simpleWarnings.some(warning => warning.code === 'PRE_BASE_PH_GATE_NOT_INTEGRATED'), false);

console.log('planner boundary smoke: PASS');
