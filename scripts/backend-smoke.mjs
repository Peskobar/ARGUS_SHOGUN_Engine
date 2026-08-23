import assert from 'node:assert/strict';
import { allocateToolSet, calculateSyringes } from '../src/syringeEngine.ts';
import {
  buildExecutionProtocol,
  buildExecutionSteps,
  filterRecipes,
  findInventoryShortages,
  validateRecipeContext,
} from '../src/recipeEngine.ts';

const tools = [
  { id: 's20', capacity: 20, count: 5, label: '20ml', type: 'SYRINGE' },
  { id: 's6', capacity: 6, count: 5, label: '6ml', type: 'SYRINGE' },
  { id: 's3', capacity: 3, count: 5, label: '3ml', type: 'SYRINGE' },
  { id: 'p3', capacity: 3, count: 4, label: '3ml Pipeta', type: 'PIPETTE' },
  { id: 's1', capacity: 1, count: 10, label: '1ml (Insulina)', type: 'SYRINGE' },
];

assert.deepEqual(
  calculateSyringes(2.5, tools).map(({ type, amount }) => ({ type, amount })),
  [{ type: '3ml', amount: 2.5 }],
);

assert.deepEqual(
  calculateSyringes(25, tools).map(({ type, amount }) => ({ type, amount })),
  [
    { type: '20ml', amount: 20 },
    { type: '6ml', amount: 5 },
  ],
);

const set = allocateToolSet([
  { productId: 'silicon', volumeMl: 5 },
  { productId: 'calmag', volumeMl: 2.5 },
  { productId: 'base', volumeMl: 10 },
  { productId: 'roots', volumeMl: 1 },
], tools);
assert.equal(set.complete, true);
assert.equal(new Set(Object.values(set.assignments).flat().map(item => item.instanceId)).size, 4);

const singleToolSet = allocateToolSet(
  [
    { productId: 'a', volumeMl: 1 },
    { productId: 'b', volumeMl: 1 },
  ],
  [{ id: 'one', capacity: 1, count: 1, label: '1ml', type: 'SYRINGE' }],
);
assert.equal(singleToolSet.complete, false);
assert.equal(singleToolSet.shortages.length, 1);

const recipes = [
  { id: 'root', medium: ['TERRA'], method: 'ROOT_FEED', stage: 'VEG', ingredients: [], isFactory: true },
  { id: 'geisha', medium: ['TERRA'], method: 'READY_TO_SPRAY', stage: 'ALL', ingredients: [], isFactory: true },
];
assert.deepEqual(
  filterRecipes(recipes, { medium: 'TERRA', method: 'ROOT_FEED', stage: 'VEG' }).map(r => r.id),
  ['root'],
);

const products = [
  { id: 'base', name: 'Base', compatibleMedia: ['TERRA'], type: 'FERTILIZER', mixingRole: 'BASE' },
  { id: 'silicon', name: 'Silicon', compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'SILICON' },
  { id: 'roots', name: 'Roots', compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'ROOTS' },
  { id: 'calmag', name: 'CalMag', compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'CALMAG' },
].map(product => ({
  ...product,
  brand: 'TEST',
  color: '',
  initialCapacity: 1000,
  remainingCapacity: 1000,
  unit: 'ml',
  foliarAllowed: false,
}));

const mixRecipe = {
  id: 'mix',
  name: 'Mix',
  medium: ['TERRA'],
  method: 'ROOT_FEED',
  stage: 'VEG',
  verificationStatus: 'UNVERIFIED',
  isFactory: true,
  ingredients: [
    { productId: 'base', concentration: 2 },
    { productId: 'roots', concentration: 0.2 },
    { productId: 'silicon', concentration: 1 },
    { productId: 'calmag', concentration: 0.5 },
  ],
};

const steps = buildExecutionSteps(mixRecipe, products);
assert.deepEqual(steps.map(step => step.product.id), ['silicon', 'calmag', 'base', 'roots']);

const protocol = buildExecutionProtocol(mixRecipe, products);
assert.deepEqual(
  protocol.map(step => step.kind === 'PRODUCT' ? step.product.id : step.id),
  ['water-start', 'silicon', 'post-silicon-ph', 'calmag', 'base', 'roots', 'final-ec', 'final-ph'],
);

// Regression: explicit custom ordering must never move the pH checkpoint before Silicon.
const explicitOrderRecipe = {
  ...mixRecipe,
  id: 'explicit-order',
  isFactory: false,
  ingredients: [
    { productId: 'base', concentration: 2, mixOrder: 100 },
    { productId: 'silicon', concentration: 1, mixOrder: 500 },
    { productId: 'roots', concentration: 0.2, mixOrder: 600 },
  ],
};
const explicitProtocol = buildExecutionProtocol(explicitOrderRecipe, products);
assert.deepEqual(
  explicitProtocol.map(step => step.kind === 'PRODUCT' ? step.product.id : step.id),
  ['water-start', 'base', 'silicon', 'post-silicon-ph', 'roots', 'final-ec', 'final-ph'],
);

const warnings = validateRecipeContext(mixRecipe, products, {
  medium: 'TERRA',
  method: 'ROOT_FEED',
});
assert.equal(warnings.some(warning => warning.code === 'RECIPE_UNVERIFIED' && warning.severity === 'WARNING'), true);

const conflictWarnings = validateRecipeContext(
  { ...mixRecipe, verificationStatus: 'CONFLICT' },
  products,
  { medium: 'TERRA', method: 'ROOT_FEED' },
);
assert.equal(conflictWarnings.some(warning => warning.code === 'RECIPE_CONFLICT' && warning.severity === 'ERROR'), true);

const lowStockProducts = products.map(product =>
  product.id === 'base' ? { ...product, remainingCapacity: 5 } : product,
);
const shortages = findInventoryShortages(mixRecipe, lowStockProducts, 5);
assert.deepEqual(shortages, [
  { productId: 'base', productName: 'Base', requiredMl: 10, availableMl: 5 },
]);

console.log('backend smoke: PASS');
