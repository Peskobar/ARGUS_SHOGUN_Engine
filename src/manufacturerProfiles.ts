import { GrowthStage, WaterType } from './types';

export type ManufacturerProfileId = 'TERRA_LEGACY_HARD_SOFT' | 'TERRA_LED_2024';
export type ManufacturerProfileSelection = 'AUTO' | ManufacturerProfileId;
export type WaterAdjustmentStatus = 'EXACT_RULE' | 'ASSUMED_FROM_WATER_CLASS' | 'BASELINE' | 'UNRESOLVED_BETWEEN_ANCHORS';

export interface ManufacturerSourceRecord {
  id: string;
  title: string;
  publisher: string;
  sourceUrl: string;
  mirrorUrl?: string;
  documentDate?: string;
  retrievedDate: string;
  status: 'CURRENT' | 'LEGACY' | 'MIRROR_OF_CURRENT';
  notes: string[];
}

export interface ManufacturerDosePoint {
  productId: string;
  stage: GrowthStage;
  weekStart: number;
  weekEnd: number;
  mlPerL: number;
  method: 'ROOT_FEED';
  sourceId: string;
  note?: string;
}

export interface ManufacturerProfile {
  id: ManufacturerProfileId;
  label: string;
  medium: 'TERRA_SOIL_PERLITE';
  sourceIds: string[];
  baselineWaterEc?: number;
  recommendedPh?: [number, number];
  dosePoints: ManufacturerDosePoint[];
  notes: string[];
}

export interface WaterAdjustmentResolution {
  percent: number;
  multiplier: number;
  status: WaterAdjustmentStatus;
  rationale: string;
  sourceId: string;
}

export const MANUFACTURER_SOURCE_REGISTRY: ManufacturerSourceRecord[] = [
  {
    id: 'shogun-downloads-current',
    title: 'SHOGUN Downloads — current feedchart index',
    publisher: 'SHOGUN Fertilisers',
    sourceUrl: 'https://www.shogunfertilisers.com/pages/downloads',
    retrievedDate: '2026-08-23',
    status: 'CURRENT',
    notes: [
      'Official current downloads page explicitly lists LED Coco and Terra Feedchart.',
      'This page proves the LED chart remains part of the current manufacturer documentation set.',
    ],
  },
  {
    id: 'shogun-led-terra-2024',
    title: 'SHOGUN LED Coco and Terra Feedchart — WEB',
    publisher: 'SHOGUN Fertilisers',
    sourceUrl: 'https://www.shogunfertilisers.com/pages/downloads',
    mirrorUrl: 'https://ghedirect.co.uk/download/88/shogun/1639855/shogun-led-coco-and-terra-feedchart-web.pdf',
    documentDate: '2024-04-05',
    retrievedDate: '2026-08-23',
    status: 'MIRROR_OF_CURRENT',
    notes: [
      'Official SHOGUN downloads page lists the chart; the mirror exposes the indexed PDF text and date.',
      'All chart amounts are expressed as mL/10 L and are normalised here to mL/L.',
      'Chart baseline is moderately hard water EC 0.4 mS/cm.',
    ],
  },
  {
    id: 'shogun-terra-legacy',
    title: 'SHOGUN Samurai Terra hard/soft feedchart',
    publisher: 'SHOGUN Fertilisers',
    sourceUrl: 'https://www.shogunfertilisers.com/media/yhqdxajh/shogun_-_terra_feedchart_new.pdf',
    retrievedDate: '2026-08-23',
    status: 'LEGACY',
    notes: ['Retained as a separate legacy profile. Never merge its values silently with TERRA_LED_2024.'],
  },
  {
    id: 'shogun-pk-current',
    title: 'SHOGUN PK Warrior 9/18 current product page',
    publisher: 'SHOGUN Fertilisers',
    sourceUrl: 'https://www.shogunfertilisers.com/products/pk-warrior-9-18',
    retrievedDate: '2026-08-23',
    status: 'CURRENT',
    notes: ['Standalone product instructions say to reduce bloom nutrients 25–50%; integrated-feedchart provenance must be handled separately.'],
  },
];

