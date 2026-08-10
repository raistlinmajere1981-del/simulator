import type { CalculationTrace, ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID,
  SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_VERSION,
  type SolarEclipseEventSearchResult,
  type SolarEclipseEventSearchStatus
} from './solar-eclipse-event-search';
import type { SolarEclipseInstantGeometryClass } from './solar-eclipse-overlap';

export interface SolarEclipseEventSearchSnapshot {
  status: SolarEclipseEventSearchStatus;
  anchorObservedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  windowStartIso: string;
  windowEndIso: string;
  halfWindowHours: number;
  coarseStepMinutes: number;
  coarseSampleCount: number;
  closestApproachIso: string;
  closestApproachOuterLimbClearanceDeg: number;
  overlapStartIso: string | null;
  maximumOverlapIso: string | null;
  maximumGeometryClass: SolarEclipseInstantGeometryClass | null;
  maximumSolarDiskCoveredFraction: number | null;
  maximumSolarDiameterCoverageRatio: number | null;
  maximumCenterSeparationDeg: number | null;
  maximumBothCentersAboveGeometricHorizon: boolean | null;
  overlapEndIso: string | null;
  overlapDurationMinutes: number | null;
  containedStartIso: string | null;
  containedEndIso: string | null;
  containedDurationMinutes: number | null;
  windowClipsEventStart: boolean;
  windowClipsEventEnd: boolean;
  warnings: string[];
}

export const solarEclipseEventSearchMetadata: ModelMetadata = {
  id: SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID,
  name: 'Güneş Tutulması Yerel Olay Araması · Düşük Hassasiyetli Referans',
  version: SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_VERSION,
  description: 'Kullanıcı kontrollü zaman penceresinde Güneş–Ay apparent disk örtüşmesinin yaklaşık başlangıç, maksimum ve bitişini arar.',
  capabilities: ['solar-eclipse-event-search'],
  assumptions: [
    'Mevcut NOAA Güneş ve düşük hassasiyetli topocentrik Ay referansları kullanılır.',
    'Kaba zaman taraması 5 dakika ve sınır inceltmesi yaklaşık 1 saniye toleransındadır.',
    'Bessel elemanları, resmi C1–C4 temasları, merkez hattı ve yüksek hassasiyetli efemeris değildir.'
  ]
};

const geometryCodes: Record<SolarEclipseInstantGeometryClass, number> = {
  'no-overlap': 0,
  'partial-overlap': 1,
  'total-type-contained': 2,
  'annular-type-contained': 3
};

function geometryFromCode(value: number | null): SolarEclipseInstantGeometryClass | null {
  switch (value) {
    case 0: return 'no-overlap';
    case 1: return 'partial-overlap';
    case 2: return 'total-type-contained';
    case 3: return 'annular-type-contained';
    default: return null;
  }
}

