import { describe, expect, it } from 'vitest';
import { generateDemSkyline } from '../src/simulation/dem-skyline';
import { parseEsriAsciiGrid } from '../src/simulation/esri-ascii-grid';
import { savedStellarLocalHorizonSourceFromDemSkyline } from '../src/simulation/stellar-dem-skyline-source';
import type {
  StellarDemSkylineDraft,
  StellarDemSkylineGenerationSettings
} from '../src/shared/stellar-local-horizon-import';

function flatGrid(size = 5) {
  const rows = Array.from({ length: size }, () => Array(size).fill('0').join(' '));
  return parseEsriAsciiGrid(`ncols ${size}
nrows ${size}
xllcenter -0.02
yllcenter -0.02
cellsize 0.01
NODATA_value -9999
${rows.join('\n')}
`, 'derived.asc');
}

const settings: StellarDemSkylineGenerationSettings = {
  observerLatitudeDeg: 0,
  observerLongitudeDeg: 0,
  observerHeightM: 2,
  heightDatumToEllipsoidOffsetM: 0,
  azimuthStepDeg: 90,
  distanceStepM: 500,
  maximumDistanceM: 2_000,
  samplingMethod: 'nearest'
};

const draft: StellarDemSkylineDraft = {
  requestId: 'request-1',
  fileName: 'derived.asc',
  importedAtIso: '2026-08-10T00:00:00.000Z',
  fileSizeBytes: 1_234,
  sha256: 'a'.repeat(64),
  columnCount: 5,
  rowCount: 5,
  cellSizeDeg: 0.01,
  noDataValue: -9999,
  westBoundaryDeg: -0.025,
  eastBoundaryDeg: 0.025,
  southBoundaryDeg: -0.025,
  northBoundaryDeg: 0.025,
  warnings: []
};

describe('DEM-derived stellar skyline source', () => {
  it('converts only complete DEM skyline results with derivation provenance', () => {
    const result = generateDemSkyline({
      grid: flatGrid(),
      observer: {
        latitudeDeg: settings.observerLatitudeDeg,
        longitudeDeg: settings.observerLongitudeDeg
      },
      observerHeightM: settings.observerHeightM,
      heightDatumToEllipsoidOffsetM: settings.heightDatumToEllipsoidOffsetM,
      azimuthStepDeg: settings.azimuthStepDeg,
      distanceStepM: settings.distanceStepM,
      maximumDistanceM: settings.maximumDistanceM,
      samplingMethod: settings.samplingMethod
    });
    const source = savedStellarLocalHorizonSourceFromDemSkyline({ draft, settings, result });

    expect(source.format).toBe('dem');
    expect(source.pointCount).toBe(4);
    expect(source.maximumAzimuthGapDeg).toBe(90);
    expect(source.sha256).toBe(draft.sha256);
    expect(source.modifiedAfterImport).toBe(false);
    expect(source.demDerivation).toMatchObject({
      ...settings,
      completeCoverage: true,
      completeRayCount: 4,
      coverageLimitedRayCount: 0,
      noDataAffectedRayCount: 0,
      noCoverageRayCount: 0
    });
    expect(source.points.map((point) => point.azimuthDeg)).toEqual([0, 90, 180, 270]);
  });

  it('fails closed when requested distance exceeds DEM coverage', () => {
    const incompleteSettings: StellarDemSkylineGenerationSettings = {
      ...settings,
      distanceStepM: 1_000,
      maximumDistanceM: 4_000
    };
    const result = generateDemSkyline({
      grid: flatGrid(),
      observer: { latitudeDeg: 0, longitudeDeg: 0 },
      observerHeightM: 2,
      heightDatumToEllipsoidOffsetM: 0,
      azimuthStepDeg: incompleteSettings.azimuthStepDeg,
      distanceStepM: incompleteSettings.distanceStepM,
      maximumDistanceM: incompleteSettings.maximumDistanceM,
      samplingMethod: incompleteSettings.samplingMethod
    });

    expect(result.completeCoverage).toBe(false);
    expect(() => savedStellarLocalHorizonSourceFromDemSkyline({
      draft,
      settings: incompleteSettings,
      result
    })).toThrow('Eksik kapsamalı');
  });
});
