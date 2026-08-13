import { describe, expect, it } from 'vitest';
import { getStellarPanoramaMetadataStatusLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('stellar panorama source/geometry localization', () => {
  it('maps stable metadata status ids only at the renderer boundary', () => {
    const status = 'unsupported-projection' as const;
    expect(getStellarPanoramaMetadataStatusLabel('tr', status, false, 'cylindrical'))
      .toBe('GPano · desteklenmeyen projeksiyon (cylindrical)');
    expect(getStellarPanoramaMetadataStatusLabel('en', status, false, 'cylindrical'))
      .toBe('GPano · unsupported projection (cylindrical)');
    expect(status).toBe('unsupported-projection');
  });

  it('localizes geometry presentation without changing geometry-source identity', () => {
    const geometrySource = 'gpano-xmp' as const;
    expect(translate('en', 'stellar.panorama.geometryManual')).toBe('Manual geometry');
    expect(translate('en', 'stellar.panorama.xmpSummary', { standard: 'present', extended: 'absent' }))
      .toBe('Standard XMP present · Extended XMP absent');
    expect(geometrySource).toBe('gpano-xmp');
  });
});
