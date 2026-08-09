import { describe, expect, it } from 'vitest';
import {
  LOCAL_EXPERIMENT_STORE_SCHEMA,
  LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION,
  PORTABLE_EXPERIMENT_SCHEMA,
  PORTABLE_EXPERIMENT_SCHEMA_VERSION,
  PortableFormatError,
  createLocalExperimentStore,
  createPortableExperimentFile,
  parseLocalExperimentStore,
  parsePortableExperimentFile
} from '../src/shared/portable';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

export const savedExperimentFixture: SavedExperiment = {
  id: 'experiment-1',
  name: 'Kıyı görünürlük deneyi',
  createdAtIso: '2026-08-05T12:00:00.000Z',
  updatedAtIso: '2026-08-05T12:10:00.000Z',
  inputs: {
    ...DEFAULT_SIMULATOR_INPUTS,
    observerHeightM: 10,
    targetHeightM: 15,
    observerGroundElevationM: 2.4,
    targetGroundElevationM: 1.1,
    verticalDatumKind: 'orthometric-msl',
    verticalDatumOffsetM: 0.35,
    terrainMode: 'manual-points',
    distanceSource: 'coordinates',
    surfaceDistanceKm: 22.5,
    observedVisiblePercent: 52,
    observationUncertaintyPercent: 8,
    useStandardRefraction: true,
    refractionCoefficient: 0.13
  },
  manualTerrainPoints: [
    { id: 'point-a', distancePercent: 25, elevationM: 8 },
    { id: 'point-b', distancePercent: 50, elevationM: 8.5 },
    { id: 'point-c', distancePercent: 75, elevationM: 4 }
  ],
  terrainProfileSource: {
    kind: 'csv',
    fileName: 'terrain-profile.csv',
    importedAtIso: '2026-08-05T12:05:00.000Z',
    sourceDistanceM: null,
    observerEndpointElevationM: 2.4,
    targetEndpointElevationM: 1.1,
    appliedObserverEndpoint: true,
    appliedTargetEndpoint: true,
    appliedRouteDistance: false,
    fileSizeBytes: 128,
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    modifiedAfterImport: false,
    delimiter: 'comma',
    distanceUnit: 'percent',
    rowCount: 5,
    distanceColumnHeader: 'distance_percent',
    elevationColumnHeader: 'elevation_m'
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
  predictions: [{
    modelId: 'ideal-sphere',
    experimentId: 'experiment-1',
    status: 'compatible',
    metrics: [{ key: 'visiblePercent', label: 'Görünür oran', value: 51.92, unit: '%' }],
    warnings: ['Yüzey ideal küredir.'],
    traceId: 'ideal-sphere:experiment-1:standard',
    trace: {
      summary: 'Küre görünürlük hesabı.',
      assumptions: ['Yüzey ideal küredir.'],
      steps: [{
        id: 'visible-percent',
        title: 'Görünür hedef oranı',
        formula: 'f = H_visible / H',
        substitution: '7,788 / 15',
        result: '%51,92'
      }]
    }
  }]
};

function version2Experiment(): Record<string, unknown> {
  const {
    verticalDatumKind,
    verticalDatumOffsetM,
    observerGroundElevationM,
    targetGroundElevationM,
    terrainMode,
    terrainIntermediateDistancePercent,
    terrainIntermediateElevationM,
    ...version2Inputs
  } = savedExperimentFixture.inputs;
  return {
    ...savedExperimentFixture,
    manualTerrainPoints: undefined,
    terrainProfileSource: undefined,
    inputs: version2Inputs
  };
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
    expect(parsed.sourceVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
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
    appliedRouteDistance: false,
    appliedRouteCoordinates: true,
    fileSizeBytes: 256,
    sha256: 'b'.repeat(64),
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

  it('round-trips ESRI ASCII DEM terrain provenance', () => {
    const demSource = {
      kind: 'dem' as const,
      fileName: 'istanbul.asc',
      importedAtIso: '2026-08-06T15:00:00.000Z',
      sourceDistanceM: 22_500,
      observerEndpointElevationM: 12,
      targetEndpointElevationM: 18,
      appliedObserverEndpoint: true,
      appliedTargetEndpoint: true,
      appliedRouteDistance: false,
      appliedRouteCoordinates: false,
      fileSizeBytes: 1_024,
      sha256: 'c'.repeat(64),
      modifiedAfterImport: false,
      format: 'esri-ascii' as const,
      samplingMethod: 'bilinear' as const,
      geodesicMethod: 'vincenty' as const,
      columnCount: 10,
      rowCount: 10,
      sampleCount: 101,
      sampleCountMode: 'automatic' as const,
      sampleSpacingM: 225,
      cellSizeDeg: 0.001,
      noDataValue: -9999,
      westBoundaryDeg: 28.9,
      eastBoundaryDeg: 29.2,
      southBoundaryDeg: 40.9,
      northBoundaryDeg: 41.2,
      diagnosticStatus: 'good' as const,
      effectiveCellSpanM: 85,
      sampleSpacingToCellRatio: 2.65,
      minimumCoverageMarginM: 2_000,
      coverageMarginCellRatio: 23.5,
      minimumElevationM: 3,
      maximumElevationM: 120,
      elevationRangeM: 117
    };
    const file = createPortableExperimentFile({
      ...savedExperimentFixture,
      terrainProfileSource: demSource
    }, '1.3.0');
    const parsed = parsePortableExperimentFile(file);

    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.terrainProfileSource).toEqual(demSource);
  });

  it('migrates a version 6 experiment into the current schema', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '1.0.0');
    const legacy = { ...file, schemaVersion: 6 };
    const parsed = parsePortableExperimentFile(legacy);
    expect(parsed.sourceVersion).toBe(6);
    expect(parsed.migrated).toBe(true);
  });

  it('migrates a version 5 CSV source and defaults route application metadata', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '1.0.0');
    const experiment = JSON.parse(JSON.stringify(savedExperimentFixture)) as Record<string, unknown>;
    const source = experiment.terrainProfileSource as Record<string, unknown>;
    delete source.appliedRouteDistance;
    const parsed = parsePortableExperimentFile({ ...file, schemaVersion: 5, experiment });
    expect(parsed.sourceVersion).toBe(5);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.terrainProfileSource?.appliedRouteDistance).toBe(false);
  });

  it('migrates a version 4 experiment without inventing CSV provenance', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '1.0.0');
    const experiment = JSON.parse(JSON.stringify(savedExperimentFixture)) as Record<string, unknown>;
    const source = experiment.terrainProfileSource as Record<string, unknown>;
    delete source.fileSizeBytes;
    delete source.sha256;
    delete source.appliedRouteDistance;
    const parsed = parsePortableExperimentFile({ ...file, schemaVersion: 4, experiment });
    expect(parsed.sourceVersion).toBe(4);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.terrainProfileSource).toMatchObject({
      fileName: 'terrain-profile.csv',
      fileSizeBytes: undefined,
      sha256: undefined,
      appliedRouteDistance: false
    });
  });

  it('migrates a version 3 single point into an ordered point array', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.7.0');
    const { manualTerrainPoints, terrainProfileSource, ...withoutCurrentTerrain } = savedExperimentFixture;
    const version3Experiment = {
      ...withoutCurrentTerrain,
      inputs: {
        ...savedExperimentFixture.inputs,
        terrainMode: 'manual-three-point'
      }
    };
    const parsed = parsePortableExperimentFile({
      ...file,
      schemaVersion: 3,
      experiment: version3Experiment
    });
    expect(parsed.sourceVersion).toBe(3);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.manualTerrainPoints).toEqual([{ id: 'legacy-middle', distancePercent: 50, elevationM: 0 }]);
  });

  it('migrates a version 2 file with safe vertical defaults', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.6.0');
    const parsed = parsePortableExperimentFile({
      ...file,
      schemaVersion: 2,
      experiment: version2Experiment()
    });
    expect(parsed.sourceVersion).toBe(2);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.inputs.verticalDatumKind).toBe('orthometric-msl');
    expect(parsed.experiment.inputs.verticalDatumOffsetM).toBe(0);
  });

  it('migrates a version 1 portable file to manual distance mode', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.5.0');
    const parsed = parsePortableExperimentFile({
      ...file,
      schemaVersion: 1,
      experiment: legacyExperiment()
    });
    expect(parsed.sourceVersion).toBe(1);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.inputs.distanceSource).toBe('manual');
  });

  it('accepts a legacy raw experiment and marks it migrated', () => {
    const parsed = parsePortableExperimentFile(legacyExperiment());
    expect(parsed.sourceVersion).toBe(0);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.inputs.distanceSource).toBe('manual');
  });

  it('migrates the legacy local experiment array to a versioned store', () => {
    const parsed = parseLocalExperimentStore([legacyExperiment()]);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiments).toHaveLength(1);
  });

  it('creates a current versioned local store with provenance', () => {
    const store = createLocalExperimentStore([savedExperimentFixture]);
    expect(store.schema).toBe(LOCAL_EXPERIMENT_STORE_SCHEMA);
    expect(store.schemaVersion).toBe(LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION);
    const parsed = parseLocalExperimentStore(store);
    expect(parsed.migrated).toBe(false);
    expect(parsed.sourceVersion).toBe(LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION);
    expect(parsed.experiments).toEqual([savedExperimentFixture]);
  });

  it('normalizes multi-point order during storage', () => {
    const file = createPortableExperimentFile({
      ...savedExperimentFixture,
      manualTerrainPoints: [
        { id: 'c', distancePercent: 75, elevationM: 3 },
        { id: 'a', distancePercent: 25, elevationM: 1 },
        { id: 'b', distancePercent: 50, elevationM: 2 }
      ]
    }, '0.8.0');
    const parsed = parsePortableExperimentFile(file);
    expect(parsed.experiment.manualTerrainPoints?.map((point) => point.id)).toEqual(['a', 'b', 'c']);
  });

  it('rejects invalid CSV provenance', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    const invalid = JSON.parse(JSON.stringify(file)) as Record<string, unknown>;
    const experiment = invalid.experiment as Record<string, unknown>;
    const source = experiment.terrainProfileSource as Record<string, unknown>;
    source.sha256 = 'bad';
    expect(() => parsePortableExperimentFile(invalid)).toThrow(PortableFormatError);
  });

  it('rejects an unsupported portable schema version', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    expect(() => parsePortableExperimentFile({ ...file, schemaVersion: 99 })).toThrow(PortableFormatError);
  });

  it('rejects out-of-range coordinates', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    const invalid = JSON.parse(JSON.stringify(file)) as Record<string, unknown>;
    const experiment = invalid.experiment as Record<string, unknown>;
    const inputs = experiment.inputs as Record<string, unknown>;
    inputs.observerLatitudeDeg = 100;
    expect(() => parsePortableExperimentFile(invalid)).toThrow(PortableFormatError);
  });

  it('rejects an invalid legacy terrain sample position', () => {
    const file = createPortableExperimentFile(savedExperimentFixture, '0.8.0');
    const invalid = JSON.parse(JSON.stringify(file)) as Record<string, unknown>;
    const experiment = invalid.experiment as Record<string, unknown>;
    const inputs = experiment.inputs as Record<string, unknown>;
    inputs.terrainMode = 'manual-three-point';
    inputs.terrainIntermediateDistancePercent = 0;
    delete experiment.manualTerrainPoints;
    expect(() => parsePortableExperimentFile(invalid)).toThrow(PortableFormatError);
  });

  it('rejects duplicate multi-point positions', () => {
    const file = createPortableExperimentFile({
      ...savedExperimentFixture,
      manualTerrainPoints: [
        { id: 'a', distancePercent: 50, elevationM: 2 },
        { id: 'b', distancePercent: 50, elevationM: 3 }
      ]
    }, '0.8.0');
    expect(() => parsePortableExperimentFile(file)).toThrow(PortableFormatError);
  });
});
