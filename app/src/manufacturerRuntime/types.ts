import type { GrowthPhase, ScheduleProfile, WaterProfile } from '../domain/types.ts';

export type GuidanceStatus =
  | 'VERIFIED_AUTO'
  | 'PARTIAL_VERIFIED'
  | 'OPERATOR_GUIDANCE'
  | 'CONFLICT'
  | 'NO_EVIDENCE';

export type SourceTier =
  | 'official_calculator'
  | 'official_feedchart'
  | 'official_product_info'
  | 'official_howto'
  | 'label_marketing';

export type ApplicationMethod =
  | 'root_feed'
  | 'foliar'
  | 'soak'
  | 'reservoir'
  | 'premix'
  | 'other';

export interface SourceRef {
  url: string;
  checkedAt: string;
  sourceType: SourceTier;
  isOfficialDomain: boolean;
  note?: string;
}

export interface VerifiableField<T> {
  value: T | null;
  verified: boolean;
  sourceRefs: SourceRef[];
}

export interface PhaseWindow {
  phase: GrowthPhase;
  fromWeek?: number;
  toWeek?: number;
  note: string;
  sourceRefs: SourceRef[];
}

export interface ProductGuidance {
  productId: string;
  officialName: string;
  purpose: VerifiableField<string>;
  phaseWindows: PhaseWindow[];
  applicationMethod: ApplicationMethod[];
  warnings: string[];
  mixingGuidance: string[];
  requiresSeparatePremix: boolean;
  compatibility: string[];
  sourceRefs: SourceRef[];
  verified: boolean;
}

export interface Conflict {
  context: string;
  valueA: string;
  sourceA: SourceRef;
  valueB: string;
  sourceB: SourceRef;
}

export interface ManufacturerRuntimeQuery {
  phase: GrowthPhase;
  phaseWeek: number | null;
  waterProfile: WaterProfile | null;
  customWaterEc: number | null;
  scheduleProfile: ScheduleProfile | null;
}

export interface ManufacturerRuntimeContext {
  phase: GrowthPhase;
  phaseWeek: number | null;
  executionMode: 'AUTO' | 'OPERATOR';
  verifiedRecipeAvailable: boolean;
  guidanceAvailable: boolean;
  guidanceStatus: GuidanceStatus;
  products: ProductGuidance[];
  manufacturerGuidance: string[];
  mixingGuidance: string[];
  waterGuidance: string;
  phGuidance: string;
  ecGuidance: string;
  warnings: string[];
  conflicts: Conflict[];
  missingEvidence: string[];
  sourceRefs: SourceRef[];
  exactRecipeSource: 'SHOGUN_EVIDENCE_LEDGER_v2' | null;
}
