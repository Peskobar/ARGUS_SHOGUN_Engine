const LABELS: Record<string, string> = {
  // Decision / authority
  PROCEED: 'MOŻNA DZIAŁAĆ',
  ABSTAIN: 'BRAK PODSTAW DO DECYZJI',
  VERIFIED: 'ZWERYFIKOWANE',
  UNVERIFIED: 'NIEZWERYFIKOWANE',
  CONFLICT: 'SPRZECZNE DANE',
  PHYSICAL_ALLOWED: 'MOŻNA WYKONAĆ',
  SIMULATION_ONLY: 'TYLKO SYMULACJA',
  READY: 'GOTOWE',
  LOCKED: 'ZABLOKOWANE',
  PENDING: 'OCZEKUJE',
  PASS: 'ZALICZONE',
  BLOCK: 'BLOKADA',
  WARN: 'OSTRZEŻENIE',
  INFO: 'INFORMACJA',
  LEGACY: 'STARY ZAPIS',

  // Lifecycle
  PROPOSED: 'ZAPROPONOWANE',
  APPLIED: 'ZASTOSOWANE',
  OBSERVE: 'OBSERWUJ',
  CONFIRMED: 'POTWIERDZONE',
  ROLLBACK: 'WYCOFANIE',

  // Stages
  SEEDLING: 'SIEWKI / KLONY',
  VEG: 'WEGETACJA',
  BLOOM: 'KWITNIENIE',
  FLUSH: 'PŁUKANIE',
  ALL: 'WSZYSTKIE FAZY',

  // Application methods
  ROOT_FEED: 'NAWOŻENIE DO KORZENI',
  FOLIAR: 'OPRYSK DOLISTNY',
  READY_TO_SPRAY: 'GOTOWY OPRYSK',
  SOAK: 'MOCZENIE',
  MEDIA_TREATMENT: 'ZABIEG NA PODŁOŻU',

  // Media / water
  TERRA: 'ZIEMIA',
  COCO: 'KOKOS',
  HYDRO: 'HYDRO',
  CUSTOM: 'WŁASNE',
  SOFT: 'MIĘKKA',
  HARD: 'TWARDA',
  RO: 'ODWRÓCONA OSMOZA',

  // Mixing roles
  SILICON: 'KRZEM',
  CALMAG: 'CALMAG',
  BASE: 'NAWÓZ BAZOWY',
  ROOTS: 'KORZENIE',
  ENZYME: 'ENZYMY',
  BOOSTER: 'STYMULATOR',
  PK: 'PK',
  BIOLOGICAL: 'BIOLOGIA',
  READY_TO_USE: 'GOTOWY DO UŻYCIA',
  OTHER: 'INNE',
  PH_ADJUSTER: 'REGULATOR pH',

  // Nutrition scenarios
  BASELINE: 'DLACZEGO',
  LESS: 'MNIEJ',
  MORE: 'WIĘCEJ',
  OMIT: 'POMIŃ',

  // Confidence / risk
  HIGH: 'WYSOKA',
  MEDIUM: 'ŚREDNIA',
  LOW: 'NISKA',
  UNSET: 'NIE USTAWIONO',
  UNKNOWN: 'NIEZNANE',

  // Objectives
  STABILITY: 'STABILNOŚĆ',
  QUALITY: 'JAKOŚĆ',
  YIELD: 'PLON',
  RECOVERY: 'ODBUDOWA',

  // Measurement methods
  POUR_THROUGH: 'PRZELEW PRZEZ PODŁOŻE',
  PORE_WATER: 'WODA POROWA',
  SME: 'EKSTRAKT NASYCONEGO PODŁOŻA',
  IN_SITU_SENSOR: 'CZUJNIK W PODŁOŻU',

  // Manufacturer profiles
  AUTO: 'AUTOMATYCZNY',
  TERRA_LED_2024: 'TERRA LED 2024',
  TERRA_LEGACY_HARD_SOFT: 'TERRA STARSZY PROFIL WODY',

  // Evidence metadata
  MANUFACTURER: 'PRODUCENT',
  SCIENTIFIC: 'NAUKOWE',
  OPERATIONAL: 'OPERACYJNE',
  DIRECT: 'BEZPOŚREDNIE',
  SUPPORTING: 'WSPIERAJĄCE',
  CONTEXTUAL: 'KONTEKSTOWE',
};

const PHRASES: Record<string, string> = {
  'Reality Lock': 'Blokada Rzeczywistości',
  'Decision Kernel': 'Rdzeń Decyzyjny',
  'Execution Policy': 'Zasady Wykonania',
  'Physical gate': 'Bramka wykonania',
  'Evidence preview': 'Podgląd dowodów',
  'change-control': 'kontrola zmian',
  'Human approval': 'Zatwierdzenie przez człowieka',
  'Final EC': 'Końcowe EC',
  'Final pH': 'Końcowe pH',
  'Runoff EC': 'EC odpływu',
  'Runoff %': 'Odpływ %',
  'Substrate EC': 'EC podłoża',
  'Dryback %': 'Przesuszenie %',
  'SOURCE EC mS/cm': 'EC wody źródłowej mS/cm',
  'Final INPUT EC': 'Końcowe EC pożywki',
  'WHY / LESS / MORE / OMIT': 'DLACZEGO / MNIEJ / WIĘCEJ / POMIŃ',
};

export function plLabel(value: string | null | undefined): string {
  if (!value) return 'BRAK DANYCH';
  return LABELS[value] ?? PHRASES[value] ?? value;
}

export function plPhrase(value: string): string {
  let output = value;
  for (const [source, target] of Object.entries(PHRASES)) output = output.replaceAll(source, target);
  return output;
}

export function plBoolean(value: boolean): string {
  return value ? 'TAK' : 'NIE';
}
