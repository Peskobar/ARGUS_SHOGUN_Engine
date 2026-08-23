import { GrowthStage, WaterType } from './types';
import {
  ManufacturerProfile,
  WaterAdjustmentResolution,
  ledCalMagDoseMlPerL,
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
      severity: ledProfile ? 'BLOCK' : 'WARN',
      title: 'Start + Terra Grow',
      detail: ledProfile
        ? 'W profilu LED 2024 Start jest umieszczony w Cuttings & Seedlings, a Terra Grow zaczyna się w VEG. Ich wspólna obecność oznacza błąd składania planu.'
        : 'Starsze/current product sources mogą nakładać Start na early veg. Bez rozstrzygniętego profilu nie sumuj dawek.',
      action: ledProfile ? 'Usuń Start z planu VEG.' : 'Pozostaw jako konflikt do rozstrzygnięcia źródłem profilu.',
    });
  }

  if (has('silicon')) {
    findings.push({
      code: 'SILICON_PRE_BASE_PH_GATE',
      severity: 'INFO',
      title: 'Silicon wymaga osobnej bramki pH',
      detail: 'Profil LED wskazuje premix Siliconu w 5 L wody i korektę do około pH 6.5 przed wejściem bazy.',
      action: 'W execution recipe utrzymaj PRE_BASE_PH_GATE oraz osobny FINAL_PH_ADJUSTMENT.',
    });
  }

  if (has('pk-warrior') && has('samurai-terra-bloom')) {
    const policy = pkBaseAdjustmentPolicy(ledProfile ? 'INTEGRATED_FEEDCHART' : 'LEGACY_STATIC');
    findings.push({
      code: 'PK_BASE_PROVENANCE',
      severity: policy.requiresExplicitAdjustment ? 'WARN' : 'INFO',
      title: 'PK Warrior + Bloom base',
      detail: policy.message,
      action: ledProfile
        ? 'Użyj wartości zintegrowanego profilu jako zestawu. Nie odejmuj automatycznie kolejnych 25–50%.'
        : 'Wymagaj jawnego provenance zanim zmienisz Bloom base.',
    });
  }

  if (ledProfile) {
    if (waterAdjustment?.status === 'UNRESOLVED_BETWEEN_ANCHORS') {
      findings.push({
        code: 'WATER_ADJUSTMENT_UNRESOLVED',
        severity: 'WARN',
        title: 'EC pomiędzy punktami tabeli',
        detail: waterAdjustment.rationale,
        action: 'Nie interpoluj procentu. Pokaż bazową dawkę LED i zachowaj decyzję jako nierozstrzygniętą do czasu kalkulatora/świadomego wyboru.',
      });
    }

    if (has('calmag') && calMag?.dose === null) {
      findings.push({
        code: 'CALMAG_WATER_CONDITIONAL',
        severity: 'WARN',
        title: 'CalMag nie jest domyślnym dodatkiem w tym profilu wody',
        detail: calMag.rationale,
        action: 'Usuń automatyczny CalMag z planu lub pozostaw go wyłącznie jako świadomy scenariusz diagnostyczny.',
      });
    }
  } else {
    findings.push({
      code: 'PROFILE_NOT_LED',
      severity: 'INFO',
      title: 'Aktywny profil legacy',
      detail: 'Water modifiers i CalMag semantics z LED 2024 nie są przenoszone do starszego hard/soft feedchartu.',
      action: 'Utrzymuj źródła rozdzielone.',
    });
  }

  if (context.waterType === WaterType.CUSTOM && context.backgroundEc === undefined) {
    findings.push({
      code: 'INPUT_DATA_MISSING',
      severity: 'WARN',
      title: 'Brak realnego background EC',
      detail: 'Nieznana kranówka nie pozwala wiarygodnie zastosować water adjustment ani zdecydować o CalMag.',
      action: 'Zachowaj plan jako DRY RUN i poproś o pomiar EC przed automatyczną dawką.',
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
    autoPlanAllowed: blockers.length === 0 && warnings.length === 0,
  };
}
