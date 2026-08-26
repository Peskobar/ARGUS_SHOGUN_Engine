import assert from 'node:assert/strict';
import { FACTORY_RECIPES, SHOGUN_PRODUCTS } from '../src/data';
import {
  executeOperation,
  type ExecuteOperationRequest,
  type ExecuteOperationState,
  type OperationPersistenceAdapter,
} from '../src/executeOperation';
import {
  createPlanSnapshot,
  PLAN_EXECUTION_MODEL_VERSION,
  PLAN_SNAPSHOT_SCHEMA_VERSION,
  type PlanSnapshot,
} from '../src/planSnapshot';
import { buildExecutionProtocol } from '../src/recipeEngine';
import { GrowthStage, Medium, WaterType } from '../src/types';

const factoryRecipe = FACTORY_RECIPES.find(recipe => recipe.id === 'rec-terra-veg-early');
assert.ok(factoryRecipe, 'Expected rec-terra-veg-early fixture');

const verifiedRecipe = {
  ...factoryRecipe,
  id: 'p0-execute-operation-verified-fixture',
  verificationStatus: 'VERIFIED' as const,
  executionPolicy: 'PHYSICAL_ALLOWED' as const,
};

const protocolStepIds = buildExecutionProtocol(verifiedRecipe, SHOGUN_PRODUCTS).map(step => step.id);
const FIXTURE_VOLUME_LITRES = 5;

function makePlanSnapshot(overrides: Partial<PlanSnapshot> = {}): PlanSnapshot {
  const sourceStateRevision = overrides.sourceStateRevision ?? 0;
  const volumeLitres = overrides.volumeLitres ?? FIXTURE_VOLUME_LITRES;
  const doseLines = verifiedRecipe.ingredients
    .filter(ingredient => ingredient.concentration > 0)
    .flatMap((ingredient, index) => {
      const product = SHOGUN_PRODUCTS.find(item => item.id === ingredient.productId);
      if (!product || product.unit !== 'ml') return [];
      return [{
        lineId: `line-${index}-${ingredient.productId}`,
        productId: ingredient.productId,
        concentrationPerL: ingredient.concentration,
        calculatedAmount: Number((ingredient.concentration * volumeLitres).toFixed(2)),
        unit: 'ml' as const,
        sourceRef: `${verifiedRecipe.source ?? 'fixture'}:${verifiedRecipe.sourceVersion ?? 'unversioned'}`,
      }];
    });

  const created = createPlanSnapshot({
    schemaVersion: PLAN_SNAPSHOT_SCHEMA_VERSION,
    executionModelVersion: PLAN_EXECUTION_MODEL_VERSION,
    planId: overrides.planId ?? `snapshot-rev-${sourceStateRevision}`,
    createdAt: overrides.createdAt ?? '2026-08-26T18:00:00.000Z',
    origin: overrides.origin ?? 'TECHNICIAN',
    sourceStateRevision,
    recipeId: overrides.recipeId ?? verifiedRecipe.id,
    recipeSourceVersion: overrides.recipeSourceVersion ?? verifiedRecipe.sourceVersion,
    recipeVerificationStatus: overrides.recipeVerificationStatus ?? 'VERIFIED',
    recipeExecutionPolicy: overrides.recipeExecutionPolicy ?? 'PHYSICAL_ALLOWED',
    method: overrides.method ?? verifiedRecipe.method,
    stage: overrides.stage ?? GrowthStage.VEG,
    week: overrides.week ?? 1,
    medium: overrides.medium ?? Medium.TERRA,
    waterContext: overrides.waterContext ?? {
      waterType: WaterType.CUSTOM,
      provenanceKind: 'USER_MEASURED',
      sourceId: 'p0-test-water',
      sourceVersion: '1',
    },
    volumeLitres,
    readyToUseVolumeMl: overrides.readyToUseVolumeMl,
    verdict: overrides.verdict ?? 'GO',
    capability: overrides.capability ?? 'PHYSICAL_ALLOWED',
    blockers: overrides.blockers ? [...overrides.blockers] : [],
    doseLines: overrides.doseLines ? overrides.doseLines.map(line => ({ ...line })) : doseLines,
    canonicalStepIds: overrides.canonicalStepIds ? [...overrides.canonicalStepIds] : [...protocolStepIds],
  });

  return { ...created, waterContext: { ...created.waterContext }, blockers: [...created.blockers], doseLines: created.doseLines.map(line => ({ ...line })), canonicalStepIds: [...created.canonicalStepIds] };
}

