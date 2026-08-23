import assert from 'node:assert/strict';
import { WaterType } from '../src/types';
import { CURRENT_TERRA_LED_RELEASE_SNAPSHOT, validateSnapshotForWeeklyPlan } from '../src/manufacturerSnapshot';
import { TERRA_LED_2024_PROFILE, TERRA_LEGACY_PROFILE, ledCalMagDoseMlPerL, profileCanDriveWeeklyPlan } from '../src/manufacturerProfiles';
import { EMMERICH_WATER_REFERENCE_2026 } from '../src/localWaterReference';
import { buildWaterChemistryState } from '../src/waterChemistry';
import { assessSymptoms } from '../src/nutritionSymptomEngine';
import {
  DEFAULT_CHANGE_CONTROL_POLICY,
  EXECUTION_HAZARD_LOCKS,
  WORK_AUDIT_BLOCKERS,
  WORK_AUDIT_VERDICT,
  assessDecisionReadiness,
  canApplyAdaptiveChange,
} from '../src/nutritionAuditLock';

assert.equal(WORK_AUDIT_VERDICT.whyLessMoreOmit, 'GO_WITH_CONDITIONS');
assert.equal(WORK_AUDIT_VERDICT.weeklyPlan, 'HOLD');
assert.equal(WORK_AUDIT_VERDICT.automaticDoseSelection, 'HOLD');
assert.equal(WORK_AUDIT_VERDICT.automaticExecution, 'NO_GO');
assert.equal(WORK_AUDIT_BLOCKERS.length, 15);

assert.equal(TERRA_LED_2024_PROFILE.auditStatus, 'PARTIAL');
assert.equal(TERRA_LED_2024_PROFILE.snapshotFrozen, false);
assert.equal(profileCanDriveWeeklyPlan(TERRA_LED_2024_PROFILE), false);
assert.equal(TERRA_LEGACY_PROFILE.auditStatus, 'OBSOLETE');
assert.equal(profileCanDriveWeeklyPlan(TERRA_LEGACY_PROFILE), false);
assert.equal(CURRENT_TERRA_LED_RELEASE_SNAPSHOT, null);
assert.equal(validateSnapshotForWeeklyPlan(CURRENT_TERRA_LED_RELEASE_SNAPSHOT).valid, false);

assert.equal(ledCalMagDoseMlPerL(0.2, WaterType.SOFT).dose, null);
assert.equal(ledCalMagDoseMlPerL(0, WaterType.RO).dose, null);

assert.equal(EMMERICH_WATER_REFERENCE_2026.backgroundEcMsCmApprox, 0.557);
assert.equal(EMMERICH_WATER_REFERENCE_2026.calciumMgL, 75.5);
assert.equal(EMMERICH_WATER_REFERENCE_2026.magnesiumMgL, 10.4);
assert.equal(EMMERICH_WATER_REFERENCE_2026.alkalinityMmolLToPh43, 3.11);
const water = buildWaterChemistryState({ backgroundEc: 0.56, pH: 7.4 });
assert.equal(water.backgroundEc?.source, 'USER_MEASUREMENT');
assert.equal(water.calciumMgL?.source, 'LOCAL_WATER_REFERENCE');
assert.equal(water.chemistryCompleteForAdaptiveCalMag, true, 'live EC + reference Ca/Mg/alkalinity is context-complete, but not proof of current ion concentrations');

const symptom = assessSymptoms({
  tags: ['INTERVEINAL_CHLOROSIS'],
  location: 'OLD_GROWTH',
  mediumEcHigh: true,
});
assert.equal(symptom.diagnosisAllowed, false);
assert.equal(symptom.automaticDoseChangeAllowed, false);
assert.ok(symptom.blockers.some(blocker => blocker.includes('CalMag')));
assert.ok(symptom.hypotheses.length > 0);

assert.equal(canApplyAdaptiveChange(DEFAULT_CHANGE_CONTROL_POLICY), false);
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
assert.ok(readiness.reasons.length >= 10);

assert.ok(EXECUTION_HAZARD_LOCKS.some(lock => lock.productId === 'pk-warrior' && lock.hazards.includes('H314')));
assert.ok(EXECUTION_HAZARD_LOCKS.every(lock => lock.requiresHumanHandling && !lock.automaticDispensingAllowed));

console.log('work audit smoke: PASS');
