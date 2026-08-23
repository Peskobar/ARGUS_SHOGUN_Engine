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

export interface NutritionContext {
  stage: GrowthStage;
  week: number;
  waterType: WaterType;
  backgroundEc?: number;
  measuredPh?: number;
  medium: 'TERRA_SOIL_PERLITE';
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
  return 'HIGH';
}

function scenarioText(evidence: ProductEvidence, scenario: DecisionScenario) {
  if (scenario === 'LESS') return evidence.less;
  if (scenario === 'MORE') return evidence.more;
  if (scenario === 'OMIT') return evidence.omit;
  return evidence.why;
}

export function evaluateProductDecision(
  productId: string,
  context: NutritionContext,
  scenario: DecisionScenario = 'BASELINE',
): ProductDecision | null {
  const evidence = getProductEvidence(productId);
  if (!evidence) return null;

  const doseWindows = getDoseWindow(productId, context.stage, context.week, context.waterType);
  const unresolved = [...(evidence.unresolved ?? [])];
  const hardRules = [...(evidence.hardRules ?? [])];
  const decisionText = [...scenarioText(evidence, scenario)];

  if (context.waterType === WaterType.CUSTOM) {
    unresolved.push('Profil wody CUSTOM: przed wyborem dawki zależnej od wody potrzebny jest realny pomiar background EC.');
  }

  if (context.waterType === WaterType.RO) {
    unresolved.push('RO nie jest automatycznie mapowane na SOFT w Evidence Matrix v1. Użyj danych producenta z kalkulatora lub realnego background EC.');
  }

  if (scenario === 'MORE') {
    decisionText.push('Scenariusz MORE jest symulacją ryzyka, nie automatyczną rekomendacją zwiększenia dawki.');
  }

  if (scenario === 'OMIT' && evidence.role === 'BASE') {
    hardRules.push('Ominięcie nawozu bazowego wymaga jawnego potwierdzenia i alternatywnego pełnego źródła żywienia.');
  }

  const blocked = evidence.role === 'BASE'
    && scenario === 'OMIT'
    && !unresolved.includes('OVERRIDE_CONFIRMED');

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

  let waterStatus: WeeklyNutritionPlan['waterStatus'] = 'UNKNOWN';
  if (typeof context.backgroundEc === 'number') {
    waterStatus = 'MEASURED';
    waterNotes.push(`Użyto zmierzonego background EC: ${context.backgroundEc.toFixed(2)} mS/cm.`);
  } else if (context.waterType === WaterType.CUSTOM) {
    waterStatus = 'REFERENCE_ONLY';
    waterNotes.push(
      `Lokalna analiza Emmerich: ok. ${EMmerichWaterReference.backgroundEcMsCmApprox.toFixed(2)} mS/cm, ${EMmerichWaterReference.hardnessDh} °dH, Ca ${EMmerichWaterReference.calciumMgL} mg/L, Mg ${EMmerichWaterReference.magnesiumMgL} mg/L. To tylko referencja sieciowa.`,
    );
    waterNotes.push('Zmierz EC swojej kranówki przed wyborem wariantu zależnego od wody.');
  }

  if (context.waterType === WaterType.CUSTOM || context.waterType === WaterType.RO) {
    systemWarnings.push('Nie wybieramy automatycznie tabeli HARD/SOFT bez danych producenta lub realnego background EC.');
  }

  if (context.medium !== 'TERRA_SOIL_PERLITE') {
    systemWarnings.push('Evidence Matrix v1 jest zatwierdzona wyłącznie dla kontekstu TERRA/SOIL + perlit.');
  }

  const products = TERRA_EVIDENCE_MATRIX
    .map(entry => evaluateProductDecision(entry.productId, context, 'BASELINE'))
    .filter((decision): decision is ProductDecision => Boolean(decision))
    .filter(decision => decision.doseWindows.length > 0);

  const hasSilicon = products.some(product => product.productId === 'silicon');
  if (hasSilicon) {
    systemWarnings.push('Sekwencja wykonania musi zawierać PRE_BASE_PH_GATE po Siliconie oraz finalny pH check po całej mieszance.');
  }

  const hasPk = products.some(product => product.productId === 'pk-warrior');
  const hasBloomBase = products.some(product => product.productId === 'samurai-terra-bloom');
  if (hasPk && hasBloomBase) {
    systemWarnings.push('PK Warrior + Bloom base: producent zaleca redukcję Bloom base o 25–50%. Nie sumuj pełnych dawek bez korekty.');
  }

  return {
    stage: context.stage,
    week: context.week,
    waterType: context.waterType,
    backgroundEc: context.backgroundEc,
    waterStatus,
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
