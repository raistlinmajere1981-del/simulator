import type { CalculationTrace, ModelMetadata, ModelPrediction } from '../shared/domain';
import type { SavedStellarLocalHorizonSource } from '../shared/stellar-local-horizon-import';
import {
  BRIGHT_STAR_CATALOG,
  BRIGHT_STAR_CATALOG_ID,
  BRIGHT_STAR_CATALOG_SOURCE,
  BRIGHT_STAR_CATALOG_VERSION,
  resolveBrightStarForObservation,
  type BrightStarCatalogEntry
} from './bright-star-catalog';
import {
  calculateStellarApparentDiagnostic,
  type StellarApparentDiagnosticResult
} from './stellar-apparent-diagnostic';
import { calculateStellarAtmosphericRefraction } from './stellar-atmospheric-refraction';
import {
  calculateStellarLocalHorizonTrail,
  type StellarLocalHorizonTrailResult
} from './stellar-local-horizon-trail';
import {
  normalizeStellarLocalHorizonMask,
  type StellarLocalHorizonMask
} from './stellar-local-horizon';
import { calculateStellarSkySnapshot, type StellarSkySnapshotResult } from './stellar-sky-snapshot';
import { calculateStellarPosition, type StellarPositionResult } from './stellar-position';
import { calculateStellarTrail, type StellarTrailResult } from './stellar-trail';
import {
  resolveVerifiedBrightStarMotionReference,
  type VerifiedBrightStarMotionSubset
} from './bsc5p-motion-subset';
import type { StellarProperMotionResult } from './stellar-proper-motion';

export const STELLAR_OBSERVATION_MODEL_ID = 'stellar-observation-reference';
export const STELLAR_OBSERVATION_MODEL_VERSION = '0.6.0';

export type StellarLocalHorizonSourceMode = 'manual' | 'external';

export interface StellarObservationSettings {
  starId: string;
  trailDurationMinutes: number;
  trailSampleIntervalMinutes: number;
  localHorizonEnabled: boolean;
  localHorizonSourceMode: StellarLocalHorizonSourceMode;
  localHorizonNorthDeg: number;
  localHorizonNorthEastDeg: number;
  localHorizonEastDeg: number;
  localHorizonSouthEastDeg: number;
  localHorizonSouthDeg: number;
  localHorizonSouthWestDeg: number;
  localHorizonWestDeg: number;
  localHorizonNorthWestDeg: number;
}

export const DEFAULT_STELLAR_OBSERVATION_SETTINGS: StellarObservationSettings = {
  starId: 'hr-7001',
  trailDurationMinutes: 720,
  trailSampleIntervalMinutes: 10,
  localHorizonEnabled: false,
  localHorizonSourceMode: 'manual',
  localHorizonNorthDeg: 0,
  localHorizonNorthEastDeg: 0,
  localHorizonEastDeg: 0,
  localHorizonSouthEastDeg: 0,
  localHorizonSouthDeg: 0,
  localHorizonSouthWestDeg: 0,
  localHorizonWestDeg: 0,
  localHorizonNorthWestDeg: 0
};

export const STELLAR_LOCAL_HORIZON_DIRECTIONS = [
  { key: 'localHorizonNorthDeg', label: 'K', azimuthDeg: 0 },
  { key: 'localHorizonNorthEastDeg', label: 'KD', azimuthDeg: 45 },
  { key: 'localHorizonEastDeg', label: 'D', azimuthDeg: 90 },
  { key: 'localHorizonSouthEastDeg', label: 'GD', azimuthDeg: 135 },
  { key: 'localHorizonSouthDeg', label: 'G', azimuthDeg: 180 },
  { key: 'localHorizonSouthWestDeg', label: 'GB', azimuthDeg: 225 },
  { key: 'localHorizonWestDeg', label: 'B', azimuthDeg: 270 },
  { key: 'localHorizonNorthWestDeg', label: 'KB', azimuthDeg: 315 }
] as const;

export type StellarLocalHorizonSettingKey = typeof STELLAR_LOCAL_HORIZON_DIRECTIONS[number]['key'];

export interface StellarObservationLocalHorizonSourceSummary {
  mode: StellarLocalHorizonSourceMode;
  label: string;
  pointCount: number;
  maximumAzimuthGapDeg: number;
  fileName?: string;
  fileSizeBytes?: number;
  sha256?: string;
  importedAtIso?: string;
  warnings: string[];
}

