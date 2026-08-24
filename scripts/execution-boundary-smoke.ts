import assert from 'node:assert/strict';
import { buildDryRunNutritionPlan } from '../src/dryRunNutritionPlan';
import { buildNutritionExecutionHandoff } from '../src/nutritionExecutionBridge';
import { GrowthStage, WaterType } from '../src/types';

const preview = buildDryRunNutritionPlan({
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
  usesLed: true,
});

assert.equal(preview.mode, 'DRY_RUN');
assert.equal(preview.weeklyPlanVerdict, 'HOLD');
assert.equal(preview.readyForExecutionCandidate, false);
assert.equal(preview.autoExecutionAllowed, false);

const noHuman = buildNutritionExecutionHandoff(preview, {
  independentAgronomicAudit: 'PASS',
  securityReview: 'PASS',
  sourceReconciliation: 'PASS',
  humanApproval: false,
});
assert.equal(noHuman.status, 'HOLD');
assert.equal(noHuman.automaticExecutionVerdict, 'NO_GO');
assert.equal(noHuman.automaticPlannerDispatchAllowed, false);
assert.ok(noHuman.blockers.includes('HUMAN_APPROVAL_REQUIRED'));

const failedSecurity = buildNutritionExecutionHandoff(preview, {
  independentAgronomicAudit: 'PASS',
  securityReview: 'FAIL',
  sourceReconciliation: 'PASS',
  humanApproval: true,
});
assert.equal(failedSecurity.status, 'HOLD');
assert.ok(failedSecurity.blockers.includes('SECURITY_REVIEW_FAIL'));
assert.equal(failedSecurity.automaticPlannerDispatchAllowed, false);

const everyExternalGatePasses = buildNutritionExecutionHandoff(preview, {
  independentAgronomicAudit: 'PASS',
  securityReview: 'PASS',
  sourceReconciliation: 'PASS',
  humanApproval: true,
});
assert.equal(
  everyExternalGatePasses.status,
  'HOLD',
  'external PASS gates must not promote a DRY_RUN while weekly prescription authority remains HOLD',
);
assert.ok(everyExternalGatePasses.blockers.some(blocker => blocker.startsWith('DRY_RUN_NOT_READY')));
assert.ok(everyExternalGatePasses.blockers.includes('AUTOMATIC_EXECUTION_NO_GO'));
assert.equal(everyExternalGatePasses.automaticPlannerDispatchAllowed, false);

console.log('execution boundary smoke: PASS');
