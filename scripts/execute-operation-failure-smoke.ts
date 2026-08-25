import assert from 'node:assert/strict';
import { FACTORY_RECIPES, SHOGUN_PRODUCTS } from '../src/data';
import {
  executeOperation,
  type ExecuteOperationRequest,
  type ExecuteOperationState,
  type OperationPersistenceAdapter,
} from '../src/executeOperation';
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

function cloneState(state: ExecuteOperationState): ExecuteOperationState {
  return JSON.parse(JSON.stringify(state)) as ExecuteOperationState;
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

function makeState(stateRevision = 0): ExecuteOperationState {
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
    history: [],
    receipts: [],
    currentMedium: Medium.TERRA,
    currentWaterProfile: WaterType.CUSTOM,
  };
}

function makeRequest(overrides: Partial<ExecuteOperationRequest> = {}): ExecuteOperationRequest {
  const base: ExecuteOperationRequest = {
    operationId: 'op-p0-001',
    expectedStateRevision: 0,
    planSnapshotId: 'snapshot-p0-001',
    planSnapshotHash: 'sha256:test-snapshot-p0-001',
    context: {
      recipeId: verifiedRecipe.id,
      stage: GrowthStage.VEG,
      week: 1,
      medium: Medium.TERRA,
      waterType: WaterType.CUSTOM,
      volumeLitres: 5,
      measurements: {
        preBasePh: 6.5,
        finalEc: 1.2,
        finalPh: 6.2,
      },
      confirmedProtocolStepIds: [...protocolStepIds],
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

const fixedClock = { now: () => '2026-08-25T17:30:00.000Z' };

// 1. STALE STATE: no write, no stock mutation, no false success.
{
  const persistence = new MemoryPersistence(makeState(2));
  const before = persistence.snapshot();
  const result = executeOperation(
    makeRequest({ expectedStateRevision: 1, operationId: 'op-stale' }),
    persistence,
    fixedClock,
  );

  assert.equal(result.status, 'STALE_STATE');
  assert.equal(persistence.commitCount, 0);
  assert.deepEqual(persistence.snapshot(), before);
}

// 2. DOUBLE SUBMIT: same operationId commits exactly once and then returns ALREADY_COMMITTED.
{
  const persistence = new MemoryPersistence(makeState());
  const request = makeRequest({ operationId: 'op-double-submit' });
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
  const persistence = new MemoryPersistence(makeState());
  const first = executeOperation(
    makeRequest({ operationId: 'op-collision' }),
    persistence,
    fixedClock,
  );
  assert.equal(first.status, 'COMMITTED');

  const beforeCollision = persistence.snapshot();
  const collision = executeOperation(
    makeRequest({
      operationId: 'op-collision',
      context: { ...makeRequest().context, volumeLitres: 6 },
    }),
    persistence,
    fixedClock,
  );
  assert.equal(collision.status, 'REJECTED');
  assert.ok(collision.blockers.some(item => item.code === 'OPERATION_ID_COLLISION'));
  assert.deepEqual(persistence.snapshot(), beforeCollision);
}

// 4. STORAGE WRITE FAILURE: never returns COMMITTED and source state remains unchanged.
{
  const persistence = new MemoryPersistence(makeState());
  persistence.failCommit = true;
  const before = persistence.snapshot();
  const result = executeOperation(
    makeRequest({ operationId: 'op-write-failure' }),
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
  const persistence = new MemoryPersistence(makeState());
  persistence.failLoad = true;
  const result = executeOperation(
    makeRequest({ operationId: 'op-read-failure' }),
    persistence,
    fixedClock,
  );

  assert.equal(result.status, 'PERSISTENCE_FAILED');
  assert.equal(persistence.commitCount, 0);
}

// 6. RELOAD/REPLAY: a fresh adapter with persisted receipt recognizes the operation.
{
  const firstRuntime = new MemoryPersistence(makeState());
  const request = makeRequest({ operationId: 'op-reload' });
  const first = executeOperation(request, firstRuntime, fixedClock);
  assert.equal(first.status, 'COMMITTED');

  const reloadedRuntime = new MemoryPersistence(firstRuntime.snapshot());
  const replay = executeOperation(request, reloadedRuntime, fixedClock);
  assert.equal(replay.status, 'ALREADY_COMMITTED');
  assert.equal(reloadedRuntime.commitCount, 0);
  assert.equal(reloadedRuntime.snapshot().history.length, 1);
  assert.equal(reloadedRuntime.snapshot().receipts.length, 1);
}

// 7. STAGE MISMATCH: physical boundary compares selected stage with recipe stage.
{
  const persistence = new MemoryPersistence(makeState());
  const before = persistence.snapshot();
  const result = executeOperation(
    makeRequest({
      operationId: 'op-stage-mismatch',
      context: { ...makeRequest().context, stage: GrowthStage.BLOOM },
    }),
    persistence,
    fixedClock,
  );

  assert.equal(result.status, 'REJECTED');
  assert.ok(result.blockers.some(item => item.code === 'STAGE_MISMATCH'));
  assert.equal(persistence.commitCount, 0);
  assert.deepEqual(persistence.snapshot(), before);
}

console.log('execute operation failure-first smoke: PASS');
