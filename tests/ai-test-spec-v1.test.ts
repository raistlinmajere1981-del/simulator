import { describe, expect, it } from 'vitest';
import {
  buildExperimentSetupApplication,
  parseExperimentSetupText
} from '../src/shared/text-experiment-setup';

function candidate(text: string, fieldId: string) {
  return parseExperimentSetupText(text).candidates.find((item) => item.fieldId === fieldId);
}

const DALLAS = `GGL-AI-TEST v1
scenario: sun-moon-observation
name: 8 Nisan 2024 Dallas Güneş-Ay geometrisi
observed_at_utc: 2024-04-08T18:42:00Z
utc_offset: +00:00
observer.coordinates: 32.7767,-96.7970
target.coordinates: 32.7767,-66.7970
END GGL-AI-TEST`;

describe('GGL-AI-TEST v1 integration', () => {
  it('parses astronomy identity, time and coordinates and builds an application', () => {
    const draft = parseExperimentSetupText(DALLAS);
    expect(candidate(DALLAS, 'scenarioId')?.stringValue).toBe('sun-moon-observation');
    expect(candidate(DALLAS, 'experimentName')?.stringValue).toContain('Dallas');
    expect(candidate(DALLAS, 'observedAtUtc')?.stringValue).toBe('2024-04-08T18:42:00.000Z');
    expect(candidate(DALLAS, 'utcOffsetMinutes')?.numericValue).toBe(0);
    expect(candidate(DALLAS, 'observerCoordinates')?.latitudeDeg).toBeCloseTo(32.7767);
    expect(candidate(DALLAS, 'targetCoordinates')?.longitudeDeg).toBeCloseTo(-66.7970);

    const selected = draft.candidates.filter((item) => item.status === 'found').map((item) => item.id);
    const application = buildExperimentSetupApplication(draft, selected, '2026-08-11T10:00:00.000Z');
    expect(application.scenarioId).toBe('sun-moon-observation');
    expect(application.experimentName).toContain('Dallas');
    expect(application.observedAtIso).toBe('2024-04-08T18:42:00.000Z');
    expect(application.utcOffsetMinutes).toBe(0);
    expect(application.inputChanges.distanceSource).toBe('coordinates');
    expect(application.inputChanges.observerLatitudeDeg).toBeCloseTo(32.7767);
    expect(application.inputChanges.targetLongitudeDeg).toBeCloseTo(-66.7970);
  });

  it('accepts every current scenario id in the canonical contract', () => {
    const scenarios = [
      'target-visibility', 'horizon', 'long-distance-visibility', 'sun-moon-observation',
      'shadow-observation', 'stellar-observation', 'eclipse-simulation'
    ];
    for (const scenario of scenarios) {
      const text = `GGL-AI-TEST v1
scenario: ${scenario}
END GGL-AI-TEST`;
      expect(candidate(text, 'scenarioId')?.status).toBe('found');
      expect(candidate(text, 'scenarioId')?.stringValue).toBe(scenario);
    }
  });

  it('fails closed for non-Z timestamps and invalid UTC offsets', () => {
    const text = `GGL-AI-TEST v1
observed_at_utc: 2024-04-08T18:42:00+03:00
utc_offset: +15:00
END GGL-AI-TEST`;
    expect(candidate(text, 'observedAtUtc')?.status).toBe('review');
    expect(candidate(text, 'utcOffsetMinutes')?.status).toBe('review');
  });

  it('reports unknown keys instead of silently applying them', () => {
    const draft = parseExperimentSetupText(`GGL-AI-TEST v1
scenario: horizon
magic_curve: 42
END GGL-AI-TEST`);
    expect(draft.notes.some((note) => note.includes('magic_curve'))).toBe(true);
  });

  it('marks conflicting canonical values for the same field as review', () => {
    const text = `GGL-AI-TEST v1
surface_distance_km: 20
surface_distance_km: 22
END GGL-AI-TEST`;
    const distance = candidate(text, 'surfaceDistanceKm');
    expect(distance?.status).toBe('review');
    expect(distance?.reason).toContain('çelişen');
  });

  it('keeps profile atmosphere mode review-only because source data is missing', () => {
    const text = `GGL-AI-TEST v1
atmosphere_mode: profile
END GGL-AI-TEST`;
    const atmosphere = candidate(text, 'atmosphereMode');
    expect(atmosphere?.status).toBe('review');
    expect(atmosphere?.reason).toContain('provenans');
  });
});
