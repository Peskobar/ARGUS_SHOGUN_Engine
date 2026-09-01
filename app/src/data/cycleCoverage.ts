import type { GrowthPhase, PlanContext } from '../domain/types.ts';
import { getManufacturerSchedule } from './manufacturerSchedule.ts';

export type CycleCoverageMode = 'AUTOMATED' | 'OPERATOR';

export interface CycleCoverage {
  phase: GrowthPhase;
  mode: CycleCoverageMode;
  reason: string;
}

export function getCycleCoverage(context: PlanContext): CycleCoverage {
  const schedule = getManufacturerSchedule(context);
  if (schedule) {
    return {
      phase: context.phase,
      mode: 'AUTOMATED',
      reason: 'ARGUS ma dokładny profil dla tego kontekstu.',
    };
  }

  return {
    phase: context.phase,
    mode: 'OPERATOR',
    reason: 'ARGUS nie ma automatycznego profilu dla tego kontekstu. Operator może wykonać sesję bez blokady.',
  };
}
