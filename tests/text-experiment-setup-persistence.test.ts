import { describe, expect, it } from 'vitest';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

function experiment(): SavedExperiment {
  return {
    id: 'text-setup-test',
    name: 'Metinden hazırlanan deney',
    createdAtIso: '2026-08-08T12:00:00.000Z',
    updatedAtIso: '2026-08-08T12:05:00.000Z',
    scenarioId: 'target-visibility',
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    photoModelUncertainty: {
      combination: 'linear-conservative',
      surfaceDistanceM: 20
    },
    textSetupHistory: [{
      parserVersion: '0.1.0',
      sourceText: 'Mesafe 25 km. Mesafe belirsizliği yaklaşık ±20 m. Standart kırılma k=0,13.',
      appliedAtIso: '2026-08-08T12:01:00.000Z',
      appliedFields: [
        { fieldId: 'surfaceDistanceKm', displayValue: '25 km', sourceExcerpt: 'Mesafe 25 km' },
        { fieldId: 'surfaceDistanceUncertaintyM', displayValue: '±20 m', sourceExcerpt: 'Mesafe belirsizliği yaklaşık ±20 m' },
        { fieldId: 'refractionCoefficient', displayValue: 'k=0,13', sourceExcerpt: 'k=0,13' }
      ]
    }],
    modelVersions: {},
    predictions: []
  };
}

describe('text experiment setup persistence', () => {
  it('round-trips user-approved parser provenance through portable JSON', () => {
    const portable = createPortableExperimentFile(experiment(), '1.7.0', '2026-08-08T12:10:00.000Z');
    const parsed = parsePortableExperimentFile(portable).experiment;
    expect(parsed.textSetupHistory).toEqual(experiment().textSetupHistory);
  });

  it('preserves text-applied model uncertainty even when no photo calibration exists', () => {
    const portable = createPortableExperimentFile(experiment(), '1.7.0', '2026-08-08T12:10:00.000Z');
    const parsed = parsePortableExperimentFile(portable).experiment;
    expect(parsed.photoCalibration).toBeUndefined();
    expect(parsed.photoModelUncertainty).toEqual({
      combination: 'linear-conservative',
      surfaceDistanceM: 20
    });
  });

  it('renders escaped source provenance into the offline HTML report', () => {
    const source = experiment();
    source.textSetupHistory![0]!.sourceText = '<script>alert(1)</script> Mesafe 25 km';
    const report = createExperimentHtmlReport(source, '2026-08-08T12:10:00.000Z');
    expect(report).toContain('Metinden deney hazırlama provenansı');
    expect(report).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(report).not.toContain('<script>alert(1)</script>');
  });

  it('rejects malformed or oversized parser provenance', () => {
    const portable = createPortableExperimentFile(experiment(), '1.7.0');
    const tampered = structuredClone(portable) as unknown as { experiment: { textSetupHistory: unknown } };
    tampered.experiment.textSetupHistory = [{
      parserVersion: '0.1.0',
      sourceText: 'x'.repeat(10_001),
      appliedAtIso: '2026-08-08T12:01:00.000Z',
      appliedFields: []
    }];
    expect(() => parsePortableExperimentFile(tampered)).toThrow();
  });
});
