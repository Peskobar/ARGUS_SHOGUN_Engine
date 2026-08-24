import assert from 'node:assert/strict';
import { FACTORY_RECIPES, SHOGUN_PRODUCTS } from '../src/data';
import { evaluateExecutionReadiness } from '../src/executionPolicy';
import { TERRA_LED_2024_PROFILE } from '../src/manufacturerProfiles';
import { buildMediumIdentityState } from '../src/mediumState';
import { evaluateNutritionDecisionKernel } from '../src/nutritionDecisionKernel';
import { assessRepeatableTrend } from '../src/nutritionObservationHistory';
import { buildObservedNutritionState } from '../src/observedNutritionState';
import { buildExecutionProtocol, filterRecipes, validateRecipeContext } from '../src/recipeEngine';
import { GrowthStage, Medium, WaterType } from '../src/types';
import { buildWaterChemistryState } from '../src/waterChemistry';

// Factory data must be useful for simulation but incapable of silently gaining physical authority.
assert.ok(FACTORY_RECIPES.length > 0);
assert.ok(FACTORY_RECIPES.every(recipe => recipe.verificationStatus === 'UNVERIFIED'));
assert.ok(FACTORY_RECIPES.every(recipe => recipe.executionPolicy === 'SIMULATION_ONLY'));

const earlyBloom = filterRecipes(FACTORY_RECIPES, {
  medium: Medium.TERRA,
  method: 'ROOT_FEED' as never,
  stage: GrowthStage.BLOOM,
  week: 2,
});
assert.ok(earlyBloom.some(recipe => recipe.id === 'rec-terra-bloom-early'));
assert.ok(!earlyBloom.some(recipe => recipe.id === 'rec-terra-bloom-pk'));

const peakBloom = filterRecipes(FACTORY_RECIPES, {
  medium: Medium.TERRA,
  method: 'ROOT_FEED' as never,
  stage: GrowthStage.BLOOM,
  week: 5,
});
assert.ok(peakBloom.some(recipe => recipe.id === 'rec-terra-bloom-pk'));
assert.ok(!peakBloom.some(recipe => recipe.id === 'rec-terra-bloom-early'));

const factoryCandidate = FACTORY_RECIPES.find(recipe => recipe.id === 'rec-terra-veg-early')!;
const physicalWarnings = validateRecipeContext(
  factoryCandidate,
  SHOGUN_PRODUCTS,
  { medium: Medium.TERRA, method: factoryCandidate.method, week: 1 },
  'PHYSICAL_EXECUTION',
);
assert.ok(physicalWarnings.some(item => item.code === 'RECIPE_UNVERIFIED' && item.severity === 'ERROR'));
assert.ok(physicalWarnings.some(item => item.code === 'PHYSICAL_EXECUTION_NOT_ALLOWED'));

const syntheticVerified = {
  ...factoryCandidate,
  id: 'release-synthetic-verified',
  verificationStatus: 'VERIFIED' as const,
  executionPolicy: 'PHYSICAL_ALLOWED' as const,
};
const protocol = buildExecutionProtocol(syntheticVerified, SHOGUN_PRODUCTS);
const completeReadiness = evaluateExecutionReadiness({
  recipe: syntheticVerified,
  products: SHOGUN_PRODUCTS,
  medium: Medium.TERRA,
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  volumeLitres: 5,
  measurements: { preBasePh: 6.5, finalEc: 1.2, finalPh: 6.2 },
  confirmedProtocolStepIds: protocol.map(step => step.id),
});
assert.equal(completeReadiness.allowed, true, completeReadiness.blockers.map(item => item.message).join('\n'));

const missingConfirmation = evaluateExecutionReadiness({
  recipe: syntheticVerified,
  products: SHOGUN_PRODUCTS,
  medium: Medium.TERRA,
  stage: GrowthStage.VEG,
  week: 1,
  waterType: WaterType.CUSTOM,
  volumeLitres: 5,
  measurements: { preBasePh: 6.5, finalEc: 1.2, finalPh: 6.2 },
  confirmedProtocolStepIds: protocol.slice(0, -1).map(step => step.id),
});
assert.equal(missingConfirmation.allowed, false);
assert.ok(missingConfirmation.blockers.some(item => item.code === 'PROTOCOL_STEP_NOT_CONFIRMED'));

