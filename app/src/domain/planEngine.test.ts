import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlanVariants, getAdvisories, validatePlanForExecution } from './planEngine.ts';
import type { PlanContext } from './types.ts';

const context = (batchLiters = 10): PlanContext => ({
  batchLiters,
  cycleDay: 5,
  phase: 'SEEDLING',
});

void test('buduje trzy warianty bazowe', () => {
  assert.equal(buildPlanVariants(context()).length, 3);
});

void test('warianty DEMO nie udają rekomendacji ARGUS', () => {
  for (const plan of buildPlanVariants(context())) {
    assert.equal('recommended' in plan, false);
  }
});

void test('plan zachowuje dzień cyklu i fazę z kontekstu', () => {
  const plan = buildPlanVariants({ batchLiters: 10, cycleDay: 9, phase: 'VEG' })[0];
  assert.equal(plan.cycleDay, 9);
  assert.equal(plan.phase, 'VEG');
});

void test('skaluje 10 L do 5 L liniowo', () => {
  const full = buildPlanVariants(context(10))[0];
  const half = buildPlanVariants(context(5))[0];
  assert.equal(half.ingredients[1].amountMl, full.ingredients[1].amountMl / 2);
});

void test('ostrzeżenie DEMO nie jest blockerem', () => {
  const plan = buildPlanVariants(context())[0];
  assert.ok(getAdvisories(plan, 'UNLOCKED').length > 0);
  assert.deepEqual(validatePlanForExecution(plan), []);
});

void test('odrzuca technicznie błędną objętość', () => {
  const plan = buildPlanVariants(context())[0];
  assert.ok(validatePlanForExecution({ ...plan, batchLiters: Number.NaN }).length > 0);
});

void test('odrzuca technicznie błędny dzień cyklu', () => {
  const plan = buildPlanVariants(context())[0];
  assert.ok(validatePlanForExecution({ ...plan, cycleDay: 0 }).some((item) => item.includes('Dzień cyklu')));
});

void test('odrzuca duplikaty ID składników', () => {
  const plan = buildPlanVariants(context())[0];
  const duplicate = { ...plan, ingredients: [...plan.ingredients, plan.ingredients[0]] };
  assert.ok(validatePlanForExecution(duplicate).some((item) => item.includes('Duplikat')));
});
