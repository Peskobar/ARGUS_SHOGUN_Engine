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

const seedlingWeek1 = (batchLiters = 10): PlanContext => ({
  batchLiters,
  cycleDay: 5,
  phase: 'SEEDLING',
  phaseWeek: 1,
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

void test('Producent bez tygodnia nadal nie zawiera dawek', () => {
  const manufacturer = buildPlanVariants(context())[0];
  assert.equal(manufacturer.id, 'manufacturer');
  assert.equal(manufacturer.selectable, false);
  assert.equal(manufacturer.ingredients.length, 0);
  assert.equal(manufacturer.evidenceLedger, 'SHOGUN_EVIDENCE_LEDGER_v2');
});

void test('Siewka tydzień 1 uruchamia pierwszy zweryfikowany profil Producenta', () => {
  const manufacturer = buildPlanVariants(seedlingWeek1())[0];

  assert.equal(manufacturer.selectable, true);
  assert.equal(manufacturer.contextReady, true);
  assert.equal(manufacturer.ingredients.length, 2);
  assert.deepEqual(
    manufacturer.ingredients.map((ingredient) => [ingredient.id, ingredient.amountMl, ingredient.sourceStatus]),
    [
      ['shogun-start', 40, 'VERIFIED'],
      ['katana-roots', 50, 'VERIFIED'],
    ],
  );
  assert.deepEqual(validatePlanForExecution(manufacturer), []);
});

void test('zweryfikowany profil Producenta skaluje się liniowo z objętością partii', () => {
  const ten = buildPlanVariants(seedlingWeek1(10))[0];
  const five = buildPlanVariants(seedlingWeek1(5))[0];

  assert.equal(five.ingredients[0].amountMl, ten.ingredients[0].amountMl / 2);
  assert.equal(five.ingredients[1].amountMl, ten.ingredients[1].amountMl / 2);
});

void test('Siewka tydzień 1 nie wymaga profilu wody ani karmienia', () => {
  const manufacturer = buildPlanVariants(seedlingWeek1())[0];
  assert.equal(manufacturer.selectable, true);
  assert.equal(manufacturer.contextReady, true);
});

void test('nie ma fallbacku na sąsiedni tydzień siewki', () => {
  const manufacturer = buildPlanVariants({ ...seedlingWeek1(), phaseWeek: 2 })[0];

  assert.equal(manufacturer.selectable, false);
  assert.equal(manufacturer.contextReady, true);
  assert.equal(manufacturer.ingredients.length, 0);
  assert.match(manufacturer.availabilityReason ?? '', /dokładny profil/);
});

void test('Producent jasno wskazuje brakujące pola kontekstu dla wegi', () => {
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

void test('pełny kontekst wegi nie używa danych z innego profilu', () => {
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
  assert.equal(manufacturer.selectable, false);
});

void test('zweryfikowany Producent nie dostaje ostrzeżenia DEMO', () => {
  const manufacturer = buildPlanVariants(seedlingWeek1())[0];
  const advisories = getAdvisories(manufacturer, 'UNLOCKED');
  assert.ok(advisories.some((item) => item.includes('zweryfikowany')));
  assert.ok(advisories.every((item) => !item.includes('DEMO')));
});

void test('skaluje demo Zbalansowany 10 L do 5 L liniowo', () => {
  const full = buildPlanVariants(context(10))[1];
  const half = buildPlanVariants(context(5))[1];
  assert.equal(half.ingredients[1].amountMl, full.ingredients[1].amountMl / 2);
});

void test('ostrzeżenie DEMO nie jest blockerem dla dostępnego wariantu demo', () => {
  const plan = buildPlanVariants(context())[1];
  assert.ok(getAdvisories(plan, 'UNLOCKED').some((item) => item.includes('DEMO')));
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
