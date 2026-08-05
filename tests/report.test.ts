import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { savedExperimentFixture } from './portable.test';

describe('experiment html report', () => {
  it('includes inputs, WGS84 geodesic results and model traces', () => {
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
    expect(html).toContain('%51,92');
    expect(html).toContain('Görünür hedef oranı');
    expect(html).toContain('ideal-sphere:experiment-1:standard');
    expect(html).toContain('@media print');
  });

  it('uses manual distance without a geodesic section', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      inputs: {
        ...savedExperimentFixture.inputs,
        distanceSource: 'manual',
        surfaceDistanceKm: 33.5
      },
      geodesic: undefined
    });

    expect(html).toContain('33,5 km');
    expect(html).toContain('Manuel giriş');
    expect(html).not.toContain('Jeodezik hesap izi');
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
