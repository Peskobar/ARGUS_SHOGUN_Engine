import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VERIFIED_MIXING_POLICY,
  inspectMixingPolicy,
} from './mixingPolicy.ts';

test('verified policy does not reconstruct donor full role chain', () => {
  assert.deepEqual(VERIFIED_MIXING_POLICY.verifiedRelations, [
    { beforeRole: 'SILICON', afterRole: 'BASE', id: 'silicon-before-base' },
  ]);
});

test('silicon after base is reported but never hard-blocking', () => {
  const issues = inspectMixingPolicy({
    method: 'ROOT_FEED',
    orderedProducts: [
      { productId: 'samurai-terra-grow', mixingRole: 'BASE' },
      { productId: 'silicon', mixingRole: 'SILICON' },
    ],
  });

  const issue = issues.find((item) => item.code === 'SILICON_AFTER_BASE');
  assert.ok(issue);
  assert.equal(issue.blocking, false);
  assert.equal(issue.evidenceStatus, 'VERIFIED_MANUFACTURER');
});

test('grow and bloom together is reported without operator gate semantics', () => {
  const issues = inspectMixingPolicy({
    method: 'ROOT_FEED',
    orderedProducts: [
      { productId: 'samurai-terra-grow', mixingRole: 'BASE' },
      { productId: 'samurai-terra-bloom', mixingRole: 'BASE' },
    ],
  });

  const issue = issues.find((item) => item.code === 'TERRA_GROW_BLOOM_TOGETHER');
  assert.ok(issue);
  assert.equal(issue.blocking, false);
});

test('final pH and EC are a checklist, not an imposed EC-before-pH sequence', () => {
  assert.equal(VERIFIED_MIXING_POLICY.finalMeasurements.orderedRelativeToEachOther, false);

  const issues = inspectMixingPolicy({
    method: 'ROOT_FEED',
    orderedProducts: [],
    finalMeasurements: { phChecked: true, ecChecked: false },
  });

  assert.equal(issues.some((item) => item.code === 'FINAL_PH_CHECK_MISSING'), false);
  assert.equal(issues.some((item) => item.code === 'FINAL_EC_CHECK_MISSING'), true);
});

test('non-root methods do not inherit root-feed silicon ordering check', () => {
  const issues = inspectMixingPolicy({
    method: 'FOLIAR',
    orderedProducts: [
      { productId: 'base-x', mixingRole: 'BASE' },
      { productId: 'silicon', mixingRole: 'SILICON' },
    ],
  });

  assert.equal(issues.some((item) => item.code === 'SILICON_AFTER_BASE'), false);
});