export interface StellarObservationApparentTrailSample {
  observedAtIso: string;
  elapsedMinutes: number;
  geometricAltitudeDeg: number;
  apparentAltitudeDeg: number;
  refractionCorrectionArcmin: number;
  aboveApparentAstronomicalHorizon: boolean;
}

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
  properMotion: StellarProperMotionResult | null;
  properMotionSourceId: string | null;
  properMotionSourceVersion: string | null;
  position: StellarPositionResult;
  trail: StellarTrailResult;
  localHorizonTrail: StellarLocalHorizonTrailResult | null;
  localHorizonSource: StellarObservationLocalHorizonSourceSummary | null;
  apparentDiagnostic: StellarApparentDiagnosticResult;
  apparentTrailSamples: StellarObservationApparentTrailSample[];
  skySnapshot: StellarSkySnapshotResult;
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

function cloneDefaultSettings(): StellarObservationSettings {
  return { ...DEFAULT_STELLAR_OBSERVATION_SETTINGS };
}

function localHorizonMaskFromSettings(settings: StellarObservationSettings): StellarLocalHorizonMask {
  return {
    sourceKind: 'manual',
    sourceLabel: 'Yıldız Gözlemleri · 8 yönlü manuel skyline',
    points: STELLAR_LOCAL_HORIZON_DIRECTIONS.map((direction) => ({
      azimuthDeg: direction.azimuthDeg,
      altitudeDeg: settings[direction.key]
    }))
  };
}

function localHorizonMaskFromExternal(source: SavedStellarLocalHorizonSource): StellarLocalHorizonMask {
  return {
    sourceKind: 'external',
    sourceLabel: source.fileName,
    points: source.points.map((point) => ({ ...point }))
  };
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
  if (settings.localHorizonSourceMode !== 'manual' && settings.localHorizonSourceMode !== 'external') {
    throw new StellarObservationError('Yerel ufuk kaynak modu manual veya external olmalıdır.');
  }
  for (const direction of STELLAR_LOCAL_HORIZON_DIRECTIONS) {
    const value = settings[direction.key];
    if (!Number.isFinite(value) || value < -90 || value > 90) {
      throw new StellarObservationError(`${direction.label} yerel ufuk yüksekliği -90° ile +90° arasında olmalıdır.`);
    }
  }
}

function resolveLocalHorizon(input: {
  settings: StellarObservationSettings;
  externalLocalHorizonSource?: SavedStellarLocalHorizonSource;
}): {
  mask: StellarLocalHorizonMask | null;
  summary: StellarObservationLocalHorizonSourceSummary | null;
} {
  if (!input.settings.localHorizonEnabled) return { mask: null, summary: null };
  if (input.settings.localHorizonSourceMode === 'manual') {
    const mask = localHorizonMaskFromSettings(input.settings);
    const normalized = normalizeStellarLocalHorizonMask(mask);
    return {
      mask,
      summary: {
        mode: 'manual',
        label: normalized.sourceLabel,
        pointCount: normalized.points.length,
        maximumAzimuthGapDeg: normalized.maximumAzimuthGapDeg,
        warnings: []
      }
    };
  }
  const source = input.externalLocalHorizonSource;
  if (!source) {
    throw new StellarObservationError('Dış skyline kaynak modu seçili ancak doğrulanmış skyline dosyası bulunmuyor.');
  }
  const mask = localHorizonMaskFromExternal(source);
  const normalized = normalizeStellarLocalHorizonMask(mask);
  return {
    mask,
    summary: {
      mode: 'external',
      label: source.fileName,
      pointCount: normalized.points.length,
      maximumAzimuthGapDeg: normalized.maximumAzimuthGapDeg,
      fileName: source.fileName,
      fileSizeBytes: source.fileSizeBytes,
      sha256: source.sha256,
      importedAtIso: source.importedAtIso,
      warnings: [...source.warnings]
    }
  };
}

