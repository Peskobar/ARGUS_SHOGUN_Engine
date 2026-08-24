import { canonicalProductOrder } from './canonicalMixingSequence';
import { SHOGUN_PRODUCTS } from './data';
import { compareByProfileManufacturerSource } from './manufacturerOrder';
import { normalizeSourceEc } from './numericGuards';
import { GrowthStage, WaterType } from './types';
import {
  DecisionScenario,
  EMmerichWaterReference,
  EvidenceRef,
  ProductEvidence,
  getDoseWindow,
  getEvidenceRef,
  getProductEvidence,
  TERRA_EVIDENCE_MATRIX,
} from './evidenceMatrix';
import {
  APPLICATION_PROTOCOLS,
  ApplicationProtocolEvidence,
  FeedingEnvironment,
  FeedingScheduleProfile,
  classifyShogunWaterFromMeasuredEc,
  getManufacturerScheduleSignals,
} from './nutritionEvidencePolicy';
import { SHOGUN_START_EVIDENCE, getSupplementalEvidenceRef } from './supplementalEvidence';
import {
  ManufacturerProfile,
  ManufacturerProfileSelection,
  WaterAdjustmentResolution,
  getProfileDosePoint,
  isTerraBaseProduct,
  ledCalMagDoseMlPerL,
  resolveLedTerraWaterAdjustment,
  resolveManufacturerProfile,
} from './manufacturerProfiles';
import { ConflictFinding, resolveNutritionConflicts } from './nutritionConflictResolver';

export interface NutritionContext {
  stage: GrowthStage;
  week: number;
  waterType: WaterType;
  backgroundEc?: number;
  measuredPh?: number;
  medium: string;
  allowBaseOmit?: boolean;
  environment?: FeedingEnvironment;
  manufacturerProfile?: ManufacturerProfileSelection;
  /** Light/Standard/Heavy calculator provenance remains a separate gate from the LED feedchart. */
  scheduleProfileResolved?: boolean;
}

