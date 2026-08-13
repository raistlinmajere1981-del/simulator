import { describe, expect, it } from 'vitest';
import {
  defaultExperimentName,
  getDatumLabel,
  getScenarioPresentation,
  getSidebarModelLabel
} from '../src/renderer/src/app/app-config';

describe('localized renderer scenario presentation', () => {
  it('keeps scenario ids stable while localizing their human presentation', () => {
    expect(getScenarioPresentation('tr', 'horizon')).toEqual({
      label: 'Ufuk Analizi',
      description: 'Gözlemci kotu ve atmosfer varsayımından geometrik ufuk mesafesini hesaplar.'
    });
    expect(getScenarioPresentation('en', 'horizon')).toEqual({
      label: 'Horizon Analysis',
      description: 'Calculates geometric horizon distance from observer elevation and the atmosphere assumption.'
    });
  });

  it('uses the selected locale for generated default experiment names', () => {
    const instant = new Date('2026-08-13T10:00:00.000Z');
    expect(defaultExperimentName('stellar-observation', 'tr', instant)).toMatch(/^Yıldız Gözlemleri /);
    expect(defaultExperimentName('stellar-observation', 'en', instant)).toMatch(/^Stellar Observations /);
  });

  it('preserves existing Turkish model metadata labels while supplying English sidebar labels', () => {
    expect(getSidebarModelLabel('tr', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Mevcut Türkçe Ad');
    expect(getSidebarModelLabel('en', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Ideal Sphere');
    expect(getSidebarModelLabel('en', 'unknown-model', 'Custom Model')).toBe('Custom Model');
  });

  it('localizes vertical datum presentation without changing persisted datum ids', () => {
    expect(getDatumLabel('tr', 'orthometric-msl')).toBe('Ortalama deniz seviyesi');
    expect(getDatumLabel('en', 'orthometric-msl')).toBe('Mean sea level');
    expect(getDatumLabel('en', 'ellipsoidal-wgs84')).toBe('WGS84 ellipsoidal height');
    expect(getDatumLabel('en', 'local')).toBe('Local vertical reference');
  });
});
