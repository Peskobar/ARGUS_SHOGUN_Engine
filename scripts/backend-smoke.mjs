import assert from 'node:assert/strict';
import { PHYSICAL_SYRINGES } from '../src/data.ts';
import { evaluateExecutionReadiness } from '../src/executionPolicy.ts';
import {
  buildExecutionProtocol,
  buildExecutionSteps,
  filterRecipes,
  validateRecipeContext,
} from '../src/recipeEngine.ts';
import { allocateToolSet, isMeasurableAmount } from '../src/syringeEngine.ts';

const products = [
  { id: 'silicon', name: 'Silicon', brand: 'TEST', color: '', initialCapacity: 1000, remainingCapacity: 1000, unit: 'ml', foliarAllowed: false, compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'SILICON' },
  { id: 'calmag', name: 'CalMag', brand: 'TEST', color: '', initialCapacity: 1000, remainingCapacity: 1000, unit: 'ml', foliarAllowed: true, compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'CALMAG' },
  { id: 'base', name: 'Base', brand: 'TEST', color: '', initialCapacity: 1000, remainingCapacity: 1000, unit: 'ml', foliarAllowed: false, compatibleMedia: ['TERRA'], type: 'FERTILIZER', mixingRole: 'BASE' },
  { id: 'roots', name: 'Roots', brand: 'TEST', color: '', initialCapacity: 1000, remainingCapacity: 1000, unit: 'ml', foliarAllowed: false, compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'ROOTS' },
];

const verifiedRecipe = {
  id: 'verified-root',
  name: 'Verified root feed',
  medium: ['TERRA'],
  method: 'ROOT_FEED',
  stage: 'VEG',
  weekStart: 1,
  weekEnd: 2,
  verificationStatus: 'VERIFIED',
  executionPolicy: 'PHYSICAL_ALLOWED',
  isFactory: true,
  ingredients: [
    { productId: 'silicon', concentration: 1 },
    { productId: 'calmag', concentration: 0.5 },
    { productId: 'base', concentration: 2 },
    { productId: 'roots', concentration: 0.2 },
  ],
};

const pkRecipe = {
  ...verifiedRecipe,
  id: 'week-4',
  name: 'Week 4',
  stage: 'BLOOM',
  weekStart: 4,
  weekEnd: 7,
};

assert.deepEqual(
  filterRecipes([verifiedRecipe, pkRecipe], { medium: 'TERRA', method: 'ROOT_FEED', stage: 'VEG', week: 1 }).map(recipe => recipe.id),
  ['verified-root'],
);
assert.deepEqual(
  filterRecipes([verifiedRecipe, pkRecipe], { medium: 'TERRA', method: 'ROOT_FEED', stage: 'BLOOM', week: 5 }).map(recipe => recipe.id),
  ['week-4'],
);
assert.equal(filterRecipes([verifiedRecipe], { medium: 'TERRA', method: 'ROOT_FEED', stage: 'VEG', week: 3 }).length, 0);

const steps = buildExecutionSteps(verifiedRecipe, products);
assert.deepEqual(steps.map(step => step.product.id), ['silicon', 'calmag', 'base', 'roots']);

const protocol = buildExecutionProtocol(verifiedRecipe, products);
assert.deepEqual(
  protocol.map(step => step.id),
  ['water-start', 'product:silicon', 'pre-base-ph-gate', 'product:calmag', 'product:base', 'product:roots', 'final-ec-gate', 'final-ph-gate'],
);

const allConfirmed = protocol.map(step => step.id);
let readiness = evaluateExecutionReadiness({
  recipe: verifiedRecipe,
  products,
  medium: 'TERRA',
  stage: 'VEG',
  week: 1,
  waterType: 'CUSTOM',
  volumeLitres: 5,
  measurements: {},
  confirmedProtocolStepIds: allConfirmed,
});
assert.equal(readiness.allowed, false);
assert.ok(readiness.blockers.some(blocker => blocker.code === 'PRE_BASE_PH_REQUIRED'));
assert.ok(readiness.blockers.some(blocker => blocker.code === 'FINAL_EC_REQUIRED'));
assert.ok(readiness.blockers.some(blocker => blocker.code === 'FINAL_PH_REQUIRED'));

