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

export interface NutritionContext {
  stage: GrowthStage;
  week: number;
  waterType: WaterType;
  backgroundEc?: number;
  measuredPh?: number;
  medium: string;
  allowBaseOmit?: boolean;
  environment?: FeedingEnvironment;
  /**
   * Stays false until the exact current SHOGUN Light/Standard/Heavy chart
   * used by a dose window has been captured and versioned.
   */
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
  scheduleSignals: FeedingScheduleProfile[];
  scheduleProfileResolved: boolean;
  applicationProtocols: ApplicationProtocolEvidence[];
  waterNotes: string[];
  products: ProductDecision[];
  systemWarnings: string[];
}

function refsFor(evidence: ProductEvidence) {
  return evidence.refs.map(getEvidenceRef).filter((ref): ref is EvidenceRef => Boolean(ref));
}

function confidenceFor(evidence: ProductEvidence, context: NutritionContext): ProductDecision['confidence'] {
  if (evidence.status !== 'VERIFIED') return 'LOW';
  if (context.waterType === WaterType.CUSTOM || context.waterType === WaterType.RO) return 'MEDIUM';
  // Manufacturer dose windows are source-backed, but until the current
  // Light/Standard/Heavy schedule provenance is attached to each window,
  // the final choice of a numeric dose is intentionally not HIGH confidence.
  if (context.scheduleProfileResolved !== true) return 'MEDIUM';
  return 'HIGH';
}

function scenarioText(evidence: ProductEvidence, scenario: DecisionScenario) {
  if (scenario === 'LESS') return evidence.less;
  if (scenario === 'MORE') return evidence.more;
  if (scenario === 'OMIT') return evidence.omit;
  return evidence.why;
}

function candidateDoseWindows(evidence: ProductEvidence, context: NutritionContext) {
  // Katana 5 ml/L for seedlings is a specific 15-minute soak + weekly protocol,
  // not an every-feed root-dose window. It is surfaced via applicationProtocols.
  if (evidence.productId === 'katana-roots' && context.stage === GrowthStage.SEEDLING) return [];

  if (context.waterType !== WaterType.CUSTOM && context.waterType !== WaterType.RO) {
    return getDoseWindow(evidence.productId, context.stage, context.week, context.waterType);
  }

  // Unknown/RO water must not make the base disappear. Show direct candidates
  // and force the caller to resolve the water context rather than silently mapping it.
  return evidence.manufacturerDoseWindows.filter(window =>
    (window.stage === context.stage || window.stage === GrowthStage.ALL)
    && context.week >= window.weekStart
    && context.week <= window.weekEnd,
  );
}

export function evaluateProductDecision(
  productId: string,
  context: NutritionContext,
  scenario: DecisionScenario = 'BASELINE',
): ProductDecision | null {
  const evidence = getProductEvidence(productId);
  if (!evidence) return null;

  const doseWindows = candidateDoseWindows(evidence, context);
  const unresolved = [...(evidence.unresolved ?? [])];
  const hardRules = [...(evidence.hardRules ?? [])];
  const decisionText = [...scenarioText(evidence, scenario)];

  if (context.waterType === WaterType.CUSTOM) {
    unresolved.push('Profil wody CUSTOM: pokazujemy kandydatów HARD/SOFT, ale końcowa dawka zależna od wody wymaga rozstrzygnięcia profilu lub aktualnego wariantu Custom z kalkulatora producenta.');
  }

  if (context.waterType === WaterType.RO) {
    unresolved.push('RO nie jest automatycznie mapowane na SOFT w Evidence Matrix v1. Kandydaci są informacyjni; użyj aktualnego wariantu RO producenta lub jawnego Custom EC.');
  }

  if (context.scheduleProfileResolved !== true && doseWindows.length > 0) {
    unresolved.push('Dawka ma zweryfikowane źródło, ale nie ma jeszcze przypiętej wersji profilu SHOGUN Light/Standard/Heavy. Do czasu audytu profilu decyzja liczbowa pozostaje MEDIUM confidence.');
  }

  if (scenario === 'MORE') {
    decisionText.push('Scenariusz MORE jest symulacją ryzyka, nie automatyczną rekomendacją zwiększenia dawki.');
  }

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
    refs: refsFor(evidence),
    confidence: confidenceFor(evidence, context),
    blocked,
  };
}

