import type { CalculationTrace } from '../shared/domain';
import type { LunarPositionResult } from './lunar-position';
import type { SolarPositionResult } from './solar-position';

export const SOLAR_ECLIPSE_OVERLAP_ALGORITHM_ID = 'solar-eclipse-overlap-low-precision';
export const SOLAR_ECLIPSE_OVERLAP_ALGORITHM_VERSION = '0.1.0';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ASTRONOMICAL_UNIT_KM = 149_597_870.7;
const SOLAR_RADIUS_KM = 695_700;
const LUNAR_RADIUS_KM = 1_737.4;
const POSITION_EPSILON_DEG = 1e-9;

export type AngularDiskRelation =
  | 'separate'
  | 'partial-overlap'
  | 'first-contained'
  | 'second-contained'
  | 'coincident';

export interface AngularDiskOverlapResult {
  centerSeparationDeg: number;
  firstRadiusDeg: number;
  secondRadiusDeg: number;
  relation: AngularDiskRelation;
  overlapAreaDeg2: number;
  firstCoveredFraction: number;
  secondCoveredFraction: number;
  outerLimbClearanceDeg: number;
  innerLimbClearanceDeg: number;
}

export type SolarEclipseInstantGeometryClass =
  | 'no-overlap'
  | 'partial-overlap'
  | 'total-type-contained'
  | 'annular-type-contained';

export interface SolarEclipseOverlapInput {
  solarPosition: SolarPositionResult;
  lunarPosition: LunarPositionResult;
}

export interface SolarEclipseOverlapResult {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  centerSeparationDeg: number;
  solarDistanceAu: number;
  solarAngularRadiusDeg: number;
  lunarDistanceKm: number;
  lunarAngularRadiusDeg: number;
  geometryClass: SolarEclipseInstantGeometryClass;
  solarDiskCoveredFraction: number;
  solarDiameterCoverageRatio: number;
  outerLimbClearanceDeg: number;
  innerLimbClearanceDeg: number;
  sunCenterElevationDeg: number;
  moonCenterElevationDeg: number;
  sunCenterAboveGeometricHorizon: boolean;
  moonCenterAboveGeometricHorizon: boolean;
  bothCentersAboveGeometricHorizon: boolean;
  traceId: string;
  trace: CalculationTrace;
}

export class SolarEclipseOverlapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolarEclipseOverlapError';
  }
}

const toRad = (valueDeg: number): number => valueDeg * DEG_TO_RAD;
const toDeg = (valueRad: number): number => valueRad * RAD_TO_DEG;
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));
const normalizeDegrees = (valueDeg: number): number => ((valueDeg % 360) + 360) % 360;

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateRadius(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0 || value >= 90) {
    throw new SolarEclipseOverlapError(`${label} açısal yarıçapı 0° ile 90° arasında sonlu olmalıdır.`);
  }
}

/**
 * Pure angular circle-overlap geometry. Angles are small enough in the eclipse
 * use-case that the tangent-plane disk model is the intended contract.
 */
export function calculateAngularDiskOverlap(input: {
  centerSeparationDeg: number;
  firstRadiusDeg: number;
  secondRadiusDeg: number;
}): AngularDiskOverlapResult {
  const { centerSeparationDeg: d, firstRadiusDeg: r1, secondRadiusDeg: r2 } = input;
  if (!Number.isFinite(d) || d < 0 || d > 180) {
    throw new SolarEclipseOverlapError('Disk merkez ayrımı 0° ile 180° arasında sonlu olmalıdır.');
  }
  validateRadius(r1, 'Birinci disk');
  validateRadius(r2, 'İkinci disk');

  const outerLimbClearanceDeg = d - (r1 + r2);
  const innerLimbClearanceDeg = d - Math.abs(r1 - r2);
  let relation: AngularDiskRelation;
  let overlapAreaDeg2 = 0;

  if (d >= r1 + r2) {
    relation = 'separate';
  } else if (d <= POSITION_EPSILON_DEG && Math.abs(r1 - r2) <= POSITION_EPSILON_DEG) {
    relation = 'coincident';
    overlapAreaDeg2 = Math.PI * Math.min(r1, r2) ** 2;
  } else if (d <= Math.abs(r1 - r2)) {
    relation = r1 < r2 ? 'first-contained' : 'second-contained';
    overlapAreaDeg2 = Math.PI * Math.min(r1, r2) ** 2;
  } else {
    relation = 'partial-overlap';
    const firstAngle = Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1));
    const secondAngle = Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
    const radical = Math.max(
      0,
      (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)
    );
    overlapAreaDeg2 = r1 * r1 * firstAngle + r2 * r2 * secondAngle - 0.5 * Math.sqrt(radical);
  }

  const firstArea = Math.PI * r1 * r1;
  const secondArea = Math.PI * r2 * r2;
  return {
    centerSeparationDeg: d,
    firstRadiusDeg: r1,
    secondRadiusDeg: r2,
    relation,
    overlapAreaDeg2,
    firstCoveredFraction: clamp(overlapAreaDeg2 / firstArea, 0, 1),
    secondCoveredFraction: clamp(overlapAreaDeg2 / secondArea, 0, 1),
    outerLimbClearanceDeg,
    innerLimbClearanceDeg
  };
}