export function calculateStellarObservation(input: {
  experimentId: string;
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  settings: StellarObservationSettings;
  externalLocalHorizonSource?: SavedStellarLocalHorizonSource;
  motionSubset?: VerifiedBrightStarMotionSubset;
}): StellarObservationResult {
  const settings: StellarObservationSettings = {
    ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
    ...input.settings
  };
  validateSettings(settings);
  const motionReference = input.motionSubset
    ? resolveVerifiedBrightStarMotionReference(input.motionSubset, settings.starId)
    : undefined;
  const resolved = resolveBrightStarForObservation(settings.starId, input.observedAtIso, motionReference);
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
  const trailInput = {
    startAtIso: input.observedAtIso,
    durationMinutes: settings.trailDurationMinutes,
    sampleIntervalMinutes: settings.trailSampleIntervalMinutes,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg,
    declinationDeg,
    label: resolved.star.commonName
  };
  const trail = calculateStellarTrail(trailInput);
  const localHorizon = resolveLocalHorizon({
    settings,
    externalLocalHorizonSource: input.externalLocalHorizonSource
  });
  const localHorizonTrail = localHorizon.mask
    ? calculateStellarLocalHorizonTrail({ ...trailInput, horizonMask: localHorizon.mask })
    : null;
  const apparentDiagnostic = calculateStellarApparentDiagnostic({
    geometricAltitudeDeg: position.elevationDeg,
    azimuthDeg: position.azimuthDeg,
    localHorizonMask: position.azimuthDeg === null ? undefined : localHorizon.mask ?? undefined,
    label: resolved.star.commonName
  });
  const apparentTrailSamples: StellarObservationApparentTrailSample[] = trail.samples.map((sample) => {
    const refraction = calculateStellarAtmosphericRefraction(sample.elevationDeg);
    return {
      observedAtIso: sample.observedAtIso,
      elapsedMinutes: sample.elapsedMinutes,
      geometricAltitudeDeg: sample.elevationDeg,
      apparentAltitudeDeg: refraction.apparentAltitudeDeg,
      refractionCorrectionArcmin: refraction.refractionCorrectionArcmin,
      aboveApparentAstronomicalHorizon: refraction.aboveApparentAstronomicalHorizon
    };
  });
  const skySnapshot = calculateStellarSkySnapshot({
    observedAtIso: input.observedAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    horizonMask: localHorizon.mask ?? undefined,
    motionSubset: input.motionSubset
  });

  const localHorizonWarning = !settings.localHorizonEnabled
    ? 'Yerel/topoğrafik ufuk kapalıdır; geometrik görünürlük yalnız 0° astronomik ufuk anlamındadır.'
    : localHorizon.summary?.mode === 'external'
      ? `Dış yerel skyline uygulanır: ${localHorizon.summary.fileName}; ${localHorizon.summary.pointCount} nokta; maksimum azimut boşluğu=${format(localHorizon.summary.maximumAzimuthGapDeg, 3)}°; SHA-256=${localHorizon.summary.sha256}.`
      : 'Sekiz yönlü manuel yerel skyline maskesi geometrik yıldız izine uygulanır; ara azimutlar döngüsel doğrusal interpolasyonla çözülür.';
  const motionWarning = resolved.properMotion
    ? `Doğrulanmış proper motion uygulanır: μ_α*=${format(resolved.properMotion.properMotionRaStarArcsecPerYear, 6)}″/yıl; μ_δ=${format(resolved.properMotion.properMotionDecArcsecPerYear, 6)}″/yıl; kaynak epok=J${format(resolved.properMotion.sourceEpochJulianYear, 4)}. Paralaks, radyal hız ve perspektif ivmelenmesi uygulanmaz.`
    : 'Proper motion, yıllık paralaks, radyal hız, nutation, aberration ve ışık sapması uygulanmaz.';
  const warnings = [
    `Katalog kaynağı: ${BRIGHT_STAR_CATALOG_SOURCE}; çevrimdışı altküme=${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}.`,
    resolved.properMotion
      ? 'Katalog yönü önce doğrulanmış iki-bileşenli proper motion ile gözlem epoch’una taşınır, sonra IAU 2006 precession ile gözlem tarihinin ortalama ekvator/equinox sistemine dönüştürülür.'
      : 'Katalog koordinatı ortalama J2000 sisteminden IAU 2006 precession ile gözlem tarihinin ortalama ekvator/equinox sistemine dönüştürülür.',
    motionWarning,
    localHorizonWarning,
    ...(localHorizon.summary?.warnings ?? []),
    'NOAA standart atmosferik kırılma yaklaşımı yalnız ayrı bir apparent-altitude tanı katmanı olarak hesaplanır; geometrik yıldız izi veya geometrik yerel-ufuk görünürlük sınıfını değiştirmez.',
    'Apparent yıldız yüksekliği ile geometrik skyline farkı karma referanslı tanısal değerdir; yerel optik görünürlük sınıfı değildir.',
    'Yıldız sönümlemesi, gökyüzü parlaklığı, gerçek basınç/sıcaklık/nem profili, bulut, seeing ve çıplak-göz algı eşiği uygulanmaz.',
    'Bu astronomik referans tek başına herhangi bir Dünya şekli modelini doğrulamaz.'
  ];
  const traceId = `${STELLAR_OBSERVATION_MODEL_ID}:${input.experimentId}:${resolved.star.id}:${position.observedAtIso}`;
  const trace: CalculationTrace = {
    summary: `${resolved.star.commonName} için J2000 katalog yönü gözlem tarihine dönüştürüldü; geometrik konum/yıldız izi${localHorizonTrail ? ', yerel skyline açıklığı' : ''} ve ayrı standart-refraction apparent tanısı hesaplandı.`,
    assumptions: warnings,
    steps: [
      {
        id: 'catalog-source',
        title: 'Katalog yıldızı',
        formula: 'BSC5P altkümesi → J2000 (α₀, δ₀)',
        substitution: `${resolved.star.commonName} · ${resolved.star.bayerDesignation} · HR ${resolved.star.hrNumber}`,
        result: `α₀=${format(resolved.star.rightAscensionJ2000Deg)}°; δ₀=${format(resolved.star.declinationJ2000Deg)}°; V=${format(resolved.star.visualMagnitude, 2)}`
      },
      ...(resolved.properMotion
        ? resolved.properMotion.trace.steps.map((step) => ({ ...step, id: `motion-${step.id}` }))
        : []),
      ...resolved.precession.trace.steps.map((step) => ({ ...step, id: `precession-${step.id}` })),
      ...position.trace.steps.map((step) => ({ ...step, id: `position-${step.id}` })),
      {
        id: 'trail-summary',
        title: 'Yıldız izi penceresi',
        formula: 't ∈ [t₀, t₀+Δt]; her örnekte (α_t,δ_t) → (h,A)',
        substitution: `Δt=${format(settings.trailDurationMinutes)} dk; örnek aralığı=${format(settings.trailSampleIntervalMinutes)} dk`,
        result: `${trail.samples.length} örnek; geometrik 0° ufuk üstü=${format(trail.visibleDurationMinutes)} dk; geçiş=${trail.horizonCrossings.length}`
      },
      {
        id: 'sky-snapshot-summary',
        title: 'Çoklu yıldız gökyüzü snapshotı',
        formula: 'BSC5P altkümesi → her yıldız için precession → (h,A)',
        substitution: `${skySnapshot.starCount} katalog yıldızı · t=${skySnapshot.observedAtIso}`,
        result: `geometrik 0° üstü=${skySnapshot.aboveGeometricHorizonCount}; altı=${skySnapshot.belowGeometricHorizonCount}${skySnapshot.localHorizonCounts ? `; yerel skyline üstü=${skySnapshot.localHorizonCounts.above}` : ''}`
      },
      {
        id: 'standard-refraction-diagnostic',
        title: 'Standart atmosferik kırılma tanısı',
        formula: 'h_apparent = h_geometrik + R_NOAA(h)',
        substitution: `h_geometrik=${format(position.elevationDeg, 6)}°; R=${format(apparentDiagnostic.refraction.refractionCorrectionArcmin, 6)}′`,
        result: `h_apparent=${format(apparentDiagnostic.refraction.apparentAltitudeDeg, 6)}°; apparent 0° üstü=${apparentDiagnostic.refraction.aboveApparentAstronomicalHorizon ? 'evet' : 'hayır'}`
      },
      ...(localHorizon.summary
        ? [{
            id: 'local-source',
            title: 'Yerel skyline kaynağı',
            formula: 'azimut → geometrik yerel ufuk yüksekliği',
            substitution: localHorizon.summary.mode === 'external'
              ? `${localHorizon.summary.fileName} · SHA-256=${localHorizon.summary.sha256}`
              : localHorizon.summary.label,
            result: `${localHorizon.summary.pointCount} nokta · maksimum azimut boşluğu=${format(localHorizon.summary.maximumAzimuthGapDeg, 3)}°`
          }]
        : []),
      ...(localHorizonTrail
        ? localHorizonTrail.trace.steps.map((step) => ({ ...step, id: `local-${step.id}` }))
        : []),
      ...(apparentDiagnostic.starOnlyApparentMinusGeometricSkylineDeg !== null
        ? [{
            id: 'mixed-reference-diagnostic',
            title: 'Karma apparent-skyline tanısı',
            formula: 'Δh_tanı = h_apparent,yıldız − h_geometrik,skyline',
            substitution: `h_apparent=${format(apparentDiagnostic.refraction.apparentAltitudeDeg, 6)}°; h_skyline=${format(apparentDiagnostic.localHorizon!.localHorizonAltitudeDeg, 6)}°`,
            result: `Δh_tanı=${format(apparentDiagnostic.starOnlyApparentMinusGeometricSkylineDeg, 6)}°; yerel görünürlük sınıflandırılmadı`
          }]
        : [])
    ]
  };

  return {
    experimentId: input.experimentId,
    observedAtIso: position.observedAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    settings: { ...settings },
    star: resolved.star,
    sourceRightAscensionJ2000Deg: resolved.star.rightAscensionJ2000Deg,
    sourceDeclinationJ2000Deg: resolved.star.declinationJ2000Deg,
    meanOfDateRightAscensionDeg: rightAscensionDeg,
    meanOfDateDeclinationDeg: declinationDeg,
    precessionAngularShiftArcsec: resolved.precession.angularShiftArcsec,
    properMotion: resolved.properMotion,
    properMotionSourceId: input.motionSubset?.id ?? null,
    properMotionSourceVersion: input.motionSubset?.version ?? null,
    position,
    trail,
    localHorizonTrail,
    localHorizonSource: localHorizon.summary,
    apparentDiagnostic,
    apparentTrailSamples,
    skySnapshot,
    traceId,
    trace,
    warnings
  };
}

