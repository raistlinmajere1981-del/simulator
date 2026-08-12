import { describe, expect, it } from 'vitest';
import {
  PORTABLE_EXPERIMENT_SCHEMA_VERSION,
  PortableFormatError,
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import type { SavedStellarLocalHorizonSource } from '../src/shared/stellar-local-horizon-import';
import { savedExperimentFixture } from './portable.test';

const demSkylineSource: SavedStellarLocalHorizonSource = {
  fileName: 'istanbul-360.asc',
  importedAtIso: '2026-08-10T02:00:00.000Z',
  format: 'dem',
  pointCount: 4,
  maximumAzimuthGapDeg: 90,
  points: [
    { azimuthDeg: 0, altitudeDeg: 1.2 },
    { azimuthDeg: 90, altitudeDeg: 3.4 },
    { azimuthDeg: 180, altitudeDeg: 0.8 },
    { azimuthDeg: 270, altitudeDeg: 2.1 }
  ],
  warnings: ['Geometrik DEM skyline.'],
  fileSizeBytes: 10 * 1024 * 1024,
  sha256: 'c'.repeat(64),
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
    maximumDistanceM: 2_000,
    samplingMethod: 'bilinear',
    completeCoverage: true,
    completeRayCount: 4,
    coverageLimitedRayCount: 0,
    noDataAffectedRayCount: 0,
    noCoverageRayCount: 0,
    geodesicFallbackSampleCount: 0
  }
};

describe('portable v12 DEM skyline provenance', () => {
  it('round-trips a complete DEM-derived stellar skyline source', () => {
    const file = createPortableExperimentFile({
      ...savedExperimentFixture,
      scenarioId: 'stellar-observation',
      stellarLocalHorizonSource: demSkylineSource
    }, '1.19.0', '2026-08-10T02:10:00.000Z');
    const parsed = parsePortableExperimentFile(JSON.parse(JSON.stringify(file)));

    expect(file.schemaVersion).toBe(12);
    expect(PORTABLE_EXPERIMENT_SCHEMA_VERSION).toBe(12);
    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.stellarLocalHorizonSource).toEqual(demSkylineSource);
  });

  it('rejects DEM skyline provenance that no longer claims complete coverage', () => {
    const file = createPortableExperimentFile({
      ...savedExperimentFixture,
      scenarioId: 'stellar-observation',
      stellarLocalHorizonSource: demSkylineSource
    }, '1.19.0');
    const tampered = JSON.parse(JSON.stringify(file)) as {
      experiment: { stellarLocalHorizonSource: { demDerivation: { completeCoverage: boolean } } };
    };
    tampered.experiment.stellarLocalHorizonSource.demDerivation.completeCoverage = false;

    expect(() => parsePortableExperimentFile(tampered)).toThrow(PortableFormatError);
  });

  it('rejects a DEM format source without derivation metadata', () => {
    const file = createPortableExperimentFile({
      ...savedExperimentFixture,
      scenarioId: 'stellar-observation',
      stellarLocalHorizonSource: demSkylineSource
    }, '1.19.0');
    const tampered = JSON.parse(JSON.stringify(file)) as {
      experiment: { stellarLocalHorizonSource: { demDerivation?: unknown } };
    };
    delete tampered.experiment.stellarLocalHorizonSource.demDerivation;

    expect(() => parsePortableExperimentFile(tampered)).toThrow(PortableFormatError);
  });
});
