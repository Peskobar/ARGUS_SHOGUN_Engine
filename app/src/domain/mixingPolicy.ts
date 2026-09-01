import type { ApplicationMethod, MixingRole } from './taxonomy.ts';

export type MixingPolicyIssueCode =
  | 'SILICON_AFTER_BASE'
  | 'TERRA_GROW_BLOOM_TOGETHER'
  | 'FINAL_PH_CHECK_MISSING'
  | 'FINAL_EC_CHECK_MISSING';

export interface MixingPolicyIssue {
  code: MixingPolicyIssueCode;
  message: string;
  evidenceStatus: 'VERIFIED_MANUFACTURER' | 'ARCHITECTURAL';
  /** Policy findings are advisory/domain facts. UI control mode decides presentation. */
  blocking: false;
}

export interface MixingProductStep {
  productId: string;
  mixingRole: MixingRole;
}

export interface FinalMeasurementState {
  phChecked: boolean;
  ecChecked: boolean;
}

export interface MixingPolicyInput {
  method: ApplicationMethod;
  orderedProducts: readonly MixingProductStep[];
  finalMeasurements?: FinalMeasurementState;
}

export const VERIFIED_MIXING_POLICY = {
  provenance: {
    reviewedAt: '2026-09-01',
    auditPath: 'transplant/review/mixing-policy-audit.md',
    manufacturerSources: [
      'https://www.shogunfertilisers.com/products/silicon',
      'https://www.shogunfertilisers.com/products/calmag',
      'https://www.shogunfertilisers.com/products/samurai-terra',
      'https://www.shogunfertilisers.com/products/katana-roots',
      'https://www.shogunfertilisers.com/products/zenzym',
      'https://www.shogunfertilisers.com/products/sumo-active-boost',
      'https://www.shogunfertilisers.com/products/pk-warrior-9-18',
    ] as const,
  },
  process: {
    carrierWaterFirst: true,
    concentratedProductsMustNotBePremixedTogether: true,
    mixAfterAdditionAdvisory: true,
  },
  verifiedRelations: [
    { beforeRole: 'SILICON', afterRole: 'BASE', id: 'silicon-before-base' },
  ] as const,
  mutuallyExclusiveProductSets: [
    ['samurai-terra-grow', 'samurai-terra-bloom'],
  ] as const,
  finalMeasurements: {
    ph: true,
    ec: true,
    orderedRelativeToEachOther: false,
  },
} as const;

/**
 * Evaluates only promoted evidence-backed rules.
 * It intentionally does not implement the donor's full role chain and never
 * returns a hard operator block.
 */
export function inspectMixingPolicy(input: MixingPolicyInput): MixingPolicyIssue[] {
  const issues: MixingPolicyIssue[] = [];

  if (input.method === 'ROOT_FEED') {
    const firstBase = input.orderedProducts.findIndex((step) => step.mixingRole === 'BASE');
    const lastSilicon = input.orderedProducts.reduce(
      (last, step, index) => (step.mixingRole === 'SILICON' ? index : last),
      -1,
    );

    if (firstBase >= 0 && lastSilicon > firstBase) {
      issues.push({
        code: 'SILICON_AFTER_BASE',
        message: 'Silicon znajduje się po nawozie bazowym w kolejności mieszania.',
        evidenceStatus: 'VERIFIED_MANUFACTURER',
        blocking: false,
      });
    }
  }

  const ids = new Set(input.orderedProducts.map((step) => step.productId));
  if (ids.has('samurai-terra-grow') && ids.has('samurai-terra-bloom')) {
    issues.push({
      code: 'TERRA_GROW_BLOOM_TOGETHER',
      message: 'Samurai Terra Grow i Samurai Terra Bloom występują w tej samej mieszance.',
      evidenceStatus: 'VERIFIED_MANUFACTURER',
      blocking: false,
    });
  }

  if (input.method === 'ROOT_FEED' && input.finalMeasurements) {
    if (!input.finalMeasurements.phChecked) {
      issues.push({
        code: 'FINAL_PH_CHECK_MISSING',
        message: 'Końcowa kontrola pH nie została oznaczona jako wykonana.',
        evidenceStatus: 'VERIFIED_MANUFACTURER',
        blocking: false,
      });
    }
    if (!input.finalMeasurements.ecChecked) {
      issues.push({
        code: 'FINAL_EC_CHECK_MISSING',
        message: 'Końcowa kontrola EC nie została oznaczona jako wykonana.',
        evidenceStatus: 'VERIFIED_MANUFACTURER',
        blocking: false,
      });
    }
  }

  return issues;
}
