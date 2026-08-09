import type { CalculationTrace, ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  BRIGHT_STAR_CATALOG,
  BRIGHT_STAR_CATALOG_ID,
  BRIGHT_STAR_CATALOG_SOURCE,
  BRIGHT_STAR_CATALOG_VERSION,
  resolveBrightStarForObservation,
  type BrightStarCatalogEntry
} from './bright-star-catalog';
import { calculateStellarPosition, type StellarPositionResult } from './stellar-position';
import { calculateStellarTrail, type StellarTrailResult } from './stellar-trail';

export const STELLAR_OBSERVATION_MODEL_ID = 'stellar-observation-reference';
export const STELLAR_OBSERVATION_MODEL_VERSION = '0.1.0';

export interface StellarObservationSettings {
  starId: string;
  trailDurationMinutes: number;
  trailSampleIntervalMinutes: number;
}

export const DEFAULT_STELLAR_OBSERVATION_SETTINGS: StellarObservationSettings = {
  starId: 'hr-7001',
  trailDurationMinutes: 720,
  trailSampleIntervalMinutes: 10
};

export interface StellarObservationResult {
  experimentId: string;
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  settings: StellarObservationSettings;
  star: BrightStarCatalogEntry;
  sourceRightAscensionJ2000Deg: number;
  sourceDeclinationJ2000Deg: number;
  meanOfDateRightAscensionDeg: number;
  meanOfDateDeclinationDeg: number;
  precessionAngularShiftArcsec: number;
  position: StellarPositionResult;
  trail: StellarTrailResult;
  traceId: string;
  trace: CalculationTrace;
  warnings: string[];
}

export class StellarObservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarObservationError';
  }
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateSettings(settings: StellarObservationSettings): void {
  const star = BRIGHT_STAR_CATALOG.find((candidate) => candidate.id === settings.starId);
  if (!star) throw new StellarObservationError(`Bilinmeyen parlak yıldız katalog kimliği: ${settings.starId}`);
  if (!Number.isFinite(settings.trailDurationMinutes) || settings.trailDurationMinutes <= 0 || settings.trailDurationMinutes > 2_880) {
    throw new StellarObservationError('Yıldız izi süresi 0 dakikadan büyük ve en fazla 48 saat olmalıdır.');
  }
  if (!Number.isFinite(settings.trailSampleIntervalMinutes) || settings.trailSampleIntervalMinutes <= 0) {
    throw new StellarObservationError('Yıldız izi örnekleme aralığı pozitif olmalıdır.');
  }
  const sampleCount = Math.ceil(settings.trailDurationMinutes / settings.trailSampleIntervalMinutes) + 1;
  if (sampleCount > 4_000) {
    throw new StellarObservationError('Yıldız izi ayarları 4.000 örnek sınırını aşar.');
  }
}

