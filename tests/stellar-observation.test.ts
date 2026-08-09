import { describe, expect, it } from 'vitest';
import type { ModelPrediction } from '../src/shared/domain';
import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  calculateStellarObservation,
  createStellarObservationPrediction,
  readStellarObservationSettings,
  StellarObservationError
} from '../src/simulation/stellar-observation';

describe('stellar observation', () => {
  it('resolves catalog → precession → local position → trail as one reference result', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-1',
      observedAtIso: '2026-08-09T20:00:00+03:00',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        starId: 'hr-7001',
        trailDurationMinutes: 720,
        trailSampleIntervalMinutes: 10
      }
    });
    expect(result.star.commonName).toBe('Vega');
    expect(result.meanOfDateRightAscensionDeg).not.toBe(result.sourceRightAscensionJ2000Deg);
    expect(result.position.rightAscensionDeg).toBeCloseTo(result.meanOfDateRightAscensionDeg, 10);
    expect(result.trail.samples).toHaveLength(73);
    expect(result.trail.durationMinutes).toBe(720);
    expect(result.warnings.some((warning) => warning.includes('Proper motion'))).toBe(true);
  });

  it('creates a persistence-friendly prediction snapshot', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-2',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        starId: 'hr-2491',
        trailDurationMinutes: 360,
        trailSampleIntervalMinutes: 15
      }
    });
    const prediction = createStellarObservationPrediction(result);
    expect(prediction.modelId).toBe(STELLAR_OBSERVATION_MODEL_ID);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarCatalogHrNumber')?.value).toBe(2491);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarTrailDurationMinutes')?.value).toBe(360);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarTrailSampleIntervalMinutes')?.value).toBe(15);
    expect(prediction.trace.summary).toContain('Sirius');
  });

  it('reopens settings from the prediction without a new top-level portable schema field', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-3',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings: {
        starId: 'hr-424',
        trailDurationMinutes: 1_440,
        trailSampleIntervalMinutes: 20
      }
    });
    expect(readStellarObservationSettings(createStellarObservationPrediction(result))).toEqual({
      starId: 'hr-424',
      trailDurationMinutes: 1_440,
      trailSampleIntervalMinutes: 20
    });
  });

  it('falls back safely for unrelated or malformed stored predictions', () => {
    expect(readStellarObservationSettings(undefined)).toEqual(DEFAULT_STELLAR_OBSERVATION_SETTINGS);
    const malformed: ModelPrediction = {
      modelId: STELLAR_OBSERVATION_MODEL_ID,
      experimentId: 'bad',
      status: 'compatible',
      metrics: [
        { key: 'stellarCatalogHrNumber', label: 'HR', value: 999999, unit: 'count' },
        { key: 'stellarTrailDurationMinutes', label: 'duration', value: -4, unit: 'min' },
        { key: 'stellarTrailSampleIntervalMinutes', label: 'interval', value: 0, unit: 'min' }
      ],
      warnings: [],
      traceId: 'bad',
      trace: { summary: 'bad', assumptions: [], steps: [] }
    };
    expect(readStellarObservationSettings(malformed)).toEqual(DEFAULT_STELLAR_OBSERVATION_SETTINGS);
  });

  it('rejects an unknown catalog star', () => {
    expect(() => calculateStellarObservation({
      experimentId: 'stellar-4',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings: { starId: 'missing', trailDurationMinutes: 60, trailSampleIntervalMinutes: 10 }
    })).toThrow(StellarObservationError);
  });
});
