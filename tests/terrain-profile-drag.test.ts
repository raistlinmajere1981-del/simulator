import { describe, expect, it } from 'vitest';
import {
  getTerrainPointDragBounds,
  terrainPointFromDragDelta
} from '../src/simulation/terrain-profile-drag';

const points = [
  { id: 'a', distancePercent: 20, elevationM: 5 },
  { id: 'b', distancePercent: 50, elevationM: 10 },
  { id: 'c', distancePercent: 80, elevationM: 15 }
];

describe('terrain profile point dragging', () => {
  it('limits horizontal movement to neighbouring points', () => {
    expect(getTerrainPointDragBounds(points, 'b')).toEqual({
      minimumDistancePercent: 20.001,
      maximumDistancePercent: 79.999
    });
  });

  it('converts pointer movement into distance and elevation changes', () => {
    const result = terrainPointFromDragDelta({
      startDistancePercent: 50,
      startElevationM: 10,
      deltaXpx: 92,
      deltaYpx: -72,
      viewportWidthPx: 1_000,
      viewportHeightPx: 1_000,
      elevationSpanM: 100,
      minimumDistancePercent: 20.001,
      maximumDistancePercent: 79.999
    });

    expect(result.distancePercent).toBe(60);
    expect(result.elevationM).toBe(20);
  });

  it('clamps movement at neighbour and elevation limits', () => {
    const result = terrainPointFromDragDelta({
      startDistancePercent: 50,
      startElevationM: 0,
      deltaXpx: 10_000,
      deltaYpx: -10_000,
      viewportWidthPx: 100,
      viewportHeightPx: 100,
      elevationSpanM: 100_000,
      minimumDistancePercent: 20.001,
      maximumDistancePercent: 79.999
    });

    expect(result.distancePercent).toBe(79.999);
    expect(result.elevationM).toBe(100_000);
  });

  it('rejects missing points and invalid viewport sizes', () => {
    expect(() => getTerrainPointDragBounds(points, 'missing')).toThrow('bulunamadı');
    expect(() => terrainPointFromDragDelta({
      startDistancePercent: 50,
      startElevationM: 0,
      deltaXpx: 0,
      deltaYpx: 0,
      viewportWidthPx: 0,
      viewportHeightPx: 100,
      elevationSpanM: 10,
      minimumDistancePercent: 0.001,
      maximumDistancePercent: 99.999
    })).toThrow('boyutları');
  });
});
