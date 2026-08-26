import { DryRunNutritionPlan } from './dryRunNutritionPlan';
import { EXECUTION_HAZARD_LOCKS, WORK_AUDIT_VERDICT } from './nutritionAuditLock';

export type ReleaseGateStatus = 'PENDING' | 'PASS' | 'FAIL';
export type NutritionExecutionStatus = 'HOLD' | 'READY_FOR_HUMAN_APPROVAL';

export interface NutritionReleaseGates {
  independentAgronomicAudit: ReleaseGateStatus;
  securityReview: ReleaseGateStatus;
  sourceReconciliation: ReleaseGateStatus;
  humanApproval: boolean;
}

export interface NutritionExecutionDose {
  productId: string;
  mlPerL: number;
  sourceId: string;
}

export interface NutritionExecutionHandoff {
  status: NutritionExecutionStatus;
  profileId: string;
  stage: string;
  week: number;
  doses: NutritionExecutionDose[];
  blockers: string[];
  warnings: string[];
  hazardLocks: typeof EXECUTION_HAZARD_LOCKS;
  releaseGates: NutritionReleaseGates;
  automaticExecutionVerdict: 'NO_GO';
  /**
   * Hard false by architecture. Nutrition Technician may eventually prepare a
   * human-reviewed Planner candidate, but it does not auto-dispatch physical work.
   */
  automaticPlannerDispatchAllowed: false;
}

/**
 * Converts a dry-run into a non-mutating handoff candidate. The independent Work
 * audit keeps weekly plan HOLD and automatic execution NO-GO. Existing Planner 2.2
 * remains a separate human-operated execution workflow.
 */
export function buildNutritionExecutionHandoff(
  plan: DryRunNutritionPlan,
  gates: NutritionReleaseGates,
): NutritionExecutionHandoff {
  const blockers: string[] = plan.blockers.map(finding => `${finding.code}: ${finding.action}`);
  const warnings: string[] = plan.warnings.map(finding => `${finding.code}: ${finding.action}`);

  if (!plan.readyForExecutionCandidate) blockers.push('DRY_RUN_NOT_READY: independent audit keeps weekly prescription HOLD.');
  for (const reason of plan.abstentionReasons) blockers.push(`ABSTAIN_${reason.code}: ${reason.message}`);
  if (gates.independentAgronomicAudit !== 'PASS') blockers.push(`AGRONOMIC_AUDIT_${gates.independentAgronomicAudit}`);
  if (gates.securityReview !== 'PASS') blockers.push(`SECURITY_REVIEW_${gates.securityReview}`);
  if (gates.sourceReconciliation !== 'PASS') blockers.push(`SOURCE_RECONCILIATION_${gates.sourceReconciliation}`);
  if (!gates.humanApproval) blockers.push('HUMAN_APPROVAL_REQUIRED');
  blockers.push(`AUTOMATIC_EXECUTION_${WORK_AUDIT_VERDICT.automaticExecution}`);

  const status: NutritionExecutionStatus = blockers.length === 0
    ? 'READY_FOR_HUMAN_APPROVAL'
    : 'HOLD';

  return {
    status,
    profileId: plan.profileId,
    stage: plan.stage,
    week: plan.week,
    doses: plan.doses.map(dose => ({
      productId: dose.productId,
      mlPerL: dose.resolvedMlPerL,
      sourceId: dose.sourceId,
    })),
    blockers,
    warnings,
    hazardLocks: EXECUTION_HAZARD_LOCKS,
    releaseGates: gates,
    automaticExecutionVerdict: 'NO_GO',
    automaticPlannerDispatchAllowed: false,
  };
}