export const stellarObservationMetadata: ModelMetadata = {
  id: STELLAR_OBSERVATION_MODEL_ID,
  name: 'Yıldız Gözlemi · Astronomik Referans',
  version: STELLAR_OBSERVATION_MODEL_VERSION,
  description: 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü, isteğe bağlı doğrulanmış proper motion ve IAU 2006 precession ile gözlem tarihine dönüştürüp geometrik yerel konum, yıldız izi, isteğe bağlı geometrik skyline açıklığı ve ayrı standart-refraction apparent tanısı üreten astronomik referans.',
  capabilities: ['stellar-position'],
  assumptions: [
    'Katalog yönü ortalama J2000 koordinatıdır ve gözlem tarihine açık precession adımıyla dönüştürülür.',
    'Proper motion yalnız ayrı doğrulanmış BSC5P motion kaynağı verildiğinde uygulanır; paralaks, radyal hız ve perspektif ivmelenmesi uygulanmaz.',
    'İsteğe bağlı yerel ufuk manuel veya doğrulanmış dış geometrik skyline maskesidir.',
    'Standart atmosferik kırılma apparent yıldız yüksekliği olarak ayrı raporlanır; geometrik skyline ile karma fark yerel optik görünürlük sayılmaz.',
    'Optik çıplak-göz görünürlüğü bu modelde yoktur.'
  ]
};

