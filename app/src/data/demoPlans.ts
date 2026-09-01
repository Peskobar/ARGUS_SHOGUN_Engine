import type { PlanId } from '../domain/types.ts';

export interface DemoIngredientTemplate {
  id: string;
  name: string;
  amountPer10L: number;
  tool: string;
  mixSeconds: number;
}

export interface DemoPlanTemplate {
  id: PlanId;
  label: string;
  description: string;
  ingredients: DemoIngredientTemplate[];
}

const shared = {
  silicon: { id: 'demo-silicon', name: 'DEMO — krok Silicon', tool: 'strzykawka 5 ml', mixSeconds: 10 },
  base: { id: 'demo-base', name: 'DEMO — baza', tool: 'strzykawka 10 ml', mixSeconds: 10 },
  roots: { id: 'demo-roots', name: 'DEMO — korzenie', tool: 'strzykawka 5 ml', mixSeconds: 10 },
  enzyme: { id: 'demo-enzyme', name: 'DEMO — enzym', tool: 'strzykawka 5 ml', mixSeconds: 10 },
};

export const DEMO_PLAN_TEMPLATES: DemoPlanTemplate[] = [
  {
    id: 'manufacturer',
    label: 'Producent',
    description: 'Miejsce na pierwszy kompletny, zweryfikowany plan producenta.',
    ingredients: [],
  },
  {
    id: 'balanced',
    label: 'Zbalansowany',
    description: 'Wariant demonstracyjny do testowania różnic pomiędzy planami.',
    ingredients: [
      { ...shared.silicon, amountPer10L: 1 },
      { ...shared.base, amountPer10L: 3 },
      { ...shared.roots, amountPer10L: 2 },
      { ...shared.enzyme, amountPer10L: 2 },
    ],
  },
  {
    id: 'growth',
    label: 'Wzrost',
    description: 'Wariant demonstracyjny do testowania różnic pomiędzy planami.',
    ingredients: [
      { ...shared.silicon, amountPer10L: 1 },
      { ...shared.base, amountPer10L: 3.5 },
      { ...shared.roots, amountPer10L: 2.5 },
      { ...shared.enzyme, amountPer10L: 1.5 },
    ],
  },
];
