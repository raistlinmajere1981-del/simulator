import { describe, expect, it } from 'vitest';
import {
  calculateStellarAtmosphericRefraction,
  StellarAtmosphericRefractionError
} from '../src/simulation/stellar-atmospheric-refraction';

describe('stellar atmospheric refraction', () => {
  it('uses zero correction in the NOAA 85°–90° region', () => {
    const result = calculateStellarAtmosphericRefraction(90);
    expect(result.branch).toBe('zenith-negligible');
    expect(result.refractionCorrectionDeg).toBe(0);
    expect(result.apparentAltitudeDeg).toBe(90);

    expect(calculateStellarAtmosphericRefraction(85).refractionCorrectionDeg).toBe(0);
  });

  it('matches the NOAA high-altitude rational expression at 45° and 10°', () => {
    const at45 = calculateStellarAtmosphericRefraction(45);
    expect(at45.branch).toBe('high-altitude-rational');
    expect(at45.refractionCorrectionDeg).toBeCloseTo(0.016119468333333338, 12);
    expect(at45.apparentAltitudeDeg).toBeCloseTo(45.01611946833333, 12);

    const at10 = calculateStellarAtmosphericRefraction(10);
    expect(at10.refractionCorrectionDeg).toBeCloseTo(0.08812151941446983, 12);
  });

  it('matches the NOAA near-horizon polynomial at geometric altitude 0°', () => {
    const result = calculateStellarAtmosphericRefraction(0);
    expect(result.branch).toBe('near-horizon-polynomial');
    expect(result.refractionCorrectionDeg).toBeCloseTo(1735 / 3600, 14);
    expect(result.refractionCorrectionArcmin).toBeCloseTo(28.916666666666668, 12);
    expect(result.apparentAltitudeDeg).toBeCloseTo(0.48194444444444445, 14);
    expect(result.aboveApparentAstronomicalHorizon).toBe(true);
  });

  it('places the NOAA -0.575° branch boundary almost exactly on the apparent horizon', () => {
    const result = calculateStellarAtmosphericRefraction(-0.575);
    expect(result.branch).toBe('near-horizon-polynomial');
    expect(result.refractionCorrectionDeg).toBeCloseTo(0.5749057903809679, 12);
    expect(result.apparentAltitudeDeg).toBeCloseTo(-0.0000942096190320596, 12);
    expect(result.aboveApparentAstronomicalHorizon).toBe(false);
  });

  it('uses the below-horizon tangent expression below -0.575°', () => {
    const result = calculateStellarAtmosphericRefraction(-1);
    expect(result.branch).toBe('below-horizon-tangent');
    expect(result.refractionCorrectionDeg).toBeCloseTo(0.33059490636594346, 12);
    expect(result.apparentAltitudeDeg).toBeCloseTo(-0.6694050936340565, 12);
    expect(result.aboveApparentAstronomicalHorizon).toBe(false);
  });

  it('keeps provenance and limitation warnings explicit', () => {
    const result = calculateStellarAtmosphericRefraction(5);
    expect(result.trace.summary).toContain('NOAA');
    expect(result.warnings.some((warning) => warning.includes('basınç'))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('skyline'))).toBe(true);
    expect(result.trace.steps).toHaveLength(2);
  });

  it('rejects non-finite and out-of-range geometric altitudes', () => {
    expect(() => calculateStellarAtmosphericRefraction(Number.NaN)).toThrow(StellarAtmosphericRefractionError);
    expect(() => calculateStellarAtmosphericRefraction(90.001)).toThrow('-90°');
    expect(() => calculateStellarAtmosphericRefraction(-90.001)).toThrow('-90°');
  });
});
