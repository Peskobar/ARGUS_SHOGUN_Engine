import assert from 'node:assert/strict';
import { GrowthStage, WaterType } from '../src/types';
import { buildWeeklyNutritionPlan, compareScenario, evaluateProductDecision } from '../src/nutritionTechnician';
import { buildDryRunNutritionPlan, getDryRunDose } from '../src/dryRunNutritionPlan';
import { buildNutritionExecutionHandoff } from '../src/nutritionExecutionBridge';
import {
  MANUFACTURER_SOURCE_REGISTRY,
  TERRA_LED_2024_PROFILE,
  ledCalMagDoseMlPerL,
  profileCanDriveWeeklyPlan,
  resolveLedTerraWaterAdjustment,
  resolveManufacturerProfile,
} from '../src/manufacturerProfiles';
import { resolveNutritionConflicts } from '../src/nutritionConflictResolver';
import { WORK_AUDIT_VERDICT } from '../src/nutritionAuditLock';
import {
  APPLICATION_PROTOCOLS,
  PRODUCT_VERIFICATION,
  classifyShogunWaterFromMeasuredEc,
  getManufacturerScheduleSignals,
  pkBaseAdjustmentPolicy,
} from '../src/nutritionEvidencePolicy';

const hardVeg1 = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  backgroundEc: 0.53,
  medium: 'TERRA_SOIL_PERLITE',
});

const hardVegIds = hardVeg1.products.map(product => product.productId);
assert.ok(hardVegIds.includes('samurai-terra-grow'));
assert.ok(hardVegIds.includes('shogun-start'));
assert.ok(hardVegIds.includes('katana-roots'));
assert.ok(hardVegIds.includes('zenzym'));
assert.ok(hardVegIds.includes('silicon'));
assert.ok(hardVegIds.includes('calmag'));
assert.ok(!hardVegIds.includes('pk-warrior'));
assert.ok(!hardVegIds.includes('samurai-terra-bloom'));
assert.equal(hardVeg1.manufacturerProfileId, 'TERRA_LEGACY_HARD_SOFT');

const hardGrow = hardVeg1.products.find(product => product.productId === 'samurai-terra-grow')!;
assert.deepEqual(hardGrow.doseWindows.map(window => [window.minMlPerL, window.maxMlPerL]), [[1, 2]]);
assert.equal(hardGrow.confidence, 'MEDIUM');
assert.equal(hardVeg1.manufacturerWaterClass, WaterType.HARD);

const customVeg1 = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  medium: 'TERRA_SOIL_PERLITE',
});
const customGrow = customVeg1.products.find(product => product.productId === 'samurai-terra-grow')!;
assert.equal(customGrow.doseWindows.length, 2);
assert.equal(customGrow.confidence, 'MEDIUM');

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

assert.equal(classifyShogunWaterFromMeasuredEc(0.53), WaterType.HARD);
assert.equal(classifyShogunWaterFromMeasuredEc(0.2), WaterType.SOFT);
assert.equal(classifyShogunWaterFromMeasuredEc(0.4), 'BOUNDARY');
assert.deepEqual(getManufacturerScheduleSignals({ leafTemperatureC: 27, relativeHumidity: 45 }), ['LIGHT']);
assert.deepEqual(getManufacturerScheduleSignals({ leafTemperatureC: 24, relativeHumidity: 60 }), ['STANDARD']);
assert.deepEqual(getManufacturerScheduleSignals({ usesLed: true }), ['HEAVY']);
assert.equal(PRODUCT_VERIFICATION['samurai-terra-grow'].compositionStatus, 'PARTIAL');
assert.equal(PRODUCT_VERIFICATION['shogun-start'].doseStatus, 'CONFLICT');
assert.ok(APPLICATION_PROTOCOLS.some(protocol => protocol.productId === 'katana-roots' && protocol.method === 'SOAK' && protocol.durationMinutes === 15));
assert.equal(pkBaseAdjustmentPolicy('INTEGRATED_FEEDCHART').requiresExplicitAdjustment, false);
assert.equal(pkBaseAdjustmentPolicy('STANDALONE_PRODUCT_RATE').requiresExplicitAdjustment, true);

