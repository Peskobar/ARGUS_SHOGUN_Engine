import { GrowthStage, WaterType } from './types';

export type EvidenceSourceType = 'MANUFACTURER' | 'PEER_REVIEWED' | 'LOCAL_WATER' | 'USER_MEASUREMENT';
export type Applicability = 'DIRECT' | 'TRANSFER_LIMITED' | 'GENERAL_PHYSIOLOGY';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type EvidenceStatus = 'VERIFIED' | 'UNVERIFIED' | 'CONFLICT';
export type NutritionRole = 'BASE' | 'SUPPORT' | 'CONDITIONAL' | 'OPTIONAL' | 'FOLIAR';
export type DecisionScenario = 'BASELINE' | 'LESS' | 'MORE' | 'OMIT';

export interface EvidenceRef {
  id: string;
  sourceType: EvidenceSourceType;
  title: string;
  url: string;
  year?: number;
  applicability: Applicability;
  confidence: Confidence;
}

export interface DoseWindow {
  stage: GrowthStage;
  weekStart: number;
  weekEnd: number;
  waterType?: WaterType;
  minMlPerL: number;
  maxMlPerL: number;
  method?: 'ROOT_FEED' | 'FOLIAR';
  note?: string;
}

export interface ProductEvidence {
  productId: string;
  role: NutritionRole;
  status: EvidenceStatus;
  manufacturerDoseWindows: DoseWindow[];
  why: string[];
  less: string[];
  more: string[];
  omit: string[];
  interactions: string[];
  hardRules?: string[];
  unresolved?: string[];
  refs: string[];
}

