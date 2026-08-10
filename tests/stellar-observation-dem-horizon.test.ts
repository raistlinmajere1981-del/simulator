import { describe, expect, it } from 'vitest';
import type { SavedStellarLocalHorizonSource } from '../src/shared/stellar-local-horizon-import';
import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  calculateStellarObservation,
  createStellarObservationPrediction
} from '../src/simulation/stellar-observation';

const demSkyline: SavedStellarLocalHorizonSource = {
  fileName: 'derived.asc',
  importedAtIso: '2026-08-10T02:00:00.000Z',
  format: 'dem',
  pointCount: 4,
  maximumAzimuthGapDeg: 90,
  points: [
    { azimuthDeg: 0, altitudeDeg: 2 },
    { azimuthDeg: 90, altitudeDeg: 12 },
    { azimuthDeg: 180, altitudeDeg: 4 },
    { azimuthDeg: 270, altitudeDeg: 8 }
  ],
  warnings: ['Geometrik DEM skyline.'],
  fileSizeBytes: 1_024,
  sha256: 'e'.repeat(64),
  modifiedAfterImport: false,
  demDerivation: {
    algorithmId: 'dem-skyline-wgs84-topocentric',
    algorithmVersion: '0.1.0',
    observerLatitudeDeg: 41.0082,
    observerLongitudeDeg: 28.9784,
    observerHeightM: 10,
    heightDatumToEllipsoidOffsetM: 0,
    azimuthStepDeg: 90,
    distanceStepM: 500,
    maximumDistanceM: 20_000,
    samplingMethod: 'bilinear',
    completeCoverage: true,
    completeRayCount: 4,
    coverageLimitedRayCount: 0,
    noDataAffectedRayCount: 0,
    noCoverageRayCount: 0,
    geodesicFallbackSampleCount: 0
  }
};

describe('stellar observation with DEM-derived skyline', () => {
  it('uses the existing local-horizon engine while preserving derived-source provenance', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-dem-horizon',
      observedAtIso: '2026-08-10T00:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        localHorizonEnabled: true,
        localHorizonSourceMode: 'external',
        trailDurationMinutes: 180,
        trailSampleIntervalMinutes: 30
      },
      externalLocalHorizonSource: demSkyline
    });

    expect(result.localHorizonTrail?.maskPointCount).toBe(4);
    expect(result.localHorizonSource).toMatchObject({
      mode: 'external',
      format: 'dem',
      fileName: 'derived.asc',
      pointCount: 4,
      sha256: 'e'.repeat(64),
      demDerivation: {
        algorithmId: 'dem-skyline-wgs84-topocentric',
        completeCoverage: true
      }
    });
    expect(result.warnings.some((warning) => warning.includes("DEM'den türetilmiş geometrik skyline"))).toBe(true);
    expect(result.trace.steps.find((step) => step.id === 'local-source')?.substitution).toContain('derived');

    const prediction = createStellarObservationPrediction(result);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonSourceExternal')?.value).toBe(1);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonPointCount')?.value).toBe(4);
  });
});