export function horizontalAngularSeparationDeg(
  first: { azimuthDeg: number; elevationDeg: number },
  second: { azimuthDeg: number; elevationDeg: number }
): number {
  for (const [label, value] of [
    ['Birinci azimut', first.azimuthDeg],
    ['Birinci yükseklik', first.elevationDeg],
    ['İkinci azimut', second.azimuthDeg],
    ['İkinci yükseklik', second.elevationDeg]
  ] as const) {
    if (!Number.isFinite(value)) throw new SolarEclipseOverlapError(`${label} sonlu olmalıdır.`);
  }
  const h1 = toRad(first.elevationDeg);
  const h2 = toRad(second.elevationDeg);
  const deltaAzimuth = toRad(first.azimuthDeg - second.azimuthDeg);
  const cosine = clamp(
    Math.sin(h1) * Math.sin(h2) + Math.cos(h1) * Math.cos(h2) * Math.cos(deltaAzimuth),
    -1,
    1
  );
  return toDeg(Math.acos(cosine));
}

function solarDistanceAu(julianCentury: number): number {
  if (!Number.isFinite(julianCentury)) {
    throw new SolarEclipseOverlapError('Güneş Julian century değeri geçersiz.');
  }
  const meanAnomalyDeg = normalizeDegrees(
    357.52911 + julianCentury * (35_999.05029 - 0.0001537 * julianCentury)
  );
  const eccentricity =
    0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
  const anomalyRad = toRad(meanAnomalyDeg);
  const equationOfCenterDeg =
    Math.sin(anomalyRad) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(2 * anomalyRad) * (0.019993 - 0.000101 * julianCentury) +
    Math.sin(3 * anomalyRad) * 0.000289;
  const trueAnomalyRad = toRad(meanAnomalyDeg + equationOfCenterDeg);
  return 1.000001018 * (1 - eccentricity * eccentricity) /
    (1 + eccentricity * Math.cos(trueAnomalyRad));
}

function angularRadiusDeg(radiusKm: number, distanceKm: number, label: string): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= radiusKm) {
    throw new SolarEclipseOverlapError(`${label} uzaklığı geçersiz.`);
  }
  return toDeg(Math.asin(clamp(radiusKm / distanceKm, -1, 1)));
}

function sameCoordinate(left: number, right: number): boolean {
  return Math.abs(left - right) <= POSITION_EPSILON_DEG;
}

/**
 * Instantaneous, low-precision solar-occultation geometry built on the current
 * NOAA Sun and truncated analytical topocentric Moon references.
 *
 * This deliberately does not calculate official eclipse contacts, central
 * paths or Besselian elements. The classification describes only the two
 * apparent disks at the supplied observer/time snapshot.
 */
