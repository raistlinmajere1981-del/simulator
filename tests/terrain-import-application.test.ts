import { describe, expect, it } from 'vitest';
import {
  applyImportedTerrainInputs,
  getApplicableImportedRouteDistanceKm
} from '../src/simulation/terrain-import-application';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type ImportedGeoJsonTerrainProfile,
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

const geoJsonProfile: ImportedGeoJsonTerrainProfile = {
  kind: 'geojson',
  fileName: 'route.geojson',
  geometryType: 'LineString',
  coordinateCount: 3,
  sourceDistanceM: 12_345,
  startLongitudeDeg: 28.9784,
  startLatitudeDeg: 41.0082,
  endLongitudeDeg: 29.06,
  endLatitudeDeg: 41.058,
  elevationSource: 'coordinate-z',
  observerEndpointElevationM: 4,
  targetEndpointElevationM: 5,
  points: [{ id: 'g1', distancePercent: 50, elevationM: 22 }],
  warnings: []
};

const noCoordinateAdoption = {
  applyObserverEndpoint: false,
  applyTargetEndpoint: false,
  applyRouteDistance: false,
  applyRouteCoordinates: false
};

describe('terrain profile application', () => {
  it('applies the CSV route distance in manual distance mode when selected', () => {
    const result = applyImportedTerrainInputs(
      { ...DEFAULT_SIMULATOR_INPUTS, surfaceDistanceKm: 22.38 },
      profile,
      {
        applyObserverEndpoint: true,
        applyTargetEndpoint: true,
        applyRouteDistance: true,
        applyRouteCoordinates: false
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
      noCoordinateAdoption
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
      { ...noCoordinateAdoption, applyRouteDistance: true }
    );

    expect(result.surfaceDistanceKm).toBe(22.38);
  });

  it('adopts GeoJSON route endpoints as experiment coordinates', () => {
    const result = applyImportedTerrainInputs(
      {
        ...DEFAULT_SIMULATOR_INPUTS,
        distanceSource: 'manual',
        surfaceDistanceKm: 40
      },
      geoJsonProfile,
      {
        applyObserverEndpoint: true,
        applyTargetEndpoint: true,
        applyRouteDistance: true,
        applyRouteCoordinates: true
      }
    );

    expect(result.distanceSource).toBe('coordinates');
    expect(result.surfaceDistanceKm).toBe(40);
    expect(result.observerLatitudeDeg).toBe(41.0082);
    expect(result.observerLongitudeDeg).toBe(28.9784);
    expect(result.targetLatitudeDeg).toBe(41.058);
    expect(result.targetLongitudeDeg).toBe(29.06);
    expect(result.observerGroundElevationM).toBe(4);
    expect(result.targetGroundElevationM).toBe(5);
  });

  it('does not treat a CSV profile as a coordinate source', () => {
    const result = applyImportedTerrainInputs(
      { ...DEFAULT_SIMULATOR_INPUTS, distanceSource: 'manual' },
      profile,
      { ...noCoordinateAdoption, applyRouteCoordinates: true }
    );

    expect(result.distanceSource).toBe('manual');
    expect(result.observerLatitudeDeg).toBe(DEFAULT_SIMULATOR_INPUTS.observerLatitudeDeg);
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
