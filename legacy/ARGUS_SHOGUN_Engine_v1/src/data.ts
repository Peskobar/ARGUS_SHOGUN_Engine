import { Product, Medium, ApplicationMethod, GrowthStage, MixingRole, Recipe, SyringeType } from './types';

export const SHOGUN_PRODUCTS: Product[] = [
  {
    id: 'shogun-start',
    mixingRole: MixingRole.BASE,
    name: 'Shogun Start',
    brand: 'SHOGUN',
    color: 'bg-emerald-300',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: false,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'FERTILIZER'
  },
  {
    id: 'samurai-terra-grow',
    mixingRole: MixingRole.BASE,
    name: 'Samurai Terra Grow',
    brand: 'SHOGUN',
    color: 'bg-green-600',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: false,
    compatibleMedia: [Medium.TERRA],
    type: 'FERTILIZER'
  },
  {
    id: 'samurai-terra-bloom',
    mixingRole: MixingRole.BASE,
    name: 'Samurai Terra Bloom',
    brand: 'SHOGUN',
    color: 'bg-orange-500',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: false,
    compatibleMedia: [Medium.TERRA],
    type: 'FERTILIZER'
  },
  {
    id: 'katana-roots',
    mixingRole: MixingRole.ROOTS,
    name: 'Katana Roots',
    brand: 'SHOGUN',
    color: 'bg-amber-700',
    initialCapacity: 250,
    remainingCapacity: 250,
    unit: 'ml',
    foliarAllowed: true,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'ADDITIVE'
  },
  {
    id: 'zenzym',
    mixingRole: MixingRole.ENZYME,
    name: 'Zenzym',
    brand: 'SHOGUN',
    color: 'bg-yellow-400',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: false,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'ADDITIVE'
  },
  {
    id: 'silicon',
    mixingRole: MixingRole.SILICON,
    name: 'Silicon',
    brand: 'SHOGUN',
    color: 'bg-blue-300',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: false,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'ADDITIVE'
  },
  {
    id: 'calmag',
    mixingRole: MixingRole.CALMAG,
    name: 'CalMag',
    brand: 'SHOGUN',
    color: 'bg-zinc-300',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: true,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'ADDITIVE'
  },
  {
    id: 'sumo-active-boost',
    mixingRole: MixingRole.BOOSTER,
    name: 'Sumo Active Boost',
    brand: 'SHOGUN',
    color: 'bg-red-500',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: true,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'ADDITIVE'
  },
  {
    id: 'pk-warrior',
    mixingRole: MixingRole.PK,
    name: 'PK Warrior 9/18',
    brand: 'SHOGUN',
    color: 'bg-pink-600',
    initialCapacity: 1000,
    remainingCapacity: 1000,
    unit: 'ml',
    foliarAllowed: false,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'ADDITIVE'
  },
  {
    id: 'geisha-foliar',
    mixingRole: MixingRole.READY_TO_USE,
    name: 'Geisha Foliar',
    brand: 'SHOGUN',
    color: 'bg-fuchsia-400',
    initialCapacity: 750,
    remainingCapacity: 750,
    unit: 'ml',
    foliarAllowed: true,
    compatibleMedia: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    type: 'READY_TO_USE'
  },
  {
    id: 'myco-bio',
    mixingRole: MixingRole.BIOLOGICAL,
    name: 'Mycorrhiza Bio',
    brand: 'CUSTOM',
    color: 'bg-stone-500',
    initialCapacity: 100,
    remainingCapacity: 100,
    unit: 'g',
    foliarAllowed: false,
    compatibleMedia: [Medium.TERRA, Medium.COCO],
    type: 'BIOLOGICAL'
  }
];

/**
 * Factory doses remain UNVERIFIED until the evidence-first dose audit is done.
 * Ingredient array order mirrors the default physical execution order for
 * readability only. The engine still derives execution from mixingRole, or
 * explicit mixOrder in a custom recipe.
 */
