import { describe, expect, it } from 'vitest';
import {
  calculateStellarApparentDiagnostic,
  StellarApparentDiagnosticError
} from '../src/simulation/stellar-apparent-diagnostic';
import type { StellarLocalHorizonMask } from '../src/simulation/stellar-local-horizon';

function flatMask(altitudeDeg: number): StellarLocalHorizonMask {
  return {
    sourceKind: 'manual',
    sourceLabel: `Düz ${altitudeDeg}° test skyline`,
    points: [
      { azimuthDeg: 0, altitudeDeg },
      { azimuthDeg: 120, altitudeDeg },
      { azimuthDeg: 240, altitudeDeg }
    ]
  };
}

describe('stellar apparent diagnostic', () => {
  it('keeps geometric and apparent astronomical altitude separate at 0°', () => {
    const result = calculateStellarApparentDiagnostic({
      geometricAltitudeDeg: 0,
      azimuthDeg: 90
    });

    expect(result.geometricAltitudeDeg).toBe(0);
    expect(result.refraction.refractionCorrectionArcmin).toBeCloseTo(28.9166666667, 9);
    expect(result.refraction.apparentAltitudeDeg).toBeCloseTo(0.4819444444, 9);
    expect(result.refraction.aboveApparentAstronomicalHorizon).toBe(true);
    expect(result.localHorizon).toBeNull();
    expect(result.localComparisonKind).toBe('no-local-skyline');
    expect(result.localVisibilityClassified).toBe(false);
  });

  it('reports a valid geometric clearance against a geometric skyline', () => {
    const result = calculateStellarApparentDiagnostic({
      geometricAltitudeDeg: 12,
      azimuthDeg: 75,
      localHorizonMask: flatMask(5),
      label: 'Test yıldızı'
    });

    expect(result.localHorizon?.localHorizonAltitudeDeg).toBeCloseTo(5, 12);
    expect(result.geometricLocalClearanceDeg).toBeCloseTo(7, 12);
    expect(result.localHorizon?.status).toBe('above');
    expect(result.starOnlyApparentMinusGeometricSkylineDeg).toBeGreaterThan(7);
    expect(result.localComparisonKind).toBe('mixed-reference-diagnostic');
    expect(result.localVisibilityClassified).toBe(false);
  });

  it('does not turn a mixed-reference sign reversal into a visibility boolean', () => {
    const result = calculateStellarApparentDiagnostic({
      geometricAltitudeDeg: -0.3,
      azimuthDeg: 180,
      localHorizonMask: flatMask(0)
    });

    expect(result.geometricLocalClearanceDeg).toBeCloseTo(-0.3, 12);
    expect(result.localHorizon?.status).toBe('below');
    expect(result.refraction.apparentAltitudeDeg).toBeGreaterThan(0);
    expect(result.starOnlyApparentMinusGeometricSkylineDeg).toBeGreaterThan(0);
    expect(result.localVisibilityClassified).toBe(false);
    expect(result.warnings.join(' ')).toContain('karma referanslı');
  });

  it('preserves the same skyline interpolation used by the geometric local-horizon engine', () => {
    const mask: StellarLocalHorizonMask = {
      sourceKind: 'external',
      sourceLabel: 'Eğimli skyline',
      points: [
        { azimuthDeg: 0, altitudeDeg: 0 },
        { azimuthDeg: 90, altitudeDeg: 9 },
        { azimuthDeg: 180, altitudeDeg: 0 },
        { azimuthDeg: 270, altitudeDeg: 0 }
      ]
    };
    const result = calculateStellarApparentDiagnostic({
      geometricAltitudeDeg: 10,
      azimuthDeg: 45,
      localHorizonMask: mask
    });

    expect(result.localHorizon?.localHorizonAltitudeDeg).toBeCloseTo(4.5, 12);
    expect(result.geometricLocalClearanceDeg).toBeCloseTo(5.5, 12);
  });

  it('requires azimuth when a local skyline is requested', () => {
    expect(() => calculateStellarApparentDiagnostic({
      geometricAltitudeDeg: 10,
      azimuthDeg: null,
      localHorizonMask: flatMask(0)
    })).toThrow(StellarApparentDiagnosticError);
  });

  it('keeps an explicit trace warning that local apparent visibility is not classified', () => {
    const result = calculateStellarApparentDiagnostic({
      geometricAltitudeDeg: 1,
      azimuthDeg: 270,
      localHorizonMask: flatMask(0)
    });

    expect(result.trace.summary).toContain('karma');
    expect(result.trace.steps.some((step) => step.id === 'mixed-reference-difference')).toBe(true);
    expect(result.trace.assumptions.join(' ')).toContain('yerel optik görünürlük sınıfı değildir');
  });
});
