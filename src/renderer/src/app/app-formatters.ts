import type { ModelPrediction, ResultStatus } from '../../../shared/domain';
import type { NumericInputKey } from './app-types';

export const statusLabels: Record<ResultStatus, string> = {
  compatible: 'Gözlem aralığıyla uyumlu',
  incompatible: 'Gözlem aralığıyla uyumsuz',
  indeterminate: 'Belirsizlik içinde karar verilemedi',
  unsupported: 'Fiziksel model kuralları tanımsız'
};

export const inputRanges: Record<NumericInputKey, { min: number; max: number }> = {
  observerHeightM: { min: 0, max: 100_000 },
  targetHeightM: { min: 0.1, max: 100_000 },
  observerGroundElevationM: { min: -12_000, max: 100_000 },
  targetGroundElevationM: { min: -12_000, max: 100_000 },
  verticalDatumOffsetM: { min: -1_000, max: 1_000 },
  terrainIntermediateDistancePercent: { min: 0.001, max: 99.999 },
  terrainIntermediateElevationM: { min: -12_000, max: 100_000 },
  surfaceDistanceKm: { min: 0, max: 20_000 },
  observerLatitudeDeg: { min: -90, max: 90 },
  observerLongitudeDeg: { min: -180, max: 180 },
  targetLatitudeDeg: { min: -90, max: 90 },
  targetLongitudeDeg: { min: -180, max: 180 },
  observedVisiblePercent: { min: 0, max: 100 },
  observationUncertaintyPercent: { min: 0, max: 100 },
  refractionCoefficient: { min: -1, max: 0.99 }
};

export const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

export const coordinateFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6
});

export const bearingFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 3
});

export function getMetric(
  prediction: ModelPrediction | undefined,
  key: string
): number | null {
  return prediction?.metrics.find((metric) => metric.key === key)?.value ?? null;
}

export function formatPercent(fraction: number | null): string {
  return fraction === null ? '—' : `%${numberFormatter.format(fraction * 100)}`;
}

export function formatDistance(distanceM: number | null, infinite = false): string {
  if (distanceM === null) return infinite ? '∞' : '—';
  return `${numberFormatter.format(distanceM / 1_000)} km`;
}

export function formatMetres(valueM: number | null): string {
  return valueM === null ? '—' : `${numberFormatter.format(valueM)} m`;
}

export function formatAngle(angleDeg: number | null): string {
  return angleDeg === null ? '—' : `${numberFormatter.format(angleDeg)}°`;
}

export function formatDifference(differencePp: number | null): string {
  return differencePp === null
    ? '—'
    : `${numberFormatter.format(differencePp)} puan`;
}

export function clampInputValue(key: NumericInputKey, value: number): number {
  const range = inputRanges[key];
  return Math.min(range.max, Math.max(range.min, value));
}
