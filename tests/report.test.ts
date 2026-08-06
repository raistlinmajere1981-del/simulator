import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { savedExperimentFixture } from './portable.test';

describe('experiment html report', () => {
  it('includes inputs, WGS84, vertical datum, all terrain points and model traces', () => {
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z'
    );

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Kıyı görünürlük deneyi');
    expect(html).toContain('WGS84 koordinat çözümü');
    expect(html).toContain('WGS84 Jeodezik Çözüm');
    expect(html).toContain('Başlangıç azimutu');
    expect(html).toContain('wgs84:fixture');
    expect(html).toContain('Düşey Referans ve Arazi');
    expect(html).toContain('Taşınabilir deney şeması v4');
    expect(html).toContain('Ortalama deniz seviyesi');
    expect(html).toContain('Datum / gelgit ofseti');
    expect(html).toContain('3 ara noktalı manuel profil');
    expect(html).toContain('Ara nokta 1');
    expect(html).toContain('Ara nokta 2');
    expect(html).toContain('Ara nokta 3');
    expect(html).toContain('%25');
    expect(html).toContain('%50');
    expect(html).toContain('%75');
    expect(html).toContain('8,5 m');
    expect(html).toContain('%51,92');
    expect(html).toContain('Görünür hedef oranı');
    expect(html).toContain('ideal-sphere:experiment-1:standard');
    expect(html).toContain('@media print');
  });

  it('uses manual distance to convert every route percentage', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      inputs: {
        ...savedExperimentFixture.inputs,
        distanceSource: 'manual',
        surfaceDistanceKm: 40
      },
      geodesic: undefined
    });

    expect(html).toContain('40 km');
    expect(html).toContain('10 km');
    expect(html).toContain('20 km');
    expect(html).toContain('30 km');
    expect(html).toContain('Manuel giriş');
    expect(html).not.toContain('Jeodezik hesap izi');
    expect(html).toContain('Düşey Referans ve Arazi');
  });

  it('describes the no-profile mode explicitly', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      inputs: {
        ...savedExperimentFixture.inputs,
        terrainMode: 'off'
      }
    });

    expect(html).toContain('Profil kapalı');
    expect(html).toContain('yalnızca gözlemci ve hedef zemin kotları kullanıldı');
  });

  it('falls back to the legacy single point when an old record has no point array', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      manualTerrainPoints: undefined
    });

    expect(html).toContain('1 ara noktalı manuel profil');
    expect(html).toContain('%50');
    expect(html).toContain('8,5 m');
  });

  it('escapes user-controlled text', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      name: '<script>alert("x")</script>'
    });

    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });
});
