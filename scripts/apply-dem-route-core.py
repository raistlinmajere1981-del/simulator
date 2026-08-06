from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    write(path, text.replace(old, new, 1))


write('src/simulation/geodesic-path.ts', r"""import {
  MEAN_EARTH_RADIUS_M,
  WGS84_FLATTENING,
  WGS84_SEMI_MAJOR_AXIS_M,
  WGS84_SEMI_MINOR_AXIS_M,
  inverseWgs84Geodesic,
  isValidCoordinate,
  type GeodesicMethod,
  type GeographicCoordinate
} from './geodesy';

const toRadians = (degrees: number): number => degrees * Math.PI / 180;
const toDegrees = (radians: number): number => radians * 180 / Math.PI;

function normalizeLongitude(degrees: number): number {
  return ((degrees + 540) % 360) - 180;
}

export interface Wgs84GeodesicPath {
  start: GeographicCoordinate;
  end: GeographicCoordinate;
  totalDistanceM: number;
  initialBearingDeg: number;
  method: GeodesicMethod;
  warnings: string[];
}

export interface GeodesicPathPoint {
  coordinate: GeographicCoordinate;
  method: GeodesicMethod;
  warning?: string;
}

function sphericalDirect(
  start: GeographicCoordinate,
  bearingDeg: number,
  distanceM: number
): GeographicCoordinate {
  const angularDistance = distanceM / MEAN_EARTH_RADIUS_M;
  const bearing = toRadians(bearingDeg);
  const latitude1 = toRadians(start.latitudeDeg);
  const longitude1 = toRadians(start.longitudeDeg);
  const sinLatitude1 = Math.sin(latitude1);
  const cosLatitude1 = Math.cos(latitude1);
  const sinAngularDistance = Math.sin(angularDistance);
  const cosAngularDistance = Math.cos(angularDistance);

  const latitude2 = Math.asin(
    sinLatitude1 * cosAngularDistance +
    cosLatitude1 * sinAngularDistance * Math.cos(bearing)
  );
  const longitudeDelta = Math.atan2(
    Math.sin(bearing) * sinAngularDistance * cosLatitude1,
    cosAngularDistance - sinLatitude1 * Math.sin(latitude2)
  );

  return {
    latitudeDeg: toDegrees(latitude2),
    longitudeDeg: normalizeLongitude(toDegrees(longitude1 + longitudeDelta))
  };
}

function vincentyDirect(
  start: GeographicCoordinate,
  bearingDeg: number,
  distanceM: number,
  maxIterations = 200,
  toleranceRad = 1e-12
): GeographicCoordinate | null {
  const a = WGS84_SEMI_MAJOR_AXIS_M;
  const b = WGS84_SEMI_MINOR_AXIS_M;
  const f = WGS84_FLATTENING;
  const alpha1 = toRadians(bearingDeg);
  const sinAlpha1 = Math.sin(alpha1);
  const cosAlpha1 = Math.cos(alpha1);
  const latitude1 = toRadians(start.latitudeDeg);
  const longitude1 = toRadians(start.longitudeDeg);
  const tanU1 = (1 - f) * Math.tan(latitude1);
  const cosU1 = 1 / Math.sqrt(1 + tanU1 ** 2);
  const sinU1 = tanU1 * cosU1;
  const sigma1 = Math.atan2(tanU1, cosAlpha1);
  const sinAlpha = cosU1 * sinAlpha1;
  const cosSqAlpha = Math.max(0, 1 - sinAlpha ** 2);
  const uSq = cosSqAlpha * (a ** 2 - b ** 2) / b ** 2;
  const A = 1 + uSq / 16_384 * (
    4_096 + uSq * (-768 + uSq * (320 - 175 * uSq))
  );
  const B = uSq / 1_024 * (
    256 + uSq * (-128 + uSq * (74 - 47 * uSq))
  );

  let sigma = distanceM / (b * A);
  let converged = false;
  let sinSigma = 0;
  let cosSigma = 0;
  let cos2SigmaM = 0;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    sinSigma = Math.sin(sigma);
    cosSigma = Math.cos(sigma);
    cos2SigmaM = Math.cos(2 * sigma1 + sigma);
    const deltaSigma = B * sinSigma * (
      cos2SigmaM + B / 4 * (
        cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
        B / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) *
        (-3 + 4 * cos2SigmaM ** 2)
      )
    );
    const nextSigma = distanceM / (b * A) + deltaSigma;
    if (Math.abs(nextSigma - sigma) <= toleranceRad) {
      sigma = nextSigma;
      converged = true;
      break;
    }
    sigma = nextSigma;
  }

  if (!converged) return null;

  sinSigma = Math.sin(sigma);
  cosSigma = Math.cos(sigma);
  cos2SigmaM = Math.cos(2 * sigma1 + sigma);
  const temporary = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
  const latitude2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
    (1 - f) * Math.sqrt(sinAlpha ** 2 + temporary ** 2)
  );
  const lambda = Math.atan2(
    sinSigma * sinAlpha1,
    cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1
  );
  const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
  const longitudeCorrection = lambda - (1 - C) * f * sinAlpha * (
    sigma + C * sinSigma * (
      cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)
    )
  );

  return {
    latitudeDeg: toDegrees(latitude2),
    longitudeDeg: normalizeLongitude(toDegrees(longitude1 + longitudeCorrection))
  };
}

export function createWgs84GeodesicPath(
  start: GeographicCoordinate,
  end: GeographicCoordinate
): Wgs84GeodesicPath {
  if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
    throw new RangeError('Rota koordinatları WGS84 enlem/boylam sınırlarında olmalı.');
  }
  const inverse = inverseWgs84Geodesic(start, end);
  if (!Number.isFinite(inverse.distanceM) || inverse.distanceM <= 0) {
    throw new RangeError('DEM rotası için farklı başlangıç ve bitiş koordinatları gerekli.');
  }
  return {
    start: { ...start },
    end: { ...end },
    totalDistanceM: inverse.distanceM,
    initialBearingDeg: inverse.initialBearingDeg,
    method: inverse.method,
    warnings: [...inverse.warnings]
  };
}

export function coordinateAtWgs84PathFraction(
  path: Wgs84GeodesicPath,
  fraction: number
): GeodesicPathPoint {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new RangeError('Rota kesri 0…1 aralığında olmalı.');
  }
  if (fraction === 0) return { coordinate: { ...path.start }, method: path.method };
  if (fraction === 1) return { coordinate: { ...path.end }, method: path.method };

  const distanceM = path.totalDistanceM * fraction;
  if (path.method === 'vincenty') {
    const coordinate = vincentyDirect(path.start, path.initialBearingDeg, distanceM);
    if (coordinate) return { coordinate, method: 'vincenty' };
  }

  return {
    coordinate: sphericalDirect(path.start, path.initialBearingDeg, distanceM),
    method: 'spherical-fallback',
    warning: 'WGS84 doğrudan çözümü yakınsamayıp küresel rota ara noktası kullanıldı.'
  };
}
""")

