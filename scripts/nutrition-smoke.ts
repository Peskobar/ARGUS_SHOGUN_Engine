import assert from 'node:assert/strict';
import { GrowthStage, WaterType } from '../src/types';
import { buildWeeklyNutritionPlan, compareScenario, evaluateProductDecision } from '../src/nutritionTechnician';

const hardVeg1 = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  backgroundEc: 0.53,
  medium: 'TERRA_SOIL_PERLITE',
});

const hardVegIds = hardVeg1.products.map(product => product.productId);
assert.ok(hardVegIds.includes('samurai-terra-grow'));
assert.ok(hardVegIds.includes('katana-roots'));
assert.ok(hardVegIds.includes('zenzym'));
assert.ok(hardVegIds.includes('silicon'));
assert.ok(hardVegIds.includes('calmag'));
assert.ok(!hardVegIds.includes('pk-warrior'));
assert.ok(!hardVegIds.includes('samurai-terra-bloom'));

const hardGrow = hardVeg1.products.find(product => product.productId === 'samurai-terra-grow')!;
assert.deepEqual(
  hardGrow.doseWindows.map(window => [window.minMlPerL, window.maxMlPerL]),
  [[1, 2]],
);
assert.equal(hardGrow.confidence, 'HIGH');

const customVeg1 = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  medium: 'TERRA_SOIL_PERLITE',
});
const customGrow = customVeg1.products.find(product => product.productId === 'samurai-terra-grow')!;
assert.equal(customGrow.doseWindows.length, 2, 'unknown water must show HARD and SOFT candidates, not hide the base');
assert.equal(customGrow.confidence, 'MEDIUM');
assert.equal(customVeg1.waterStatus, 'REFERENCE_ONLY');
assert.ok(customVeg1.systemWarnings.some(warning => warning.includes('HARD/SOFT')));

const softBloom4 = buildWeeklyNutritionPlan({
  stage: GrowthStage.BLOOM,
  week: 4,
  waterType: WaterType.SOFT,
  backgroundEc: 0.1,
  medium: 'TERRA_SOIL_PERLITE',
});
const softBloomIds = softBloom4.products.map(product => product.productId);
assert.ok(softBloomIds.includes('samurai-terra-bloom'));
assert.ok(softBloomIds.includes('zenzym'));
assert.ok(softBloomIds.includes('silicon'));
assert.ok(softBloomIds.includes('calmag'));
assert.ok(softBloomIds.includes('sumo-active-boost'));
assert.ok(softBloomIds.includes('pk-warrior'));
assert.ok(!softBloomIds.includes('katana-roots'), 'Katana Roots root-feed window ends after flower week 3');
assert.ok(softBloom4.systemWarnings.some(warning => warning.includes('25–50%')));
assert.ok(softBloom4.systemWarnings.some(warning => warning.includes('PRE_BASE_PH_GATE')));

const silicon = evaluateProductDecision('silicon', {
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  medium: 'TERRA_SOIL_PERLITE',
});
assert.ok(silicon?.hardRules.some(rule => rule.includes('pH poniżej 7')));

const calmagScenarios = compareScenario('calmag', {
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  medium: 'TERRA_SOIL_PERLITE',
});
assert.ok(calmagScenarios.more?.decisionText.some(text => text.includes('symulacją ryzyka')));
assert.ok(calmagScenarios.more?.decisionText.some(text => text.includes('Ca i K')));

const omitBase = evaluateProductDecision('samurai-terra-grow', {
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  medium: 'TERRA_SOIL_PERLITE',
}, 'OMIT');
assert.equal(omitBase?.blocked, true);

const omitBaseOverride = evaluateProductDecision('samurai-terra-grow', {
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  medium: 'TERRA_SOIL_PERLITE',
  allowBaseOmit: true,
}, 'OMIT');
assert.equal(omitBaseOverride?.blocked, false);

console.log('nutrition smoke: PASS');