function cloneState(state: ExecuteOperationState): ExecuteOperationState {
  return {
    ...state,
    inventory: state.inventory.map(product => ({ ...product, compatibleMedia: [...product.compatibleMedia] })),
    recipes: state.recipes.map(recipe => ({
      ...recipe,
      medium: [...recipe.medium],
      waterProfiles: recipe.waterProfiles ? [...recipe.waterProfiles] : undefined,
      ingredients: recipe.ingredients.map(ingredient => ({ ...ingredient })),
    })),
    planSnapshots: state.planSnapshots.map(snapshot => ({
      ...snapshot,
      waterContext: { ...snapshot.waterContext },
      blockers: [...snapshot.blockers],
      doseLines: snapshot.doseLines.map(line => ({ ...line })),
      canonicalStepIds: [...snapshot.canonicalStepIds],
    })),
    history: state.history.map(item => ({
      ...item,
      doses: { ...item.doses },
      measurements: item.measurements ? { ...item.measurements } : undefined,
      tools: item.tools ? item.tools.map(tool => ({ ...tool })) : undefined,
      confirmedProtocolStepIds: item.confirmedProtocolStepIds ? [...item.confirmedProtocolStepIds] : undefined,
    })),
    receipts: state.receipts.map(receipt => ({ ...receipt })),
  };
}

class MemoryPersistence implements OperationPersistenceAdapter {
  private state: ExecuteOperationState;
  public commitCount = 0;
  public failLoad = false;
  public failCommit = false;

  constructor(initial: ExecuteOperationState) {
    this.state = cloneState(initial);
  }

  load(): ExecuteOperationState {
    if (this.failLoad) throw new Error('synthetic read failure');
    return cloneState(this.state);
  }

  commit(nextState: ExecuteOperationState): void {
    if (this.failCommit) throw new Error('synthetic write failure');
    this.state = cloneState(nextState);
    this.commitCount += 1;
  }

  snapshot(): ExecuteOperationState {
    return cloneState(this.state);
  }
}

function makeState(stateRevision = 0, snapshot = makePlanSnapshot({ sourceStateRevision: stateRevision })): ExecuteOperationState {
  return {
    stateRevision,
    inventory: SHOGUN_PRODUCTS.map(product => ({
      ...product,
      compatibleMedia: [...product.compatibleMedia],
    })),
    recipes: [{
      ...verifiedRecipe,
      medium: [...verifiedRecipe.medium],
      ingredients: verifiedRecipe.ingredients.map(ingredient => ({ ...ingredient })),
      waterProfiles: verifiedRecipe.waterProfiles ? [...verifiedRecipe.waterProfiles] : undefined,
    }],
    planSnapshots: [snapshot],
    history: [],
    receipts: [],
    currentMedium: Medium.TERRA,
    currentWaterProfile: WaterType.CUSTOM,
  };
}

function makeRequest(
  overrides: Partial<ExecuteOperationRequest> = {},
  snapshot = makePlanSnapshot(),
): ExecuteOperationRequest {
  const base: ExecuteOperationRequest = {
    operationId: 'op-p0-001',
    expectedStateRevision: snapshot.sourceStateRevision,
    planSnapshotId: snapshot.planId,
    planSnapshotHash: snapshot.contentHash,
    context: {
      recipeId: snapshot.recipeId,
      stage: snapshot.stage,
      week: snapshot.week,
      medium: snapshot.medium,
      waterType: snapshot.waterContext.waterType,
      volumeLitres: snapshot.volumeLitres,
      readyToUseVolumeMl: snapshot.readyToUseVolumeMl,
      measurements: {
        preBasePh: 6.5,
        finalEc: 1.2,
        finalPh: 6.2,
      },
      confirmedProtocolStepIds: [...snapshot.canonicalStepIds],
    },
  };

  return {
    ...base,
    ...overrides,
    context: {
      ...base.context,
      ...(overrides.context ?? {}),
      measurements: {
        ...base.context.measurements,
        ...(overrides.context?.measurements ?? {}),
      },
      confirmedProtocolStepIds: overrides.context?.confirmedProtocolStepIds
        ? [...overrides.context.confirmedProtocolStepIds]
        : [...base.context.confirmedProtocolStepIds],
    },
  };
}

const fixedClock = { now: () => '2026-08-26T18:30:00.000Z' };

// 1. STALE STATE: no write, no stock mutation, no false success.
{
  const snapshot = makePlanSnapshot({ sourceStateRevision: 2 });
  const persistence = new MemoryPersistence(makeState(2, snapshot));
  const before = persistence.snapshot();
  const result = executeOperation(
    makeRequest({ expectedStateRevision: 1, operationId: 'op-stale' }, snapshot),
    persistence,
    fixedClock,
  );

  assert.equal(result.status, 'STALE_STATE');
  assert.equal(persistence.commitCount, 0);
  assert.deepEqual(persistence.snapshot(), before);
}