function isoToMs(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function msToIso(value: number | null): string | null {
  return value === null || !Number.isFinite(value) ? null : new Date(value).toISOString();
}

function metric(prediction: ModelPrediction, key: string): number | null {
  return prediction.metrics.find((item) => item.key === key)?.value ?? null;
}

export function snapshotSolarEclipseEventSearch(
  result: SolarEclipseEventSearchResult
): SolarEclipseEventSearchSnapshot {
  return {
    status: result.status,
    anchorObservedAtIso: result.anchorObservedAtIso,
    latitudeDeg: result.latitudeDeg,
    longitudeDeg: result.longitudeDeg,
    windowStartIso: result.windowStartIso,
    windowEndIso: result.windowEndIso,
    halfWindowHours: result.halfWindowHours,
    coarseStepMinutes: result.coarseStepMinutes,
    coarseSampleCount: result.coarseSampleCount,
    closestApproachIso: result.closestApproachIso,
    closestApproachOuterLimbClearanceDeg: result.closestApproach.outerLimbClearanceDeg,
    overlapStartIso: result.overlapStartIso,
    maximumOverlapIso: result.maximumOverlapIso,
    maximumGeometryClass: result.maximumOverlap?.geometryClass ?? null,
    maximumSolarDiskCoveredFraction: result.maximumOverlap?.solarDiskCoveredFraction ?? null,
    maximumSolarDiameterCoverageRatio: result.maximumOverlap?.solarDiameterCoverageRatio ?? null,
    maximumCenterSeparationDeg: result.maximumOverlap?.centerSeparationDeg ?? null,
    maximumBothCentersAboveGeometricHorizon: result.maximumOverlap?.bothCentersAboveGeometricHorizon ?? null,
    overlapEndIso: result.overlapEndIso,
    overlapDurationMinutes: result.overlapDurationMinutes,
    containedStartIso: result.containedStartIso,
    containedEndIso: result.containedEndIso,
    containedDurationMinutes: result.containedDurationMinutes,
    windowClipsEventStart: result.windowClipsEventStart,
    windowClipsEventEnd: result.windowClipsEventEnd,
    warnings: [...result.warnings]
  };
}

export function createSolarEclipseEventSearchPrediction(
  experimentId: string,
  snapshot: SolarEclipseEventSearchSnapshot
): ModelPrediction {
  const trace: CalculationTrace = {
    summary: snapshot.status === 'overlap-found'
      ? 'Kullanıcı kontrollü yerel zaman penceresinde Güneş–Ay disk örtüşme olayı bulundu ve özet zaman sınırları kaydedildi.'
      : 'Kullanıcı kontrollü yerel zaman penceresinde disk örtüşmesi bulunmadı; en yakın yaklaşım kaydedildi.',
    assumptions: [...solarEclipseEventSearchMetadata.assumptions],
    steps: [
      {
        id: 'search-window',
        title: 'Kontrollü arama penceresi',
        formula: 't ∈ [t₀−Δt, t₀+Δt]',
        substitution: `t₀=${snapshot.anchorObservedAtIso}; Δt=±${snapshot.halfWindowHours} saat; kaba adım=${snapshot.coarseStepMinutes} dk`,
        result: `${snapshot.coarseSampleCount} kaba örnek`
      },
      {
        id: 'closest-approach',
        title: 'En yakın yaklaşım',
        formula: 'min[dış limb açıklığı(t)]',
        substitution: snapshot.closestApproachIso,
        result: `dış limb açıklığı=${snapshot.closestApproachOuterLimbClearanceDeg.toFixed(8)}°`
      },
      {
        id: 'event-summary',
        title: 'Yerel örtüşme özeti',
        formula: 'dış limb işaret geçişleri + yerel maksimum örtüşme',
        substitution: snapshot.status,
        result: snapshot.status === 'overlap-found'
          ? `${snapshot.overlapStartIso ?? 'pencere dışı'} → ${snapshot.maximumOverlapIso ?? '—'} → ${snapshot.overlapEndIso ?? 'pencere dışı'}`
          : 'Seçilen pencerede disk örtüşmesi yok'
      }
    ]
  };

  return {
    modelId: SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      { key: 'eclipseSearchFound', label: 'Yerel örtüşme bulundu', value: snapshot.status === 'overlap-found' ? 1 : 0, unit: 'boolean' },
      { key: 'eclipseSearchAnchorUnixMs', label: 'Arama merkezi', value: isoToMs(snapshot.anchorObservedAtIso), unit: 'unix-ms' },
      { key: 'eclipseSearchLatitudeDeg', label: 'Gözlemci enlemi', value: snapshot.latitudeDeg, unit: 'deg' },
      { key: 'eclipseSearchLongitudeDeg', label: 'Gözlemci boylamı', value: snapshot.longitudeDeg, unit: 'deg' },
      { key: 'eclipseSearchWindowStartUnixMs', label: 'Arama penceresi başlangıcı', value: isoToMs(snapshot.windowStartIso), unit: 'unix-ms' },
      { key: 'eclipseSearchWindowEndUnixMs', label: 'Arama penceresi bitişi', value: isoToMs(snapshot.windowEndIso), unit: 'unix-ms' },
      { key: 'eclipseSearchHalfWindowHours', label: 'Yarım arama penceresi', value: snapshot.halfWindowHours, unit: 'h' },
      { key: 'eclipseSearchCoarseStepMinutes', label: 'Kaba tarama adımı', value: snapshot.coarseStepMinutes, unit: 'min' },
      { key: 'eclipseSearchCoarseSampleCount', label: 'Kaba tarama örnek sayısı', value: snapshot.coarseSampleCount, unit: 'count' },
      { key: 'eclipseClosestApproachUnixMs', label: 'En yakın yaklaşım zamanı', value: isoToMs(snapshot.closestApproachIso), unit: 'unix-ms' },
      { key: 'eclipseClosestOuterLimbClearanceDeg', label: 'En yakın dış limb açıklığı', value: snapshot.closestApproachOuterLimbClearanceDeg, unit: 'deg' },
      { key: 'eclipseOverlapStartUnixMs', label: 'Yaklaşık örtüşme başlangıcı', value: isoToMs(snapshot.overlapStartIso), unit: 'unix-ms' },
      { key: 'eclipseMaximumOverlapUnixMs', label: 'Maksimum örtüşme zamanı', value: isoToMs(snapshot.maximumOverlapIso), unit: 'unix-ms' },
      { key: 'eclipseOverlapEndUnixMs', label: 'Yaklaşık örtüşme bitişi', value: isoToMs(snapshot.overlapEndIso), unit: 'unix-ms' },
      { key: 'eclipseOverlapDurationMinutes', label: 'Yaklaşık örtüşme süresi', value: snapshot.overlapDurationMinutes, unit: 'min' },
      { key: 'eclipseMaximumGeometryClass', label: 'Maksimum geometrik sınıf kodu', value: snapshot.maximumGeometryClass === null ? null : geometryCodes[snapshot.maximumGeometryClass], unit: 'code' },
      { key: 'eclipseMaximumSolarDiskCoveredFraction', label: 'Maksimum Güneş disk alanı örtüşmesi', value: snapshot.maximumSolarDiskCoveredFraction, unit: 'fraction' },
      { key: 'eclipseMaximumSolarDiameterCoverageRatio', label: 'Maksimum çap örtme oranı', value: snapshot.maximumSolarDiameterCoverageRatio, unit: 'fraction' },
      { key: 'eclipseMaximumCenterSeparationDeg', label: 'Maksimumdaki merkez ayrımı', value: snapshot.maximumCenterSeparationDeg, unit: 'deg' },
      { key: 'eclipseMaximumBothCentersAboveHorizon', label: 'Maksimumda iki merkez geometrik ufuk üstünde', value: snapshot.maximumBothCentersAboveGeometricHorizon === null ? null : snapshot.maximumBothCentersAboveGeometricHorizon ? 1 : 0, unit: 'boolean' },
      { key: 'eclipseContainedStartUnixMs', label: 'İç kapsama başlangıcı', value: isoToMs(snapshot.containedStartIso), unit: 'unix-ms' },
      { key: 'eclipseContainedEndUnixMs', label: 'İç kapsama bitişi', value: isoToMs(snapshot.containedEndIso), unit: 'unix-ms' },
      { key: 'eclipseContainedDurationMinutes', label: 'İç kapsama süresi', value: snapshot.containedDurationMinutes, unit: 'min' },
      { key: 'eclipseWindowClipsEventStart', label: 'Arama penceresi olay başlangıcını kırpıyor', value: snapshot.windowClipsEventStart ? 1 : 0, unit: 'boolean' },
      { key: 'eclipseWindowClipsEventEnd', label: 'Arama penceresi olay bitişini kırpıyor', value: snapshot.windowClipsEventEnd ? 1 : 0, unit: 'boolean' }
    ],
    warnings: [...snapshot.warnings],
    traceId: `${SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID}:${snapshot.anchorObservedAtIso}:${snapshot.latitudeDeg.toFixed(6)}:${snapshot.longitudeDeg.toFixed(6)}:${snapshot.halfWindowHours}`,
    trace
  };
}

