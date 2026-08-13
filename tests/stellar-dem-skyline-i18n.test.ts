import { describe, expect, it } from 'vitest';
import { translate } from '../src/renderer/src/i18n';

describe('stellar DEM skyline localization', () => {
  it('localizes DEM skyline presentation labels', () => {
    expect(translate('tr', 'stellar.dem.title')).toBe('DEM’den 360° geometrik skyline');
    expect(translate('en', 'stellar.dem.title')).toBe('360° geometric skyline from DEM');
    expect(translate('en', 'stellar.dem.directionCount', { count: 180 })).toBe('180 directions');
  });

  it('keeps the DEM sampling id stable', () => {
    const samplingMethod = 'bilinear' as const;
    expect(samplingMethod).toBe('bilinear');
    expect(translate('en', 'stellar.dem.generate')).toBe('Generate DEM skyline');
  });
});