export function calculateStellarObservation(input: {
  experimentId: string;
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  settings: StellarObservationSettings;
}): StellarObservationResult {
  validateSettings(input.settings);
  const resolved = resolveBrightStarForObservation(input.settings.starId, input.observedAtIso);
  const rightAscensionDeg = resolved.precession.meanOfDateRightAscensionDeg;
  const declinationDeg = resolved.precession.meanOfDateDeclinationDeg;
  const position = calculateStellarPosition({
    observedAtIso: input.observedAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg,
    declinationDeg,
    label: resolved.star.commonName
  });
  const trail = calculateStellarTrail({
    startAtIso: input.observedAtIso,
    durationMinutes: input.settings.trailDurationMinutes,
    sampleIntervalMinutes: input.settings.trailSampleIntervalMinutes,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg,
    declinationDeg,
    label: resolved.star.commonName
  });

  const warnings = [
    `Katalog kaynağı: ${BRIGHT_STAR_CATALOG_SOURCE}; çevrimdışı altküme=${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}.`,
    'Katalog koordinatı ortalama J2000 sisteminden IAU 2006 precession ile gözlem tarihinin ortalama ekvator/equinox sistemine dönüştürülür.',
    'Proper motion, yıllık paralaks, radyal hız, nutation, aberration ve ışık sapması uygulanmaz.',
    'Atmosferik kırılma, yıldız sönümlemesi, gökyüzü parlaklığı ve topoğrafik ufuk uygulanmaz; görünürlük geometrik 0° ufuk anlamındadır.',
    'Bu astronomik referans tek başına herhangi bir Dünya şekli modelini doğrulamaz.'
  ];
  const traceId = `${STELLAR_OBSERVATION_MODEL_ID}:${input.experimentId}:${resolved.star.id}:${position.observedAtIso}`;
  const trace: CalculationTrace = {
    summary: `${resolved.star.commonName} için J2000 katalog yönü gözlem tarihine dönüştürüldü; anlık geometrik konum ve seçilen pencere boyunca yıldız izi hesaplandı.`,
    assumptions: warnings,
    steps: [
      {
        id: 'catalog-source',
        title: 'Katalog yıldızı',
        formula: 'BSC5P altkümesi → J2000 (α₀, δ₀)',
        substitution: `${resolved.star.commonName} · ${resolved.star.bayerDesignation} · HR ${resolved.star.hrNumber}`,
        result: `α₀=${format(resolved.star.rightAscensionJ2000Deg)}°; δ₀=${format(resolved.star.declinationJ2000Deg)}°; V=${format(resolved.star.visualMagnitude, 2)}`
      },
      ...resolved.precession.trace.steps.map((step) => ({ ...step, id: `precession-${step.id}` })),
      ...position.trace.steps.map((step) => ({ ...step, id: `position-${step.id}` })),
      {
        id: 'trail-summary',
        title: 'Yıldız izi penceresi',
        formula: 't ∈ [t₀, t₀+Δt]; her örnekte (α_t,δ_t) → (h,A)',
        substitution: `Δt=${format(input.settings.trailDurationMinutes)} dk; örnek aralığı=${format(input.settings.trailSampleIntervalMinutes)} dk`,
        result: `${trail.samples.length} örnek; geometrik ufuk üstü=${format(trail.visibleDurationMinutes)} dk; geçiş=${trail.horizonCrossings.length}`
      }
    ]
  };

  return {
    experimentId: input.experimentId,
    observedAtIso: position.observedAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    settings: { ...input.settings },
    star: resolved.star,
    sourceRightAscensionJ2000Deg: resolved.star.rightAscensionJ2000Deg,
    sourceDeclinationJ2000Deg: resolved.star.declinationJ2000Deg,
    meanOfDateRightAscensionDeg: rightAscensionDeg,
    meanOfDateDeclinationDeg: declinationDeg,
    precessionAngularShiftArcsec: resolved.precession.angularShiftArcsec,
    position,
    trail,
    traceId,
    trace,
    warnings
  };
}

export const stellarObservationMetadata: ModelMetadata = {
  id: STELLAR_OBSERVATION_MODEL_ID,
  name: 'Yıldız Gözlemi · Astronomik Referans',
  version: STELLAR_OBSERVATION_MODEL_VERSION,
  description: 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü gözlem tarihine dönüştürüp geometrik yerel konum ve yıldız izi üreten astronomik referans.',
  capabilities: ['stellar-position'],
  assumptions: [
    'Katalog yönü ortalama J2000 koordinatıdır ve gözlem tarihine açık precession adımıyla dönüştürülür.',
    'Proper motion ve diğer yüksek hassasiyetli astrometrik düzeltmeler uygulanmaz.',
    'Optik görünürlük koşulları ve topoğrafik ufuk bu modelde yoktur.'
  ]
};

