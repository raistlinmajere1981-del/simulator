import { describe, expect, it } from 'vitest';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile,
  PortableFormatError
} from '../src/shared/portable';
import type { PortableObservationPhotoAsset } from '../src/shared/portable-photo-asset';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import type { PhotoSourceMetadata } from '../src/shared/photo-calibration';

const source: PhotoSourceMetadata = {
  fileName: 'uzak-mesafe.jpg',
  fileSizeBytes: 4,
  sha256: 'b'.repeat(64),
  mimeType: 'image/jpeg',
  imageWidthPx: 1600,
  imageHeightPx: 900,
  importedAtIso: '2026-08-12T10:00:00.000Z'
};

function experiment(): SavedExperiment {
  return {
    id: 'photo-portable-asset',
    name: 'Uzak mesafe görüş',
    createdAtIso: '2026-08-12T10:01:00.000Z',
    updatedAtIso: '2026-08-12T10:02:00.000Z',
    scenarioId: 'long-distance-visibility',
    photoCalibration: {
      source: { ...source },
      calibration: {
        sourceKind: 'field-of-view',
        horizontalFovDeg: 60,
        verticalFovDeg: 36
      },
      defaultMarkUncertaintyPx: 1,
      distortionCorrected: false,
      marks: {
        horizonStart: { xPx: 200, yPx: 450 },
        horizonEnd: { xPx: 1400, yPx: 450 },
        targetBase: { xPx: 800, yPx: 500 },
        targetTop: { xPx: 800, yPx: 380 }
      },
      recordedAtIso: '2026-08-12T10:01:30.000Z',
      referenceKind: 'visual-reference'
    },
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    modelVersions: {},
    predictions: []
  };
}

const asset: PortableObservationPhotoAsset = {
  source: { ...source },
  dataBase64: Buffer.from([1, 2, 3, 4]).toString('base64')
};

describe('portable observation photo asset', () => {
  it('round-trips image bytes separately from SavedExperiment metadata and marks', () => {
    const portable = createPortableExperimentFile(
      experiment(),
      '1.33.1',
      '2026-08-12T10:03:00.000Z',
      { observationPhoto: asset }
    );
    const parsed = parsePortableExperimentFile(JSON.parse(JSON.stringify(portable)));
    expect(parsed.assets?.observationPhoto).toEqual(asset);
    expect(parsed.experiment.photoCalibration?.marks).toEqual(experiment().photoCalibration?.marks);
  });

  it('rejects an asset whose source provenance differs from the saved calibration', () => {
    const portable = createPortableExperimentFile(
      experiment(),
      '1.33.1',
      '2026-08-12T10:03:00.000Z',
      { observationPhoto: asset }
    );
    const raw = JSON.parse(JSON.stringify(portable)) as {
      assets: { observationPhoto: { source: { sha256: string } } };
    };
    raw.assets.observationPhoto.source.sha256 = 'c'.repeat(64);
    expect(() => parsePortableExperimentFile(raw)).toThrow(PortableFormatError);
  });

  it('rejects malformed base64 length before the main process touches the asset store', () => {
    const portable = createPortableExperimentFile(
      experiment(),
      '1.33.1',
      '2026-08-12T10:03:00.000Z',
      { observationPhoto: asset }
    );
    const raw = JSON.parse(JSON.stringify(portable)) as {
      assets: { observationPhoto: { dataBase64: string } };
    };
    raw.assets.observationPhoto.dataBase64 = 'AQID';
    expect(() => parsePortableExperimentFile(raw)).toThrow(PortableFormatError);
  });
});
