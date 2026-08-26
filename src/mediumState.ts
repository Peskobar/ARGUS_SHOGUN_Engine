export interface MediumIdentityInput {
  productName?: string;
  batchId?: string;
  initialChargeKnown?: boolean;
  initialChargeDescription?: string;
  soilOrPeatPct?: number;
  perlitePct?: number;
  potVolumeL?: number;
  substrateTemperatureC?: number;
  substrateMoisturePct?: number;
}

export interface MediumIdentityState {
  medium: 'TERRA_SOIL_PERLITE';
  productName?: string;
  batchId?: string;
  initialChargeKnown: boolean;
  initialChargeDescription?: string;
  soilOrPeatPct?: number;
  perlitePct?: number;
  potVolumeL?: number;
  substrateTemperatureC?: number;
  substrateMoisturePct?: number;
  identityComplete: boolean;
  notes: string[];
}

function finite(value: number | undefined, min: number, max: number) {
  return value !== undefined && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

export function buildMediumIdentityState(input: MediumIdentityInput): MediumIdentityState {
  const soilOrPeatPct = finite(input.soilOrPeatPct, 0, 100);
  const perlitePct = finite(input.perlitePct, 0, 100);
  const potVolumeL = finite(input.potVolumeL, 0.1, 500);
  const substrateTemperatureC = finite(input.substrateTemperatureC, 0, 60);
  const substrateMoisturePct = finite(input.substrateMoisturePct, 0, 100);
  const notes: string[] = [];

  if (soilOrPeatPct !== undefined && perlitePct !== undefined && Math.abs((soilOrPeatPct + perlitePct) - 100) > 1) {
    notes.push('Soil/peat + perlite percentages do not sum to ~100%; medium composition needs clarification.');
  }
  if (!input.initialChargeKnown) notes.push('Initial nutrient charge is unknown; feedchart adaptation cannot assume an inert medium.');
  if (!input.productName) notes.push('Exact medium product/name is missing.');
  if (perlitePct === undefined) notes.push('Perlite proportion is missing; water-holding/aeration context remains incomplete.');

  const identityComplete = Boolean(
    input.productName
    && input.initialChargeKnown
    && perlitePct !== undefined
    && potVolumeL !== undefined,
  );

  return {
    medium: 'TERRA_SOIL_PERLITE',
    productName: input.productName,
    batchId: input.batchId,
    initialChargeKnown: input.initialChargeKnown === true,
    initialChargeDescription: input.initialChargeDescription,
    soilOrPeatPct,
    perlitePct,
    potVolumeL,
    substrateTemperatureC,
    substrateMoisturePct,
    identityComplete,
    notes,
  };
}
