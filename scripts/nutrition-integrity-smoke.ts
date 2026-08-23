import assert from 'node:assert/strict';
import { GrowthStage, WaterType } from '../src/types';
import { buildDryRunNutritionPlan, getDryRunDose } from '../src/dryRunNutritionPlan';
import { buildNutritionExecutionHandoff } from '../src/nutritionExecutionBridge';
import { buildObservedNutritionState } from '../src/observedNutritionState';
import { buildWaterChemistryState, hasLiveBackgroundEc } from '../src/waterChemistry';
import { resolveLedTerraWaterAdjustment } from '../src/manufacturerProfiles';

// A water label is not a substitute for measured background EC.
assert.equal(resolveLedTerraWaterAdjustment(undefined, WaterType.HARD).percent, 0);
assert.equal(resolveLedTerraWaterAdjustment(undefined, WaterType.SOFT).percent, 0);
assert.equal(resolveLedTerraWaterAdjustment(undefined, WaterType.RO).percent, 0);
assert.equal(resolveLedTerraWaterAdjustment(undefined, WaterType.HARD).status, 'UNRESOLVED_BETWEEN_ANCHORS');

const hardWithoutEc = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  usesLed: true,
});
assert.equal(getDryRunDose(hardWithoutEc, 'samurai-terra-grow')?.baselineMlPerL, 1.5);
assert.equal(getDryRunDose(hardWithoutEc, 'samurai-terra-grow')?.resolvedMlPerL, 1.5, 'HARD label alone must not apply the −10% EC 0.6+ rule');

const measuredHard = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  backgroundEc: 0.6,
  usesLed: true,
});
assert.equal(getDryRunDose(measuredHard, 'samurai-terra-grow')?.resolvedMlPerL, 1.35, 'measured EC 0.6 activates the manufacturer −10% rule');

// Municipal reference can fill context but must remain visibly non-live.
const referenceWater = buildWaterChemistryState({});
assert.equal(referenceWater.backgroundEc?.source, 'LOCAL_WATER_REFERENCE');
assert.equal(hasLiveBackgroundEc(referenceWater), false);

const measuredWater = buildWaterChemistryState({ backgroundEc: 0.42, pH: 7.1 });
assert.equal(measuredWater.backgroundEc?.source, 'USER_MEASUREMENT');
assert.equal(measuredWater.backgroundEc?.value, 0.42);
assert.equal(measuredWater.pH?.source, 'USER_MEASUREMENT');
assert.equal(measuredWater.calciumMgL?.source, 'LOCAL_WATER_REFERENCE', 'field-level provenance allows reference Ca while preserving live EC priority');
assert.equal(hasLiveBackgroundEc(measuredWater), true);

// Input/runoff/root-zone EC are distinct observations. Delta is descriptive only.
const observed = buildObservedNutritionState({
  measuredPh: 6.3,
  preparedInputEc: 1.4,
  runoffEc: 1.9,
  rootZoneEc: 2.1,
  perlitePct: 30,
  potVolumeL: 20,
  irrigationVolumeL: 4,
});
assert.equal(observed.runoffMinusInputEc, 0.5);
assert.ok(observed.notes.some(note => note.includes('not an ion-specific analysis')));
assert.ok(observed.notes.some(note => note.includes('descriptive feedback only')));

const malformedObserved = buildObservedNutritionState({
  measuredPh: Number.NaN,
  preparedInputEc: Number.POSITIVE_INFINITY,
  runoffEc: -1,
  substrateMoisturePct: 150,
});
assert.equal(malformedObserved.measuredPh, undefined);
assert.equal(malformedObserved.preparedInputEc, undefined);
assert.equal(malformedObserved.runoffEc, undefined);
assert.equal(malformedObserved.substrateMoisturePct, undefined);

// Even a clean dry-run cannot auto-dispatch while independent gates are not released.
const cleanCandidate = buildDryRunNutritionPlan({
  stage: GrowthStage.BLOOM,
  week: 2,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  usesLed: true,
});
const pending = buildNutritionExecutionHandoff(cleanCandidate, {
  independentAgronomicAudit: 'PENDING',
  securityReview: 'PENDING',
  sourceReconciliation: 'PENDING',
  humanApproval: false,
});
assert.equal(pending.status, 'HOLD');
assert.equal(pending.automaticPlannerDispatchAllowed, false);

const allPassed = buildNutritionExecutionHandoff(cleanCandidate, {
  independentAgronomicAudit: 'PASS',
  securityReview: 'PASS',
  sourceReconciliation: 'PASS',
  humanApproval: true,
});
assert.equal(allPassed.status, 'READY_FOR_HUMAN_APPROVAL');
assert.equal(allPassed.automaticPlannerDispatchAllowed, false, 'v1 requires a future reviewed code change to enable automatic Planner dispatch');

console.log('nutrition integrity smoke: PASS');
