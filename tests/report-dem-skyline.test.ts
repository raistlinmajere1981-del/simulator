import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import type { SavedStellarLocalHorizonSource } from '../src/shared/stellar-local-horizon-import';
import { savedExperimentFixture } from './portable.test';

const source: SavedStellarLocalHorizonSource = {
  fileName: 'istanbul-360.asc',
  importedAtIso: '2026-08-10T02:00:00.000Z',
  format: 'dem',
  pointCount: 4,
  maximumAzimuthGapDeg: 90,
  points: [
    { azimuthDeg: 0, altitudeDeg: 1.2 },
    { azimuthDeg: 90, altitudeDeg: 3.4 },
    { azimuthDeg: 180, altitudeDeg: 0.8 },
    { azimuthDeg: 270, altitudeDeg: 2.1 }
  ],
  warnings: [
    'DEM yükseklikleri WGS84 elipsoidal yüksekliğe tek sabit datum ofsetiyle bağlanır.'
  ],
  fileSizeBytes: 10 * 1024 * 1024,
  sha256: 'd'.repeat(64),
  modifiedAfterImport: false,
  demDerivation: {
    algorithmId: 'dem-skyline-wgs84-topocentric',
    algorithmVersion: '0.1.0',
    observerLatitudeDeg: 41.0082,
    observerLongitudeDeg: 28.9784,
    observerHeightM: 10,
    heightDatumToEllipsoidOffsetM: 35,
    azimuthStepDeg: 90,
    distanceStepM: 500,
    maximumDistanceM: 20_000,
    samplingMethod: 'bilinear',
    completeCoverage: true,
    completeRayCount: 4,
    coverageLimitedRayCount: 0,
    noDataAffectedRayCount: 0,
    noCoverageRayCount: 0,
    geodesicFallbackSampleCount: 0
  }
};

describe('DEM skyline HTML provenance', () => {
  it('reports the source file, derivation geometry and complete-coverage guard', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      scenarioId: 'stellar-observation',
      stellarLocalHorizonSource: source
    }, '2026-08-10T02:10:00.000Z');

    expect(html).toContain('DEM skyline kaynak provenansı');
    expect(html).toContain('DEM’den türetilmiş geometrik 360° skyline');
    expect(html).toContain('istanbul-360.asc');
    expect(html).toContain('dem-skyline-wgs84-topocentric@0.1.0');
    expect(html).toContain('41,0082°');
    expect(html).toContain('28,9784°');
    expect(html).toContain('35 m');
    expect(html).toContain('ΔA 90°');
    expect(html).toContain('Δs 500 m');
    expect(html).toContain('maksimum 20 km');
    expect(html).toContain('Bilinear');
    expect(html).toContain('Tam · tam 4/4');
    expect(html).toContain('d'.repeat(64));
    expect(html).toContain('geoit değişimi');
  });
});
