import { evaluateExecutionReadiness, type ExecutionBlocker } from './executionPolicy';
import {
  samePlanIdentity,
  validatePlanSnapshot,
  type PlanSnapshot,
} from './planSnapshot';
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
 * The caller supplies only snapshot identity. The authoritative PlanSnapshot is
 * loaded from ExecuteOperationState and verified before any readiness, stock,
 * history or persistence mutation is allowed.
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
  planSnapshots: PlanSnapshot[];
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
        | 'UNKNOWN_PLAN_SNAPSHOT'
        | 'PLAN_SNAPSHOT_INVALID'
        | 'PLAN_SNAPSHOT_HASH_MISMATCH'
        | 'PLAN_CONTEXT_MISMATCH'
        | 'PLAN_NOT_EXECUTABLE'
        | 'OPERATION_ID_COLLISION'
        | 'STAGE_MISMATCH'
        | 'CONTEXT_MISMATCH'
        | 'INVALID_VOLUME'
        | 'INVALID_READY_TO_USE_VOLUME'
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
 * - duplicate operationId is idempotent only for an identical request fingerprint;
 * - stale state fails closed before inventory/history mutation;
 * - snapshot identity, semantic hash and source state revision are authoritative;
 * - caller context must match the stored immutable snapshot;
 * - only GO + PHYSICAL_ALLOWED + VERIFIED recipe state may continue;
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
      receipt: { ...previousReceipt },
      historyItem: cloneHistoryItem(current.history.find(item => item.id === previousReceipt.historyItemId)),
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

  const authoritativeSnapshot = current.planSnapshots.find(snapshot => snapshot.planId === request.planSnapshotId);
  if (!authoritativeSnapshot) {
    return {
      status: 'REJECTED',
      blockers: [{ code: 'UNKNOWN_PLAN_SNAPSHOT', message: 'Nie znaleziono autorytatywnego PlanSnapshot dla tego wykonania.' }],
      actualStateRevision: current.stateRevision,
    };
  }

  const snapshotIssues = validatePlanSnapshot(authoritativeSnapshot);
  if (snapshotIssues.length) {
    return {
      status: 'REJECTED',
      blockers: snapshotIssues.map(issue => ({
        code: 'PLAN_SNAPSHOT_INVALID' as const,
        message: `${issue.code}: ${issue.message}`,
      })),
      actualStateRevision: current.stateRevision,
    };
  }

  if (authoritativeSnapshot.contentHash !== request.planSnapshotHash) {
    return {
      status: 'REJECTED',
      blockers: [{
        code: 'PLAN_SNAPSHOT_HASH_MISMATCH',
        message: 'planSnapshotHash żądania nie odpowiada autorytatywnemu snapshotowi.',
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  if (authoritativeSnapshot.sourceStateRevision !== request.expectedStateRevision) {
    return {
      status: 'STALE_STATE',
      blockers: [{
        code: 'CONTEXT_MISMATCH',
        message: `PlanSnapshot powstał dla rewizji ${authoritativeSnapshot.sourceStateRevision}, a żądanie oczekuje ${request.expectedStateRevision}.`,
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  if (!snapshotMatchesRequest(authoritativeSnapshot, request)) {
    return {
      status: 'REJECTED',
      blockers: [{
        code: 'PLAN_CONTEXT_MISMATCH',
        message: 'Kontekst wykonania różni się od autorytatywnego PlanSnapshot.',
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  if (authoritativeSnapshot.verdict !== 'GO' || authoritativeSnapshot.capability !== 'PHYSICAL_ALLOWED') {
    return {
      status: 'REJECTED',
      blockers: [{
        code: 'PLAN_NOT_EXECUTABLE',
        message: `Plan ma verdict=${authoritativeSnapshot.verdict} i capability=${authoritativeSnapshot.capability}; fizyczne wykonanie jest zabronione.`,
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

  if (
    authoritativeSnapshot.recipeId !== recipe.id
    || authoritativeSnapshot.method !== recipe.method
    || authoritativeSnapshot.recipeVerificationStatus !== recipe.verificationStatus
    || authoritativeSnapshot.recipeExecutionPolicy !== recipe.executionPolicy
    || (authoritativeSnapshot.recipeSourceVersion ?? null) !== (recipe.sourceVersion ?? null)
  ) {
    return {
      status: 'REJECTED',
      blockers: [{
        code: 'PLAN_CONTEXT_MISMATCH',
        message: 'Recipe authority/provenance zmieniło się od utworzenia PlanSnapshot.',
      }],
      actualStateRevision: current.stateRevision,
    };
  }

  if (recipe.verificationStatus !== 'VERIFIED' || recipe.executionPolicy !== 'PHYSICAL_ALLOWED') {
    return {
      status: 'REJECTED',
      blockers: [{
        code: 'PLAN_NOT_EXECUTABLE',
        message: 'Aktualna receptura nie ma VERIFIED + PHYSICAL_ALLOWED.',
      }],
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

  if (String(recipe.method) === 'READY_TO_SPRAY') {
    if (!Number.isFinite(request.context.readyToUseVolumeMl) || (request.context.readyToUseVolumeMl ?? 0) <= 0) {
      return {
        status: 'REJECTED',
        blockers: [{ code: 'INVALID_READY_TO_USE_VOLUME', message: 'READY_TO_SPRAY wymaga dodatniej, skończonej objętości ml.' }],
        actualStateRevision: current.stateRevision,
      };
    }
  } else if (!Number.isFinite(request.context.volumeLitres) || request.context.volumeLitres <= 0) {
    return {
      status: 'REJECTED',
      blockers: [{ code: 'INVALID_VOLUME', message: 'Objętość wykonania musi być dodatnią, skończoną liczbą litrów.' }],
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
  if (!snapshotMatchesRequirements(authoritativeSnapshot, requirements, current.inventory)) {
    return {
      status: 'REJECTED',
      blockers: [{
        code: 'PLAN_CONTEXT_MISMATCH',
        message: 'Dawki wynikające z bieżącej receptury nie odpowiadają dawkom zapisanym w PlanSnapshot.',
      }],
      actualStateRevision: current.stateRevision,
    };
  }

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
    planSnapshotId: authoritativeSnapshot.planId,
    planSnapshotHash: authoritativeSnapshot.contentHash,
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
        : { ...product };
    }),
    recipes: current.recipes.map(cloneRecipe),
    planSnapshots: current.planSnapshots.map(clonePlanSnapshot),
    history: [historyItem, ...current.history.map(item => cloneHistoryItem(item) as HistoryItem)],
    receipts: [receipt, ...current.receipts.map(item => ({ ...item }))],
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
    receipt: { ...receipt },
    historyItem: cloneHistoryItem(historyItem),
    committedState: cloneExecuteOperationState(nextState),
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

function snapshotMatchesRequest(snapshot: PlanSnapshot, request: ExecuteOperationRequest): boolean {
  return snapshot.recipeId === request.context.recipeId
    && snapshot.stage === request.context.stage
    && (snapshot.week ?? null) === (request.context.week ?? null)
    && snapshot.medium === request.context.medium
    && snapshot.waterContext.waterType === request.context.waterType
    && sameNumber(snapshot.volumeLitres, request.context.volumeLitres)
    && sameOptionalNumber(snapshot.readyToUseVolumeMl, request.context.readyToUseVolumeMl)
    && sameStringSet(snapshot.canonicalStepIds, request.context.confirmedProtocolStepIds);
}

function snapshotMatchesRequirements(
  snapshot: PlanSnapshot,
  requirements: Map<string, number>,
  products: Product[],
): boolean {
  if (snapshot.doseLines.length !== requirements.size) return false;

  for (const line of snapshot.doseLines) {
    const product = products.find(item => item.id === line.productId);
    if (!product || product.unit !== line.unit) return false;
    const required = requirements.get(line.productId);
    if (required === undefined || !sameNumber(roundMl(line.calculatedAmount), roundMl(required))) return false;
  }

  return true;
}

function buildRequestFingerprint(request: ExecuteOperationRequest): string {
  return JSON.stringify({
    planSnapshotId: request.planSnapshotId,
    planSnapshotHash: request.planSnapshotHash,
    expectedStateRevision: request.expectedStateRevision,
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
    confirmedProtocolStepIds: [...request.context.confirmedProtocolStepIds].sort(),
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

function cloneExecuteOperationState(state: ExecuteOperationState): ExecuteOperationState {
  return {
    ...state,
    inventory: state.inventory.map(product => ({
      ...product,
      compatibleMedia: [...product.compatibleMedia],
    })),
    recipes: state.recipes.map(cloneRecipe),
    planSnapshots: state.planSnapshots.map(clonePlanSnapshot),
    history: state.history.map(item => cloneHistoryItem(item) as HistoryItem),
    receipts: state.receipts.map(receipt => ({ ...receipt })),
  };
}

function cloneRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    medium: [...recipe.medium],
    waterProfiles: recipe.waterProfiles ? [...recipe.waterProfiles] : undefined,
    ingredients: recipe.ingredients.map(ingredient => ({ ...ingredient })),
  };
}

function clonePlanSnapshot(snapshot: PlanSnapshot): PlanSnapshot {
  return {
    ...snapshot,
    waterContext: { ...snapshot.waterContext },
    blockers: [...snapshot.blockers],
    doseLines: snapshot.doseLines.map(line => ({ ...line })),
    canonicalStepIds: [...snapshot.canonicalStepIds],
  };
}

function cloneHistoryItem(item: HistoryItem | undefined): HistoryItem | undefined {
  if (!item) return undefined;
  return {
    ...item,
    doses: { ...item.doses },
    measurements: item.measurements ? { ...item.measurements } : undefined,
    tools: item.tools ? item.tools.map(tool => ({ ...tool })) : undefined,
    confirmedProtocolStepIds: item.confirmedProtocolStepIds ? [...item.confirmedProtocolStepIds] : undefined,
  };
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

function sameNumber(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
}

function sameOptionalNumber(a?: number, b?: number): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return sameNumber(a, b);
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