// 2. DOUBLE SUBMIT: same operationId commits exactly once and then returns ALREADY_COMMITTED.
{
  const snapshot = makePlanSnapshot();
  const persistence = new MemoryPersistence(makeState(0, snapshot));
  const request = makeRequest({ operationId: 'op-double-submit' }, snapshot);
  const first = executeOperation(request, persistence, fixedClock);
  assert.equal(first.status, 'COMMITTED', first.blockers.map(item => item.message).join('\n'));

  const afterFirst = persistence.snapshot();
  assert.equal(afterFirst.stateRevision, 1);
  assert.equal(afterFirst.history.length, 1);
  assert.equal(afterFirst.receipts.length, 1);
  assert.equal(persistence.commitCount, 1);

  const second = executeOperation(request, persistence, fixedClock);
  assert.equal(second.status, 'ALREADY_COMMITTED');
  assert.equal(persistence.commitCount, 1);
  assert.deepEqual(persistence.snapshot(), afterFirst);
}

// 3. operationId collision cannot replay a different request under an existing receipt.
{
  const snapshot = makePlanSnapshot();
  const persistence = new MemoryPersistence(makeState(0, snapshot));
  const first = executeOperation(
    makeRequest({ operationId: 'op-collision' }, snapshot),
    persistence,
    fixedClock,
  );
  assert.equal(first.status, 'COMMITTED');

  const beforeCollision = persistence.snapshot();
  const collision = executeOperation(
    makeRequest({
      operationId: 'op-collision',
      context: { ...makeRequest({}, snapshot).context, volumeLitres: 6 },
    }, snapshot),
    persistence,
    fixedClock,
  );
  assert.equal(collision.status, 'REJECTED');
  assert.ok(collision.blockers.some(item => item.code === 'OPERATION_ID_COLLISION'));
  assert.deepEqual(persistence.snapshot(), beforeCollision);
}

// 4. STORAGE WRITE FAILURE: never returns COMMITTED and source state remains unchanged.
{
  const snapshot = makePlanSnapshot();
  const persistence = new MemoryPersistence(makeState(0, snapshot));
  persistence.failCommit = true;
  const before = persistence.snapshot();
  const result = executeOperation(
    makeRequest({ operationId: 'op-write-failure' }, snapshot),
    persistence,
    fixedClock,
  );

  assert.equal(result.status, 'PERSISTENCE_FAILED');
  assert.equal(result.committedState, undefined);
  assert.equal(persistence.commitCount, 0);
  assert.deepEqual(persistence.snapshot(), before);
}

// 5. STORAGE READ FAILURE: boundary fails closed instead of throwing into the UI.
{
  const snapshot = makePlanSnapshot();
  const persistence = new MemoryPersistence(makeState(0, snapshot));
  persistence.failLoad = true;
  const result = executeOperation(
    makeRequest({ operationId: 'op-read-failure' }, snapshot),
    persistence,
    fixedClock,
  );

  assert.equal(result.status, 'PERSISTENCE_FAILED');
  assert.equal(persistence.commitCount, 0);
}

// 6. RELOAD/REPLAY: a fresh adapter with persisted receipt recognizes the operation.
{
  const snapshot = makePlanSnapshot();
  const firstRuntime = new MemoryPersistence(makeState(0, snapshot));
  const request = makeRequest({ operationId: 'op-reload' }, snapshot);
  const first = executeOperation(request, firstRuntime, fixedClock);
  assert.equal(first.status, 'COMMITTED');

  const reloadedRuntime = new MemoryPersistence(firstRuntime.snapshot());
  const replay = executeOperation(request, reloadedRuntime, fixedClock);
  assert.equal(replay.status, 'ALREADY_COMMITTED');
  assert.equal(reloadedRuntime.commitCount, 0);
  assert.equal(reloadedRuntime.snapshot().history.length, 1);
  assert.equal(reloadedRuntime.snapshot().receipts.length, 1);
}

// 7. STAGE MISMATCH / forged request context cannot bypass immutable snapshot.
{
  const snapshot = makePlanSnapshot();
  const persistence = new MemoryPersistence(makeState(0, snapshot));
  const before = persistence.snapshot();
  const result = executeOperation(
    makeRequest({
      operationId: 'op-stage-mismatch',
      context: { ...makeRequest({}, snapshot).context, stage: GrowthStage.BLOOM },
    }, snapshot),
    persistence,
    fixedClock,
  );

  assert.equal(result.status, 'REJECTED');
  assert.ok(result.blockers.some(item => item.code === 'PLAN_CONTEXT_MISMATCH'));
  assert.equal(persistence.commitCount, 0);
  assert.deepEqual(persistence.snapshot(), before);
}

