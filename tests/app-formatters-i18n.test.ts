import { describe, expect, it } from 'vitest';
import {
  bearingFormatterFor,
  coordinateFormatterFor,
  formatDifference,
  formatPercent,
  formatPercentValue,
  formatSignedPercentValue,
  getStatusLabel,
  numberFormatterFor
} from '../src/renderer/src/app/app-formatters';

describe('locale-aware renderer formatters', () => {
  it('uses locale-specific decimal separators without changing numeric values', () => {
    expect(numberFormatterFor('tr').format(12.5)).toBe('12,5');
    expect(numberFormatterFor('en').format(12.5)).toBe('12.5');
    expect(coordinateFormatterFor('tr').format(41.0082)).toBe('41,0082');
    expect(coordinateFormatterFor('en').format(41.0082)).toBe('41.0082');
    expect(bearingFormatterFor('en').format(123.4567)).toBe('123.457');
  });

  it('keeps Turkish percent presentation compatible while using English suffix style', () => {
    expect(formatPercentValue(42.5, 'tr')).toBe('%42,5');
    expect(formatPercentValue(42.5, 'en')).toBe('42.5%');
    expect(formatSignedPercentValue(2.5, 'tr')).toBe('±%2,5');
    expect(formatSignedPercentValue(2.5, 'en')).toBe('±2.5%');
    expect(formatPercent(0.425, 'en')).toBe('42.5%');
  });

  it('keeps legacy Turkish defaults while allowing localized difference labels', () => {
    expect(formatPercent(0.425)).toBe('%42,5');
    expect(formatDifference(1.25)).toBe('1,25 puan');
    expect(formatDifference(1.25, 'en')).toBe('1.25 pp');
  });

  it('localizes result status labels without changing status ids', () => {
    expect(getStatusLabel('tr', 'compatible')).toBe('Gözlem aralığıyla uyumlu');
    expect(getStatusLabel('en', 'compatible')).toBe('Compatible with observation range');
    expect(getStatusLabel('en', 'unsupported')).toBe('Physical model rules are undefined');
  });
});
