import { describe, expect, it } from 'vitest';
import { getStellarHorizonClassLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('shadow and stellar localization', () => {
  it('localizes shadow and dual-shadow presentation labels', () => {
    expect(translate('tr', 'shadow.title')).toBe('Dikey gnomon gölge geometrisi');
    expect(translate('en', 'shadow.title')).toBe('Vertical-gnomon shadow geometry');
    expect(translate('en', 'dualShadow.enable')).toBe('Add second point');
  });

  it('localizes stellar horizon classes without changing their stable id', () => {
    const horizonClass = 'rises-and-sets' as const;
    expect(getStellarHorizonClassLabel('tr', horizonClass)).toBe('Doğar ve batar');
    expect(getStellarHorizonClassLabel('en', horizonClass)).toBe('Rises and sets');
    expect(horizonClass).toBe('rises-and-sets');
  });

  it('localizes stellar sky/result shell labels while keeping machine terminology intact', () => {
    expect(translate('en', 'stellar.results.catalogJ2000')).toBe('Catalog · J2000');
    expect(translate('en', 'stellar.sky.title')).toBe('Multi-star sky · geometric');
    expect(translate('en', 'stellar.results.standardApparent')).toBe('Standard apparent');
  });
});
