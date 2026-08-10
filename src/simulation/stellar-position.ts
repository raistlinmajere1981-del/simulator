import type { CalculationTrace } from '../shared/domain';

export const STELLAR_POSITION_ALGORITHM_ID = 'stellar-position-mean-of-date';
export const STELLAR_POSITION_ALGORITHM_VERSION = '0.1.0';

export type StellarHorizonClass =
  | 'circumpolar-above'
  | 'rises-and-sets'
  | 'never-rises'
  | 'grazes-horizon';

export interface StellarPositionInput {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  /** Mean-equator/equinox-of-date right ascension, not silently J2000/ICRS. */
  rightAscensionDeg: number;
  /** Mean-equator/equinox-of-date declination. */
  declinationDeg: number;
  label?: string;
  /** High-frequency inner loops (root scans) can skip the expensive trace. */
  includeTrace?: boolean;
}

export interface StellarPositionResult {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  rightAscensionDeg: number;
  declinationDeg: number;
  julianDay: number;
  julianCentury: number;
  greenwichMeanSiderealTimeDeg: number;
  localMeanSiderealTimeDeg: number;
  hourAngleDeg: number;
  elevationDeg: number;
  azimuthDeg: number | null;
  aboveGeometricHorizon: boolean;
  horizonClass: StellarHorizonClass;
  upperCulminationElevationDeg: number;
  lowerCulminationElevationDeg: number;
  traceId: string;
  trace: CalculationTrace;
}

export class StellarPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarPositionError';
  }
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const HORIZON_EPSILON_DEG = 1e-9;

const toRad = (valueDeg: number): number => valueDeg * DEG_TO_RAD;
const toDeg = (valueRad: number): number => valueRad * RAD_TO_DEG;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function normalizeStellarDegrees(valueDeg: number): number {
  return ((valueDeg % 360) + 360) % 360;
}

export function normalizeSignedStellarDegrees(valueDeg: number): number {
  const normalized = normalizeStellarDegrees(valueDeg + 180) - 180;
  return normalized === -180 ? 180 : normalized;
}

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateInput(input: StellarPositionInput): Date {
  if (!hasExplicitTimezone(input.observedAtIso)) {
    throw new StellarPositionError('Gözlem zamanı açık saat dilimi (Z veya ±SS:dd) içermelidir.');
  }
  const instant = new Date(input.observedAtIso);
  if (Number.isNaN(instant.getTime())) {
    throw new StellarPositionError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  if (!Number.isFinite(input.latitudeDeg) || input.latitudeDeg < -90 || input.latitudeDeg > 90) {
    throw new StellarPositionError('Enlem -90° ile +90° arasında olmalıdır.');
  }
  if (!Number.isFinite(input.longitudeDeg) || input.longitudeDeg < -180 || input.longitudeDeg > 180) {
    throw new StellarPositionError('Boylam -180° ile +180° arasında olmalıdır.');
  }
  if (!Number.isFinite(input.rightAscensionDeg) || input.rightAscensionDeg < 0 || input.rightAscensionDeg >= 360) {
    throw new StellarPositionError('Sağ açıklık 0° (dahil) ile 360° (hariç) arasında olmalıdır.');
  }
  if (!Number.isFinite(input.declinationDeg) || input.declinationDeg < -90 || input.declinationDeg > 90) {
    throw new StellarPositionError('Deklinasyon -90° ile +90° arasında olmalıdır.');
  }
  return instant;
}

function elevationAtHourAngleDeg(
  latitudeDeg: number,
  declinationDeg: number,
  hourAngleDeg: number
): number {
  const latitudeRad = toRad(latitudeDeg);
  const declinationRad = toRad(declinationDeg);
  const hourAngleRad = toRad(hourAngleDeg);
  const up = clamp(
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
      Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad),
    -1,
    1
  );
  return toDeg(Math.asin(up));
}

