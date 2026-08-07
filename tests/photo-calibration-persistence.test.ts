import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile,
  PortableFormatError
} from '../src/shared/portable';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import type { SavedPhotoCalibration } from '../src/shared/photo-calibration';
import {
  createPhotoCalibrationRecord,
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION
} from '../src/simulation/photo-calibration';

const calibration: SavedPhotoCalibration = {
  source: {
    fileName: 'uzak-hedef.jpg',
    fileSizeBytes: 432_100,
    sha256: 'a'.repeat(64),
    mimeType: 'image/jpeg',
    imageWidthPx: 1600,
    imageHeightPx: 900,
    importedAtIso: '2026-08-08T01:00:00+03:00'
  },
  calibration: {
    sourceKind: 'field-of-view',
    horizontalFovDeg: 60,
    verticalFovDeg: 36
  },
  defaultMarkUncertaintyPx: 1.5,
  distortionCorrected: false,
  marks: {
    horizonStart: { xPx: 200, yPx: 460 },
    horizonEnd: { xPx: 1400, yPx: 455 },
    targetBase: { xPx: 805, yPx: 470 },
    targetTop: { xPx: 805, yPx: 390 }
  },
  recordedAtIso: '2026-08-08T01:02:00+03:00',
  notes: 'Tripod çekimi'
};

function savedExperiment(): SavedExperiment {
  const record = createPhotoCalibrationRecord({
    experimentId: 'photo-persist',
    imageSourceLabel: calibration.source.fileName,
    recordedAtIso: calibration.recordedAtIso,
    imageWidthPx: calibration.source.imageWidthPx,
    imageHeightPx: calibration.source.imageHeightPx,
    calibration: calibration.calibration,
    marks: calibration.marks,
    defaultMarkUncertaintyPx: calibration.defaultMarkUncertaintyPx,
    distortionCorrected: calibration.distortionCorrected,
    notes: calibration.notes
  });
  return {
    id: 'photo-persist',
    name: 'Fotoğraf kalibrasyon deneyi',
    createdAtIso: '2026-08-08T00:59:00+03:00',
    updatedAtIso: '2026-08-08T01:03:00+03:00',
    scenarioId: 'target-visibility',
    photoCalibration: calibration,
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    modelVersions: {
      [PHOTO_CALIBRATION_MODEL_ID]: PHOTO_CALIBRATION_MODEL_VERSION
    },
    predictions: [record.prediction]
  };
}

describe('photo calibration persistence', () => {
  it('round-trips source provenance, marks and prediction without image bytes', () => {
    const portable = createPortableExperimentFile(
      savedExperiment(),
      '1.4.0',
      '2026-08-08T01:04:00+03:00'
    );
    const serialized = JSON.stringify(portable);
    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain('base64');

    const parsed = parsePortableExperimentFile(JSON.parse(serialized)).experiment;
    expect(parsed.photoCalibration).toEqual(calibration);
    expect(parsed.predictions.find((item) => item.modelId === PHOTO_CALIBRATION_MODEL_ID))
      .toBeDefined();
  });

  it('rejects tampered photo source integrity instead of accepting an invalid hash', () => {
    const portable = createPortableExperimentFile(savedExperiment(), '1.4.0');
    const raw = JSON.parse(JSON.stringify(portable)) as {
      experiment: { photoCalibration: { source: { sha256: string } } };
    };
    raw.experiment.photoCalibration.source.sha256 = 'not-a-sha';
    expect(() => parsePortableExperimentFile(raw)).toThrow(PortableFormatError);
  });

  it('renders source provenance and marks into the HTML report without embedding the image', () => {
    const report = createExperimentHtmlReport(savedExperiment());
    expect(report).toContain('Fotoğraf kaynak ve işaretleme provenansı');
    expect(report).toContain('uzak-hedef.jpg');
    expect(report).toContain('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(report).toContain('Hedef tepesi');
    expect(report).toContain('Fotoğraf / Kamera Kalibrasyonu');
    expect(report).not.toContain('data:image');
    expect(report).not.toContain('base64');
  });
});
