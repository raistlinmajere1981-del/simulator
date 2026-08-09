import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  calculateStellarObservation,
  createStellarObservationPrediction
} from '../src/simulation/stellar-observation';

describe('stellar sky snapshot observation integration', () => {
  it('keeps the selected star position identical to its entry in the multi-star snapshot', () => {
    const result = calculateStellarObservation({
      experimentId: 'sky-selected-star',
      observedAtIso: '2026-08-10T00:00:00.000Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        starId: 'hr-7001',
        trailDurationMinutes: 180,
        trailSampleIntervalMinutes: 30
      }
    });

    expect(result.skySnapshot.starCount).toBe(19);
    const selected = result.skySnapshot.stars.find((star) => star.starId === result.star.id);
    expect(selected).toBeDefined();
    expect(selected?.elevationDeg).toBeCloseTo(result.position.elevationDeg, 12);
    expect(selected?.azimuthDeg).toBeCloseTo(result.position.azimuthDeg!, 12);
    expect(result.trace.steps.some((step) => step.id === 'sky-snapshot-summary')).toBe(true);
  });

  it('applies the same local skyline to the multi-star snapshot without optical classification', () => {
    const result = calculateStellarObservation({
      experimentId: 'sky-local-horizon',
      observedAtIso: '2026-08-10T00:00:00.000Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        localHorizonEnabled: true,
        localHorizonNorthDeg: 4,
        localHorizonNorthEastDeg: 8,
        localHorizonEastDeg: 12,
        localHorizonSouthEastDeg: 9,
        localHorizonSouthDeg: 5,
        localHorizonSouthWestDeg: 3,
        localHorizonWestDeg: 7,
        localHorizonNorthWestDeg: 6,
        trailDurationMinutes: 180,
        trailSampleIntervalMinutes: 30
      }
    });

    expect(result.skySnapshot.localHorizonApplied).toBe(true);
    expect(result.skySnapshot.localHorizonCounts).not.toBeNull();
    const counts = result.skySnapshot.localHorizonCounts!;
    expect(counts.above + counts.onHorizon + counts.below + counts.undefinedAzimuth).toBe(19);
    expect(result.skySnapshot.warnings.some((warning) => warning.includes('optik görünür yıldız listesi değildir'))).toBe(true);
  });

  it('persists only compact multi-star aggregate metrics in the prediction snapshot', () => {
    const result = calculateStellarObservation({
      experimentId: 'sky-prediction',
      observedAtIso: '2026-08-10T00:00:00.000Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        localHorizonEnabled: true,
        trailDurationMinutes: 180,
        trailSampleIntervalMinutes: 30
      }
    });
    const prediction = createStellarObservationPrediction(result);
    const metric = (key: string) => prediction.metrics.find((item) => item.key === key)?.value;

    expect(metric('stellarSkySnapshotStarCount')).toBe(19);
    expect(metric('stellarSkySnapshotGeometricAboveCount')).toBe(result.skySnapshot.aboveGeometricHorizonCount);
    expect(metric('stellarSkySnapshotLocalAboveCount')).toBe(result.skySnapshot.localHorizonCounts?.above);
    expect(prediction.metrics.some((item) => item.key.includes('skySnapshotStars'))).toBe(false);
  });
});
