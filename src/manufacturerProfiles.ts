import { GrowthStage, WaterType } from './types';

export type ManufacturerProfileId = 'TERRA_LEGACY_HARD_SOFT' | 'TERRA_LED_2024';
export type ManufacturerProfileSelection = 'AUTO' | ManufacturerProfileId;
export type WaterAdjustmentStatus = 'EXACT_RULE' | 'ASSUMED_FROM_WATER_CLASS' | 'BASELINE' | 'UNRESOLVED_BETWEEN_ANCHORS';
export type ManufacturerAuditStatus = 'CONFIRMED' | 'PARTIAL' | 'OBSOLETE';

export interface ManufacturerSourceRecord {
  id: string;
  title: string;
  publisher: string;
  sourceUrl: string;
  mirrorUrl?: string;
  documentDate?: string;
  retrievedDate: string;
  status: 'CURRENT' | 'LEGACY' | 'MIRROR_OF_CURRENT';
  auditStatus: ManufacturerAuditStatus;
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
  auditStatus: ManufacturerAuditStatus;
  snapshotFrozen: boolean;
  releaseEligible: boolean;
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
    auditStatus: 'CONFIRMED',
    notes: [
      'Official current downloads page lists LED Coco and Terra feedchart.',
      'It confirms existence/current listing, not a frozen version/date of every table row.',
    ],
  },
  {
    id: 'shogun-led-terra-2024',
    title: 'SHOGUN LED Coco and Terra Feedchart — implementation snapshot candidate',
    publisher: 'SHOGUN Fertilisers',
    sourceUrl: 'https://www.shogunfertilisers.com/pages/downloads',
    mirrorUrl: 'https://ghedirect.co.uk/download/88/shogun/1639855/shogun-led-coco-and-terra-feedchart-web.pdf',
    documentDate: '2024-04-05',
    retrievedDate: '2026-08-23',
    status: 'MIRROR_OF_CURRENT',
    auditStatus: 'PARTIAL',
    notes: [
      'Independent Work audit confirms the LED profile exists on current Downloads but does not accept the mirror date as an official SHOGUN version stamp.',
      'The internal id TERRA_LED_2024 is retained for compatibility; 2024 must not be presented as a verified official publication version.',
      'All imported chart points remain preview data until a full reproducible manufacturer snapshot is frozen and reconciled.',
    ],
  },
  {
    id: 'shogun-terra-legacy',
    title: 'SHOGUN Samurai Terra hard/soft feedchart',
    publisher: 'SHOGUN Fertilisers',
    sourceUrl: 'https://www.shogunfertilisers.com/media/yhqdxajh/shogun_-_terra_feedchart_new.pdf',
    retrievedDate: '2026-08-23',
    status: 'LEGACY',
    auditStatus: 'OBSOLETE',
    notes: [
      'Independent Work audit classifies this static hard/soft chart as archived/obsolete for current-plan authority.',
      'Retain only for provenance/history. Never mix its numbers with current generator/LED profile.',
    ],
  },
  {
    id: 'shogun-pk-current',
    title: 'SHOGUN PK Warrior 9/18 current product page',
    publisher: 'SHOGUN Fertilisers',
    sourceUrl: 'https://www.shogunfertilisers.com/products/pk-warrior-9-18',
    retrievedDate: '2026-08-23',
    status: 'CURRENT',
    auditStatus: 'PARTIAL',
    notes: [
      'Standalone instructions say to reduce Bloom nutrients 25–50%.',
      'Independent audit found a conflicting generic 4 ml/L field versus detailed 0.5 ml/L / first-week 1 ml/L instructions. Structured method/stage/source provenance is mandatory.',
    ],
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
  label: 'SHOGUN Terra · LED current · PARTIAL snapshot',
  medium: 'TERRA_SOIL_PERLITE',
  sourceIds: ['shogun-downloads-current', 'shogun-led-terra-2024'],
  baselineWaterEc: 0.4,
  recommendedPh: [5.5, 6.5],
  auditStatus: 'PARTIAL',
  snapshotFrozen: false,
  releaseEligible: false,
  dosePoints: [
    led('shogun-start', GrowthStage.SEEDLING, 1, 2, 4, 'Preview snapshot: cuttings/seedlings placement.'),
    led('katana-roots', GrowthStage.SEEDLING, 1, 2, 5, 'Method branch is mandatory; do not reinterpret as routine root feed.'),
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
    'Work audit verdict: WEEKLY PLAN remains HOLD until the complete current LED/generator profile is frozen with full tuple, timestamp and reproducible source snapshot.',
    'Do not merge with legacy HARD/SOFT values.',
    'Water anchors are preview semantics only: EC 0 / 0.2 / 0.4 / 0.6+. No interpolation between anchors.',
    'A water-class label alone never creates a numeric modifier.',
    'CalMag is conditional and must not be auto-added from EC alone; Ca/Mg/alkalinity/base/substrate context is required.',
    'Silicon process keeps PRE_BASE_PH_GATE separate from FINAL_PH_ADJUSTMENT.',
  ],
};

