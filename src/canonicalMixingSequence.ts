import { MixingRole, type Product } from './types.ts';

/**
 * Single domain authority for physical nutrient-mixing order.
 *
 * IMPORTANT:
 * - UI/display sorting is not execution authority.
 * - Persisted/custom recipe order is not execution authority.
 * - Both Technik Żywienia and Planner must derive physical order from this module.
 */
export const CANONICAL_MIXING_ROLE_ORDER: Readonly<Record<MixingRole, number>> = Object.freeze({
  [MixingRole.SILICON]: 100,
  [MixingRole.CALMAG]: 300,
  [MixingRole.BASE]: 400,
  [MixingRole.ROOTS]: 500,
  [MixingRole.ENZYME]: 600,
  [MixingRole.BOOSTER]: 700,
  [MixingRole.PK]: 800,
  [MixingRole.BIOLOGICAL]: 850,
  [MixingRole.OTHER]: 900,
  [MixingRole.PH_ADJUSTER]: 1000,
  [MixingRole.READY_TO_USE]: 1100,
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

export function canonicalRoleOrder(role?: MixingRole): number {
  if (!role) return CANONICAL_MIXING_ROLE_ORDER[MixingRole.OTHER];
  return CANONICAL_MIXING_ROLE_ORDER[role] ?? CANONICAL_MIXING_ROLE_ORDER[MixingRole.OTHER];
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
