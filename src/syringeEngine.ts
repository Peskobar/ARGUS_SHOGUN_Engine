import type { AllocationMode, SyringeType } from './types';

export interface AllocatedSyringe {
  type: string;
  amount: number;
  toolTypeId: string;
  instanceId: string;
  capacity: number;
  precisionStep: number;
  kind: 'SYRINGE' | 'PIPETTE';
}

export interface AllocationPlan {
  productId: string;
  totalVolumeRequired: number;
  syringes: AllocatedSyringe[];
}

export interface DoseRequest {
  productId: string;
  volumeMl: number;
}

export interface AllocationShortage {
  productId: string;
  remainingMl: number;
}

export interface ToolUsageSummary {
  toolTypeId: string;
  label: string;
  kind: 'SYRINGE' | 'PIPETTE';
  used: number;
  total: number;
}

export interface ToolSetAllocation {
  assignments: Record<string, AllocatedSyringe[]>;
  shortages: AllocationShortage[];
  usage: ToolUsageSummary[];
  complete: boolean;
}

interface ToolInstance {
  instanceId: string;
  toolTypeId: string;
  capacity: number;
  capacityUnits: number;
  label: string;
  kind: 'SYRINGE' | 'PIPETTE';
  precisionStep: number;
  stepUnits: number;
  sourceOrder: number;
}

interface PlannedFill {
  instanceId: string;
  amountUnits: number;
}

const UNITS_PER_ML = 100;
const EPSILON = 0.005;

/**
 * Allocates each physical tool instance at most once across the prepared set.
 * Every assigned amount must be representable by the real graduation step of
 * that tool. If an exact measurable plan does not exist, allocation fails.
 */
export function allocateToolSet(
  requests: DoseRequest[],
  availableTools: SyringeType[],
  mode: AllocationMode = 'PRECISION',
): ToolSetAllocation {
  let pool = expandTools(availableTools);
  const assignments: Record<string, AllocatedSyringe[]> = {};
  const shortages: AllocationShortage[] = [];

  const orderedRequests = [...requests]
    .filter(request => Number.isFinite(request.volumeMl) && request.volumeMl > EPSILON)
    .sort((a, b) => b.volumeMl - a.volumeMl || a.productId.localeCompare(b.productId));

  for (const request of orderedRequests) {
    const targetUnits = toUnits(request.volumeMl);
    const plan = findExactMeasurablePlan(pool, targetUnits, mode);
    assignments[request.productId] = [];

    if (!plan) {
      shortages.push({ productId: request.productId, remainingMl: fromUnits(targetUnits) });
      continue;
    }

    const usedIds = new Set(plan.map(fill => fill.instanceId));
    const poolById = new Map(pool.map(tool => [tool.instanceId, tool]));

    assignments[request.productId] = plan.map(fill => {
      const tool = poolById.get(fill.instanceId);
      if (!tool) throw new Error(`Tool ${fill.instanceId} disappeared during allocation.`);
      return {
        type: tool.label,
        amount: fromUnits(fill.amountUnits),
        toolTypeId: tool.toolTypeId,
        instanceId: tool.instanceId,
        capacity: tool.capacity,
        precisionStep: tool.precisionStep,
        kind: tool.kind,
      };
    });

    pool = pool.filter(tool => !usedIds.has(tool.instanceId));
  }

  for (const request of requests) assignments[request.productId] ??= [];

  const usage = availableTools.map(tool => {
    const used = Object.values(assignments)
      .flat()
      .filter(item => item.toolTypeId === tool.id).length;
    return {
      toolTypeId: tool.id,
      label: tool.label,
      kind: tool.type,
      used,
      total: tool.count,
    };
  });

  return { assignments, shortages, usage, complete: shortages.length === 0 };
}

export function calculateSyringes(
  totalVolumeMl: number,
  availableSyringes: SyringeType[],
  mode: AllocationMode = 'PRECISION',
): AllocatedSyringe[] {
  if (!Number.isFinite(totalVolumeMl) || totalVolumeMl <= EPSILON) return [];
  const result = allocateToolSet(
    [{ productId: '__single__', volumeMl: totalVolumeMl }],
    availableSyringes,
    mode,
  );
  return result.assignments.__single__ ?? [];
}

export function isMeasurableAmount(amountMl: number, tool: SyringeType): boolean {
  if (!Number.isFinite(amountMl) || amountMl < 0 || amountMl > tool.capacity + EPSILON) return false;
  const step = tool.precisionStep ?? defaultPrecisionStep(tool.capacity);
  const amountUnits = toUnits(amountMl);
  const stepUnits = Math.max(1, toUnits(step));
  return amountUnits % stepUnits === 0;
}

