import { describe, expect, it } from 'vitest';
import {
  createPhotoCalibrationRecord,
  pixelElevationDeg,
  pixelToCameraRay,
  resolveCameraIntrinsics
} from '../src/simulation/photo-calibration';

function baseInput() {
  return {
    experimentId: 'photo-test',
    imageSourceLabel: 'test-frame.jpg',
    recordedAtIso: '2026-08-08T01:00:00+03:00',
    imageWidthPx: 1000,
    imageHeightPx: 1000,
    calibration: {
      sourceKind: 'field-of-view' as const,
      horizontalFovDeg: 60,
      verticalFovDeg: 60
    },
    marks: {
      horizonStart: { xPx: 100, yPx: 500 },
      horizonEnd: { xPx: 900, yPx: 500 },
      targetBase: { xPx: 500, yPx: 500 },
      targetTop: { xPx: 500, yPx: 400 }
    },
    defaultMarkUncertaintyPx: 1,
    distortionCorrected: true
  };
}

describe('photo calibration', () => {
  it('derives pinhole intrinsics from physical sensor and focal length', () => {
    const intrinsics = resolveCameraIntrinsics({
      imageWidthPx: 6000,
      imageHeightPx: 4000,
      calibration: {
        sourceKind: 'sensor-focal',
        focalLengthMm: 50,
        sensorWidthMm: 36,
        sensorHeightMm: 24
      }
    });

    expect(intrinsics.focalLengthXPx).toBeCloseTo(8333.333333, 5);
    expect(intrinsics.focalLengthYPx).toBeCloseTo(8333.333333, 5);
    expect(intrinsics.horizontalFovDeg).toBeCloseTo(39.597753, 5);
    expect(intrinsics.verticalFovDeg).toBeCloseTo(26.991467, 5);
  });

  it('converts the principal point to the optical-axis ray', () => {
    const intrinsics = resolveCameraIntrinsics({
      imageWidthPx: 1001,
      imageHeightPx: 1001,
      calibration: {
        sourceKind: 'field-of-view',
        horizontalFovDeg: 90,
        verticalFovDeg: 90
      }
    });

    const ray = pixelToCameraRay(intrinsics, { xPx: 500, yPx: 500 });
    expect(ray[0]).toBeCloseTo(0, 10);
    expect(ray[1]).toBeCloseTo(0, 10);
    expect(ray[2]).toBeCloseTo(1, 10);
  });

  it('maps image height to a signed elevation angle', () => {
    const intrinsics = resolveCameraIntrinsics({
      imageWidthPx: 1000,
      imageHeightPx: 1000,
      principalPointXPx: 500,
      principalPointYPx: 500,
      calibration: {
        sourceKind: 'field-of-view',
        horizontalFovDeg: 90,
        verticalFovDeg: 90
      }
    });

    expect(pixelElevationDeg(intrinsics, { xPx: 500, yPx: 250 }))
      .toBeCloseTo(26.565051, 5);
    expect(pixelElevationDeg(intrinsics, { xPx: 500, yPx: 750 }))
      .toBeCloseTo(-26.565051, 5);
  });

  it('uses a two-point horizon as the local angular reference', () => {
    const record = createPhotoCalibrationRecord(baseInput());

    expect(record.metrics.horizonRollDeg).toBeCloseTo(0, 8);
    expect(record.metrics.targetBaseRelativeElevationDeg).toBeCloseTo(0, 8);
    expect(record.metrics.targetTopRelativeElevationDeg).toBeGreaterThan(6);
    expect(record.metrics.targetAngularHeightDeg)
      .toBeCloseTo(record.metrics.targetTopRelativeElevationDeg, 8);
    expect(record.prediction.status).toBe('compatible');
  });

  it('removes camera roll through the sloped reference line at each target x', () => {
    const input = baseInput();
    input.marks = {
      horizonStart: { xPx: 100, yPx: 450 },
      horizonEnd: { xPx: 900, yPx: 550 },
      targetBase: { xPx: 500, yPx: 500 },
      targetTop: { xPx: 500, yPx: 400 }
    };

    const record = createPhotoCalibrationRecord(input);
    expect(record.metrics.horizonRollDeg).toBeCloseTo(7.125016, 5);
    expect(record.metrics.targetBaseRelativeElevationDeg).toBeCloseTo(0, 8);
    expect(record.metrics.targetTopRelativeElevationDeg).toBeGreaterThan(6);
  });

  it('produces a conservative non-zero uncertainty envelope from pixel marks', () => {
    const record = createPhotoCalibrationRecord(baseInput());

    expect(record.uncertainty.horizonRollDeg).toBeGreaterThan(0);
    expect(record.uncertainty.targetBaseRelativeElevationDeg).toBeGreaterThan(0);
    expect(record.uncertainty.targetTopRelativeElevationDeg).toBeGreaterThan(0);
    expect(record.uncertainty.targetAngularHeightDeg).toBeGreaterThan(0);
    expect(record.prediction.metrics.find((metric) => metric.key === 'targetAngularHeightDeg')?.uncertainty)
      .toBeCloseTo(record.uncertainty.targetAngularHeightDeg, 10);
  });

  it('warns instead of silently treating uncorrected lens distortion as calibrated away', () => {
    const record = createPhotoCalibrationRecord({
      ...baseInput(),
      distortionCorrected: false
    });

    expect(record.prediction.warnings.some((warning) => warning.includes('Lens distorsiyonu')))
      .toBe(true);
  });

  it('rejects marks outside the image and near-vertical horizon references', () => {
    expect(() => createPhotoCalibrationRecord({
      ...baseInput(),
      marks: {
        ...baseInput().marks,
        targetTop: { xPx: 500, yPx: -1 }
      }
    })).toThrow(/görüntü sınırları/);

    expect(() => createPhotoCalibrationRecord({
      ...baseInput(),
      marks: {
        ...baseInput().marks,
        horizonStart: { xPx: 500, yPx: 100 },
        horizonEnd: { xPx: 500.5, yPx: 900 }
      }
    })).toThrow(/yatay eksende en az 1 piksel/);
  });

  it('rejects inverted target base/top marks instead of persisting a negative angular height', () => {
    const input = baseInput();
    input.marks = {
      ...input.marks,
      targetBase: { xPx: 500, yPx: 400 },
      targetTop: { xPx: 500, yPx: 600 }
    };

    expect(() => createPhotoCalibrationRecord(input)).toThrow(/TABAN ve TEPE/);
  });

  it('does not assume the marked line is a physical astronomical horizon', () => {
    const record = createPhotoCalibrationRecord(baseInput());
    expect(record.prediction.trace.assumptions.some((assumption) =>
      assumption.includes('fiziksel/astronomik ufuk')
    )).toBe(true);
  });
});
