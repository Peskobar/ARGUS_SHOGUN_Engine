export type SubstrateEcMethod = 'POUR_THROUGH' | 'PORE_WATER' | 'SME' | 'IN_SITU_SENSOR' | 'OTHER' | 'UNKNOWN';

export interface MeasurementQualityInput {
  meterModel?: string;
  calibrationDate?: string;
  calibrationSolution?: string;
  temperatureCompensationKnown?: boolean;
  sampleTimestamp?: string;
  samplingProtocol?: string;
}

export interface ObservedNutritionStateInput {
  measuredPh?: number;
  sourceEc?: number;
  preparedInputEc?: number;
  runoffEc?: number;
  pourThroughEc?: number;
  poreWaterEc?: number;
  substrateEc?: number;
  substrateEcMethod?: SubstrateEcMethod;
  /** Legacy field retained only for migration/display. Never use without method semantics. */
  rootZoneEc?: number;
  substrateMoisturePct?: number;
  perlitePct?: number;
  potVolumeL?: number;
  irrigationVolumeL?: number;
  runoffVolumeL?: number;
  runoffFractionPct?: number;
  drybackPct?: number;
  irrigationEventId?: string;
  measurementQuality?: MeasurementQualityInput;
}

export interface ObservedNutritionState {
  measuredPh?: number;
  sourceEc?: number;
  preparedInputEc?: number;
  runoffEc?: number;
  pourThroughEc?: number;
  poreWaterEc?: number;
  substrateEc?: number;
  substrateEcMethod: SubstrateEcMethod;
  legacyRootZoneEc?: number;
  rootZoneUsableForDecision: boolean;
  runoffMinusInputEc?: number;
  substrateMoisturePct?: number;
  perlitePct?: number;
  potVolumeL?: number;
  irrigationVolumeL?: number;
  runoffVolumeL?: number;
  runoffFractionPct?: number;
  drybackPct?: number;
  irrigationEventId?: string;
  measurementQualityKnown: boolean;
  known: string[];
  missing: string[];
  notes: string[];
}

function finiteInRange(value: number | undefined, min: number, max: number) {
  return value !== undefined && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

function nonEmpty(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Normalises observational data only. It deliberately does not recommend a dose.
 * SOURCE/INPUT/RUNOFF/POUR_THROUGH/PORE_WATER/SUBSTRATE EC remain separate because
 * the method, VWC, sample timing and flow path change interpretation.
 */
export function buildObservedNutritionState(input: ObservedNutritionStateInput): ObservedNutritionState {
  const measuredPh = finiteInRange(input.measuredPh, 0, 14);
  const sourceEc = finiteInRange(input.sourceEc, 0, 20);
  const preparedInputEc = finiteInRange(input.preparedInputEc, 0, 20);
  const runoffEc = finiteInRange(input.runoffEc, 0, 20);
  const pourThroughEc = finiteInRange(input.pourThroughEc, 0, 20);
  const poreWaterEc = finiteInRange(input.poreWaterEc, 0, 20);
  const substrateEc = finiteInRange(input.substrateEc, 0, 20);
  const legacyRootZoneEc = finiteInRange(input.rootZoneEc, 0, 20);
  const substrateMoisturePct = finiteInRange(input.substrateMoisturePct, 0, 100);
  const perlitePct = finiteInRange(input.perlitePct, 0, 100);
  const potVolumeL = finiteInRange(input.potVolumeL, 0.1, 500);
  const irrigationVolumeL = finiteInRange(input.irrigationVolumeL, 0, 500);
  const runoffVolumeL = finiteInRange(input.runoffVolumeL, 0, 500);
  const runoffFractionPct = finiteInRange(input.runoffFractionPct, 0, 100);
  const drybackPct = finiteInRange(input.drybackPct, 0, 100);
  const substrateEcMethod = input.substrateEcMethod ?? 'UNKNOWN';
  const runoffMinusInputEc = preparedInputEc !== undefined && runoffEc !== undefined
    ? Number((runoffEc - preparedInputEc).toFixed(3))
    : undefined;

  const quality = input.measurementQuality ?? {};
  const measurementQualityKnown = Boolean(
    nonEmpty(quality.meterModel)
    && nonEmpty(quality.calibrationDate)
    && nonEmpty(quality.sampleTimestamp)
    && nonEmpty(quality.samplingProtocol),
  );

  const rootZoneUsableForDecision = Boolean(
    (substrateEc !== undefined && substrateEcMethod !== 'UNKNOWN')
    || pourThroughEc !== undefined
    || poreWaterEc !== undefined,
  );

  const known: string[] = [];
  const missing: string[] = [];
  const notes: string[] = [
    'EC is bulk conductivity, not an ion-specific analysis. Do not infer Ca/Mg/K/N/P deficiency from EC alone.',
    'SOURCE_EC, INPUT_EC_GROSS, RUNOFF_EC, POUR_THROUGH_EC, PORE_WATER_EC and SUBSTRATE_EC are different measurements.',
    'A generic root-zone EC value without measurement_method is not decision-grade data.',
  ];

  const track = (label: string, value: number | string | undefined | boolean) => (value === undefined || value === false ? missing : known).push(label);
  track('pH', measuredPh);
  track('source EC', sourceEc);
  track('prepared/input EC', preparedInputEc);
  track('runoff EC', runoffEc);
  track('substrate/root-zone method', substrateEcMethod !== 'UNKNOWN' ? substrateEcMethod : undefined);
  track('decision-grade root-zone EC', rootZoneUsableForDecision || undefined);
  track('substrate moisture', substrateMoisturePct);
  track('perlite ratio', perlitePct);
  track('pot volume', potVolumeL);
  track('irrigation volume', irrigationVolumeL);
  track('runoff volume/fraction', runoffVolumeL ?? runoffFractionPct);
  track('dryback', drybackPct);
  track('measurement quality metadata', measurementQualityKnown || undefined);

  if (runoffMinusInputEc !== undefined) {
    notes.push(`Observed runoff minus input EC = ${runoffMinusInputEc >= 0 ? '+' : ''}${runoffMinusInputEc.toFixed(2)} mS/cm. This is descriptive feedback only; dryback, runoff fraction and method can change interpretation.`);
  }
  if (legacyRootZoneEc !== undefined && !rootZoneUsableForDecision) {
    notes.push(`Legacy rootZoneEc ${legacyRootZoneEc.toFixed(2)} mS/cm is stored for migration/display but is excluded from adaptive decisions until its measurement method is known.`);
  }
  if (perlitePct === undefined) notes.push('Exact soil/perlite ratio is unknown, so substrate physics remain incomplete.');
  if (!measurementQualityKnown) notes.push('Measurement quality envelope incomplete: meter/calibration/timestamp/sampling protocol required before adaptive correction.');
  if (runoffEc !== undefined && runoffVolumeL === undefined && runoffFractionPct === undefined) notes.push('Runoff EC without runoff volume/fraction is not sufficient for a trend-based dose change.');

  return {
    measuredPh,
    sourceEc,
    preparedInputEc,
    runoffEc,
    pourThroughEc,
    poreWaterEc,
    substrateEc,
    substrateEcMethod,
    legacyRootZoneEc,
    rootZoneUsableForDecision,
    runoffMinusInputEc,
    substrateMoisturePct,
    perlitePct,
    potVolumeL,
    irrigationVolumeL,
    runoffVolumeL,
    runoffFractionPct,
    drybackPct,
    irrigationEventId: nonEmpty(input.irrigationEventId),
    measurementQualityKnown,
    known,
    missing,
    notes,
  };
}