export interface ProductDecision {
  productId: string;
  role: ProductEvidence['role'];
  scenario: DecisionScenario;
  status: ProductEvidence['status'];
  doseWindows: ReturnType<typeof getDoseWindow>;
  decisionText: string[];
  interactions: string[];
  hardRules: string[];
  unresolved: string[];
  refs: EvidenceRef[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  blocked: boolean;
}

export interface WeeklyNutritionPlan {
  stage: GrowthStage;
  week: number;
  waterType: WaterType;
  backgroundEc?: number;
  waterStatus: 'MEASURED' | 'REFERENCE_ONLY' | 'UNKNOWN';
  manufacturerWaterClass: WaterType | 'BOUNDARY' | null;
  manufacturerProfileId: ManufacturerProfile['id'];
  manufacturerProfileLabel: string;
  manufacturerProfileResolved: boolean;
  waterAdjustment: WaterAdjustmentResolution | null;
  scheduleSignals: FeedingScheduleProfile[];
  scheduleProfileResolved: boolean;
  applicationProtocols: ApplicationProtocolEvidence[];
  waterNotes: string[];
  /** Exact source/table presentation order. Never use as physical mixing order. */
  manufacturerProducts: ProductDecision[];
  /** Canonical ARGUS physical order. Never present this as the manufacturer's row order. */
  executionProducts: ProductDecision[];
  /** Backwards-compatible UI alias. It intentionally means manufacturerProducts. */
  products: ProductDecision[];
  conflicts: ConflictFinding[];
  systemWarnings: string[];
}

const ALL_PRODUCT_EVIDENCE: ProductEvidence[] = [SHOGUN_START_EVIDENCE, ...TERRA_EVIDENCE_MATRIX];
const PRODUCT_BY_ID = new Map(SHOGUN_PRODUCTS.map(product => [product.id, product]));

function compareProductDecisionsByCanonicalExecution(a: ProductDecision, b: ProductDecision) {
  const productA = PRODUCT_BY_ID.get(a.productId);
  const productB = PRODUCT_BY_ID.get(b.productId);
  const orderA = productA ? canonicalProductOrder(productA) : Number.MAX_SAFE_INTEGER;
  const orderB = productB ? canonicalProductOrder(productB) : Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.productId.localeCompare(b.productId);
}

function resolveProductEvidence(productId: string) {
  return getProductEvidence(productId) ?? (productId === SHOGUN_START_EVIDENCE.productId ? SHOGUN_START_EVIDENCE : undefined);
}

function activeProfile(context: NutritionContext) {
  return resolveManufacturerProfile(context.manufacturerProfile ?? 'AUTO', context.environment?.usesLed);
}

function manufacturerProfileRef(profile: ManufacturerProfile): EvidenceRef | null {
  if (profile.id !== 'TERRA_LED_2024') return null;
  return {
    id: 'shogun-led-terra-2024',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN LED Coco and Terra Feedchart — current downloads set',
    url: 'https://www.shogunfertilisers.com/pages/downloads',
    year: 2024,
    applicability: 'DIRECT',
    confidence: 'HIGH',
  };
}

function refsFor(evidence: ProductEvidence, profile: ManufacturerProfile, hasProfileDose: boolean) {
  const refs = evidence.refs
    .map(id => getEvidenceRef(id) ?? getSupplementalEvidenceRef(id))
    .filter((ref): ref is EvidenceRef => Boolean(ref));
  const profileRef = hasProfileDose ? manufacturerProfileRef(profile) : null;
  if (profileRef && !refs.some(ref => ref.id === profileRef.id)) refs.unshift(profileRef);
  return refs;
}

function profileDoseWindow(evidence: ProductEvidence, context: NutritionContext, profile: ManufacturerProfile) {
  if (profile.id !== 'TERRA_LED_2024') return null;

  // Seedling Katana remains a special SOAK/WEEKLY protocol, not generic every-feed dosing.
  if (evidence.productId === 'katana-roots' && context.stage === GrowthStage.SEEDLING) return [];

  if (evidence.productId === 'calmag') {
    const calMag = ledCalMagDoseMlPerL(context.backgroundEc, context.waterType);
    if (calMag.dose === null) return [];
    return [{
      stage: context.stage,
      weekStart: context.week,
      weekEnd: context.week,
      minMlPerL: calMag.dose,
      maxMlPerL: calMag.dose,
      method: 'ROOT_FEED' as const,
      note: calMag.rationale,
    }];
  }

  const point = getProfileDosePoint(profile, evidence.productId, context.stage, context.week);
  if (!point) return [];

  let dose = point.mlPerL;
  let note = point.note;
  if (isTerraBaseProduct(point.productId)) {
    const adjustment = resolveLedTerraWaterAdjustment(context.backgroundEc, context.waterType);
    dose = Number((dose * adjustment.multiplier).toFixed(3));
    note = `${note ? `${note} ` : ''}${adjustment.rationale}`;
  }

  return [{
    stage: point.stage,
    weekStart: point.weekStart,
    weekEnd: point.weekEnd,
    minMlPerL: dose,
    maxMlPerL: dose,
    method: point.method,
    note,
  }];
}

function confidenceFor(evidence: ProductEvidence, context: NutritionContext, profile: ManufacturerProfile): ProductDecision['confidence'] {
  if (evidence.status !== 'VERIFIED') return 'LOW';
  if (profile.id === 'TERRA_LED_2024') {
    const adjustment = resolveLedTerraWaterAdjustment(context.backgroundEc, context.waterType);
    if (isTerraBaseProduct(evidence.productId) && adjustment.status === 'UNRESOLVED_BETWEEN_ANCHORS') return 'MEDIUM';
    if (adjustment.status === 'ASSUMED_FROM_WATER_CLASS') return 'MEDIUM';
    return 'HIGH';
  }
  if (context.waterType === WaterType.CUSTOM || context.waterType === WaterType.RO) return 'MEDIUM';
  if (context.scheduleProfileResolved !== true) return 'MEDIUM';
  return 'HIGH';
}

function scenarioText(evidence: ProductEvidence, scenario: DecisionScenario) {
  if (scenario === 'LESS') return evidence.less;
  if (scenario === 'MORE') return evidence.more;
  if (scenario === 'OMIT') return evidence.omit;
  return evidence.why;
}

function candidateDoseWindows(evidence: ProductEvidence, context: NutritionContext, profile: ManufacturerProfile) {
  const profileWindows = profileDoseWindow(evidence, context, profile);
  if (profileWindows !== null) return profileWindows;

  if (evidence.productId === 'katana-roots' && context.stage === GrowthStage.SEEDLING) return [];

  const directFilter = (window: ProductEvidence['manufacturerDoseWindows'][number]) =>
    (window.stage === context.stage || window.stage === GrowthStage.ALL)
    && context.week >= window.weekStart
    && context.week <= window.weekEnd;

  if (evidence.productId === SHOGUN_START_EVIDENCE.productId) {
    return evidence.manufacturerDoseWindows.filter(directFilter);
  }

  if (context.waterType !== WaterType.CUSTOM && context.waterType !== WaterType.RO) {
    return getDoseWindow(evidence.productId, context.stage, context.week, context.waterType);
  }

  return evidence.manufacturerDoseWindows.filter(directFilter);
}

export function evaluateProductDecision(
  productId: string,
  context: NutritionContext,
  scenario: DecisionScenario = 'BASELINE',
): ProductDecision | null {
  const evidence = resolveProductEvidence(productId);
  if (!evidence) return null;

  const profile = activeProfile(context);
  const doseWindows = candidateDoseWindows(evidence, context, profile);
  const unresolved = [...(evidence.unresolved ?? [])];
  const hardRules = [...(evidence.hardRules ?? [])];
  const decisionText = [...scenarioText(evidence, scenario)];

  if (profile.id === 'TERRA_LED_2024') {
    const adjustment = resolveLedTerraWaterAdjustment(context.backgroundEc, context.waterType);
    if (isTerraBaseProduct(productId) && adjustment.status === 'UNRESOLVED_BETWEEN_ANCHORS') unresolved.push(adjustment.rationale);
    if (productId === 'calmag') {
      const calMag = ledCalMagDoseMlPerL(context.backgroundEc, context.waterType);
      decisionText.push(calMag.rationale);
    }
  } else {
    if (context.waterType === WaterType.CUSTOM) {
      unresolved.push('Profil wody CUSTOM: pokazujemy kandydatów HARD/SOFT, ale końcowa dawka zależna od wody wymaga rozstrzygnięcia profilu lub aktualnego wariantu Custom z kalkulatora producenta.');
    }
    if (context.waterType === WaterType.RO) {
      unresolved.push('RO nie jest automatycznie mapowane na SOFT w legacy Evidence Matrix. Użyj aktualnego wariantu producenta lub jawnego Custom EC.');
    }
    if (context.scheduleProfileResolved !== true && doseWindows.length > 0) {
      unresolved.push('Legacy dawka ma źródło producenta, ale profil Light/Standard/Heavy kalkulatora pozostaje osobnym, nierozstrzygniętym provenance.');
    }
  }

  if (scenario === 'MORE') decisionText.push('Scenariusz MORE jest symulacją ryzyka, nie automatyczną rekomendacją zwiększenia dawki.');

  if (scenario === 'OMIT' && evidence.role === 'BASE') {
    hardRules.push('Ominięcie nawozu bazowego wymaga jawnego potwierdzenia i alternatywnego pełnego źródła żywienia.');
  }

  const blocked = evidence.role === 'BASE'
    && scenario === 'OMIT'
    && context.allowBaseOmit !== true;

  return {
    productId,
    role: evidence.role,
    scenario,
    status: evidence.status,
    doseWindows,
    decisionText,
    interactions: evidence.interactions,
    hardRules,
    unresolved,
    refs: refsFor(evidence, profile, doseWindows.length > 0),
    confidence: confidenceFor(evidence, context, profile),
    blocked,
  };
}

export function buildWeeklyNutritionPlan(context: NutritionContext): WeeklyNutritionPlan {
  const systemWarnings: string[] = [];
  const waterNotes: string[] = [];
  const backgroundEc = normalizeSourceEc(context.backgroundEc);
  const safeContext: NutritionContext = { ...context, backgroundEc };
  const profile = activeProfile(safeContext);
  const manufacturerProfileResolved = profile.id === 'TERRA_LED_2024' || profile.id === 'TERRA_LEGACY_HARD_SOFT';
  const manufacturerWaterClass = classifyShogunWaterFromMeasuredEc(backgroundEc);
  const waterAdjustment = profile.id === 'TERRA_LED_2024'
    ? resolveLedTerraWaterAdjustment(backgroundEc, context.waterType)
    : null;
  const scheduleSignals = getManufacturerScheduleSignals(context.environment ?? {});
  const scheduleProfileResolved = context.scheduleProfileResolved === true;
  const applicationProtocols = APPLICATION_PROTOCOLS.filter(protocol => protocol.stage === context.stage);

  let waterStatus: WeeklyNutritionPlan['waterStatus'] = 'UNKNOWN';
  if (backgroundEc !== undefined) {
    waterStatus = 'MEASURED';
    waterNotes.push(`Użyto zmierzonego background EC: ${backgroundEc.toFixed(2)} mS/cm.`);
    if (profile.id === 'TERRA_LED_2024' && waterAdjustment) waterNotes.push(waterAdjustment.rationale);
    if (manufacturerWaterClass === WaterType.HARD) waterNotes.push('Klasyfikator kalkulatora SHOGUN wskazuje HARD dla EC >0.4; to osobna informacja od dyskretnych korekt profilu LED.');
    else if (manufacturerWaterClass === WaterType.SOFT) waterNotes.push('Klasyfikator kalkulatora SHOGUN wskazuje SOFT dla EC <0.4; profil LED ma własne punkty EC 0 / 0.2 / 0.4 / 0.6+.');
    else if (manufacturerWaterClass === 'BOUNDARY') waterNotes.push('Background EC = 0.40 mS/cm jest dokładnie baseline profilu LED 2024.');
  } else if (context.waterType === WaterType.CUSTOM) {
    waterStatus = 'REFERENCE_ONLY';
    waterNotes.push(`Lokalna analiza Emmerich: ok. ${EMmerichWaterReference.backgroundEcMsCmApprox.toFixed(2)} mS/cm, ${EMmerichWaterReference.hardnessDh} °dH, Ca ${EMmerichWaterReference.calciumMgL} mg/L, Mg ${EMmerichWaterReference.magnesiumMgL} mg/L. To tylko referencja sieciowa.`);
    waterNotes.push('Zmierz EC swojej kranówki przed automatycznym water adjustment i decyzją o CalMag.');
  }

  if (
    (context.waterType === WaterType.HARD || context.waterType === WaterType.SOFT)
    && (manufacturerWaterClass === WaterType.HARD || manufacturerWaterClass === WaterType.SOFT)
    && context.waterType !== manufacturerWaterClass
  ) {
    systemWarnings.push(`Wybrano ${context.waterType}, ale zmierzony background EC według progu kalkulatora SHOGUN wskazuje ${manufacturerWaterClass}. Sprawdź profil wody.`);
  }

  if (profile.id === 'TERRA_LED_2024') {
    systemWarnings.push('Aktywny, wersjonowany profil SHOGUN Terra LED 2024. Nie mieszamy jego liczb z legacy HARD/SOFT.');
    if (waterAdjustment?.status === 'UNRESOLVED_BETWEEN_ANCHORS') {
      systemWarnings.push('LED water adjustment: EC leży pomiędzy punktami opisanymi przez producenta. Nie interpolujemy procentu; pokazujemy baseline i oznaczamy niepewność.');
    }
  } else if (context.waterType === WaterType.CUSTOM || context.waterType === WaterType.RO) {
    systemWarnings.push('Legacy profile: nie wybieramy automatycznie tabeli HARD/SOFT dla CUSTOM/RO.');
  }

  if (!scheduleProfileResolved) {
    systemWarnings.push(`Sygnał kalkulatora Light/Standard/Heavy: ${scheduleSignals.join(' + ')}. To osobny wymiar od wersjonowanej tabeli nawożenia LED i nie przelicza dawki automatycznie.`);
  }
  if (scheduleSignals.length > 1) systemWarnings.push('Warunki dają więcej niż jeden sygnał Light/Standard/Heavy. To konflikt kontekstu, nie powód do wyboru mocniejszej dawki.');
  if (context.medium !== 'TERRA_SOIL_PERLITE') systemWarnings.push('Evidence Matrix v1 jest zatwierdzona wyłącznie dla kontekstu TERRA/SOIL + perlit.');

  const activeProducts = ALL_PRODUCT_EVIDENCE
    .map(entry => evaluateProductDecision(entry.productId, safeContext, 'BASELINE'))
    .filter((decision): decision is ProductDecision => Boolean(decision))
    .filter(decision => decision.doseWindows.length > 0);

  // Two independent views over the same active products. This is the bug fix:
  // manufacturer source order must never be derived from physical mixing roles.
  const manufacturerProducts = [...activeProducts]
    .sort((a, b) => compareByProfileManufacturerSource(profile, a, b));
  const executionProducts = [...activeProducts]
    .sort(compareProductDecisionsByCanonicalExecution);

  const conflictResolution = resolveNutritionConflicts({
    profile,
    stage: context.stage,
    week: context.week,
    productIds: activeProducts.map(product => product.productId),
    waterType: context.waterType,
    backgroundEc,
  });
  for (const finding of conflictResolution.findings) {
    if (finding.severity !== 'INFO') systemWarnings.push(`${finding.title}: ${finding.action}`);
  }

  return {
    stage: context.stage,
    week: context.week,
    waterType: context.waterType,
    backgroundEc,
    waterStatus,
    manufacturerWaterClass,
    manufacturerProfileId: profile.id,
    manufacturerProfileLabel: profile.label,
    manufacturerProfileResolved,
    waterAdjustment,
    scheduleSignals,
    scheduleProfileResolved,
    applicationProtocols,
    waterNotes,
    manufacturerProducts,
    executionProducts,
    products: manufacturerProducts,
    conflicts: conflictResolution.findings,
    systemWarnings,
  };
}

export function compareScenario(productId: string, context: NutritionContext) {
  return {
    baseline: evaluateProductDecision(productId, context, 'BASELINE'),
    less: evaluateProductDecision(productId, context, 'LESS'),
    more: evaluateProductDecision(productId, context, 'MORE'),
    omit: evaluateProductDecision(productId, context, 'OMIT'),
  };
}
