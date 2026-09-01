import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DOMAIN_TAXONOMY,
  PRODUCT_IDENTITIES,
  getProductIdentity,
} from '../data/referenceCatalog.ts';

test('promoted catalog has unique stable product ids', () => {
  const ids = PRODUCT_IDENTITIES.map((product) => product.id);
  assert.equal(ids.length, 11);
  assert.equal(new Set(ids).size, ids.length);
});

test('promoted product identities contain no operational dose or stock fields', () => {
  for (const product of PRODUCT_IDENTITIES) {
    const record = product as unknown as Record<string, unknown>;
    assert.equal('dose' in record, false);
    assert.equal('concentration' in record, false);
    assert.equal('remainingCapacity' in record, false);
    assert.equal('initialCapacity' in record, false);
    assert.equal('foliarAllowed' in record, false);
    assert.equal('compatibleMedia' in record, false);
    assert.equal(product.provenance.transplantStatus, 'PROMOTED_STRUCTURE');
  }
});

test('taxonomy preserves the donor structural vocabulary', () => {
  assert.deepEqual(DOMAIN_TAXONOMY.medium, ['TERRA', 'COCO', 'HYDRO', 'CUSTOM']);
  assert.equal(DOMAIN_TAXONOMY.mixingRole[0], 'SILICON');
  assert.ok(DOMAIN_TAXONOMY.applicationMethod.includes('READY_TO_SPRAY'));
  assert.ok(DOMAIN_TAXONOMY.allocationMode.includes('PRECISION'));
});

test('product lookup returns structural identity only', () => {
  const silicon = getProductIdentity('silicon');
  assert.ok(silicon);
  assert.equal(silicon.name, 'Silicon');
  assert.equal(silicon.mixingRole, 'SILICON');
  assert.equal(silicon.brand, 'SHOGUN');
});
