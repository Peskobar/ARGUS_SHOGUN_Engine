import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlanVariants, getAdvisories, validatePlanForExecution } from './planEngine.ts';
import type { PlanContext } from './types.ts';

const context = (batchLiters = 10): PlanContext => ({
  batchLiters,
  cycleDay: 5,
  phase: 'SEEDLING',
  phaseWeek: null,
  waterProfile: null,
  scheduleProfile: null,
});

void test('buduje trzy warianty bazowe', () => {
  assert.equal(buildPlanVariants(context()).length, 3);
});

void test('warianty nie udają rekomendacji ARGUS', () => {
  for (const plan of buildPlanVariants(context())) {
    assert.equal('recommended' in plan, false);
  }
});

void test('plan zachowuje dzień cyklu i fazę z kontekstu', () => {
  const plan = buildPlanVariants({
    batchLiters: 10,
    cycleDay: 9,
    phase: 'VEG',
    phaseWeek: 2,
    waterProfile: 'HARD',
    scheduleProfile: 'STANDARD',
  })[1];
  assert.equal(plan.cycleDay, 9);
  assert.equal(plan.phase, 'VEG');
});

void test('Producent nie zawiera dawek DEMO i wskazuje zrekoncyliowany ledger', () => {
  const manufacturer = buildPlanVariants(context())[0];
  assert.equal(manufacturer.id, 'manufacturer');
  assert.equal(manufacturer.selectable, false);
  assert.equal(manufacturer.ingredients.length, 0);
  assert.equal(manufacturer.evidenceLedger, 'SHOGUN_EVIDENCE_LEDGER_v2');
});

void test('Producent jasno wskazuje brakujące pola kontekstu', () => {
  const manufacturer = buildPlanVariants({
    batchLiters: 10,
    cycleDay: 20,
    phase: 'VEG',
    phaseWeek: null,
    waterProfile: null,
    scheduleProfile: null,
  })[0];

  assert.equal(manufacturer.contextReady, false);
  assert.match(manufacturer.availabilityReason ?? '', /tydzień fazy/);
  assert.match(manufacturer.availabilityReason ?? '', /profil wody/);
  assert.match(manufacturer.availabilityReason ?? '', /profil karmienia/);
});

void test('pełny kontekst Producenta nie promuje jeszcze dawek', () => {
  const manufacturer = buildPlanVariants({
    batchLiters: 10,
    cycleDay: 20,
    phase: 'VEG',
    phaseWeek: 2,
    waterProfile: 'HARD',
    scheduleProfile: 'STANDARD',
  })[0];

  assert.equal(manufacturer.contextReady, true);
  assert.equal(manufacturer.selectable, false);
  assert.equal(manufacturer.ingredients.length, 0);
  assert.match(manufacturer.availabilityReason ?? '', /Kontekst producenta jest kompletny/);
});

void test('Flush wymaga tylko tygodnia fazy w kontekście producenta', () => {
  const manufacturer = buildPlanVariants({
    batchLiters: 10,
    cycleDay: 70,
    phase: 'FLUSH',
    phaseWeek: 1,
    waterProfile: null,
    scheduleProfile: null,
  })[0];

  assert.equal(manufacturer.contextReady, true);
});

void test('Producent nadal nie przechodzi walidacji wykonania przed promocją harmonogramu', () => {
  const manufacturer = buildPlanVariants({
    batchLiters: 10,
    cycleDay: 20,
    phase: 'VEG',
    phaseWeek: 2,
    waterProfile: 'HARD',
    scheduleProfile: 'STANDARD',
  })[0];
  const blockers = validatePlanForExecution(manufacturer);
  assert.ok(blockers.length > 0);
});

void test('skaluje demo Zbalansowany 10 L do 5 L liniowo', () => {
  const full = buildPlanVariants(context(10))[1];
  const half = buildPlanVariants(context(5))[1];
  assert.equal(half.ingredients[1].amountMl, full.ingredients[1].amountMl / 2);
});

void test('ostrzeżenie DEMO nie jest blockerem dla dostępnego wariantu demo', () => {
  const plan = buildPlanVariants(context())[1];
  assert.ok(getAdvisories(plan, 'UNLOCKED').length > 0);
  assert.deepEqual(validatePlanForExecution(plan), []);
});

void test('odrzuca technicznie błędną objętość', () => {
  const plan = buildPlanVariants(context())[1];
  assert.ok(validatePlanForExecution({ ...plan, batchLiters: Number.NaN }).length > 0);
});

void test('odrzuca technicznie błędny dzień cyklu', () => {
  const plan = buildPlanVariants(context())[1];
  assert.ok(validatePlanForExecution({ ...plan, cycleDay: 0 }).some((item) => item.includes('Dzień cyklu')));
});

void test('odrzuca duplikaty ID składników', () => {
  const plan = buildPlanVariants(context())[1];
  const duplicate = { ...plan, ingredients: [...plan.ingredients, plan.ingredients[0]] };
  assert.ok(validatePlanForExecution(duplicate).some((item) => item.includes('Duplikat')));
});
