import { describe, expect, it } from 'vitest';
import { getStellarLocalHorizonDirectionLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('stellar local-horizon localization', () => {
  it('maps stable direction keys only at the renderer boundary', () => {
    const key = 'localHorizonNorthEastDeg' as const;
    expect(getStellarLocalHorizonDirectionLabel('tr', key)).toBe('KD');
    expect(getStellarLocalHorizonDirectionLabel('en', key)).toBe('NE');
    expect(key).toBe('localHorizonNorthEastDeg');
  });

  it('localizes source-ready presentation without changing source identity', () => {
    expect(translate('en', 'stellar.horizonEditor.demReady', { fileName: 'terrain.asc' }))
      .toBe('The DEM skyline draft “terrain.asc” is ready. Apply and calculate to attach it to the star trail.');
    const sourceFormat = 'dem' as const;
    expect(translate('en', 'stellar.horizonEditor.formatDem')).toBe('DEM · derived geometric');
    expect(sourceFormat).toBe('dem');
  });
});
