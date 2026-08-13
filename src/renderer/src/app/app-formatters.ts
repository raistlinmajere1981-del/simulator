import type { ModelPrediction, ResultStatus } from '../../../shared/domain';
import {
  appLocaleTag,
  translate,
  type AppLocale,
  type TranslationKey
} from '../i18n';
import type { NumericInputKey } from './app-types';

export const statusLabels: Record<ResultStatus, string> = {
  compatible: 'Gözlem aralığıyla uyumlu',
  incompatible: 'Gözlem aralığıyla uyumsuz',
  indeterminate: 'Belirsizlik içinde karar verilemedi',
  unsupported: 'Fiziksel model kuralları tanımsız'
};

const statusTranslationKeys: Record<ResultStatus, TranslationKey> = {
  compatible: 'result.status.compatible',
  incompatible: 'result.status.incompatible',
  indeterminate: 'result.status.indeterminate',
  unsupported: 'result.status.unsupported'
};

export function getStatusLabel(locale: AppLocale, status: ResultStatus): string {
  return translate(locale, statusTranslationKeys[status]);
}

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

const numberFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 2 })
};
const coordinateFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { minimumFractionDigits: 4, maximumFractionDigits: 6 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { minimumFractionDigits: 4, maximumFractionDigits: 6 })
};
const bearingFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 3 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 3 })
};

// Historical exports remain Turkish until each legacy caller is migrated to an explicit locale.
export const numberFormatter = numberFormatters.tr;
export const coordinateFormatter = coordinateFormatters.tr;
export const bearingFormatter = bearingFormatters.tr;

export function numberFormatterFor(locale: AppLocale): Intl.NumberFormat {
  return numberFormatters[locale];
}

export function coordinateFormatterFor(locale: AppLocale): Intl.NumberFormat {
  return coordinateFormatters[locale];
}

export function bearingFormatterFor(locale: AppLocale): Intl.NumberFormat {
  return bearingFormatters[locale];
}

export function getMetric(
  prediction: ModelPrediction | undefined,
  key: string
): number | null {
  return prediction?.metrics.find((metric) => metric.key === key)?.value ?? null;
}

export function formatPercentValue(valuePercent: number, locale: AppLocale = 'tr'): string {
  const formatted = numberFormatterFor(locale).format(valuePercent);
  return locale === 'tr' ? `%${formatted}` : `${formatted}%`;
}

export function formatSignedPercentValue(valuePercent: number, locale: AppLocale = 'tr'): string {
  const formatted = numberFormatterFor(locale).format(valuePercent);
  return locale === 'tr' ? `±%${formatted}` : `±${formatted}%`;
}

export function formatPercent(fraction: number | null, locale: AppLocale = 'tr'): string {
  return fraction === null ? '—' : formatPercentValue(fraction * 100, locale);
}

export function formatDistance(
  distanceM: number | null,
  infinite = false,
  locale: AppLocale = 'tr'
): string {
  if (distanceM === null) return infinite ? '∞' : '—';
  return `${numberFormatterFor(locale).format(distanceM / 1_000)} km`;
}

export function formatMetres(valueM: number | null, locale: AppLocale = 'tr'): string {
  return valueM === null ? '—' : `${numberFormatterFor(locale).format(valueM)} m`;
}

export function formatAngle(angleDeg: number | null, locale: AppLocale = 'tr'): string {
  return angleDeg === null ? '—' : `${numberFormatterFor(locale).format(angleDeg)}°`;
}

export function formatDifference(differencePp: number | null, locale: AppLocale = 'tr'): string {
  if (differencePp === null) return '—';
  return locale === 'tr'
    ? `${numberFormatterFor(locale).format(differencePp)} puan`
    : `${numberFormatterFor(locale).format(differencePp)} pp`;
}

export function clampInputValue(key: NumericInputKey, value: number): number {
  const range = inputRanges[key];
  return Math.min(range.max, Math.max(range.min, value));
}
