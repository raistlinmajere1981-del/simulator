import { describe, expect, it } from 'vitest';
import {
  STELLAR_SKY_HORIZON_RADIUS,
  STELLAR_SKY_VIEWBOX_CENTER,
  projectStellarSkyPoint,
  stellarSkyMarkerRadius
} from '../src/renderer/src/stellar-sky-visualization';

describe('stellar sky visualization', () => {
  it('projects zenith to the chart center', () => {
    expect(projectStellarSkyPoint({ elevationDeg: 90, azimuthDeg: 137 })).toEqual({
      x: STELLAR_SKY_VIEWBOX_CENTER,
      y: STELLAR_SKY_VIEWBOX_CENTER
    });
  });

  it('orients north at top, east right, south bottom and west left', () => {
    const north = projectStellarSkyPoint({ elevationDeg: 0, azimuthDeg: 0 });
    const east = projectStellarSkyPoint({ elevationDeg: 0, azimuthDeg: 90 });
    const south = projectStellarSkyPoint({ elevationDeg: 0, azimuthDeg: 180 });
    const west = projectStellarSkyPoint({ elevationDeg: 0, azimuthDeg: 270 });

    expect(north.x).toBeCloseTo(50, 12);
    expect(north.y).toBeCloseTo(50 - STELLAR_SKY_HORIZON_RADIUS, 12);
    expect(east.x).toBeCloseTo(50 + STELLAR_SKY_HORIZON_RADIUS, 12);
    expect(east.y).toBeCloseTo(50, 12);
    expect(south.x).toBeCloseTo(50, 12);
    expect(south.y).toBeCloseTo(50 + STELLAR_SKY_HORIZON_RADIUS, 12);
    expect(west.x).toBeCloseTo(50 - STELLAR_SKY_HORIZON_RADIUS, 12);
    expect(west.y).toBeCloseTo(50, 12);
  });

  it('places 45° altitude halfway between zenith and the horizon', () => {
    const point = projectStellarSkyPoint({ elevationDeg: 45, azimuthDeg: 90 });
    expect(point.x).toBeCloseTo(50 + STELLAR_SKY_HORIZON_RADIUS / 2, 12);
    expect(point.y).toBeCloseTo(50, 12);
  });

  it('normalizes wrapped azimuths', () => {
    expect(projectStellarSkyPoint({ elevationDeg: 20, azimuthDeg: -90 })).toEqual(
      projectStellarSkyPoint({ elevationDeg: 20, azimuthDeg: 270 })
    );
    expect(projectStellarSkyPoint({ elevationDeg: 20, azimuthDeg: 450 })).toEqual(
      projectStellarSkyPoint({ elevationDeg: 20, azimuthDeg: 90 })
    );
  });

  it('rejects below-horizon points and clamps marker sizes', () => {
    expect(() => projectStellarSkyPoint({ elevationDeg: -0.01, azimuthDeg: 0 })).toThrow('0°–90°');
    expect(() => projectStellarSkyPoint({ elevationDeg: 91, azimuthDeg: 0 })).toThrow('0°–90°');
    expect(stellarSkyMarkerRadius(-2)).toBeLessThanOrEqual(2.1);
    expect(stellarSkyMarkerRadius(8)).toBeGreaterThanOrEqual(0.9);
    expect(stellarSkyMarkerRadius(-1)).toBeGreaterThan(stellarSkyMarkerRadius(2));
  });
});
