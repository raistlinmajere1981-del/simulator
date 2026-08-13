import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import { savedExperimentFixture } from './portable.test';

function stellarSourceExperiment(): SavedExperiment {
  return {
    id: 'stellar-source-i18n',
    name: 'Skyline report',
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
      warnings: ['RAW-SOURCE-WARNING · ölçüm metni'],
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

describe('report terrain and provenance localization', () => {
  it('preserves the Turkish terrain report as the default', () => {
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z'
    );

    expect(html).toContain('WGS84 Jeodezik Çözüm');
    expect(html).toContain('Düşey Referans ve Arazi');
    expect(html).toContain('Ortalama deniz seviyesi');
    expect(html).toContain('3 ara noktalı manuel profil');
    expect(html).toContain('Ara nokta 1');
    expect(html).toContain('%25');
    expect(html).toContain('8,5 m');
    expect(html).toContain('Profil kaynağı ve provenans');
    expect(html).toContain('Kayıt, içe aktarılan kaynakla eşleşiyor');
  });

  it('localizes geodesic, terrain and source provenance sections in English', () => {
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z',
      'en'
    );

    expect(html).toContain('WGS84 Geodesic Solution');
    expect(html).toContain('Initial bearing');
    expect(html).toContain('Vertical Reference and Terrain');
    expect(html).toContain('Portable experiment schema v12');
    expect(html).toContain('Mean sea level');
    expect(html).toContain('Datum / tide offset');
    expect(html).toContain('3 point manual profile');
    expect(html).toContain('Point 1');
    expect(html).toContain('25%');
    expect(html).toContain('8.5 m');
    expect(html).toContain('Profile source and provenance');
    expect(html).toContain('Source file size');
    expect(html).toContain('128 bytes');
    expect(html).toContain('Route percentage');
    expect(html).toContain('Applied to experiment: Yes');
    expect(html).toContain('Record matches imported source');
    expect(html).toContain('terrain-profile.csv');
    expect(html).toContain(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('localizes stellar source chrome but keeps imported warnings and integrity evidence raw', () => {
    const experiment = stellarSourceExperiment();
    const html = createExperimentHtmlReport(
      experiment,
      '2026-08-09T21:00:00.000Z',
      'en'
    );

    expect(html).toContain('Stellar local-skyline file source');
    expect(html).toContain('Source warnings');
    expect(html).toContain('4 points');
    expect(html).toContain('256 bytes');
    expect(html).toContain('Saved points match the imported source');
    expect(html).toContain('RAW-SOURCE-WARNING · ölçüm metni');
    expect(html).toContain('c'.repeat(64));
    expect(html).not.toContain('RAW-SOURCE-WARNING · measurement text');
  });

  it('keeps stored geodesic trace evidence unchanged in an English report', () => {
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z',
      'en'
    );
    const trace = savedExperimentFixture.geodesic!.trace;

    expect(html).toContain(trace.summary);
    expect(html).toContain(savedExperimentFixture.geodesic!.traceId);
    for (const assumption of trace.assumptions) {
      expect(html).toContain(assumption);
    }
  });
});