readiness = evaluateExecutionReadiness({
  recipe: verifiedRecipe,
  products,
  medium: 'TERRA',
  stage: 'VEG',
  week: 1,
  waterType: 'CUSTOM',
  volumeLitres: 5,
  measurements: { preBasePh: 7, finalEc: 1.2, finalPh: 6.2 },
  confirmedProtocolStepIds: allConfirmed,
});
assert.equal(readiness.allowed, false);
assert.ok(readiness.blockers.some(blocker => blocker.code === 'PRE_BASE_PH_OUT_OF_POLICY'));

readiness = evaluateExecutionReadiness({
  recipe: verifiedRecipe,
  products,
  medium: 'TERRA',
  stage: 'VEG',
  week: 1,
  waterType: 'CUSTOM',
  volumeLitres: 5,
  measurements: { preBasePh: 6.5, finalEc: 1.2, finalPh: 6.2 },
  confirmedProtocolStepIds: allConfirmed,
});
assert.equal(readiness.allowed, true, readiness.blockers.map(blocker => blocker.message).join('\n'));
assert.equal(readiness.requirements.reduce((sum, item) => sum + item.amountMl, 0), 18.5);

const unverified = { ...verifiedRecipe, verificationStatus: 'UNVERIFIED', executionPolicy: 'SIMULATION_ONLY' };
const simulationWarnings = validateRecipeContext(unverified, products, { medium: 'TERRA', method: 'ROOT_FEED', week: 1 }, 'SIMULATION');
assert.ok(simulationWarnings.some(warning => warning.code === 'RECIPE_UNVERIFIED' && warning.severity === 'WARNING'));
const physicalWarnings = validateRecipeContext(unverified, products, { medium: 'TERRA', method: 'ROOT_FEED', week: 1 }, 'PHYSICAL_EXECUTION');
assert.ok(physicalWarnings.some(warning => warning.code === 'RECIPE_UNVERIFIED' && warning.severity === 'ERROR'));
assert.ok(physicalWarnings.some(warning => warning.code === 'PHYSICAL_EXECUTION_NOT_ALLOWED'));

const unsafeOrder = {
  ...verifiedRecipe,
  id: 'unsafe-order',
  ingredients: [
    { productId: 'base', concentration: 2, mixOrder: 100 },
    { productId: 'silicon', concentration: 1, mixOrder: 200 },
  ],
};
assert.ok(validateRecipeContext(unsafeOrder, products, { medium: 'TERRA', method: 'ROOT_FEED', week: 1 }, 'SIMULATION').some(warning => warning.code === 'UNSAFE_MIX_ORDER'));

const allocation = allocateToolSet([
  { productId: 'a', volumeMl: 2.55 },
  { productId: 'b', volumeMl: 5.2 },
], PHYSICAL_SYRINGES, 'PRECISION');
assert.equal(allocation.complete, true);
for (const assignment of Object.values(allocation.assignments).flat()) {
  assert.equal(
    Math.round(assignment.amount * 100) % Math.round(assignment.precisionStep * 100),
    0,
    `${assignment.instanceId} cannot physically measure ${assignment.amount}ml at step ${assignment.precisionStep}`,
  );
}

const coarseOnly = [{ id: 'coarse', capacity: 3, count: 1, label: '3ml coarse', type: 'SYRINGE', precisionStep: 0.1 }];
assert.equal(isMeasurableAmount(2.5, coarseOnly[0]), true);
assert.equal(isMeasurableAmount(2.55, coarseOnly[0]), false);
assert.equal(allocateToolSet([{ productId: 'x', volumeMl: 2.55 }], coarseOnly).complete, false);

console.log('backend smoke: PASS');
