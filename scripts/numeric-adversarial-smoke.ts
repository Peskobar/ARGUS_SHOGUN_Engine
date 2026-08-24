import assert from 'node:assert/strict';
import { buildDryRunNutritionPlan, getDryRunDose } from '../src/dryRunNutritionPlan';
import { buildWeeklyNutritionPlan } from '../src/nutritionTechnician';
import { buildObservedNutritionState } from '../src/observedNutritionState';
import { buildWaterChemistryState } from '../src/waterChemistry';
import { classifyShogunWaterFromMeasuredEc, getManufacturerScheduleSignals } from '../src/nutritionEvidencePolicy';
import { resolveLedTerraWaterAdjustment } from '../src/manufacturerProfiles';
import { GrowthStage, WaterType } from '../src/types';

const invalidSourceEcValues = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  -0.01,
  20.01,
];

for (const value of invalidSourceEcValues) {
  assert.equal(classifyShogunWaterFromMeasuredEc(value), null, `invalid source EC ${String(value)} must not be classified`);
  const adjustment = resolveLedTerraWaterAdjustment(value, WaterType.HARD);
  assert.equal(adjustment.percent, 0, `invalid source EC ${String(value)} must not modify base dose`);
  assert.equal(adjustment.multiplier, 1);
  assert.equal(adjustment.status, 'UNRESOLVED_BETWEEN_ANCHORS');

  const dryRun = buildDryRunNutritionPlan({
    stage: GrowthStage.VEG,
    week: 1,
    waterType: WaterType.HARD,
    backgroundEc: value,
    usesLed: true,
  });
  assert.equal(getDryRunDose(dryRun, 'samurai-terra-grow')?.resolvedMlPerL, 1.5);
  assert.ok(
    dryRun.abstentionReasons.some(reason => reason.code === 'WATER_CHEMISTRY_INCOMPLETE'),
    `invalid source EC ${String(value)} must be treated as missing live chemistry in DryRun`,
  );
}

// EC=0 is a valid measurement and must not be confused with missing/falsy input.
assert.equal(classifyShogunWaterFromMeasuredEc(0), WaterType.SOFT);
assert.equal(resolveLedTerraWaterAdjustment(0, WaterType.RO).percent, 20);

// Technik Żywienia itself is a runtime boundary; callers can bypass HTML input constraints.
for (const value of invalidSourceEcValues) {
  const plan = buildWeeklyNutritionPlan({
    stage: GrowthStage.VEG,
    week: 1,
    waterType: WaterType.HARD,
    backgroundEc: value,
    medium: 'TERRA_SOIL_PERLITE',
    environment: { usesLed: true },
    scheduleProfileResolved: false,
  });
  assert.equal(plan.backgroundEc, undefined);
  assert.equal(plan.waterStatus, 'UNKNOWN');
  assert.equal(plan.manufacturerWaterClass, null);
  assert.equal(plan.waterAdjustment?.percent, 0);
}

const zeroEcPlan = buildWeeklyNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.RO,
  backgroundEc: 0,
  medium: 'TERRA_SOIL_PERLITE',
  environment: { usesLed: true },
  scheduleProfileResolved: false,
});
assert.equal(zeroEcPlan.backgroundEc, 0);
assert.equal(zeroEcPlan.waterStatus, 'MEASURED');
assert.equal(zeroEcPlan.waterAdjustment?.percent, 20);

// Invalid environmental numerics must not fabricate LIGHT/STANDARD signals.
assert.deepEqual(
  getManufacturerScheduleSignals({
    leafTemperatureC: Number.POSITIVE_INFINITY,
    relativeHumidity: 40,
    usesLed: false,
  }),
  ['UNRESOLVED'],
);
assert.deepEqual(
  getManufacturerScheduleSignals({
    leafTemperatureC: 24,
    relativeHumidity: -1,
    usesLed: false,
  }),
  ['UNRESOLVED'],
);
assert.deepEqual(
  getManufacturerScheduleSignals({
    leafTemperatureC: Number.NaN,
    relativeHumidity: 60,
    usesLed: true,
  }),
  ['HEAVY'],
  'LED signal may remain valid independently, while invalid numeric environment must not create Light/Standard',
);

const water = buildWaterChemistryState({
  backgroundEc: Number.POSITIVE_INFINITY,
  pH: Number.NaN,
  calciumMgL: -1,
  magnesiumMgL: Number.POSITIVE_INFINITY,
});
assert.notEqual(water.backgroundEc?.source, 'USER_MEASUREMENT');
assert.notEqual(water.pH?.source, 'USER_MEASUREMENT');
assert.notEqual(water.calciumMgL?.source, 'USER_MEASUREMENT');
assert.notEqual(water.magnesiumMgL?.source, 'USER_MEASUREMENT');
assert.equal(water.chemistryCompleteForAdaptiveCalMag, false);

const observed = buildObservedNutritionState({
  measuredPh: Number.NaN,
  sourceEc: Number.POSITIVE_INFINITY,
  preparedInputEc: Number.NEGATIVE_INFINITY,
  runoffEc: -1,
  substrateEc: Number.NaN,
  substrateMoisturePct: 101,
});
assert.equal(observed.measuredPh, undefined);
assert.equal(observed.sourceEc, undefined);
assert.equal(observed.preparedInputEc, undefined);
assert.equal(observed.runoffEc, undefined);
assert.equal(observed.substrateEc, undefined);
assert.equal(observed.substrateMoisturePct, undefined);

console.log('numeric adversarial smoke: PASS');
