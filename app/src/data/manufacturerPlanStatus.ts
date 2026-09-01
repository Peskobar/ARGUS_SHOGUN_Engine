import type { PlanContext } from '../domain/types.ts';

export interface ManufacturerPlanStatus {
  available: false;
  contextReady: boolean;
  evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2';
  reason: string;
}

export function getManufacturerPlanStatus(context: PlanContext): ManufacturerPlanStatus {
  const missing: string[] = [];

  if (!Number.isInteger(context.phaseWeek) || (context.phaseWeek ?? 0) < 1) missing.push('tydzień fazy');

  if (context.phase !== 'FLUSH') {
    if (!context.waterProfile) missing.push('profil wody');
    if (!context.scheduleProfile) missing.push('profil karmienia');
  }

  if (missing.length > 0) {
    return {
      available: false,
      contextReady: false,
      evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2',
      reason: `Uzupełnij: ${missing.join(', ')}.`,
    };
  }

  return {
    available: false,
    contextReady: true,
    evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2',
    reason: 'Kontekst producenta jest kompletny. Dokładny harmonogram dawek nie został jeszcze promowany do runtime.',
  };
}
