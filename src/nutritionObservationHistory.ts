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

export interface RepeatableTrendAssessment {
  trendReady: boolean;
  reasons: string[];
  orderedEvents: IrrigationObservationEvent[];
  comparableEvents: IrrigationObservationEvent[];
}

/**
 * A trend is not merely "N rows exist". Each counted row must contain a
 * comparable decision-grade measurement path:
 * - substrate EC with an explicit measurement method, or
 * - input + runoff EC with runoff volume/fraction metadata.
 *
 * The minimum sample count is deliberately policy/user supplied. ARGUS does not
 * invent a universal agronomic N when evidence/project policy has not fixed it.
 */
export function assessRepeatableTrend(
  events: IrrigationObservationEvent[],
  policy: TrendPolicy = UNRESOLVED_TREND_POLICY,
): RepeatableTrendAssessment {
  const reasons: string[] = [];
  const orderedEvents = [...events]
    .filter(event => validTimestamp(event.timestamp))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const comparableEvents = orderedEvents.filter(isComparableEvent);

  if (policy.minimumRepeatableSamples === undefined) {
    reasons.push('Minimum repeatable trend sample count is not yet source/policy-defined; ARGUS will not invent it.');
  } else if (!Number.isInteger(policy.minimumRepeatableSamples) || policy.minimumRepeatableSamples < 2) {
    reasons.push('Trend policy must require at least two comparable observations.');
  } else if (comparableEvents.length < policy.minimumRepeatableSamples) {
    reasons.push(`Need at least ${policy.minimumRepeatableSamples} comparable events; have ${comparableEvents.length}.`);
  }

  const excluded = orderedEvents.length - comparableEvents.length;
  if (excluded > 0) {
    reasons.push(`${excluded} observation(s) are excluded because they lack a comparable substrate-EC method or complete input/runoff context.`);
  }

  if (policy.requireSameMeasurementMethod && comparableEvents.length > 0) {
    const methods = new Set(comparableEvents.map(comparisonMethod));
    if (methods.size > 1) {
      reasons.push('Trend mixes measurement methods/paths and is not directly comparable.');
    }
  }

  if (comparableEvents.some(event => event.runoffEc !== undefined && event.runoffVolumeL === undefined && event.runoffFractionPct === undefined)) {
    reasons.push('Runoff EC event missing runoff volume/fraction metadata.');
  }

  return {
    trendReady: reasons.length === 0,
    reasons,
    orderedEvents,
    comparableEvents,
  };
}

function isComparableEvent(event: IrrigationObservationEvent): boolean {
  const substratePath = finite(event.substrateEc)
    && typeof event.substrateEcMethod === 'string'
    && event.substrateEcMethod.trim().length > 0
    && event.substrateEcMethod !== 'UNKNOWN';

  const runoffPath = finite(event.inputEcGross)
    && finite(event.runoffEc)
    && (finite(event.runoffVolumeL) || finite(event.runoffFractionPct));

  return substratePath || runoffPath;
}

function comparisonMethod(event: IrrigationObservationEvent): string {
  if (finite(event.substrateEc) && event.substrateEcMethod && event.substrateEcMethod !== 'UNKNOWN') {
    return `SUBSTRATE:${event.substrateEcMethod}`;
  }
  return 'INPUT_RUNOFF';
}

function finite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

function validTimestamp(value: string): boolean {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}
