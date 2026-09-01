import type { GrowthPhase } from '../domain/types.ts';

export interface ManufacturerPlanStatus {
  phase: GrowthPhase;
  available: false;
  evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v1';
  reason: string;
}

const REASONS: Record<GrowthPhase, string> = {
  SEEDLING: 'Brak kompletnego, bezkonfliktowego zestawu danych producenta dla całego planu tej fazy.',
  VEG: 'Brak kompletnego, bezkonfliktowego zestawu danych producenta dla całego planu tej fazy.',
  FLOWER: 'Brak kompletnego, bezkonfliktowego zestawu danych producenta dla całego planu tej fazy.',
  FLUSH: 'Brak kompletnego, zweryfikowanego planu producenta dla tej fazy.',
};

export function getManufacturerPlanStatus(phase: GrowthPhase): ManufacturerPlanStatus {
  return {
    phase,
    available: false,
    evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v1',
    reason: REASONS[phase],
  };
}