export function calculateSolarEclipseOverlap(
  input: SolarEclipseOverlapInput
): SolarEclipseOverlapResult {
  const solar = input.solarPosition;
  const lunar = input.lunarPosition;
  if (solar.observedAtIso !== lunar.observedAtIso) {
    throw new SolarEclipseOverlapError('Güneş ve Ay konumları aynı UTC gözlem anına ait olmalıdır.');
  }
  if (!sameCoordinate(solar.latitudeDeg, lunar.latitudeDeg) ||
    !sameCoordinate(solar.longitudeDeg, lunar.longitudeDeg)) {
    throw new SolarEclipseOverlapError('Güneş ve Ay konumları aynı gözlemci koordinatına ait olmalıdır.');
  }

  const centerSeparationDeg = horizontalAngularSeparationDeg(
    { azimuthDeg: solar.azimuthDeg, elevationDeg: solar.elevationDeg },
    { azimuthDeg: lunar.azimuthDeg, elevationDeg: lunar.elevationDeg }
  );
  const distanceAu = solarDistanceAu(solar.julianCentury);
  const solarAngularRadiusDeg = angularRadiusDeg(
    SOLAR_RADIUS_KM,
    distanceAu * ASTRONOMICAL_UNIT_KM,
    'Güneş'
  );
  const lunarAngularRadiusDeg = angularRadiusDeg(LUNAR_RADIUS_KM, lunar.distanceKm, 'Ay');
  const overlap = calculateAngularDiskOverlap({
    centerSeparationDeg,
    firstRadiusDeg: solarAngularRadiusDeg,
    secondRadiusDeg: lunarAngularRadiusDeg
  });

  const geometryClass: SolarEclipseInstantGeometryClass = overlap.relation === 'separate'
    ? 'no-overlap'
    : overlap.relation === 'partial-overlap'
      ? 'partial-overlap'
      : lunarAngularRadiusDeg >= solarAngularRadiusDeg
        ? 'total-type-contained'
        : 'annular-type-contained';

  const solarDiameterCoverageRatio = clamp(
    (solarAngularRadiusDeg + lunarAngularRadiusDeg - centerSeparationDeg) /
      (2 * solarAngularRadiusDeg),
    0,
    lunarAngularRadiusDeg / solarAngularRadiusDeg
  );
  const sunCenterAboveGeometricHorizon = solar.elevationDeg > 0;
  const moonCenterAboveGeometricHorizon = lunar.elevationDeg > 0;
  const bothCentersAboveGeometricHorizon =
    sunCenterAboveGeometricHorizon && moonCenterAboveGeometricHorizon;

  const traceId = `${SOLAR_ECLIPSE_OVERLAP_ALGORITHM_ID}:${solar.observedAtIso}:${solar.latitudeDeg.toFixed(6)}:${solar.longitudeDeg.toFixed(6)}`;
  const trace: CalculationTrace = {
    summary: 'Aynı gözlem anındaki Güneş ve Ay yerel yönlerinden düşük hassasiyetli anlık açısal disk örtüşme geometrisi hesaplandı.',
    assumptions: [
      'Güneş yönü mevcut NOAA düşük maliyetli geometrik Güneş referansından alınır; Güneş topocentrik paralaksı ayrıca uygulanmaz.',
      'Ay yönü mevcut düşük hassasiyetli analitik Ay modeli ve topocentrik yatay paralaks düzeltmesinden alınır.',
      'Güneş açısal yarıçapı yaklaşık Dünya-Güneş uzaklığından, Ay açısal yarıçapı hesaplanan Ay uzaklığından fiziksel yarıçaplarla türetilir.',
      'Disk kesişimi küçük-açı teğet düzleminde iki dairenin geometrik kesişimi olarak çözülür.',
      'Atmosferik kırılma, Güneş/Ay limb profili, gözlemci rakımı ve yüksek hassasiyetli efemeris bu çekirdeğe dahil değildir.',
      'Sonuç resmi tutulma kontağı, merkez hattı veya Bessel elemanı değildir; yalnız verilen anın yerel disk geometrisidir.'
    ],
    steps: [
      {
        id: 'center-separation',
        title: 'Yerel disk merkez ayrımı',
        formula: 'cos ψ = sin h☉ sin h☾ + cos h☉ cos h☾ cos(A☉−A☾)',
        substitution: `Güneş A=${format(solar.azimuthDeg)}°, h=${format(solar.elevationDeg)}°; Ay A=${format(lunar.azimuthDeg)}°, h=${format(lunar.elevationDeg)}°`,
        result: `ψ=${format(centerSeparationDeg, 8)}°`
      },
      {
        id: 'angular-radii',
        title: 'Görünür açısal yarıçaplar',
        formula: 'ρ = asin(R / Δ)',
        substitution: `Δ☉=${format(distanceAu, 9)} AU; Δ☾=${format(lunar.distanceKm, 1)} km`,
        result: `ρ☉=${format(solarAngularRadiusDeg, 8)}°; ρ☾=${format(lunarAngularRadiusDeg, 8)}°`
      },
      {
        id: 'disk-overlap',
        title: 'İki dairenin kesişim geometrisi',
        formula: 'ψ ile ρ☉+ρ☾ ve |ρ☉−ρ☾| karşılaştırılır; kısmi durumda daire-kesişim alanı çözülür.',
        substitution: `dış limb açıklığı=${format(overlap.outerLimbClearanceDeg, 8)}°; iç limb açıklığı=${format(overlap.innerLimbClearanceDeg, 8)}°`,
        result: `${geometryClass}; Güneş disk alanı örtüşmesi=%${format(overlap.firstCoveredFraction * 100, 5)}`
      }
    ]
  };

  return {
    observedAtIso: solar.observedAtIso,
    latitudeDeg: solar.latitudeDeg,
    longitudeDeg: solar.longitudeDeg,
    centerSeparationDeg,
    solarDistanceAu: distanceAu,
    solarAngularRadiusDeg,
    lunarDistanceKm: lunar.distanceKm,
    lunarAngularRadiusDeg,
    geometryClass,
    solarDiskCoveredFraction: overlap.firstCoveredFraction,
    solarDiameterCoverageRatio,
    outerLimbClearanceDeg: overlap.outerLimbClearanceDeg,
    innerLimbClearanceDeg: overlap.innerLimbClearanceDeg,
    sunCenterElevationDeg: solar.elevationDeg,
    moonCenterElevationDeg: lunar.elevationDeg,
    sunCenterAboveGeometricHorizon,
    moonCenterAboveGeometricHorizon,
    bothCentersAboveGeometricHorizon,
    traceId,
    trace
  };
}
