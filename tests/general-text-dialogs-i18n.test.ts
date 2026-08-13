import { describe, expect, it } from 'vitest';
import { parseExperimentSetupText } from '../src/shared/text-experiment-setup';
import { translate } from '../src/renderer/src/i18n';
import {
  textSetupCandidateDisplayValue,
  textSetupCandidateReason,
  textSetupFieldLabel,
  textSetupNote,
  textSetupStatusLabel
} from '../src/renderer/src/text-experiment-setup-presentation';

describe('general/text dialog localization', () => {
  it('contains localized dialog shell strings', () => {
    expect(translate('tr', 'dialog.data.title')).toBe('Kaydedilen Deneyler');
    expect(translate('en', 'dialog.data.title')).toBe('Saved Experiments');
    expect(translate('tr', 'textSetup.title')).toBe('Metinden deney hazırla');
    expect(translate('en', 'textSetup.title')).toBe('Prepare experiment from text');
  });

  it('maps stable field/status ids to localized presentation', () => {
    expect(textSetupFieldLabel('tr', 'surfaceDistanceKm')).toBe('Yüzey mesafesi');
    expect(textSetupFieldLabel('en', 'surfaceDistanceKm')).toBe('Surface distance');
    expect(textSetupStatusLabel('tr', 'review')).toBe('KONTROL GEREKLİ');
    expect(textSetupStatusLabel('en', 'review')).toBe('REVIEW REQUIRED');
  });

  it('formats parser candidate numbers for the active locale without changing parser ids', () => {
    const draft = parseExperimentSetupText('Mesafe 34,2 km. Standart kırılma k=0,13 kullan.');
    const distance = draft.candidates.find((candidate) => candidate.fieldId === 'surfaceDistanceKm')!;
    const refraction = draft.candidates.find((candidate) => candidate.fieldId === 'refractionCoefficient')!;
    expect(distance.fieldId).toBe('surfaceDistanceKm');
    expect(textSetupCandidateDisplayValue('tr', distance)).toBe('34,2 km');
    expect(textSetupCandidateDisplayValue('en', distance)).toBe('34.2 km');
    expect(textSetupCandidateDisplayValue('tr', refraction)).toBe('k=0,13');
    expect(textSetupCandidateDisplayValue('en', refraction)).toBe('k=0.13');
  });

  it('localizes renderer presentation of parser reasons/notes while keeping raw parser output untouched', () => {
    const review = parseExperimentSetupText('Göz yüksekliği 2.').candidates.find((candidate) => candidate.fieldId === 'observerHeightM')!;
    expect(review.reason).toContain('birim');
    expect(textSetupCandidateReason('en', review.reason)).toBe('A unit must be specified for this field.');

    const coordinateDraft = parseExperimentSetupText('Gözlemci koordinatı: 41.0082, 28.9784. Hedef koordinatı: 39.9334, 32.8597.');
    const note = coordinateDraft.notes.find((item) => item.includes('WGS84'))!;
    expect(note).toContain('Koordinat alanı');
    expect(textSetupNote('en', note)).toBe('Applying a coordinate field automatically switches the distance source to WGS84 coordinate mode.');
  });

  it('keeps canonical GGL-AI protocol tokens unchanged', () => {
    expect('GGL-AI-TEST v1').toBe('GGL-AI-TEST v1');
    expect('GGL-AI-ANALYSIS v1').toBe('GGL-AI-ANALYSIS v1');
    expect('GGL-AI-COMPARISON v1').toBe('GGL-AI-COMPARISON v1');
  });
});