export const TERRA_LEGACY_PROFILE: ManufacturerProfile = {
  id: 'TERRA_LEGACY_HARD_SOFT',
  label: 'SHOGUN Terra · Legacy HARD/SOFT · OBSOLETE for auto plan',
  medium: 'TERRA_SOIL_PERLITE',
  sourceIds: ['shogun-terra-legacy'],
  dosePoints: [],
  auditStatus: 'OBSOLETE',
  snapshotFrozen: true,
  releaseEligible: false,
  notes: [
    'Dose windows remain in evidenceMatrix.ts for historical comparison only.',
    'Independent audit says this source is not on current Downloads and must not drive a current adaptive weekly plan.',
  ],
};

export function getManufacturerProfile(id: ManufacturerProfileId) {
  return id === 'TERRA_LED_2024' ? TERRA_LED_2024_PROFILE : TERRA_LEGACY_PROFILE;
}

export function resolveManufacturerProfile(selection: ManufacturerProfileSelection = 'AUTO', usesLed?: boolean): ManufacturerProfile {
  if (selection === 'TERRA_LED_2024') return TERRA_LED_2024_PROFILE;
  if (selection === 'TERRA_LEGACY_HARD_SOFT') return TERRA_LEGACY_PROFILE;
  return usesLed === true ? TERRA_LED_2024_PROFILE : TERRA_LEGACY_PROFILE;
}

export function profileCanDriveWeeklyPlan(profile: ManufacturerProfile) {
  return profile.auditStatus === 'CONFIRMED' && profile.snapshotFrozen && profile.releaseEligible;
}

export function getProfileDosePoint(profile: ManufacturerProfile, productId: string, stage: GrowthStage, week: number) {
  return profile.dosePoints.find(point => point.productId === productId && point.stage === stage && week >= point.weekStart && week <= point.weekEnd);
}

export function resolveLedTerraWaterAdjustment(backgroundEc?: number, waterType?: WaterType): WaterAdjustmentResolution {
  const sourceId = 'shogun-led-terra-2024';
  const close = (value: number, anchor: number) => Math.abs(value - anchor) <= 0.03;

  if (backgroundEc !== undefined && Number.isFinite(backgroundEc) && backgroundEc >= 0) {
    if (close(backgroundEc, 0)) return { percent: 20, multiplier: 1.2, status: 'EXACT_RULE', rationale: 'Preview LED source anchor: source EC ~0 → +20% Terra base.', sourceId };
    if (close(backgroundEc, 0.2)) return { percent: 10, multiplier: 1.1, status: 'EXACT_RULE', rationale: 'Preview LED source anchor: source EC ~0.2 → +10% Terra base.', sourceId };
    if (close(backgroundEc, 0.4)) return { percent: 0, multiplier: 1, status: 'BASELINE', rationale: 'Preview LED source anchor: source EC ~0.4 baseline.', sourceId };
    if (backgroundEc >= 0.6) return { percent: -10, multiplier: 0.9, status: 'EXACT_RULE', rationale: 'Preview LED source anchor: source EC 0.6+ → −10% Terra base.', sourceId };
    return {
      percent: 0,
      multiplier: 1,
      status: 'UNRESOLVED_BETWEEN_ANCHORS',
      rationale: `Measured source EC ${backgroundEc.toFixed(2)} lies between explicit preview anchors. No interpolation is performed.`,
      sourceId,
    };
  }

  const declaration = waterType === WaterType.RO
    ? 'RO'
    : waterType === WaterType.SOFT
      ? 'SOFT'
      : waterType === WaterType.HARD
        ? 'HARD'
        : 'unknown';
  return {
    percent: 0,
    multiplier: 1,
    status: 'UNRESOLVED_BETWEEN_ANCHORS',
    rationale: `Water declared as ${declaration}, but source EC is not a live measurement. No numeric water adjustment is inferred from the label.`,
    sourceId,
  };
}

export function ledCalMagDoseMlPerL(backgroundEc?: number, waterType?: WaterType): { dose: number | null; rationale: string } {
  const ecText = backgroundEc !== undefined && Number.isFinite(backgroundEc) ? `source EC ${backgroundEc.toFixed(2)}` : 'source EC unknown';
  const label = waterType ?? WaterType.CUSTOM;
  return {
    dose: null,
    rationale: `CalMag remains NEEDS_USER_DATA (${ecText}, declared ${label}). Independent audit blocks automatic CalMag selection from EC/water label alone; require Ca, Mg, alkalinity/base and substrate context.`,
  };
}

export function isTerraBaseProduct(productId: string) {
  return productId === 'samurai-terra-grow' || productId === 'samurai-terra-bloom';
}
