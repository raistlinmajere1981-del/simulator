import type { CalculationTrace } from '../shared/domain';
import {
  BRIGHT_STAR_CATALOG,
  BRIGHT_STAR_CATALOG_ID,
  BRIGHT_STAR_CATALOG_SOURCE,
  BRIGHT_STAR_CATALOG_VERSION,
  resolveBrightStarForObservation
} from './bright-star-catalog';
import {
  evaluateStellarLocalHorizon,
  normalizeStellarLocalHorizonMask,
  type StellarLocalHorizonMask,
  type StellarLocalHorizonStatus
} from './stellar-local-horizon';
import { calculateStellarPosition } from './stellar-position';
import {
  resolveVerifiedBrightStarMotionReference,
  type VerifiedBrightStarMotionSubset
} from './bsc5p-motion-subset';

export const STELLAR_SKY_SNAPSHOT_ALGORITHM_ID = 'stellar-sky-snapshot';
export const STELLAR_SKY_SNAPSHOT_ALGORITHM_VERSION = '0.1.0';

export type StellarSkyLocalStatus = StellarLocalHorizonStatus | 'undefined-azimuth';

export interface StellarSkySnapshotStar {
  starId: string;
  commonName: string;
  bayerDesignation: string;
  constellation: string;
  hrNumber: number;
  visualMagnitude: number;
  meanOfDateRightAscensionDeg: number;
  meanOfDateDeclinationDeg: number;
  elevationDeg: number;
  azimuthDeg: number | null;
  aboveGeometricHorizon: boolean;
  properMotionApplied: boolean;
  properMotionAngularShiftArcsec: number | null;
  localHorizonAltitudeDeg: number | null;
  localHorizonClearanceDeg: number | null;
  localHorizonStatus: StellarSkyLocalStatus | null;
}

export interface StellarSkySnapshotLocalCounts {
  above: number;
  onHorizon: number;
  below: number;
  undefinedAzimuth: number;
}

