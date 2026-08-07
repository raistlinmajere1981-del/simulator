import { describe, expect, it } from 'vitest';
import {
  buildWgs84VisualizationRoute,
  latitudeLongitudeToNorthPolarAzimuthalPoint,
  latitudeLongitudeToSpherePoint
} from '../src/simulation/model-visualization';

describe('model visualization coordinate helpers', () => {
  it('maps canonical WGS84 coordinates to a unit sphere', () => {
    expect(latitudeLongitudeToSpherePoint({ latitudeDeg: 0, longitudeDeg: 0 })).toEqual([1, 0, -0]);
    const north = latitudeLongitudeToSpherePoint({ latitudeDeg: 90, longitudeDeg: 0 });
    expect(north[0]).toBeCloseTo(0, 12);
    expect(north[1]).toBeCloseTo(1, 12);
    expect(north[2]).toBeCloseTo(0, 12);
  });

  it('maps the north pole to the center and south pole to the disk edge', () => {
    expect(latitudeLongitudeToNorthPolarAzimuthalPoint({ latitudeDeg: 90, longitudeDeg: 45 })).toEqual([0, 0, -0]);
    const south = latitudeLongitudeToNorthPolarAzimuthalPoint({ latitudeDeg: -90, longitudeDeg: 0 }, 2);
    expect(south[0]).toBeCloseTo(0, 12);
    expect(south[2]).toBeCloseTo(-2, 12);
  });

  it('builds a WGS84 route with deterministic endpoints', () => {
    const start = { latitudeDeg: 41.0082, longitudeDeg: 28.9784 };
    const end = { latitudeDeg: 39.9334, longitudeDeg: 32.8597 };
    const route = buildWgs84VisualizationRoute(start, end, 8);
    expect(route).toHaveLength(9);
    expect(route[0]).toEqual(start);
    expect(route.at(-1)).toEqual(end);
  });

  it('rejects unsafe visual route sample counts', () => {
    expect(() => buildWgs84VisualizationRoute(
      { latitudeDeg: 0, longitudeDeg: 0 },
      { latitudeDeg: 1, longitudeDeg: 1 },
      1
    )).toThrow(/2…512/);
  });
});
