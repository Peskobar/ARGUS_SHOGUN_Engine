import { evaluateExecutionReadiness, type ExecutionBlocker } from './executionPolicy';
import type {
  ExecutionMeasurements,
  GrowthStage,
  HistoryItem,
  Medium,
  Product,
  Recipe,
  ToolAuditItem,
  WaterType,
} from './types';

export type ExecuteOperationStatus =
  | 'COMMITTED'
  | 'ALREADY_COMMITTED'
  | 'STALE_STATE'
  | 'REJECTED'
  | 'PERSISTENCE_FAILED';

export interface ExecuteOperationContext {
  recipeId: string;
  stage: GrowthStage;
  week?: number;
  medium: Medium;
  waterType: WaterType;
  volumeLitres: number;
  readyToUseVolumeMl?: number;
  measurements: ExecutionMeasurements;
  confirmedProtocolStepIds: string[];
}

/**
 * Contract boundary for one physical execution attempt.
 *
 * planSnapshotId/planSnapshotHash are opaque identifiers in this P0 slice.
 * Their semantic generation/verification belongs to the immutable PlanSnapshot
 * work; this boundary already requires and persists them so callers cannot
 * silently omit snapshot identity.
 */
export interface ExecuteOperationRequest {
  operationId: string;
  expectedStateRevision: number;
  planSnapshotId: string;
  planSnapshotHash: string;
  context: ExecuteOperationContext;
}

export interface OperationReceipt {
  operationId: string;
  planSnapshotId: string;
  planSnapshotHash: string;
  requestFingerprint: string;
  recipeId: string;
  historyItemId: string;
  committedRevision: number;
  committedAt: string;
}

export interface ExecuteOperationState {
  stateRevision: number;
  inventory: Product[];
  recipes: Recipe[];
  history: HistoryItem[];
  receipts: OperationReceipt[];
  currentMedium: Medium;
  currentWaterProfile: WaterType;
}

export type ExecuteOperationBlocker =
  | ExecutionBlocker
  | {
      code:
        | 'INVALID_OPERATION_ID'
        | 'INVALID_STATE_REVISION'
        | 'INVALID_PLAN_SNAPSHOT_ID'
        | 'INVALID_PLAN_SNAPSHOT_HASH'
        | 'OPERATION_ID_COLLISION'
        | 'STAGE_MISMATCH'
        | 'CONTEXT_MISMATCH'
        | 'INVENTORY_SHORTAGE';
      message: string;
    };

export interface ExecuteOperationResult {
  status: ExecuteOperationStatus;
  blockers: ExecuteOperationBlocker[];
  receipt?: OperationReceipt;
  historyItem?: HistoryItem;
  committedState?: ExecuteOperationState;
  actualStateRevision?: number;
}

/**
 * The adapter owns durable storage. commit() must synchronously throw or return.
 * ExecuteOperation never reports COMMITTED before commit() returns successfully.
 */
export interface OperationPersistenceAdapter {
  load(): ExecuteOperationState;
  commit(nextState: ExecuteOperationState): void;
}

export interface ExecuteOperationDependencies {
  now?: () => string;
}

/**
 * Single-operation transaction boundary.
 *
 * Invariants in this P0 slice:
 * - duplicate operationId is idempotent after durable commit;
 * - stale state fails closed before inventory/history mutation;
 * - selected stage must match the recipe stage (or recipe ALL);
 * - inventory requirements are aggregated per productId;
 * - inventory + history + receipt + stateRevision are committed as one state;
 * - persistence failure never returns COMMITTED and never exposes a committedState.
 */
