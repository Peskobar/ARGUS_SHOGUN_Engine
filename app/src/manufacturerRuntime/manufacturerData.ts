import type { Conflict, ProductGuidance, SourceRef } from './types.ts';

const CHECKED_AT = '2026-09-02';

const official = (
  url: string,
  sourceType: SourceRef['sourceType'],
  note: string,
): SourceRef => ({
  url,
  checkedAt: CHECKED_AT,
  sourceType,
  isOfficialDomain: true,
  note,
});

export const GENERAL_SOURCES = {
  CALCULATOR: official(
    'https://www.shogunfertilisers.com/pages/feedchart-calculator',
    'official_calculator',
    'Oficjalny kalkulator feedchart. Dokładne AUTO wymaga pełnego kontekstu; ogólna karta produktu nie jest recepturą.',
  ),
  DOWNLOADS: official(
    'https://www.shogunfertilisers.com/pages/downloads',
    'official_feedchart',
    'Oficjalny punkt wejścia do feedchartów i plików producenta.',
  ),
};

const SRC_START = official(
  'https://www.shogunfertilisers.com/products/start',
  'official_product_info',
  'Potwierdza SHOGUN Start dla siewek/sadzonek oraz pierwszych dwóch tygodni wczesnego wzrostu wegetatywnego.',
);

const SRC_KATANA = official(
  'https://www.shogunfertilisers.com/products/katana-roots',
  'official_product_info',
  'Potwierdza Katana Roots dla siewek/sadzonek, wegetacji oraz pierwszych trzech tygodni kwitnienia. Różne sposoby aplikacji są osobnymi kontekstami.',
);

const SRC_TERRA = official(
  'https://www.shogunfertilisers.com/products/samurai-terra',
  'official_product_info',
  'Potwierdza Samurai Terra Grow i Bloom jako osobne bazy dla odpowiednich faz uprawy w podłożu Terra.',
);

const SRC_SILICON = official(
  'https://www.shogunfertilisers.com/products/silicon',
  'official_product_info',
  'Potwierdza stosowanie Shogun Silicon podczas wegetacji i kwitnienia oraz specjalne zasady przygotowania/premiksu.',
);

const SRC_CALMAG = official(
  'https://www.shogunfertilisers.com/products/calmag',
  'official_product_info',
  'Potwierdza kontekst root-feed podczas wegetacji i kwitnienia oraz osobny kontekst oprysku dolistnego.',
);

const SRC_ZENZYM = official(
  'https://www.shogunfertilisers.com/products/zenzym',
  'official_product_info',
  'Potwierdza rutynowe stosowanie podczas wegetacji i kwitnienia do etapu flush oraz osobny kontekst odświeżania medium.',
);

const SRC_SUMO = official(
  'https://www.shogunfertilisers.com/products/sumo-active-boost',
  'official_product_info',
  'Potwierdza zastosowanie w fazie kwitnienia od jej początku do okresu przed flush oraz osobne konteksty root-feed i foliar.',
);

const SRC_PK = official(
  'https://www.shogunfertilisers.com/products/pk-warrior-9-18',
  'official_product_info',
  'Potwierdza PK Warrior jako produkt środkowego okresu kwitnienia, z oknem tygodni 4-7 na aktualnej karcie produktu.',
);

