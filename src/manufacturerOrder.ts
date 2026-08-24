import type { ManufacturerProfile } from './manufacturerProfiles';

/**
 * Display/provenance order from the SHOGUN Terra feedchart family.
 *
 * CRITICAL SEPARATION:
 * - this order is for reproducing the manufacturer's table/source view,
 * - it is NOT physical mixing order,
 * - execution order lives only in canonicalMixingSequence.ts.
 *
 * The current LED profile is still a PARTIAL/unfrozen snapshot, so this list
 * describes the row order imported from the manufacturer feedchart family and
 * must never be presented as a chemically safe addition sequence.
 */
export const SHOGUN_TERRA_SOURCE_PRODUCT_ORDER: readonly string[] = Object.freeze([
  'shogun-start',
  'samurai-terra-grow',
  'samurai-terra-bloom',
  'katana-roots',
  'zenzym',
  'silicon',
  'calmag',
  'sumo-active-boost',
  'pk-warrior',
  'dragon-force',
  'geisha-foliar',
]);

const SOURCE_INDEX = new Map(
  SHOGUN_TERRA_SOURCE_PRODUCT_ORDER.map((productId, index) => [productId, index]),
);

export function manufacturerSourceOrder(productId: string): number {
  return SOURCE_INDEX.get(productId) ?? Number.MAX_SAFE_INTEGER;
}

export function compareProductIdsByManufacturerSource(a: string, b: string): number {
  return manufacturerSourceOrder(a) - manufacturerSourceOrder(b) || a.localeCompare(b);
}

export function compareByManufacturerSource<T extends { productId: string }>(a: T, b: T): number {
  return compareProductIdsByManufacturerSource(a.productId, b.productId);
}

/**
 * Kept profile-aware on purpose. When a future frozen snapshot contains an
 * explicit row order, this is the single seam where it should replace the
 * current Terra-family fallback without touching execution chemistry.
 */
export function compareByProfileManufacturerSource<T extends { productId: string }>(
  _profile: Pick<ManufacturerProfile, 'id'>,
  a: T,
  b: T,
): number {
  return compareByManufacturerSource(a, b);
}
