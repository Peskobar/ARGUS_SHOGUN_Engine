import { GrowthStage, WaterType } from './types';
import {
  ManufacturerProfileSelection,
  getProfileDosePoint,
  isTerraBaseProduct,
  ledCalMagDoseMlPerL,
  resolveLedTerraWaterAdjustment,
  resolveManufacturerProfile,
} from './manufacturerProfiles';
import { ConflictFinding, resolveNutritionConflicts } from './nutritionConflictResolver';

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
  status: 'DIRECT' | 'CONDITIONAL';
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
  readyForExecutionCandidate: boolean;
  autoExecutionAllowed: false;
  notes: string[];
}

/**
 * Generates a manufacturer-grounded preview only. It deliberately does not create
 * a Recipe or mutate inventory/history. The audit gate still blocks automatic execution.
 */
export function buildDryRunNutritionPlan(context: DryRunNutritionContext): DryRunNutritionPlan {
  const profile = resolveManufacturerProfile(context.manufacturerProfile ?? 'AUTO', context.usesLed);
  const waterAdjustment = profile.id === 'TERRA_LED_2024'
    ? resolveLedTerraWaterAdjustment(context.backgroundEc, context.waterType)
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
        status: 'DIRECT' as const,
        rationale: applyWaterModifier
          ? `${profile.label}: bazowe ${point.mlPerL} ml/L; ${waterAdjustment.rationale}`
          : `${profile.label}: bezpośredni punkt tabeli ${point.mlPerL} ml/L.`,
      };
    });

  if (profile.id === 'TERRA_LED_2024') {
    const calMag = ledCalMagDoseMlPerL(context.backgroundEc, context.waterType);
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
    backgroundEc: context.backgroundEc,
  });

  const notes = [
    'DRY RUN: ten plan nie zapisuje historii, nie odejmuje magazynu i nie uruchamia Planner 2.2.',
    'Automatyczne wykonanie pozostaje wyłączone do zakończenia niezależnego audytu agronomicznego i security gate.',
  ];

  if (profile.id === 'TERRA_LEGACY_HARD_SOFT') {
    notes.push('Legacy profile nadal korzysta z Evidence Matrix hard/soft; dry-run bridge v1 koncentruje się na nowym profilu LED 2024.');
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
    readyForExecutionCandidate: profile.id === 'TERRA_LED_2024' && conflictResolution.blockers.length === 0 && doses.length > 0,
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
