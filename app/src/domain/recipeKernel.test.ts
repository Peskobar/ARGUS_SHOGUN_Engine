import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterRecipesByContext,
  inspectRecipeShape,
  orderRecipeIngredients,
  type ProductRoleLookup,
  type RecipeDraft,
  type RoleOrderPolicy,
} from './recipeKernel.ts';

const products: ProductRoleLookup[] = [
  { id: 'silicon-x', mixingRole: 'SILICON' },
  { id: 'base-x', mixingRole: 'BASE' },
  { id: 'roots-x', mixingRole: 'ROOTS' },
];

const syntheticPolicy: RoleOrderPolicy = {
  weights: {
    SILICON: 10,
    BASE: 20,
    ROOTS: 30,
  },
  defaultWeight: 1000,
};

const baseRecipe: RecipeDraft = {
  id: 'r1',
  medium: ['TERRA'],
  method: 'ROOT_FEED',
  stage: 'VEG',
  ingredients: [
    { productId: 'base-x', concentration: 1 },
    { productId: 'silicon-x', concentration: 1 },
    { productId: 'roots-x', concentration: 1 },
  ],
};

test('context filtering is strict by method and medium', () => {
  const foliar: RecipeDraft = { ...baseRecipe, id: 'r2', method: 'FOLIAR' };
  const result = filterRecipesByContext([baseRecipe, foliar], {
    medium: 'TERRA',
    method: 'ROOT_FEED',
    stage: 'VEG',
  });

  assert.deepEqual(result.map((recipe) => recipe.id), ['r1']);
});

test('role order is deterministic but supplied externally', () => {
  const ordered = orderRecipeIngredients(baseRecipe, products, syntheticPolicy);
  assert.deepEqual(
    ordered.map((ingredient) => ingredient.productId),
    ['silicon-x', 'base-x', 'roots-x'],
  );
});

test('explicit mixOrder wins and equal orders preserve source order', () => {
  const recipe: RecipeDraft = {
    ...baseRecipe,
    ingredients: [
      { productId: 'roots-x', concentration: 1, mixOrder: 10 },
      { productId: 'base-x', concentration: 1, mixOrder: 10 },
      { productId: 'silicon-x', concentration: 1, mixOrder: 5 },
    ],
  };

  const ordered = orderRecipeIngredients(recipe, products, syntheticPolicy);
  assert.deepEqual(
    ordered.map((ingredient) => ingredient.productId),
    ['silicon-x', 'roots-x', 'base-x'],
  );
});

test('shape inspection reports facts without encoding UI gate semantics', () => {
  const recipe: RecipeDraft = {
    ...baseRecipe,
    ingredients: [
      { productId: 'base-x', concentration: -1 },
      { productId: 'base-x', concentration: 1 },
      { productId: 'missing-x', concentration: 1 },
    ],
  };

  const issues = inspectRecipeShape(recipe, products);
  assert.ok(issues.some((issue) => issue.code === 'INVALID_CONCENTRATION'));
  assert.ok(issues.some((issue) => issue.code === 'DUPLICATE_PRODUCT'));
  assert.ok(issues.some((issue) => issue.code === 'UNKNOWN_PRODUCT'));
  assert.equal(issues.some((issue) => 'severity' in issue), false);
});

test('kernel does not contain a hidden default mixing policy', () => {
  const neutralPolicy: RoleOrderPolicy = { weights: {}, defaultWeight: 100 };
  const ordered = orderRecipeIngredients(baseRecipe, products, neutralPolicy);
  assert.deepEqual(
    ordered.map((ingredient) => ingredient.productId),
    ['base-x', 'silicon-x', 'roots-x'],
  );
});