function classifyHorizon(
  upperCulminationElevationDeg: number,
  lowerCulminationElevationDeg: number
): StellarHorizonClass {
  if (Math.abs(upperCulminationElevationDeg) <= HORIZON_EPSILON_DEG ||
      Math.abs(lowerCulminationElevationDeg) <= HORIZON_EPSILON_DEG) {
    return 'grazes-horizon';
  }
  if (lowerCulminationElevationDeg > 0) return 'circumpolar-above';
  if (upperCulminationElevationDeg < 0) return 'never-rises';
  return 'rises-and-sets';
}

/**
 * Approximate Greenwich mean sidereal time (GMST) in degrees.
 * UTC is used as a practical proxy for UT1, matching the project's
 * low-cost astronomical reference layer. Nutation/equation-of-equinoxes
 * is deliberately not applied: this is mean sidereal time.
 */
export function calculateGreenwichMeanSiderealTimeDeg(observedAtIso: string): number {
  if (!hasExplicitTimezone(observedAtIso)) {
    throw new StellarPositionError('Gözlem zamanı açık saat dilimi (Z veya ±SS:dd) içermelidir.');
  }
  const instant = new Date(observedAtIso);
  if (Number.isNaN(instant.getTime())) {
    throw new StellarPositionError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  const julianDay = instant.getTime() / 86_400_000 + 2_440_587.5;
  const julianCentury = (julianDay - 2_451_545) / 36_525;
  return normalizeStellarDegrees(
    280.46061837 +
      360.98564736629 * (julianDay - 2_451_545) +
      0.000387933 * julianCentury * julianCentury -
      julianCentury * julianCentury * julianCentury / 38_710_000
  );
}

/**
 * Converts a mean-of-date equatorial star direction to a geometric local
 * horizontal direction. The input coordinates are intentionally NOT assumed
 * to be J2000/ICRS; epoch conversion belongs to a separate, explicit step.
 */
export function calculateStellarPosition(input: StellarPositionInput): StellarPositionResult {
  const instant = validateInput(input);
  const observedAtIso = instant.toISOString();
  const julianDay = instant.getTime() / 86_400_000 + 2_440_587.5;
  const julianCentury = (julianDay - 2_451_545) / 36_525;
  const greenwichMeanSiderealTimeDeg = calculateGreenwichMeanSiderealTimeDeg(observedAtIso);
  const localMeanSiderealTimeDeg = normalizeStellarDegrees(
    greenwichMeanSiderealTimeDeg + input.longitudeDeg
  );
  const hourAngleDeg = normalizeSignedStellarDegrees(
    localMeanSiderealTimeDeg - input.rightAscensionDeg
  );

  const latitudeRad = toRad(input.latitudeDeg);
  const declinationRad = toRad(input.declinationDeg);
  const hourAngleRad = toRad(hourAngleDeg);
  const sinDeclination = Math.sin(declinationRad);
  const cosDeclination = Math.cos(declinationRad);
  const sinLatitude = Math.sin(latitudeRad);
  const cosLatitude = Math.cos(latitudeRad);
  const cosHourAngle = Math.cos(hourAngleRad);
  const sinHourAngle = Math.sin(hourAngleRad);

  const up = clamp(
    sinLatitude * sinDeclination + cosLatitude * cosDeclination * cosHourAngle,
    -1,
    1
  );
  const elevationDeg = toDeg(Math.asin(up));
  const east = -cosDeclination * sinHourAngle;
  const north = sinDeclination * cosLatitude - cosDeclination * sinLatitude * cosHourAngle;
  const horizontalProjection = Math.hypot(east, north);
  const azimuthDeg = horizontalProjection < 1e-12
    ? null
    : normalizeStellarDegrees(toDeg(Math.atan2(east, north)));

  const upperCulminationElevationDeg = elevationAtHourAngleDeg(
    input.latitudeDeg,
    input.declinationDeg,
    0
  );
  const lowerCulminationElevationDeg = elevationAtHourAngleDeg(
    input.latitudeDeg,
    input.declinationDeg,
    180
  );
  const horizonClass = classifyHorizon(
    upperCulminationElevationDeg,
    lowerCulminationElevationDeg
  );
  const aboveGeometricHorizon = elevationDeg >= -HORIZON_EPSILON_DEG;

  const traceId = `${STELLAR_POSITION_ALGORITHM_ID}:${observedAtIso}:${input.latitudeDeg.toFixed(6)}:${input.longitudeDeg.toFixed(6)}:${input.rightAscensionDeg.toFixed(6)}:${input.declinationDeg.toFixed(6)}`;
  const includeTrace = input.includeTrace !== false;
  const trace: CalculationTrace = includeTrace
    ? {
        summary: 'Gözlem tarihine ait ekvatoryal yıldız koordinatı, yaklaşık yerel ortalama yıldız zamanı üzerinden geometrik yükseklik ve azimuta dönüştürüldü.',
        assumptions: [
          'Sağ açıklık ve deklinasyon gözlem tarihinin ortalama ekvator/equinox sistemine aittir; J2000/ICRS koordinatı sessizce of-date kabul edilmez.',
          'UTC, yaklaşık GMST hesabında UT1 için pratik vekil olarak kullanılır.',
          'Nutation ve equation-of-equinoxes uygulanmaz; yerel ortalama yıldız zamanı (LMST) kullanılır.',
          'Yıllık precession, proper motion, parallax ve aberration bu çekirdekte uygulanmaz.',
          'Atmosferik kırılma, sönümleme, gökyüzü parlaklığı ve topoğrafik ufuk uygulanmaz; görünürlük yalnız geometrik 0° ufuk anlamındadır.',
          'Azimut coğrafi kuzeyden saat yönünde 0°–360° aralığındadır; yıldız tam zenit/nadir doğrultusundaysa azimut tanımsızdır.'
        ],
        steps: [
          {
            id: 'julian-time',
            title: 'Julian zaman ölçeği',
            formula: 'JD = unix_ms / 86400000 + 2440587.5; T = (JD - 2451545) / 36525',
            substitution: observedAtIso,
            result: `JD=${format(julianDay)}; T=${format(julianCentury, 9)}`
          },
          {
            id: 'sidereal-time',
            title: 'Yerel ortalama yıldız zamanı',
            formula: 'LMST = GMST + λ',
            substitution: `GMST=${format(greenwichMeanSiderealTimeDeg)}°; λ=${format(input.longitudeDeg)}°`,
            result: `LMST=${format(localMeanSiderealTimeDeg)}°`
          },
          {
            id: 'hour-angle',
            title: 'Yıldız saat açısı',
            formula: 'H = LMST - α',
            substitution: `LMST=${format(localMeanSiderealTimeDeg)}°; α=${format(input.rightAscensionDeg)}°`,
            result: `H=${format(hourAngleDeg)}°`
          },
          {
            id: 'horizontal-position',
            title: 'Yerel yatay koordinatlar',
            formula: 'sin(h)=sinφ·sinδ+cosφ·cosδ·cosH; A=atan2(E,N)',
            substitution: `φ=${format(input.latitudeDeg)}°; δ=${format(input.declinationDeg)}°; H=${format(hourAngleDeg)}°`,
            result: `yükseklik=${format(elevationDeg)}°; azimut=${azimuthDeg === null ? 'tanımsız' : `${format(azimuthDeg)}°`}`
          },
          {
            id: 'horizon-class',
            title: 'Geometrik ufuk sınıfı',
            formula: 'h_üst=alt(H=0°); h_alt=alt(H=180°)',
            substitution: `h_üst=${format(upperCulminationElevationDeg)}°; h_alt=${format(lowerCulminationElevationDeg)}°`,
            result: horizonClass
          }
        ]
      }
    : { summary: '', assumptions: [], steps: [] };

  return {
    observedAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg: input.rightAscensionDeg,
    declinationDeg: input.declinationDeg,
    julianDay,
    julianCentury,
    greenwichMeanSiderealTimeDeg,
    localMeanSiderealTimeDeg,
    hourAngleDeg,
    elevationDeg,
    azimuthDeg,
    aboveGeometricHorizon,
    horizonClass,
    upperCulminationElevationDeg,
    lowerCulminationElevationDeg,
    traceId,
    trace
  };
}
