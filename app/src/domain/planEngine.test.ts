import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlanVariants, getAdvisories, validatePlanForExecution } from './planEngine.ts';

void test('buduje trzy warianty bazowe', () => {
  assert.equal(buildPlanVariants(10).length, 3);
});

void test('skaluje 10 L do 5 L liniowo', () => {
  const full = buildPlanVariants(10)[0];
  const half = buildPlanVariants(5)[0];
  assert.equal(half.ingredients[1].amountMl, full.ingredients[1].amountMl / 2);
});

void test('ostrzeżenie DEMO nie jest blockerem', () => {
  const plan = buildPlanVariants(10)[0];
  assert.ok(getAdvisories(plan, 'UNLOCKED').length > 0);
  assert.deepEqual(validatePlanForExecution(plan), []);
});

void test('odrzuca technicznie błędną objętość', () => {
  const plan = buildPlanVariants(10)[0];
  assert.ok(validatePlanForExecution({ ...plan, batchLiters: Number.NaN }).length > 0);
});

void test('odrzuca duplikaty ID składników', () => {
  const plan = buildPlanVariants(10)[0];
  const duplicate = { ...plan, ingredients: [...plan.ingredients, plan.ingredients[0]] };
  assert.ok(validatePlanForExecution(duplicate).some((item) => item.includes('Duplikat')));
});
