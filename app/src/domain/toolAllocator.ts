import type { AllocationMode } from './taxonomy.ts';

export type ToolKind = 'SYRINGE' | 'PIPETTE';

export interface ToolType {
  id: string;
  label: string;
  kind: ToolKind;
  capacityMl: number;
  count: number;
  precisionStepMl?: number;
}

export interface DoseRequest {
  productId: string;
  volumeMl: number;
}

export interface ToolAssignment {
  productId: string;
  instanceId: string;
  toolTypeId: string;
  label: string;
  kind: ToolKind;
  capacityMl: number;
  amountMl: number;
}

export interface AllocationShortage {
  productId: string;
  remainingMl: number;
}

export interface AllocationIssue {
  code: 'INVALID_REQUEST' | 'INVALID_TOOL' | 'DUPLICATE_TOOL_ID';
  subjectId: string;
  message: string;
}

export interface ToolUsageSummary {
  toolTypeId: string;
  used: number;
  total: number;
}

export interface ToolAllocationResult {
  assignments: Record<string, ToolAssignment[]>;
  shortages: AllocationShortage[];
  issues: AllocationIssue[];
  usage: ToolUsageSummary[];
  complete: boolean;
}

interface ToolInstance {
  instanceId: string;
  toolTypeId: string;
  label: string;
  kind: ToolKind;
  capacityMl: number;
  precisionStepMl: number;
  sourceOrder: number;
}

const EPSILON = 0.005;

/**
 * Pure allocator transplanted from the donor concept, not the donor module.
 * It has no knowledge of recipes, UI, inventory persistence or execution gates.
 * Real physical tool counts must be supplied by the operator profile at runtime.
 */
export function allocateTools(
  rawRequests: readonly DoseRequest[],
  rawTools: readonly ToolType[],
  mode: AllocationMode = 'PRECISION',
): ToolAllocationResult {
  const issues: AllocationIssue[] = [];
  const requests = aggregateRequests(rawRequests, issues);
  const tools = validateTools(rawTools, issues);
  const pool = expandTools(tools);

  const assignments: Record<string, ToolAssignment[]> = Object.fromEntries(
    requests.map((request) => [request.productId, []]),
  );
  const shortages: AllocationShortage[] = [];

  const orderedRequests = [...requests].sort(
    (a, b) => b.volumeMl - a.volumeMl || a.productId.localeCompare(b.productId),
  );

  for (const request of orderedRequests) {
    let remaining = roundMl(request.volumeMl);

    while (remaining > EPSILON) {
      const toolIndex = chooseToolIndex(pool, remaining, mode);
      if (toolIndex < 0) {
        shortages.push({ productId: request.productId, remainingMl: roundMl(remaining) });
        break;
      }

      const [tool] = pool.splice(toolIndex, 1);
      const amountMl = roundMl(Math.min(remaining, tool.capacityMl));
      assignments[request.productId].push({
        productId: request.productId,
        instanceId: tool.instanceId,
        toolTypeId: tool.toolTypeId,
        label: tool.label,
        kind: tool.kind,
        capacityMl: tool.capacityMl,
        amountMl,
      });
      remaining = roundMl(remaining - amountMl);
    }
  }

  const usage = tools.map((tool) => ({
    toolTypeId: tool.id,
    used: Object.values(assignments)
      .flat()
      .filter((assignment) => assignment.toolTypeId === tool.id).length,
    total: Math.floor(tool.count),
  }));

  return {
    assignments,
    shortages,
    issues,
    usage,
    complete: shortages.length === 0 && issues.length === 0,
  };
}

function aggregateRequests(
  requests: readonly DoseRequest[],
  issues: AllocationIssue[],
): DoseRequest[] {
  const totals = new Map<string, number>();

  for (const request of requests) {
    if (
      typeof request.productId !== 'string' ||
      request.productId.trim().length === 0 ||
      !Number.isFinite(request.volumeMl) ||
      request.volumeMl < 0
    ) {
      issues.push({
        code: 'INVALID_REQUEST',
        subjectId: request.productId || '<empty>',
        message: 'Request must have a productId and a finite non-negative volumeMl.',
      });
      continue;
    }

    if (request.volumeMl <= EPSILON) {
      totals.set(request.productId, totals.get(request.productId) ?? 0);
      continue;
    }

    totals.set(request.productId, roundMl((totals.get(request.productId) ?? 0) + request.volumeMl));
  }

  return [...totals.entries()].map(([productId, volumeMl]) => ({ productId, volumeMl }));
}

