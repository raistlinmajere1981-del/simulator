import type { ManualTerrainPoint } from '../shared/terrain';
import { sortManualTerrainPoints } from './manual-terrain-profile';

export const MIN_TERRAIN_POINT_DISTANCE_PERCENT = 0.001;
export const MIN_TERRAIN_POINT_ELEVATION_M = -12_000;
export const MAX_TERRAIN_POINT_ELEVATION_M = 100_000;

export interface TerrainPointDragBounds {
  minimumDistancePercent: number;
  maximumDistancePercent: number;
}

export interface TerrainPointDragDeltaInput extends TerrainPointDragBounds {
  startDistancePercent: number;
  startElevationM: number;
  deltaXpx: number;
  deltaYpx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  elevationSpanM: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function getTerrainPointDragBounds(
  points: readonly ManualTerrainPoint[],
  pointId: string
): TerrainPointDragBounds {
  const sorted = sortManualTerrainPoints(points);
  const index = sorted.findIndex((point) => point.id === pointId);
  if (index < 0) throw new RangeError(`Arazi noktası bulunamadı: ${pointId}.`);

  const previous = sorted[index - 1];
  const next = sorted[index + 1];
  const minimumDistancePercent = previous
    ? previous.distancePercent + MIN_TERRAIN_POINT_DISTANCE_PERCENT
    : MIN_TERRAIN_POINT_DISTANCE_PERCENT;
  const maximumDistancePercent = next
    ? next.distancePercent - MIN_TERRAIN_POINT_DISTANCE_PERCENT
    : 100 - MIN_TERRAIN_POINT_DISTANCE_PERCENT;

  if (minimumDistancePercent > maximumDistancePercent) {
    throw new RangeError('Arazi noktası komşuları arasında sürükleme alanı kalmadı.');
  }

  return { minimumDistancePercent, maximumDistancePercent };
}

export function terrainPointFromDragDelta(
  input: TerrainPointDragDeltaInput
): Pick<ManualTerrainPoint, 'distancePercent' | 'elevationM'> {
  if (!Number.isFinite(input.viewportWidthPx) || input.viewportWidthPx <= 0 ||
    !Number.isFinite(input.viewportHeightPx) || input.viewportHeightPx <= 0) {
    throw new RangeError('Profil grafiği boyutları sürükleme için geçerli değil.');
  }
  if (!Number.isFinite(input.elevationSpanM) || input.elevationSpanM <= 0) {
    throw new RangeError('Profil yükseklik aralığı sürükleme için geçerli değil.');
  }

  const distanceDeltaPercent = input.deltaXpx / (input.viewportWidthPx * 0.92) * 100;
  const elevationDeltaM = -input.deltaYpx / (input.viewportHeightPx * 0.72) *
    input.elevationSpanM;

  return {
    distancePercent: rounded(clamp(
      input.startDistancePercent + distanceDeltaPercent,
      input.minimumDistancePercent,
      input.maximumDistancePercent
    )),
    elevationM: rounded(clamp(
      input.startElevationM + elevationDeltaM,
      MIN_TERRAIN_POINT_ELEVATION_M,
      MAX_TERRAIN_POINT_ELEVATION_M
    ))
  };
}
