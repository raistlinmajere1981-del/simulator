import { basename } from 'node:path';
import type {
  ImportedGeoJsonTerrainProfile,
  TerrainProfileImportContext
} from '../shared/simulator';
import type { ManualTerrainPoint } from '../shared/terrain';
import { inverseWgs84Geodesic } from './geodesy';
import { validateManualTerrainPoints } from './manual-terrain-profile';

const MAX_COORDINATE_COUNT = 2_002;
const MAX_ROUTE_DISTANCE_M = 20_000_000;
const MIN_ELEVATION_M = -12_000;
const MAX_ELEVATION_M = 100_000;
const MIN_SEGMENT_DISTANCE_M = 0.001;

interface GeoJsonCoordinate {
  longitudeDeg: number;
  latitudeDeg: number;
  elevationM: number;
}

interface ExtractedLineString {
  coordinates: unknown[];
  customCrsPresent: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateContext(context: TerrainProfileImportContext): void {
  if (!Number.isFinite(context.routeDistanceM) || context.routeDistanceM <= 0 ||
    context.routeDistanceM > MAX_ROUTE_DISTANCE_M) {
    throw new RangeError('GeoJSON içe aktarma için geçerli bir deney mesafesi gerekli.');
  }
  if (!Number.isFinite(context.observerGroundElevationM) ||
    !Number.isFinite(context.targetGroundElevationM)) {
    throw new RangeError('GeoJSON içe aktarma için geçerli uç zemin yükseklikleri gerekli.');
  }
}

function lineStringCoordinates(geometry: unknown): unknown[] | null {
  if (!isRecord(geometry) || geometry.type !== 'LineString' ||
    !Array.isArray(geometry.coordinates)) {
    return null;
  }
  return geometry.coordinates;
}

function extractLineString(value: unknown): ExtractedLineString {
  if (!isRecord(value)) {
    throw new Error('GeoJSON kök değeri bir nesne olmalı.');
  }

  const customCrsPresent = value.crs !== undefined && value.crs !== null;
  const direct = lineStringCoordinates(value);
  if (direct) return { coordinates: direct, customCrsPresent };

  if (value.type === 'Feature') {
    const coordinates = lineStringCoordinates(value.geometry);
    if (!coordinates) {
      throw new Error('GeoJSON Feature yalnızca 3B LineString geometrisi içermeli.');
    }
    return { coordinates, customCrsPresent };
  }

  if (value.type === 'FeatureCollection') {
    if (!Array.isArray(value.features)) {
      throw new Error('GeoJSON FeatureCollection features dizisi içermeli.');
    }
    const matches = value.features
      .filter(isRecord)
      .map((feature) => lineStringCoordinates(feature.geometry))
      .filter((coordinates): coordinates is unknown[] => coordinates !== null);
    if (matches.length === 0) {
      throw new Error('GeoJSON FeatureCollection içinde LineString bulunamadı.');
    }
    if (matches.length > 1) {
      throw new Error('GeoJSON dosyasında birden fazla LineString var; tek rota gerekli.');
    }
    return { coordinates: matches[0] ?? [], customCrsPresent };
  }

  throw new Error('Yalnız LineString, Feature veya tek hatlı FeatureCollection desteklenir.');
}

function parseCoordinate(value: unknown, index: number): GeoJsonCoordinate {
  if (!Array.isArray(value) || value.length < 3) {
    throw new Error(
      `${index + 1}. GeoJSON koordinatı [boylam, enlem, yükseklik] biçiminde olmalı.`
    );
  }
  const longitudeDeg = value[0];
  const latitudeDeg = value[1];
  const elevationM = value[2];
  if (typeof longitudeDeg !== 'number' || !Number.isFinite(longitudeDeg) ||
    longitudeDeg < -180 || longitudeDeg > 180) {
    throw new RangeError(`${index + 1}. koordinatın boylamı -180…180° aralığında olmalı.`);
  }
  if (typeof latitudeDeg !== 'number' || !Number.isFinite(latitudeDeg) ||
    latitudeDeg < -90 || latitudeDeg > 90) {
    throw new RangeError(`${index + 1}. koordinatın enlemi -90…90° aralığında olmalı.`);
  }
  if (typeof elevationM !== 'number' || !Number.isFinite(elevationM) ||
    elevationM < MIN_ELEVATION_M || elevationM > MAX_ELEVATION_M) {
    throw new RangeError(
      `${index + 1}. koordinatın yüksekliği ${MIN_ELEVATION_M}…${MAX_ELEVATION_M} m aralığında olmalı.`
    );
  }
  return { longitudeDeg, latitudeDeg, elevationM };
}

function differenceWarning(
  label: string,
  importedValue: number,
  currentValue: number,
  unit: string
): string | null {
  if (Math.abs(importedValue - currentValue) <= 0.01) return null;
  return `GeoJSON ${label} ${importedValue.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${unit}; mevcut deney ${currentValue.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${unit}. Uygulama aşamasında hangi değerin kullanılacağı seçilebilir.`;
}

export function parseTerrainProfileGeoJson(
  content: string,
  fileName: string,
  context: TerrainProfileImportContext
): ImportedGeoJsonTerrainProfile {
  validateContext(context);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^\uFEFF/, '')) as unknown;
  } catch {
    throw new Error('Seçilen dosya geçerli JSON içermiyor.');
  }

  const extracted = extractLineString(parsed);
  if (extracted.coordinates.length < 2) {
    throw new Error('GeoJSON rotası en az başlangıç ve bitiş koordinatı içermeli.');
  }
  if (extracted.coordinates.length > MAX_COORDINATE_COUNT) {
    throw new Error(`GeoJSON rotası en fazla ${MAX_COORDINATE_COUNT} koordinat içerebilir.`);
  }

  const coordinates = extracted.coordinates.map(parseCoordinate);
  const cumulativeDistancesM: number[] = [0];
  let totalDistanceM = 0;
  let fallbackSegmentCount = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    if (!previous || !current) continue;
    const segment = inverseWgs84Geodesic(
      { latitudeDeg: previous.latitudeDeg, longitudeDeg: previous.longitudeDeg },
      { latitudeDeg: current.latitudeDeg, longitudeDeg: current.longitudeDeg }
    );
    if (segment.distanceM <= MIN_SEGMENT_DISTANCE_M) {
      throw new RangeError(
        `${index}. ve ${index + 1}. GeoJSON koordinatları aynı konumu tanımlıyor.`
      );
    }
    if (segment.method === 'spherical-fallback') fallbackSegmentCount += 1;
    totalDistanceM += segment.distanceM;
    if (totalDistanceM > MAX_ROUTE_DISTANCE_M) {
      throw new RangeError('GeoJSON rota uzunluğu 20.000 km sınırını aşıyor.');
    }
    cumulativeDistancesM.push(totalDistanceM);
  }

  if (!Number.isFinite(totalDistanceM) || totalDistanceM <= 0) {
    throw new Error('GeoJSON rota uzunluğu hesaplanamadı.');
  }

  const points: ManualTerrainPoint[] = coordinates.slice(1, -1).map((coordinate, index) => ({
    id: `geojson-coordinate-${index + 2}`,
    distancePercent: cumulativeDistancesM[index + 1]! / totalDistanceM * 100,
    elevationM: coordinate.elevationM
  }));
  const validationErrors = validateManualTerrainPoints(points);
  if (validationErrors.length > 0) {
    throw new Error(`GeoJSON arazi noktaları geçersiz: ${validationErrors.join(' ')}`);
  }

  const first = coordinates[0]!;
  const last = coordinates[coordinates.length - 1]!;
  const warnings: string[] = [];
  const routeWarning = differenceWarning(
    'toplam rota mesafesi',
    totalDistanceM / 1_000,
    context.routeDistanceM / 1_000,
    'km'
  );
  const observerWarning = differenceWarning(
    'başlangıç zemin yüksekliği',
    first.elevationM,
    context.observerGroundElevationM,
    'm'
  );
  const targetWarning = differenceWarning(
    'bitiş zemin yüksekliği',
    last.elevationM,
    context.targetGroundElevationM,
    'm'
  );
  if (routeWarning) warnings.push(routeWarning);
  if (observerWarning) warnings.push(observerWarning);
  if (targetWarning) warnings.push(targetWarning);
  if (fallbackSegmentCount > 0) {
    warnings.push(
      `${fallbackSegmentCount} rota parçasında Vincenty yakınsamayıp küresel yedek çözüm kullandı.`
    );
  }
  if (extracted.customCrsPresent) {
    warnings.push(
      'GeoJSON crs alanı dikkate alınmadı; koordinatlar RFC 7946 gereği WGS84 boylam/enlem olarak yorumlandı.'
    );
  }

  return {
    kind: 'geojson',
    fileName: basename(fileName),
    geometryType: 'LineString',
    coordinateCount: coordinates.length,
    sourceDistanceM: totalDistanceM,
    startLongitudeDeg: first.longitudeDeg,
    startLatitudeDeg: first.latitudeDeg,
    endLongitudeDeg: last.longitudeDeg,
    endLatitudeDeg: last.latitudeDeg,
    elevationSource: 'coordinate-z',
    observerEndpointElevationM: first.elevationM,
    targetEndpointElevationM: last.elevationM,
    points,
    warnings
  };
}