// 8. Forged caller hash is rejected even if planId exists.
{
  const snapshot = makePlanSnapshot();
  const persistence = new MemoryPersistence(makeState(0, snapshot));
  const result = executeOperation(
    makeRequest({ operationId: 'op-forged-hash', planSnapshotHash: 'fnv1a64:deadbeefdeadbeef' }, snapshot),
    persistence,
    fixedClock,
  );
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.blockers.some(item => item.code === 'PLAN_SNAPSHOT_HASH_MISMATCH'));
  assert.equal(persistence.commitCount, 0);
}

// 9. Tampering the authoritative snapshot without recomputing hash is rejected.
{
  const snapshot = makePlanSnapshot();
  const tampered = { ...snapshot, volumeLitres: 50 };
  const persistence = new MemoryPersistence(makeState(0, tampered));
  const result = executeOperation(
    makeRequest({ operationId: 'op-tampered-snapshot' }, snapshot),
    persistence,
    fixedClock,
  );
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.blockers.some(item => item.code === 'PLAN_SNAPSHOT_INVALID'));
  assert.equal(persistence.commitCount, 0);
}

// 10. Unknown snapshot cannot be supplied by the caller as execution authority.
{
  const authoritative = makePlanSnapshot({ planId: 'known-plan' });
  const forged = makePlanSnapshot({ planId: 'caller-created-plan' });
  const persistence = new MemoryPersistence(makeState(0, authoritative));
  const result = executeOperation(
    makeRequest({ operationId: 'op-unknown-snapshot' }, forged),
    persistence,
    fixedClock,
  );
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.blockers.some(item => item.code === 'UNKNOWN_PLAN_SNAPSHOT'));
  assert.equal(persistence.commitCount, 0);
}

// 11. HOLD and SIMULATION_ONLY snapshot never receives physical capability.
{
  for (const snapshot of [
    makePlanSnapshot({ planId: 'hold-plan', verdict: 'HOLD' }),
    makePlanSnapshot({ planId: 'simulation-plan', capability: 'SIMULATION_ONLY' }),
  ]) {
    const persistence = new MemoryPersistence(makeState(0, snapshot));
    const result = executeOperation(
      makeRequest({ operationId: `op-${snapshot.planId}` }, snapshot),
      persistence,
      fixedClock,
    );
    assert.equal(result.status, 'REJECTED');
    assert.ok(result.blockers.some(item => item.code === 'PLAN_NOT_EXECUTABLE'));
    assert.equal(persistence.commitCount, 0);
  }
}

// 12. Zero/negative/non-finite root-feed volume is rejected at the domain boundary.
{
  for (const volumeLitres of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const snapshot = makePlanSnapshot({ planId: `bad-volume-${String(volumeLitres)}`, volumeLitres });
    const persistence = new MemoryPersistence(makeState(0, snapshot));
    const result = executeOperation(
      makeRequest({ operationId: `op-bad-volume-${String(volumeLitres)}` }, snapshot),
      persistence,
      fixedClock,
    );
    assert.equal(result.status, 'REJECTED');
    assert.ok(result.blockers.some(item => item.code === 'PLAN_SNAPSHOT_INVALID'));
    assert.equal(persistence.commitCount, 0);
  }
}

// 13. NaN/Infinity measured gates never pass as valid physical evidence.
{
  for (const measurements of [
    { preBasePh: 6.5, finalEc: Number.NaN, finalPh: 6.2 },
    { preBasePh: 6.5, finalEc: Number.POSITIVE_INFINITY, finalPh: 6.2 },
    { preBasePh: 6.5, finalEc: 1.2, finalPh: Number.NaN },
  ]) {
    const snapshot = makePlanSnapshot();
    const persistence = new MemoryPersistence(makeState(0, snapshot));
    const result = executeOperation(
      makeRequest({
        operationId: `op-bad-measurement-${String(measurements.finalEc)}-${String(measurements.finalPh)}`,
        context: { ...makeRequest({}, snapshot).context, measurements },
      }, snapshot),
      persistence,
      fixedClock,
    );
    assert.equal(result.status, 'REJECTED');
    assert.equal(persistence.commitCount, 0);
  }
}

// 14. Returned committed state/history are defensive copies, not writable store references.
{
  const snapshot = makePlanSnapshot();
  const persistence = new MemoryPersistence(makeState(0, snapshot));
  const result = executeOperation(
    makeRequest({ operationId: 'op-defensive-copy' }, snapshot),
    persistence,
    fixedClock,
  );
  assert.equal(result.status, 'COMMITTED');
  assert.ok(result.committedState);
  assert.ok(result.historyItem);

  const durableBeforeMutation = persistence.snapshot();
  result.committedState.inventory[0].remainingCapacity = 999999;
  result.historyItem.id = 'tampered-return-object';
  assert.deepEqual(persistence.snapshot(), durableBeforeMutation);
}

console.log('execute operation P0 failure-first + adversarial smoke: PASS');
