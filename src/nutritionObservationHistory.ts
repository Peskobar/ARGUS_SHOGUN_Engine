export interface IrrigationObservationEvent {
  id: string;
  timestamp: string;
  recipeId?: string;
  irrigationVolumeL?: number;
  sourceEc?: number;
  inputEcGross?: number;
  finalPh?: number;
  runoffVolumeL?: number;
  runoffFractionPct?: number;
  runoffEc?: number;
  substrateEc?: number;
  substrateEcMethod?: string;
  drybackPct?: number;
  outcomeNote?: string;
}

export interface TrendPolicy {
  minimumRepeatableSamples?: number;
  requireSameMeasurementMethod: boolean;
}

export const UNRESOLVED_TREND_POLICY: TrendPolicy = {
  minimumRepeatableSamples: undefined,
  requireSameMeasurementMethod: true,
};

export function assessRepeatableTrend(events: IrrigationObservationEvent[], policy: TrendPolicy = UNRESOLVED_TREND_POLICY) {
  const reasons: string[] = [];
  if (policy.minimumRepeatableSamples === undefined) {
    reasons.push('Minimum repeatable trend sample count is not yet source/policy-defined; ARGUS will not invent it.');
  } else if (events.length < policy.minimumRepeatableSamples) {
    reasons.push(`Need at least ${policy.minimumRepeatableSamples} comparable events; have ${events.length}.`);
  }

  if (policy.requireSameMeasurementMethod) {
    const methods = new Set(events.map(event => event.substrateEcMethod).filter(Boolean));
    if (methods.size > 1) reasons.push('Substrate/root-zone trend mixes measurement methods and is not directly comparable.');
    if (events.some(event => event.substrateEc !== undefined && !event.substrateEcMethod)) reasons.push('Substrate EC event is missing measurement method.');
  }

  if (events.some(event => event.runoffEc !== undefined && event.runoffVolumeL === undefined && event.runoffFractionPct === undefined)) {
    reasons.push('Runoff EC event missing runoff volume/fraction metadata.');
  }

  return {
    trendReady: reasons.length === 0,
    reasons,
    orderedEvents: [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  };
}