export const FACTORY_RECIPES: Recipe[] = [
  {
    id: 'rec-terra-veg-early',
    name: 'Terra Wczesny Weg (Tydzień 1-2)',
    medium: [Medium.TERRA],
    method: ApplicationMethod.ROOT_FEED,
    stage: GrowthStage.VEG,
    isFactory: true,
    verificationStatus: 'UNVERIFIED',
    source: 'SHOGUN Feedchart',
    sourceDate: '2025-01-01',
    ingredients: [
      { productId: 'silicon', concentration: 1.0 },
      { productId: 'calmag', concentration: 0.5 },
      { productId: 'samurai-terra-grow', concentration: 2.0 },
      { productId: 'katana-roots', concentration: 0.2 },
    ]
  },
  {
    id: 'rec-terra-bloom-early',
    name: 'Terra Wczesne Kwitnienie (Tydzień 1-3)',
    medium: [Medium.TERRA],
    method: ApplicationMethod.ROOT_FEED,
    stage: GrowthStage.BLOOM,
    isFactory: true,
    verificationStatus: 'UNVERIFIED',
    source: 'SHOGUN Feedchart',
    sourceDate: '2025-01-01',
    ingredients: [
      { productId: 'silicon', concentration: 1.0 },
      { productId: 'calmag', concentration: 0.5 },
      { productId: 'samurai-terra-bloom', concentration: 3.0 },
      { productId: 'zenzym', concentration: 2.5 },
      { productId: 'sumo-active-boost', concentration: 1.5 },
    ]
  },
  {
    id: 'rec-terra-bloom-pk',
    name: 'Terra Szczyt Kwitnienia (Tydzień 4-7)',
    medium: [Medium.TERRA],
    method: ApplicationMethod.ROOT_FEED,
    stage: GrowthStage.BLOOM,
    isFactory: true,
    verificationStatus: 'UNVERIFIED',
    source: 'SHOGUN Feedchart',
    sourceDate: '2025-01-01',
    ingredients: [
      { productId: 'silicon', concentration: 1.0 },
      { productId: 'calmag', concentration: 0.5 },
      { productId: 'samurai-terra-bloom', concentration: 3.0 },
      { productId: 'zenzym', concentration: 2.5 },
      { productId: 'sumo-active-boost', concentration: 1.5 },
      { productId: 'pk-warrior', concentration: 0.5 },
    ]
  },
  {
    id: 'rec-foliar-geisha',
    name: 'Geisha Foliar (Gotowy)',
    medium: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    method: ApplicationMethod.READY_TO_SPRAY,
    stage: GrowthStage.ALL,
    isFactory: true,
    verificationStatus: 'UNVERIFIED',
    source: 'SHOGUN Product Page',
    sourceDate: '2025-01-01',
    notes: 'Stosować co 14 dni od początku kwitnienia. NIE ROZCIEŃCZAĆ.',
    ingredients: [
      { productId: 'geisha-foliar', concentration: 0 }
    ]
  },
  {
    id: 'rec-foliar-calmag',
    name: 'CalMag Oprysk Interwencyjny',
    medium: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    method: ApplicationMethod.FOLIAR,
    stage: GrowthStage.ALL,
    isFactory: true,
    verificationStatus: 'UNVERIFIED',
    source: 'SHOGUN Product Page',
    sourceDate: '2025-01-01',
    notes: 'Stosować na liście w przypadku niedoborów, max co 7 dni.',
    ingredients: [
      { productId: 'calmag', concentration: 15.0 }
    ]
  },
  {
    id: 'rec-foliar-sumo',
    name: 'Sumo Oprysk Stymulujący',
    medium: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    method: ApplicationMethod.FOLIAR,
    stage: GrowthStage.BLOOM,
    isFactory: true,
    verificationStatus: 'UNVERIFIED',
    source: 'SHOGUN Product Page',
    sourceDate: '2025-01-01',
    notes: 'Oprysk od początku formowania kwiatów do połowy kwitnienia.',
    ingredients: [
      { productId: 'sumo-active-boost', concentration: 2.0 }
    ]
  },
  {
    id: 'rec-foliar-katana',
    name: 'Katana Roots (Ratunkowy Oprysk)',
    medium: [Medium.TERRA, Medium.COCO, Medium.HYDRO],
    method: ApplicationMethod.FOLIAR,
    stage: GrowthStage.VEG,
    isFactory: true,
    verificationStatus: 'UNVERIFIED',
    source: 'SHOGUN Technical Docs',
    sourceDate: '2025-01-01',
    notes: 'Tylko dla zestresowanych lub ukorzeniających się klonów.',
    ingredients: [
      { productId: 'katana-roots', concentration: 5.0 }
    ]
  }
];

export const PHYSICAL_SYRINGES: SyringeType[] = [
  { id: 's20', capacity: 20, count: 5, label: '20ml', type: 'SYRINGE' },
  { id: 's6', capacity: 6, count: 5, label: '6ml', type: 'SYRINGE' },
  { id: 's3', capacity: 3, count: 5, label: '3ml', type: 'SYRINGE' },
  { id: 'p3', capacity: 3, count: 4, label: '3ml Pipeta', type: 'PIPETTE' },
  { id: 's1', capacity: 1, count: 10, label: '1ml (Insulina)', type: 'SYRINGE' },
];
