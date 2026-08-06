import { describe, expect, it } from 'vitest';
import {
  applyImportedTerrainInputs,
  getApplicableImportedRouteDistanceKm
} from '../src/simulation/terrain-import-application';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type ImportedTerrainProfile
} from '../src/shared/simulator';

const profile: ImportedTerrainProfile = {
  fileName: 'route.csv',
  delimiter: 'comma',
  distanceUnit: 'm',
  distanceColumnHeader: 'distance_m',
  elevationColumnHeader: 'elevation_m',
  rowCount: 3,
  sourceDistanceM: 10_000,
  observerEndpointElevationM: 4,
  targetEndpointElevationM: 5,
  points: [{ id: 'p1', distancePercent: 50, elevationM: 20 }],
  warnings: []
};

describe('CSV terrain profile application', () => {
  it('applies the CSV route distance in manual distance mode when selected', () => {
    const result = applyImportedTerrainInputs(
      { ...DEFAULT_SIMULATOR_INPUTS, surfaceDistanceKm: 22.38 },
      profile,
      {
        applyObserverEndpoint: true,
        applyTargetEndpoint: true,
        applyRouteDistance: true
      }
    );

    expect(result.surfaceDistanceKm).toBe(10);
    expect(result.observerGroundElevationM).toBe(4);
    expect(result.targetGroundElevationM).toBe(5);
    expect(result.terrainMode).toBe('manual-points');
  });

  it('keeps the current route distance when the option is not selected', () => {
    const result = applyImportedTerrainInputs(
      { ...DEFAULT_SIMULATOR_INPUTS, surfaceDistanceKm: 22.38 },
      profile,
      {
        applyObserverEndpoint: false,
        applyTargetEndpoint: false,
        applyRouteDistance: false
      }
    );

    expect(result.surfaceDistanceKm).toBe(22.38);
  });

  it('does not override a coordinate-derived route distance', () => {
    const result = applyImportedTerrainInputs(
      {
        ...DEFAULT_SIMULATOR_INPUTS,
        distanceSource: 'coordinates',
        surfaceDistanceKm: 22.38
      },
      profile,
      {
        applyObserverEndpoint: false,
        applyTargetEndpoint: false,
        applyRouteDistance: true
      }
    );

    expect(result.surfaceDistanceKm).toBe(22.38);
  });

  it('rejects percentage-only and out-of-range source distances', () => {
    expect(getApplicableImportedRouteDistanceKm({
      ...profile,
      sourceDistanceM: null,
      distanceUnit: 'percent'
    })).toBeNull();
    expect(getApplicableImportedRouteDistanceKm({
      ...profile,
      sourceDistanceM: 20_000_001
    })).toBeNull();
  });
});
