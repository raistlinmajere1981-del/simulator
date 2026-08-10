import { describe, expect, it } from 'vitest';
import {
  LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION,
  PORTABLE_EXPERIMENT_SCHEMA_VERSION,
  PortableFormatError,
  createLocalExperimentStore,
  createPortableExperimentFile,
  parseLocalExperimentStore,
  parsePortableExperimentFile
} from '../src/shared/portable';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import type {
  StellarPanoramaGeometry,
  StellarPanoramaSkylineDraft
} from '../src/shared/stellar-local-horizon-import';
import { savedStellarLocalHorizonSourceFromPanorama } from '../src/simulation/stellar-panorama-skyline-source';

const geometry: StellarPanoramaGeometry = {
  imageWidthPx: 4000,
  imageHeightPx: 1600,
  fullPanoWidthPx: 4000,
  fullPanoHeightPx: 2000,
  croppedAreaLeftPx: 0,
  croppedAreaTopPx: 200,
  poseHeadingDeg: 12.5,
  posePitchDeg: 1.25,
  poseRollDeg: -0.75
};

const draft: StellarPanoramaSkylineDraft = {
  fileName: 'portable-panorama.jpg',
  importedAtIso: '2026-08-10T10:15:00.000Z',
  fileSizeBytes: 4_500_000,
  sha256: 'd'.repeat(64),
  mimeType: 'image/jpeg',
  imageWidthPx: 4000,
  imageHeightPx: 1600,
  dataUrl: 'data:image/jpeg;base64,NEVER_PERSIST',
  metadata: {
    status: 'complete',
    geometry,
    projectionType: 'equirectangular',
    metadataScaledToImage: true,
    standardXmpPacketFound: true,
    extendedXmpPacketFound: false,
    warnings: ['GPano bitmap boyutuna ölçeklendi.']
  }
};

const marks = [
  { xPx: 249.5, yPx: 800 },
  { xPx: 749.5, yPx: 760 },
  { xPx: 1249.5, yPx: 730 },
  { xPx: 1749.5, yPx: 750 },
  { xPx: 2249.5, yPx: 780 },
  { xPx: 2749.5, yPx: 820 },
  { xPx: 3249.5, yPx: 840 },
  { xPx: 3749.5, yPx: 810 }
];

function experiment(): SavedExperiment {
  const source = savedStellarLocalHorizonSourceFromPanorama({
    draft,
    geometry,
    geometrySource: 'gpano-xmp',
    marks
  });
  return {
    id: 'portable-panorama',
    name: 'Panorama portable testi',
    createdAtIso: '2026-08-10T10:15:00.000Z',
    updatedAtIso: '2026-08-10T10:15:00.000Z',
    observedAtIso: '2026-08-10T10:15:00.000Z',
    observationUtcOffsetMinutes: 180,
    scenarioId: 'stellar-observation',
    stellarLocalHorizonSource: source,
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    manualTerrainPoints: [],
    modelVersions: {},
    predictions: []
  };
}

