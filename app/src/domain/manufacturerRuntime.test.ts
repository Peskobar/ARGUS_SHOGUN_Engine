import assert from 'node:assert/strict';
import test from 'node:test';
import { getManufacturerRuntime } from '../manufacturerRuntime/getManufacturerRuntime.ts';

const base = {
  waterProfile: null,
  customWaterEc: null,
  scheduleProfile: null,
};

test('istniejący dokładny profil siewki pozostaje VERIFIED AUTO', () => {
  const ctx = getManufacturerRuntime({ phase: 'SEEDLING', phaseWeek: 1, ...base });
  assert.equal(ctx.verifiedRecipeAvailable, true);
  assert.equal(ctx.executionMode, 'AUTO');
  assert.equal(ctx.guidanceStatus, 'VERIFIED_AUTO');
});

test('VEG ma guidance mimo braku dokładnej receptury AUTO', () => {
  const ctx = getManufacturerRuntime({
    phase: 'VEG',
    phaseWeek: 2,
    waterProfile: 'SOFT',
    customWaterEc: null,
    scheduleProfile: 'STANDARD',
  });
  assert.equal(ctx.verifiedRecipeAvailable, false);
  assert.equal(ctx.executionMode, 'OPERATOR');
  assert.ok(ctx.products.length > 0);
  assert.ok(ctx.manufacturerGuidance.length > 0);
});

test('phaseWeek filtruje Start po pierwszych dwóch tygodniach VEG', () => {
  const week2 = getManufacturerRuntime({ phase: 'VEG', phaseWeek: 2, ...base });
  const week3 = getManufacturerRuntime({ phase: 'VEG', phaseWeek: 3, ...base });
  assert.ok(week2.products.some((product) => product.productId === 'shogun-start'));
  assert.ok(!week3.products.some((product) => product.productId === 'shogun-start'));
});

test('Katana Roots działa w VEG i tylko w pierwszych trzech tygodniach FLOWER', () => {
  const veg = getManufacturerRuntime({ phase: 'VEG', phaseWeek: 4, ...base });
  const flower3 = getManufacturerRuntime({ phase: 'FLOWER', phaseWeek: 3, ...base });
  const flower4 = getManufacturerRuntime({ phase: 'FLOWER', phaseWeek: 4, ...base });
  assert.ok(veg.products.some((product) => product.productId === 'shogun-katana-roots'));
  assert.ok(flower3.products.some((product) => product.productId === 'shogun-katana-roots'));
  assert.ok(!flower4.products.some((product) => product.productId === 'shogun-katana-roots'));
});

test('PK Warrior jest guidance tylko w FLOWER 4-7', () => {
  const week3 = getManufacturerRuntime({ phase: 'FLOWER', phaseWeek: 3, ...base });
  const week4 = getManufacturerRuntime({ phase: 'FLOWER', phaseWeek: 4, ...base });
  const week7 = getManufacturerRuntime({ phase: 'FLOWER', phaseWeek: 7, ...base });
  const week8 = getManufacturerRuntime({ phase: 'FLOWER', phaseWeek: 8, ...base });
  assert.ok(!week3.products.some((product) => product.productId === 'shogun-pk-warrior'));
  assert.ok(week4.products.some((product) => product.productId === 'shogun-pk-warrior'));
  assert.ok(week7.products.some((product) => product.productId === 'shogun-pk-warrior'));
  assert.ok(!week8.products.some((product) => product.productId === 'shogun-pk-warrior'));
});

test('Zenzym ma guidance dla VEG i FLOWER, ale nie jest automatycznie przypisany do FLUSH', () => {
  const veg = getManufacturerRuntime({ phase: 'VEG', phaseWeek: 1, ...base });
  const flower = getManufacturerRuntime({ phase: 'FLOWER', phaseWeek: 5, ...base });
  const flush = getManufacturerRuntime({ phase: 'FLUSH', phaseWeek: 1, ...base });
  assert.ok(veg.products.some((product) => product.productId === 'shogun-zenzym'));
  assert.ok(flower.products.some((product) => product.productId === 'shogun-zenzym'));
  assert.ok(!flush.products.some((product) => product.productId === 'shogun-zenzym'));
});

test('Silicon i CalMag nie są fałszywie przypisane do SEEDLING ani FLUSH', () => {
  for (const phase of ['SEEDLING', 'FLUSH'] as const) {
    const ctx = getManufacturerRuntime({ phase, phaseWeek: 1, ...base });
    assert.ok(!ctx.products.some((product) => product.productId === 'shogun-silicon'));
    assert.ok(!ctx.products.some((product) => product.productId === 'shogun-calmag'));
  }
});

test('FLUSH nadal zwraca manufacturer context mimo braku produktów', () => {
  const ctx = getManufacturerRuntime({ phase: 'FLUSH', phaseWeek: 1, ...base });
  assert.equal(ctx.guidanceAvailable, true);
  assert.equal(ctx.executionMode, 'OPERATOR');
  assert.ok(ctx.manufacturerGuidance.some((item) => item.includes('Flush/final week')));
});

test('CUSTOM wymaga wartości EC do pełnego kontekstu AUTO', () => {
  const ctx = getManufacturerRuntime({
    phase: 'VEG',
    phaseWeek: 2,
    waterProfile: 'CUSTOM',
    customWaterEc: null,
    scheduleProfile: 'STANDARD',
  });
  assert.ok(ctx.missingEvidence.some((item) => item.includes('CUSTOM')));
});

test('każdy zweryfikowany produkt ma oficjalne źródło', () => {
  for (const phase of ['SEEDLING', 'VEG', 'FLOWER'] as const) {
    const ctx = getManufacturerRuntime({ phase, phaseWeek: 1, ...base });
    for (const product of ctx.products) {
      if (!product.verified) continue;
      assert.ok(product.sourceRefs.length > 0);
      assert.ok(product.sourceRefs.some((source) => source.isOfficialDomain));
    }
  }
});
