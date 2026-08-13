import { describe, expect, it } from 'vitest';
import type { LunarPhaseName } from '../src/simulation/lunar-position';
import {
  getEclipseGeometryFullLabel,
  getEclipseGeometryLabel,
  getLunarPhaseLabel
} from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('astronomy result localization', () => {
  it('localizes lunar phase presentation without changing the domain phase value', () => {
    const phase: LunarPhaseName = 'Dolunay';
    expect(getLunarPhaseLabel('tr', phase)).toBe('Dolunay');
    expect(getLunarPhaseLabel('en', phase)).toBe('Full Moon');
    expect(phase).toBe('Dolunay');
  });

  it('localizes eclipse geometry classes without changing their machine ids', () => {
    const geometryClass = 'total-type-contained' as const;
    expect(getEclipseGeometryLabel('tr', geometryClass)).toBe('Tam-tip iç kapsama');
    expect(getEclipseGeometryLabel('en', geometryClass)).toBe('Total-type containment');
    expect(getEclipseGeometryFullLabel('en', geometryClass)).toBe('Total-type instantaneous geometry');
    expect(geometryClass).toBe('total-type-contained');
  });

  it('localizes compass and eclipse search shell labels', () => {
    expect(translate('tr', 'compass.northShort')).toBe('K');
    expect(translate('en', 'compass.northShort')).toBe('N');
    expect(translate('en', 'eclipse.search.hours', { hours: 12 })).toBe('±12 hours');
    expect(translate('en', 'eclipse.search.scan')).toBe('Scan window');
  });
});
