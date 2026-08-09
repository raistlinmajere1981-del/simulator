import { describe, expect, it } from 'vitest';
import type { ModelPrediction } from '../src/shared/domain';
import type { SavedStellarLocalHorizonSource } from '../src/shared/stellar-local-horizon-import';
import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  calculateStellarObservation,
  createStellarObservationPrediction,
  readStellarObservationSettings,
  StellarObservationError
} from '../src/simulation/stellar-observation';

const externalSkyline: SavedStellarLocalHorizonSource = {
  fileName: 'ridge.csv',
  importedAtIso: '2026-08-09T20:00:00.000Z',
  format: 'csv',
  pointCount: 4,
  maximumAzimuthGapDeg: 90,
  points: [
    { azimuthDeg: 0, altitudeDeg: 2 },
    { azimuthDeg: 90, altitudeDeg: 12 },
    { azimuthDeg: 180, altitudeDeg: 4 },
    { azimuthDeg: 270, altitudeDeg: 8 }
  ],
  warnings: [],
  fileSizeBytes: 128,
  sha256: 'a'.repeat(64),
  modifiedAfterImport: false
};

describe('stellar observation', () => {
  it('resolves catalog → precession → local position → trail as one reference result', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-1',
      observedAtIso: '2026-08-09T20:00:00+03:00',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        starId: 'hr-7001',
        trailDurationMinutes: 720,
        trailSampleIntervalMinutes: 10
      }
    });
    expect(result.star.commonName).toBe('Vega');
    expect(result.meanOfDateRightAscensionDeg).not.toBe(result.sourceRightAscensionJ2000Deg);
    expect(result.position.rightAscensionDeg).toBeCloseTo(result.meanOfDateRightAscensionDeg, 10);
    expect(result.trail.samples).toHaveLength(73);
    expect(result.apparentTrailSamples).toHaveLength(result.trail.samples.length);
    expect(result.apparentTrailSamples[0]?.geometricAltitudeDeg).toBeCloseTo(result.trail.samples[0]!.elevationDeg, 12);
    expect(result.apparentDiagnostic.refraction.apparentAltitudeDeg).toBeGreaterThanOrEqual(result.position.elevationDeg);
    expect(result.trace.steps.some((step) => step.id === 'standard-refraction-diagnostic')).toBe(true);
    expect(result.trail.durationMinutes).toBe(720);
    expect(result.localHorizonTrail).toBeNull();
    expect(result.warnings.some((warning) => warning.includes('Proper motion'))).toBe(true);
  });

  it('applies the optional eight-direction local skyline without replacing the 0° trail', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-local-horizon',
      observedAtIso: '2000-01-01T12:00:00.000Z',
      latitudeDeg: 0,
      longitudeDeg: 0,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        starId: 'hr-7001',
        trailDurationMinutes: 180,
        trailSampleIntervalMinutes: 30,
        localHorizonEnabled: true,
        localHorizonNorthDeg: 4,
        localHorizonNorthEastDeg: 6,
        localHorizonEastDeg: 8,
        localHorizonSouthEastDeg: 10,
        localHorizonSouthDeg: 12,
        localHorizonSouthWestDeg: 10,
        localHorizonWestDeg: 8,
        localHorizonNorthWestDeg: 6
      }
    });

    expect(result.localHorizonTrail).not.toBeNull();
    expect(result.localHorizonTrail?.maskPointCount).toBe(8);
    expect(result.localHorizonTrail?.maskMaximumAzimuthGapDeg).toBeCloseTo(45, 10);
    expect(result.localHorizonSource?.mode).toBe('manual');
    expect(result.trail.samples).toHaveLength(7);
    expect(result.apparentTrailSamples).toHaveLength(7);
    expect(result.localHorizonTrail?.samples).toHaveLength(7);
    expect(result.apparentDiagnostic.localVisibilityClassified).toBe(false);
    expect(result.trace.steps.some((step) => step.id.startsWith('local-local-horizon-mask'))).toBe(true);
  });

  it('applies a validated external skyline and preserves source provenance', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-external-horizon',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        localHorizonEnabled: true,
        localHorizonSourceMode: 'external',
        trailDurationMinutes: 180,
        trailSampleIntervalMinutes: 30
      },
      externalLocalHorizonSource: externalSkyline
    });
    expect(result.localHorizonTrail?.maskPointCount).toBe(4);
    expect(result.localHorizonSource).toMatchObject({
      mode: 'external',
      fileName: 'ridge.csv',
      pointCount: 4,
      maximumAzimuthGapDeg: 90,
      sha256: 'a'.repeat(64)
    });
    expect(result.warnings.some((warning) => warning.includes('ridge.csv'))).toBe(true);
    expect(result.trace.steps.find((step) => step.id === 'local-source')?.substitution).toContain('SHA-256');
    expect(result.apparentDiagnostic.localComparisonKind).toBe('mixed-reference-diagnostic');
    expect(result.apparentDiagnostic.starOnlyApparentMinusGeometricSkylineDeg).not.toBeNull();
    expect(result.apparentDiagnostic.localVisibilityClassified).toBe(false);
    const prediction = createStellarObservationPrediction(result);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonSourceExternal')?.value).toBe(1);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonPointCount')?.value).toBe(4);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarApparentElevationDeg')?.value).toBeCloseTo(result.apparentDiagnostic.refraction.apparentAltitudeDeg, 12);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalApparentVisibilityClassified')?.value).toBe(0);
  });

  it('rejects external mode without a validated external source', () => {
    expect(() => calculateStellarObservation({
      experimentId: 'stellar-external-missing',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        localHorizonEnabled: true,
        localHorizonSourceMode: 'external'
      }
    })).toThrow('doğrulanmış skyline dosyası');
  });

  it('creates a persistence-friendly prediction snapshot', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-2',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        starId: 'hr-2491',
        trailDurationMinutes: 360,
        trailSampleIntervalMinutes: 15,
        localHorizonEnabled: true,
        localHorizonEastDeg: 7.5,
        localHorizonWestDeg: 3.25
      }
    });
    const prediction = createStellarObservationPrediction(result);
    expect(prediction.modelId).toBe(STELLAR_OBSERVATION_MODEL_ID);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarCatalogHrNumber')?.value).toBe(2491);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarTrailDurationMinutes')?.value).toBe(360);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarTrailSampleIntervalMinutes')?.value).toBe(15);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonEnabled')?.value).toBe(1);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonSourceExternal')?.value).toBe(0);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonEastDeg')?.value).toBe(7.5);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonWestDeg')?.value).toBe(3.25);
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalHorizonVisibleDurationMinutes')).toBeDefined();
    expect(prediction.metrics.find((metric) => metric.key === 'stellarStandardRefractionCorrectionArcmin')).toBeDefined();
    expect(prediction.metrics.find((metric) => metric.key === 'stellarLocalApparentVisibilityClassified')?.value).toBe(0);
    expect(prediction.trace.summary).toContain('Sirius');
  });

  it('reopens star, trail and local skyline settings from the prediction', () => {
    const settings = {
      ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
      starId: 'hr-0424',
      trailDurationMinutes: 1_440,
      trailSampleIntervalMinutes: 20,
      localHorizonEnabled: true,
      localHorizonNorthDeg: 1,
      localHorizonNorthEastDeg: 2,
      localHorizonEastDeg: 3,
      localHorizonSouthEastDeg: 4,
      localHorizonSouthDeg: 5,
      localHorizonSouthWestDeg: 6,
      localHorizonWestDeg: 7,
      localHorizonNorthWestDeg: 8
    };
    const result = calculateStellarObservation({
      experimentId: 'stellar-3',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings
    });
    expect(readStellarObservationSettings(createStellarObservationPrediction(result))).toEqual(settings);
  });

  it('reopens external source mode from the prediction', () => {
    const result = calculateStellarObservation({
      experimentId: 'stellar-external-reopen',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        localHorizonEnabled: true,
        localHorizonSourceMode: 'external'
      },
      externalLocalHorizonSource: externalSkyline
    });
    expect(readStellarObservationSettings(createStellarObservationPrediction(result)).localHorizonSourceMode).toBe('external');
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
        { key: 'stellarTrailSampleIntervalMinutes', label: 'interval', value: 0, unit: 'min' },
        { key: 'stellarLocalHorizonEnabled', label: 'local', value: 1, unit: 'boolean' },
        { key: 'stellarLocalHorizonEastDeg', label: 'east', value: 500, unit: 'deg' }
      ],
      warnings: [],
      traceId: 'bad',
      trace: { summary: 'bad', assumptions: [], steps: [] }
    };
    expect(readStellarObservationSettings(malformed)).toEqual({
      ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
      localHorizonEnabled: true
    });
  });

  it('normalizes legacy settings that predate local-horizon fields', () => {
    const legacySettings = {
      starId: 'hr-2491',
      trailDurationMinutes: 180,
      trailSampleIntervalMinutes: 30
    } as typeof DEFAULT_STELLAR_OBSERVATION_SETTINGS;
    const result = calculateStellarObservation({
      experimentId: 'stellar-legacy',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings: legacySettings
    });
    expect(result.settings.localHorizonEnabled).toBe(false);
    expect(result.settings.localHorizonSourceMode).toBe('manual');
    expect(result.settings.localHorizonEastDeg).toBe(0);
    expect(result.localHorizonTrail).toBeNull();
    expect(result.apparentDiagnostic.localComparisonKind).toBe('no-local-skyline');
  });

  it('rejects an unknown catalog star or invalid local-horizon altitude', () => {
    expect(() => calculateStellarObservation({
      experimentId: 'stellar-4',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings: { ...DEFAULT_STELLAR_OBSERVATION_SETTINGS, starId: 'missing' }
    })).toThrow(StellarObservationError);

    expect(() => calculateStellarObservation({
      experimentId: 'stellar-5',
      observedAtIso: '2026-08-09T17:00:00Z',
      latitudeDeg: 41,
      longitudeDeg: 29,
      settings: { ...DEFAULT_STELLAR_OBSERVATION_SETTINGS, localHorizonEastDeg: 91 }
    })).toThrow(StellarObservationError);
  });
});