function findExactMeasurablePlan(
  availablePool: ToolInstance[],
  targetUnits: number,
  mode: AllocationMode,
): PlannedFill[] | null {
  if (targetUnits <= 0) return [];

  const tools = [...availablePool].sort((a, b) => compareToolPreference(a, b, mode));
  const suffixCapacity = new Array<number>(tools.length + 1).fill(0);
  for (let index = tools.length - 1; index >= 0; index -= 1) {
    suffixCapacity[index] = suffixCapacity[index + 1] + tools[index].capacityUnits;
  }

  const memo = new Map<string, PlannedFill[] | null>();

  const dfs = (index: number, remaining: number): PlannedFill[] | null => {
    if (remaining === 0) return [];
    if (index >= tools.length || remaining < 0 || remaining > suffixCapacity[index]) return null;

    const key = `${index}:${remaining}`;
    if (memo.has(key)) return memo.get(key) ?? null;

    const tool = tools[index];
    const maxFill = Math.floor(Math.min(tool.capacityUnits, remaining) / tool.stepUnits) * tool.stepUnits;

    if (maxFill > 0) {
      const amounts = candidateAmounts(maxFill, tool.stepUnits, remaining, mode);
      for (const amountUnits of amounts) {
        const tail = dfs(index + 1, remaining - amountUnits);
        if (tail) {
          const result = [{ instanceId: tool.instanceId, amountUnits }, ...tail];
          memo.set(key, result);
          return result;
        }
      }
    }

    const skipped = dfs(index + 1, remaining);
    memo.set(key, skipped);
    return skipped;
  };

  return dfs(0, targetUnits);
}

function candidateAmounts(
  maxFill: number,
  stepUnits: number,
  remaining: number,
  mode: AllocationMode,
): number[] {
  const amounts: number[] = [];

  if (remaining <= maxFill && remaining % stepUnits === 0) amounts.push(remaining);

  for (let amount = maxFill; amount >= stepUnits; amount -= stepUnits) {
    if (!amounts.includes(amount)) amounts.push(amount);
  }

  if (mode === 'PRECISION') {
    // Exact single-tool fills are already first. Among split fills, retain larger
    // chunks while the tool preference sort prioritizes finer graduations.
    return amounts;
  }

  return amounts;
}

function expandTools(tools: SyringeType[]): ToolInstance[] {
  const instances: ToolInstance[] = [];
  tools.forEach((tool, sourceOrder) => {
    const count = Math.max(0, Math.floor(tool.count));
    const precisionStep = tool.precisionStep ?? defaultPrecisionStep(tool.capacity);
    for (let index = 0; index < count; index += 1) {
      instances.push({
        instanceId: `${tool.id}#${index + 1}`,
        toolTypeId: tool.id,
        capacity: tool.capacity,
        capacityUnits: toUnits(tool.capacity),
        label: tool.label,
        kind: tool.type,
        precisionStep,
        stepUnits: Math.max(1, toUnits(precisionStep)),
        sourceOrder,
      });
    }
  });
  return instances;
}

function compareToolPreference(a: ToolInstance, b: ToolInstance, mode: AllocationMode): number {
  if (mode === 'PRECISION') {
    return (
      a.precisionStep - b.precisionStep ||
      b.capacity - a.capacity ||
      a.sourceOrder - b.sourceOrder ||
      a.instanceId.localeCompare(b.instanceId)
    );
  }

  if (mode === 'SPEED') {
    return (
      b.capacity - a.capacity ||
      kindRank(a.kind) - kindRank(b.kind) ||
      a.sourceOrder - b.sourceOrder ||
      a.instanceId.localeCompare(b.instanceId)
    );
  }

  return (
    b.capacity - a.capacity ||
    a.sourceOrder - b.sourceOrder ||
    a.instanceId.localeCompare(b.instanceId)
  );
}

function kindRank(kind: 'SYRINGE' | 'PIPETTE'): number {
  return kind === 'SYRINGE' ? 0 : 1;
}

function defaultPrecisionStep(capacity: number): number {
  if (capacity <= 1) return 0.01;
  if (capacity <= 3) return 0.1;
  if (capacity <= 6) return 0.2;
  return 0.5;
}

function toUnits(valueMl: number): number {
  return Math.round(valueMl * UNITS_PER_ML);
}

function fromUnits(value: number): number {
  return Number((value / UNITS_PER_ML).toFixed(2));
}
