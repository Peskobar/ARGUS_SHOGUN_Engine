import { getManufacturerSchedule as getExecutableManufacturerSchedule } from '../data/manufacturerSchedule.ts';
import { GENERAL_SOURCES, KNOWN_CONFLICTS, MANUFACTURER_PRODUCTS } from './manufacturerData.ts';
import type {
  GuidanceStatus,
  ManufacturerRuntimeContext,
  ManufacturerRuntimeQuery,
  ProductGuidance,
  SourceRef,
} from './types.ts';

export function getManufacturerRuntime(
  context: ManufacturerRuntimeQuery,
): ManufacturerRuntimeContext {
  const phaseWeek = context.phaseWeek ?? null;
  const phaseCandidates = MANUFACTURER_PRODUCTS.filter((product) =>
    product.phaseWindows.some((window) => window.phase === context.phase),
  );

  const products = phaseCandidates.filter((product) =>
    product.phaseWindows.some((window) => windowMatches(window, context.phase, phaseWeek)),
  );

  const productsToDescribe = phaseWeek == null ? phaseCandidates : products;
  const manufacturerGuidance: string[] = [];
  const warnings: string[] = [];
  const mixingGuidance: string[] = [];
  const missingEvidence: string[] = [];

  if (phaseWeek == null && phaseCandidates.some(hasBoundedWindowForPhase(context.phase))) {
    missingEvidence.push(
      `Brak tygodnia fazy ${context.phase}: część wskazówek producenta ma ograniczone okno tygodniowe.`,
    );
  }

  for (const product of productsToDescribe) {
    const windows = product.phaseWindows.filter((window) => window.phase === context.phase);
    const applicability = windows
      .map((window) => formatWindow(window.fromWeek, window.toWeek, window.note))
      .join(' / ');

    manufacturerGuidance.push(
      `${product.officialName}: ${product.purpose.value ?? 'brak opisu'} (${applicability})`,
    );
    warnings.push(...product.warnings);
    mixingGuidance.push(...product.mixingGuidance);
  }

  if (phaseWeek != null) {
    for (const candidate of phaseCandidates) {
      if (products.includes(candidate)) continue;
      const windows = candidate.phaseWindows.filter((window) => window.phase === context.phase);
      missingEvidence.push(
        `${candidate.officialName}: oficjalne okno nie obejmuje tygodnia ${phaseWeek} (${windows
          .map((window) => formatWindow(window.fromWeek, window.toWeek, window.note))
          .join(' / ')}).`,
      );
    }
  }

  const executableSchedule = getExecutableManufacturerSchedule({
    batchLiters: 10,
    cycleDay: 1,
    phase: context.phase,
    phaseWeek: context.phaseWeek,
    waterProfile: context.waterProfile,
    customWaterEc: context.customWaterEc,
    scheduleProfile: context.scheduleProfile,
  });

  const recipeContextIssues = getRecipeContextIssues(context);
  if (!executableSchedule) missingEvidence.push(...recipeContextIssues);
  if (!executableSchedule && recipeContextIssues.length === 0) {
    missingEvidence.push(
      'Brak zweryfikowanego dokładnego profilu feedchart/calculator dla tego pełnego kontekstu. Runtime pozostaje w OPERATOR.',
    );
  }

  const relevantProductIds = new Set(productsToDescribe.map((product) => product.productId));
  const conflicts = KNOWN_CONFLICTS.filter((conflict) =>
    [...relevantProductIds].some((id) => conflict.context.startsWith(id)),
  );

  const verifiedRecipeAvailable = executableSchedule != null && conflicts.length === 0;
  const generalPhaseGuidance = getGeneralPhaseGuidance(context.phase);
  if (generalPhaseGuidance) manufacturerGuidance.push(generalPhaseGuidance);

  const sourceRefs = dedupeSources([
    GENERAL_SOURCES.CALCULATOR,
    GENERAL_SOURCES.DOWNLOADS,
    ...productsToDescribe.flatMap((product) => product.sourceRefs),
  ]);

  const guidanceAvailable = manufacturerGuidance.length > 0 || sourceRefs.length > 0;
  const guidanceStatus = deriveGuidanceStatus({
    guidanceAvailable,
    verifiedRecipeAvailable,
    hasConflicts: conflicts.length > 0,
    hasVerifiedProductGuidance: productsToDescribe.some((product) => product.verified),
  });

  return {
    phase: context.phase,
    phaseWeek,
    executionMode: verifiedRecipeAvailable ? 'AUTO' : 'OPERATOR',
    verifiedRecipeAvailable,
    guidanceAvailable,
    guidanceStatus,
    products: productsToDescribe,
    manufacturerGuidance: dedupe(manufacturerGuidance),
    mixingGuidance: dedupe(mixingGuidance),
    waterGuidance:
      'Oficjalny kalkulator rozróżnia RO/destylowaną, miękką, średnio twardą, twardą i własną wodę. Profil własny wymaga wartości EC. ARGUS nie klasyfikuje wody sam.',
    phGuidance:
      'Wskazówki pH należą do oficjalnego kontekstu producenta. Warstwa guidance nie zamienia ogólnej informacji w recepturę.',
    ecGuidance:
      'EC jest częścią kontekstu producenta. Dla CUSTOM operator podaje własny pomiar; ARGUS nie zgaduje kategorii.',
    warnings: dedupe([
      ...warnings,
      'Nie wyprowadzaj profilu HEAVY wyłącznie z faktu używania LED.',
      'Manufacturer guidance nie jest executable recipe.',
    ]),
    conflicts,
    missingEvidence: dedupe(missingEvidence),
    sourceRefs,
    exactRecipeSource: verifiedRecipeAvailable ? 'SHOGUN_EVIDENCE_LEDGER_v2' : null,
  };
}