describe('portable panorama skyline v11', () => {
  it('round-trips panorama geometry, marks and source provenance without image bytes', () => {
    const portable = createPortableExperimentFile(experiment(), '1.20.0', '2026-08-10T10:20:00.000Z');
    expect(PORTABLE_EXPERIMENT_SCHEMA_VERSION).toBe(11);
    expect(portable.schemaVersion).toBe(11);
    expect(JSON.stringify(portable)).not.toContain('NEVER_PERSIST');

    const parsed = parsePortableExperimentFile(JSON.parse(JSON.stringify(portable)));
    expect(parsed.sourceVersion).toBe(11);
    expect(parsed.migrated).toBe(false);
    const source = parsed.experiment.stellarLocalHorizonSource;
    expect(source?.format).toBe('panorama');
    expect(source?.pointCount).toBe(8);
    expect(source?.panoramaDerivation).toMatchObject({
      geometrySource: 'gpano-xmp',
      metadataStatusAtImport: 'complete',
      projectionTypeAtImport: 'equirectangular',
      metadataScaledToImage: true,
      standardXmpPacketFound: true,
      extendedXmpPacketFound: false
    });
    expect(source?.panoramaDerivation?.marks).toHaveLength(8);
  });

  it('round-trips panorama source through local store v11', () => {
    const store = createLocalExperimentStore([experiment()], '2026-08-10T10:20:00.000Z');
    expect(LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION).toBe(11);
    expect(store.schemaVersion).toBe(11);
    const parsed = parseLocalExperimentStore(JSON.parse(JSON.stringify(store)));
    expect(parsed.migrated).toBe(false);
    expect(parsed.ignoredRecordCount).toBe(0);
    expect(parsed.store.experiments[0]?.stellarLocalHorizonSource?.format).toBe('panorama');
  });

  it('rejects tampering with persisted pose geometry', () => {
    const portable = createPortableExperimentFile(experiment(), '1.20.0');
    const raw = structuredClone(portable) as unknown as Record<string, unknown>;
    const exp = raw.experiment as Record<string, unknown>;
    const source = exp.stellarLocalHorizonSource as Record<string, unknown>;
    const derivation = source.panoramaDerivation as Record<string, unknown>;
    const persistedGeometry = derivation.geometry as Record<string, unknown>;
    persistedGeometry.poseHeadingDeg = 13.5;
    expect(() => parsePortableExperimentFile(raw)).toThrow(PortableFormatError);
  });

  it('rejects tampering with persisted pixel marks or mapped angles', () => {
    const portable = createPortableExperimentFile(experiment(), '1.20.0');
    const rawPixel = structuredClone(portable) as unknown as Record<string, unknown>;
    const pixelSource = (rawPixel.experiment as Record<string, unknown>)
      .stellarLocalHorizonSource as Record<string, unknown>;
    const pixelMarks = (pixelSource.panoramaDerivation as Record<string, unknown>).marks as Record<string, unknown>[];
    pixelMarks[0]!.xPx = Number(pixelMarks[0]!.xPx) + 10;
    expect(() => parsePortableExperimentFile(rawPixel)).toThrow(PortableFormatError);

    const rawAngle = structuredClone(portable) as unknown as Record<string, unknown>;
    const angleSource = (rawAngle.experiment as Record<string, unknown>)
      .stellarLocalHorizonSource as Record<string, unknown>;
    const angleMarks = (angleSource.panoramaDerivation as Record<string, unknown>).marks as Record<string, unknown>[];
    angleMarks[1]!.altitudeDeg = Number(angleMarks[1]!.altitudeDeg) + 0.5;
    expect(() => parsePortableExperimentFile(rawAngle)).toThrow(PortableFormatError);
  });

  it('rejects a panorama source that tries to persist session image data', () => {
    const portable = createPortableExperimentFile(experiment(), '1.20.0');
    const raw = structuredClone(portable) as unknown as Record<string, unknown>;
    const source = (raw.experiment as Record<string, unknown>)
      .stellarLocalHorizonSource as Record<string, unknown>;
    source.dataUrl = 'data:image/jpeg;base64,SHOULD_FAIL';
    expect(() => parsePortableExperimentFile(raw)).toThrow(PortableFormatError);
  });

  it('continues to accept schema-v10 records without panorama fields as migration input', () => {
    const legacyExperiment = experiment();
    delete legacyExperiment.stellarLocalHorizonSource;
    const legacy = {
      schema: 'geometric-observation-laboratory/portable-experiment',
      schemaVersion: 10,
      exportedAtIso: '2026-08-10T10:20:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '1.19.0' },
      experiment: legacyExperiment
    };
    const parsed = parsePortableExperimentFile(legacy);
    expect(parsed.sourceVersion).toBe(10);
    expect(parsed.migrated).toBe(true);
    expect(parsed.experiment.stellarLocalHorizonSource).toBeUndefined();
  });
});
