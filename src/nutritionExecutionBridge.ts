import { DryRunNutritionPlan } from './dryRunNutritionPlan';

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
  releaseGates: NutritionReleaseGates;
  /**
   * Intentionally false in v1. Planner 2.2 must not accept automatic execution
   * until a later reviewed change explicitly enables the bridge after all gates pass.
   */
  automaticPlannerDispatchAllowed: false;
}

/**
 * Converts a dry-run plan into a typed handoff candidate. This is deliberately a
 * one-way boundary object, not a Planner mutation. It cannot deduct inventory,
 * write history or start physical execution.
 */
export function buildNutritionExecutionHandoff(
  plan: DryRunNutritionPlan,
  gates: NutritionReleaseGates,
): NutritionExecutionHandoff {
  const blockers: string[] = plan.blockers.map(finding => `${finding.code}: ${finding.action}`);
  const warnings: string[] = plan.warnings.map(finding => `${finding.code}: ${finding.action}`);

  if (!plan.readyForExecutionCandidate) blockers.push('DRY_RUN_NOT_READY: manufacturer profile or conflict gate is not ready.');
  if (gates.independentAgronomicAudit !== 'PASS') blockers.push(`AGRONOMIC_AUDIT_${gates.independentAgronomicAudit}`);
  if (gates.securityReview !== 'PASS') blockers.push(`SECURITY_REVIEW_${gates.securityReview}`);
  if (gates.sourceReconciliation !== 'PASS') blockers.push(`SOURCE_RECONCILIATION_${gates.sourceReconciliation}`);
  if (!gates.humanApproval) blockers.push('HUMAN_APPROVAL_REQUIRED');

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
    releaseGates: gates,
    automaticPlannerDispatchAllowed: false,
  };
}
