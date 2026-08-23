import assert from 'node:assert/strict';
import { GrowthStage, WaterType } from '../src/types';
import { buildWeeklyNutritionPlan, compareScenario, evaluateProductDecision } from '../src/nutritionTechnician';
import { buildDryRunNutritionPlan, getDryRunDose } from '../src/dryRunNutritionPlan';
import {
  MANUFACTURER_SOURCE_REGISTRY,
  TERRA_LED_2024_PROFILE,
  ledCalMagDoseMlPerL,
  resolveLedTerraWaterAdjustment,
  resolveManufacturerProfile,
} from '../src/manufacturerProfiles';
import { resolveNutritionConflicts } from '../src/nutritionConflictResolver';
import {
  APPLICATION_PROTOCOLS,
  PRODUCT_VERIFICATION,
  classifyShogunWaterFromMeasuredEc,
  getManufacturerScheduleSignals,
  pkBaseAdjustmentPolicy,
} from '../src/nutritionEvidencePolicy';

// Legacy path stays intact when LED context/profile is not selected.
const hardVeg1 = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  backgroundEc: 0.53,
  medium: 'TERRA_SOIL_PERLITE',
});

const hardVegIds = hardVeg1.products.map(product => product.productId);
assert.ok(hardVegIds.includes('samurai-terra-grow'));
assert.ok(hardVegIds.includes('shogun-start'), 'legacy/current Start overlap remains visible');
assert.ok(hardVegIds.includes('katana-roots'));
assert.ok(hardVegIds.includes('zenzym'));
assert.ok(hardVegIds.includes('silicon'));
assert.ok(hardVegIds.includes('calmag'));
assert.ok(!hardVegIds.includes('pk-warrior'));
assert.ok(!hardVegIds.includes('samurai-terra-bloom'));
assert.ok(hardVeg1.systemWarnings.some(warning => warning.includes('Nie sumuj') || warning.includes('Start')));
assert.equal(hardVeg1.manufacturerProfileId, 'TERRA_LEGACY_HARD_SOFT');

const hardGrow = hardVeg1.products.find(product => product.productId === 'samurai-terra-grow')!;
assert.deepEqual(hardGrow.doseWindows.map(window => [window.minMlPerL, window.maxMlPerL]), [[1, 2]]);
assert.equal(hardGrow.confidence, 'MEDIUM');
assert.equal(hardVeg1.manufacturerWaterClass, WaterType.HARD);
assert.deepEqual(hardVeg1.scheduleSignals, ['UNRESOLVED']);

const customVeg1 = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  medium: 'TERRA_SOIL_PERLITE',
});
const customGrow = customVeg1.products.find(product => product.productId === 'samurai-terra-grow')!;
assert.equal(customGrow.doseWindows.length, 2);
assert.equal(customGrow.confidence, 'MEDIUM');
assert.equal(customVeg1.waterStatus, 'REFERENCE_ONLY');

const seedling = buildWeeklyNutritionPlan({
  stage: GrowthStage.SEEDLING,
  week: 1,
  waterType: WaterType.HARD,
  medium: 'TERRA_SOIL_PERLITE',
});
assert.ok(seedling.applicationProtocols.some(protocol => protocol.productId === 'shogun-start' && protocol.method === 'SOAK' && protocol.concentrationMlPerL === 4));
assert.ok(seedling.applicationProtocols.some(protocol => protocol.productId === 'katana-roots' && protocol.method === 'SOAK' && protocol.durationMinutes === 15));
assert.ok(seedling.applicationProtocols.some(protocol => protocol.productId === 'katana-roots' && protocol.method === 'ROOT_FEED' && protocol.cadence === 'WEEKLY'));
assert.ok(!seedling.products.some(product => product.productId === 'katana-roots'));

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
assert.ok(!softBloomIds.includes('katana-roots'));

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

assert.equal(classifyShogunWaterFromMeasuredEc(0.53), WaterType.HARD);
assert.equal(classifyShogunWaterFromMeasuredEc(0.2), WaterType.SOFT);
assert.equal(classifyShogunWaterFromMeasuredEc(0.4), 'BOUNDARY');
assert.deepEqual(getManufacturerScheduleSignals({ leafTemperatureC: 27, relativeHumidity: 45 }), ['LIGHT']);
assert.deepEqual(getManufacturerScheduleSignals({ leafTemperatureC: 24, relativeHumidity: 60 }), ['STANDARD']);
assert.deepEqual(getManufacturerScheduleSignals({ usesLed: true }), ['HEAVY']);
assert.deepEqual(getManufacturerScheduleSignals({ leafTemperatureC: 27, relativeHumidity: 45, usesLed: true }), ['LIGHT', 'HEAVY']);
assert.equal(PRODUCT_VERIFICATION['samurai-terra-grow'].compositionStatus, 'PARTIAL');
assert.equal(PRODUCT_VERIFICATION['shogun-start'].doseStatus, 'CONFLICT');
assert.ok(APPLICATION_PROTOCOLS.some(protocol => protocol.productId === 'katana-roots' && protocol.method === 'SOAK' && protocol.durationMinutes === 15));
assert.equal(pkBaseAdjustmentPolicy('INTEGRATED_FEEDCHART').requiresExplicitAdjustment, false);
assert.equal(pkBaseAdjustmentPolicy('STANDALONE_PRODUCT_RATE').requiresExplicitAdjustment, true);

