import { MixingRole } from './types';

export type MixingIntensity = 'MOCNIEJ' | 'ŁAGODNIE' | 'ŚREDNIO' | 'RĘCZNIE' | 'BRAK';

export interface MixingInstruction {
  seconds: number;
  intensity: MixingIntensity;
  rpm: string;
  useDrill: boolean;
  note: string;
}

const DEFAULT_INSTRUCTION: MixingInstruction = {
  seconds: 20,
  intensity: 'ŁAGODNIE',
  rpm: '150–180 rpm',
  useDrill: true,
  note: 'Ruch całej objętości bez głębokiego leja, chlapania i piany.',
};

const PROTOCOL: Partial<Record<MixingRole, MixingInstruction>> = {
  [MixingRole.SILICON]: {
    seconds: 30,
    intensity: 'MOCNIEJ',
    rpm: '200–250 rpm',
    useDrill: true,
    note: 'Rozprowadź dokładnie po całej objętości. Lej może być widoczny, ale nie odsłaniaj dna.',
  },
  [MixingRole.CALMAG]: {
    seconds: 30,
    intensity: 'MOCNIEJ',
    rpm: '200–250 rpm',
    useDrill: true,
    note: 'Utrzymuj pełny obieg wody, bez zasysania dużej ilości powietrza.',
  },
  [MixingRole.BASE]: {
    seconds: 30,
    intensity: 'MOCNIEJ',
    rpm: '200–250 rpm',
    useDrill: true,
    note: 'Mieszaj do równomiernego rozprowadzenia bazy w całej objętości.',
  },
  [MixingRole.ROOTS]: {
    seconds: 20,
    intensity: 'ŁAGODNIE',
    rpm: '150–180 rpm',
    useDrill: true,
    note: 'Delikatny pełny obieg. Nie rób wiru do dna.',
  },
  [MixingRole.ENZYME]: {
    seconds: 20,
    intensity: 'ŁAGODNIE',
    rpm: '150–180 rpm',
    useDrill: true,
    note: 'Delikatnie, bez napowietrzania i bez piany.',
  },
  [MixingRole.BOOSTER]: {
    seconds: 20,
    intensity: 'ŁAGODNIE',
    rpm: '150–180 rpm',
    useDrill: true,
    note: 'Wystarczy spokojny obieg całej objętości.',
  },
  [MixingRole.PK]: {
    seconds: 30,
    intensity: 'MOCNIEJ',
    rpm: '200–250 rpm',
    useDrill: true,
    note: 'Rozprowadź dokładnie, ale bez suchego dna w środku leja.',
  },
  [MixingRole.BIOLOGICAL]: {
    seconds: 15,
    intensity: 'RĘCZNIE',
    rpm: 'bez wiertarki',
    useDrill: false,
    note: 'Preparaty biologiczne mieszaj ręcznie i delikatnie.',
  },
  [MixingRole.PH_ADJUSTER]: {
    seconds: 30,
    intensity: 'ŁAGODNIE',
    rpm: '150–180 rpm',
    useDrill: true,
    note: 'Korekta pH dopiero po całej mieszance. Po wymieszaniu ponownie zmierz pH.',
  },
  [MixingRole.READY_TO_USE]: {
    seconds: 0,
    intensity: 'BRAK',
    rpm: 'nie dotyczy',
    useDrill: false,
    note: 'Produkt gotowy do bezpośredniej aplikacji.',
  },
  [MixingRole.OTHER]: DEFAULT_INSTRUCTION,
};

export const FINAL_MIX: MixingInstruction = {
  seconds: 60,
  intensity: 'ŚREDNIO',
  rpm: '180–220 rpm',
  useDrill: true,
  note: 'Finalny obieg całej mieszanki. Bez głębokiego leja, bez odsłaniania dna i bez piany.',
};

export const SETTLE_SECONDS = 90;

export function getMixingInstruction(role?: MixingRole): MixingInstruction {
  if (!role) return DEFAULT_INSTRUCTION;
  return PROTOCOL[role] ?? DEFAULT_INSTRUCTION;
}
