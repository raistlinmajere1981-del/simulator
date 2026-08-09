import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

function experiment(): SavedExperiment {
  return {
    id: 'stellar-report-source',
    name: 'Skyline rapor testi',
    createdAtIso: '2026-08-09T20:00:00.000Z',
    updatedAtIso: '2026-08-09T20:00:00.000Z',
    observedAtIso: '2026-08-09T20:00:00.000Z',
    observationUtcOffsetMinutes: 180,
    scenarioId: 'stellar-observation',
    stellarLocalHorizonSource: {
      fileName: 'ridge.csv',
      importedAtIso: '2026-08-09T19:55:00.000Z',
      format: 'csv',
      pointCount: 4,
      maximumAzimuthGapDeg: 90,
      points: [
        { azimuthDeg: 0, altitudeDeg: 2 },
        { azimuthDeg: 90, altitudeDeg: 12 },
        { azimuthDeg: 180, altitudeDeg: 4 },
        { azimuthDeg: 270, altitudeDeg: 8 }
      ],
      warnings: ['Örnek skyline kaynak uyarısı'],
      fileSizeBytes: 256,
      sha256: 'c'.repeat(64),
      modifiedAfterImport: false
    },
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    manualTerrainPoints: [],
    modelVersions: {},
    predictions: []
  };
}

describe('stellar skyline HTML report', () => {
  it('renders source provenance without dumping the full point array', () => {
    const html = createExperimentHtmlReport(experiment(), '2026-08-09T21:00:00.000Z');
    expect(html).toContain('Yıldız yerel skyline dosya kaynağı');
    expect(html).toContain('ridge.csv');
    expect(html).toContain('4 nokta');
    expect(html).toContain('90°');
    expect(html).toContain('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc');
    expect(html).toContain('Örnek skyline kaynak uyarısı');
    expect(html).toContain('Katalog yıldızı, precession ve geometrik skyline izi');
    expect(html).not.toContain('azimuthDeg');
  });
});
