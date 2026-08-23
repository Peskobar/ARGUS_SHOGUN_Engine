export type AuditFeatureVerdict = 'GO' | 'GO_WITH_CONDITIONS' | 'HOLD' | 'NO_GO';
export type DecisionDisposition = 'PROCEED' | 'ABSTAIN';
export type NutritionLifecycleState = 'READY' | 'PROPOSED' | 'APPLIED' | 'OBSERVE' | 'CONFIRMED' | 'ROLLBACK';

export const WORK_AUDIT_VERDICT = {
  whyLessMoreOmit: 'GO_WITH_CONDITIONS' as AuditFeatureVerdict,
  weeklyPlan: 'HOLD' as AuditFeatureVerdict,
  automaticDoseSelection: 'HOLD' as AuditFeatureVerdict,
  automaticExecution: 'NO_GO' as AuditFeatureVerdict,
  source: 'ARGUS_SHOGUN_Evidence_Audit_v2_0_2026-08-23',
  auditedAt: '2026-08-23',
} as const;

export type AuditBlockerId =
  | 'B01' | 'B02' | 'B03' | 'B04' | 'B05'
  | 'B06' | 'B07' | 'B08' | 'B09' | 'B10'
  | 'B11' | 'B12' | 'B13' | 'B14' | 'B15';

export interface AuditBlocker {
  id: AuditBlockerId;
  title: string;
  releaseCritical: boolean;
}

export const WORK_AUDIT_BLOCKERS: AuditBlocker[] = [
  { id: 'B01', title: 'Current LED/Auto PDF and generator profiles are not frozen/versioned as reproducible snapshots.', releaseCritical: true },
  { id: 'B02', title: 'Current integrated Bloom vs PK reduction provenance is not fully frozen.', releaseCritical: true },
  { id: 'B03', title: 'Start ↔ Terra Grow transition in VEG W1–W2 is not fully resolved from a frozen current source.', releaseCritical: true },
  { id: 'B04', title: 'Current manufacturer HTML contains active numeric conflicts for Silicon/Katana/PK.', releaseCritical: true },
  { id: 'B05', title: 'SHOGUN 0.4 mS/cm feed-profile threshold must not be confused with chemical water hardness.', releaseCritical: true },
  { id: 'B06', title: 'SOURCE/INPUT/RUNOFF/SUBSTRATE/PORE_WATER EC must remain separate measurements.', releaseCritical: true },
  { id: 'B07', title: 'Measurement method and quality metadata are mandatory for substrate/root-zone interpretation.', releaseCritical: true },
  { id: 'B08', title: 'Water model needs Ca, Mg, alkalinity/HCO3, Na and Cl context before adaptive CalMag decisions.', releaseCritical: true },
  { id: 'B09', title: 'Medium identity needs initial charge, soil/perlite proportion and physical state.', releaseCritical: true },
  { id: 'B10', title: 'Irrigation volume/frequency, dryback and runoff fraction are required for trend interpretation.', releaseCritical: true },
  { id: 'B11', title: 'Adaptive decisions require repeatable trend measurements, not a single datapoint.', releaseCritical: true },
  { id: 'B12', title: 'Change-control needs one-major-change policy, observation window, STOP and rollback criteria.', releaseCritical: true },
  { id: 'B13', title: 'Decision engine requires explicit ABSTAIN with reason and minimum next measurement.', releaseCritical: true },
  { id: 'B14', title: 'Supply deficiency must be separated from physiological deficiency/lockout.', releaseCritical: true },
  { id: 'B15', title: 'Final EC/pH confirmation after all additives is required before any physical execution handoff.', releaseCritical: true },
];

export type AbstentionReasonCode =
  | 'MANUFACTURER_SNAPSHOT_UNFROZEN'
  | 'MANUFACTURER_CONFLICT'
  | 'WATER_CHEMISTRY_INCOMPLETE'
  | 'MEDIUM_IDENTITY_INCOMPLETE'
  | 'MEASUREMENT_METHOD_MISSING'
  | 'MEASUREMENT_QUALITY_INCOMPLETE'
  | 'TREND_HISTORY_INSUFFICIENT'
  | 'CHANGE_CONTROL_UNDEFINED'
  | 'PHYSIOLOGICAL_LOCKOUT_NOT_EXCLUDED'
  | 'FINAL_SOLUTION_CONFIRMATION_MISSING'
  | 'SECURITY_GATE_PENDING'
  | 'HUMAN_APPROVAL_REQUIRED';

export interface AbstentionReason {
  code: AbstentionReasonCode;
  message: string;
  minimumNextMeasurement?: string;
}

export interface DecisionReadinessInput {
  manufacturerSnapshotFrozen: boolean;
  manufacturerConflictFree: boolean;
  waterChemistryComplete: boolean;
  mediumIdentityComplete: boolean;
  measurementMethodKnown: boolean;
  measurementQualityKnown: boolean;
  repeatableTrendAvailable: boolean;
  changeControlDefined: boolean;
  physiologicalLockoutExcluded: boolean;
  finalInputEcConfirmed: boolean;
  finalPhConfirmed: boolean;
  securityGatePassed: boolean;
  humanApproved: boolean;
}

export interface DecisionReadiness {
  disposition: DecisionDisposition;
  reasons: AbstentionReason[];
}

