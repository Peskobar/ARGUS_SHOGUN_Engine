import { GrowthStage } from './types';

export type DoseMethod = 'ROOT_FEED' | 'FOLIAR' | 'SOAK' | 'PROP_WATER' | 'READY_TO_SPRAY';
export type DoseCadence = 'ONCE' | 'WEEKLY' | 'EVERY_FEED' | 'WINDOW_ONLY' | 'UNSPECIFIED';
export type ManufacturerIntensity = 'LIGHT' | 'STANDARD' | 'HEAVY' | 'NOT_APPLICABLE';
export type ManufacturerWaterProfile = 'CUSTOM_EC' | 'RO' | 'SOFT' | 'HARD' | 'UNKNOWN';

export interface ManufacturerGeneratorTuple {
  nutrientLine: string;
  medium: string;
  tankLitres: number;
  waterProfile: ManufacturerWaterProfile;
  backgroundEc?: number;
  intensity: ManufacturerIntensity;
  stage?: GrowthStage;
  generatedAt: string;
}

export interface AuditedDoseRecord {
  productId: string;
  mlPerL: number;
  method: DoseMethod;
  stage: GrowthStage;
  weekStart: number;
  weekEnd: number;
  cadence: DoseCadence;
  medium: string;
  waterProfile: ManufacturerWaterProfile;
  intensity: ManufacturerIntensity;
  sourceId: string;
  sourceField: string;
}

export interface ManufacturerEvidenceSnapshot {
  snapshotId: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceClass: 'MANUFACTURER_CURRENT';
  documentVersion?: string;
  contentHash?: string;
  generatorTuple?: ManufacturerGeneratorTuple;
  rows: AuditedDoseRecord[];
  manuallyValidated: boolean;
  conflictsResolved: boolean;
  frozen: boolean;
}

/**
 * Deliberately null after the 23.08.2026 independent audit. Existing preview
 * rows are not promoted to a frozen current weekly-plan source.
 */
export const CURRENT_TERRA_LED_RELEASE_SNAPSHOT: ManufacturerEvidenceSnapshot | null = null;

export function validateSnapshotForWeeklyPlan(snapshot: ManufacturerEvidenceSnapshot | null) {
  const reasons: string[] = [];
  if (!snapshot) reasons.push('snapshot missing');
  if (snapshot && !snapshot.frozen) reasons.push('snapshot not frozen');
  if (snapshot && !snapshot.manuallyValidated) reasons.push('manual validation missing');
  if (snapshot && !snapshot.conflictsResolved) reasons.push('source conflicts unresolved');
  if (snapshot && !snapshot.contentHash) reasons.push('content hash missing');
  if (snapshot && !snapshot.generatorTuple) reasons.push('full generator tuple missing');
  if (snapshot && snapshot.rows.some(row => row.cadence === 'UNSPECIFIED')) reasons.push('dose cadence unspecified');
  return { valid: reasons.length === 0, reasons };
}
