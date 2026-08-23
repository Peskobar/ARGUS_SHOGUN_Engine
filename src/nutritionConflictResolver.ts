import { GrowthStage, WaterType } from './types';
import {
  ManufacturerProfile,
  WaterAdjustmentResolution,
  ledCalMagDoseMlPerL,
  profileCanDriveWeeklyPlan,
  resolveLedTerraWaterAdjustment,
} from './manufacturerProfiles';
import { pkBaseAdjustmentPolicy } from './nutritionEvidencePolicy';

export type ConflictSeverity = 'BLOCK' | 'WARN' | 'INFO';
export type ConflictCode =
  | 'GROW_BLOOM_TOGETHER'
  | 'START_GROW_OVERLAP'
  | 'SILICON_PRE_BASE_PH_GATE'
  | 'PK_BASE_PROVENANCE'
  | 'CALMAG_WATER_CONDITIONAL'
  | 'WATER_ADJUSTMENT_UNRESOLVED'
  | 'PROFILE_NOT_LED'
  | 'PROFILE_SNAPSHOT_UNFROZEN'
  | 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT'
  | 'INPUT_DATA_MISSING';

export interface ConflictFinding {
  code: ConflictCode;
  severity: ConflictSeverity;
  title: string;
  detail: string;
  action: string;
}

export interface ConflictContext {
  profile: ManufacturerProfile;
  stage: GrowthStage;
  week: number;
  productIds: string[];
  waterType: WaterType;
  backgroundEc?: number;
}

export interface ConflictResolution {
  findings: ConflictFinding[];
  blockers: ConflictFinding[];
  warnings: ConflictFinding[];
  waterAdjustment: WaterAdjustmentResolution | null;
  calMag: ReturnType<typeof ledCalMagDoseMlPerL> | null;
  autoPlanAllowed: boolean;
}

