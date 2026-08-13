import { describe, expect, it } from 'vitest';
import { appLocaleTag, translate } from '../src/renderer/src/i18n';

describe('terrain editor shell localization', () => {
  it('localizes the editor controls', () => {
    expect(translate('tr', 'terrain.editor.title')).toBe('Arazi yüksekliği noktaları');
    expect(translate('en', 'terrain.editor.title')).toBe('Terrain elevation points');
    expect(translate('en', 'terrain.editor.demSamplingBilinear')).toBe('Bilinear');
    expect(translate('en', 'terrain.editor.demImport')).toBe('Import from DEM');
  });

  it('localizes point accessibility and number locale selection', () => {
    expect(translate('en', 'terrain.points.pointAria', {
      percent: '42.5', elevation: '125.25'
    })).toBe('Terrain point: route 42.5 percent, elevation 125.25 meters');
    expect(translate('en', 'terrain.points.delete')).toBe('Delete');
    expect(appLocaleTag('tr')).toBe('tr-TR');
    expect(appLocaleTag('en')).toBe('en-US');
  });
});
