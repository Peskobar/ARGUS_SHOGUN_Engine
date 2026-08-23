import { EMmerichWaterReference } from './evidenceMatrix';

export type WaterDataSource = 'USER_MEASUREMENT' | 'LOCAL_WATER_REFERENCE' | 'DECLARED_PROFILE' | 'UNKNOWN';

export interface WaterChemistryInput {
  backgroundEc?: number;
  pH?: number;
  calciumMgL?: number;
  magnesiumMgL?: number;
  alkalinityMgLCaCO3?: number;
}

export interface ProvenancedNumber {
  value: number;
  source: WaterDataSource;
  liveMeasurement: boolean;
}

export interface WaterChemistryState {
  backgroundEc?: ProvenancedNumber;
  pH?: ProvenancedNumber;
  calciumMgL?: ProvenancedNumber;
  magnesiumMgL?: ProvenancedNumber;
  alkalinityMgLCaCO3?: ProvenancedNumber;
  notes: string[];
}

function valid(value: number | undefined, min: number, max: number) {
  return value !== undefined && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

/**
 * Resolves each water field independently. A user measurement wins only for the
 * field that was actually measured; utility chemistry may remain visible as a
 * reference for other fields, but is never relabelled as a live tap measurement.
 */
export function buildWaterChemistryState(
  user: WaterChemistryInput,
  includeLocalReference = true,
): WaterChemistryState {
  const userEc = valid(user.backgroundEc, 0, 20);
  const userPh = valid(user.pH, 0, 14);
  const userCa = valid(user.calciumMgL, 0, 1000);
  const userMg = valid(user.magnesiumMgL, 0, 1000);
  const userAlkalinity = valid(user.alkalinityMgLCaCO3, 0, 2000);

  const state: WaterChemistryState = {
    backgroundEc: userEc !== undefined
      ? { value: userEc, source: 'USER_MEASUREMENT', liveMeasurement: true }
      : includeLocalReference
        ? { value: EMmerichWaterReference.backgroundEcMsCmApprox, source: 'LOCAL_WATER_REFERENCE', liveMeasurement: false }
        : undefined,
    pH: userPh !== undefined
      ? { value: userPh, source: 'USER_MEASUREMENT', liveMeasurement: true }
      : includeLocalReference
        ? { value: EMmerichWaterReference.pH, source: 'LOCAL_WATER_REFERENCE', liveMeasurement: false }
        : undefined,
    calciumMgL: userCa !== undefined
      ? { value: userCa, source: 'USER_MEASUREMENT', liveMeasurement: true }
      : includeLocalReference
        ? { value: EMmerichWaterReference.calciumMgL, source: 'LOCAL_WATER_REFERENCE', liveMeasurement: false }
        : undefined,
    magnesiumMgL: userMg !== undefined
      ? { value: userMg, source: 'USER_MEASUREMENT', liveMeasurement: true }
      : includeLocalReference
        ? { value: EMmerichWaterReference.magnesiumMgL, source: 'LOCAL_WATER_REFERENCE', liveMeasurement: false }
        : undefined,
    alkalinityMgLCaCO3: userAlkalinity !== undefined
      ? { value: userAlkalinity, source: 'USER_MEASUREMENT', liveMeasurement: true }
      : undefined,
    notes: [],
  };

  if (state.backgroundEc?.source === 'LOCAL_WATER_REFERENCE') {
    state.notes.push('Background EC comes from the municipal reference, not the current tap. It must not trigger automatic LED percentage adjustment.');
  }
  if (state.calciumMgL?.source === 'LOCAL_WATER_REFERENCE' || state.magnesiumMgL?.source === 'LOCAL_WATER_REFERENCE') {
    state.notes.push('Municipal Ca/Mg values are useful context only. They do not prove the exact mineral content at the tap on mixing day.');
  }
  if (!state.alkalinityMgLCaCO3) {
    state.notes.push('Alkalinity/HCO3 context is unresolved; pH alone does not describe buffering capacity.');
  }

  return state;
}

export function hasLiveBackgroundEc(state: WaterChemistryState) {
  return state.backgroundEc?.source === 'USER_MEASUREMENT' && state.backgroundEc.liveMeasurement;
}
