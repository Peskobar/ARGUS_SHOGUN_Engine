import assert from 'node:assert/strict';
import { SHOGUN_PRODUCTS } from '../src/data';
import { buildDryRunNutritionPlan } from '../src/dryRunNutritionPlan';
import { buildExecutionSteps, buildManufacturerSourceSteps } from '../src/recipeEngine';
import { buildWeeklyNutritionPlan } from '../src/nutritionTechnician';
import { ApplicationMethod, GrowthStage, Medium, WaterType } from '../src/types';

const technicianPlan = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  medium: 'TERRA_SOIL_PERLITE',
  environment: { usesLed: true },
  scheduleProfileResolved: false,
});

const manufacturerOrder = technicianPlan.manufacturerProducts.map(product => product.productId);
const executionOrder = technicianPlan.executionProducts.map(product => product.productId);

assert.ok(manufacturerOrder.length > 0, 'fixture must expose active Technik Żywienia products');
assert.deepEqual(
  technicianPlan.products.map(product => product.productId),
  manufacturerOrder,
  'legacy products alias must now mean manufacturer/source display order',
);
assert.notDeepEqual(
  manufacturerOrder,
  executionOrder,
  'manufacturer table order must remain independent from physical execution order',
);

const growIndexSource = manufacturerOrder.indexOf('samurai-terra-grow');
const rootsIndexSource = manufacturerOrder.indexOf('katana-roots');
const zenzymIndexSource = manufacturerOrder.indexOf('zenzym');
const siliconIndexSource = manufacturerOrder.indexOf('silicon');
assert.ok(
  growIndexSource >= 0 && rootsIndexSource >= 0 && zenzymIndexSource >= 0 && siliconIndexSource >= 0,
  'VEG source fixture must contain Grow, Katana, Zenzym and Silicon',
);
assert.ok(growIndexSource < rootsIndexSource, 'manufacturer/source view must keep Terra Grow before Katana Roots');
assert.ok(rootsIndexSource < zenzymIndexSource, 'manufacturer/source view must keep Katana Roots before Zenzym');
assert.ok(zenzymIndexSource < siliconIndexSource, 'manufacturer/source view must keep Zenzym before Silicon');

const dryRun = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  usesLed: true,
});
assert.deepEqual(
  dryRun.manufacturerDoses.map(dose => dose.productId),
  manufacturerOrder,
  'dry-run source projection must reuse the same manufacturer/source order',
);
assert.deepEqual(
  dryRun.executionDoses.map(dose => dose.productId),
  executionOrder,
  'dry-run execution projection must reuse the same canonical ARGUS order',
);
assert.deepEqual(
  dryRun.doses.map(dose => dose.productId),
  executionOrder,
  'legacy dry-run doses alias must not create a third list order',
);

const candidateRecipe = {
  id: 'technician-planner-parity',
  name: 'Technik Żywienia parity candidate',
  medium: [Medium.TERRA],
  method: ApplicationMethod.ROOT_FEED,
  stage: GrowthStage.VEG,
  isFactory: false,
  ingredients: manufacturerOrder.map((productId, index) => ({
    productId,
    concentration: 1,
    sourceOrder: (index + 1) * 100,
    // Deliberately hostile manual order. Neither source nor execution may trust it.
    mixOrder: manufacturerOrder.length - index,
  })),
};

const recipeSourceOrder = buildManufacturerSourceSteps(candidateRecipe, SHOGUN_PRODUCTS).map(step => step.product.id);
assert.deepEqual(
  recipeSourceOrder,
  manufacturerOrder,
  'recipe source projection must preserve the manufacturer/source sequence',
);

const plannerOrder = buildExecutionSteps(candidateRecipe, SHOGUN_PRODUCTS).map(step => step.product.id);
assert.deepEqual(
  plannerOrder,
  executionOrder,
  'Technik Żywienia execution projection and Planner must derive the same physical sequence',
);

const siliconIndex = executionOrder.indexOf('silicon');
const baseIndex = executionOrder.indexOf('samurai-terra-grow');
const rootsIndex = executionOrder.indexOf('katana-roots');
assert.ok(siliconIndex >= 0 && baseIndex >= 0 && rootsIndex >= 0, 'VEG execution fixture must contain Silicon, Terra Grow and Katana Roots');
assert.ok(siliconIndex < baseIndex, 'physical order: Silicon must precede base');
assert.ok(baseIndex < rootsIndex, 'physical order: base must precede Katana Roots');

console.log('Technik Żywienia / Planner source-vs-execution parity smoke: PASS');
