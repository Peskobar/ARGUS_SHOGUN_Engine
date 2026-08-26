import type {
  ApplicationMethod,
  GrowthStage,
  Medium,
  RecipeExecutionPolicy,
  RecipeVerificationStatus,
  WaterType,
} from './types';

export const PLAN_SNAPSHOT_SCHEMA_VERSION = 5 as const;
export const PLAN_EXECUTION_MODEL_VERSION = 'argus-execution-v1' as const;

export type PlanOrigin = 'TECHNICIAN' | 'MANUAL';
export type PlanVerdict = 'GO' | 'HOLD' | 'NO_GO';
export type PlanCapability = 'PHYSICAL_ALLOWED' | 'SIMULATION_ONLY';
export type PlanDoseUnit = 'ml' | 'g';
export type WaterProvenanceKind = 'REFERENCE' | 'OBSERVED' | 'USER_MEASURED';

export interface PlanDoseLine {
  lineId: string;
  productId: string;
  concentrationPerL?: number;
  calculatedAmount: number;
  unit: PlanDoseUnit;
  sourceRef: string;
}

export interface PlanWaterContext {
  waterType: WaterType;
  provenanceKind: WaterProvenanceKind;
  sourceId: string;
  sourceVersion?: string;
}

export interface PlanSnapshotSemanticPayload {
  schemaVersion: typeof PLAN_SNAPSHOT_SCHEMA_VERSION;
  executionModelVersion: typeof PLAN_EXECUTION_MODEL_VERSION;
  origin: PlanOrigin;
  sourceStateRevision: number;
  recipeId: string;
  recipeSourceVersion?: string;
  recipeVerificationStatus: RecipeVerificationStatus;
  recipeExecutionPolicy: RecipeExecutionPolicy;
  method: ApplicationMethod;
  stage: GrowthStage;
  week?: number;
  medium: Medium;
  waterContext: PlanWaterContext;
  volumeLitres: number;
  readyToUseVolumeMl?: number;
  verdict: PlanVerdict;
  capability: PlanCapability;
  blockers: string[];
  doseLines: PlanDoseLine[];
  canonicalStepIds: string[];
}

export interface PlanSnapshot extends PlanSnapshotSemanticPayload {
  planId: string;
  createdAt: string;
  contentHash: string;
}

export interface PlanSnapshotValidationIssue {
  code:
    | 'INVALID_SCHEMA_VERSION'
    | 'INVALID_EXECUTION_MODEL_VERSION'
    | 'INVALID_PLAN_ID'
    | 'INVALID_CONTENT_HASH'
    | 'INVALID_STATE_REVISION'
    | 'INVALID_VOLUME'
    | 'INVALID_READY_TO_USE_VOLUME'
    | 'INVALID_DOSE_LINE'
    | 'DUPLICATE_LINE_ID'
    | 'DUPLICATE_PRODUCT_ID';
  message: string;
}

export function createPlanSnapshot(
  input: Omit<PlanSnapshot, 'contentHash'>,
): Readonly<PlanSnapshot> {
  const semanticPayload = semanticPayloadFrom(input);
  const snapshot: PlanSnapshot = {
    ...cloneSemanticPayload(semanticPayload),
    planId: input.planId,
    createdAt: input.createdAt,
    contentHash: computePlanContentHash(semanticPayload),
  };

  return deepFreeze(snapshot);
}

export function computePlanContentHash(payload: PlanSnapshotSemanticPayload): string {
  return `fnv1a64:${fnv1a64(canonicalize(payload))}`;
}

export function verifyPlanSnapshotHash(snapshot: PlanSnapshot): boolean {
  return snapshot.contentHash === computePlanContentHash(semanticPayloadFrom(snapshot));
}