const led = (productId: string, stage: GrowthStage, weekStart: number, weekEnd: number, mlPerL: number, note?: string): ManufacturerDosePoint => ({
  productId,
  stage,
  weekStart,
  weekEnd,
  mlPerL,
  method: 'ROOT_FEED',
  sourceId: 'shogun-led-terra-2024',
  note,
});

export const TERRA_LED_2024_PROFILE: ManufacturerProfile = {
  id: 'TERRA_LED_2024',
  label: 'SHOGUN Terra · LED 2024',
  medium: 'TERRA_SOIL_PERLITE',
  sourceIds: ['shogun-downloads-current', 'shogun-led-terra-2024'],
  baselineWaterEc: 0.4,
  recommendedPh: [5.5, 6.5],
  dosePoints: [
    led('shogun-start', GrowthStage.SEEDLING, 1, 2, 4, 'Chart placement: cuttings/seedlings only.'),
    led('katana-roots', GrowthStage.SEEDLING, 1, 2, 5, 'Do not reinterpret as every-feed: current product protocol includes soak/cadence semantics.'),
    led('katana-roots', GrowthStage.VEG, 1, 4, 0.2),
    led('katana-roots', GrowthStage.BLOOM, 1, 3, 0.2),
    led('samurai-terra-grow', GrowthStage.VEG, 1, 2, 1.5),
    led('samurai-terra-grow', GrowthStage.VEG, 3, 4, 2.5),
    led('samurai-terra-bloom', GrowthStage.BLOOM, 1, 3, 3.5),
    led('samurai-terra-bloom', GrowthStage.BLOOM, 4, 4, 2.5),
    led('samurai-terra-bloom', GrowthStage.BLOOM, 5, 7, 2.0),
    led('sumo-active-boost', GrowthStage.BLOOM, 1, 8, 2.0),
    led('pk-warrior', GrowthStage.BLOOM, 4, 4, 1.0),
    led('pk-warrior', GrowthStage.BLOOM, 5, 7, 0.5),
    led('zenzym', GrowthStage.VEG, 1, 4, 2.5),
    led('zenzym', GrowthStage.BLOOM, 1, 8, 2.5),
    led('silicon', GrowthStage.VEG, 1, 4, 1.0),
    led('silicon', GrowthStage.BLOOM, 1, 7, 1.0),
  ],
  notes: [
    'Do not merge with legacy HARD/SOFT values. This is an independent manufacturer profile.',
    'Chart: baseline water EC 0.4 mS/cm; RO EC 0 uses +20% Terra nutrients, soft EC 0.2 uses +10%, hard EC 0.6+ uses −10%.',
    'The water percentage adjustment applies to Terra base nutrients, not blindly to every additive.',
    'CalMag is not a default row at baseline water: chart recommends 1 ml/L root treatment when using pure/distilled/RO and soft water.',
    'Terra application frequency depends on nutrient charge in the soil: manufacturer notes every watering or every 2–3 waterings may be appropriate.',
    'Premix Silicon in 5 L water and adjust to about pH 6.5 before adding to the nutrient tank. Final recommended pH is 5.5–6.5.',
  ],
};

export const TERRA_LEGACY_PROFILE: ManufacturerProfile = {
  id: 'TERRA_LEGACY_HARD_SOFT',
  label: 'SHOGUN Terra · Legacy HARD/SOFT',
  medium: 'TERRA_SOIL_PERLITE',
  sourceIds: ['shogun-terra-legacy'],
  dosePoints: [],
  notes: ['Dose windows remain owned by evidenceMatrix.ts. This profile exists so provenance is explicit and never confused with LED 2024.'],
};

export function getManufacturerProfile(id: ManufacturerProfileId) {
  return id === 'TERRA_LED_2024' ? TERRA_LED_2024_PROFILE : TERRA_LEGACY_PROFILE;
}

export function resolveManufacturerProfile(selection: ManufacturerProfileSelection = 'AUTO', usesLed?: boolean): ManufacturerProfile {
  if (selection === 'TERRA_LED_2024') return TERRA_LED_2024_PROFILE;
  if (selection === 'TERRA_LEGACY_HARD_SOFT') return TERRA_LEGACY_PROFILE;
  return usesLed === true ? TERRA_LED_2024_PROFILE : TERRA_LEGACY_PROFILE;
}

