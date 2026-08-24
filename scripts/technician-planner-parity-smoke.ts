import assert from 'node:assert/strict';
import { SHOGUN_PRODUCTS } from '../src/data';
import { buildExecutionSteps } from '../src/recipeEngine';
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

const technicianOrder = technicianPlan.products.map(product => product.productId);
assert.ok(technicianOrder.length > 0, 'fixture must expose active Technik Żywienia products');
assert.equal(technicianOrder[0], 'silicon', 'Technik Żywienia must place Silicon first among nutrient products');

const candidateRecipe = {
  id: 'technician-planner-parity',
  name: 'Technik Żywienia parity candidate',
  medium: [Medium.TERRA],
  method: ApplicationMethod.ROOT_FEED,
  stage: GrowthStage.VEG,
  isFactory: false,
  ingredients: technicianOrder.map((productId, index) => ({
    productId,
    concentration: 1,
    // Deliberately reverse author/display order. Planner must ignore it physically.
    mixOrder: technicianOrder.length - index,
  })),
};

const plannerOrder = buildExecutionSteps(candidateRecipe, SHOGUN_PRODUCTS).map(step => step.product.id);
assert.deepEqual(
  plannerOrder,
  technicianOrder,
  'Technik Żywienia and Planner must derive the same physical product sequence from the canonical engine',
);

const siliconIndex = technicianOrder.indexOf('silicon');
const baseIndex = technicianOrder.indexOf('samurai-terra-grow');
const rootsIndex = technicianOrder.indexOf('katana-roots');
assert.ok(siliconIndex >= 0 && baseIndex >= 0 && rootsIndex >= 0, 'VEG fixture must contain Silicon, Terra Grow and Katana Roots');
assert.ok(siliconIndex < baseIndex, 'Silicon must precede base');
assert.ok(baseIndex < rootsIndex, 'base must precede Katana Roots');

console.log('Technik Żywienia / Planner parity smoke: PASS');