export function buildWeeklyNutritionPlan(context: NutritionContext): WeeklyNutritionPlan {
  const systemWarnings: string[] = [];
  const waterNotes: string[] = [];
  const manufacturerWaterClass = classifyShogunWaterFromMeasuredEc(context.backgroundEc);
  const scheduleSignals = getManufacturerScheduleSignals(context.environment ?? {});
  const scheduleProfileResolved = context.scheduleProfileResolved === true;
  const applicationProtocols = APPLICATION_PROTOCOLS.filter(protocol => protocol.stage === context.stage);

  let waterStatus: WeeklyNutritionPlan['waterStatus'] = 'UNKNOWN';
  if (typeof context.backgroundEc === 'number') {
    waterStatus = 'MEASURED';
    waterNotes.push(`Użyto zmierzonego background EC: ${context.backgroundEc.toFixed(2)} mS/cm.`);
    if (manufacturerWaterClass === WaterType.HARD) {
      waterNotes.push('Według aktualnej definicji SHOGUN background EC >0.4 mS/cm leży po stronie HARD. To sugestia klasyfikacji, nie cicha zmiana ustawienia.');
    } else if (manufacturerWaterClass === WaterType.SOFT) {
      waterNotes.push('Według aktualnej definicji SHOGUN background EC <0.4 mS/cm leży po stronie SOFT. To sugestia klasyfikacji, nie cicha zmiana ustawienia.');
    } else if (manufacturerWaterClass === 'BOUNDARY') {
      waterNotes.push('Background EC = 0.40 mS/cm leży dokładnie na granicy opisanej przez SHOGUN. Pozostawiamy profil nierozstrzygnięty.');
    }
  } else if (context.waterType === WaterType.CUSTOM) {
    waterStatus = 'REFERENCE_ONLY';
    waterNotes.push(
      `Lokalna analiza Emmerich: ok. ${EMmerichWaterReference.backgroundEcMsCmApprox.toFixed(2)} mS/cm, ${EMmerichWaterReference.hardnessDh} °dH, Ca ${EMmerichWaterReference.calciumMgL} mg/L, Mg ${EMmerichWaterReference.magnesiumMgL} mg/L. To tylko referencja sieciowa.`,
    );
    waterNotes.push('Zmierz EC swojej kranówki przed wyborem wariantu zależnego od wody.');
  }

  if (
    (context.waterType === WaterType.HARD || context.waterType === WaterType.SOFT)
    && (manufacturerWaterClass === WaterType.HARD || manufacturerWaterClass === WaterType.SOFT)
    && context.waterType !== manufacturerWaterClass
  ) {
    systemWarnings.push(`Wybrano ${context.waterType}, ale zmierzony background EC według progu SHOGUN wskazuje ${manufacturerWaterClass}. Sprawdź profil wody przed użyciem dawki.`);
  }

  if (context.waterType === WaterType.CUSTOM || context.waterType === WaterType.RO) {
    systemWarnings.push('Nie wybieramy automatycznie tabeli HARD/SOFT. Background EC może dać sugestię klasyfikacji, ale aktualny wariant Custom/RO producenta pozostaje osobnym źródłem dawki.');
  }

  if (!scheduleProfileResolved) {
    systemWarnings.push(`Sygnał profilu producenta: ${scheduleSignals.join(' + ')}. Nie zmieniamy dawki, ponieważ profile Light/Standard/Heavy nie są jeszcze przypięte do zweryfikowanych tabel w bazie.`);
  }

  if (scheduleSignals.length > 1) {
    systemWarnings.push('Warunki dają więcej niż jeden sygnał profilu SHOGUN. To konflikt kontekstu, nie powód do automatycznego wyboru mocniejszej tabeli.');
  }

  if (context.medium !== 'TERRA_SOIL_PERLITE') {
    systemWarnings.push('Evidence Matrix v1 jest zatwierdzona wyłącznie dla kontekstu TERRA/SOIL + perlit.');
  }

  const products = TERRA_EVIDENCE_MATRIX
    .map(entry => evaluateProductDecision(entry.productId, context, 'BASELINE'))
    .filter((decision): decision is ProductDecision => Boolean(decision))
    .filter(decision => decision.doseWindows.length > 0);

  if (products.some(product => product.productId === 'silicon')) {
    systemWarnings.push('Sekwencja wykonania musi zawierać PRE_BASE_PH_GATE po Siliconie oraz finalny pH check po całej mieszance.');
  }

  const hasPk = products.some(product => product.productId === 'pk-warrior');
  const hasBloomBase = products.some(product => product.productId === 'samurai-terra-bloom');
  if (hasPk && hasBloomBase) {
    systemWarnings.push('PK Warrior + Bloom base: nie wykonuj automatycznie dodatkowego −25–50%. Najpierw ustal, czy dawka Bloom pochodzi z kompletnego feedchartu, czy ze standalone rate; inaczej grozi podwójna korekta.');
  }

  return {
    stage: context.stage,
    week: context.week,
    waterType: context.waterType,
    backgroundEc: context.backgroundEc,
    waterStatus,
    manufacturerWaterClass,
    scheduleSignals,
    scheduleProfileResolved,
    applicationProtocols,
    waterNotes,
    products,
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