export function resolveNutritionConflicts(context: ConflictContext): ConflictResolution {
  const findings: ConflictFinding[] = [];
  const has = (id: string) => context.productIds.includes(id);
  const ledProfile = context.profile.id === 'TERRA_LED_2024';
  const waterAdjustment = ledProfile
    ? resolveLedTerraWaterAdjustment(context.backgroundEc, context.waterType)
    : null;
  const calMag = ledProfile
    ? ledCalMagDoseMlPerL(context.backgroundEc, context.waterType)
    : null;

  if (!profileCanDriveWeeklyPlan(context.profile)) {
    findings.push({
      code: 'PROFILE_SNAPSHOT_UNFROZEN',
      severity: 'BLOCK',
      title: 'Profil producenta nie ma release authority',
      detail: `${context.profile.label}: auditStatus=${context.profile.auditStatus}, snapshotFrozen=${context.profile.snapshotFrozen}, releaseEligible=${context.profile.releaseEligible}.`,
      action: 'WEEKLY PLAN = HOLD do zamrożenia pełnego current snapshotu/generator tuple i source reconciliation.',
    });
  }

  if (has('samurai-terra-grow') && has('samurai-terra-bloom')) {
    findings.push({
      code: 'GROW_BLOOM_TOGETHER',
      severity: 'BLOCK',
      title: 'Grow + Bloom jednocześnie',
      detail: 'Dwie bazy Terra nie powinny być automatycznie łączone w jednej recepturze.',
      action: 'Zatrzymaj plan i wybierz bazę właściwą dla fazy.',
    });
  }

  if (has('shogun-start') && has('samurai-terra-grow')) {
    findings.push({
      code: 'START_GROW_OVERLAP',
      severity: 'BLOCK',
      title: 'Start + Terra Grow',
      detail: 'Independent audit found no current source authorising automatic Start + Grow stacking in early veg.',
      action: 'Domyślnie Start XOR Grow; oba tylko po frozen current calculator snapshot that explicitly contains both.',
    });
  }

  if (has('silicon')) {
    findings.push({
      code: 'SILICON_PRE_BASE_PH_GATE',
      severity: 'INFO',
      title: 'Silicon wymaga osobnej bramki pH',
      detail: 'Process is confirmed despite numeric/source conflicts: water → Silicon → dilution → PRE_BASE_PH_GATE <7 / ~6.5 → base/additives → FINAL_PH_ADJUSTMENT.',
      action: 'Utrzymaj PRE_BASE_PH_GATE i FINAL_PH_ADJUSTMENT jako dwa osobne kroki wykonawcze.',
    });
    findings.push({
      code: 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT',
      severity: 'WARN',
      title: 'Silicon: aktywny konflikt pola 4 vs detailed 1 ml/L',
      detail: 'Independent audit rejects generic 4 ml/L field for routine root feed and accepts detailed 1 ml/L process text/brochure only as manually validated evidence.',
      action: 'Nie używaj scraper-first-dose. Dose schema musi zawierać method/stage/cadence/source field.',
    });
  }

  if (has('pk-warrior') && has('samurai-terra-bloom')) {
    const policy = pkBaseAdjustmentPolicy(ledProfile ? 'INTEGRATED_FEEDCHART' : 'LEGACY_STATIC');
    findings.push({
      code: 'PK_BASE_PROVENANCE',
      severity: 'WARN',
      title: 'PK Warrior + Bloom base',
      detail: `${policy.message} Independent audit keeps this context-dependent until current integrated Bloom provenance is frozen.`,
      action: 'dose_source=standalone_label|integrated_chart; never apply a hidden second −25–50% correction.',
    });
  }

  if (has('pk-warrior')) {
    findings.push({
      code: 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT',
      severity: 'WARN',
      title: 'PK Warrior: generic 4 ml/L field conflicts with detailed routine rate',
      detail: 'Independent audit flags generic 4 ml/L as DO NOT USE for routine root feed; detailed source context must win after manual validation.',
      action: 'Block generic scraped dose values without METHOD + STAGE + CADENCE + SOURCE.',
    });
  }

  if (has('katana-roots') && context.stage === GrowthStage.SEEDLING) {
    findings.push({
      code: 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT',
      severity: 'WARN',
      title: 'Katana: 5 ml/L is method-specific',
      detail: '5 ml/L soak/propagation and 0.2 ml/L routine root feed are different branches. A generic dose field can create a 25× error.',
      action: 'METHOD + STAGE + CADENCE are mandatory before any Katana dose can be actionable.',
    });
  }

  if (ledProfile) {
    if (waterAdjustment?.status === 'UNRESOLVED_BETWEEN_ANCHORS') {
      findings.push({
        code: 'WATER_ADJUSTMENT_UNRESOLVED',
        severity: 'WARN',
        title: 'EC pomiędzy punktami albo brak live SOURCE_EC',
        detail: waterAdjustment.rationale,
        action: 'Nie interpoluj procentu i nie używaj deklaracji HARD/SOFT jako pomiaru.',
      });
    }

    if (has('calmag') || calMag?.dose === null) {
      findings.push({
        code: 'CALMAG_WATER_CONDITIONAL',
        severity: 'WARN',
        title: 'CalMag = NEEDS_USER_DATA',
        detail: calMag?.rationale ?? 'Water chemistry context is incomplete.',
        action: 'Nie wybieraj CalMag automatycznie z EC/zdjęcia. Wymagaj Ca, Mg, alkaliczności/bufora, bazy i stanu podłoża.',
      });
    }
  } else {
    findings.push({
      code: 'PROFILE_NOT_LED',
      severity: 'INFO',
      title: 'Aktywny profil legacy',
      detail: 'Independent audit classifies legacy hard/soft chart as obsolete for current auto-plan authority.',
      action: 'Używaj wyłącznie jako historyczne provenance/comparison.',
    });
  }

  if (context.waterType === WaterType.CUSTOM && context.backgroundEc === undefined) {
    findings.push({
      code: 'INPUT_DATA_MISSING',
      severity: 'WARN',
      title: 'Brak live SOURCE_EC',
      detail: 'Unknown tap cannot support water adjustment or adaptive CalMag selection.',
      action: 'ABSTAIN. Minimum next measurement: source EC + pH; retain local chemistry as reference only.',
    });
  }

  const blockers = findings.filter(finding => finding.severity === 'BLOCK');
  const warnings = findings.filter(finding => finding.severity === 'WARN');
  return {
    findings,
    blockers,
    warnings,
    waterAdjustment,
    calMag,
    autoPlanAllowed: profileCanDriveWeeklyPlan(context.profile) && blockers.length === 0 && warnings.length === 0,
  };
}