// Trend: raw row count is insufficient; rows must be comparable.
const badTrend = assessRepeatableTrend([
  { id: 'a', timestamp: '2026-08-20T10:00:00Z', runoffEc: 1.4 },
  { id: 'b', timestamp: '2026-08-21T10:00:00Z', substrateEc: 1.6 },
], { minimumRepeatableSamples: 2, requireSameMeasurementMethod: true });
assert.equal(badTrend.trendReady, false);
assert.equal(badTrend.comparableEvents.length, 0);

const goodTrendEvents = [
  { id: 'a', timestamp: '2026-08-20T10:00:00Z', inputEcGross: 1.1, runoffEc: 1.4, runoffFractionPct: 15 },
  { id: 'b', timestamp: '2026-08-21T10:00:00Z', inputEcGross: 1.1, runoffEc: 1.35, runoffFractionPct: 16 },
];
const goodTrend = assessRepeatableTrend(goodTrendEvents, { minimumRepeatableSamples: 2, requireSameMeasurementMethod: true });
assert.equal(goodTrend.trendReady, true, goodTrend.reasons.join('\n'));

// Current real manufacturer profile must ABSTAIN because its reproducible snapshot is still external/unfrozen.
const liveWater = buildWaterChemistryState({
  backgroundEc: 0.55,
  pH: 7.3,
  calciumMgL: 75,
  magnesiumMgL: 11,
  alkalinityMmolLToPh43: 3,
});
const medium = buildMediumIdentityState({
  productName: 'Known test medium',
  initialChargeKnown: true,
  initialChargeDescription: 'known',
  soilOrPeatPct: 70,
  perlitePct: 30,
  potVolumeL: 20,
});
const observed = buildObservedNutritionState({
  measuredPh: 6.2,
  sourceEc: 0.55,
  preparedInputEc: 1.1,
  runoffEc: 1.35,
  runoffFractionPct: 15,
  substrateEc: 1.4,
  substrateEcMethod: 'POUR_THROUGH',
  drybackPct: 20,
  measurementQuality: {
    meterModel: 'test meter',
    calibrationDate: '2026-08-20',
    sampleTimestamp: '2026-08-24T07:00:00Z',
    samplingProtocol: 'repeatable test protocol',
  },
});
const definedChangeControl = {
  oneMajorChangeAtATime: true as const,
  maxDeltaPct: 10,
  observationWindowHours: 48,
  stopCriteriaDefined: true,
  rollbackCriteriaDefined: true,
};

const currentKernel = evaluateNutritionDecisionKernel({
  profile: TERRA_LED_2024_PROFILE,
  manufacturerConflictFree: true,
  water: liveWater,
  medium,
  observed,
  history: goodTrendEvents,
  trendPolicy: { minimumRepeatableSamples: 2, requireSameMeasurementMethod: true },
  changeControl: definedChangeControl,
  physiologicalLockoutExcluded: true,
  finalInputEcConfirmed: true,
  finalPhConfirmed: true,
  securityGatePassed: true,
  humanApproved: true,
  objectiveAndRisk: { objective: 'STABILITY', riskTolerance: 'LOW' },
});
assert.equal(currentKernel.disposition, 'ABSTAIN');
assert.ok(currentKernel.readiness.reasons.some(reason => reason.code === 'MANUFACTURER_SNAPSHOT_UNFROZEN'));

// Prove the architecture can reach PROCEED once every external gate is explicitly satisfied.
const syntheticReleasedProfile = {
  ...TERRA_LED_2024_PROFILE,
  auditStatus: 'CONFIRMED' as const,
  snapshotFrozen: true,
  releaseEligible: true,
};
const proceedKernel = evaluateNutritionDecisionKernel({
  profile: syntheticReleasedProfile,
  manufacturerConflictFree: true,
  water: liveWater,
  medium,
  observed,
  history: goodTrendEvents,
  trendPolicy: { minimumRepeatableSamples: 2, requireSameMeasurementMethod: true },
  changeControl: definedChangeControl,
  physiologicalLockoutExcluded: true,
  finalInputEcConfirmed: true,
  finalPhConfirmed: true,
  securityGatePassed: true,
  humanApproved: true,
  objectiveAndRisk: { objective: 'STABILITY', riskTolerance: 'LOW' },
});
assert.equal(proceedKernel.disposition, 'PROCEED', proceedKernel.readiness.reasons.map(reason => reason.message).join('\n'));

console.log('release architecture smoke: PASS');
