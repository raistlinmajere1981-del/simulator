import { describe, expect, it } from 'vitest';
import {
  atmosphereVisualRadiusScale,
  buildAtmosphereVisualizationPath,
  downsampleLayeredRayPath
} from '../src/simulation/atmosphere-visualization';
import type { LayeredRayPathSample } from '../src/simulation/layered-ray-tracing';
import { latitudeLongitudeToSpherePoint } from '../src/simulation/model-visualization';

function sample(index: number, count: number): LayeredRayPathSample {
  const fraction = index / (count - 1);
  return {
    pathDistanceM: fraction * 10_010,
    surfaceDistanceM: fraction * 10_000,
    centralAngleRad: fraction * 10_000 / 6_371_008.8,
    altitudeM: 10 + fraction * 40,
    elevationDeg: -0.1 + fraction * 0.2,
    refractiveIndex: 1.00027 - fraction * 0.000001
  };
}

function direction(point: readonly [number, number, number]): readonly [number, number, number] {
  const length = Math.hypot(...point);
  return [point[0] / length, point[1] / length, point[2] / length];
}

describe('atmosphere visualization geometry', () => {
  it('uses a bounded monotonic visual altitude exaggeration', () => {
    const lower = atmosphereVisualRadiusScale(0, 0, 200);
    const middle = atmosphereVisualRadiusScale(100, 0, 200);
    const upper = atmosphereVisualRadiusScale(200, 0, 200);

    expect(lower).toBeCloseTo(1.025, 8);
    expect(middle).toBeGreaterThan(lower);
    expect(upper).toBeCloseTo(1.13, 8);
    expect(atmosphereVisualRadiusScale(-50, 0, 200)).toBe(lower);
    expect(atmosphereVisualRadiusScale(500, 0, 200)).toBe(upper);
  });

  it('downsamples long RK4 paths while preserving both endpoints', () => {
    const source = Array.from({ length: 1_001 }, (_, index) => sample(index, 1_001));
    const reduced = downsampleLayeredRayPath(source, 101);

    expect(reduced).toHaveLength(101);
    expect(reduced[0]).toEqual(source[0]);
    expect(reduced.at(-1)).toEqual(source.at(-1));
  });

  it('anchors a target ray to the displayed WGS84 observer-target route', () => {
    const observer = { latitudeDeg: 41, longitudeDeg: 29 };
    const target = { latitudeDeg: 41.08, longitudeDeg: 29.12 };
    const source = Array.from({ length: 21 }, (_, index) => sample(index, 21));
    const visual = buildAtmosphereVisualizationPath({
      samples: source,
      observerCoordinate: observer,
      targetCoordinate: target,
      targetSurfaceDistanceM: 10_000,
      profileMinimumAltitudeM: 0,
      profileMaximumAltitudeM: 200
    });

    const firstDirection = direction(visual.points[0]!.point);
    const lastDirection = direction(visual.points.at(-1)!.point);
    const observerDirection = direction(latitudeLongitudeToSpherePoint(observer, 1));
    const targetDirection = direction(latitudeLongitudeToSpherePoint(target, 1));

    firstDirection.forEach((value, index) => expect(value).toBeCloseTo(observerDirection[index]!, 8));
    lastDirection.forEach((value, index) => expect(value).toBeCloseTo(targetDirection[index]!, 8));
    expect(visual.sourceSampleCount).toBe(source.length);
  });

  it('can orient a horizon cross-section without inventing a target coordinate', () => {
    const source = Array.from({ length: 11 }, (_, index) => sample(index, 11));
    const visual = buildAtmosphereVisualizationPath({
      samples: source,
      observerCoordinate: { latitudeDeg: 0, longitudeDeg: 0 },
      profileMinimumAltitudeM: 0,
      profileMaximumAltitudeM: 200
    });

    expect(visual.points).toHaveLength(source.length);
    expect(visual.points[0]!.point[0]).toBeGreaterThan(1);
    expect(Math.hypot(...visual.points.at(-1)!.point)).toBeGreaterThan(
      Math.hypot(...visual.points[0]!.point)
    );
  });
});
