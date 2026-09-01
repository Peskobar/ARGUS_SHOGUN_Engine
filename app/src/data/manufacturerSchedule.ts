import type { PlanContext } from '../domain/types.ts';

export interface VerifiedScheduleIngredient {
  id: string;
  name: string;
  amountPerLiter: number;
  tool: string;
  mixSeconds: number;
}

export interface VerifiedManufacturerSchedule {
  phase: 'SEEDLING';
  phaseWeek: 1 | 2;
  evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2';
  ingredients: VerifiedScheduleIngredient[];
}

const SEEDLING_INGREDIENTS: VerifiedScheduleIngredient[] = [
  {
    id: 'shogun-start',
    name: 'Shogun Start',
    amountPerLiter: 4,
    tool: 'Dobierz miarkę do objętości',
    mixSeconds: 0,
  },
  {
    id: 'katana-roots',
    name: 'Katana Roots',
    amountPerLiter: 5,
    tool: 'Dobierz miarkę do objętości',
    mixSeconds: 0,
  },
];

const SEEDLING_WEEK_1: VerifiedManufacturerSchedule = {
  phase: 'SEEDLING',
  phaseWeek: 1,
  evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2',
  ingredients: SEEDLING_INGREDIENTS,
};

const SEEDLING_WEEK_2: VerifiedManufacturerSchedule = {
  phase: 'SEEDLING',
  phaseWeek: 2,
  evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2',
  ingredients: SEEDLING_INGREDIENTS,
};

export function getManufacturerSchedule(context: PlanContext): VerifiedManufacturerSchedule | null {
  if (context.phase !== 'SEEDLING') return null;
  if (context.phaseWeek === 1) return SEEDLING_WEEK_1;
  if (context.phaseWeek === 2) return SEEDLING_WEEK_2;
  return null;
}
