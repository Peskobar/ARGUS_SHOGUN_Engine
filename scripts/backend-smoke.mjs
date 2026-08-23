import assert from 'node:assert/strict';
import { allocateToolSet, calculateSyringes } from '../src/syringeEngine.ts';
import {
  buildExecutionProtocol,
  buildExecutionSteps,
  filterRecipes,
  findInventoryShortages,
  orderIngredientsByRole,
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
  { id: 'base', name: 'Base', compatibleMedia: ['TERRA'], type: 'FERTILIZER', mixingRole: 'BASE', unit: 'ml' },
  { id: 'silicon', name: 'Silicon', compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'SILICON', unit: 'ml' },
  { id: 'roots', name: 'Roots', compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'ROOTS', unit: 'ml' },
  { id: 'calmag', name: 'CalMag', compatibleMedia: ['TERRA'], type: 'ADDITIVE', mixingRole: 'CALMAG', unit: 'ml' },
  { id: 'myco', name: 'Myco', compatibleMedia: ['TERRA'], type: 'BIOLOGICAL', mixingRole: 'BIOLOGICAL', unit: 'g' },
  { id: 'rts', name: 'RTS', compatibleMedia: ['TERRA'], type: 'READY_TO_USE', mixingRole: 'READY_TO_USE', unit: 'ml' },
].map(product => ({
  ...product,
  brand: 'TEST',
  color: '',
  initialCapacity: 1000,
  remainingCapacity: 1000,
  foliarAllowed: product.id === 'rts',
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

const canonical = orderIngredientsByRole(
  [
    { productId: 'base', concentration: 2 },
    { productId: 'roots', concentration: 0.2 },
    { productId: 'silicon', concentration: 1 },
  ],
  products,
);
assert.deepEqual(canonical.map(ingredient => ingredient.productId), ['silicon', 'base', 'roots']);
assert.deepEqual(canonical.map(ingredient => ingredient.mixOrder), [100, 200, 300]);

const protocol = buildExecutionProtocol(mixRecipe, products);
assert.deepEqual(
  protocol.map(step => step.kind === 'PRODUCT' ? step.product.id : step.id),
  ['water-start', 'silicon', 'post-silicon-ph', 'calmag', 'base', 'roots', 'final-ec', 'final-ph'],
);

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
const explicitWarnings = validateRecipeContext(explicitOrderRecipe, products, {
  medium: 'TERRA',
  method: 'ROOT_FEED',
});
assert.equal(explicitWarnings.some(warning => warning.code === 'SILICON_AFTER_BASE' && warning.severity === 'ERROR'), true);

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

const unsupportedUnitWarnings = validateRecipeContext(
  {
    ...mixRecipe,
    id: 'myco-dose',
    ingredients: [{ productId: 'myco', concentration: 1 }],
  },
  products,
  { medium: 'TERRA', method: 'ROOT_FEED' },
);
assert.equal(unsupportedUnitWarnings.some(warning => warning.code === 'UNSUPPORTED_DOSING_UNIT'), true);

const invalidRtsWarnings = validateRecipeContext(
  {
    ...mixRecipe,
    id: 'bad-rts',
    method: 'READY_TO_SPRAY',
    ingredients: [
      { productId: 'rts', concentration: 0 },
      { productId: 'base', concentration: 0 },
    ],
  },
  products,
  { medium: 'TERRA', method: 'READY_TO_SPRAY' },
);
assert.equal(invalidRtsWarnings.some(warning => warning.code === 'READY_TO_SPRAY_INGREDIENT_COUNT'), true);

const lowStockProducts = products.map(product =>
  product.id === 'base' ? { ...product, remainingCapacity: 5 } : product,
);
const shortages = findInventoryShortages(mixRecipe, lowStockProducts, 5);
assert.deepEqual(shortages, [
  { productId: 'base', productName: 'Base', requiredMl: 10, availableMl: 5 },
]);

console.log('backend smoke: PASS');