export interface StellarSkySnapshotResult {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  catalogId: string;
  catalogVersion: string;
  catalogSource: string;
  starCount: number;
  aboveGeometricHorizonCount: number;
  belowGeometricHorizonCount: number;
  properMotionApplied: boolean;
  properMotionSourceId: string | null;
  properMotionSourceVersion: string | null;
  properMotionSourceEpochJulianYear: number | null;
  localHorizonApplied: boolean;
  localHorizonSourceLabel: string | null;
  localHorizonMaximumAzimuthGapDeg: number | null;
  localHorizonCounts: StellarSkySnapshotLocalCounts | null;
  stars: StellarSkySnapshotStar[];
  traceId: string;
  trace: CalculationTrace;
  warnings: string[];
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

export function calculateStellarSkySnapshot(input: {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  horizonMask?: StellarLocalHorizonMask;
  motionSubset?: VerifiedBrightStarMotionSubset;
}): StellarSkySnapshotResult {
  const normalizedMask = input.horizonMask
    ? normalizeStellarLocalHorizonMask(input.horizonMask)
    : null;

  const stars: StellarSkySnapshotStar[] = BRIGHT_STAR_CATALOG.map((star) => {
    const motionReference = input.motionSubset
      ? resolveVerifiedBrightStarMotionReference(input.motionSubset, star.id)
      : undefined;
    const resolved = resolveBrightStarForObservation(star.id, input.observedAtIso, motionReference);
    const position = calculateStellarPosition({
      observedAtIso: input.observedAtIso,
      latitudeDeg: input.latitudeDeg,
      longitudeDeg: input.longitudeDeg,
      rightAscensionDeg: resolved.precession.meanOfDateRightAscensionDeg,
      declinationDeg: resolved.precession.meanOfDateDeclinationDeg,
      label: star.commonName
    });

    const motionFields = {
      properMotionApplied: resolved.properMotion !== null,
      properMotionAngularShiftArcsec: resolved.properMotion?.angularShiftArcsec ?? null
    };

    if (!input.horizonMask) {
      return {
        starId: star.id,
        commonName: star.commonName,
        bayerDesignation: star.bayerDesignation,
        constellation: star.constellation,
        hrNumber: star.hrNumber,
        visualMagnitude: star.visualMagnitude,
        meanOfDateRightAscensionDeg: resolved.precession.meanOfDateRightAscensionDeg,
        meanOfDateDeclinationDeg: resolved.precession.meanOfDateDeclinationDeg,
        elevationDeg: position.elevationDeg,
        azimuthDeg: position.azimuthDeg,
        aboveGeometricHorizon: position.aboveGeometricHorizon,
        ...motionFields,
        localHorizonAltitudeDeg: null,
        localHorizonClearanceDeg: null,
        localHorizonStatus: null
      };
    }

    if (position.azimuthDeg === null) {
      return {
        starId: star.id,
        commonName: star.commonName,
        bayerDesignation: star.bayerDesignation,
        constellation: star.constellation,
        hrNumber: star.hrNumber,
        visualMagnitude: star.visualMagnitude,
        meanOfDateRightAscensionDeg: resolved.precession.meanOfDateRightAscensionDeg,
        meanOfDateDeclinationDeg: resolved.precession.meanOfDateDeclinationDeg,
        elevationDeg: position.elevationDeg,
        azimuthDeg: null,
        aboveGeometricHorizon: position.aboveGeometricHorizon,
        ...motionFields,
        localHorizonAltitudeDeg: null,
        localHorizonClearanceDeg: null,
        localHorizonStatus: 'undefined-azimuth'
      };
    }

    const local = evaluateStellarLocalHorizon({
      geometricAltitudeDeg: position.elevationDeg,
      azimuthDeg: position.azimuthDeg,
      mask: input.horizonMask,
      label: star.commonName
    });
    return {
      starId: star.id,
      commonName: star.commonName,
      bayerDesignation: star.bayerDesignation,
      constellation: star.constellation,
      hrNumber: star.hrNumber,
      visualMagnitude: star.visualMagnitude,
      meanOfDateRightAscensionDeg: resolved.precession.meanOfDateRightAscensionDeg,
      meanOfDateDeclinationDeg: resolved.precession.meanOfDateDeclinationDeg,
      elevationDeg: position.elevationDeg,
      azimuthDeg: position.azimuthDeg,
      aboveGeometricHorizon: position.aboveGeometricHorizon,
      ...motionFields,
      localHorizonAltitudeDeg: local.localHorizonAltitudeDeg,
      localHorizonClearanceDeg: local.geometricClearanceDeg,
      localHorizonStatus: local.status
    };
  });

  const aboveGeometricHorizonCount = stars.filter((star) => star.aboveGeometricHorizon).length;
  const localHorizonCounts: StellarSkySnapshotLocalCounts | null = normalizedMask
    ? {
        above: stars.filter((star) => star.localHorizonStatus === 'above').length,
        onHorizon: stars.filter((star) => star.localHorizonStatus === 'on-horizon').length,
        below: stars.filter((star) => star.localHorizonStatus === 'below').length,
        undefinedAzimuth: stars.filter((star) => star.localHorizonStatus === 'undefined-azimuth').length
      }
    : null;
  const observedAtIso = new Date(input.observedAtIso).toISOString();
  const motionWarning = input.motionSubset
    ? `Doğrulanmış proper motion uygulanır: ${input.motionSubset.id}@${input.motionSubset.version}; kaynak epok=J${format(input.motionSubset.sourceEpochJulianYear, 4)}. Paralaks, radyal hız ve perspektif ivmelenmesi uygulanmaz.`
    : 'Proper motion, yıllık paralaks, radyal hız, nutation, aberration ve ışık sapması uygulanmaz.';
  const warnings = [
    `Katalog kaynağı: ${BRIGHT_STAR_CATALOG_SOURCE}; çevrimdışı altküme=${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}.`,
    input.motionSubset
      ? 'Her yıldızın ortalama J2000 yönü önce doğrulanmış iki-bileşenli proper motion ile gözlem epoch’una taşınır, ardından IAU 2006 precession uygulanır.'
      : 'Her yıldızın ortalama J2000 katalog yönü gözlem tarihine mevcut IAU 2006 precession zinciriyle dönüştürülür.',
    motionWarning,
    normalizedMask
      ? 'Yerel skyline yalnız geometrik yükseklik/azimut ile karşılaştırılır; atmosferik apparent yükseklik bu snapshot sınıfına karıştırılmaz.'
      : 'Yerel skyline uygulanmaz; sınıflandırma yalnız geometrik 0° astronomik ufka göredir.',
    'Katalog kadri yalnız kaynak verisidir; sönümleme, gökyüzü parlaklığı, bulut, seeing ve çıplak-göz algı eşiği uygulanmadığı için bu çıktı optik görünür yıldız listesi değildir.'
  ];
  const traceId = `${STELLAR_SKY_SNAPSHOT_ALGORITHM_ID}:${observedAtIso}:${input.latitudeDeg.toFixed(6)}:${input.longitudeDeg.toFixed(6)}`;
  const trace: CalculationTrace = {
    summary: `${stars.length} katalog yıldızı aynı gözlem anı ve konumunda geometrik yatay koordinatlara çözüldü${normalizedMask ? ' ve yerel skyline ile ayrı ayrı karşılaştırıldı' : ''}.`,
    assumptions: warnings,
    steps: [
      {
        id: 'catalog-resolve',
        title: 'Çoklu katalog çözümü',
        formula: input.motionSubset
          ? 'her yıldız: J2000 (α₀,δ₀) → proper motion → precession → (α_t,δ_t)'
          : 'her yıldız: J2000 (α₀,δ₀) → precession → (α_t,δ_t)',
        substitution: `${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}; ${stars.length} yıldız${input.motionSubset ? `; motion=${input.motionSubset.id}@${input.motionSubset.version}` : ''}`,
        result: `${stars.length} gözlem-tarihi ekvatoryal yön`
      },
      {
        id: 'horizontal-transform',
        title: 'Ortak gözlem anında yatay koordinatlar',
        formula: 'her yıldız: (α_t,δ_t,φ,λ,t) → (h,A)',
        substitution: `t=${observedAtIso}; φ=${format(input.latitudeDeg)}°; λ=${format(input.longitudeDeg)}°`,
        result: `geometrik 0° üstü=${aboveGeometricHorizonCount}; altı=${stars.length - aboveGeometricHorizonCount}`
      },
      ...(normalizedMask && localHorizonCounts
        ? [{
            id: 'local-horizon-classification',
            title: 'Yerel skyline sınıflandırması',
            formula: 'Δh = h_yıldız − h_skyline(A)',
            substitution: `${normalizedMask.sourceLabel}; ${normalizedMask.points.length} nokta; max boşluk=${format(normalizedMask.maximumAzimuthGapDeg, 3)}°`,
            result: `üstünde=${localHorizonCounts.above}; sınır=${localHorizonCounts.onHorizon}; altında=${localHorizonCounts.below}; azimut tanımsız=${localHorizonCounts.undefinedAzimuth}`
          }]
        : [])
    ]
  };

  return {
    observedAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    catalogId: BRIGHT_STAR_CATALOG_ID,
    catalogVersion: BRIGHT_STAR_CATALOG_VERSION,
    catalogSource: BRIGHT_STAR_CATALOG_SOURCE,
    starCount: stars.length,
    aboveGeometricHorizonCount,
    belowGeometricHorizonCount: stars.length - aboveGeometricHorizonCount,
    properMotionApplied: input.motionSubset !== undefined,
    properMotionSourceId: input.motionSubset?.id ?? null,
    properMotionSourceVersion: input.motionSubset?.version ?? null,
    properMotionSourceEpochJulianYear: input.motionSubset?.sourceEpochJulianYear ?? null,
    localHorizonApplied: normalizedMask !== null,
    localHorizonSourceLabel: normalizedMask?.sourceLabel ?? null,
    localHorizonMaximumAzimuthGapDeg: normalizedMask?.maximumAzimuthGapDeg ?? null,
    localHorizonCounts,
    stars,
    traceId,
    trace,
    warnings
  };
}
