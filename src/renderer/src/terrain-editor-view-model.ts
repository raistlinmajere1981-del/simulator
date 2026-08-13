import type {
  ImportedDemTerrainProfile,
  ImportedGeoJsonTerrainProfile,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import type { ManualTerrainPoint } from '../../shared/terrain';
import { sortManualTerrainPoints } from '../../simulation/manual-terrain-profile';
import { appLocaleTag, translate, type AppLocale } from './i18n';

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

export function terrainNumberFormatter(locale: AppLocale): Intl.NumberFormat {
  return new Intl.NumberFormat(appLocaleTag(locale), {
    maximumFractionDigits: 2
  });
}

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

export function distanceUnitLabel(locale: AppLocale, profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return translate(locale, 'terrain.import.distanceUnit.dem');
  if (isGeoJsonProfile(profile)) return translate(locale, 'terrain.import.distanceUnit.geojson');
  if (profile.distanceUnit === 'percent') return translate(locale, 'terrain.import.distanceUnit.percent');
  if (profile.distanceUnit === 'km') return translate(locale, 'terrain.import.distanceUnit.km');
  return translate(locale, 'terrain.import.distanceUnit.m');
}

export function sourceDistanceLabel(locale: AppLocale, profile: TerrainProfileImport): string {
  if (profile.sourceDistanceM === null) {
    return translate(locale, 'terrain.import.sourceDistancePercent');
  }
  const source = isDemProfile(profile)
    ? translate(locale, 'terrain.import.source.dem')
    : isGeoJsonProfile(profile)
      ? translate(locale, 'terrain.import.source.geojson')
      : translate(locale, 'terrain.import.source.csv');
  return translate(locale, 'terrain.import.sourceDistance', {
    distance: terrainNumberFormatter(locale).format(profile.sourceDistanceM / 1_000),
    source
  });
}

export function sourceRecordLabel(locale: AppLocale, profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return translate(locale, 'terrain.import.record.dem');
  if (isGeoJsonProfile(profile)) return translate(locale, 'terrain.import.record.geojson');
  return translate(locale, 'terrain.import.record.csv');
}

export function demDiagnosticLabel(
  locale: AppLocale,
  status: ImportedDemTerrainProfile['diagnosticStatus']
): string {
  if (status === 'good') return translate(locale, 'terrain.import.diagnostic.good');
  if (status === 'caution') return translate(locale, 'terrain.import.diagnostic.caution');
  return translate(locale, 'terrain.import.diagnostic.limited');
}

export function sourceRecordCount(profile: TerrainProfileImport): number {
  if (isDemProfile(profile)) return profile.sampleCount;
  if (isGeoJsonProfile(profile)) return profile.coordinateCount;
  return profile.rowCount;
}

export function delimiterLabel(locale: AppLocale, request: TerrainProfileMappingRequest): string {
  if (request.delimiter === 'semicolon') {
    return translate(locale, 'terrain.import.delimiter.semicolon');
  }
  if (request.delimiter === 'tab') return translate(locale, 'terrain.import.delimiter.tab');
  return translate(locale, 'terrain.import.delimiter.comma');
}
