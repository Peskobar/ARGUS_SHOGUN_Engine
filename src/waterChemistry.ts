import { EMMERICH_WATER_REFERENCE_2026 } from './localWaterReference';

export type WaterDataSource = 'USER_MEASUREMENT' | 'LOCAL_WATER_REFERENCE' | 'DECLARED_PROFILE' | 'UNKNOWN';

export interface WaterChemistryInput {
  backgroundEc?: number;
  pH?: number;
  calciumMgL?: number;
  magnesiumMgL?: number;
  alkalinityMmolLToPh43?: number;
  bicarbonateMgL?: number;
  sodiumMgL?: number;
  chlorideMgL?: number;
  hardnessDh?: number;
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
  alkalinityMmolLToPh43?: ProvenancedNumber;
  bicarbonateMgL?: ProvenancedNumber;
  sodiumMgL?: ProvenancedNumber;
  chlorideMgL?: ProvenancedNumber;
  hardnessDh?: ProvenancedNumber;
  chemistryCompleteForAdaptiveCalMag: boolean;
  notes: string[];
}

function valid(value: number | undefined, min: number, max: number) {
  return value !== undefined && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

function choose(userValue: number | undefined, referenceValue?: number): ProvenancedNumber | undefined {
  if (userValue !== undefined) return { value: userValue, source: 'USER_MEASUREMENT', liveMeasurement: true };
  if (referenceValue !== undefined) return { value: referenceValue, source: 'LOCAL_WATER_REFERENCE', liveMeasurement: false };
  return undefined;
}

/**
 * Field-level provenance. A municipal/reference value may inform explanation,
 * but cannot satisfy a live adaptive-dose gate. Adaptive CalMag authority
 * requires a live source EC plus live Ca, Mg and live buffer chemistry from the
 * current water sample. This deliberately fails closed.
 */
export function buildWaterChemistryState(
  user: WaterChemistryInput,
  includeLocalReference = true,
): WaterChemistryState {
  const userEc = valid(user.backgroundEc, 0, 20);
  const userPh = valid(user.pH, 0, 14);
  const userCa = valid(user.calciumMgL, 0, 1000);
  const userMg = valid(user.magnesiumMgL, 0, 1000);
  const userAlkalinity = valid(user.alkalinityMmolLToPh43, 0, 50);
  const userBicarbonate = valid(user.bicarbonateMgL, 0, 5000);
  const userSodium = valid(user.sodiumMgL, 0, 5000);
  const userChloride = valid(user.chlorideMgL, 0, 5000);
  const userHardness = valid(user.hardnessDh, 0, 100);

  const ref = includeLocalReference ? EMMERICH_WATER_REFERENCE_2026 : undefined;
  const state: WaterChemistryState = {
    backgroundEc: choose(userEc, ref?.backgroundEcMsCmApprox),
    pH: choose(userPh, ref?.pH),
    calciumMgL: choose(userCa, ref?.calciumMgL),
    magnesiumMgL: choose(userMg, ref?.magnesiumMgL),
    alkalinityMmolLToPh43: choose(userAlkalinity, ref?.alkalinityMmolLToPh43),
    bicarbonateMgL: choose(userBicarbonate),
    sodiumMgL: choose(userSodium),
    chlorideMgL: choose(userChloride),
    hardnessDh: choose(userHardness, ref?.hardnessDh),
    chemistryCompleteForAdaptiveCalMag: false,
    notes: [],
  };

  const liveEc = isLive(state.backgroundEc);
  const liveCa = isLive(state.calciumMgL);
  const liveMg = isLive(state.magnesiumMgL);
  const liveBuffer = isLive(state.alkalinityMmolLToPh43) || isLive(state.bicarbonateMgL);
  state.chemistryCompleteForAdaptiveCalMag = liveEc && liveCa && liveMg && liveBuffer;

  if (state.backgroundEc?.source === 'LOCAL_WATER_REFERENCE') {
    state.notes.push('SOURCE_EC comes from Stadtwerke Emmerich reference, not the current tap sample. It cannot trigger an automatic dose modifier.');
  }
  if (state.calciumMgL?.source === 'LOCAL_WATER_REFERENCE' || state.magnesiumMgL?.source === 'LOCAL_WATER_REFERENCE') {
    state.notes.push('Municipal Ca/Mg are contextual values only. They do not satisfy the live chemistry gate for adaptive CalMag.');
  }
  if (!liveBuffer) {
    state.notes.push('Live alkalinity/HCO3 context is unresolved; pH alone does not describe current buffering capacity.');
  }
  if (!state.sodiumMgL || !state.chlorideMgL) {
    state.notes.push('Na/Cl are unresolved in the current user-input model; total EC cannot identify them.');
  }
  if (!state.chemistryCompleteForAdaptiveCalMag) {
    state.notes.push('Adaptive CalMag remains ABSTAIN: live EC + live Ca + live Mg + live alkalinity/HCO3 are required.');
  }

  return state;
}

export function hasLiveBackgroundEc(state: WaterChemistryState) {
  return isLive(state.backgroundEc);
}

function isLive(value?: ProvenancedNumber): boolean {
  return value?.source === 'USER_MEASUREMENT' && value.liveMeasurement;
}