write('src/simulation/dem-route-profile.ts', r"""import type {
  DemTerrainProfileImportContext,
  ImportedDemTerrainProfile
} from '../shared/simulator';
import type { ManualTerrainPoint } from '../shared/terrain';
import {
  sampleEsriAsciiGrid,
  type EsriAsciiGrid
} from './esri-ascii-grid';
import {
  coordinateAtWgs84PathFraction,
  createWgs84GeodesicPath
} from './geodesic-path';
import { validateManualTerrainPoints } from './manual-terrain-profile';

const MAX_PROFILE_SAMPLE_COUNT = 2_002;
const MIN_PROFILE_SAMPLE_COUNT = 3;
const MIN_ELEVATION_M = -12_000;
const MAX_ELEVATION_M = 100_000;
const METRES_PER_LATITUDE_DEGREE = 111_132;
const METRES_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111_320;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validateRequestedSampleCount(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < MIN_PROFILE_SAMPLE_COUNT ||
    value > MAX_PROFILE_SAMPLE_COUNT) {
    throw new RangeError(
      `DEM örnek sayısı ${MIN_PROFILE_SAMPLE_COUNT}…${MAX_PROFILE_SAMPLE_COUNT} aralığında bir tam sayı olmalı.`
    );
  }
  return value;
}

function naturalSampleCount(
  grid: EsriAsciiGrid,
  totalDistanceM: number,
  middleLatitudeDeg: number
): { sampleCount: number; capped: boolean } {
  const latitudeCellSpanM = grid.cellSizeDeg * METRES_PER_LATITUDE_DEGREE;
  const longitudeScale = Math.max(
    0.01,
    Math.abs(Math.cos(middleLatitudeDeg * Math.PI / 180))
  );
  const longitudeCellSpanM = grid.cellSizeDeg *
    METRES_PER_LONGITUDE_DEGREE_AT_EQUATOR * longitudeScale;
  const targetSpacingM = Math.max(1, Math.min(
    latitudeCellSpanM,
    longitudeCellSpanM
  ) / 2);
  const required = Math.max(
    MIN_PROFILE_SAMPLE_COUNT,
    Math.ceil(totalDistanceM / targetSpacingM) + 1
  );
  return {
    sampleCount: clamp(required, MIN_PROFILE_SAMPLE_COUNT, MAX_PROFILE_SAMPLE_COUNT),
    capped: required > MAX_PROFILE_SAMPLE_COUNT
  };
}

function validateElevation(value: number, distancePercent: number): number {
  if (!Number.isFinite(value) || value < MIN_ELEVATION_M || value > MAX_ELEVATION_M) {
    throw new RangeError(
      `DEM rotanın %${distancePercent.toFixed(3)} konumunda ${MIN_ELEVATION_M}…${MAX_ELEVATION_M} m dışında bir yükseklik üretti.`
    );
  }
  return value;
}

export function buildTerrainProfileFromDem(
  grid: EsriAsciiGrid,
  context: DemTerrainProfileImportContext
): ImportedDemTerrainProfile {
  const path = createWgs84GeodesicPath(
    {
      latitudeDeg: context.observerLatitudeDeg,
      longitudeDeg: context.observerLongitudeDeg
    },
    {
      latitudeDeg: context.targetLatitudeDeg,
      longitudeDeg: context.targetLongitudeDeg
    }
  );
  const requestedSampleCount = validateRequestedSampleCount(context.sampleCount);
  const middle = coordinateAtWgs84PathFraction(path, 0.5);
  const natural = naturalSampleCount(
    grid,
    path.totalDistanceM,
    middle.coordinate.latitudeDeg
  );
  const sampleCount = requestedSampleCount ?? natural.sampleCount;
  const elevations: number[] = [];
  const warnings = [...grid.warnings, ...path.warnings];
  const directWarnings = new Set<string>();

  for (let index = 0; index < sampleCount; index += 1) {
    const fraction = index / (sampleCount - 1);
    const pathPoint = coordinateAtWgs84PathFraction(path, fraction);
    if (pathPoint.warning) directWarnings.add(pathPoint.warning);
    const elevationM = sampleEsriAsciiGrid(
      grid,
      pathPoint.coordinate.longitudeDeg,
      pathPoint.coordinate.latitudeDeg,
      context.samplingMethod
    );
    if (elevationM === null) {
      throw new RangeError(
        `DEM rotanın %${(fraction * 100).toFixed(3)} konumunu kapsamıyor veya bu konum NODATA hücresine denk geliyor.`
      );
    }
    elevations.push(validateElevation(elevationM, fraction * 100));
  }

  warnings.push(...directWarnings);
  if (natural.capped && requestedSampleCount === undefined) {
    warnings.push(
      `Grid çözünürlüğüne göre gereken örnek sayısı ${MAX_PROFILE_SAMPLE_COUNT} sınırında kesildi.`
    );
  }
  warnings.push(
    'DEM yüksekliklerinin düşey datumu dosyadan doğrulanamadı; deneyde uygun düşey referans seçilmelidir.'
  );

  const points: ManualTerrainPoint[] = elevations.slice(1, -1).map((elevationM, index) => ({
    id: `dem-sample-${index + 1}`,
    distancePercent: (index + 1) / (sampleCount - 1) * 100,
    elevationM
  }));
  const errors = validateManualTerrainPoints(points);
  if (errors.length > 0) {
    throw new RangeError(`DEM profil örnekleri geçersiz: ${errors.join(' ')}`);
  }

  return {
    kind: 'dem',
    fileName: grid.fileName,
    format: 'esri-ascii',
    samplingMethod: context.samplingMethod,
    geodesicMethod: path.method,
    columnCount: grid.columnCount,
    rowCount: grid.rowCount,
    sampleCount,
    sampleSpacingM: path.totalDistanceM / (sampleCount - 1),
    cellSizeDeg: grid.cellSizeDeg,
    noDataValue: grid.noDataValue,
    westBoundaryDeg: grid.westBoundaryDeg,
    eastBoundaryDeg: grid.eastBoundaryDeg,
    southBoundaryDeg: grid.southBoundaryDeg,
    northBoundaryDeg: grid.northBoundaryDeg,
    sourceDistanceM: path.totalDistanceM,
    observerEndpointElevationM: elevations[0] as number,
    targetEndpointElevationM: elevations[elevations.length - 1] as number,
    points,
    warnings
  };
}
""")

