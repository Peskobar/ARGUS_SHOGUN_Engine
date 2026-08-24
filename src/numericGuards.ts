export const NUMERIC_LIMITS = Object.freeze({
  sourceEcMsCm: Object.freeze({ min: 0, max: 20 }),
  ph: Object.freeze({ min: 0, max: 14 }),
  relativeHumidityPct: Object.freeze({ min: 0, max: 100 }),
});

export function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function finiteInRange(value: unknown, min: number, max: number): value is number {
  return finiteNumber(value) && value >= min && value <= max;
}

export function normalizeSourceEc(value: unknown): number | undefined {
  const { min, max } = NUMERIC_LIMITS.sourceEcMsCm;
  return finiteInRange(value, min, max) ? value : undefined;
}

export function normalizePh(value: unknown): number | undefined {
  const { min, max } = NUMERIC_LIMITS.ph;
  return finiteInRange(value, min, max) ? value : undefined;
}

export function normalizeRelativeHumidity(value: unknown): number | undefined {
  const { min, max } = NUMERIC_LIMITS.relativeHumidityPct;
  return finiteInRange(value, min, max) ? value : undefined;
}