export const MANUFACTURER_PRODUCTS: ProductGuidance[] = [
  {
    productId: 'shogun-start',
    officialName: 'SHOGUN Start',
    purpose: {
      value: 'Nawóz startowy przeznaczony dla siewek/sadzonek i wczesnego ukorzeniania.',
      verified: true,
      sourceRefs: [SRC_START],
    },
    phaseWindows: [
      { phase: 'SEEDLING', note: 'Potwierdzony kontekst siewek/sadzonek.', sourceRefs: [SRC_START] },
      { phase: 'VEG', fromWeek: 1, toWeek: 2, note: 'Wczesna wegetacja ograniczona do pierwszych dwóch tygodni.', sourceRefs: [SRC_START] },
    ],
    applicationMethod: ['root_feed', 'soak'],
    warnings: [],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-katana-roots'],
    sourceRefs: [SRC_START],
    verified: true,
  },
  {
    productId: 'shogun-katana-roots',
    officialName: 'Katana Roots',
    purpose: {
      value: 'Produkt wspierający rozwój systemu korzeniowego; producent rozróżnia kontekst siewek/sadzonek i rutynowego root-feed.',
      verified: true,
      sourceRefs: [SRC_KATANA],
    },
    phaseWindows: [
      { phase: 'SEEDLING', note: 'Potwierdzony kontekst siewek/sadzonek.', sourceRefs: [SRC_KATANA] },
      { phase: 'VEG', note: 'Potwierdzony kontekst wegetacji.', sourceRefs: [SRC_KATANA] },
      { phase: 'FLOWER', fromWeek: 1, toWeek: 3, note: 'Potwierdzone pierwsze trzy tygodnie kwitnienia.', sourceRefs: [SRC_KATANA] },
    ],
    applicationMethod: ['root_feed', 'soak'],
    warnings: [],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-start', 'shogun-zenzym'],
    sourceRefs: [SRC_KATANA],
    verified: true,
  },
  {
    productId: 'shogun-terra-grow',
    officialName: 'Samurai Terra Grow',
    purpose: {
      value: 'Baza Terra przeznaczona dla fazy wzrostu wegetatywnego.',
      verified: true,
      sourceRefs: [SRC_TERRA],
    },
    phaseWindows: [
      { phase: 'VEG', note: 'Baza dla fazy wegetatywnej.', sourceRefs: [SRC_TERRA] },
    ],
    applicationMethod: ['root_feed'],
    warnings: ['Terra Grow i Terra Bloom nie są tym samym produktem ani zamienną bazą dla tej samej fazy.'],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-katana-roots', 'shogun-zenzym', 'shogun-silicon', 'shogun-calmag'],
    sourceRefs: [SRC_TERRA],
    verified: true,
  },
  {
    productId: 'shogun-terra-bloom',
    officialName: 'Samurai Terra Bloom',
    purpose: {
      value: 'Baza Terra przeznaczona dla fazy kwitnienia.',
      verified: true,
      sourceRefs: [SRC_TERRA],
    },
    phaseWindows: [
      { phase: 'FLOWER', note: 'Baza dla fazy kwitnienia.', sourceRefs: [SRC_TERRA] },
    ],
    applicationMethod: ['root_feed'],
    warnings: ['Terra Grow i Terra Bloom nie są tym samym produktem ani zamienną bazą dla tej samej fazy.'],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-katana-roots', 'shogun-zenzym', 'shogun-silicon', 'shogun-calmag', 'shogun-sumo-active-boost', 'shogun-pk-warrior'],
    sourceRefs: [SRC_TERRA],
    verified: true,
  },
  {
    productId: 'shogun-silicon',
    officialName: 'Shogun Silicon',
    purpose: {
      value: 'Suplement krzemu wspierający strukturę i odporność roślin.',
      verified: true,
      sourceRefs: [SRC_SILICON],
    },
    phaseWindows: [
      { phase: 'VEG', note: 'Potwierdzone stosowanie podczas wegetacji.', sourceRefs: [SRC_SILICON] },
      { phase: 'FLOWER', note: 'Potwierdzone stosowanie podczas kwitnienia.', sourceRefs: [SRC_SILICON] },
    ],
    applicationMethod: ['premix', 'root_feed'],
    warnings: ['Nie używaj ogólnej wartości z nagłówka strony jako substytutu dokładnego kontekstu root-feed/feedchart.'],
    mixingGuidance: ['Producent wymaga specjalnego przygotowania/premiksu Silikonu przed dodaniem do głównego roztworu. Szczegóły należy brać z aktualnego oficjalnego źródła.'],
    requiresSeparatePremix: true,
    compatibility: ['shogun-terra-grow', 'shogun-terra-bloom', 'shogun-calmag'],
    sourceRefs: [SRC_SILICON],
    verified: true,
  },
  {
    productId: 'shogun-calmag',
    officialName: 'Shogun CalMag',
    purpose: {
      value: 'Suplement wapnia i magnezu z osobnymi kontekstami root-feed i foliar.',
      verified: true,
      sourceRefs: [SRC_CALMAG],
    },
    phaseWindows: [
      { phase: 'VEG', note: 'Potwierdzony root-feed podczas wegetacji.', sourceRefs: [SRC_CALMAG] },
      { phase: 'FLOWER', note: 'Potwierdzony root-feed podczas kwitnienia.', sourceRefs: [SRC_CALMAG] },
    ],
    applicationMethod: ['root_feed', 'foliar'],
    warnings: ['Instrukcji dolistnych nie wolno mieszać z recepturą root-feed.'],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-terra-grow', 'shogun-terra-bloom', 'shogun-silicon'],
    sourceRefs: [SRC_CALMAG],
    verified: true,
  },
  {
    productId: 'shogun-zenzym',
    officialName: 'Zenzym',
    purpose: {
      value: 'Produkt enzymatyczny do utrzymania strefy korzeniowej i medium.',
      verified: true,
      sourceRefs: [SRC_ZENZYM],
    },
    phaseWindows: [
      { phase: 'VEG', note: 'Rutynowe stosowanie podczas wegetacji.', sourceRefs: [SRC_ZENZYM] },
      { phase: 'FLOWER', note: 'Rutynowe stosowanie podczas kwitnienia do etapu flush.', sourceRefs: [SRC_ZENZYM] },
    ],
    applicationMethod: ['reservoir', 'root_feed', 'other'],
    warnings: ['Odświeżanie medium jest osobnym kontekstem i nie może być scalane z rutynowym feedem.'],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-katana-roots'],
    sourceRefs: [SRC_ZENZYM],
    verified: true,
  },
  {
    productId: 'shogun-sumo-active-boost',
    officialName: 'Sumo Active Boost',
    purpose: {
      value: 'Biostymulator fazy kwitnienia z osobnymi kontekstami root-feed i foliar.',
      verified: true,
      sourceRefs: [SRC_SUMO],
    },
    phaseWindows: [
      { phase: 'FLOWER', note: 'Potwierdzone stosowanie od początku kwitnienia do okresu przed flush.', sourceRefs: [SRC_SUMO] },
    ],
    applicationMethod: ['reservoir', 'root_feed', 'foliar'],
    warnings: ['Instrukcje foliar i root-feed są osobnymi kontekstami.'],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-terra-bloom', 'shogun-pk-warrior'],
    sourceRefs: [SRC_SUMO],
    verified: true,
  },
  {
    productId: 'shogun-pk-warrior',
    officialName: 'PK Warrior 9/18',
    purpose: {
      value: 'Booster PK dla środkowej części kwitnienia.',
      verified: true,
      sourceRefs: [SRC_PK],
    },
    phaseWindows: [
      { phase: 'FLOWER', fromWeek: 4, toWeek: 7, note: 'Aktualna karta produktu wskazuje okno tygodni 4-7 kwitnienia.', sourceRefs: [SRC_PK] },
    ],
    applicationMethod: ['reservoir'],
    warnings: ['Wskazówek dla przejścia/końcowego dojrzewania nie wolno traktować jako receptury zastępczej.'],
    mixingGuidance: [],
    requiresSeparatePremix: false,
    compatibility: ['shogun-terra-bloom', 'shogun-sumo-active-boost'],
    sourceRefs: [SRC_PK],
    verified: true,
  },
];

export const KNOWN_CONFLICTS: Conflict[] = [];