export function createStellarObservationPrediction(result: StellarObservationResult): ModelPrediction {
  return {
    modelId: STELLAR_OBSERVATION_MODEL_ID,
    experimentId: result.experimentId,
    status: 'compatible',
    metrics: [
      { key: 'stellarCatalogHrNumber', label: 'HR katalog numarası', value: result.star.hrNumber, unit: 'count' },
      { key: 'stellarVisualMagnitude', label: 'Görsel kadir', value: result.star.visualMagnitude, unit: 'mag' },
      { key: 'stellarSourceRaJ2000Deg', label: 'J2000 sağ açıklık', value: result.sourceRightAscensionJ2000Deg, unit: 'deg' },
      { key: 'stellarSourceDecJ2000Deg', label: 'J2000 deklinasyon', value: result.sourceDeclinationJ2000Deg, unit: 'deg' },
      { key: 'stellarMeanOfDateRaDeg', label: 'Gözlem tarihi sağ açıklık', value: result.meanOfDateRightAscensionDeg, unit: 'deg' },
      { key: 'stellarMeanOfDateDecDeg', label: 'Gözlem tarihi deklinasyon', value: result.meanOfDateDeclinationDeg, unit: 'deg' },
      { key: 'stellarPrecessionShiftArcsec', label: 'Precession açısal kayması', value: result.precessionAngularShiftArcsec, unit: 'arcsec' },
      { key: 'stellarElevationDeg', label: 'Geometrik yıldız yüksekliği', value: result.position.elevationDeg, unit: 'deg' },
      { key: 'stellarAzimuthDeg', label: 'Yıldız azimutu', value: result.position.azimuthDeg, unit: 'deg' },
      { key: 'localMeanSiderealTimeDeg', label: 'Yerel ortalama yıldız zamanı', value: result.position.localMeanSiderealTimeDeg, unit: 'deg' },
      { key: 'starAboveGeometricHorizon', label: 'Geometrik ufkun üstünde', value: result.position.aboveGeometricHorizon ? 1 : 0, unit: 'boolean' },
      { key: 'stellarTrailDurationMinutes', label: 'Yıldız izi süresi', value: result.settings.trailDurationMinutes, unit: 'min' },
      { key: 'stellarTrailSampleIntervalMinutes', label: 'Yıldız izi örnekleme aralığı', value: result.settings.trailSampleIntervalMinutes, unit: 'min' },
      { key: 'stellarTrailVisibleDurationMinutes', label: 'İz penceresinde geometrik ufuk üstü süre', value: result.trail.visibleDurationMinutes, unit: 'min' },
      { key: 'stellarTrailMinimumElevationDeg', label: 'İz minimum yüksekliği', value: result.trail.sampledMinimumElevationDeg, unit: 'deg' },
      { key: 'stellarTrailMaximumElevationDeg', label: 'İz maksimum yüksekliği', value: result.trail.sampledMaximumElevationDeg, unit: 'deg' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}

export function readStellarObservationSettings(prediction: ModelPrediction | undefined): StellarObservationSettings {
  if (!prediction || prediction.modelId !== STELLAR_OBSERVATION_MODEL_ID) {
    return { ...DEFAULT_STELLAR_OBSERVATION_SETTINGS };
  }
  const metricValue = (key: string): number | null | undefined => prediction.metrics.find((metric) => metric.key === key)?.value;
  const hrNumber = metricValue('stellarCatalogHrNumber');
  const star = typeof hrNumber === 'number'
    ? BRIGHT_STAR_CATALOG.find((candidate) => candidate.hrNumber === Math.round(hrNumber))
    : undefined;
  const duration = metricValue('stellarTrailDurationMinutes');
  const interval = metricValue('stellarTrailSampleIntervalMinutes');
  return {
    starId: star?.id ?? DEFAULT_STELLAR_OBSERVATION_SETTINGS.starId,
    trailDurationMinutes: typeof duration === 'number' && duration > 0 && duration <= 2_880
      ? duration
      : DEFAULT_STELLAR_OBSERVATION_SETTINGS.trailDurationMinutes,
    trailSampleIntervalMinutes: typeof interval === 'number' && interval > 0
      ? interval
      : DEFAULT_STELLAR_OBSERVATION_SETTINGS.trailSampleIntervalMinutes
  };
}
