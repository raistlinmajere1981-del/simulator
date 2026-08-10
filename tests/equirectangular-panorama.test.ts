import { describe, expect, it } from 'vitest';
import {
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID,
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION,
  buildPanoramaSkylineProfile,
  localDirectionToPanoramaPixel,
  panoramaPixelToLocalDirection,
  validateEquirectangularPanoramaGeometry,
  type EquirectangularPanoramaGeometry
} from '../src/simulation/equirectangular-panorama';

const fullGeometry: EquirectangularPanoramaGeometry = {
  imageWidthPx: 4000,
  imageHeightPx: 2000,
  fullPanoWidthPx: 4000,
  fullPanoHeightPx: 2000,
  croppedAreaLeftPx: 0,
  croppedAreaTopPx: 0,
  poseHeadingDeg: 0,
  posePitchDeg: 0,
  poseRollDeg: 0
};

function pixelForSphereAngles(headingDeg: number, elevationDeg: number) {
  return {
    xPx: (headingDeg + 180) / 360 * fullGeometry.fullPanoWidthPx - 0.5,
    yPx: (90 - elevationDeg) / 180 * fullGeometry.fullPanoHeightPx - 0.5
  };
}

describe('equirectangular panorama geometry', () => {
  it('exposes an explicit, versioned Google Photo Sphere geometry contract', () => {
    expect(EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID).toBe('gpano-equirectangular-local-frame');
    expect(EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION).toBe('0.1.0');
    const geometry = validateEquirectangularPanoramaGeometry(fullGeometry);
    expect(geometry.horizontalCoverageDeg).toBe(360);
    expect(geometry.verticalCoverageDeg).toBe(180);
    expect(geometry.fullSphereCoverage).toBe(true);
  });

  it('maps the zero-pose pano center to north/horizon and the right quarter to east', () => {
    const center = panoramaPixelToLocalDirection(fullGeometry, { xPx: 1999.5, yPx: 999.5 });
    expect(center.azimuthDeg).toBeCloseTo(0, 12);
    expect(center.altitudeDeg).toBeCloseTo(0, 12);
    expect(center.east).toBeCloseTo(0, 12);
    expect(center.north).toBeCloseTo(1, 12);
    expect(center.up).toBeCloseTo(0, 12);

    const east = panoramaPixelToLocalDirection(fullGeometry, { xPx: 2999.5, yPx: 999.5 });
    expect(east.azimuthDeg).toBeCloseTo(90, 12);
    expect(east.altitudeDeg).toBeCloseTo(0, 12);
    expect(east.east).toBeCloseTo(1, 12);
    expect(east.north).toBeCloseTo(0, 12);
  });

  it('applies Photo Sphere pose order: heading/pitch orient center, positive roll tips east down', () => {
    const posed: EquirectangularPanoramaGeometry = {
      ...fullGeometry,
      poseHeadingDeg: 90,
      posePitchDeg: 20,
      poseRollDeg: 0
    };
    const center = panoramaPixelToLocalDirection(posed, { xPx: 1999.5, yPx: 999.5 });
    expect(center.azimuthDeg).toBeCloseTo(90, 12);
    expect(center.altitudeDeg).toBeCloseTo(20, 12);

    const rolled = panoramaPixelToLocalDirection(
      { ...fullGeometry, poseRollDeg: 30 },
      { xPx: 2999.5, yPx: 999.5 }
    );
    expect(rolled.azimuthDeg).toBeCloseTo(90, 12);
    expect(rolled.altitudeDeg).toBeCloseTo(-30, 12);
  });

  it('round-trips an arbitrary pixel through a cropped, rotated panorama', () => {
    const cropped: EquirectangularPanoramaGeometry = {
      imageWidthPx: 3000,
      imageHeightPx: 1500,
      fullPanoWidthPx: 4000,
      fullPanoHeightPx: 2000,
      croppedAreaLeftPx: 500,
      croppedAreaTopPx: 250,
      poseHeadingDeg: 347.5,
      posePitchDeg: 12.25,
      poseRollDeg: -7.75
    };
    const point = { xPx: 1234.25, yPx: 876.5 };
    const direction = panoramaPixelToLocalDirection(cropped, point);
    const recovered = localDirectionToPanoramaPixel(
      cropped,
      direction.azimuthDeg,
      direction.altitudeDeg
    );
    expect(recovered).not.toBeNull();
    expect(recovered!.xPx).toBeCloseTo(point.xPx, 8);
    expect(recovered!.yPx).toBeCloseTo(point.yPx, 8);
  });

  it('reports partial angular coverage and does not invent pixels outside the crop', () => {
    const partial: EquirectangularPanoramaGeometry = {
      ...fullGeometry,
      imageWidthPx: 1000,
      imageHeightPx: 1000,
      croppedAreaLeftPx: 1000,
      croppedAreaTopPx: 500
    };
    const geometry = validateEquirectangularPanoramaGeometry(partial);
    expect(geometry.horizontalCoverageDeg).toBe(90);
    expect(geometry.verticalCoverageDeg).toBe(90);
    expect(geometry.fullSphereCoverage).toBe(false);
    expect(localDirectionToPanoramaPixel(partial, 180, 0)).toBeNull();
  });

  it('converts manual skyline pixels into the existing normalized derived local-horizon contract', () => {
    const marks = [-157.5, -112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5]
      .map((headingDeg) => pixelForSphereAngles(headingDeg, 5));
    const profile = buildPanoramaSkylineProfile({
      geometry: fullGeometry,
      sourceLabel: 'synthetic-full-panorama.jpg',
      marks
    });
    expect(profile.geometry.fullSphereCoverage).toBe(true);
    expect(profile.mask.sourceKind).toBe('derived');
    expect(profile.mask.points).toHaveLength(8);
    expect(profile.mask.points.map((point) => point.azimuthDeg)).toEqual([
      22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5
    ]);
    expect(profile.mask.points.every((point) => Math.abs(point.altitudeDeg - 5) < 1e-10)).toBe(true);
    expect(profile.mask.maximumAzimuthGapDeg).toBeCloseTo(45, 10);
    expect(profile.warnings).toHaveLength(0);
  });

  it('keeps partial-panorama skyline marks explicit and warns that missing azimuths were not observed', () => {
    const partial: EquirectangularPanoramaGeometry = {
      ...fullGeometry,
      imageWidthPx: 2000,
      croppedAreaLeftPx: 1000
    };
    const profile = buildPanoramaSkylineProfile({
      geometry: partial,
      sourceLabel: 'partial-panorama.jpg',
      marks: [
        { xPx: 100, yPx: 999.5 },
        { xPx: 900, yPx: 999.5 },
        { xPx: 1700, yPx: 999.5 }
      ]
    });
    expect(profile.geometry.horizontalCoverageDeg).toBe(180);
    expect(profile.geometry.fullSphereCoverage).toBe(false);
    expect(profile.warnings.some((warning) => warning.includes('tam 360°×180° küreyi kapsamıyor'))).toBe(true);
    expect(profile.mask.maximumAzimuthGapDeg).toBeGreaterThan(180);
  });

  it('rejects invalid crop bounds and pose ranges', () => {
    expect(() => validateEquirectangularPanoramaGeometry({
      ...fullGeometry,
      imageWidthPx: 3000,
      croppedAreaLeftPx: 1500
    })).toThrow('tam panorama sınırlarının dışına');
    expect(() => validateEquirectangularPanoramaGeometry({
      ...fullGeometry,
      poseHeadingDeg: 360
    })).toThrow('Pose heading');
    expect(() => validateEquirectangularPanoramaGeometry({
      ...fullGeometry,
      poseRollDeg: -180
    })).toThrow('Pose roll');
  });
});
