import { DEMO_PLAN_TEMPLATES } from '../data/demoPlans.ts';
import type { ControlMode, PlanVariant } from './types.ts';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function buildPlanVariants(batchLiters: number): PlanVariant[] {
  const factor = batchLiters / 10;

  return DEMO_PLAN_TEMPLATES.map((template) => ({
    id: template.id,
    label: template.label,
    description: template.description,
    batchLiters,
    ingredients: template.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      amountMl: round2(ingredient.amountPer10L * factor),
      tool: ingredient.tool,
      mixSeconds: ingredient.mixSeconds,
      sourceStatus: 'DEMO_DATA_NOT_FOR_USE' as const,
    })),
  }));
}

export function validatePlanForExecution(plan: PlanVariant | undefined): string[] {
  if (!plan) return ['Brak wybranego planu.'];

  const blockers: string[] = [];

  if (!Number.isFinite(plan.batchLiters) || plan.batchLiters <= 0) {
    blockers.push('Objętość partii musi być dodatnią liczbą.');
  }

  if (plan.ingredients.length === 0) blockers.push('Plan nie zawiera składników.');

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

  const advisories = ['Dane tego vertical slice są DEMO i nie są zweryfikowaną recepturą producenta.'];

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
