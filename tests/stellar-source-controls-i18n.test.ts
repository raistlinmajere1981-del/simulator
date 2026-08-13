import { describe, expect, it } from 'vitest';
import { translate } from '../src/renderer/src/i18n';

describe('stellar source controls localization', () => {
  it('localizes stable stellar control labels', () => {
    expect(translate('tr', 'stellar.controls.catalogStar')).toBe('Katalog yıldızı');
    expect(translate('en', 'stellar.controls.catalogStar')).toBe('Catalog star');
    expect(translate('en', 'stellar.motion.import')).toBe('Load from BSC5P catalog file');
    expect(translate('en', 'stellar.refraction.diagnosticOnly')).toBe('Diagnostic · not local visibility');
  });

  it('interpolates source presentation without changing source identity', () => {
    expect(translate('en', 'stellar.motion.validated', { fileName: 'catalog.dat' }))
      .toBe('“catalog.dat” was verified. Apply and calculate to enable proper motion.');
  });
});
