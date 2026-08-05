import { describe, expect, it } from 'vitest';
import {
  LOCAL_EXPERIMENT_STORE_SCHEMA,
  PORTABLE_EXPERIMENT_SCHEMA,
  PORTABLE_EXPERIMENT_SCHEMA_VERSION,
  PortableFormatError,
  createLocalExperimentStore,
  createPortableExperimentFile,
  parseLocalExperimentStore,
  parsePortableExperimentFile
} from '../src/shared/portable';
import type { SavedExperiment } from '../src/shared/simulator';

export const savedExperimentFixture: SavedExperiment = {
  id: 'experiment-1',
  name: 'Kıyı görünürlük deneyi',
  createdAtIso: '2026-08-05T12:00:00.000Z',
  updatedAtIso: '2026-08-05T12:10:00.000Z',
  inputs: {
    observerHeightM: 10,
    targetHeightM: 15,
    distanceSource: 'coordinates',
    surfaceDistanceKm: 22.38,
    observerLatitudeDeg: 41.0082,
    observerLongitudeDeg: 28.9784,
    targetLatitudeDeg: 41.18,
    targetLongitudeDeg: 29.12,
    observedVisiblePercent: 52,
    observationUncertaintyPercent: 8,
    useStandardRefraction: true,
    refractionCoefficient: 0.13
  },
  geodesic: {
    method: 'vincenty',
    converged: true,
    iterations: 5,
    distanceM: 22_500,
    initialBearingDeg: 31.2,
    finalBearingDeg: 31.3,
    warnings: [],
    traceId: 'wgs84:fixture',
    trace: {
      summary: 'WGS84 ters jeodezik hesabı.',
      assumptions: ['Referans elipsoidi WGS84’tür.'],
      steps: [{
        id: 'distance',
        title: 'Mesafe',
        formula: 's = b · A · (σ − Δσ)',
        substitution: 'örnek',
        result: '22500 m'
      }]
    }
  },
  modelVersions: {
    'ideal-sphere': '0.1.0'
  },
  predictions: [
    {
      modelId: 'ideal-sphere',
      experimentId: 'experiment-1',
      status: 'compatible',
      metrics: [{
        key: 'visibleFraction',
        label: 'Görünür oran',
        value: 0.5192,
        unit: 'fraction'
      }],
      warnings: [],
      traceId: 'ideal-sphere:experiment-1:standard',
      trace: {
        summary: 'Küre görünürlük hesabı.',
        assumptions: ['Yüzey ideal küredir.'],
        steps: [{
          id: 'visible-ratio',
          title: 'Görünür hedef oranı',
          formula: 'f = H_visible / H',
          substitution: '7,788 / 15',
          result: '%51,92'
        }]
      }
    }
  ]
};

function legacyExperiment(): Record<string, unknown> {
  const { distanceSource, observerLatitudeDeg, observerLongitudeDeg,
    targetLatitudeDeg, targetLongitudeDeg, ...legacyInputs } = savedExperimentFixture.inputs;
  return {
    ...savedExperimentFixture,
    inputs: legacyInputs,
    geodesic: undefined
  };
}

describe('portable experiment format', () => {
  it('round-trips a current portable experiment file', () => {
    const file = createPortableExperimentFile(
      savedExperimentFixture,
      '0.4.0',
      '2026-08-05T13:00:00.000Z'
    );
    const parsed = parsePortableExperimentFile(
      JSON.parse(JSON.stringify(file)) as unknown
    );

    expect(file.schema).toBe(PORTABLE_EXPERIMENT_SCHEMA);
    expect(file.schemaVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
    expect(parsed.migrated).toBe(false);
    expect(parsed.sourceVersion).toBe(2);
    expect(parsed.experiment).toEqual(savedExperimentFixture);
  });

  it('migrates a version 1 portable file to manual distance mode', () => {
    const parsed = parsePortableExperimentFile({
      schema: PORTABLE_EXPERIMENT_SCHEMA,
      schemaVersion: 1,
      exportedAtIso: '2026-08-05T13:00:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '0.3.0' },
      experiment: legacyExperiment()
    });

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(1);
    expect(parsed.experiment.inputs.distanceSource).toBe('manual');
    expect(parsed.experiment.inputs.observerLatitudeDeg).toBeCloseTo(41.0082);
  });

  it('accepts a legacy raw experiment and marks it migrated', () => {
    const parsed = parsePortableExperimentFile(legacyExperiment());

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(0);
    expect(parsed.experiment.inputs.distanceSource).toBe('manual');
  });

  it('migrates the legacy local experiment array to a versioned store', () => {
    const parsed = parseLocalExperimentStore([legacyExperiment(), { invalid: true }]);

    expect(parsed.migrated).toBe(true);
    expect(parsed.ignoredRecordCount).toBe(1);
    expect(parsed.store.schema).toBe(LOCAL_EXPERIMENT_STORE_SCHEMA);
    expect(parsed.store.schemaVersion).toBe(2);
    expect(parsed.store.experiments[0]?.inputs.distanceSource).toBe('manual');
  });

  it('creates a current versioned local store', () => {
    const store = createLocalExperimentStore(
      [savedExperimentFixture],
      '2026-08-05T13:00:00.000Z'
    );
    const parsed = parseLocalExperimentStore(store);

    expect(parsed.migrated).toBe(false);
    expect(parsed.ignoredRecordCount).toBe(0);
    expect(parsed.store.experiments[0]?.geodesic?.method).toBe('vincenty');
  });

  it('rejects an unsupported portable schema version', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.4.0');
    expect(() => parsePortableExperimentFile({ ...file, schemaVersion: 99 }))
      .toThrow(PortableFormatError);
  });

  it('rejects out-of-range coordinates', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.4.0');
    const invalid = {
      ...file,
      experiment: {
        ...file.experiment,
        inputs: { ...file.experiment.inputs, observerLatitudeDeg: 140 }
      }
    };

    expect(() => parsePortableExperimentFile(invalid)).toThrow(
      'beklenen aralıkların dışında'
    );
  });
});