export function assessDecisionReadiness(input: DecisionReadinessInput): DecisionReadiness {
  const reasons: AbstentionReason[] = [];
  if (!input.manufacturerSnapshotFrozen) reasons.push({ code: 'MANUFACTURER_SNAPSHOT_UNFROZEN', message: 'Current manufacturer profile is not a reproducible frozen snapshot.' });
  if (!input.manufacturerConflictFree) reasons.push({ code: 'MANUFACTURER_CONFLICT', message: 'Active manufacturer numeric/process conflict remains unresolved.' });
  if (!input.waterChemistryComplete) reasons.push({ code: 'WATER_CHEMISTRY_INCOMPLETE', message: 'Water chemistry is insufficient for an adaptive dose decision.', minimumNextMeasurement: 'At minimum: live source EC/pH plus available Ca/Mg/alkalinity context.' });
  if (!input.mediumIdentityComplete) reasons.push({ code: 'MEDIUM_IDENTITY_INCOMPLETE', message: 'Medium identity/initial charge/soil-perlite context is incomplete.' });
  if (!input.measurementMethodKnown) reasons.push({ code: 'MEASUREMENT_METHOD_MISSING', message: 'Root-zone/substrate EC without a method is semantically incomplete.' });
  if (!input.measurementQualityKnown) reasons.push({ code: 'MEASUREMENT_QUALITY_INCOMPLETE', message: 'Meter calibration/sampling/temperature metadata is incomplete.' });
  if (!input.repeatableTrendAvailable) reasons.push({ code: 'TREND_HISTORY_INSUFFICIENT', message: 'A single irrigation/EC observation is not enough for adaptive correction.' });
  if (!input.changeControlDefined) reasons.push({ code: 'CHANGE_CONTROL_UNDEFINED', message: 'Observation window, STOP and rollback criteria are not defined.' });
  if (!input.physiologicalLockoutExcluded) reasons.push({ code: 'PHYSIOLOGICAL_LOCKOUT_NOT_EXCLUDED', message: 'Visible symptoms cannot distinguish supply deficiency from uptake/lockout without context.' });
  if (!input.finalInputEcConfirmed || !input.finalPhConfirmed) reasons.push({ code: 'FINAL_SOLUTION_CONFIRMATION_MISSING', message: 'Final prepared solution EC and pH must be confirmed after all additives.' });
  if (!input.securityGatePassed) reasons.push({ code: 'SECURITY_GATE_PENDING', message: 'Software/data-integrity security gate is not PASS.' });
  if (!input.humanApproved) reasons.push({ code: 'HUMAN_APPROVAL_REQUIRED', message: 'Human approval is required before a Nutrition-generated execution handoff.' });
  return { disposition: reasons.length ? 'ABSTAIN' : 'PROCEED', reasons };
}

export interface ChangeControlPolicy {
  oneMajorChangeAtATime: true;
  maxDeltaPct?: number;
  observationWindowHours?: number;
  stopCriteriaDefined: boolean;
  rollbackCriteriaDefined: boolean;
}

export const DEFAULT_CHANGE_CONTROL_POLICY: ChangeControlPolicy = {
  oneMajorChangeAtATime: true,
  maxDeltaPct: undefined,
  observationWindowHours: undefined,
  stopCriteriaDefined: false,
  rollbackCriteriaDefined: false,
};

export function canApplyAdaptiveChange(policy: ChangeControlPolicy) {
  return policy.oneMajorChangeAtATime
    && policy.maxDeltaPct !== undefined
    && policy.observationWindowHours !== undefined
    && policy.stopCriteriaDefined
    && policy.rollbackCriteriaDefined;
}

export function allowedLifecycleTransition(from: NutritionLifecycleState, to: NutritionLifecycleState) {
  const transitions: Record<NutritionLifecycleState, NutritionLifecycleState[]> = {
    READY: ['PROPOSED'],
    PROPOSED: ['APPLIED', 'ROLLBACK'],
    APPLIED: ['OBSERVE', 'ROLLBACK'],
    OBSERVE: ['CONFIRMED', 'ROLLBACK'],
    CONFIRMED: ['READY'],
    ROLLBACK: ['OBSERVE', 'READY'],
  };
  return transitions[from].includes(to);
}

export type SdsHazardCode = 'H314' | 'SKIN_EYE_IRRITANT' | 'SERIOUS_EYE_DAMAGE';

export interface ExecutionHazardLock {
  productId: string;
  hazards: SdsHazardCode[];
  requiresHumanHandling: true;
  requiresSdsReview: true;
  automaticDispensingAllowed: false;
}

export const EXECUTION_HAZARD_LOCKS: ExecutionHazardLock[] = [
  { productId: 'pk-warrior', hazards: ['H314'], requiresHumanHandling: true, requiresSdsReview: true, automaticDispensingAllowed: false },
  { productId: 'silicon', hazards: ['SKIN_EYE_IRRITANT'], requiresHumanHandling: true, requiresSdsReview: true, automaticDispensingAllowed: false },
  { productId: 'calmag', hazards: ['SERIOUS_EYE_DAMAGE'], requiresHumanHandling: true, requiresSdsReview: true, automaticDispensingAllowed: false },
];