// LED 2024 profile provenance and water rules.
assert.equal(resolveManufacturerProfile('AUTO', true).id, 'TERRA_LED_2024');
assert.equal(resolveManufacturerProfile('AUTO', false).id, 'TERRA_LEGACY_HARD_SOFT');
assert.ok(MANUFACTURER_SOURCE_REGISTRY.some(source => source.id === 'shogun-led-terra-2024'));
assert.equal(resolveLedTerraWaterAdjustment(0).percent, 20);
assert.equal(resolveLedTerraWaterAdjustment(0.2).percent, 10);
assert.equal(resolveLedTerraWaterAdjustment(0.4).percent, 0);
assert.equal(resolveLedTerraWaterAdjustment(0.6).percent, -10);
assert.equal(resolveLedTerraWaterAdjustment(0.53).status, 'UNRESOLVED_BETWEEN_ANCHORS');
assert.equal(ledCalMagDoseMlPerL(0.2, WaterType.SOFT).dose, 1);
assert.equal(ledCalMagDoseMlPerL(0.4, WaterType.HARD).dose, null);

const ledVeg1Baseline = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  medium: 'TERRA_SOIL_PERLITE',
  manufacturerProfile: 'TERRA_LED_2024',
  environment: { usesLed: true },
});
assert.equal(ledVeg1Baseline.manufacturerProfileId, 'TERRA_LED_2024');
assert.equal(ledVeg1Baseline.products.find(product => product.productId === 'samurai-terra-grow')?.doseWindows[0].minMlPerL, 1.5);
assert.ok(!ledVeg1Baseline.products.some(product => product.productId === 'shogun-start'), 'LED chart places Start in seedling/cuttings, not VEG');
assert.ok(!ledVeg1Baseline.products.some(product => product.productId === 'calmag'), 'LED baseline EC 0.4 has no default CalMag row');

const ledVeg1Ro = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.RO,
  backgroundEc: 0,
  usesLed: true,
});
assert.equal(ledVeg1Ro.profileId, 'TERRA_LED_2024');
assert.equal(getDryRunDose(ledVeg1Ro, 'samurai-terra-grow')?.baselineMlPerL, 1.5);
assert.equal(getDryRunDose(ledVeg1Ro, 'samurai-terra-grow')?.resolvedMlPerL, 1.8, 'RO applies +20% only to Terra base');
assert.equal(getDryRunDose(ledVeg1Ro, 'katana-roots')?.resolvedMlPerL, 0.2, 'additive is not multiplied by Terra water rule');
assert.equal(getDryRunDose(ledVeg1Ro, 'calmag')?.resolvedMlPerL, 1);
assert.equal(ledVeg1Ro.autoExecutionAllowed, false);

const ledBloom4 = buildDryRunNutritionPlan({
  stage: GrowthStage.BLOOM,
  week: 4,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  usesLed: true,
});
assert.equal(getDryRunDose(ledBloom4, 'samurai-terra-bloom')?.resolvedMlPerL, 2.5);
assert.equal(getDryRunDose(ledBloom4, 'pk-warrior')?.resolvedMlPerL, 1);
assert.ok(ledBloom4.conflicts.some(conflict => conflict.code === 'PK_BASE_PROVENANCE' && conflict.severity === 'INFO'));
assert.ok(!ledBloom4.conflicts.some(conflict => conflict.code === 'GROW_BLOOM_TOGETHER'));

const unknownLed = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  usesLed: true,
});
assert.ok(unknownLed.warnings.some(warning => warning.code === 'INPUT_DATA_MISSING'));
assert.equal(getDryRunDose(unknownLed, 'samurai-terra-grow')?.resolvedMlPerL, 1.5, 'unknown water does not invent a percentage');

const impossibleMix = resolveNutritionConflicts({
  profile: TERRA_LED_2024_PROFILE,
  stage: GrowthStage.BLOOM,
  week: 4,
  productIds: ['samurai-terra-grow', 'samurai-terra-bloom'],
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
});
assert.ok(impossibleMix.blockers.some(blocker => blocker.code === 'GROW_BLOOM_TOGETHER'));
assert.equal(impossibleMix.autoPlanAllowed, false);

console.log('nutrition smoke: PASS');
