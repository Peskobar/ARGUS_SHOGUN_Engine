import type { MixingRole } from '../domain/taxonomy.ts';

export type ProductKind = 'FERTILIZER' | 'ADDITIVE' | 'BIOLOGICAL' | 'READY_TO_USE';

export interface ProductIdentity {
  id: string;
  name: string;
  brand: 'SHOGUN' | 'CUSTOM';
  type: ProductKind;
  unit: 'ml' | 'g';
  mixingRole: MixingRole;
  provenance: {
    donorPath: string;
    donorCommit: string;
    transplantStatus: 'PROMOTED_STRUCTURE';
  };
}

const provenance = {
  donorPath: 'legacy/ARGUS_SHOGUN_Engine_v1/src/data.ts',
  donorCommit: 'cfbb3e2e48f89b61441555d7c8eac3dec6ab44cf',
  transplantStatus: 'PROMOTED_STRUCTURE' as const,
};

/**
 * Structural identities only.
 * Intentionally contains no dose, stock quantity, foliar claim,
 * medium compatibility claim, source claim, or UI color.
 */
export const PRODUCT_IDENTITIES: readonly ProductIdentity[] = [
  { id: 'shogun-start', name: 'Shogun Start', brand: 'SHOGUN', type: 'FERTILIZER', unit: 'ml', mixingRole: 'BASE', provenance },
  { id: 'samurai-terra-grow', name: 'Samurai Terra Grow', brand: 'SHOGUN', type: 'FERTILIZER', unit: 'ml', mixingRole: 'BASE', provenance },
  { id: 'samurai-terra-bloom', name: 'Samurai Terra Bloom', brand: 'SHOGUN', type: 'FERTILIZER', unit: 'ml', mixingRole: 'BASE', provenance },
  { id: 'katana-roots', name: 'Katana Roots', brand: 'SHOGUN', type: 'ADDITIVE', unit: 'ml', mixingRole: 'ROOTS', provenance },
  { id: 'zenzym', name: 'Zenzym', brand: 'SHOGUN', type: 'ADDITIVE', unit: 'ml', mixingRole: 'ENZYME', provenance },
  { id: 'silicon', name: 'Silicon', brand: 'SHOGUN', type: 'ADDITIVE', unit: 'ml', mixingRole: 'SILICON', provenance },
  { id: 'calmag', name: 'CalMag', brand: 'SHOGUN', type: 'ADDITIVE', unit: 'ml', mixingRole: 'CALMAG', provenance },
  { id: 'sumo-active-boost', name: 'Sumo Active Boost', brand: 'SHOGUN', type: 'ADDITIVE', unit: 'ml', mixingRole: 'BOOSTER', provenance },
  { id: 'pk-warrior', name: 'PK Warrior 9/18', brand: 'SHOGUN', type: 'ADDITIVE', unit: 'ml', mixingRole: 'PK', provenance },
  { id: 'geisha-foliar', name: 'Geisha Foliar', brand: 'SHOGUN', type: 'READY_TO_USE', unit: 'ml', mixingRole: 'READY_TO_USE', provenance },
  { id: 'myco-bio', name: 'Mycorrhiza Bio', brand: 'CUSTOM', type: 'BIOLOGICAL', unit: 'g', mixingRole: 'BIOLOGICAL', provenance },
] as const;

export function getProductIdentity(id: string): ProductIdentity | undefined {
  return PRODUCT_IDENTITIES.find((product) => product.id === id);
}
