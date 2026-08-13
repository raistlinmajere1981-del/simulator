import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { normalizeUiLocale, uiLocaleTag } from '../src/shared/ui-locale';
import { savedExperimentFixture } from './portable.test';

describe('report core localization', () => {
  it('keeps the existing report API Turkish by default', () => {
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z'
    );

    expect(html).toContain('<html lang="tr">');
    expect(html).toContain('Deney Raporu');
    expect(html).toContain('WGS84 koordinat çözümü');
    expect(html).toContain('%51,92');
  });

  it('localizes the report shell, core result chrome and numeric presentation in English', () => {
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z',
      'en'
    );

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Experiment Report');
    expect(html).toContain('Geometric Observation Laboratory · Experiment Report');
    expect(html).toContain('Record id:');
    expect(html).toContain('Report generated:');
    expect(html).toContain('WGS84 coordinate solution');
    expect(html).toContain('Ideal Sphere');
    expect(html).toContain('Compatible with observation range');
    expect(html).toContain('<h3>Results</h3>');
    expect(html).toContain('<th>Metric</th><th>Value</th>');
    expect(html).toContain('<h3>Assumptions</h3>');
    expect(html).toContain('<h3>Calculation trace</h3>');
    expect(html).toContain('Trace id:');
    expect(html).toContain('51.92%');
  });

  it('does not rewrite stored trace evidence while localizing its surrounding chrome', () => {
    const prediction = savedExperimentFixture.predictions[0]!;
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z',
      'en'
    );

    expect(html).toContain(prediction.trace.summary);
    expect(html).toContain(prediction.traceId);
    for (const assumption of prediction.trace.assumptions) {
      expect(html).toContain(assumption);
    }
  });

  it('normalizes report IPC locale defensively', () => {
    expect(normalizeUiLocale('tr')).toBe('tr');
    expect(normalizeUiLocale('en')).toBe('en');
    expect(normalizeUiLocale('de')).toBe('tr');
    expect(normalizeUiLocale(undefined)).toBe('tr');
    expect(uiLocaleTag('tr')).toBe('tr-TR');
    expect(uiLocaleTag('en')).toBe('en-US');
  });
});
