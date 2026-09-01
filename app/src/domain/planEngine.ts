import { DEMO_PLAN_TEMPLATES } from '../data/demoPlans.ts';
import { getManufacturerPlanStatus } from '../data/manufacturerPlanStatus.ts';
import { getManufacturerSchedule } from '../data/manufacturerSchedule.ts';
import type { ControlMode, PlanContext, PlanVariant } from './types.ts';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function buildPlanVariants(context: PlanContext): PlanVariant[] {
  const { batchLiters, cycleDay, phase } = context;
  const factor = batchLiters / 10;
  const manufacturerStatus = getManufacturerPlanStatus(context);
  const manufacturerSchedule = getManufacturerSchedule(context);

  return DEMO_PLAN_TEMPLATES.map((template) => {
    if (template.id === 'manufacturer') {
      return {
        id: template.id,
        label: template.label,
        description: manufacturerSchedule
          ? `Zweryfikowany plan producenta dla siewki, tydzień ${manufacturerSchedule.phaseWeek}.`
          : 'Oficjalny harmonogram producenta nie ma jeszcze danych runtime dla tego dokładnego kontekstu.',
        batchLiters,
        cycleDay,
        phase,
        verifiedProfileAvailable: manufacturerStatus.available,
        contextReady: manufacturerStatus.contextReady,
        availabilityReason: manufacturerStatus.reason,
        evidenceLedger: manufacturerStatus.evidenceLedger,
        ingredients: manufacturerSchedule
          ? manufacturerSchedule.ingredients.map((ingredient) => ({
              id: ingredient.id,
              name: ingredient.name,
              amountMl: round2(ingredient.amountPerLiter * batchLiters),
              tool: ingredient.tool,
              mixSeconds: ingredient.mixSeconds,
              sourceStatus: 'VERIFIED' as const,
            }))
          : [],
      };
    }

    return {
      id: template.id,
      label: template.label,
      description: template.description,
      batchLiters,
      cycleDay,
      phase,
      ingredients: template.ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        amountMl: round2(ingredient.amountPer10L * factor),
        tool: ingredient.tool,
        mixSeconds: ingredient.mixSeconds,
        sourceStatus: 'DEMO_DATA_NOT_FOR_USE' as const,
      })),
    };
  });
}

export function validatePlanForExecution(plan: PlanVariant | undefined): string[] {
  if (!plan) return ['Brak wybranego planu.'];

  const blockers: string[] = [];

  if (!Number.isFinite(plan.batchLiters) || plan.batchLiters <= 0) {
    blockers.push('Objętość partii musi być dodatnią liczbą.');
  }

  if (!Number.isInteger(plan.cycleDay) || plan.cycleDay < 1) {
    blockers.push('Dzień cyklu musi być dodatnią liczbą całkowitą.');
  }

  if (plan.ingredients.length === 0) {
    blockers.push('ARGUS nie ma składników do automatycznego Mixera dla tego planu. To ograniczenie danych, nie decyzja agronomiczna.');
  }

  const ids = new Set<string>();
  for (const ingredient of plan.ingredients) {
    if (ids.has(ingredient.id)) blockers.push(`Duplikat składnika: ${ingredient.id}.`);
    ids.add(ingredient.id);

    if (!Number.isFinite(ingredient.amountMl) || ingredient.amountMl < 0) {
      blockers.push(`Niepoprawna ilość dla: ${ingredient.name}.`);
    }

    if (!Number.isFinite(ingredient.mixSeconds) || ingredient.mixSeconds < 0) {
      blockers.push(`Niepoprawny timer dla: ${ingredient.name}.`);
    }
  }

  return blockers;
}

export function getAdvisories(plan: PlanVariant | undefined, mode: ControlMode): string[] {
  if (!plan) return [];

  if (plan.id === 'manufacturer' && !plan.verifiedProfileAvailable) {
    const advisories = [
      plan.availabilityReason ?? 'Dokładny profil producenta nie został jeszcze wprowadzony.',
      'To ostrzeżenie nie blokuje operatora. Możesz przejść dalej i zapisać wykonanie jako decyzję operatora.',
    ];
    if (mode === 'PRO') advisories.push('PRO: przy wykonaniu operatora ARGUS zapisze, że składniki nie były znane aplikacji.');
    return advisories;
  }

  const verified = plan.ingredients.length > 0 && plan.ingredients.every((ingredient) => ingredient.sourceStatus === 'VERIFIED');
  const advisories = verified
    ? ['Producent: zweryfikowany jest tylko dokładnie ten profil. ARGUS nie podstawia danych z innego tygodnia.']
    : ['Dane tego vertical slice są DEMO i nie są zweryfikowaną recepturą producenta.'];

  if (mode === 'PRO') {
    advisories.push('PRO: sprawdź źródło receptury, pomiary wejściowe i sens każdej korekty przed wykonaniem.');
  } else if (mode === 'STANDARD') {
    advisories.push('STANDARD: sprawdź recepturę i bieżący kontekst przed wykonaniem.');
  }

  return advisories;
}

export function getCycleDay(cycleStartDate: string, now = new Date()): number {
  const start = new Date(`${cycleStartDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const diff = now.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
}
