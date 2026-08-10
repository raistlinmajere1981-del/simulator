import { describe, expect, it } from 'vitest';
import { coordinateAtWgs84BearingDistance } from '../src/simulation/geodesic-path';

describe('WGS84 direct bearing-distance solver', () => {
  it('moves one equatorial degree east with Vincenty direct', () => {
    const result = coordinateAtWgs84BearingDistance(
      { latitudeDeg: 0, longitudeDeg: 0 },
      90,
      111_319.49079327357
    );

    expect(result.method).toBe('vincenty');
    expect(result.coordinate.latitudeDeg).toBeCloseTo(0, 8);
    expect(result.coordinate.longitudeDeg).toBeCloseTo(1, 7);
  });

  it('normalizes finite bearings and keeps zero distance exact', () => {
    const start = { latitudeDeg: 41, longitudeDeg: 29 };
    expect(coordinateAtWgs84BearingDistance(start, 450, 0).coordinate).toEqual(start);

    const west = coordinateAtWgs84BearingDistance(
      { latitudeDeg: 0, longitudeDeg: 0 },
      -90,
      111_319.49079327357
    );
    expect(west.coordinate.longitudeDeg).toBeCloseTo(-1, 7);
  });

  it('rejects invalid start coordinates, bearings and distances', () => {
    expect(() => coordinateAtWgs84BearingDistance(
      { latitudeDeg: 100, longitudeDeg: 0 },
      0,
      1_000
    )).toThrow('WGS84');
    expect(() => coordinateAtWgs84BearingDistance(
      { latitudeDeg: 0, longitudeDeg: 0 },
      Number.NaN,
      1_000
    )).toThrow('Azimut');
    expect(() => coordinateAtWgs84BearingDistance(
      { latitudeDeg: 0, longitudeDeg: 0 },
      0,
      -1
    )).toThrow('negatif');
  });
});
