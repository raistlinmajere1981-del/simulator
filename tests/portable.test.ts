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
    observerGroundElevationM: 2.4,
    targetGroundElevationM: 1.1,
    verticalDatumKind: 'orthometric-msl',
    verticalDatumOffsetM: 0.35,
    terrainMode: 'manual-three-point',
    terrainIntermediateDistancePercent: 50,
    terrainIntermediateElevationM: 8.5,
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
  manualTerrainPoints: [
    { id: 'ridge-west', distancePercent: 25, elevationM: 8 },
    { id: 'ridge-centre', distancePercent: 50, elevationM: 8.5 },
    { id: 'ridge-east', distancePercent: 75, elevationM: 4 }
  ],
  terrainProfileSource: {
    kind: 'csv',
    fileName: 'terrain-profile.csv',
    importedAtIso: '2026-08-05T12:05:00.000Z',
    delimiter: 'comma',
    distanceUnit: 'percent',
    sourceDistanceM: null,
    rowCount: 5,
    observerEndpointElevationM: 2.4,
    targetEndpointElevationM: 1.1,
    appliedObserverEndpoint: true,
    appliedTargetEndpoint: true,
    distanceColumnHeader: 'distance_percent',
    elevationColumnHeader: 'elevation_m',
    appliedRouteDistance: false,
    modifiedAfterImport: false
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
    'ideal-sphere': '0.3.0'
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

function version4Experiment(): Record<string, unknown> {
  const { terrainProfileSource, ...version4 } = savedExperimentFixture;
  return version4;
}

function version3Experiment(): Record<string, unknown> {
  const { manualTerrainPoints, ...version3 } = version4Experiment();
  return version3;
}

function version2Experiment(): Record<string, unknown> {
  const version3 = version3Experiment();
  const {
    observerGroundElevationM,
    targetGroundElevationM,
    verticalDatumKind,
    verticalDatumOffsetM,
    terrainMode,
    terrainIntermediateDistancePercent,
    terrainIntermediateElevationM,
    ...version2Inputs
  } = version3.inputs as Record<string, unknown>;
  return { ...version3, inputs: version2Inputs };
}

function legacyExperiment(): Record<string, unknown> {
  const {
    distanceSource,
    observerLatitudeDeg,
    observerLongitudeDeg,
    targetLatitudeDeg,
    targetLongitudeDeg,
    ...legacyInputs
  } = version2Experiment().inputs as Record<string, unknown>;
  return {
    ...version2Experiment(),
    inputs: legacyInputs,
    geodesic: undefined
  };
}

describe('portable experiment format', () => {
  it('round-trips a current experiment with CSV terrain provenance', () => {
    const file = createPortableExperimentFile(
      savedExperimentFixture,
      '0.8.0',
      '2026-08-05T13:00:00.000Z'
    );
    const parsed = parsePortableExperimentFile(
      JSON.parse(JSON.stringify(file)) as unknown
    );

    expect(file.schema).toBe(PORTABLE_EXPERIMENT_SCHEMA);
    expect(file.schemaVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
    expect(parsed.migrated).toBe(false);
    expect(parsed.sourceVersion).toBe(6);
    expect(parsed.experiment).toEqual(savedExperimentFixture);
    expect(parsed.experiment.terrainProfileSource?.fileName)
      .toBe('terrain-profile.csv');
  });

  it('round-trips GeoJSON terrain provenance', () => {
  const geoJsonSource = {
    kind: 'geojson' as const,
    fileName: 'route.geojson',
    importedAtIso: '2026-08-05T12:06:00.000Z',
    sourceDistanceM: 12_345,
    observerEndpointElevationM: 4,
    targetEndpointElevationM: 5,
    appliedObserverEndpoint: true,
    appliedTargetEndpoint: true,
    appliedRouteDistance: true,
    modifiedAfterImport: false,
    geometryType: 'LineString' as const,
    coordinateCount: 6,
    startLongitudeDeg: 28.9784,
    startLatitudeDeg: 41.0082,
    endLongitudeDeg: 29.06,
    endLatitudeDeg: 41.058,
    elevationSource: 'coordinate-z' as const
  };
  const file = createPortableExperimentFile({
    ...savedExperimentFixture,
    terrainProfileSource: geoJsonSource
  }, '0.9.0');
  const parsed = parsePortableExperimentFile(file);

  expect(parsed.migrated).toBe(false);
  expect(parsed.experiment.terrainProfileSource).toEqual(geoJsonSource);
});

  it('migrates a version 5 CSV source and defaults route application metadata', () => {
    const legacySource = { ...savedExperimentFixture.terrainProfileSource } as Record<string, unknown>;
    delete legacySource.appliedRouteDistance;
    const parsed = parsePortableExperimentFile({
      schema: PORTABLE_EXPERIMENT_SCHEMA,
      schemaVersion: 5,
      exportedAtIso: '2026-08-05T13:00:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '0.8.0' },
      experiment: { ...savedExperimentFixture, terrainProfileSource: legacySource }
    });

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(5);
    expect(parsed.experiment.terrainProfileSource?.appliedRouteDistance).toBe(false);
  });

it('migrates a version 4 experiment without inventing CSV provenance', () => {
    const parsed = parsePortableExperimentFile({
      schema: PORTABLE_EXPERIMENT_SCHEMA,
      schemaVersion: 4,
      exportedAtIso: '2026-08-05T13:00:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '0.7.0' },
      experiment: version4Experiment()
    });

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(4);
    expect(parsed.experiment.manualTerrainPoints).toHaveLength(3);
    expect(parsed.experiment.terrainProfileSource).toBeUndefined();
  });

  it('migrates a version 3 single point into an ordered point array', () => {
    const parsed = parsePortableExperimentFile({
      schema: PORTABLE_EXPERIMENT_SCHEMA,
      schemaVersion: 3,
      exportedAtIso: '2026-08-05T13:00:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '0.5.0' },
      experiment: version3Experiment()
    });

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(3);
    expect(parsed.experiment.manualTerrainPoints).toEqual([{
      id: 'legacy-intermediate-1',
      distancePercent: 50,
      elevationM: 8.5
    }]);
    expect(parsed.experiment.terrainProfileSource).toBeUndefined();
  });

  it('migrates a version 2 file with safe vertical defaults', () => {
    const parsed = parsePortableExperimentFile({
      schema: PORTABLE_EXPERIMENT_SCHEMA,
      schemaVersion: 2,
      exportedAtIso: '2026-08-05T13:00:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '0.4.0' },
      experiment: version2Experiment()
    });

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(2);
    expect(parsed.experiment.inputs.verticalDatumKind).toBe('orthometric-msl');
    expect(parsed.experiment.inputs.terrainMode).toBe('off');
    expect(parsed.experiment.inputs.observerGroundElevationM).toBe(0);
    expect(parsed.experiment.manualTerrainPoints).toHaveLength(1);
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
    expect(parsed.experiment.inputs.terrainMode).toBe('off');
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
    expect(parsed.store.schemaVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
    expect(parsed.store.experiments[0]?.inputs.distanceSource).toBe('manual');
    expect(parsed.store.experiments[0]?.manualTerrainPoints).toHaveLength(1);
  });

  it('creates a current versioned local store with provenance', () => {
    const store = createLocalExperimentStore(
      [savedExperimentFixture],
      '2026-08-05T13:00:00.000Z'
    );
    const parsed = parseLocalExperimentStore(store);

    expect(parsed.migrated).toBe(false);
    expect(parsed.ignoredRecordCount).toBe(0);
    expect(parsed.store.schemaVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
    expect(parsed.store.experiments[0]?.geodesic?.method).toBe('vincenty');
    expect(parsed.store.experiments[0]?.manualTerrainPoints).toHaveLength(3);
    expect(parsed.store.experiments[0]?.terrainProfileSource)
      .toEqual(savedExperimentFixture.terrainProfileSource);
  });

  it('normalizes multi-point order during storage', () => {
    const store = createLocalExperimentStore([{
      ...savedExperimentFixture,
      manualTerrainPoints: [
        { id: 'late', distancePercent: 80, elevationM: 2 },
        { id: 'early', distancePercent: 20, elevationM: 5 }
      ]
    }]);

    expect(store.experiments[0]?.manualTerrainPoints?.map((point) => point.id))
      .toEqual(['early', 'late']);
  });

  it('rejects invalid CSV provenance', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    const invalid = {
      ...file,
      experiment: {
        ...file.experiment,
        terrainProfileSource: {
          ...file.experiment.terrainProfileSource,
          distanceUnit: 'yards'
        }
      }
    };

    expect(() => parsePortableExperimentFile(invalid)).toThrow(
      'beklenen aralıkların dışında'
    );
  });

  it('rejects an unsupported portable schema version', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    expect(() => parsePortableExperimentFile({ ...file, schemaVersion: 99 }))
      .toThrow(PortableFormatError);
  });

  it('rejects out-of-range coordinates', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
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

  it('rejects an invalid legacy terrain sample position', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    const invalid = {
      ...file,
      experiment: {
        ...file.experiment,
        inputs: { ...file.experiment.inputs, terrainIntermediateDistancePercent: 100 }
      }
    };

    expect(() => parsePortableExperimentFile(invalid)).toThrow(
      'beklenen aralıkların dışında'
    );
  });

  it('rejects duplicate multi-point positions', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    const invalid = {
      ...file,
      experiment: {
        ...file.experiment,
        manualTerrainPoints: [
          { id: 'a', distancePercent: 40, elevationM: 2 },
          { id: 'b', distancePercent: 40, elevationM: 3 }
        ]
      }
    };

    expect(() => parsePortableExperimentFile(invalid)).toThrow(
      'beklenen aralıkların dışında'
    );
  });
});
