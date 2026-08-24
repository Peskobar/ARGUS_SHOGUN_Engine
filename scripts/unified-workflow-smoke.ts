import assert from 'node:assert/strict';
import { SHOGUN_PRODUCTS } from '../src/data';
import {
  buildNutritionExecutionWorkflow,
  createNutritionExecutionState,
  currentNutritionExecutionStep,
  transitionNutritionExecution,
} from '../src/nutritionExecutionStateMachine';
import { MixingRole, type Product } from '../src/types';

const byId = (id: string) => {
  const product = SHOGUN_PRODUCTS.find(item => item.id === id);
  assert.ok(product, `missing fixture product ${id}`);
  return product;
};

// Deliberately hostile input order: ROOTS and BASE first, Silicon last.
const workflow = buildNutritionExecutionWorkflow([
  byId('katana-roots'),
  byId('samurai-terra-grow'),
  byId('calmag'),
  byId('silicon'),
  byId('zenzym'),
]);

assert.deepEqual(
  workflow.map(step => step.id),
  [
    'water',
    'product:silicon',
    'mix:silicon-dilution',
    'gate:pre-base-ph',
    'product:calmag',
    'product:samurai-terra-grow',
    'product:katana-roots',
    'product:zenzym',
    'mix:final',
    'gate:final-ec-ph',
    'complete',
  ],
  'Technik Żywienia and Planner must derive the same canonical physical order',
);

let state = createNutritionExecutionState([
  byId('katana-roots'),
  byId('samurai-terra-grow'),
  byId('calmag'),
  byId('silicon'),
]);

// Cannot jump directly to a later product.
state = transitionNutritionExecution(state, {
  type: 'CONFIRM_CURRENT',
  stepId: 'product:katana-roots',
});
assert.equal(state.status, 'HOLD');
assert.equal(state.holdReason, 'OUT_OF_SEQUENCE_STEP');
assert.equal(state.currentIndex, 0);

// Correct current step clears HOLD and advances.
state = transitionNutritionExecution(state, { type: 'CONFIRM_CURRENT', stepId: 'water' });
assert.equal(state.status, 'ACTIVE');
assert.equal(currentNutritionExecutionStep(state).id, 'product:silicon');
state = transitionNutritionExecution(state, { type: 'CONFIRM_CURRENT', stepId: 'product:silicon' });
state = transitionNutritionExecution(state, { type: 'CONFIRM_CURRENT', stepId: 'mix:silicon-dilution' });
assert.equal(currentNutritionExecutionStep(state).id, 'gate:pre-base-ph');

// Gate cannot be confirmed as an ordinary step.
state = transitionNutritionExecution(state, { type: 'CONFIRM_CURRENT', stepId: 'gate:pre-base-ph' });
assert.equal(state.status, 'HOLD');
assert.equal(state.holdReason, 'PRE_BASE_PH_GATE_REQUIRED');
assert.equal(currentNutritionExecutionStep(state).id, 'gate:pre-base-ph');

// Explicit FAIL also keeps the workflow on the same gate.
state = transitionNutritionExecution(state, {
  type: 'SUBMIT_GATE',
  stepId: 'gate:pre-base-ph',
  gate: 'PRE_BASE_PH_GATE',
  result: 'FAIL',
});
assert.equal(state.status, 'HOLD');
assert.equal(state.holdReason, 'PRE_BASE_PH_GATE_FAILED');
assert.equal(currentNutritionExecutionStep(state).id, 'gate:pre-base-ph');

// A later valid PASS releases the gate.
state = transitionNutritionExecution(state, {
  type: 'SUBMIT_GATE',
  stepId: 'gate:pre-base-ph',
  gate: 'PRE_BASE_PH_GATE',
  result: 'PASS',
});
assert.equal(state.status, 'ACTIVE');
assert.equal(currentNutritionExecutionStep(state).id, 'product:calmag');

for (const stepId of [
  'product:calmag',
  'product:samurai-terra-grow',
  'product:katana-roots',
  'mix:final',
]) {
  state = transitionNutritionExecution(state, { type: 'CONFIRM_CURRENT', stepId });
}
assert.equal(currentNutritionExecutionStep(state).id, 'gate:final-ec-ph');

// Final measurement gate is equally mandatory.
state = transitionNutritionExecution(state, {
  type: 'SUBMIT_GATE',
  stepId: 'gate:final-ec-ph',
  gate: 'FINAL_EC_PH_GATE',
  result: 'PASS',
});
assert.equal(currentNutritionExecutionStep(state).id, 'complete');
state = transitionNutritionExecution(state, { type: 'CONFIRM_CURRENT', stepId: 'complete' });
assert.equal(state.status, 'COMPLETE');

// READY_TO_USE must never silently enter a nutrient tank workflow.
const readyToUse: Product = {
  ...byId('geisha-foliar'),
  mixingRole: MixingRole.READY_TO_USE,
};
assert.throws(
  () => buildNutritionExecutionWorkflow([readyToUse, byId('silicon')]),
  /INVALID_EXECUTION_CONTEXT/,
);

console.log('unified nutrition workflow smoke: PASS');