function windowMatches(
  window: ProductGuidance['phaseWindows'][number],
  phase: ManufacturerRuntimeQuery['phase'],
  phaseWeek: number | null,
): boolean {
  if (window.phase !== phase) return false;
  if (phaseWeek == null) return true;
  if (window.fromWeek != null && phaseWeek < window.fromWeek) return false;
  if (window.toWeek != null && phaseWeek > window.toWeek) return false;
  return true;
}

function hasBoundedWindowForPhase(phase: ManufacturerRuntimeQuery['phase']) {
  return (product: ProductGuidance): boolean =>
    product.phaseWindows.some(
      (window) => window.phase === phase && (window.fromWeek != null || window.toWeek != null),
    );
}

function getRecipeContextIssues(context: ManufacturerRuntimeQuery): string[] {
  const issues: string[] = [];
  if (!Number.isInteger(context.phaseWeek) || (context.phaseWeek ?? 0) < 1) {
    issues.push('AUTO wymaga dokładnego tygodnia fazy.');
  }

  if (context.phase === 'VEG' || context.phase === 'FLOWER') {
    if (context.waterProfile == null) issues.push('AUTO wymaga profilu wody.');
    if (context.scheduleProfile == null) issues.push('AUTO wymaga profilu Light/Standard/Heavy.');
    if (context.waterProfile === 'CUSTOM' && !isNonNegativeFinite(context.customWaterEc)) {
      issues.push('Profil CUSTOM wymaga własnej wartości EC.');
    }
  }

  return issues;
}

function deriveGuidanceStatus(args: {
  guidanceAvailable: boolean;
  verifiedRecipeAvailable: boolean;
  hasConflicts: boolean;
  hasVerifiedProductGuidance: boolean;
}): GuidanceStatus {
  if (args.hasConflicts) return 'CONFLICT';
  if (args.verifiedRecipeAvailable) return 'VERIFIED_AUTO';
  if (!args.guidanceAvailable) return 'NO_EVIDENCE';
  if (args.hasVerifiedProductGuidance) return 'PARTIAL_VERIFIED';
  return 'OPERATOR_GUIDANCE';
}

function getGeneralPhaseGuidance(phase: ManufacturerRuntimeQuery['phase']): string {
  switch (phase) {
    case 'SEEDLING':
      return 'Siewka: producent publikuje osobny kontekst dla siewek/sadzonek. Dokładna receptura AUTO nie może powstać z samej ogólnej karty produktu.';
    case 'VEG':
      return 'Wege: produkty z ograniczonym oknem tygodniowym są filtrowane przez phaseWeek; brak pełnej receptury nie usuwa wskazówek producenta.';
    case 'FLOWER':
      return 'Kwitnienie: producent rozróżnia tygodnie kwitnienia; produkty z ograniczonym oknem są pokazywane tylko wtedy, gdy phaseWeek je obejmuje.';
    case 'FLUSH':
      return 'Flush/final week: feedchart traktuje końcowy etap jako osobny kontekst. Runtime nie przypisuje automatycznie produktów ani dawek do FLUSH.';
  }
}

function formatWindow(fromWeek: number | undefined, toWeek: number | undefined, note: string): string {
  if (fromWeek == null && toWeek == null) return note;
  if (fromWeek != null && toWeek != null) return `tydzień ${fromWeek}-${toWeek}: ${note}`;
  if (fromWeek != null) return `od tygodnia ${fromWeek}: ${note}`;
  return `do tygodnia ${toWeek}: ${note}`;
}

function isNonNegativeFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function dedupeSources(items: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.url}|${item.sourceType}|${item.note ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
