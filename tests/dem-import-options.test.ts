import { describe, expect, it } from 'vitest';
import {
  requestedDemSampleCount
} from '../src/simulation/dem-import-options';

describe('DEM import options', () => {
  it('omits sample count in automatic mode', () => {
    expect(requestedDemSampleCount('automatic', 101)).toBeUndefined();
  });

  it('returns a validated manual sample count', () => {
    expect(requestedDemSampleCount('manual', 101)).toBe(101);
    expect(requestedDemSampleCount('manual', 3)).toBe(3);
    expect(requestedDemSampleCount('manual', 2_002)).toBe(2_002);
  });

  it('rejects non-integer and out-of-range manual counts', () => {
    expect(() => requestedDemSampleCount('manual', 2)).toThrow('3…2002');
    expect(() => requestedDemSampleCount('manual', 2_003)).toThrow('3…2002');
    expect(() => requestedDemSampleCount('manual', 10.5)).toThrow('tam sayı');
  });
});
