import { GrowthStage, WaterType } from './types';

export type VerificationDimensionStatus = 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' | 'CONFLICT';
export type FeedingScheduleProfile = 'LIGHT' | 'STANDARD' | 'HEAVY' | 'UNRESOLVED';
export type DoseProvenanceMode = 'INTEGRATED_FEEDCHART' | 'STANDALONE_PRODUCT_RATE' | 'LEGACY_STATIC';
export type ApplicationCadence = 'ONCE' | 'WEEKLY' | 'EVERY_FEED' | 'WINDOW_ONLY';

export interface VerificationDimensions {
  doseStatus: VerificationDimensionStatus;
  processStatus: VerificationDimensionStatus;
  compositionStatus: VerificationDimensionStatus;
  scienceGuardrailStatus: VerificationDimensionStatus;
}

export interface ApplicationProtocolEvidence {
  productId: string;
  stage: GrowthStage;
  concentrationMlPerL: number;
  method: 'SOAK' | 'ROOT_FEED' | 'FOLIAR';
  cadence: ApplicationCadence;
  durationMinutes?: number;
  note: string;
  sourceUrl: string;
}

export interface FeedingEnvironment {
  leafTemperatureC?: number;
  relativeHumidity?: number;
  usesLed?: boolean;
  closedLoopActiveCoolingWithCo2?: boolean;
}

export const PRODUCT_VERIFICATION: Record<string, VerificationDimensions> = {
  'samurai-terra-grow': { doseStatus: 'VERIFIED', processStatus: 'VERIFIED', compositionStatus: 'PARTIAL', scienceGuardrailStatus: 'VERIFIED' },
  'samurai-terra-bloom': { doseStatus: 'VERIFIED', processStatus: 'VERIFIED', compositionStatus: 'PARTIAL', scienceGuardrailStatus: 'VERIFIED' },
  'katana-roots': { doseStatus: 'VERIFIED', processStatus: 'PARTIAL', compositionStatus: 'UNVERIFIED', scienceGuardrailStatus: 'PARTIAL' },
  zenzym: { doseStatus: 'VERIFIED', processStatus: 'VERIFIED', compositionStatus: 'PARTIAL', scienceGuardrailStatus: 'PARTIAL' },
  silicon: { doseStatus: 'VERIFIED', processStatus: 'VERIFIED', compositionStatus: 'PARTIAL', scienceGuardrailStatus: 'VERIFIED' },
  calmag: { doseStatus: 'VERIFIED', processStatus: 'VERIFIED', compositionStatus: 'PARTIAL', scienceGuardrailStatus: 'VERIFIED' },
  'sumo-active-boost': { doseStatus: 'VERIFIED', processStatus: 'VERIFIED', compositionStatus: 'PARTIAL', scienceGuardrailStatus: 'PARTIAL' },
  'pk-warrior': { doseStatus: 'VERIFIED', processStatus: 'PARTIAL', compositionStatus: 'PARTIAL', scienceGuardrailStatus: 'VERIFIED' },
};

export const APPLICATION_PROTOCOLS: ApplicationProtocolEvidence[] = [
  {
    productId: 'katana-roots',
    stage: GrowthStage.SEEDLING,
    concentrationMlPerL: 5,
    method: 'SOAK',
    cadence: 'ONCE',
    durationMinutes: 15,
    note: 'Namocz kostki lub plugi w roztworze 5 ml/L przez 15 minut.',
    sourceUrl: 'https://www.shogunfertilisers.com/products/katana-roots',
  },
  {
    productId: 'katana-roots',
    stage: GrowthStage.SEEDLING,
    concentrationMlPerL: 5,
    method: 'ROOT_FEED',
    cadence: 'WEEKLY',
    note: 'Po początkowym namaczaniu podlewaj tym samym roztworem raz w tygodniu do przesadzenia.',
    sourceUrl: 'https://www.shogunfertilisers.com/products/katana-roots',
  },
];

export const PARTIAL_SDS_COMPOSITION = {
  'samurai-terra-grow': {
    revision: '2024-10-10',
    sourceUrl: 'https://cdn.shopify.com/s/files/1/0932/3692/0706/files/aqualabs_shogun-terragrow_gb_sds_10_10_24.pdf',
    disclosure: [
      'ammonium nitrate 10–15% w/w',
      'potassium nitrate 3–5% w/w',
      'potassium dihydrogen phosphate 1–3% w/w',
      'magnesium nitrate 1–3% w/w',
      'potassium sulfate 1–3% w/w',
      'sodium nitrate 1–3% w/w',
    ],
    productPh: 2.2,
    densityGcm3: 1.13,
  },
  'samurai-terra-bloom': {
    revision: '2024-10-10',
    sourceUrl: 'https://cdn.shopify.com/s/files/1/0932/3692/0706/files/aqualabs_shogun-terrabloom_gb_sds_10_10_24.pdf',
    disclosure: [
      'potassium nitrate 5–10% w/w',
      'ammonium nitrate 5–10% w/w',
      'magnesium nitrate 3–5% w/w',
      'potassium dihydrogen phosphate 3–5% w/w',
      'potassium sulfate 1–3% w/w',
    ],
    productPh: 2.6,
    densityGcm3: 1.133,
  },
  silicon: {
    revision: '2024-10-15',
    sourceUrl: 'https://www.shogunfertilisers.com/media/x54hxc2s/aqualabs_shogun-silicon_gb_sds_15_10_24.pdf',
    disclosure: ['silicic acid, potassium salt 25–40% w/w'],
  },
} as const;

export function classifyShogunWaterFromMeasuredEc(backgroundEc?: number): WaterType | 'BOUNDARY' | null {
  if (backgroundEc === undefined || !Number.isFinite(backgroundEc) || backgroundEc < 0) return null;
  if (backgroundEc > 0.4) return WaterType.HARD;
  if (backgroundEc < 0.4) return WaterType.SOFT;
  return 'BOUNDARY';
}

export function getManufacturerScheduleSignals(environment: FeedingEnvironment): FeedingScheduleProfile[] {
  const signals: FeedingScheduleProfile[] = [];
  if (
    environment.leafTemperatureC !== undefined
    && environment.relativeHumidity !== undefined
    && environment.leafTemperatureC > 25
    && environment.relativeHumidity < 50
  ) signals.push('LIGHT');

  if (
    environment.leafTemperatureC !== undefined
    && environment.relativeHumidity !== undefined
    && environment.leafTemperatureC < 25
    && environment.relativeHumidity > 50
  ) signals.push('STANDARD');

  if (environment.usesLed === true || environment.closedLoopActiveCoolingWithCo2 === true) signals.push('HEAVY');
  return signals.length ? signals : ['UNRESOLVED'];
}

export function pkBaseAdjustmentPolicy(provenance: DoseProvenanceMode) {
  if (provenance === 'STANDALONE_PRODUCT_RATE') {
    return {
      requiresExplicitAdjustment: true,
      message: 'PK Warrior product instructions call for reducing Bloom base by 25–50%. Select the reduction explicitly; never hide it inside the calculation.',
    };
  }
  if (provenance === 'INTEGRATED_FEEDCHART') {
    return {
      requiresExplicitAdjustment: false,
      message: 'Do not subtract another 25–50% automatically from an integrated feedchart value until the chart provenance proves that a second reduction is intended.',
    };
  }
  return {
    requiresExplicitAdjustment: true,
    message: 'Legacy/static provenance is ambiguous. Block automatic PK/base arithmetic until source provenance is resolved.',
  };
}
