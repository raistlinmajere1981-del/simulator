import { describe, expect, it } from 'vitest';
import {
  calculateIau2006BiasPrecessionMatrixFromJulianDateTt,
  calculateIau2006MeanJ2000ToDateMatrixFromJulianDateTt,
  precessStellarDirectionToMeanOfDate,
  StellarPrecessionError
} from '../src/simulation/stellar-precession';

describe('stellar precession', () => {
  it('matches the SOFA Pmat06 validation matrix', () => {
    const matrix = calculateIau2006BiasPrecessionMatrixFromJulianDateTt(2_400_000.5 + 50_123.9999);
    const expected = [
      [0.9999995505176007047, 0.8695404617348208406e-3, 0.3779735201865589104e-3],
      [-0.8695404723772031414e-3, 0.9999996219496027161, -0.1361752497080270143e-6],
      [-0.3779734957034089490e-3, -0.1924880847894457113e-6, 0.9999999285679971958]
    ];
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        expect(matrix[row]![column]).toBeCloseTo(expected[row]![column]!, 12);
      }
    }
  });

  it('is identity for mean J2000 coordinates at J2000', () => {
    const matrix = calculateIau2006MeanJ2000ToDateMatrixFromJulianDateTt(2_451_545);
    expect(matrix[0][0]).toBeCloseTo(1, 14);
    expect(matrix[1][1]).toBeCloseTo(1, 14);
    expect(matrix[2][2]).toBeCloseTo(1, 14);
    expect(matrix[0][1]).toBeCloseTo(0, 14);
    expect(matrix[0][2]).toBeCloseTo(0, 14);
    expect(matrix[1][0]).toBeCloseTo(0, 14);
    expect(matrix[1][2]).toBeCloseTo(0, 14);
    expect(matrix[2][0]).toBeCloseTo(0, 14);
    expect(matrix[2][1]).toBeCloseTo(0, 14);
  });

  it('precesses a mean-J2000 Sirius direction into 2026 mean-of-date coordinates', () => {
    const result = precessStellarDirectionToMeanOfDate({
      observedAtIso: '2026-08-09T12:00:00Z',
      rightAscensionDeg: 101.28715533,
      declinationDeg: -16.71611586,
      sourceFrame: 'mean-j2000',
      label: 'Sirius'
    });
    expect(result.meanOfDateRightAscensionDeg).toBeCloseTo(101.58438278, 6);
    expect(result.meanOfDateDeclinationDeg).toBeCloseTo(-16.74548129, 6);
    expect(result.angularShiftArcsec).toBeGreaterThan(1_000);
    expect(result.angularShiftArcsec).toBeLessThan(1_100);
  });

  it('keeps ICRS frame bias explicit at J2000', () => {
    const result = precessStellarDirectionToMeanOfDate({
      observedAtIso: '2000-01-01T12:00:00Z',
      rightAscensionDeg: 120,
      declinationDeg: 25,
      sourceFrame: 'icrs'
    });
    expect(result.angularShiftArcsec).toBeGreaterThan(0);
    expect(result.angularShiftArcsec).toBeLessThan(0.1);
  });

  it('requires an explicit timezone', () => {
    expect(() => precessStellarDirectionToMeanOfDate({
      observedAtIso: '2026-08-09T12:00:00',
      rightAscensionDeg: 120,
      declinationDeg: 25,
      sourceFrame: 'mean-j2000'
    })).toThrow(StellarPrecessionError);
  });
});
