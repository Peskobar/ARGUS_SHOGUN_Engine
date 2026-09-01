import assert from 'node:assert/strict';
import test from 'node:test';
import { getCycleCoverage } from '../data/cycleCoverage.ts';
import type { GrowthPhase, PlanContext } from './types.ts';

const makeContext = (phase: GrowthPhase, phaseWeek: number | null): PlanContext => ({
  batchLiters: 10,
  cycleDay: 10,
  phase,
  phaseWeek,
  waterProfile: phase === 'VEG' || phase === 'FLOWER' ? 'SOFT' : null,
  customWaterEc: null,
  scheduleProfile: phase === 'VEG' || phase === 'FLOWER' ? 'STANDARD' : null,
});

void test('siewka z dostępnym profilem działa jako AUTO', () => {
  assert.equal(getCycleCoverage(makeContext('SEEDLING', 1)).mode, 'AUTOMATED');
});

void test('każda faza bez profilu pozostaje wykonywalna jako OPERATOR', () => {
  for (const [phase, week] of [
    ['SEEDLING', 3],
    ['VEG', 1],
    ['FLOWER', 1],
    ['FLUSH', 1],
  ] as const) {
    const coverage = getCycleCoverage(makeContext(phase, week));
    assert.equal(coverage.phase, phase);
    assert.equal(coverage.mode, 'OPERATOR');
    assert.match(coverage.reason, /bez blokady/);
  }
});