# Shared DEM contracts.
replace_once(
    'src/shared/simulator.ts',
    """export type CsvTerrainDelimiter = 'comma' | 'semicolon' | 'tab';
""",
    """export type CsvTerrainDelimiter = 'comma' | 'semicolon' | 'tab';
export type DemTerrainSamplingMethod = 'nearest' | 'bilinear';
""",
    'DEM sampling type'
)
replace_once(
    'src/shared/simulator.ts',
    """export type TerrainProfileSource =
  | CsvTerrainProfileSource
  | GeoJsonTerrainProfileSource;
""",
    """export interface DemTerrainProfileSource extends BaseTerrainProfileSource {
  kind: 'dem';
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleSpacingM: number;
  cellSizeDeg: number;
  noDataValue: number | null;
  westBoundaryDeg: number;
  eastBoundaryDeg: number;
  southBoundaryDeg: number;
  northBoundaryDeg: number;
}

export type TerrainProfileSource =
  | CsvTerrainProfileSource
  | GeoJsonTerrainProfileSource
  | DemTerrainProfileSource;
""",
    'DEM source contract'
)
replace_once(
    'src/shared/simulator.ts',
    """export interface ImportedGeoJsonTerrainProfile {
""",
    """export interface DemTerrainProfileImportContext {
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  targetLatitudeDeg: number;
  targetLongitudeDeg: number;
  samplingMethod: DemTerrainSamplingMethod;
  sampleCount?: number;
}

export interface ImportedGeoJsonTerrainProfile {
""",
    'DEM import context'
)
replace_once(
    'src/shared/simulator.ts',
    """export type TerrainProfileImport =
  | ImportedTerrainProfile
  | ImportedGeoJsonTerrainProfile;
""",
    """export interface ImportedDemTerrainProfile {
  kind: 'dem';
  fileName: string;
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleSpacingM: number;
  cellSizeDeg: number;
  noDataValue: number | null;
  westBoundaryDeg: number;
  eastBoundaryDeg: number;
  southBoundaryDeg: number;
  northBoundaryDeg: number;
  sourceDistanceM: number;
  observerEndpointElevationM: number;
  targetEndpointElevationM: number;
  points: ManualTerrainPoint[];
  warnings: string[];
}

export type TerrainProfileImport =
  | ImportedTerrainProfile
  | ImportedGeoJsonTerrainProfile
  | ImportedDemTerrainProfile;
""",
    'DEM imported profile contract'
)