export function getProfileDosePoint(profile: ManufacturerProfile, productId: string, stage: GrowthStage, week: number) {
  return profile.dosePoints.find(point => point.productId === productId && point.stage === stage && week >= point.weekStart && week <= point.weekEnd);
}

export function resolveLedTerraWaterAdjustment(backgroundEc?: number, waterType?: WaterType): WaterAdjustmentResolution {
  const sourceId = 'shogun-led-terra-2024';
  const close = (value: number, anchor: number) => Math.abs(value - anchor) <= 0.03;

  if (backgroundEc !== undefined && Number.isFinite(backgroundEc) && backgroundEc >= 0) {
    if (close(backgroundEc, 0)) return { percent: 20, multiplier: 1.2, status: 'EXACT_RULE', rationale: 'LED chart: pure/distilled/RO water EC 0 → +20% Terra nutrients.', sourceId };
    if (close(backgroundEc, 0.2)) return { percent: 10, multiplier: 1.1, status: 'EXACT_RULE', rationale: 'LED chart: soft water EC 0.2 → +10% Terra nutrients.', sourceId };
    if (close(backgroundEc, 0.4)) return { percent: 0, multiplier: 1, status: 'BASELINE', rationale: 'LED chart baseline: moderately hard water EC 0.4.', sourceId };
    if (backgroundEc >= 0.6) return { percent: -10, multiplier: 0.9, status: 'EXACT_RULE', rationale: 'LED chart: hard water EC 0.6+ → −10% Coco/Terra nutrients.', sourceId };
    return {
      percent: 0,
      multiplier: 1,
      status: 'UNRESOLVED_BETWEEN_ANCHORS',
      rationale: `Measured EC ${backgroundEc.toFixed(2)} lies between explicit LED-chart anchors. No interpolation is performed; baseline dose remains visible pending calculator/user decision.`,
      sourceId,
    };
  }

  if (waterType === WaterType.RO) return { percent: 20, multiplier: 1.2, status: 'ASSUMED_FROM_WATER_CLASS', rationale: 'RO selected without EC measurement: LED-chart EC 0 rule used as an explicit assumption.', sourceId };
  if (waterType === WaterType.SOFT) return { percent: 10, multiplier: 1.1, status: 'ASSUMED_FROM_WATER_CLASS', rationale: 'SOFT selected without EC measurement: LED-chart EC 0.2 rule used as an explicit assumption.', sourceId };
  if (waterType === WaterType.HARD) return { percent: -10, multiplier: 0.9, status: 'ASSUMED_FROM_WATER_CLASS', rationale: 'HARD selected without EC measurement: LED-chart EC 0.6+ rule used as an explicit assumption.', sourceId };
  return { percent: 0, multiplier: 1, status: 'UNRESOLVED_BETWEEN_ANCHORS', rationale: 'Water context unresolved: baseline LED dose shown without automatic percentage adjustment.', sourceId };
}

export function ledCalMagDoseMlPerL(backgroundEc?: number, waterType?: WaterType): { dose: number | null; rationale: string } {
  if (backgroundEc !== undefined && Number.isFinite(backgroundEc) && backgroundEc >= 0) {
    if (backgroundEc <= 0.23) return { dose: 1, rationale: 'LED chart recommends CalMag 1 ml/L for pure/distilled/RO and soft water.' };
    return { dose: null, rationale: 'LED chart does not schedule default CalMag at the EC 0.4 baseline or harder water; do not add it automatically.' };
  }
  if (waterType === WaterType.RO || waterType === WaterType.SOFT) return { dose: 1, rationale: 'RO/SOFT selected: LED chart recommends CalMag 1 ml/L root treatment.' };
  if (waterType === WaterType.HARD) return { dose: null, rationale: 'HARD selected: LED chart does not give a default CalMag row.' };
  return { dose: null, rationale: 'Unknown water: CalMag remains conditional until EC/water profile is known.' };
}

export function isTerraBaseProduct(productId: string) {
  return productId === 'samurai-terra-grow' || productId === 'samurai-terra-bloom';
}