export function executeOperation(
  request: ExecuteOperationRequest,
  persistence: OperationPersistenceAdapter,
  dependencies: ExecuteOperationDependencies = {},
): ExecuteOperationResult {
  const requestValidation = validateRequest(request);
  if (requestValidation.length) {
    return { status: 'REJECTED', blockers: requestValidation };
  }

  let current: ExecuteOperationState;
  try {
    current = persistence.load();
  } catch (error) {
    return {
      status: 'PERSISTENCE_FAILED',
      blockers: [{ code: 'CONTEXT_MISMATCH', message: `Nie udało się odczytać trwałego stanu: ${errorMessage(error)}.` }],
    };
  }

  const fingerprint = buildRequestFingerprint(request);
  const previousReceipt = current.receipts.find(receipt => receipt.operationId === request.operationId);
  if (previousReceipt) {
    if (previousReceipt.requestFingerprint !== fingerprint) {
      return {
        status: 'REJECTED',
        blockers: [{
          code: 'OPERATION_ID_COLLISION',
          message: 'operationId był już użyty dla innego żądania wykonania.',
        }],
        actualStateRevision: current.stateRevision,
      };
    }

    return {
      status: 'ALREADY_COMMITTED',
      blockers: [],
      receipt: previousReceipt,
      historyItem: current.history.find(item => item.id === previousReceipt.historyItemId),
      actualStateRevision: current.stateRevision,
    };
  }

  if (current.stateRevision !== request.expectedStateRevision) {
    return {
      status: 'STALE_STATE',
      blockers: [{
        code: 'CONTEXT_MISMATCH',
        message: `Stan zmienił się od utworzenia planu: oczekiwano rewizji ${request.expectedStateRevision}, aktualna to ${current.stateRevision}.`,
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  if (current.currentMedium !== request.context.medium || current.currentWaterProfile !== request.context.waterType) {
    return {
      status: 'STALE_STATE',
      blockers: [{
        code: 'CONTEXT_MISMATCH',
        message: 'Aktualny kontekst medium/wody różni się od kontekstu żądania wykonania.',
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  const recipe = current.recipes.find(item => item.id === request.context.recipeId);
  if (!recipe) {
    return {
      status: 'REJECTED',
      blockers: [{ code: 'RECIPE_VALIDATION', message: 'Nie znaleziono receptury.' }],
      actualStateRevision: current.stateRevision,
    };
  }

  if (String(recipe.stage) !== 'ALL' && recipe.stage !== request.context.stage) {
    return {
      status: 'REJECTED',
      blockers: [{
        code: 'STAGE_MISMATCH',
        message: `Wybrany etap ${request.context.stage} nie odpowiada etapowi receptury ${recipe.stage}.`,
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  const readiness = evaluateExecutionReadiness({
    recipe,
    products: current.inventory,
    medium: request.context.medium,
    stage: request.context.stage,
    week: request.context.week,
    waterType: request.context.waterType,
    volumeLitres: request.context.volumeLitres,
    readyToUseVolumeMl: request.context.readyToUseVolumeMl,
    measurements: request.context.measurements,
    confirmedProtocolStepIds: request.context.confirmedProtocolStepIds,
  });

  if (!readiness.allowed) {
    return {
      status: 'REJECTED',
      blockers: readiness.blockers,
      actualStateRevision: current.stateRevision,
    };
  }

  const requirements = aggregateRequirements(readiness.requirements);
  const stockBlockers: ExecuteOperationBlocker[] = [];
  for (const [productId, amountMl] of requirements) {
    const product = current.inventory.find(item => item.id === productId);
    if (!product || product.remainingCapacity + 0.005 < amountMl) {
      stockBlockers.push({
        code: 'INVENTORY_SHORTAGE',
        message: product
          ? `${product.name}: potrzeba ${amountMl} ml, dostępne ${roundMl(product.remainingCapacity)} ml.`
          : `Brak produktu ${productId} w aktualnym magazynie.`,
      });
    }
  }
  if (stockBlockers.length) {
    return {
      status: 'REJECTED',
      blockers: stockBlockers,
      actualStateRevision: current.stateRevision,
    };
  }

  const now = (dependencies.now ?? (() => new Date().toISOString()))();
  const historyItemId = `operation:${request.operationId}`;
  const totalMl = roundMl([...requirements.values()].reduce((sum, amount) => sum + amount, 0));
  const isReadyToSpray = String(recipe.method) === 'READY_TO_SPRAY';
  const historyItem: HistoryItem = {
    id: historyItemId,
    date: now,
    volume: isReadyToSpray ? (request.context.readyToUseVolumeMl ?? 0) : request.context.volumeLitres,
    volumeUnit: isReadyToSpray ? 'ml' : 'L',
    recipeId: recipe.id,
    method: recipe.method,
    doses: Object.fromEntries(recipe.ingredients.map(ingredient => [ingredient.productId, ingredient.concentration])),
    totalMl,
    stage: request.context.stage,
    week: request.context.week,
    medium: request.context.medium,
    waterProfile: request.context.waterType,
    recipeVerificationStatus: recipe.verificationStatus,
    recipeExecutionPolicy: recipe.executionPolicy,
    recipeSource: recipe.source,
    recipeSourceUrl: recipe.sourceUrl,
    recipeSourceVersion: recipe.sourceVersion,
    measurements: { ...request.context.measurements },
    tools: toolAudit(readiness.toolSet.assignments),
    confirmedProtocolStepIds: [...request.context.confirmedProtocolStepIds],
    lifecycleStatus: 'EXECUTED',
    approvalState: 'VERIFIED_RECIPE',
  };

  const nextRevision = current.stateRevision + 1;
  const receipt: OperationReceipt = {
    operationId: request.operationId,
    planSnapshotId: request.planSnapshotId,
    planSnapshotHash: request.planSnapshotHash,
    requestFingerprint: fingerprint,
    recipeId: recipe.id,
    historyItemId,
    committedRevision: nextRevision,
    committedAt: now,
  };

  const nextState: ExecuteOperationState = {
    ...current,
    stateRevision: nextRevision,
    inventory: current.inventory.map(product => {
      const amount = requirements.get(product.id) ?? 0;
      return amount > 0
        ? { ...product, remainingCapacity: roundMl(product.remainingCapacity - amount) }
        : product;
    }),
    history: [historyItem, ...current.history],
    receipts: [receipt, ...current.receipts],
  };

  try {
    persistence.commit(nextState);
  } catch (error) {
    return {
      status: 'PERSISTENCE_FAILED',
      blockers: [{
        code: 'CONTEXT_MISMATCH',
        message: `Nie udało się trwale zapisać operacji: ${errorMessage(error)}.`,
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  return {
    status: 'COMMITTED',
    blockers: [],
    receipt,
    historyItem,
    committedState: nextState,
    actualStateRevision: nextState.stateRevision,
  };
}

function validateRequest(request: ExecuteOperationRequest): ExecuteOperationBlocker[] {
  const blockers: ExecuteOperationBlocker[] = [];
  if (!safeToken(request.operationId)) {
    blockers.push({ code: 'INVALID_OPERATION_ID', message: 'operationId jest wymagany i musi być niepustym identyfikatorem.' });
  }
  if (!Number.isInteger(request.expectedStateRevision) || request.expectedStateRevision < 0) {
    blockers.push({ code: 'INVALID_STATE_REVISION', message: 'expectedStateRevision musi być nieujemną liczbą całkowitą.' });
  }
  if (!safeToken(request.planSnapshotId)) {
    blockers.push({ code: 'INVALID_PLAN_SNAPSHOT_ID', message: 'planSnapshotId jest wymagany.' });
  }
  if (!safeToken(request.planSnapshotHash)) {
    blockers.push({ code: 'INVALID_PLAN_SNAPSHOT_HASH', message: 'planSnapshotHash jest wymagany.' });
  }
  return blockers;
}

function buildRequestFingerprint(request: ExecuteOperationRequest): string {
  return JSON.stringify({
    planSnapshotId: request.planSnapshotId,
    planSnapshotHash: request.planSnapshotHash,
    recipeId: request.context.recipeId,
    stage: request.context.stage,
    week: request.context.week ?? null,
    medium: request.context.medium,
    waterType: request.context.waterType,
    volumeLitres: request.context.volumeLitres,
    readyToUseVolumeMl: request.context.readyToUseVolumeMl ?? null,
    measurements: {
      preBasePh: request.context.measurements.preBasePh ?? null,
      finalEc: request.context.measurements.finalEc ?? null,
      finalPh: request.context.measurements.finalPh ?? null,
    },
    confirmedProtocolStepIds: [...request.context.confirmedProtocolStepIds],
  });
}

function aggregateRequirements(
  requirements: Array<{ productId: string; amountMl: number }>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const requirement of requirements) {
    result.set(
      requirement.productId,
      roundMl((result.get(requirement.productId) ?? 0) + requirement.amountMl),
    );
  }
  return result;
}

function toolAudit(
  assignments: Record<string, Array<{ instanceId: string; type: string; amount: number; precisionStep: number }>>,
): ToolAuditItem[] {
  return Object.entries(assignments).flatMap(([productId, tools]) =>
    tools.map(tool => ({
      productId,
      instanceId: tool.instanceId,
      label: tool.type,
      amountMl: tool.amount,
      precisionStep: tool.precisionStep,
    })),
  );
}

function safeToken(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 240;
}

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