export function createStellarObservationPrediction(result: StellarObservationResult): ModelPrediction {
  const firstLocalSample = result.localHorizonTrail?.samples[0];
  const localVisibleDuration = result.localHorizonTrail?.visibleDurationMinutes ?? null;
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
      { key: 'stellarProperMotionApplied', label: 'Doğrulanmış proper motion uygulandı', value: result.properMotion ? 1 : 0, unit: 'boolean' },
      { key: 'stellarProperMotionShiftArcsec', label: 'Proper motion açısal kayması', value: result.properMotion?.angularShiftArcsec ?? null, unit: 'arcsec' },
      { key: 'stellarProperMotionRaStarArcsecPerYear', label: 'Proper motion μ_α*', value: result.properMotion?.properMotionRaStarArcsecPerYear ?? null, unit: 'arcsec/yr' },
      { key: 'stellarProperMotionDecArcsecPerYear', label: 'Proper motion μ_δ', value: result.properMotion?.properMotionDecArcsecPerYear ?? null, unit: 'arcsec/yr' },
      { key: 'stellarProperMotionSourceEpochJulianYear', label: 'Proper motion kaynak epoku', value: result.properMotion?.sourceEpochJulianYear ?? null, unit: 'Julian year' },
      { key: 'stellarElevationDeg', label: 'Geometrik yıldız yüksekliği', value: result.position.elevationDeg, unit: 'deg' },
      { key: 'stellarStandardRefractionCorrectionArcmin', label: 'Standart kırılma düzeltmesi', value: result.apparentDiagnostic.refraction.refractionCorrectionArcmin, unit: 'arcmin' },
      { key: 'stellarApparentElevationDeg', label: 'Standart apparent yıldız yüksekliği', value: result.apparentDiagnostic.refraction.apparentAltitudeDeg, unit: 'deg' },
      { key: 'starAboveApparentAstronomicalHorizon', label: 'Standart apparent 0° ufkun üstünde', value: result.apparentDiagnostic.refraction.aboveApparentAstronomicalHorizon ? 1 : 0, unit: 'boolean' },
      { key: 'stellarApparentMinusGeometricSkylineDeg', label: 'Karma apparent yıldız − geometrik skyline tanısı', value: result.apparentDiagnostic.starOnlyApparentMinusGeometricSkylineDeg, unit: 'deg' },
      { key: 'stellarLocalApparentVisibilityClassified', label: 'Yerel apparent görünürlük sınıflandırıldı', value: 0, unit: 'boolean' },
      { key: 'stellarAzimuthDeg', label: 'Yıldız azimutu', value: result.position.azimuthDeg, unit: 'deg' },
      { key: 'localMeanSiderealTimeDeg', label: 'Yerel ortalama yıldız zamanı', value: result.position.localMeanSiderealTimeDeg, unit: 'deg' },
      { key: 'starAboveGeometricHorizon', label: 'Geometrik 0° ufkun üstünde', value: result.position.aboveGeometricHorizon ? 1 : 0, unit: 'boolean' },
      { key: 'stellarSkySnapshotStarCount', label: 'Çoklu yıldız snapshot katalog sayısı', value: result.skySnapshot.starCount, unit: 'count' },
      { key: 'stellarSkySnapshotGeometricAboveCount', label: 'Çoklu yıldız snapshot geometrik 0° üstü', value: result.skySnapshot.aboveGeometricHorizonCount, unit: 'count' },
      { key: 'stellarSkySnapshotLocalAboveCount', label: 'Çoklu yıldız snapshot yerel skyline üstü', value: result.skySnapshot.localHorizonCounts?.above ?? null, unit: 'count' },
      { key: 'stellarTrailDurationMinutes', label: 'Yıldız izi süresi', value: result.settings.trailDurationMinutes, unit: 'min' },
      { key: 'stellarTrailSampleIntervalMinutes', label: 'Yıldız izi örnekleme aralığı', value: result.settings.trailSampleIntervalMinutes, unit: 'min' },
      { key: 'stellarTrailVisibleDurationMinutes', label: 'İz penceresinde geometrik 0° ufuk üstü süre', value: result.trail.visibleDurationMinutes, unit: 'min' },
      { key: 'stellarTrailMinimumElevationDeg', label: 'İz minimum yüksekliği', value: result.trail.sampledMinimumElevationDeg, unit: 'deg' },
      { key: 'stellarTrailMaximumElevationDeg', label: 'İz maksimum yüksekliği', value: result.trail.sampledMaximumElevationDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonEnabled', label: 'Yerel ufuk maskesi etkin', value: result.settings.localHorizonEnabled ? 1 : 0, unit: 'boolean' },
      { key: 'stellarLocalHorizonSourceExternal', label: 'Yerel ufuk kaynak modu dış dosya', value: result.settings.localHorizonSourceMode === 'external' ? 1 : 0, unit: 'boolean' },
      { key: 'stellarLocalHorizonPointCount', label: 'Yerel ufuk nokta sayısı', value: result.localHorizonSource?.pointCount ?? null, unit: 'count' },
      { key: 'stellarLocalHorizonMaximumAzimuthGapDeg', label: 'Yerel ufuk maksimum azimut boşluğu', value: result.localHorizonSource?.maximumAzimuthGapDeg ?? null, unit: 'deg' },
      { key: 'stellarLocalHorizonNorthDeg', label: 'Yerel ufuk K', value: result.settings.localHorizonNorthDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonNorthEastDeg', label: 'Yerel ufuk KD', value: result.settings.localHorizonNorthEastDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonEastDeg', label: 'Yerel ufuk D', value: result.settings.localHorizonEastDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonSouthEastDeg', label: 'Yerel ufuk GD', value: result.settings.localHorizonSouthEastDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonSouthDeg', label: 'Yerel ufuk G', value: result.settings.localHorizonSouthDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonSouthWestDeg', label: 'Yerel ufuk GB', value: result.settings.localHorizonSouthWestDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonWestDeg', label: 'Yerel ufuk B', value: result.settings.localHorizonWestDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonNorthWestDeg', label: 'Yerel ufuk KB', value: result.settings.localHorizonNorthWestDeg, unit: 'deg' },
      { key: 'stellarLocalHorizonInstantAltitudeDeg', label: 'Anlık yerel ufuk yüksekliği', value: firstLocalSample?.localHorizonAltitudeDeg ?? null, unit: 'deg' },
      { key: 'stellarLocalHorizonInstantClearanceDeg', label: 'Anlık yerel ufuk açıklığı', value: firstLocalSample?.geometricClearanceDeg ?? null, unit: 'deg' },
      { key: 'stellarLocalHorizonVisibleDurationMinutes', label: 'İz penceresinde yerel ufuk üstü geometrik süre', value: localVisibleDuration, unit: 'min' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}

function readStoredLocalHorizonAltitude(
  metricValue: (key: string) => number | null | undefined,
  key: string,
  fallback: number
): number {
  const value = metricValue(key);
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90
    ? value
    : fallback;
}

export function readStellarObservationSettings(prediction: ModelPrediction | undefined): StellarObservationSettings {
  if (!prediction || prediction.modelId !== STELLAR_OBSERVATION_MODEL_ID) {
    return cloneDefaultSettings();
  }
  const metricValue = (key: string): number | null | undefined => prediction.metrics.find((metric) => metric.key === key)?.value;
  const hrNumber = metricValue('stellarCatalogHrNumber');
  const star = typeof hrNumber === 'number'
    ? BRIGHT_STAR_CATALOG.find((candidate) => candidate.hrNumber === Math.round(hrNumber))
    : undefined;
  const duration = metricValue('stellarTrailDurationMinutes');
  const interval = metricValue('stellarTrailSampleIntervalMinutes');
  const defaults = DEFAULT_STELLAR_OBSERVATION_SETTINGS;
  return {
    starId: star?.id ?? defaults.starId,
    trailDurationMinutes: typeof duration === 'number' && duration > 0 && duration <= 2_880
      ? duration
      : defaults.trailDurationMinutes,
    trailSampleIntervalMinutes: typeof interval === 'number' && interval > 0
      ? interval
      : defaults.trailSampleIntervalMinutes,
    localHorizonEnabled: metricValue('stellarLocalHorizonEnabled') === 1,
    localHorizonSourceMode: metricValue('stellarLocalHorizonSourceExternal') === 1 ? 'external' : 'manual',
    localHorizonNorthDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonNorthDeg', defaults.localHorizonNorthDeg),
    localHorizonNorthEastDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonNorthEastDeg', defaults.localHorizonNorthEastDeg),
    localHorizonEastDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonEastDeg', defaults.localHorizonEastDeg),
    localHorizonSouthEastDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonSouthEastDeg', defaults.localHorizonSouthEastDeg),
    localHorizonSouthDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonSouthDeg', defaults.localHorizonSouthDeg),
    localHorizonSouthWestDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonSouthWestDeg', defaults.localHorizonSouthWestDeg),
    localHorizonWestDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonWestDeg', defaults.localHorizonWestDeg),
    localHorizonNorthWestDeg: readStoredLocalHorizonAltitude(metricValue, 'stellarLocalHorizonNorthWestDeg', defaults.localHorizonNorthWestDeg)
  };
}
