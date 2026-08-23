export interface ObservedNutritionStateInput {
  measuredPh?: number;
  preparedInputEc?: number;
  runoffEc?: number;
  rootZoneEc?: number;
  substrateMoisturePct?: number;
  perlitePct?: number;
  potVolumeL?: number;
  irrigationVolumeL?: number;
}

export interface ObservedNutritionState {
  measuredPh?: number;
  preparedInputEc?: number;
  runoffEc?: number;
  rootZoneEc?: number;
  runoffMinusInputEc?: number;
  substrateMoisturePct?: number;
  perlitePct?: number;
  potVolumeL?: number;
  irrigationVolumeL?: number;
  known: string[];
  missing: string[];
  notes: string[];
}

function finiteInRange(value: number | undefined, min: number, max: number) {
  return value !== undefined && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

/**
 * Normalises observational data only. It deliberately does not recommend a dose.
 * EC values remain separate measurements because total conductivity does not identify
 * which ions are present or whether a visible symptom is a true deficiency.
 */
export function buildObservedNutritionState(input: ObservedNutritionStateInput): ObservedNutritionState {
  const measuredPh = finiteInRange(input.measuredPh, 0, 14);
  const preparedInputEc = finiteInRange(input.preparedInputEc, 0, 20);
  const runoffEc = finiteInRange(input.runoffEc, 0, 20);
  const rootZoneEc = finiteInRange(input.rootZoneEc, 0, 20);
  const substrateMoisturePct = finiteInRange(input.substrateMoisturePct, 0, 100);
  const perlitePct = finiteInRange(input.perlitePct, 0, 100);
  const potVolumeL = finiteInRange(input.potVolumeL, 0.1, 500);
  const irrigationVolumeL = finiteInRange(input.irrigationVolumeL, 0, 500);
  const runoffMinusInputEc = preparedInputEc !== undefined && runoffEc !== undefined
    ? Number((runoffEc - preparedInputEc).toFixed(3))
    : undefined;

  const known: string[] = [];
  const missing: string[] = [];
  const notes: string[] = [
    'EC is a bulk conductivity measurement, not an ion-specific analysis. Do not infer a specific Ca/Mg/K/N/P problem from EC alone.',
    'Input EC, runoff EC and root-zone/substrate EC are stored separately and are not interchangeable.',
  ];

  const track = (label: string, value: number | undefined) => (value === undefined ? missing : known).push(label);
  track('pH', measuredPh);
  track('prepared/input EC', preparedInputEc);
  track('runoff EC', runoffEc);
  track('root-zone EC', rootZoneEc);
  track('substrate moisture', substrateMoisturePct);
  track('perlite ratio', perlitePct);
  track('pot volume', potVolumeL);
  track('irrigation volume', irrigationVolumeL);

  if (runoffMinusInputEc !== undefined) {
    notes.push(`Observed runoff minus input EC = ${runoffMinusInputEc >= 0 ? '+' : ''}${runoffMinusInputEc.toFixed(2)} mS/cm. This is descriptive feedback only; no single-product dose change is inferred.`);
  }

  if (perlitePct === undefined) {
    notes.push('Exact perlite ratio is unknown, so substrate water-holding/aeration context remains incomplete.');
  }

  return {
    measuredPh,
    preparedInputEc,
    runoffEc,
    rootZoneEc,
    runoffMinusInputEc,
    substrateMoisturePct,
    perlitePct,
    potVolumeL,
    irrigationVolumeL,
    known,
    missing,
    notes,
  };
}
