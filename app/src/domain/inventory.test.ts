import assert from 'node:assert/strict';
import test from 'node:test';
import { INVENTORY_SEED } from '../data/inventorySeed.ts';

void test('magazyn startuje bez wymyślonych ilości', () => {
  assert.ok(INVENTORY_SEED.length > 0);
  assert.ok(INVENTORY_SEED.every((item) => item.quantity === null));
});

void test('produkty magazynu mają unikalne identyfikatory', () => {
  const ids = INVENTORY_SEED.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

void test('magazyn zawiera podstawowe produkty operatora', () => {
  const names = INVENTORY_SEED.map((item) => item.name);
  for (const expected of ['Shogun CalMag', 'Shogun Silicon', 'Shogun Zenzym', 'Shogun Katana Roots', 'Shogun Terra Grow', 'Shogun Terra Bloom']) {
    assert.ok(names.includes(expected), expected);
  }
});
