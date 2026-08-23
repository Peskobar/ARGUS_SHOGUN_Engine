export type SymptomTag =
  | 'INTERVEINAL_CHLOROSIS'
  | 'MARGINAL_BURN'
  | 'GENERAL_CHLOROSIS'
  | 'NECROTIC_SPOTS'
  | 'STUNTING'
  | 'LEAF_CURL'
  | 'UNKNOWN';

export interface SymptomObservation {
  tags: SymptomTag[];
  location?: 'OLD_GROWTH' | 'NEW_GROWTH' | 'WHOLE_PLANT' | 'UNKNOWN';
  mediumEcHigh?: boolean;
  pHOutOfRange?: boolean;
  rootStressPossible?: boolean;
  drybackExtreme?: boolean;
  recentDoseChange?: boolean;
}

export interface SymptomHypothesis {
  id: string;
  label: string;
  confidence: 'LOW' | 'MEDIUM';
  supportingSignals: string[];
  competingCauses: string[];
}

export interface SymptomAssessment {
  mode: 'HYPOTHESIS_ONLY';
  diagnosisAllowed: false;
  automaticDoseChangeAllowed: false;
  hypotheses: SymptomHypothesis[];
  blockers: string[];
}

/**
 * Visual symptoms create hypotheses, never nutrient prescriptions. The independent
 * audit explicitly rejects photo -> deficiency -> dose shortcuts.
 */
export function assessSymptoms(observation: SymptomObservation): SymptomAssessment {
  const hypotheses: SymptomHypothesis[] = [];
  const blockers = [
    'Visual symptom is not unique to one nutrient.',
    'Supply deficiency must be separated from uptake/lockout, osmotic stress and root-zone problems.',
  ];

  if (observation.tags.includes('INTERVEINAL_CHLOROSIS')) {
    hypotheses.push({
      id: 'mg_like_or_micronutrient_pattern',
      label: 'Mg-like / micronutrient-like chlorosis pattern',
      confidence: 'LOW',
      supportingSignals: observation.location ? [`location=${observation.location}`] : [],
      competingCauses: ['pH-driven availability', 'high root-zone EC', 'K/Ca/Mg antagonism', 'root stress', 'non-nutrient leaf stress'],
    });
  }

  if (observation.tags.includes('MARGINAL_BURN') || observation.tags.includes('LEAF_CURL')) {
    hypotheses.push({
      id: 'osmotic_or_root_zone_stress',
      label: 'Osmotic / root-zone stress pattern',
      confidence: observation.mediumEcHigh ? 'MEDIUM' : 'LOW',
      supportingSignals: observation.mediumEcHigh ? ['medium EC reported high'] : [],
      competingCauses: ['environmental heat/light stress', 'dryback', 'salt accumulation', 'specific ion imbalance'],
    });
  }

  if (observation.tags.includes('GENERAL_CHLOROSIS') || observation.tags.includes('STUNTING')) {
    hypotheses.push({
      id: 'broad_nutrition_or_root_limitation',
      label: 'Broad nutrition / uptake limitation',
      confidence: 'LOW',
      supportingSignals: observation.recentDoseChange ? ['recent dose change'] : [],
      competingCauses: ['low total supply', 'root-zone pH/EC issue', 'root health', 'water availability', 'environmental demand mismatch'],
    });
  }

  if (observation.mediumEcHigh) blockers.push('High medium EC blocks automatic CalMag MORE until root-zone method and cation context are checked.');
  if (observation.pHOutOfRange) blockers.push('pH context can change nutrient availability without a true supply deficiency.');
  if (observation.rootStressPossible) blockers.push('Root health must be checked before attributing symptoms to nutrient supply.');

  return {
    mode: 'HYPOTHESIS_ONLY',
    diagnosisAllowed: false,
    automaticDoseChangeAllowed: false,
    hypotheses,
    blockers,
  };
}
