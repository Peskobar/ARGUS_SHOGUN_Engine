import { EvidenceRef, ProductEvidence } from './evidenceMatrix';
import { GrowthStage } from './types';

export const SUPPLEMENTAL_EVIDENCE_REFS: EvidenceRef[] = [
  {
    id: 'shogun-start-current',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN Start current product page',
    url: 'https://www.shogunfertilisers.com/products/start',
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'shogun-start-sds-2024',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN Start Safety Data Sheet — revision 15/10/2024',
    url: 'https://cdn.shopify.com/s/files/1/0932/3692/0706/files/aqualabs_shogun-start_gb_sds_15_10_24.pdf',
    year: 2024,
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
];

/**
 * Current product page says 4 ml/L through the first two weeks of early veg,
 * while the static/simplified feedchart historically places Start in the
 * cuttings/seedlings columns. We expose the conflict instead of silently
 * combining Start with Terra Grow.
 */
export const SHOGUN_START_EVIDENCE: ProductEvidence = {
  productId: 'shogun-start',
  role: 'CONDITIONAL',
  status: 'CONFLICT',
  manufacturerDoseWindows: [
    {
      stage: GrowthStage.VEG,
      weekStart: 1,
      weekEnd: 2,
      minMlPerL: 4,
      maxMlPerL: 4,
      method: 'ROOT_FEED',
      note: 'Current product page: early veg feed 4 ml/L for the first two weeks until plant-on. Static feedchart placement differs, so do not auto-combine with Terra Grow until provenance is resolved.',
    },
  ],
  why: [
    'Current SHOGUN page positions Start as a gentle early feed with full trace elements and reduced NPK strength for establishment.',
    'The product page explicitly supports soil, coco and hydro, but the exact transition from Start to the normal Terra base must be resolved from the current generated chart.',
  ],
  less: [
    'Reducing Start may reduce the intended early-feed support, but the app must not infer a deficiency threshold from marketing copy or SDS composition.',
  ],
  more: [
    'Do not exceed 4 ml/L merely because the product is described as gentle. The current manufacturer page gives 4 ml/L as the dilution rate.',
  ],
  omit: [
    'Omitting Start removes the dedicated early-feed product; it does not prove the seedling is unfed if the medium itself contains nutrients or another verified establishment protocol is used.',
  ],
  interactions: [
    'Current product copy says Start pairs with Katana Roots, but the app does not yet have a source-backed combined soak/feed protocol. Keep the two instructions distinct until the generated chart is captured.',
    'Do not automatically stack Start 4 ml/L on top of a full Terra Grow W1–W2 dose while the product-page vs feedchart transition remains unresolved.',
  ],
  hardRules: [
    'Shake the Start bottle before use.',
    'Treat 4 ml/L as the current manufacturer dilution rate, not a user-adjustable multiplier.',
  ],
  unresolved: [
    'Resolve current calculator output for Terra + water type + schedule profile to determine exactly when Start ends and Terra Grow begins.',
    'SDS composition is partial hazard disclosure, not a guaranteed elemental analysis.',
  ],
  refs: ['shogun-start-current', 'shogun-start-sds-2024'],
};

export function getSupplementalEvidenceRef(id: string) {
  return SUPPLEMENTAL_EVIDENCE_REFS.find(ref => ref.id === id);
}
