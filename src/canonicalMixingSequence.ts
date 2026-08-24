import type { Product } from './types.ts';

type MixingRoleValue = NonNullable<Product['mixingRole']>;

/**
 * Single domain authority for physical nutrient-mixing order.
 *
 * IMPORTANT:
 * - UI/display sorting is not execution authority.
 * - Persisted/custom recipe order is not execution authority.
 * - Both Technik Żywienia and Planner must derive physical order from this module.
 * - This module intentionally has no runtime dependency on TypeScript enums so it
 *   can be consumed by native Node smoke tests as well as Vite/tsx.
 */
export const CANONICAL_MIXING_ROLE_ORDER: Readonly<Record<MixingRoleValue, number>> = Object.freeze({
  SILICON: 100,
  CALMAG: 300,
  BASE: 400,
  ROOTS: 500,
  ENZYME: 600,
  BOOSTER: 700,
  PK: 800,
  BIOLOGICAL: 850,
  OTHER: 900,
  PH_ADJUSTER: 1000,
  READY_TO_USE: 1100,
});

export type CanonicalProcessStep =
  | 'WATER'
  | 'SILICON'
  | 'MIX_DILUTION'
  | 'PRE_BASE_PH_GATE'
  | 'CALMAG'
  | 'BASE'
  | 'ROOTS'
  | 'ENZYME'
  | 'BOOSTER'
  | 'PK'
  | 'BIOLOGICAL'
  | 'OTHER'
  | 'FINAL_MIX'
  | 'FINAL_EC_PH_GATE'
  | 'COMPLETE';

/**
 * Architectural process model. Product-dependent execution may omit product
 * roles that are absent from the recipe, but mandatory gates are inserted by
 * the execution state machine when their prerequisites are present.
 */
export const CANONICAL_PROCESS_MODEL: readonly CanonicalProcessStep[] = Object.freeze([
  'WATER',
  'SILICON',
  'MIX_DILUTION',
  'PRE_BASE_PH_GATE',
  'CALMAG',
  'BASE',
  'ROOTS',
  'ENZYME',
  'BOOSTER',
  'PK',
  'BIOLOGICAL',
  'OTHER',
  'FINAL_MIX',
  'FINAL_EC_PH_GATE',
  'COMPLETE',
]);

export function canonicalRoleOrder(role?: Product['mixingRole']): number {
  if (!role) return CANONICAL_MIXING_ROLE_ORDER.OTHER;
  return CANONICAL_MIXING_ROLE_ORDER[role] ?? CANONICAL_MIXING_ROLE_ORDER.OTHER;
}

export function canonicalProductOrder(product: Pick<Product, 'mixingRole'>): number {
  return canonicalRoleOrder(product.mixingRole);
}

export function compareProductsByCanonicalExecution(
  a: Pick<Product, 'id' | 'name' | 'mixingRole'>,
  b: Pick<Product, 'id' | 'name' | 'mixingRole'>,
): number {
  return (
    canonicalProductOrder(a) - canonicalProductOrder(b)
    || a.name.localeCompare(b.name)
    || a.id.localeCompare(b.id)
  );
}