export const EVIDENCE_REFS: EvidenceRef[] = [
  {
    id: 'shogun-terra-feedchart',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN Samurai Terra hard/soft water feed chart',
    url: 'https://www.shogunfertilisers.com/media/yhqdxajh/shogun_-_terra_feedchart_new.pdf',
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'shogun-terra-product',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN Samurai Terra Grow & Bloom product page',
    url: 'https://www.shogunfertilisers.com/products/samurai-terra',
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'shogun-silicon-product',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN Silicon product page',
    url: 'https://www.shogunfertilisers.com/products/silicon',
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'shogun-calmag-product',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN CalMag product page',
    url: 'https://www.shogunfertilisers.com/products/calmag',
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'shogun-zenzym-product',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN Zenzym product page',
    url: 'https://www.shogunfertilisers.com/products/zenzym',
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'shogun-pk-product',
    sourceType: 'MANUFACTURER',
    title: 'SHOGUN PK Warrior 9/18 product page',
    url: 'https://www.shogunfertilisers.com/products/pk-warrior-9-18',
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'kpai-2024',
    sourceType: 'PEER_REVIEWED',
    title: 'Mineral nutrition for Cannabis sativa in the vegetative stage using response surface analysis',
    url: 'https://doi.org/10.3389/fpls.2024.1501484',
    year: 2024,
    applicability: 'TRANSFER_LIMITED',
    confidence: 'HIGH',
  },
  {
    id: 'bevan-2021',
    sourceType: 'PEER_REVIEWED',
    title: 'Optimisation of Nitrogen, Phosphorus, and Potassium for Soilless Production of Cannabis sativa in the Flowering Stage',
    url: 'https://doi.org/10.3389/fpls.2021.764103',
    year: 2021,
    applicability: 'TRANSFER_LIMITED',
    confidence: 'HIGH',
  },
  {
    id: 'saloner-n-2020',
    sourceType: 'PEER_REVIEWED',
    title: 'Response of Medical Cannabis to Nitrogen Supply Under Long Photoperiod',
    url: 'https://doi.org/10.3389/fpls.2020.572293',
    year: 2020,
    applicability: 'TRANSFER_LIMITED',
    confidence: 'HIGH',
  },
  {
    id: 'saloner-nform-2022',
    sourceType: 'PEER_REVIEWED',
    title: 'Nitrogen Source Matters: High NH4/NO3 Ratio Reduces Cannabinoids, Terpenoids, and Yield in Medical Cannabis',
    url: 'https://doi.org/10.3389/fpls.2022.830224',
    year: 2022,
    applicability: 'TRANSFER_LIMITED',
    confidence: 'HIGH',
  },
  {
    id: 'morad-mg-2023',
    sourceType: 'PEER_REVIEWED',
    title: 'Response of Medical Cannabis to Magnesium Supply at the Vegetative Growth Phase',
    url: 'https://doi.org/10.3390/plants12142676',
    year: 2023,
    applicability: 'TRANSFER_LIMITED',
    confidence: 'HIGH',
  },
  {
    id: 'llewellyn-deficiency-2023',
    sourceType: 'PEER_REVIEWED',
    title: 'Foliar Symptomology, Nutrient Content, Yield, and Secondary Metabolite Variability of Cannabis with Single-Element Nutrient Deficiencies',
    url: 'https://doi.org/10.3390/plants12030422',
    year: 2023,
    applicability: 'TRANSFER_LIMITED',
    confidence: 'HIGH',
  },
  {
    id: 'hershkowitz-2025',
    sourceType: 'PEER_REVIEWED',
    title: 'Elevated root-zone P and nutrient concentration do not increase yield or cannabinoids in medical cannabis',
    url: 'https://doi.org/10.3389/fpls.2025.1433985',
    year: 2025,
    applicability: 'TRANSFER_LIMITED',
    confidence: 'HIGH',
  },
  {
    id: 'schober-media-2023',
    sourceType: 'PEER_REVIEWED',
    title: 'Growth dynamics and yield formation of Cannabis cultivated in differing growing media',
    url: 'https://doi.org/10.1016/j.indcrop.2023.117172',
    year: 2023,
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
  {
    id: 'emmerich-water-2025',
    sourceType: 'LOCAL_WATER',
    title: 'Stadtwerke Emmerich Trinkwasseranalyse 04.04.2025',
    url: 'https://www.stadtwerke-emmerich.de/de/Netzbetrieb-/Trinkwasser-Netz/Wasserhaerte/Wasserhaerte/2024-Trinkwasseranalyse.pdf',
    year: 2025,
    applicability: 'DIRECT',
    confidence: 'HIGH',
  },
];

const hardSoft = (
  stage: GrowthStage,
  weekStart: number,
  weekEnd: number,
  hard: [number, number],
  soft: [number, number],
): DoseWindow[] => [
  { stage, weekStart, weekEnd, waterType: WaterType.HARD, minMlPerL: hard[0], maxMlPerL: hard[1], method: 'ROOT_FEED' },
  { stage, weekStart, weekEnd, waterType: WaterType.SOFT, minMlPerL: soft[0], maxMlPerL: soft[1], method: 'ROOT_FEED' },
];

export const TERRA_EVIDENCE_MATRIX: ProductEvidence[] = [
  {
    productId: 'samurai-terra-grow',
    role: 'BASE',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      ...hardSoft(GrowthStage.VEG, 1, 2, [1, 2], [2, 3]),
      ...hardSoft(GrowthStage.VEG, 3, 4, [2, 3], [3, 4]),
    ],
    why: [
      'Nawóz bazowy dla fazy wegetatywnej w linii Terra; producent nie przewiduje równoczesnego użycia Grow i Bloom.',
      'Dawkowanie zależy od profilu wody, więc wybór zakresu bez znajomości tła EC jest niepełny.',
    ],
    less: [
      'Może zmniejszyć łączny ładunek mineralny i EC, ale zbyt mała podaż bazy zwiększa ryzyko niedoborów wielu pierwiastków jednocześnie.',
      'Badania Cannabis pokazują, że zbyt niski azot ogranicza fotosyntezę i biomasę; nie oznacza to jednak, że konkretne progi mg/L można przenieść 1:1 do Terra.',
    ],
    more: [
      'Nie zakładać automatycznego wzrostu plonu. Reakcja na składniki ma plateau, a nadmiar może zmniejszać efektywność wykorzystania składników.',
      'Podnoszenie dawki bazy zmienia wiele jonów naraz; oceniać razem z EC, stanem liści i historią podlewania.',
    ],
    omit: [
      'W aktywnej wegetacji oznacza rezygnację z głównego źródła mineralnego programu Terra i powinno być traktowane jako decyzja wysokiego ryzyka, chyba że inne medium/nawożenie dostarcza pełne żywienie.',
    ],
    interactions: [
      'N, P i K oddziałują ze sobą; nie interpretować zmian pojedynczego makroskładnika w izolacji.',
      'W badaniu veg wzrost P i K wiązał się ze spadkiem Mg w tkankach.',
    ],
    hardRules: ['Nigdy nie mieszać Samurai Terra Grow i Samurai Terra Bloom w tym samym roztworze.'],
    unresolved: ['Brak zweryfikowanego w aplikacji pełnego składu jonowego Grow, w tym NH4:NO3 i udziałów Ca/Mg/mikroelementów.'],
    refs: ['shogun-terra-feedchart', 'shogun-terra-product', 'kpai-2024', 'saloner-n-2020', 'saloner-nform-2022'],
  },
  {
    productId: 'samurai-terra-bloom',
    role: 'BASE',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      ...hardSoft(GrowthStage.BLOOM, 1, 3, [3, 4], [4, 4]),
      ...hardSoft(GrowthStage.BLOOM, 4, 4, [2, 3], [3, 4]),
      ...hardSoft(GrowthStage.BLOOM, 5, 7, [1, 2], [2, 3]),
    ],
    why: [
      'Nawóz bazowy dla kwitnienia w linii Terra; producent stopniowo zmniejsza dawkę w późniejszej części kwitnienia.',
    ],
    less: [
      'Zbyt agresywne ograniczenie bazy może spowodować szerokie niedobory, nie tylko niższe NPK.',
    ],
    more: [
      'Większa dawka nie jest równoznaczna z większym plonem. Badania nad EC i P pokazują, że podnoszenie stężenia ponad wystarczający poziom może nie dawać korzyści.',
    ],
    omit: [
      'W aktywnym kwitnieniu jest to rezygnacja z głównej bazy mineralnej; wymaga alternatywnego pełnego źródła składników.',
    ],
    interactions: [
      'Jeżeli używany jest PK Warrior, producent nakazuje zmniejszyć bloom base o 25–50%, aby ograniczyć ryzyko przekarmienia.',
      'Wysokie K może konkurować z Ca i Mg o pobieranie.',
    ],
    hardRules: ['Grow i Bloom nie mogą być używane razem w tym samym roztworze.'],
    unresolved: ['Brak zweryfikowanego pełnego składu jonowego Bloom w repozytorium.'],
    refs: ['shogun-terra-feedchart', 'shogun-terra-product', 'bevan-2021', 'hershkowitz-2025', 'morad-mg-2023', 'shogun-pk-product'],
  },
  {
    productId: 'katana-roots',
    role: 'SUPPORT',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      { stage: GrowthStage.SEEDLING, weekStart: 1, weekEnd: 2, minMlPerL: 5, maxMlPerL: 5, method: 'ROOT_FEED' },
      { stage: GrowthStage.VEG, weekStart: 1, weekEnd: 4, minMlPerL: 0.2, maxMlPerL: 0.2, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 1, weekEnd: 3, minMlPerL: 0.2, maxMlPerL: 0.2, method: 'ROOT_FEED' },
    ],
    why: ['Wspiera rozwój strefy korzeniowej w oknach wskazanych przez feedchart.'],
    less: ['Prawdopodobnie zmniejsza wsparcie rozwoju korzeni, ale nie jest substytutem pełnego nawozu bazowego.'],
    more: ['Brak podstaw, aby skalować ponad tabelę producenta bez konkretnego wskazania.'],
    omit: ['Nie usuwa podstawowego NPK, ale rezygnuje ze wsparcia korzeni przewidzianego przez program.'],
    interactions: ['Producent pozycjonuje Katana Roots jako uzupełnienie programu, nie jako bazę.'],
    unresolved: ['Dokładny aktywny skład Katana Roots wymaga zweryfikowania z etykiety/MSDS przed modelowaniem molekularnym.'],
    refs: ['shogun-terra-feedchart'],
  },
  {
    productId: 'zenzym',
    role: 'SUPPORT',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      { stage: GrowthStage.VEG, weekStart: 1, weekEnd: 4, minMlPerL: 2.5, maxMlPerL: 2.5, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 1, weekEnd: 8, minMlPerL: 2.5, maxMlPerL: 2.5, method: 'ROOT_FEED' },
    ],
    why: ['Mieszanka enzymów (m.in. cellulase, xylanase i beta-glucanase) przeznaczona do rozkładu obumarłej materii korzeniowej i utrzymania czystszej strefy korzeniowej.'],
    less: ['Zmniejsza intensywność działania enzymatycznego; nie oznacza automatycznie niedoboru mineralnego.'],
    more: ['Brak podstaw do rutynowego zwiększania ponad 2.5 ml/L w zwykłym nawożeniu; wyższe stężenia producent opisuje osobno dla regeneracji podłoża.'],
    omit: ['Może ograniczyć funkcję higieny/recyklingu strefy korzeniowej, ale nie usuwa nawozu bazowego.'],
    interactions: ['Nie traktować efektu enzymatycznego jako zamiennika poprawnego nawadniania i natlenienia podłoża.'],
    hardRules: ['Nie premiksować skoncentrowanych produktów ze sobą; zawsze dodawać do wody.'],
    refs: ['shogun-terra-feedchart', 'shogun-zenzym-product'],
  },
  {
    productId: 'silicon',
    role: 'SUPPORT',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      { stage: GrowthStage.VEG, weekStart: 1, weekEnd: 4, minMlPerL: 1, maxMlPerL: 1, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 1, weekEnd: 8, minMlPerL: 1, maxMlPerL: 1, method: 'ROOT_FEED' },
    ],
    why: ['Producent zaleca regularne stosowanie jako wsparcie strukturalne i odporności na stres.'],
    less: ['Nie powoduje klasycznego niedoboru pierwiastka niezbędnego, ale zmniejsza wsparcie strukturalne przewidziane przez program.'],
    more: ['Nie zwiększać automatycznie. Silicon silnie wpływa na pH roztworu i wymaga kontrolowanego etapu przygotowania.'],
    omit: ['Program może nadal dostarczać podstawowe składniki bez Siliconu, ale traci się przewidziane przez producenta wsparcie krzemowe.'],
    interactions: ['Silicon ma własny etap pH przed bazą; jest to interakcja procesowa, a nie tylko dawka.'],
    hardRules: [
      'Dodaj Silicon do czystej wody przed bazą.',
      'Wstępnie wymieszaj w wodzie i obniż pH poniżej 7 przed dodaniem nawozu bazowego.',
      'Finalny pomiar/korekta pH nadal odbywa się po przygotowaniu całej mieszanki.',
    ],
    refs: ['shogun-terra-feedchart', 'shogun-silicon-product'],
  },
  {
    productId: 'calmag',
    role: 'CONDITIONAL',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      { stage: GrowthStage.VEG, weekStart: 1, weekEnd: 4, waterType: WaterType.HARD, minMlPerL: 0.5, maxMlPerL: 0.5, method: 'ROOT_FEED' },
      { stage: GrowthStage.VEG, weekStart: 1, weekEnd: 4, waterType: WaterType.SOFT, minMlPerL: 1, maxMlPerL: 1, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 1, weekEnd: 8, waterType: WaterType.HARD, minMlPerL: 0, maxMlPerL: 0.5, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 1, weekEnd: 8, waterType: WaterType.SOFT, minMlPerL: 0, maxMlPerL: 1, method: 'ROOT_FEED' },
      { stage: GrowthStage.ALL, weekStart: 1, weekEnd: 99, minMlPerL: 15, maxMlPerL: 15, method: 'FOLIAR', note: 'Interwencyjny oprysk raz na tydzień do skorygowania niedoboru; pH 5–7.' },
    ],
    why: ['Dostarcza Ca i Mg oraz chelatowane Fe; potrzeba zależy silnie od wody, medium i objawów.'],
    less: ['Może być właściwe przy wodzie już zasobnej w Ca/Mg lub gdy łączny poziom kationów jest wysoki.'],
    more: ['Nie jest neutralnym boosterem. Nadmiar Mg może ograniczać pobieranie i transport Ca i K przez konkurencję kationów.'],
    omit: ['Przy wystarczającej podaży Ca/Mg z wody i bazy może być uzasadnione; przy realnym deficycie zwiększa ryzyko problemów strukturalnych i chloroz.'],
    interactions: ['Mg, Ca i K konkurują o pobieranie; decyzję o CalMag należy łączyć z wodą i PK.'],
    unresolved: ['Dokładna ilość Ca, Mg i Fe wniesiona przez 1 ml produktu wymaga etykiety/analizy składu konkretnej butelki.'],
    refs: ['shogun-terra-feedchart', 'shogun-calmag-product', 'morad-mg-2023', 'llewellyn-deficiency-2023'],
  },
  {
    productId: 'sumo-active-boost',
    role: 'OPTIONAL',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      { stage: GrowthStage.BLOOM, weekStart: 1, weekEnd: 6, minMlPerL: 2, maxMlPerL: 2, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 7, weekEnd: 7, minMlPerL: 1.5, maxMlPerL: 1.5, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 8, weekEnd: 8, minMlPerL: 1, maxMlPerL: 1, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 1, weekEnd: 1, minMlPerL: 2, maxMlPerL: 2, method: 'FOLIAR' },
      { stage: GrowthStage.BLOOM, weekStart: 4, weekEnd: 4, minMlPerL: 2, maxMlPerL: 2, method: 'FOLIAR' },
    ],
    why: ['Booster kwitnienia przewidziany przez producenta jako dodatek, nie baza.'],
    less: ['Zmniejsza intensywność działania dodatku bez automatycznego usuwania podstawowego żywienia.'],
    more: ['Nie zwiększać bez danych producenta dla danego wariantu; więcej dodatku nie gwarantuje większego plonu.'],
    omit: ['Pozostawia bazę i inne elementy programu; rezygnuje z funkcji boostera.'],
    interactions: ['Ocena sensu boostera powinna uwzględniać łączny EC i obecność PK Warrior.'],
    unresolved: ['Pełny skład aktywny i wkład do EC wymagają zweryfikowania z etykiety/MSDS.'],
    refs: ['shogun-terra-feedchart', 'hershkowitz-2025'],
  },
  {
    productId: 'pk-warrior',
    role: 'CONDITIONAL',
    status: 'VERIFIED',
    manufacturerDoseWindows: [
      { stage: GrowthStage.BLOOM, weekStart: 4, weekEnd: 4, minMlPerL: 1, maxMlPerL: 1, method: 'ROOT_FEED' },
      { stage: GrowthStage.BLOOM, weekStart: 5, weekEnd: 7, minMlPerL: 0.5, maxMlPerL: 0.5, method: 'ROOT_FEED' },
    ],
    why: ['Skoncentrowany dodatek PK przeznaczony przez producenta do środkowej fazy kwitnienia.'],
    less: ['Może ograniczyć dodatkowy ładunek P/K i EC; baza nadal dostarcza podstawowe żywienie.'],
    more: ['Producent dopuszcza 1 ml/L tylko w pierwszym tygodniu okna; poza tym standard to 0.5 ml/L.', 'Więcej P/K nie gwarantuje większego plonu, a wysokie K może pogarszać dostępność Ca/Mg.'],
    omit: ['Rezygnuje z dodatkowego PK, ale nie oznacza usunięcia całego P/K, jeśli baza pozostaje.'],
    interactions: ['Producent zaleca redukcję Bloom base o 25–50% podczas użycia PK Warrior, aby uniknąć przekarmienia.', 'K konkuruje z Ca i Mg; aplikacja powinna ostrzegać przed jednoczesnym agresywnym zwiększaniem PK i CalMag.'],
    hardRules: ['Nie używać poza przewidzianym oknem bez jawnego override.', 'Przy PK Warrior skorygować dawkę bazy Bloom zgodnie z instrukcją producenta.'],
    refs: ['shogun-terra-feedchart', 'shogun-pk-product', 'bevan-2021', 'hershkowitz-2025', 'morad-mg-2023'],
  },
];