// Manufacturer profile is usable for evidence preview but not release authority.
assert.equal(resolveManufacturerProfile('AUTO', true).id, 'TERRA_LED_2024');
assert.equal(resolveManufacturerProfile('AUTO', false).id, 'TERRA_LEGACY_HARD_SOFT');
assert.ok(MANUFACTURER_SOURCE_REGISTRY.some(source => source.id === 'shogun-led-terra-2024' && source.auditStatus === 'PARTIAL'));
assert.equal(TERRA_LED_2024_PROFILE.snapshotFrozen, false);
assert.equal(TERRA_LED_2024_PROFILE.releaseEligible, false);
assert.equal(profileCanDriveWeeklyPlan(TERRA_LED_2024_PROFILE), false);
assert.equal(resolveLedTerraWaterAdjustment(0).percent, 20);
assert.equal(resolveLedTerraWaterAdjustment(0.2).percent, 10);
assert.equal(resolveLedTerraWaterAdjustment(0.4).percent, 0);
assert.equal(resolveLedTerraWaterAdjustment(0.6).percent, -10);
assert.equal(resolveLedTerraWaterAdjustment(0.53).status, 'UNRESOLVED_BETWEEN_ANCHORS');
assert.equal(resolveLedTerraWaterAdjustment(undefined, WaterType.RO).percent, 0, 'water label cannot create a numeric modifier');
assert.equal(ledCalMagDoseMlPerL(0.2, WaterType.SOFT).dose, null, 'Work audit blocks automatic CalMag from EC alone');
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
assert.ok(!ledVeg1Baseline.products.some(product => product.productId === 'shogun-start'));
assert.ok(!ledVeg1Baseline.products.some(product => product.productId === 'calmag'));

const ledVeg1Ro = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.RO,
  backgroundEc: 0,
  usesLed: true,
});
assert.equal(ledVeg1Ro.profileId, 'TERRA_LED_2024');
assert.equal(getDryRunDose(ledVeg1Ro, 'samurai-terra-grow')?.baselineMlPerL, 1.5);
assert.equal(getDryRunDose(ledVeg1Ro, 'samurai-terra-grow')?.resolvedMlPerL, 1.8);
assert.equal(getDryRunDose(ledVeg1Ro, 'katana-roots')?.resolvedMlPerL, 0.2);
assert.equal(getDryRunDose(ledVeg1Ro, 'calmag'), undefined, 'CalMag remains NEEDS_USER_DATA');
assert.equal(ledVeg1Ro.weeklyPlanVerdict, 'HOLD');
assert.equal(ledVeg1Ro.readyForExecutionCandidate, false);
assert.equal(ledVeg1Ro.autoExecutionAllowed, false);
assert.ok(ledVeg1Ro.abstentionReasons.some(reason => reason.code === 'MANUFACTURER_SNAPSHOT_UNFROZEN'));

const ledBloom4 = buildDryRunNutritionPlan({
  stage: GrowthStage.BLOOM,
  week: 4,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  usesLed: true,
});
assert.equal(getDryRunDose(ledBloom4, 'samurai-terra-bloom')?.resolvedMlPerL, 2.5);
assert.equal(getDryRunDose(ledBloom4, 'pk-warrior')?.resolvedMlPerL, 1);
assert.ok(ledBloom4.conflicts.some(conflict => conflict.code === 'PK_BASE_PROVENANCE' && conflict.severity === 'WARN'));
assert.ok(ledBloom4.blockers.some(conflict => conflict.code === 'PROFILE_SNAPSHOT_UNFROZEN'));

const unknownLed = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  usesLed: true,
});
assert.ok(unknownLed.warnings.some(warning => warning.code === 'INPUT_DATA_MISSING'));
assert.equal(getDryRunDose(unknownLed, 'samurai-terra-grow')?.resolvedMlPerL, 1.5);

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

const pendingHandoff = buildNutritionExecutionHandoff(ledBloom4, {
  independentAgronomicAudit: 'PASS',
  securityReview: 'PENDING',
  sourceReconciliation: 'PENDING',
  humanApproval: false,
});
assert.equal(pendingHandoff.status, 'HOLD');
assert.equal(pendingHandoff.automaticPlannerDispatchAllowed, false);
assert.equal(pendingHandoff.automaticExecutionVerdict, 'NO_GO');
assert.ok(pendingHandoff.blockers.some(blocker => blocker.includes('SECURITY_REVIEW_PENDING')));

const allPassedStillHeld = buildNutritionExecutionHandoff(ledBloom4, {
  independentAgronomicAudit: 'PASS',
  securityReview: 'PASS',
  sourceReconciliation: 'PASS',
  humanApproval: true,
});
assert.equal(allPassedStillHeld.status, 'HOLD', 'Work audit and unfrozen weekly profile keep Nutrition-generated execution held');
assert.equal(allPassedStillHeld.automaticPlannerDispatchAllowed, false);
assert.equal(WORK_AUDIT_VERDICT.whyLessMoreOmit, 'GO_WITH_CONDITIONS');
assert.equal(WORK_AUDIT_VERDICT.weeklyPlan, 'HOLD');
assert.equal(WORK_AUDIT_VERDICT.automaticDoseSelection, 'HOLD');
assert.equal(WORK_AUDIT_VERDICT.automaticExecution, 'NO_GO');

console.log('nutrition smoke: PASS');
