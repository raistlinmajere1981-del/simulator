export type GeographicCoordinate = readonly [longitudeDeg: number, latitudeDeg: number];

interface GeoJsonLineStringLike {
  type: 'LineString';
  coordinates: unknown;
}

interface GeoJsonMultiLineStringLike {
  type: 'MultiLineString';
  coordinates: unknown;
}

function normalizeCoordinate(value: unknown): GeographicCoordinate | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const longitudeDeg = value[0];
  const latitudeDeg = value[1];
  if (typeof longitudeDeg !== 'number' || typeof latitudeDeg !== 'number') return undefined;
  if (!Number.isFinite(longitudeDeg) || !Number.isFinite(latitudeDeg)) return undefined;
  if (longitudeDeg < -180 || longitudeDeg > 180 || latitudeDeg < -90 || latitudeDeg > 90) {
    return undefined;
  }
  return [longitudeDeg, latitudeDeg];
}

function normalizeLine(value: unknown): GeographicCoordinate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeCoordinate)
    .filter((coordinate): coordinate is GeographicCoordinate => coordinate !== undefined);
}

export function extractGeographicLineStrings(geometry: unknown): GeographicCoordinate[][] {
  if (!geometry || typeof geometry !== 'object' || !('type' in geometry) || !('coordinates' in geometry)) {
    return [];
  }

  const candidate = geometry as GeoJsonLineStringLike | GeoJsonMultiLineStringLike;
  if (candidate.type === 'LineString') {
    const line = normalizeLine(candidate.coordinates);
    return line.length >= 2 ? [line] : [];
  }
  if (candidate.type !== 'MultiLineString' || !Array.isArray(candidate.coordinates)) return [];

  return candidate.coordinates
    .map(normalizeLine)
    .filter((line) => line.length >= 2);
}