export const EMmerichWaterReference = {
  id: 'emmerich-2025-reference',
  sourceRef: 'emmerich-water-2025',
  status: 'REFERENCE_NOT_LIVE_MEASUREMENT' as const,
  conductivityUsCm25C: 530,
  backgroundEcMsCmApprox: 0.53,
  pH: 7.49,
  hardnessDh: 12.7,
  hardnessClass: 'MEDIUM' as const,
  calciumMgL: 73.9,
  magnesiumMgL: 10.2,
  potassiumMgL: 7.66,
  nitrateMgL: 12.6,
  note: 'To analiza sieci wodociągowej, nie pomiar z konkretnego kranu w dniu mieszania. Realny pomiar EC/pH użytkownika ma pierwszeństwo.',
};

export function getEvidenceRef(id: string) {
  return EVIDENCE_REFS.find(ref => ref.id === id);
}

export function getProductEvidence(productId: string) {
  return TERRA_EVIDENCE_MATRIX.find(entry => entry.productId === productId);
}

export function getDoseWindow(productId: string, stage: GrowthStage, week: number, waterType?: WaterType) {
  const evidence = getProductEvidence(productId);
  if (!evidence) return [];
  return evidence.manufacturerDoseWindows.filter(window =>
    (window.stage === stage || window.stage === GrowthStage.ALL)
    && week >= window.weekStart
    && week <= window.weekEnd
    && (!window.waterType || !waterType || window.waterType === waterType),
  );
}