function validateTools(tools: readonly ToolType[], issues: AllocationIssue[]): ToolType[] {
  const seenIds = new Set<string>();
  const valid: ToolType[] = [];

  for (const tool of tools) {
    if (seenIds.has(tool.id)) {
      issues.push({
        code: 'DUPLICATE_TOOL_ID',
        subjectId: tool.id,
        message: `Tool type id ${tool.id} is duplicated.`,
      });
      continue;
    }
    seenIds.add(tool.id);

    if (
      !tool.id ||
      !Number.isFinite(tool.capacityMl) ||
      tool.capacityMl <= 0 ||
      !Number.isFinite(tool.count) ||
      tool.count < 0
    ) {
      issues.push({
        code: 'INVALID_TOOL',
        subjectId: tool.id || '<empty>',
        message: 'Tool must have a unique id, positive capacityMl and non-negative count.',
      });
      continue;
    }

    valid.push(tool);
  }

  return valid;
}

function expandTools(tools: readonly ToolType[]): ToolInstance[] {
  const instances: ToolInstance[] = [];

  tools.forEach((tool, sourceOrder) => {
    const count = Math.floor(tool.count);
    for (let index = 0; index < count; index += 1) {
      instances.push({
        instanceId: `${tool.id}#${index + 1}`,
        toolTypeId: tool.id,
        label: tool.label,
        kind: tool.kind,
        capacityMl: tool.capacityMl,
        precisionStepMl: tool.precisionStepMl ?? defaultPrecisionStep(tool.capacityMl),
        sourceOrder,
      });
    }
  });

  return instances;
}

function chooseToolIndex(
  pool: readonly ToolInstance[],
  remainingMl: number,
  mode: AllocationMode,
): number {
  if (pool.length === 0) return -1;

  const indexed = pool.map((tool, index) => ({ tool, index }));
  const fitting = indexed.filter(({ tool }) => tool.capacityMl + EPSILON >= remainingMl);

  if (fitting.length > 0) {
    fitting.sort((a, b) => compareFitting(a.tool, b.tool, mode));
    return fitting[0].index;
  }

  indexed.sort(
    (a, b) =>
      b.tool.capacityMl - a.tool.capacityMl ||
      a.tool.sourceOrder - b.tool.sourceOrder ||
      a.tool.instanceId.localeCompare(b.tool.instanceId),
  );
  return indexed[0].index;
}

function compareFitting(a: ToolInstance, b: ToolInstance, mode: AllocationMode): number {
  if (mode === 'PRECISION') {
    return (
      a.precisionStepMl - b.precisionStepMl ||
      a.capacityMl - b.capacityMl ||
      a.sourceOrder - b.sourceOrder ||
      a.instanceId.localeCompare(b.instanceId)
    );
  }

  if (mode === 'SPEED') {
    return (
      kindRank(a.kind) - kindRank(b.kind) ||
      a.capacityMl - b.capacityMl ||
      a.sourceOrder - b.sourceOrder ||
      a.instanceId.localeCompare(b.instanceId)
    );
  }

  return (
    a.capacityMl - b.capacityMl ||
    a.sourceOrder - b.sourceOrder ||
    a.instanceId.localeCompare(b.instanceId)
  );
}

function kindRank(kind: ToolKind): number {
  return kind === 'SYRINGE' ? 0 : 1;
}

function defaultPrecisionStep(capacityMl: number): number {
  if (capacityMl <= 1) return 0.01;
  if (capacityMl <= 3) return 0.1;
  if (capacityMl <= 6) return 0.2;
  return 0.5;
}

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}
