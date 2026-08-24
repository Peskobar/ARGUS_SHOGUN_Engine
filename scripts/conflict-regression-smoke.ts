import assert from 'node:assert/strict';
import { resolveNutritionConflicts } from '../src/nutritionConflictResolver';
import { TERRA_LED_2024_PROFILE } from '../src/manufacturerProfiles';
import { GrowthStage, WaterType } from '../src/types';

const baseContext = {
  profile: TERRA_LED_2024_PROFILE,
  week: 1,
  waterType: WaterType.CUSTOM,
  backgroundEc: 0.4,
};

const additivesOnly = resolveNutritionConflicts({
  ...baseContext,
  stage: GrowthStage.VEG,
  productIds: ['silicon', 'katana-roots', 'zenzym'],
});
assert.ok(additivesOnly.blockers.some(finding => finding.code === 'MISSING_BASE_NUTRITION'));
assert.equal(additivesOnly.autoPlanAllowed, false);

const growBloom = resolveNutritionConflicts({
  ...baseContext,
  stage: GrowthStage.BLOOM,
  productIds: ['samurai-terra-grow', 'samurai-terra-bloom'],
});
assert.ok(growBloom.blockers.some(finding => finding.code === 'GROW_BLOOM_TOGETHER'));

const startGrow = resolveNutritionConflicts({
  ...baseContext,
  stage: GrowthStage.VEG,
  productIds: ['shogun-start', 'samurai-terra-grow'],
});
assert.ok(startGrow.blockers.some(finding => finding.code === 'START_GROW_OVERLAP'));

const siliconConflict = resolveNutritionConflicts({
  ...baseContext,
  stage: GrowthStage.VEG,
  productIds: ['samurai-terra-grow', 'silicon'],
});
assert.ok(siliconConflict.findings.some(finding => finding.code === 'SILICON_PRE_BASE_PH_GATE'));
assert.ok(siliconConflict.warnings.some(finding => finding.code === 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT'));
assert.equal(siliconConflict.autoPlanAllowed, false);

const pkBloom = resolveNutritionConflicts({
  ...baseContext,
  stage: GrowthStage.BLOOM,
  week: 4,
  productIds: ['samurai-terra-bloom', 'pk-warrior'],
});
assert.ok(pkBloom.warnings.some(finding => finding.code === 'PK_BASE_PROVENANCE'));
assert.ok(pkBloom.warnings.some(finding => finding.code === 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT'));

const seedlingKatana = resolveNutritionConflicts({
  ...baseContext,
  stage: GrowthStage.SEEDLING,
  productIds: ['shogun-start', 'katana-roots'],
});
assert.ok(seedlingKatana.warnings.some(finding => finding.code === 'MANUFACTURER_ACTIVE_NUMERIC_CONFLICT'));

const flushWithoutBase = resolveNutritionConflicts({
  ...baseContext,
  stage: GrowthStage.FLUSH,
  productIds: ['zenzym'],
});
assert.equal(flushWithoutBase.blockers.some(finding => finding.code === 'MISSING_BASE_NUTRITION'), false, 'FLUSH is exempt from base requirement');

console.log('conflict regression smoke: PASS');
