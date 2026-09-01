import type { GrowthPhase } from '../domain/types.ts';

export interface ManufacturerPlanStatus {
  phase: GrowthPhase;
  available: false;
  evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2';
  reason: string;
}

const REASONS: Record<GrowthPhase, string> = {
  SEEDLING: 'Oficjalne dane harmonogramu istnieją, ale profil producenta nie został jeszcze odwzorowany do jednego zweryfikowanego kontekstu runtime.',
  VEG: 'Oficjalny feedchart jest zależny od tygodnia fazy, profilu wody i profilu karmienia. Tego kontekstu runtime jeszcze nie przechowuje.',
  FLOWER: 'Oficjalny feedchart jest zależny od tygodnia fazy, profilu wody i profilu karmienia. Tego kontekstu runtime jeszcze nie przechowuje.',
  FLUSH: 'Oficjalny harmonogram przewiduje końcowy tydzień tylko na wodzie, ale V1 nie reprezentuje jeszcze takiego planu jako wykonywalnego wariantu Producent.',
};

export function getManufacturerPlanStatus(phase: GrowthPhase): ManufacturerPlanStatus {
  return {
    phase,
    available: false,
    evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2',
    reason: REASONS[phase],
  };
}
