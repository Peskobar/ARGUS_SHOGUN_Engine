import assert from 'node:assert/strict';
import test from 'node:test';

import { allocateTools, type ToolType } from './toolAllocator.ts';

const tools: ToolType[] = [
  { id: 'large', label: 'Large', kind: 'SYRINGE', capacityMl: 10, count: 1, precisionStepMl: 0.5 },
  { id: 'small', label: 'Small', kind: 'SYRINGE', capacityMl: 3, count: 2, precisionStepMl: 0.1 },
];

test('one physical tool instance is never assigned twice', () => {
  const result = allocateTools(
    [
      { productId: 'A', volumeMl: 3 },
      { productId: 'B', volumeMl: 3 },
    ],
    tools,
  );

  assert.equal(result.complete, true);
  const instanceIds = Object.values(result.assignments).flat().map((item) => item.instanceId);
  assert.equal(new Set(instanceIds).size, instanceIds.length);
});

test('duplicate product requests are aggregated before allocation', () => {
  const result = allocateTools(
    [
      { productId: 'A', volumeMl: 2 },
      { productId: 'A', volumeMl: 4 },
    ],
    tools,
    'MIN_TOOLS',
  );

  assert.equal(result.complete, true);
  const totalAssigned = result.assignments.A.reduce((sum, item) => sum + item.amountMl, 0);
  assert.equal(totalAssigned, 6);
});

test('shortage is explicit and does not reuse an exhausted tool', () => {
  const result = allocateTools([{ productId: 'A', volumeMl: 30 }], tools, 'SPEED');

  assert.equal(result.complete, false);
  assert.equal(result.shortages.length, 1);
  assert.equal(result.shortages[0].productId, 'A');
  assert.equal(result.shortages[0].remainingMl, 14);
  assert.equal(result.usage.find((entry) => entry.toolTypeId === 'large')?.used, 1);
  assert.equal(result.usage.find((entry) => entry.toolTypeId === 'small')?.used, 2);
});

test('invalid requests are reported as technical issues', () => {
  const result = allocateTools([{ productId: 'A', volumeMl: Number.NaN }], tools);
  assert.equal(result.complete, false);
  assert.equal(result.issues[0]?.code, 'INVALID_REQUEST');
});

test('duplicate tool ids are rejected instead of creating colliding instances', () => {
  const result = allocateTools(
    [{ productId: 'A', volumeMl: 2 }],
    [
      { id: 'same', label: 'A', kind: 'SYRINGE', capacityMl: 3, count: 1 },
      { id: 'same', label: 'B', kind: 'SYRINGE', capacityMl: 6, count: 1 },
    ],
  );

  assert.equal(result.complete, false);
  assert.ok(result.issues.some((issue) => issue.code === 'DUPLICATE_TOOL_ID'));
});
