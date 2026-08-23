import assert from 'node:assert/strict';
import { GrowthStage, WaterType } from '../src/types';
import { buildDryRunNutritionPlan, getDryRunDose } from '../src/dryRunNutritionPlan';
import { buildNutritionExecutionHandoff } from '../src/nutritionExecutionBridge';
import { buildObservedNutritionState } from '../src/observedNutritionState';
import { buildWaterChemistryState, hasLiveBackgroundEc } from '../src/waterChemistry';
import { resolveLedTerraWaterAdjustment } from '../src/manufacturerProfiles';
import {
  DEFAULT_CHANGE_CONTROL_POLICY,
  EXECUTION_HAZARD_LOCKS,
  allowedLifecycleTransition,
  assessDecisionReadiness,
  canApplyAdaptiveChange,
} from '../src/nutritionAuditLock';

// A water label is not a live SOURCE_EC measurement.
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
assert.equal(getDryRunDose(hardWithoutEc, 'samurai-terra-grow')?.resolvedMlPerL, 1.5);
assert.equal(hardWithoutEc.readyForExecutionCandidate, false);

const measuredHard = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.HARD,
  backgroundEc: 0.6,
  usesLed: true,
});
assert.equal(getDryRunDose(measuredHard, 'samurai-terra-grow')?.resolvedMlPerL, 1.35, 'preview source anchor may be displayed but weekly authority remains HOLD');
assert.equal(measuredHard.weeklyPlanVerdict, 'HOLD');

// 2026 municipal reference can fill context but stays visibly non-live.
const referenceWater = buildWaterChemistryState({});
assert.equal(referenceWater.backgroundEc?.source, 'LOCAL_WATER_REFERENCE');
assert.equal(referenceWater.backgroundEc?.value, 0.557);
assert.equal(referenceWater.calciumMgL?.value, 75.5);
assert.equal(referenceWater.magnesiumMgL?.value, 10.4);
assert.equal(referenceWater.alkalinityMmolLToPh43?.value, 3.11);
assert.equal(hasLiveBackgroundEc(referenceWater), false);
assert.equal(referenceWater.chemistryCompleteForAdaptiveCalMag, false);

const measuredWater = buildWaterChemistryState({ backgroundEc: 0.42, pH: 7.1 });
assert.equal(measuredWater.backgroundEc?.source, 'USER_MEASUREMENT');
assert.equal(measuredWater.backgroundEc?.value, 0.42);
assert.equal(measuredWater.pH?.source, 'USER_MEASUREMENT');
assert.equal(measuredWater.calciumMgL?.source, 'LOCAL_WATER_REFERENCE');
assert.equal(hasLiveBackgroundEc(measuredWater), true);

// EC ontology and measurement-quality envelope.
const observed = buildObservedNutritionState({
  measuredPh: 6.3,
  sourceEc: 0.55,
  preparedInputEc: 1.4,
  runoffEc: 1.9,
  substrateEc: 2.1,
  substrateEcMethod: 'POUR_THROUGH',
  perlitePct: 30,
  potVolumeL: 20,
  irrigationVolumeL: 4,
  runoffVolumeL: 0.8,
  runoffFractionPct: 20,
  drybackPct: 15,
  irrigationEventId: 'evt-001',
  measurementQuality: {
    meterModel: 'test-meter',
    calibrationDate: '2026-08-23',
    calibrationSolution: 'known-standard',
    temperatureCompensationKnown: true,
    sampleTimestamp: '2026-08-23T18:00:00+02:00',
    samplingProtocol: 'repeatable-test-protocol',
  },
});
assert.equal(observed.runoffMinusInputEc, 0.5);
assert.equal(observed.rootZoneUsableForDecision, true);
assert.equal(observed.measurementQualityKnown, true);
assert.ok(observed.notes.some(note => note.includes('not an ion-specific analysis')));
assert.ok(observed.notes.some(note => note.includes('descriptive feedback only')));

const legacyRootZone = buildObservedNutritionState({ rootZoneEc: 2.2 });
assert.equal(legacyRootZone.legacyRootZoneEc, 2.2);
assert.equal(legacyRootZone.rootZoneUsableForDecision, false);
assert.ok(legacyRootZone.notes.some(note => note.includes('excluded from adaptive decisions')));

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

// Explicit ABSTAIN and no invented change-control thresholds.
const readiness = assessDecisionReadiness({
  manufacturerSnapshotFrozen: false,
  manufacturerConflictFree: false,
  waterChemistryComplete: false,
  mediumIdentityComplete: false,
  measurementMethodKnown: false,
  measurementQualityKnown: false,
  repeatableTrendAvailable: false,
  changeControlDefined: false,
  physiologicalLockoutExcluded: false,
  finalInputEcConfirmed: false,
  finalPhConfirmed: false,
  securityGatePassed: false,
  humanApproved: false,
});
assert.equal(readiness.disposition, 'ABSTAIN');
assert.ok(readiness.reasons.some(reason => reason.code === 'MANUFACTURER_SNAPSHOT_UNFROZEN'));
assert.ok(readiness.reasons.some(reason => reason.code === 'FINAL_SOLUTION_CONFIRMATION_MISSING'));
assert.equal(canApplyAdaptiveChange(DEFAULT_CHANGE_CONTROL_POLICY), false, 'audit demands max delta/window but does not supply numeric values, so ARGUS must not invent them');

// Lifecycle is controlled, not an arbitrary state jump.
assert.equal(allowedLifecycleTransition('READY', 'PROPOSED'), true);
assert.equal(allowedLifecycleTransition('PROPOSED', 'APPLIED'), true);
assert.equal(allowedLifecycleTransition('APPLIED', 'OBSERVE'), true);
assert.equal(allowedLifecycleTransition('OBSERVE', 'CONFIRMED'), true);
assert.equal(allowedLifecycleTransition('READY', 'CONFIRMED'), false);
assert.equal(allowedLifecycleTransition('OBSERVE', 'ROLLBACK'), true);

// SDS safety layer remains human-operated.
assert.ok(EXECUTION_HAZARD_LOCKS.some(lock => lock.productId === 'pk-warrior' && lock.hazards.includes('H314')));
assert.ok(EXECUTION_HAZARD_LOCKS.every(lock => lock.automaticDispensingAllowed === false));

const cleanLookingPreview = buildDryRunNutritionPlan({
  stage: GrowthStage.BLOOM,
  week: 2,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  usesLed: true,
});
const allPassedStillHeld = buildNutritionExecutionHandoff(cleanLookingPreview, {
  independentAgronomicAudit: 'PASS',
  securityReview: 'PASS',
  sourceReconciliation: 'PASS',
  humanApproval: true,
});
assert.equal(allPassedStillHeld.status, 'HOLD');
assert.equal(allPassedStillHeld.automaticExecutionVerdict, 'NO_GO');
assert.equal(allPassedStillHeld.automaticPlannerDispatchAllowed, false);
assert.ok(allPassedStillHeld.blockers.some(blocker => blocker.includes('AUTOMATIC_EXECUTION_NO_GO')));

console.log('nutrition integrity smoke: PASS');