write('tests/geodesic-path.test.ts', r"""import { describe, expect, it } from 'vitest';
import {
  coordinateAtWgs84PathFraction,
  createWgs84GeodesicPath
} from '../src/simulation/geodesic-path';

 describe('WGS84 geodesic path', () => {
  it('produces the equatorial midpoint with the direct Vincenty solution', () => {
    const path = createWgs84GeodesicPath(
      { latitudeDeg: 0, longitudeDeg: 0 },
      { latitudeDeg: 0, longitudeDeg: 1 }
    );
    const midpoint = coordinateAtWgs84PathFraction(path, 0.5);

    expect(path.method).toBe('vincenty');
    expect(midpoint.method).toBe('vincenty');
    expect(midpoint.coordinate.latitudeDeg).toBeCloseTo(0, 9);
    expect(midpoint.coordinate.longitudeDeg).toBeCloseTo(0.5, 7);
  });

  it('returns exact endpoints and rejects invalid fractions', () => {
    const start = { latitudeDeg: 41, longitudeDeg: 29 };
    const end = { latitudeDeg: 41.1, longitudeDeg: 29.2 };
    const path = createWgs84GeodesicPath(start, end);

    expect(coordinateAtWgs84PathFraction(path, 0).coordinate).toEqual(start);
    expect(coordinateAtWgs84PathFraction(path, 1).coordinate).toEqual(end);
    expect(() => coordinateAtWgs84PathFraction(path, 1.1)).toThrow('0…1');
  });

  it('rejects coincident route endpoints', () => {
    expect(() => createWgs84GeodesicPath(
      { latitudeDeg: 41, longitudeDeg: 29 },
      { latitudeDeg: 41, longitudeDeg: 29 }
    )).toThrow('farklı');
  });
});
""")

