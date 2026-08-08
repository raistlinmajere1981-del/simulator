import { describe, expect, it } from 'vitest';
import {
  buildExperimentSetupApplication,
  parseExperimentSetupText
} from '../src/shared/text-experiment-setup';

function foundByField(text: string, fieldId: string) {
  return parseExperimentSetupText(text).candidates.find(
    (candidate) => candidate.fieldId === fieldId
  );
}

describe('text experiment setup parser', () => {
  it('extracts the roadmap example without mutating any UI state', () => {
    const draft = parseExperimentSetupText(
      'Gözlemci deniz seviyesinden 12 m yüksekte, kamera yerden 1,7 m. ' +
      'Hedef 34,2 km uzakta ve 42 m yüksekliğinde. Standart kırılma k=0,13 kullan. ' +
      'Mesafe belirsizliği yaklaşık ±20 m.'
    );

    expect(foundByField(draft.sourceText, 'observerGroundElevationM')?.numericValue).toBe(12);
    expect(foundByField(draft.sourceText, 'observerHeightM')?.numericValue).toBe(1.7);
    expect(foundByField(draft.sourceText, 'surfaceDistanceKm')?.numericValue).toBe(34.2);
    expect(foundByField(draft.sourceText, 'targetHeightM')?.numericValue).toBe(42);
    expect(foundByField(draft.sourceText, 'atmosphereMode')?.stringValue).toBe('standard');
    expect(foundByField(draft.sourceText, 'refractionCoefficient')?.numericValue).toBe(0.13);
    expect(foundByField(draft.sourceText, 'surfaceDistanceUncertaintyM')?.numericValue).toBe(20);
  });

  it('converts centimetres and metres without guessing absent units', () => {
    const draft = parseExperimentSetupText('Kamera yerden 170 cm. Göz yüksekliği 2.');
    const found = draft.candidates.find((candidate) => candidate.fieldId === 'observerHeightM');
    expect(found?.status).toBe('review');
    expect(found?.reason).toContain('birim');

    const unambiguous = parseExperimentSetupText('Kamera yerden 170 cm.');
    expect(unambiguous.candidates.find((candidate) => candidate.fieldId === 'observerHeightM')?.numericValue).toBe(1.7);
  });

  it('marks conflicting values for the same field as review', () => {
    const draft = parseExperimentSetupText('Mesafe 20 km. Mesafe 22 km.');
    const distance = draft.candidates.find((candidate) => candidate.fieldId === 'surfaceDistanceKm');
    expect(distance?.status).toBe('review');
    expect(distance?.reason).toContain('çelişen');
  });

  it('extracts coordinate pairs and switches the application to coordinate distance', () => {
    const draft = parseExperimentSetupText(
      'Gözlemci koordinatı: 41.0082, 28.9784. Hedef koordinatı: 39.9334, 32.8597.'
    );
    const selected = draft.candidates.filter((candidate) => candidate.status === 'found').map((candidate) => candidate.id);
    const application = buildExperimentSetupApplication(draft, selected, '2026-08-08T12:00:00.000Z');
    expect(application.inputChanges.distanceSource).toBe('coordinates');
    expect(application.inputChanges.observerLatitudeDeg).toBeCloseTo(41.0082);
    expect(application.inputChanges.observerLongitudeDeg).toBeCloseTo(28.9784);
    expect(application.inputChanges.targetLatitudeDeg).toBeCloseTo(39.9334);
    expect(application.inputChanges.targetLongitudeDeg).toBeCloseTo(32.8597);
  });

  it('does not apply review or unavailable candidates', () => {
    const draft = parseExperimentSetupText(
      'Katmanlı atmosfer kullan. Yatay FOV 60°. Su seviyesi 0,4 m.'
    );
    expect(draft.candidates.some((candidate) => candidate.status === 'review')).toBe(true);
    expect(draft.candidates.filter((candidate) => candidate.status === 'unavailable')).toHaveLength(2);

    const application = buildExperimentSetupApplication(
      draft,
      draft.candidates.map((candidate) => candidate.id),
      '2026-08-08T12:00:00.000Z'
    );
    expect(application.atmosphereMode).toBeUndefined();
    expect(application.inputChanges).toEqual({});
  });

  it('applies only explicitly selected found fields and preserves source provenance', () => {
    const draft = parseExperimentSetupText(
      'Uzun mesafe görüş. Mesafe 25 km. Hedef 30 m yüksekliğinde. k=0,12.'
    );
    const distance = draft.candidates.find((candidate) => candidate.fieldId === 'surfaceDistanceKm')!;
    const targetHeight = draft.candidates.find((candidate) => candidate.fieldId === 'targetHeightM')!;
    const application = buildExperimentSetupApplication(
      draft,
      [distance.id, targetHeight.id],
      '2026-08-08T12:00:00.000Z'
    );

    expect(application.scenarioId).toBeUndefined();
    expect(application.inputChanges.surfaceDistanceKm).toBe(25);
    expect(application.inputChanges.targetHeightM).toBe(30);
    expect(application.inputChanges.refractionCoefficient).toBeUndefined();
    expect(application.provenance.sourceText).toContain('Uzun mesafe görüş');
    expect(application.provenance.appliedFields).toHaveLength(2);
  });
});
