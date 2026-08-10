import { describe, expect, it } from 'vitest';
import {
  geocentricToTopocentric,
  geodeticToWgs84Geocentric,
  topocentricDirectionBetween
} from '../src/simulation/wgs84-topocentric';
import { WGS84_SEMI_MAJOR_AXIS_M, WGS84_SEMI_MINOR_AXIS_M } from '../src/simulation/geodesy';

describe('WGS84 topocentric geometry', () => {
  it('reproduces the EPSG 9836 topocentric example', () => {
    const result = geocentricToTopocentric(
      { xM: 3_771_793.968, yM: 140_253.342, zM: 5_124_304.349 },
      { xM: 3_652_755.3058, yM: 319_574.6799, zM: 5_201_547.3536 },
      55,
      5
    );

    expect(result.eastM).toBeCloseTo(-189_013.869, 3);
    expect(result.northM).toBeCloseTo(-128_642.040, 3);
    expect(result.upM).toBeCloseTo(-4_220.171, 3);
  });

  it('maps WGS84 equator and pole to the defining ellipsoid axes', () => {
    const equator = geodeticToWgs84Geocentric({
      latitudeDeg: 0,
      longitudeDeg: 0,
      ellipsoidalHeightM: 0
    });
    expect(equator.xM).toBeCloseTo(WGS84_SEMI_MAJOR_AXIS_M, 6);
    expect(equator.yM).toBeCloseTo(0, 9);
    expect(equator.zM).toBeCloseTo(0, 9);

    const pole = geodeticToWgs84Geocentric({
      latitudeDeg: 90,
      longitudeDeg: 0,
      ellipsoidalHeightM: 0
    });
    expect(pole.xM).toBeCloseTo(0, 6);
    expect(pole.yM).toBeCloseTo(0, 6);
    expect(pole.zM).toBeCloseTo(WGS84_SEMI_MINOR_AXIS_M, 6);
  });

  it('keeps a purely vertical target at zenith with undefined azimuth', () => {
    const direction = topocentricDirectionBetween(
      { latitudeDeg: 41, longitudeDeg: 29, ellipsoidalHeightM: 100 },
      { latitudeDeg: 41, longitudeDeg: 29, ellipsoidalHeightM: 150 }
    );

    expect(direction.elevationDeg).toBeCloseTo(90, 7);
    expect(direction.azimuthDeg).toBeNull();
    expect(direction.upM).toBeCloseTo(50, 6);
    expect(direction.horizontalDistanceM).toBeCloseTo(0, 6);
  });

  it('rejects coincident 3D points', () => {
    const point = { latitudeDeg: 41, longitudeDeg: 29, ellipsoidalHeightM: 100 };
    expect(() => topocentricDirectionBetween(point, point)).toThrow('farklı');
  });
});