export function readSolarEclipseEventSearchSnapshot(
  prediction: ModelPrediction | undefined
): SolarEclipseEventSearchSnapshot | undefined {
  if (!prediction || prediction.modelId !== SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID) return undefined;

  const anchor = msToIso(metric(prediction, 'eclipseSearchAnchorUnixMs'));
  const windowStart = msToIso(metric(prediction, 'eclipseSearchWindowStartUnixMs'));
  const windowEnd = msToIso(metric(prediction, 'eclipseSearchWindowEndUnixMs'));
  const closestApproach = msToIso(metric(prediction, 'eclipseClosestApproachUnixMs'));
  const latitudeDeg = metric(prediction, 'eclipseSearchLatitudeDeg');
  const longitudeDeg = metric(prediction, 'eclipseSearchLongitudeDeg');
  const halfWindowHours = metric(prediction, 'eclipseSearchHalfWindowHours');
  const coarseStepMinutes = metric(prediction, 'eclipseSearchCoarseStepMinutes');
  const coarseSampleCount = metric(prediction, 'eclipseSearchCoarseSampleCount');
  const closestOuter = metric(prediction, 'eclipseClosestOuterLimbClearanceDeg');
  const found = metric(prediction, 'eclipseSearchFound');

  if (!anchor || !windowStart || !windowEnd || !closestApproach ||
    latitudeDeg === null || longitudeDeg === null || halfWindowHours === null ||
    coarseStepMinutes === null || coarseSampleCount === null || closestOuter === null || found === null) {
    return undefined;
  }

  const maximumBoth = metric(prediction, 'eclipseMaximumBothCentersAboveHorizon');
  return {
    status: found >= 0.5 ? 'overlap-found' : 'no-overlap-in-window',
    anchorObservedAtIso: anchor,
    latitudeDeg,
    longitudeDeg,
    windowStartIso: windowStart,
    windowEndIso: windowEnd,
    halfWindowHours,
    coarseStepMinutes,
    coarseSampleCount,
    closestApproachIso: closestApproach,
    closestApproachOuterLimbClearanceDeg: closestOuter,
    overlapStartIso: msToIso(metric(prediction, 'eclipseOverlapStartUnixMs')),
    maximumOverlapIso: msToIso(metric(prediction, 'eclipseMaximumOverlapUnixMs')),
    maximumGeometryClass: geometryFromCode(metric(prediction, 'eclipseMaximumGeometryClass')),
    maximumSolarDiskCoveredFraction: metric(prediction, 'eclipseMaximumSolarDiskCoveredFraction'),
    maximumSolarDiameterCoverageRatio: metric(prediction, 'eclipseMaximumSolarDiameterCoverageRatio'),
    maximumCenterSeparationDeg: metric(prediction, 'eclipseMaximumCenterSeparationDeg'),
    maximumBothCentersAboveGeometricHorizon: maximumBoth === null ? null : maximumBoth >= 0.5,
    overlapEndIso: msToIso(metric(prediction, 'eclipseOverlapEndUnixMs')),
    overlapDurationMinutes: metric(prediction, 'eclipseOverlapDurationMinutes'),
    containedStartIso: msToIso(metric(prediction, 'eclipseContainedStartUnixMs')),
    containedEndIso: msToIso(metric(prediction, 'eclipseContainedEndUnixMs')),
    containedDurationMinutes: metric(prediction, 'eclipseContainedDurationMinutes'),
    windowClipsEventStart: (metric(prediction, 'eclipseWindowClipsEventStart') ?? 0) >= 0.5,
    windowClipsEventEnd: (metric(prediction, 'eclipseWindowClipsEventEnd') ?? 0) >= 0.5,
    warnings: [...prediction.warnings]
  };
}
