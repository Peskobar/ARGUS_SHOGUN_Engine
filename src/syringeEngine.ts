import type { AllocationMode, SyringeType } from './types';

export interface AllocatedSyringe {
  /** Backward-compatible display label used by the current UI. */
  type: string;
  amount: number;
  toolTypeId: string;
  instanceId: string;
  capacity: number;
  kind: 'SYRINGE' | 'PIPETTE';
}

export interface AllocationPlan {
  productId: string;
  totalVolumeRequired: number; // ml
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
  label: string;
  kind: 'SYRINGE' | 'PIPETTE';
  precisionStep: number;
  sourceOrder: number;
}

const EPSILON = 0.005;

/**
 * Allocates one physical tool instance at most once across the entire prepared set.
 * Different products never share a tool in the same allocation result.
 */
export function allocateToolSet(
  requests: DoseRequest[],
  availableTools: SyringeType[],
  mode: AllocationMode = 'PRECISION'
): ToolSetAllocation {
  const pool = expandTools(availableTools);
  const assignments: Record<string, AllocatedSyringe[]> = {};
  const shortages: AllocationShortage[] = [];

  // Large doses first so small doses do not accidentally consume scarce large tools.
  const orderedRequests = [...requests]
    .filter(request => request.volumeMl > EPSILON)
    .sort((a, b) => b.volumeMl - a.volumeMl);

  for (const request of orderedRequests) {
    let remaining = roundMl(request.volumeMl);
    assignments[request.productId] = [];

    while (remaining > EPSILON) {
      const bestIndex = chooseToolIndex(pool, remaining, mode);
      if (bestIndex < 0) {
        shortages.push({ productId: request.productId, remainingMl: roundMl(remaining) });
        break;
      }

      const [tool] = pool.splice(bestIndex, 1);
      const amount = roundMl(Math.min(remaining, tool.capacity));
      assignments[request.productId].push({
        type: tool.label,
        amount,
        toolTypeId: tool.toolTypeId,
        instanceId: tool.instanceId,
        capacity: tool.capacity,
        kind: tool.kind,
      });

      remaining = roundMl(remaining - amount);
    }
  }

  // Keep zero-volume products visible to callers that prebuild request maps.
  for (const request of requests) {
    assignments[request.productId] ??= [];
  }

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

  return {
    assignments,
    shortages,
    usage,
    complete: shortages.length === 0,
  };
}

/**
 * Backward-compatible helper used by the current UI for a single product.
 * It now respects the finite count of physical tools for that dose.
 */
export function calculateSyringes(
  totalVolumeMl: number,
  availableSyringes: SyringeType[],
  mode: AllocationMode = 'PRECISION'
): AllocatedSyringe[] {
  if (totalVolumeMl <= EPSILON) return [];

  const result = allocateToolSet(
    [{ productId: '__single__', volumeMl: totalVolumeMl }],
    availableSyringes,
    mode,
  );

  return result.assignments.__single__ ?? [];
}

function expandTools(tools: SyringeType[]): ToolInstance[] {
  const instances: ToolInstance[] = [];

  tools.forEach((tool, sourceOrder) => {
    const count = Math.max(0, Math.floor(tool.count));
    for (let index = 0; index < count; index += 1) {
      instances.push({
        instanceId: `${tool.id}#${index + 1}`,
        toolTypeId: tool.id,
        capacity: tool.capacity,
        label: tool.label,
        kind: tool.type,
        precisionStep: tool.precisionStep ?? defaultPrecisionStep(tool.capacity),
        sourceOrder,
      });
    }
  });

  return instances;
}

function chooseToolIndex(
  pool: ToolInstance[],
  remaining: number,
  mode: AllocationMode,
): number {
  if (pool.length === 0) return -1;

  const fitting = pool
    .map((tool, index) => ({ tool, index }))
    .filter(({ tool }) => tool.capacity + EPSILON >= remaining);

  if (fitting.length > 0) {
    fitting.sort((a, b) => compareFittingTools(a.tool, b.tool, mode));
    return fitting[0].index;
  }

  // No single tool can hold the remainder. Consume the largest available tool.
  return pool
    .map((tool, index) => ({ tool, index }))
    .sort((a, b) =>
      b.tool.capacity - a.tool.capacity ||
      a.tool.sourceOrder - b.tool.sourceOrder ||
      a.tool.instanceId.localeCompare(b.tool.instanceId)
    )[0].index;
}

function compareFittingTools(a: ToolInstance, b: ToolInstance, mode: AllocationMode): number {
  if (mode === 'PRECISION') {
    return (
      a.capacity - b.capacity ||
      a.precisionStep - b.precisionStep ||
      a.sourceOrder - b.sourceOrder ||
      a.instanceId.localeCompare(b.instanceId)
    );
  }

  if (mode === 'SPEED') {
    // Prefer a familiar syringe over a pipette for the same one-step fill,
    // then keep selection deterministic.
    return (
      kindRank(a.kind) - kindRank(b.kind) ||
      a.capacity - b.capacity ||
      a.sourceOrder - b.sourceOrder ||
      a.instanceId.localeCompare(b.instanceId)
    );
  }

  // MIN_TOOLS: one fitting tool always completes this remainder in one operation.
  // Choose the smallest fitting tool to preserve larger tools for other products.
  return (
    a.capacity - b.capacity ||
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

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}
