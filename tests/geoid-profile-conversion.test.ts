import { describe, expect, it } from 'vitest';
import { convertGeoidTerrainProfile } from '../src/simulation/geoid-profile-conversion';

const points = [
  { id: 'a', distancePercent: 25, elevationM: 100 },
  { id: 'b', distancePercent: 75, elevationM: 120 }
];

describe('geoid terrain profile conversion', () => {
  it('converts endpoints and every interior point with one correction', () => {
    const result = convertGeoidTerrainProfile({
      from: 'ellipsoidal-wgs84',
      to: 'orthometric-msl',
      geoidUndulationM: 30,
      observerGroundElevationM: 90,
      targetGroundElevationM: 140,
      points
    });

    expect(result.correctionM).toBe(-30);
    expect(result.observerGroundElevationM).toBe(60);
    expect(result.targetGroundElevationM).toBe(110);
    expect(result.points).toEqual([
      { id: 'a', distancePercent: 25, elevationM: 70 },
      { id: 'b', distancePercent: 75, elevationM: 90 }
    ]);
  });

  it('preserves point order, ids and distances without mutating the source', () => {
    const result = convertGeoidTerrainProfile({
      from: 'orthometric-msl',
      to: 'ellipsoidal-wgs84',
      geoidUndulationM: 12,
      observerGroundElevationM: 0,
      targetGroundElevationM: 0,
      points
    });

    expect(result.points.map((point) => point.id)).toEqual(['a', 'b']);
    expect(result.points.map((point) => point.distancePercent)).toEqual([25, 75]);
    expect(points.map((point) => point.elevationM)).toEqual([100, 120]);
  });

  it('propagates supplied geoid uncertainty to the common conversion result', () => {
    const result = convertGeoidTerrainProfile({
      from: 'orthometric-msl',
      to: 'ellipsoidal-wgs84',
      geoidUndulationM: 20,
      geoidUndulationUncertaintyM: 0.4,
      observerGroundElevationM: 0,
      targetGroundElevationM: 0,
      points: []
    });

    expect(result.uncertaintyM).toBeCloseTo(0.4, 12);
  });

  it('rejects a no-op profile datum conversion', () => {
    expect(() => convertGeoidTerrainProfile({
      from: 'orthometric-msl',
      to: 'orthometric-msl',
      geoidUndulationM: 20,
      observerGroundElevationM: 0,
      targetGroundElevationM: 0,
      points: []
    })).toThrow('farklı');
  });
});
