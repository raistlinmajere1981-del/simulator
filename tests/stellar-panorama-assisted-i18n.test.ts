import { describe, expect, it } from 'vitest';
import { getStellarPanoramaMarkingMethodLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('stellar panorama assisted-marking localization', () => {
  it('maps stable marking-method ids only at the renderer boundary', () => {
    const method = 'assisted-gradient-v1-edited' as const;
    expect(getStellarPanoramaMarkingMethodLabel('tr', method)).toBe('Yardımcı gradyan taslağı · elle düzenlendi');
    expect(getStellarPanoramaMarkingMethodLabel('en', method)).toBe('Assisted gradient draft · manually edited');
    expect(method).toBe('assisted-gradient-v1-edited');
  });

  it('localizes assisted-draft and readiness presentation', () => {
    expect(translate('en', 'stellar.panorama.assist.generated', { count: 72, confidence: '83%' }))
      .toBe('Assisted skyline draft generated (72 points · confidence 83%). Inspect the line and explicitly accept it before it can enter the calculation.');
    expect(translate('en', 'stellar.panorama.needMarks')).toBe('At least 8 skyline points are required.');
    expect(translate('en', 'stellar.panorama.prepare')).toBe('Prepare panorama skyline');
  });
});
