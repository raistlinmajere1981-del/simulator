import type {
  ImportedDemTerrainProfile,
  ImportedGeoJsonTerrainProfile,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import type { ManualTerrainPoint } from '../../shared/terrain';
import { sortManualTerrainPoints } from '../../simulation/manual-terrain-profile';

export interface PreviewPoint {
  id: string;
  distancePercent: number;
  elevationM: number;
  endpoint: boolean;
}

export interface TerrainPointDragState {
  pointerId: number;
  pointId: string;
  startClientX: number;
  startClientY: number;
  startDistancePercent: number;
  startElevationM: number;
  minimumDistancePercent: number;
  maximumDistancePercent: number;
  elevationSpanM: number;
}

export const MAX_EDITOR_POINTS = 2_000;
export const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

function newPointId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `terrain-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function interpolateElevation(
  left: PreviewPoint,
  right: PreviewPoint,
  distancePercent: number
): number {
  const span = right.distancePercent - left.distancePercent;
  if (span <= 0) return left.elevationM;
  const fraction = (distancePercent - left.distancePercent) / span;
  return left.elevationM + (right.elevationM - left.elevationM) * fraction;
}

export function findLargestGapPoint(
  points: readonly ManualTerrainPoint[],
  observerGroundElevationM: number,
  targetGroundElevationM: number
): ManualTerrainPoint {
  const all: PreviewPoint[] = [
    {
      id: 'observer-endpoint',
      distancePercent: 0,
      elevationM: observerGroundElevationM,
      endpoint: true
    },
    ...sortManualTerrainPoints(points).map((point) => ({ ...point, endpoint: false })),
    {
      id: 'target-endpoint',
      distancePercent: 100,
      elevationM: targetGroundElevationM,
      endpoint: true
    }
  ];

  const first = all[0];
  const second = all[1];
  if (!first || !second) {
    throw new RangeError('Profilin başlangıç ve bitiş noktaları oluşturulamadı.');
  }

  let bestLeft: PreviewPoint = first;
  let bestRight: PreviewPoint = second;
  let bestGap = bestRight.distancePercent - bestLeft.distancePercent;

  for (let index = 1; index < all.length - 1; index += 1) {
    const left = all[index];
    const right = all[index + 1];
    if (!left || !right) continue;
    const gap = right.distancePercent - left.distancePercent;
    if (gap > bestGap) {
      bestLeft = left;
      bestRight = right;
      bestGap = gap;
    }
  }

  const distancePercent = (bestLeft.distancePercent + bestRight.distancePercent) / 2;
  return {
    id: newPointId(),
    distancePercent,
    elevationM: interpolateElevation(bestLeft, bestRight, distancePercent)
  };
}

export function previewCoordinates(points: readonly PreviewPoint[]): {
  polyline: string;
  minimumElevationM: number;
  maximumElevationM: number;
} {
  const elevations = points.map((point) => point.elevationM);
  const minimumElevationM = Math.min(...elevations);
  const maximumElevationM = Math.max(...elevations);
  const range = Math.max(1, maximumElevationM - minimumElevationM);
  const polyline = points.map((point) => {
    const x = 4 + point.distancePercent * 0.92;
    const normalized = (point.elevationM - minimumElevationM) / range;
    const y = 88 - normalized * 72;
    return `${x},${y}`;
  }).join(' ');
  return { polyline, minimumElevationM, maximumElevationM };
}

export function isGeoJsonProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return 'kind' in profile && profile.kind === 'geojson';
}

export function isDemProfile(
  profile: TerrainProfileImport
): profile is ImportedDemTerrainProfile {
  return 'kind' in profile && profile.kind === 'dem';
}

export function distanceUnitLabel(profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return 'WGS84 rota örnekleri';
  if (isGeoJsonProfile(profile)) return 'WGS84 koordinatları';
  if (profile.distanceUnit === 'percent') return 'rotanın yüzdesi';
  if (profile.distanceUnit === 'km') return 'kilometre';
  return 'metre';
}

export function sourceDistanceLabel(profile: TerrainProfileImport): string {
  if (profile.sourceDistanceM === null) return 'Konumlar yüzde olarak verilmiş';
  const sourceLabel = isDemProfile(profile)
    ? 'DEM örnek rotası'
    : isGeoJsonProfile(profile)
      ? 'GeoJSON rotası'
      : 'CSV rotası';
  return `${numberFormatter.format(profile.sourceDistanceM / 1_000)} km ${sourceLabel}`;
}

export function sourceRecordLabel(profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return 'DEM rota örneği';
  if (isGeoJsonProfile(profile)) return 'GeoJSON koordinatı';
  return 'Dosyadaki veri satırı';
}

export function demDiagnosticLabel(status: ImportedDemTerrainProfile['diagnosticStatus']): string {
  if (status === 'good') return 'iyi';
  if (status === 'caution') return 'dikkat';
  return 'sınırlı';
}

export function sourceRecordCount(profile: TerrainProfileImport): number {
  if (isDemProfile(profile)) return profile.sampleCount;
  if (isGeoJsonProfile(profile)) return profile.coordinateCount;
  return profile.rowCount;
}

export function delimiterLabel(request: TerrainProfileMappingRequest): string {
  if (request.delimiter === 'semicolon') return 'noktalı virgül (;)';
  if (request.delimiter === 'tab') return 'sekme';
  return 'virgül (,)';
}
