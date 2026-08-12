import { describe, expect, it } from 'vitest';
import type { SavedExperiment } from '../src/shared/simulator';
import { DEFAULT_SIMULATOR_INPUTS } from '../src/shared/simulator';
import {
  PORTABLE_EXPERIMENT_SCHEMA,
  PORTABLE_EXPERIMENT_SCHEMA_VERSION,
  PortableFormatError,
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import type { SavedStellarLocalHorizonSource } from '../src/shared/stellar-local-horizon-import';

const source: SavedStellarLocalHorizonSource = {
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
  warnings: ['Kaynak örnek uyarısı'],
  fileSizeBytes: 128,
  sha256: 'b'.repeat(64),
  modifiedAfterImport: false
};

function experiment(): SavedExperiment {
  return {
    id: 'stellar-skyline-portable',
    name: 'Skyline portable test',
    createdAtIso: '2026-08-09T20:00:00.000Z',
    updatedAtIso: '2026-08-09T20:00:00.000Z',
    observedAtIso: '2026-08-09T20:00:00.000Z',
    observationUtcOffsetMinutes: 180,
    scenarioId: 'stellar-observation',
    stellarLocalHorizonSource: source,
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    manualTerrainPoints: [],
    modelVersions: {},
    predictions: []
  };
}

describe('stellar skyline portable v12', () => {
  it('round-trips a validated external skyline source without requiring DEM provenance', () => {
    const portable = createPortableExperimentFile(experiment(), '1.19.0', '2026-08-09T21:00:00.000Z');
    expect(portable.schemaVersion).toBe(12);
    expect(PORTABLE_EXPERIMENT_SCHEMA_VERSION).toBe(12);
    const parsed = parsePortableExperimentFile(portable);
    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.stellarLocalHorizonSource).toEqual(source);
  });

  it('rejects a source whose pointCount does not match its points', () => {
    const portable = createPortableExperimentFile(experiment(), '1.19.0');
    const tampered = structuredClone(portable) as unknown as Record<string, unknown>;
    const record = (tampered.experiment as Record<string, unknown>).stellarLocalHorizonSource as Record<string, unknown>;
    record.pointCount = 5;
    expect(() => parsePortableExperimentFile(tampered)).toThrow(PortableFormatError);
  });

  it('rejects invalid source integrity metadata', () => {
    const portable = createPortableExperimentFile(experiment(), '1.19.0');
    const tampered = structuredClone(portable) as unknown as Record<string, unknown>;
    const record = (tampered.experiment as Record<string, unknown>).stellarLocalHorizonSource as Record<string, unknown>;
    record.sha256 = 'not-a-sha';
    expect(() => parsePortableExperimentFile(tampered)).toThrow(PortableFormatError);
  });

  it('rejects a mismatched maximum azimuth gap instead of trusting stored metadata', () => {
    const portable = createPortableExperimentFile(experiment(), '1.19.0');
    const tampered = structuredClone(portable) as unknown as Record<string, unknown>;
    const record = (tampered.experiment as Record<string, unknown>).stellarLocalHorizonSource as Record<string, unknown>;
    record.maximumAzimuthGapDeg = 45;
    expect(() => parsePortableExperimentFile(tampered)).toThrow(PortableFormatError);
  });

  it('continues to accept a schema-v7 record with no skyline source', () => {
    const legacyExperiment = experiment();
    delete legacyExperiment.stellarLocalHorizonSource;
    const legacy = {
      schema: PORTABLE_EXPERIMENT_SCHEMA,
      schemaVersion: 7,
      exportedAtIso: '2026-08-09T21:00:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '1.14.0' },
      experiment: legacyExperiment
    };
    const parsed = parsePortableExperimentFile(legacy);
    expect(parsed.sourceVersion).toBe(7);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.stellarLocalHorizonSource).toBeUndefined();
  });
});
