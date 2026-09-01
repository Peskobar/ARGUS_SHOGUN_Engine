export const DOMAIN_TAXONOMY = {
  medium: ['TERRA', 'COCO', 'HYDRO', 'CUSTOM'],
  waterType: ['SOFT', 'HARD', 'RO', 'CUSTOM'],
  applicationMethod: ['ROOT_FEED', 'FOLIAR', 'READY_TO_SPRAY', 'SOAK', 'MEDIA_TREATMENT'],
  growthStage: ['SEEDLING', 'VEG', 'BLOOM', 'FLUSH', 'ALL'],
  mixingRole: [
    'SILICON',
    'CALMAG',
    'BASE',
    'ROOTS',
    'ENZYME',
    'BOOSTER',
    'PK',
    'BIOLOGICAL',
    'READY_TO_USE',
    'OTHER',
    'PH_ADJUSTER',
  ],
  recipeVerificationStatus: ['UNVERIFIED', 'VERIFIED', 'CONFLICT'],
  allocationMode: ['PRECISION', 'SPEED', 'MIN_TOOLS'],
  executionVolumeUnit: ['L', 'ml'],
} as const;

export type Medium = (typeof DOMAIN_TAXONOMY.medium)[number];
export type WaterType = (typeof DOMAIN_TAXONOMY.waterType)[number];
export type ApplicationMethod = (typeof DOMAIN_TAXONOMY.applicationMethod)[number];
export type GrowthStage = (typeof DOMAIN_TAXONOMY.growthStage)[number];
export type MixingRole = (typeof DOMAIN_TAXONOMY.mixingRole)[number];
export type RecipeVerificationStatus = (typeof DOMAIN_TAXONOMY.recipeVerificationStatus)[number];
export type AllocationMode = (typeof DOMAIN_TAXONOMY.allocationMode)[number];
export type ExecutionVolumeUnit = (typeof DOMAIN_TAXONOMY.executionVolumeUnit)[number];
