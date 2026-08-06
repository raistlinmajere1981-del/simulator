import type {
  ImportedGeoJsonTerrainProfile,
  SimulatorInputs,
  TerrainProfileImport
} from '../shared/simulator';

export const MAX_IMPORTED_ROUTE_DISTANCE_KM = 20_000;

export interface TerrainProfileApplicationOptions {
  applyObserverEndpoint: boolean;
  applyTargetEndpoint: boolean;
  applyRouteDistance: boolean;
  applyRouteCoordinates: boolean;
}

function isGeoJsonProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return 'kind' in profile && profile.kind === 'geojson';
}

export function getApplicableImportedRouteDistanceKm(
  profile: TerrainProfileImport
): number | null {
  if (profile.sourceDistanceM === null) return null;
  const distanceKm = profile.sourceDistanceM / 1_000;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  if (distanceKm > MAX_IMPORTED_ROUTE_DISTANCE_KM) return null;
  return distanceKm;
}

export function applyImportedTerrainInputs(
  current: SimulatorInputs,
  profile: TerrainProfileImport,
  options: TerrainProfileApplicationOptions
): SimulatorInputs {
  const applyRouteCoordinates = options.applyRouteCoordinates && isGeoJsonProfile(profile);
  const importedDistanceKm = !applyRouteCoordinates &&
    options.applyRouteDistance &&
    current.distanceSource === 'manual'
    ? getApplicableImportedRouteDistanceKm(profile)
    : null;

  return {
    ...current,
    terrainMode: 'manual-points',
    distanceSource: applyRouteCoordinates ? 'coordinates' : current.distanceSource,
    surfaceDistanceKm: importedDistanceKm ?? current.surfaceDistanceKm,
    observerLatitudeDeg: applyRouteCoordinates
      ? profile.startLatitudeDeg
      : current.observerLatitudeDeg,
    observerLongitudeDeg: applyRouteCoordinates
      ? profile.startLongitudeDeg
      : current.observerLongitudeDeg,
    targetLatitudeDeg: applyRouteCoordinates
      ? profile.endLatitudeDeg
      : current.targetLatitudeDeg,
    targetLongitudeDeg: applyRouteCoordinates
      ? profile.endLongitudeDeg
      : current.targetLongitudeDeg,
    observerGroundElevationM: options.applyObserverEndpoint
      ? profile.observerEndpointElevationM
      : current.observerGroundElevationM,
    targetGroundElevationM: options.applyTargetEndpoint
      ? profile.targetEndpointElevationM
      : current.targetGroundElevationM
  };
}
