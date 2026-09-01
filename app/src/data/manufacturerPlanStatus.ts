import { getManufacturerSchedule } from './manufacturerSchedule.ts';
import type { PlanContext } from '../domain/types.ts';

export interface ManufacturerPlanStatus {
  available: boolean;
  contextReady: boolean;
  evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2';
  reason: string;
}

export function getManufacturerPlanStatus(context: PlanContext): ManufacturerPlanStatus {
  const schedule = getManufacturerSchedule(context);
  if (schedule) {
    return {
      available: true,
      contextReady: true,
      evidenceLedger: schedule.evidenceLedger,
      reason: `Zweryfikowany profil producenta jest dostępny dla siewki, tydzień ${schedule.phaseWeek}.`,
    };
  }

  const missing: string[] = [];

  if (!Number.isInteger(context.phaseWeek) || (context.phaseWeek ?? 0) < 1) missing.push('tydzień fazy');

  if (context.phase === 'VEG' || context.phase === 'FLOWER') {
    if (!context.waterProfile) missing.push('profil wody');
    if (context.waterProfile === 'CUSTOM' && (!Number.isFinite(context.customWaterEc) || (context.customWaterEc ?? -1) < 0)) {
      missing.push('EC własnej wody');
    }
    if (!context.scheduleProfile) missing.push('profil karmienia');
  }

  if (missing.length > 0) {
    return {
      available: false,
      contextReady: false,
      evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2',
      reason: `ARGUS nie ma pełnego kontekstu: ${missing.join(', ')}. Operator może mimo to kontynuować poza automatycznym profilem.`,
    };
  }

  return {
    available: false,
    contextReady: true,
    evidenceLedger: 'SHOGUN_EVIDENCE_LEDGER_v2',
    reason: 'Ten dokładny profil producenta nie został jeszcze wprowadzony. ARGUS nie zgaduje dawek, ale nie blokuje decyzji operatora.',
  };
}
