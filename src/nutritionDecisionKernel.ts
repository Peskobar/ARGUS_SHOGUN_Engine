import { ManufacturerProfile } from './manufacturerProfiles';
import { MediumIdentityState } from './mediumState';
import { WaterChemistryState } from './waterChemistry';
import { ObservedNutritionState } from './observedNutritionState';
import { IrrigationObservationEvent, TrendPolicy, assessRepeatableTrend } from './nutritionObservationHistory';
import { DecisionReadiness, assessDecisionReadiness, canApplyAdaptiveChange, ChangeControlPolicy } from './nutritionAuditLock';

export interface NutritionObjectiveAndRisk {
  objective: 'STABILITY' | 'QUALITY' | 'YIELD' | 'RECOVERY' | 'UNKNOWN';
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSET';
}

export interface DecisionKernelInput {
  profile: ManufacturerProfile;
  manufacturerConflictFree: boolean;
  water: WaterChemistryState;
  medium: MediumIdentityState;
  observed: ObservedNutritionState;
  history: IrrigationObservationEvent[];
  trendPolicy: TrendPolicy;
  changeControl: ChangeControlPolicy;
  physiologicalLockoutExcluded: boolean;
  finalInputEcConfirmed: boolean;
  finalPhConfirmed: boolean;
  securityGatePassed: boolean;
  humanApproved: boolean;
  objectiveAndRisk: NutritionObjectiveAndRisk;
}

export interface DecisionKernelResult {
  disposition: DecisionReadiness['disposition'];
  readiness: DecisionReadiness;
  architectureLayers: string[];
  warnings: string[];
}

/**
 * Final orchestration boundary from the independent audit. This kernel does not
 * calculate ml/L. It decides whether the evidence envelope is sufficient to let
 * a separate, source-authorised dose engine proceed, otherwise it ABSTAINS.
 */
export function evaluateNutritionDecisionKernel(input: DecisionKernelInput): DecisionKernelResult {
  const trend = assessRepeatableTrend(input.history, input.trendPolicy);
  const measurementMethodKnown = input.observed.rootZoneUsableForDecision || input.observed.substrateEcMethod !== 'UNKNOWN';
  const changeControlDefined = canApplyAdaptiveChange(input.changeControl);
  const readiness = assessDecisionReadiness({
    manufacturerSnapshotFrozen: input.profile.snapshotFrozen && input.profile.releaseEligible,
    manufacturerConflictFree: input.manufacturerConflictFree,
    waterChemistryComplete: input.water.chemistryCompleteForAdaptiveCalMag,
    mediumIdentityComplete: input.medium.identityComplete,
    measurementMethodKnown,
    measurementQualityKnown: input.observed.measurementQualityKnown,
    repeatableTrendAvailable: trend.trendReady,
    changeControlDefined,
    physiologicalLockoutExcluded: input.physiologicalLockoutExcluded,
    finalInputEcConfirmed: input.finalInputEcConfirmed,
    finalPhConfirmed: input.finalPhConfirmed,
    securityGatePassed: input.securityGatePassed,
    humanApproved: input.humanApproved,
  });

  const warnings = [...input.water.notes, ...input.medium.notes, ...input.observed.notes, ...trend.reasons];
  if (input.objectiveAndRisk.objective === 'UNKNOWN' || input.objectiveAndRisk.riskTolerance === 'UNSET') {
    warnings.push('Objective/risk limits are not fully defined; adaptive optimisation must not silently assume yield-maximisation.');
  }

  return {
    disposition: readiness.disposition,
    readiness,
    architectureLayers: [
      'SOURCE_IDENTITY',
      'VERSIONED_MANUFACTURER_PROFILE',
      'WATER_CHEMISTRY',
      'SUBSTRATE_IDENTITY_PHYSICS_STATE',
      'ENVIRONMENT_AND_PLANT_STATE',
      'INPUT_RUNOFF_ROOT_ZONE_HISTORY',
      'MEASUREMENT_QUALITY',
      'OBJECTIVE_AND_RISK_LIMITS',
      'UNCERTAINTY_AND_CONFLICT_POLICY',
      'DECISION_OR_ABSTAIN',
    ],
    warnings,
  };
}
