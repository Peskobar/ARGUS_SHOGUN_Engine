import { GrowthStage, WaterType } from './types';
import { normalizeSourceEc } from './numericGuards';
import {
  ManufacturerProfileSelection,
  getProfileDosePoint,
  isTerraBaseProduct,
  ledCalMagDoseMlPerL,
  profileCanDriveWeeklyPlan,
  resolveLedTerraWaterAdjustment,
  resolveManufacturerProfile,
} from './manufacturerProfiles';
import { ConflictFinding, resolveNutritionConflicts } from './nutritionConflictResolver';
import { AbstentionReason, WORK_AUDIT_VERDICT } from './nutritionAuditLock';

export interface DryRunNutritionContext {
  stage: GrowthStage;
  week: number;
  waterType: WaterType;
  backgroundEc?: number;
  usesLed?: boolean;
  manufacturerProfile?: ManufacturerProfileSelection;
}

export interface DryRunDose {
  productId: string;
  baselineMlPerL: number;
  resolvedMlPerL: number;
  adjustmentPercent: number;
  sourceId: string;
  status: 'DIRECT_PREVIEW' | 'CONDITIONAL';
  rationale: string;
}

export interface DryRunNutritionPlan {
  mode: 'DRY_RUN';
  profileId: string;
  profileLabel: string;
  stage: GrowthStage;
  week: number;
  doses: DryRunDose[];
  conflicts: ConflictFinding[];
  blockers: ConflictFinding[];
  warnings: ConflictFinding[];
  weeklyPlanVerdict: 'HOLD';
  abstentionReasons: AbstentionReason[];
  readyForExecutionCandidate: false;
  autoExecutionAllowed: false;
  notes: string[];
}

/**
 * Manufacturer-grounded preview only. The independent Work audit holds weekly
 * prescription until a complete current profile/generator snapshot is frozen.
 */
export function buildDryRunNutritionPlan(context: DryRunNutritionContext): DryRunNutritionPlan {
  const backgroundEc = normalizeSourceEc(context.backgroundEc);
  const profile = resolveManufacturerProfile(context.manufacturerProfile ?? 'AUTO', context.usesLed);
  const waterAdjustment = profile.id === 'TERRA_LED_2024'
    ? resolveLedTerraWaterAdjustment(backgroundEc, context.waterType)
    : null;

  const points = profile.dosePoints.filter(point =>
    point.stage === context.stage
    && context.week >= point.weekStart
    && context.week <= point.weekEnd,
  );

  const doses: DryRunDose[] = points
    .filter(point => !(point.productId === 'katana-roots' && context.stage === GrowthStage.SEEDLING))
    .map(point => {
      const applyWaterModifier = profile.id === 'TERRA_LED_2024' && isTerraBaseProduct(point.productId) && waterAdjustment;
      const multiplier = applyWaterModifier ? waterAdjustment.multiplier : 1;
      const adjustmentPercent = applyWaterModifier ? waterAdjustment.percent : 0;
      return {
        productId: point.productId,
        baselineMlPerL: point.mlPerL,
        resolvedMlPerL: Number((point.mlPerL * multiplier).toFixed(3)),
        adjustmentPercent,
        sourceId: point.sourceId,
        status: 'DIRECT_PREVIEW' as const,
        rationale: applyWaterModifier
          ? `${profile.label}: preview ${point.mlPerL} ml/L; ${waterAdjustment.rationale}`
          : `${profile.label}: preview point ${point.mlPerL} ml/L.`,
      };
    });

  // Work audit: CalMag is NEEDS_USER_DATA. Never auto-add from EC/profile label alone.
  if (profile.id === 'TERRA_LED_2024') {
    const calMag = ledCalMagDoseMlPerL(backgroundEc, context.waterType);
    if (calMag.dose !== null) {
      doses.push({
        productId: 'calmag',
        baselineMlPerL: calMag.dose,
        resolvedMlPerL: calMag.dose,
        adjustmentPercent: 0,
        sourceId: 'shogun-led-terra-2024',
        status: 'CONDITIONAL',
        rationale: calMag.rationale,
      });
    }
  }

  const productIds = doses.map(dose => dose.productId);
  const conflictResolution = resolveNutritionConflicts({
    profile,
    stage: context.stage,
    week: context.week,
    productIds,
    waterType: context.waterType,
    backgroundEc,
  });

  const abstentionReasons: AbstentionReason[] = [];
  if (!profileCanDriveWeeklyPlan(profile)) {
    abstentionReasons.push({
      code: 'MANUFACTURER_SNAPSHOT_UNFROZEN',
      message: `${profile.label}: independent audit requires a frozen, reproducible current profile before weekly-plan authority.`,
      minimumNextMeasurement: 'Freeze full current LED/generator output with complete input tuple, timestamp and source identity.',
    });
  }
  if (conflictResolution.blockers.length || conflictResolution.warnings.length) {
    abstentionReasons.push({
      code: 'MANUFACTURER_CONFLICT',
      message: 'Manufacturer/context conflicts remain; dry-run may explain them but cannot promote itself to an executable weekly prescription.',
    });
  }
  if (backgroundEc === undefined) {
    abstentionReasons.push({
      code: 'WATER_CHEMISTRY_INCOMPLETE',
      message: 'No valid live SOURCE_EC is present. A declared HARD/SOFT/RO label is not a measurement.',
      minimumNextMeasurement: 'Measure source EC and pH; retain Ca/Mg/alkalinity as separate chemistry fields.',
    });
  }

  const notes = [
    `INDEPENDENT AUDIT: weekly plan = ${WORK_AUDIT_VERDICT.weeklyPlan}; automatic dose = ${WORK_AUDIT_VERDICT.automaticDoseSelection}; automatic execution = ${WORK_AUDIT_VERDICT.automaticExecution}.`,
    'DRY RUN does not write history, deduct inventory or enter the Technik Żywienia preparation/execution workflow.',
    'Displayed ml/L values are evidence-preview points, not an approved adaptive prescription.',
  ];

  if (profile.id === 'TERRA_LEGACY_HARD_SOFT') {
    notes.push('Legacy hard/soft source is archived/obsolete for current-plan authority and remains comparison-only.');
  }

  return {
    mode: 'DRY_RUN',
    profileId: profile.id,
    profileLabel: profile.label,
    stage: context.stage,
    week: context.week,
    doses,
    conflicts: conflictResolution.findings,
    blockers: conflictResolution.blockers,
    warnings: conflictResolution.warnings,
    weeklyPlanVerdict: 'HOLD',
    abstentionReasons,
    readyForExecutionCandidate: false,
    autoExecutionAllowed: false,
    notes,
  };
}

export function getDryRunDose(plan: DryRunNutritionPlan, productId: string) {
  return plan.doses.find(dose => dose.productId === productId);
}

export function hasDirectProfileDose(context: DryRunNutritionContext, productId: string) {
  const profile = resolveManufacturerProfile(context.manufacturerProfile ?? 'AUTO', context.usesLed);
  return Boolean(getProfileDosePoint(profile, productId, context.stage, context.week));
}
