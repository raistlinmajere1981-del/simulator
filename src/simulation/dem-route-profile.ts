import type {
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
    sampleCountMode: requestedSampleCount === undefined ? 'automatic' : 'manual',
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
