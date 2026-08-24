import { PHYSICAL_SYRINGES } from './data';
import { allocateToolSet, type ToolSetAllocation } from './syringeEngine';
import {
  buildExecutionProtocol,
  buildExecutionSteps,
  findInventoryShortages,
  validateRecipeContext,
  type ExecutionProtocolStep,
} from './recipeEngine';
import type {
  ExecutionMeasurements,
  GrowthStage,
  Medium,
  Product,
  Recipe,
  WaterType,
} from './types';

export interface ExecutionReadinessInput {
  recipe: Recipe;
  products: Product[];
  medium: Medium;
  stage: GrowthStage;
  week?: number;
  waterType?: WaterType;
  volumeLitres: number;
  readyToUseVolumeMl?: number;
  measurements: ExecutionMeasurements;
  confirmedProtocolStepIds: string[];
}

export interface ExecutionBlocker {
  code:
    | 'RECIPE_VALIDATION'
    | 'PROTOCOL_STEP_NOT_CONFIRMED'
    | 'PRE_BASE_PH_REQUIRED'
    | 'PRE_BASE_PH_OUT_OF_POLICY'
    | 'FINAL_EC_REQUIRED'
    | 'FINAL_PH_REQUIRED'
    | 'INVALID_MEASUREMENT'
    | 'INVENTORY_SHORTAGE'
    | 'TOOL_SHORTAGE'
    | 'READY_TO_USE_VOLUME_REQUIRED';
  message: string;
}

export interface ExecutionReadiness {
  allowed: boolean;
  blockers: ExecutionBlocker[];
  protocol: ExecutionProtocolStep[];
  toolSet: ToolSetAllocation;
  requirements: Array<{ productId: string; amountMl: number }>;
}

export const PRE_BASE_PH_MAX_EXCLUSIVE = 7;

export function evaluateExecutionReadiness(input: ExecutionReadinessInput): ExecutionReadiness {
  const blockers: ExecutionBlocker[] = [];
  const protocol = buildExecutionProtocol(input.recipe, input.products);
  const validation = validateRecipeContext(
    input.recipe,
    input.products,
    {
      medium: input.medium,
      method: input.recipe.method,
      week: input.week,
    },
    'PHYSICAL_EXECUTION',
  );

  for (const warning of validation.filter(item => item.severity === 'ERROR')) {
    blockers.push({ code: 'RECIPE_VALIDATION', message: warning.message });
  }

  const confirmed = new Set(input.confirmedProtocolStepIds);
  for (const step of protocol) {
    if (!confirmed.has(step.id)) {
      blockers.push({
        code: 'PROTOCOL_STEP_NOT_CONFIRMED',
        message: `Niepotwierdzony krok: ${step.kind === 'ACTION' ? step.title : step.product.name}.`,
      });
    }
  }

  validateMeasurements(protocol, input.measurements, blockers);

  const isReadyToSpray = String(input.recipe.method) === 'READY_TO_SPRAY';
  const productSteps = buildExecutionSteps(input.recipe, input.products);
  const requests = isReadyToSpray
    ? []
    : productSteps
        .filter(step => step.ingredient.concentration > 0 && step.product.unit === 'ml')
        .map(step => ({
          productId: step.product.id,
          volumeMl: roundMl(step.ingredient.concentration * input.volumeLitres),
        }));

  const toolSet = allocateToolSet(requests, PHYSICAL_SYRINGES, 'PRECISION');
  if (!toolSet.complete) {
    for (const shortage of toolSet.shortages) {
      blockers.push({
        code: 'TOOL_SHORTAGE',
        message: `Brak mierzalnego przydziału narzędzia dla ${shortage.productId}: ${shortage.remainingMl} ml.`,
      });
    }
  }

  let requirements: Array<{ productId: string; amountMl: number }> = [];
  if (isReadyToSpray) {
    const directMl = input.readyToUseVolumeMl ?? 0;
    if (!Number.isFinite(directMl) || directMl <= 0) {
      blockers.push({
        code: 'READY_TO_USE_VOLUME_REQUIRED',
        message: 'Podaj rzeczywistą ilość zużywanego produktu READY_TO_SPRAY.',
      });
    } else if (productSteps.length === 1) {
      const product = productSteps[0].product;
      if (product.remainingCapacity + 0.005 < directMl) {
        blockers.push({
          code: 'INVENTORY_SHORTAGE',
          message: `${product.name}: potrzeba ${directMl} ml, dostępne ${product.remainingCapacity} ml.`,
        });
      }
      requirements = [{ productId: product.id, amountMl: roundMl(directMl) }];
    }
  } else {
    for (const shortage of findInventoryShortages(input.recipe, input.products, input.volumeLitres)) {
      blockers.push({
        code: 'INVENTORY_SHORTAGE',
        message: `${shortage.productName}: potrzeba ${shortage.requiredMl} ml, dostępne ${shortage.availableMl} ml.`,
      });
    }
    requirements = requests.map(request => ({ productId: request.productId, amountMl: request.volumeMl }));
  }

  return {
    allowed: blockers.length === 0,
    blockers: dedupeBlockers(blockers),
    protocol,
    toolSet,
    requirements,
  };
}

function validateMeasurements(
  protocol: ExecutionProtocolStep[],
  measurements: ExecutionMeasurements,
  blockers: ExecutionBlocker[],
) {
  const needsPreBase = protocol.some(step => step.kind === 'ACTION' && step.measurement === 'PRE_BASE_PH');
  const needsFinalEc = protocol.some(step => step.kind === 'ACTION' && step.measurement === 'FINAL_EC');
  const needsFinalPh = protocol.some(step => step.kind === 'ACTION' && step.measurement === 'FINAL_PH');

  if (needsPreBase) {
    if (!isValidPh(measurements.preBasePh)) {
      blockers.push({ code: 'PRE_BASE_PH_REQUIRED', message: 'PRE-BASE pH gate wymaga rzeczywistego pomiaru pH 0–14.' });
    } else if ((measurements.preBasePh as number) >= PRE_BASE_PH_MAX_EXCLUSIVE) {
      blockers.push({
        code: 'PRE_BASE_PH_OUT_OF_POLICY',
        message: `PRE-BASE pH musi być poniżej ${PRE_BASE_PH_MAX_EXCLUSIVE.toFixed(1)} przed kontynuacją.`,
      });
    }
  }

  if (needsFinalEc && !isValidEc(measurements.finalEc)) {
    blockers.push({ code: 'FINAL_EC_REQUIRED', message: 'Końcowa bramka wymaga rzeczywistego pomiaru EC.' });
  }

  if (needsFinalPh && !isValidPh(measurements.finalPh)) {
    blockers.push({ code: 'FINAL_PH_REQUIRED', message: 'Końcowa bramka wymaga rzeczywistego pomiaru pH 0–14.' });
  }
}

function isValidPh(value?: number): boolean {
  return value !== undefined && Number.isFinite(value) && value >= 0 && value <= 14;
}

function isValidEc(value?: number): boolean {
  return value !== undefined && Number.isFinite(value) && value >= 0 && value <= 20;
}

function dedupeBlockers(blockers: ExecutionBlocker[]): ExecutionBlocker[] {
  const seen = new Set<string>();
  return blockers.filter(blocker => {
    const key = `${blocker.code}:${blocker.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function roundMl(value: number): number {
  return Number(value.toFixed(2));
}
