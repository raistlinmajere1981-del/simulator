import { describe, expect, it } from 'vitest';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import type { SavedExperiment } from '../src/shared/simulator';
import { savedExperimentFixture } from './portable.test';

describe('DEM source compatibility', () => {
  it('accepts an older schema-v7 DEM source without sampleCountMode', () => {
    const experiment: SavedExperiment = {
      ...savedExperimentFixture,
      terrainProfileSource: {
        kind: 'dem',
        fileName: 'legacy-v7.asc',
        importedAtIso: '2026-08-06T15:00:00.000Z',
        sourceDistanceM: 22_500,
        observerEndpointElevationM: 12,
        targetEndpointElevationM: 18,
        appliedObserverEndpoint: true,
        appliedTargetEndpoint: true,
        appliedRouteDistance: false,
        appliedRouteCoordinates: false,
        modifiedAfterImport: false,
        format: 'esri-ascii',
        samplingMethod: 'bilinear',
        geodesicMethod: 'vincenty',
        columnCount: 10,
        rowCount: 10,
        sampleCount: 101,
        sampleSpacingM: 225,
        cellSizeDeg: 0.03,
        noDataValue: -9999,
        westBoundaryDeg: 28.885,
        eastBoundaryDeg: 29.185,
        southBoundaryDeg: 40.885,
        northBoundaryDeg: 41.185
      }
    };

    const parsed = parsePortableExperimentFile(
      createPortableExperimentFile(experiment, '1.0.0')
    );
    const source = parsed.experiment.terrainProfileSource;

    expect(parsed.migrated).toBe(false);
    expect(source?.kind).toBe('dem');
    expect(source?.kind === 'dem' ? source.sampleCountMode : 'unexpected-source')
      .toBeUndefined();
    expect(source?.sha256).toBeUndefined();
  });
});
