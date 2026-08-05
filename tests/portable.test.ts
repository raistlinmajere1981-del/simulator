import { describe, expect, it } from 'vitest';
import {
  LOCAL_EXPERIMENT_STORE_SCHEMA,
  PORTABLE_EXPERIMENT_SCHEMA,
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
    surfaceDistanceKm: 22.38,
    observedVisiblePercent: 52,
    observationUncertaintyPercent: 8,
    useStandardRefraction: true,
    refractionCoefficient: 0.13
  },
  modelVersions: {
    'ideal-sphere': '0.1.0'
  },
  predictions: [
    {
      modelId: 'ideal-sphere',
      experimentId: 'experiment-1',
      status: 'compatible',
      metrics: [
        {
          key: 'visibleFraction',
          label: 'Görünür oran',
          value: 0.5192,
          unit: 'fraction'
        }
      ],
      warnings: [],
      traceId: 'ideal-sphere:experiment-1:standard',
      trace: {
        summary: 'Küre görünürlük hesabı.',
        assumptions: ['Yüzey ideal küredir.'],
        steps: [
          {
            id: 'visible-ratio',
            title: 'Görünür hedef oranı',
            formula: 'f = H_visible / H',
            substitution: '7,788 / 15',
            result: '%51,92'
          }
        ]
      }
    }
  ]
};

describe('portable experiment format', () => {
  it('round-trips a current portable experiment file', () => {
    const file = createPortableExperimentFile(
      savedExperimentFixture,
      '0.3.0',
      '2026-08-05T13:00:00.000Z'
    );
    const parsed = parsePortableExperimentFile(
      JSON.parse(JSON.stringify(file)) as unknown
    );

    expect(file.schema).toBe(PORTABLE_EXPERIMENT_SCHEMA);
    expect(parsed.migrated).toBe(false);
    expect(parsed.sourceVersion).toBe(1);
    expect(parsed.experiment).toEqual(savedExperimentFixture);
  });

  it('accepts a legacy raw experiment and marks it migrated', () => {
    const parsed = parsePortableExperimentFile(savedExperimentFixture);

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(0);
    expect(parsed.experiment.name).toBe(savedExperimentFixture.name);
  });

  it('migrates the legacy local experiment array to a versioned store', () => {
    const parsed = parseLocalExperimentStore([
      savedExperimentFixture,
      { invalid: true }
    ]);

    expect(parsed.migrated).toBe(true);
    expect(parsed.ignoredRecordCount).toBe(1);
    expect(parsed.store.schema).toBe(LOCAL_EXPERIMENT_STORE_SCHEMA);
    expect(parsed.store.experiments).toHaveLength(1);
  });

  it('creates a current versioned local store', () => {
    const store = createLocalExperimentStore(
      [savedExperimentFixture],
      '2026-08-05T13:00:00.000Z'
    );
    const parsed = parseLocalExperimentStore(store);

    expect(parsed.migrated).toBe(false);
    expect(parsed.ignoredRecordCount).toBe(0);
    expect(parsed.store.experiments[0]?.id).toBe('experiment-1');
  });

  it('rejects an unsupported portable schema version', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.3.0');

    expect(() =>
      parsePortableExperimentFile({ ...file, schemaVersion: 99 })
    ).toThrow(PortableFormatError);
  });

  it('rejects out-of-range input values', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.3.0');
    const invalid = {
      ...file,
      experiment: {
        ...file.experiment,
        inputs: {
          ...file.experiment.inputs,
          observedVisiblePercent: 140
        }
      }
    };

    expect(() => parsePortableExperimentFile(invalid)).toThrow(
      'beklenen aralıkların dışında'
    );
  });
});
