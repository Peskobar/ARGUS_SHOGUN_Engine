import { compareProductsByCanonicalExecution } from './canonicalMixingSequence';
import { MixingRole, type Product } from './types';

export type NutritionExecutionGate = 'PRE_BASE_PH_GATE' | 'FINAL_EC_PH_GATE';
export type NutritionExecutionStatus = 'ACTIVE' | 'HOLD' | 'COMPLETE';

export type NutritionExecutionStep =
  | { id: 'water'; kind: 'WATER'; label: 'Woda' }
  | { id: `product:${string}`; kind: 'PRODUCT'; productId: string; role: MixingRole; label: string }
  | { id: 'mix:silicon-dilution'; kind: 'MIX_DILUTION'; label: 'Wymieszaj i rozcieńcz Silicon' }
  | { id: 'gate:pre-base-ph'; kind: 'GATE'; gate: 'PRE_BASE_PH_GATE'; label: 'Kontrola pH po Silicon przed bazą' }
  | { id: 'mix:final'; kind: 'FINAL_MIX'; label: 'Mieszanie końcowe' }
  | { id: 'gate:final-ec-ph'; kind: 'GATE'; gate: 'FINAL_EC_PH_GATE'; label: 'Końcowa kontrola EC/pH' }
  | { id: 'complete'; kind: 'COMPLETE'; label: 'Gotowe' };

export interface NutritionExecutionState {
  steps: readonly NutritionExecutionStep[];
  currentIndex: number;
  status: NutritionExecutionStatus;
  gateResults: Readonly<Partial<Record<NutritionExecutionGate, 'PASS' | 'FAIL'>>>;
  completedStepIds: readonly string[];
  holdReason?: string;
}

export type NutritionExecutionEvent =
  | { type: 'CONFIRM_CURRENT'; stepId: string }
  | { type: 'SUBMIT_GATE'; stepId: string; gate: NutritionExecutionGate; result: 'PASS' | 'FAIL' };

const MIXABLE_ROLES = new Set<MixingRole>([
  MixingRole.SILICON,
  MixingRole.CALMAG,
  MixingRole.BASE,
  MixingRole.ROOTS,
  MixingRole.ENZYME,
  MixingRole.BOOSTER,
  MixingRole.PK,
  MixingRole.BIOLOGICAL,
  MixingRole.OTHER,
]);

/**
 * Builds the physical execution workflow from trusted product role metadata.
 * Input array order is intentionally ignored.
 */
export function buildNutritionExecutionWorkflow(products: readonly Product[]): readonly NutritionExecutionStep[] {
  const readyToUse = products.filter(product => product.mixingRole === MixingRole.READY_TO_USE);
  const mixable = products
    .filter(product => product.mixingRole && MIXABLE_ROLES.has(product.mixingRole))
    .slice()
    .sort(compareProductsByCanonicalExecution);

  // READY_TO_USE is a separate application method. Never mix it into nutrient solution workflow.
  if (readyToUse.length > 0 && mixable.length > 0) {
    throw new Error('INVALID_EXECUTION_CONTEXT: READY_TO_USE cannot be mixed with nutrient-solution products.');
  }

  if (readyToUse.length > 0) {
    return Object.freeze([
      ...readyToUse
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
        .map(product => productStep(product)),
      { id: 'complete', kind: 'COMPLETE', label: 'Gotowe' } as const,
    ]);
  }

  const steps: NutritionExecutionStep[] = [
    { id: 'water', kind: 'WATER', label: 'Woda' },
  ];

  for (const product of mixable) {
    steps.push(productStep(product));

    if (product.mixingRole === MixingRole.SILICON) {
      steps.push({
        id: 'mix:silicon-dilution',
        kind: 'MIX_DILUTION',
        label: 'Wymieszaj i rozcieńcz Silicon',
      });
      steps.push({
        id: 'gate:pre-base-ph',
        kind: 'GATE',
        gate: 'PRE_BASE_PH_GATE',
        label: 'Kontrola pH po Silicon przed bazą',
      });
    }
  }

  steps.push({ id: 'mix:final', kind: 'FINAL_MIX', label: 'Mieszanie końcowe' });
  steps.push({
    id: 'gate:final-ec-ph',
    kind: 'GATE',
    gate: 'FINAL_EC_PH_GATE',
    label: 'Końcowa kontrola EC/pH',
  });
  steps.push({ id: 'complete', kind: 'COMPLETE', label: 'Gotowe' });

  return Object.freeze(steps);
}

export function createNutritionExecutionState(products: readonly Product[]): NutritionExecutionState {
  return {
    steps: buildNutritionExecutionWorkflow(products),
    currentIndex: 0,
    status: 'ACTIVE',
    gateResults: {},
    completedStepIds: [],
  };
}

export function currentNutritionExecutionStep(state: NutritionExecutionState): NutritionExecutionStep {
  return state.steps[Math.min(state.currentIndex, state.steps.length - 1)];
}

/**
 * Fail-closed transition function. The caller must confirm exactly the current
 * step; gate steps require an explicit PASS. FAIL keeps the workflow on HOLD and
 * a later PASS for the same current gate may release it.
 */
export function transitionNutritionExecution(
  state: NutritionExecutionState,
  event: NutritionExecutionEvent,
): NutritionExecutionState {
  if (state.status === 'COMPLETE') return state;

  const current = currentNutritionExecutionStep(state);
  if (!current || event.stepId !== current.id) {
    return {
      ...state,
      status: 'HOLD',
      holdReason: 'OUT_OF_SEQUENCE_STEP',
    };
  }

  if (current.kind === 'COMPLETE') {
    if (event.type !== 'CONFIRM_CURRENT') {
      return { ...state, status: 'HOLD', holdReason: 'COMPLETE_CONFIRMATION_REQUIRED' };
    }
    return {
      ...state,
      status: 'COMPLETE',
      completedStepIds: [...state.completedStepIds, current.id],
      holdReason: undefined,
    };
  }

  if (current.kind === 'GATE') {
    if (event.type !== 'SUBMIT_GATE' || event.gate !== current.gate) {
      return { ...state, status: 'HOLD', holdReason: `${current.gate}_REQUIRED` };
    }

    const gateResults = { ...state.gateResults, [current.gate]: event.result };
    if (event.result !== 'PASS') {
      return {
        ...state,
        status: 'HOLD',
        gateResults,
        holdReason: `${current.gate}_FAILED`,
      };
    }

    return advance(state, current.id, gateResults);
  }

  if (event.type !== 'CONFIRM_CURRENT') {
    return { ...state, status: 'HOLD', holdReason: 'STEP_CONFIRMATION_REQUIRED' };
  }

  return advance(state, current.id, state.gateResults);
}

function productStep(product: Product): NutritionExecutionStep {
  if (!product.mixingRole) {
    throw new Error(`MISSING_MIXING_ROLE: ${product.id}`);
  }
  return {
    id: `product:${product.id}`,
    kind: 'PRODUCT',
    productId: product.id,
    role: product.mixingRole,
    label: product.name,
  };
}

function advance(
  state: NutritionExecutionState,
  completedStepId: string,
  gateResults: NutritionExecutionState['gateResults'],
): NutritionExecutionState {
  return {
    ...state,
    currentIndex: Math.min(state.currentIndex + 1, state.steps.length - 1),
    status: 'ACTIVE',
    gateResults,
    completedStepIds: [...state.completedStepIds, completedStepId],
    holdReason: undefined,
  };
}