export function validatePlanSnapshot(snapshot: PlanSnapshot): PlanSnapshotValidationIssue[] {
  const issues: PlanSnapshotValidationIssue[] = [];

  if (snapshot.schemaVersion !== PLAN_SNAPSHOT_SCHEMA_VERSION) {
    issues.push({ code: 'INVALID_SCHEMA_VERSION', message: 'Nieobsługiwana wersja schematu PlanSnapshot.' });
  }

  if (snapshot.executionModelVersion !== PLAN_EXECUTION_MODEL_VERSION) {
    issues.push({ code: 'INVALID_EXECUTION_MODEL_VERSION', message: 'Nieobsługiwana wersja modelu wykonawczego.' });
  }

  if (!safeToken(snapshot.planId)) {
    issues.push({ code: 'INVALID_PLAN_ID', message: 'PlanSnapshot wymaga poprawnego planId.' });
  }

  if (!verifyPlanSnapshotHash(snapshot)) {
    issues.push({ code: 'INVALID_CONTENT_HASH', message: 'PlanSnapshot contentHash nie odpowiada zawartości planu.' });
  }

  if (!Number.isInteger(snapshot.sourceStateRevision) || snapshot.sourceStateRevision < 0) {
    issues.push({ code: 'INVALID_STATE_REVISION', message: 'PlanSnapshot zawiera nieprawidłową rewizję stanu.' });
  }

  if (snapshot.method === 'READY_TO_SPRAY') {
    if (!Number.isFinite(snapshot.readyToUseVolumeMl) || (snapshot.readyToUseVolumeMl ?? 0) <= 0) {
      issues.push({ code: 'INVALID_READY_TO_USE_VOLUME', message: 'Plan READY_TO_SPRAY wymaga dodatniej, skończonej objętości ml.' });
    }
  } else if (!Number.isFinite(snapshot.volumeLitres) || snapshot.volumeLitres <= 0) {
    issues.push({ code: 'INVALID_VOLUME', message: 'Plan wykonawczy wymaga dodatniej, skończonej objętości litrów.' });
  }

  const lineIds = new Set<string>();
  const productIds = new Set<string>();
  for (const line of snapshot.doseLines) {
    if (
      !safeToken(line.lineId)
      || !safeToken(line.productId)
      || !safeToken(line.sourceRef)
      || !Number.isFinite(line.calculatedAmount)
      || line.calculatedAmount < 0
      || (line.concentrationPerL !== undefined && (!Number.isFinite(line.concentrationPerL) || line.concentrationPerL < 0))
      || !['ml', 'g'].includes(line.unit)
    ) {
      issues.push({ code: 'INVALID_DOSE_LINE', message: `Nieprawidłowa linia dawki: ${line.lineId || '<brak lineId>'}.` });
      continue;
    }

    if (lineIds.has(line.lineId)) {
      issues.push({ code: 'DUPLICATE_LINE_ID', message: `Powtórzony lineId: ${line.lineId}.` });
    }
    lineIds.add(line.lineId);

    if (productIds.has(line.productId)) {
      issues.push({ code: 'DUPLICATE_PRODUCT_ID', message: `Powtórzony productId w planie: ${line.productId}.` });
    }
    productIds.add(line.productId);
  }

  return issues;
}

export function samePlanIdentity(a: PlanSnapshot, b: PlanSnapshot): boolean {
  return a.planId === b.planId && a.contentHash === b.contentHash;
}

export function semanticPayloadFrom(
  snapshot: PlanSnapshot | Omit<PlanSnapshot, 'contentHash'>,
): PlanSnapshotSemanticPayload {
  return {
    schemaVersion: snapshot.schemaVersion,
    executionModelVersion: snapshot.executionModelVersion,
    origin: snapshot.origin,
    sourceStateRevision: snapshot.sourceStateRevision,
    recipeId: snapshot.recipeId,
    recipeSourceVersion: snapshot.recipeSourceVersion,
    recipeVerificationStatus: snapshot.recipeVerificationStatus,
    recipeExecutionPolicy: snapshot.recipeExecutionPolicy,
    method: snapshot.method,
    stage: snapshot.stage,
    week: snapshot.week,
    medium: snapshot.medium,
    waterContext: { ...snapshot.waterContext },
    volumeLitres: snapshot.volumeLitres,
    readyToUseVolumeMl: snapshot.readyToUseVolumeMl,
    verdict: snapshot.verdict,
    capability: snapshot.capability,
    blockers: [...snapshot.blockers],
    doseLines: snapshot.doseLines.map(line => ({ ...line })),
    canonicalStepIds: [...snapshot.canonicalStepIds],
  };
}

function cloneSemanticPayload(payload: PlanSnapshotSemanticPayload): PlanSnapshotSemanticPayload {
  return semanticPayloadFrom({
    ...payload,
    planId: 'clone-only',
    createdAt: 'clone-only',
  });
}

function canonicalize(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`;
}

function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, '0');
}

function safeToken(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 240;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      if (child && typeof child === 'object') deepFreeze(child);
    }
  }
  return value as Readonly<T>;
}
