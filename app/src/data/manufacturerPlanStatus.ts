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
      reason: 'Zweryfikowany profil producenta jest dostępny dla siewki, tydzień 1.',
    };
  }

  const missing: string[] = [];

  if (!Number.isInteger(context.phaseWeek) || (context.phaseWeek ?? 0) < 1) missing.push('tydzień fazy');

  if (context.phase === 'VEG' || context.phase === 'FLOWER') {
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
    reason: 'Ten dokładny profil producenta nie został jeszcze wprowadzony. ARGUS nie używa najbliższego tygodnia ani wartości zastępczych.',
  };
}
