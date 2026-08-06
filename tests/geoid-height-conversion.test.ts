import { describe, expect, it } from 'vitest';
import { convertGeoidHeight } from '../src/simulation/geoid-height-conversion';

describe('geoid height conversion', () => {
  it('converts WGS84 ellipsoidal height to orthometric height', () => {
    const result = convertGeoidHeight({
      valueM: 120,
      from: 'ellipsoidal-wgs84',
      to: 'orthometric-msl',
      geoidUndulationM: 35
    });

    expect(result.valueM).toBe(85);
    expect(result.correctionM).toBe(-35);
    expect(result.signConvention).toBe('N = h - H');
    expect(result.trace.steps[1]?.formula).toBe('H = h - N');
  });

  it('converts orthometric height to WGS84 ellipsoidal height', () => {
    const result = convertGeoidHeight({
      valueM: 85,
      from: 'orthometric-msl',
      to: 'ellipsoidal-wgs84',
      geoidUndulationM: 35
    });

    expect(result.valueM).toBe(120);
    expect(result.correctionM).toBe(35);
    expect(result.trace.steps[1]?.formula).toBe('h = H + N');
  });

  it('handles negative geoid undulation with the same sign convention', () => {
    const result = convertGeoidHeight({
      valueM: 50,
      from: 'ellipsoidal-wgs84',
      to: 'orthometric-msl',
      geoidUndulationM: -20
    });

    expect(result.valueM).toBe(70);
    expect(result.correctionM).toBe(20);
  });

  it('leaves the value unchanged when both datums are the same', () => {
    const result = convertGeoidHeight({
      valueM: 42,
      from: 'orthometric-msl',
      to: 'orthometric-msl',
      geoidUndulationM: 30,
      valueUncertaintyM: 0.4,
      geoidUndulationUncertaintyM: 1
    });

    expect(result.valueM).toBe(42);
    expect(result.correctionM).toBe(0);
    expect(result.uncertaintyM).toBeCloseTo(0.4, 12);
    expect(result.warnings.some((warning) => warning.includes('aynı'))).toBe(true);
  });

  it('propagates independent height and geoid uncertainties', () => {
    const result = convertGeoidHeight({
      valueM: 120,
      from: 'ellipsoidal-wgs84',
      to: 'orthometric-msl',
      geoidUndulationM: 35,
      valueUncertaintyM: 0.3,
      geoidUndulationUncertaintyM: 0.4
    });

    expect(result.uncertaintyM).toBeCloseTo(0.5, 12);
    expect(result.trace.steps.at(-1)?.id).toBe('uncertainty');
  });

  it('does not invent an uncertainty when none is supplied', () => {
    const result = convertGeoidHeight({
      valueM: 10,
      from: 'orthometric-msl',
      to: 'ellipsoidal-wgs84',
      geoidUndulationM: 2
    });

    expect(result.uncertaintyM).toBeNull();
    expect(result.warnings.some((warning) => warning.includes('belirsizliği verilmedi')))
      .toBe(true);
  });

  it('rejects non-finite, out-of-range and negative uncertainty inputs', () => {
    expect(() => convertGeoidHeight({
      valueM: Number.NaN,
      from: 'orthometric-msl',
      to: 'ellipsoidal-wgs84',
      geoidUndulationM: 0
    })).toThrow('Yükseklik');
    expect(() => convertGeoidHeight({
      valueM: 0,
      from: 'orthometric-msl',
      to: 'ellipsoidal-wgs84',
      geoidUndulationM: 1_001
    })).toThrow('Jeoit ondülasyonu');
    expect(() => convertGeoidHeight({
      valueM: 0,
      from: 'orthometric-msl',
      to: 'ellipsoidal-wgs84',
      geoidUndulationM: 0,
      valueUncertaintyM: -0.1
    })).toThrow('belirsizliği');
  });
});
