import { describe, expect, it } from 'vitest';
import { translate } from '../src/renderer/src/i18n';
import {
  emptyDraft,
  formatAngle,
  formatBytes,
  markLabel,
  markShortLabel,
  markSummary,
  buildPhotoCalibrationCandidate
} from '../src/renderer/src/photo-calibration-state';

describe('photo calibration localization', () => {
  it('localizes calibration and uncertainty presentation', () => {
    expect(translate('tr', 'photo.calibration.eyebrow'))
      .toBe('Fotoğraf / kamera kalibrasyonu');
    expect(translate('en', 'photo.calibration.eyebrow'))
      .toBe('Photo / camera calibration');
    expect(translate('en', 'photo.uncertainty.linear'))
      .toBe('Conservative linear sum');
    expect(translate('en', 'photo.comparison.status.compatible'))
      .toBe('Compatible');
  });

  it('maps stable mark keys to locale-specific presentation', () => {
    expect(markLabel('tr', 'targetBase')).toBe('Hedef tabanı');
    expect(markLabel('en', 'targetBase')).toBe('Target base');
    expect(markShortLabel('tr', 'targetTop')).toBe('TEPE');
    expect(markShortLabel('en', 'targetTop')).toBe('TOP');
  });

  it('formats human photo values using the active locale', () => {
    expect(formatAngle('tr', 12.5, 0.25)).toBe('12,5000° ±0,2500°');
    expect(formatAngle('en', 12.5, 0.25)).toBe('12.5000° ±0.2500°');
    expect(formatBytes('tr', 1536)).toBe('1,5 KiB');
    expect(formatBytes('en', 1536)).toBe('1.5 KiB');
    expect(markSummary('tr', { xPx: 1234.5, yPx: 678.9 }))
      .toBe('1.234,5, 678,9 px');
    expect(markSummary('en', { xPx: 1234.5, yPx: 678.9 }))
      .toBe('1,234.5, 678.9 px');
  });

  it('localizes renderer-owned candidate validation without changing domain keys', () => {
    const draft = emptyDraft();
    draft.source = {
      fileName: 'test.jpg',
      fileSizeBytes: 1000,
      sha256: 'a'.repeat(64),
      mimeType: 'image/jpeg',
      imageWidthPx: 1000,
      imageHeightPx: 500,
      importedAtIso: '2026-01-01T00:00:00.000Z'
    };
    draft.marks = {
      horizonStart: { xPx: 100, yPx: 250 },
      horizonEnd: { xPx: 900, yPx: 250 },
      targetBase: { xPx: 500, yPx: 300 },
      targetTop: { xPx: 500, yPx: 200 }
    };
    draft.defaultMarkUncertaintyPx = 'not-a-number';
    const touched = new Set(['horizonStart', 'horizonEnd', 'targetBase', 'targetTop'] as const);

    expect(buildPhotoCalibrationCandidate(draft, 'exp', touched, 'tr').error)
      .toBe('İşaret belirsizliği sayısal olmalı.');
    expect(buildPhotoCalibrationCandidate(draft, 'exp', touched, 'en').error)
      .toBe('Mark uncertainty must be numeric.');
    expect([...touched]).toEqual(['horizonStart', 'horizonEnd', 'targetBase', 'targetTop']);
  });
});
