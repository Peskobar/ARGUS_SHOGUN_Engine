import { SyringeType } from './types';

export interface AllocatedSyringe {
  type: string;
  amount: number;
}

export interface AllocationPlan {
  productId: string;
  totalVolumeRequired: number; // ml
  syringes: AllocatedSyringe[];
}

export function calculateSyringes(
  totalVolumeMl: number, 
  availableSyringes: SyringeType[]
): AllocatedSyringe[] {
  if (totalVolumeMl <= 0) return [];

  // Sort syringes by capacity ascending
  const sorted = [...availableSyringes].sort((a, b) => a.capacity - b.capacity);
  
  const used: AllocatedSyringe[] = [];
  let remaining = totalVolumeMl;

  while (remaining > 0) {
    // Find the smallest syringe that can hold the remaining amount, 
    // or the largest syringe if remaining amount is larger than all capacities.
    let best = sorted.find(s => s.capacity >= remaining);
    if (!best) best = sorted[sorted.length - 1]; 
    
    // Always round correctly and ensure precision limits
    const amount = Math.min(remaining, best.capacity);
    const amountToUse = Number(amount.toFixed(2));
    
    used.push({ type: best.label, amount: amountToUse });
    
    remaining -= amountToUse;
    if (remaining < 0.01) remaining = 0; // Fix floating point precision
  }

  return used;
}
