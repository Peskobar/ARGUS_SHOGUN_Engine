import assert from 'node:assert/strict';
import test from 'node:test';

import { VERIFIED_MIXING_POLICY } from './mixingPolicy.ts';

test('runtime verified relation set contains only silicon-before-base', () => {
  assert.deepEqual(VERIFIED_MIXING_POLICY.verifiedRelations, [
    { beforeRole: 'SILICON', afterRole: 'BASE', id: 'silicon-before-base' },
  ]);
});

test('runtime does not encode rejected donor role-chain relations', () => {
  const serialized = JSON.stringify(VERIFIED_MIXING_POLICY);
  for (const rejected of [
    'CALMAG->BASE',
    'BASE->ROOTS',
    'ROOTS->ENZYME',
    'ENZYME->BOOSTER',
    'BOOSTER->PK',
  ]) {
    assert.equal(serialized.includes(rejected), false);
  }
});

test('manufacturer evidence URLs are preserved in runtime provenance', () => {
  const sources = VERIFIED_MIXING_POLICY.provenance.manufacturerSources;
  assert.ok(sources.includes('https://www.shogunfertilisers.com/products/silicon'));
  assert.ok(sources.includes('https://www.shogunfertilisers.com/products/samurai-terra'));
});
