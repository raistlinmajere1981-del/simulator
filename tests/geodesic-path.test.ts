import { describe, expect, it } from 'vitest';
import {
  coordinateAtWgs84PathFraction,
  createWgs84GeodesicPath
} from '../src/simulation/geodesic-path';

 describe('WGS84 geodesic path', () => {
  it('produces the equatorial midpoint with the direct Vincenty solution', () => {
    const path = createWgs84GeodesicPath(
      { latitudeDeg: 0, longitudeDeg: 0 },
      { latitudeDeg: 0, longitudeDeg: 1 }
    );
    const midpoint = coordinateAtWgs84PathFraction(path, 0.5);

    expect(path.method).toBe('vincenty');
    expect(midpoint.method).toBe('vincenty');
    expect(midpoint.coordinate.latitudeDeg).toBeCloseTo(0, 9);
    expect(midpoint.coordinate.longitudeDeg).toBeCloseTo(0.5, 7);
  });

  it('returns exact endpoints and rejects invalid fractions', () => {
    const start = { latitudeDeg: 41, longitudeDeg: 29 };
    const end = { latitudeDeg: 41.1, longitudeDeg: 29.2 };
    const path = createWgs84GeodesicPath(start, end);

    expect(coordinateAtWgs84PathFraction(path, 0).coordinate).toEqual(start);
    expect(coordinateAtWgs84PathFraction(path, 1).coordinate).toEqual(end);
    expect(() => coordinateAtWgs84PathFraction(path, 1.1)).toThrow('0…1');
  });

  it('rejects coincident route endpoints', () => {
    expect(() => createWgs84GeodesicPath(
      { latitudeDeg: 41, longitudeDeg: 29 },
      { latitudeDeg: 41, longitudeDeg: 29 }
    )).toThrow('farklı');
  });
});