write('tests/dem-route-profile.test.ts', r"""import { describe, expect, it } from 'vitest';
import { buildTerrainProfileFromDem } from '../src/simulation/dem-route-profile';
import { parseEsriAsciiGrid } from '../src/simulation/esri-ascii-grid';

const grid = parseEsriAsciiGrid(`ncols 3
nrows 3
xllcenter -1
yllcenter -1
cellsize 1
NODATA_value -9999
7 8 9
1 2 3
4 5 6
`, 'route.asc');

const context = {
  observerLatitudeDeg: 0,
  observerLongitudeDeg: -1,
  targetLatitudeDeg: 0,
  targetLongitudeDeg: 1,
  samplingMethod: 'bilinear' as const,
  sampleCount: 5
};

describe('DEM route terrain profile', () => {
  it('samples a WGS84 route and produces ordered interior terrain points', () => {
    const profile = buildTerrainProfileFromDem(grid, context);

    expect(profile.kind).toBe('dem');
    expect(profile.sampleCount).toBe(5);
    expect(profile.points).toHaveLength(3);
    expect(profile.observerEndpointElevationM).toBeCloseTo(1, 9);
    expect(profile.points[1]?.distancePercent).toBe(50);
    expect(profile.points[1]?.elevationM).toBeCloseTo(2, 7);
    expect(profile.targetEndpointElevationM).toBeCloseTo(3, 9);
    expect(profile.sourceDistanceM).toBeGreaterThan(220_000);
    expect(profile.warnings.some((warning) => warning.includes('düşey datumu'))).toBe(true);
  });

  it('derives a bounded sample count when no count is requested', () => {
    const profile = buildTerrainProfileFromDem(grid, {
      ...context,
      sampleCount: undefined
    });
    expect(profile.sampleCount).toBeGreaterThanOrEqual(3);
    expect(profile.sampleCount).toBeLessThanOrEqual(2_002);
    expect(profile.sampleSpacingM).toBeGreaterThan(0);
  });

  it('rejects routes outside grid coverage or crossing NODATA', () => {
    expect(() => buildTerrainProfileFromDem(grid, {
      ...context,
      observerLongitudeDeg: -2
    })).toThrow('kapsamıyor');

    const noDataGrid = parseEsriAsciiGrid(`ncols 3
nrows 3
xllcenter -1
yllcenter -1
cellsize 1
NODATA_value -9999
7 8 9
1 -9999 3
4 5 6
`, 'nodata.asc');
    expect(() => buildTerrainProfileFromDem(noDataGrid, context)).toThrow('NODATA');
  });

  it('rejects invalid requested sample counts', () => {
    expect(() => buildTerrainProfileFromDem(grid, {
      ...context,
      sampleCount: 2
    })).toThrow('örnek sayısı');
  });
});
""")
