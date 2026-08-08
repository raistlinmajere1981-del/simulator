import type { CalculationTrace } from '../shared/domain';

export const SOLAR_POSITION_ALGORITHM_ID = 'solar-position-noaa';
export const SOLAR_POSITION_ALGORITHM_VERSION = '0.1.0';

export interface SolarPositionInput {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface SolarPositionResult {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  julianDay: number;
  julianCentury: number;
  apparentSolarLongitudeDeg: number;
  declinationDeg: number;
  equationOfTimeMinutes: number;
  trueSolarTimeMinutes: number;
  hourAngleDeg: number;
  zenithDeg: number;
  elevationDeg: number;
  azimuthDeg: number;
  traceId: string;
  trace: CalculationTrace;
}

export class SolarPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolarPositionError';
  }
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function toRad(valueDeg: number): number {
  return valueDeg * DEG_TO_RAD;
}

function toDeg(valueRad: number): number {
  return valueRad * RAD_TO_DEG;
}

function normalizeDegrees(valueDeg: number): number {
  return ((valueDeg % 360) + 360) % 360;
}

function normalizeMinutes(valueMinutes: number): number {
  return ((valueMinutes % 1_440) + 1_440) % 1_440;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function validateInput(input: SolarPositionInput): Date {
  if (!hasExplicitTimezone(input.observedAtIso)) {
    throw new SolarPositionError('Gözlem zamanı açık saat dilimi (Z veya ±SS:dd) içermelidir.');
  }
  const instant = new Date(input.observedAtIso);
  if (Number.isNaN(instant.getTime())) {
    throw new SolarPositionError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  if (!Number.isFinite(input.latitudeDeg) || input.latitudeDeg < -90 || input.latitudeDeg > 90) {
    throw new SolarPositionError('Enlem -90° ile +90° arasında olmalıdır.');
  }
  if (!Number.isFinite(input.longitudeDeg) || input.longitudeDeg < -180 || input.longitudeDeg > 180) {
    throw new SolarPositionError('Boylam -180° ile +180° arasında olmalıdır.');
  }
  return instant;
}

/**
 * Geometric solar position using the NOAA Solar Calculator equation set.
 * Atmospheric refraction is deliberately excluded: elevationDeg is a
 * geometric local-horizon angle.
 */
export function calculateSolarPosition(input: SolarPositionInput): SolarPositionResult {
  const instant = validateInput(input);
  const normalizedIso = instant.toISOString();
  const julianDay = instant.getTime() / 86_400_000 + 2_440_587.5;
  const julianCentury = (julianDay - 2_451_545) / 36_525;

  const geometricMeanLongitudeDeg = normalizeDegrees(
    280.46646 + julianCentury * (36_000.76983 + julianCentury * 0.0003032)
  );
  const geometricMeanAnomalyDeg = normalizeDegrees(
    357.52911 + julianCentury * (35_999.05029 - 0.0001537 * julianCentury)
  );
  const orbitEccentricity =
    0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);

  const anomalyRad = toRad(geometricMeanAnomalyDeg);
  const equationOfCenterDeg =
    Math.sin(anomalyRad) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(2 * anomalyRad) * (0.019993 - 0.000101 * julianCentury) +
    Math.sin(3 * anomalyRad) * 0.000289;
  const trueSolarLongitudeDeg = geometricMeanLongitudeDeg + equationOfCenterDeg;
  const omegaDeg = 125.04 - 1_934.136 * julianCentury;
  const apparentSolarLongitudeDeg =
    trueSolarLongitudeDeg - 0.00569 - 0.00478 * Math.sin(toRad(omegaDeg));

  const meanObliquityDeg =
    23 +
    (26 +
      (21.448 - julianCentury * (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813))) /
        60) /
      60;
  const correctedObliquityDeg = meanObliquityDeg + 0.00256 * Math.cos(toRad(omegaDeg));
  const correctedObliquityRad = toRad(correctedObliquityDeg);
  const apparentLongitudeRad = toRad(apparentSolarLongitudeDeg);
  const declinationDeg = toDeg(
    Math.asin(Math.sin(correctedObliquityRad) * Math.sin(apparentLongitudeRad))
  );

  const y = Math.tan(correctedObliquityRad / 2) ** 2;
  const meanLongitudeRad = toRad(geometricMeanLongitudeDeg);
  const equationOfTimeMinutes = 4 * toDeg(
    y * Math.sin(2 * meanLongitudeRad) -
    2 * orbitEccentricity * Math.sin(anomalyRad) +
    4 * orbitEccentricity * y * Math.sin(anomalyRad) * Math.cos(2 * meanLongitudeRad) -
    0.5 * y * y * Math.sin(4 * meanLongitudeRad) -
    1.25 * orbitEccentricity * orbitEccentricity * Math.sin(2 * anomalyRad)
  );

  const utcMinutes =
    instant.getUTCHours() * 60 +
    instant.getUTCMinutes() +
    instant.getUTCSeconds() / 60 +
    instant.getUTCMilliseconds() / 60_000;
  const trueSolarTimeMinutes = normalizeMinutes(
    utcMinutes + equationOfTimeMinutes + 4 * input.longitudeDeg
  );
  const rawHourAngleDeg = trueSolarTimeMinutes / 4 - 180;
  const hourAngleDeg = rawHourAngleDeg < -180 ? rawHourAngleDeg + 360 : rawHourAngleDeg;

  const latitudeRad = toRad(input.latitudeDeg);
  const declinationRad = toRad(declinationDeg);
  const hourAngleRad = toRad(hourAngleDeg);
  const cosineZenith = clamp(
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
      Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad),
    -1,
    1
  );
  const zenithDeg = toDeg(Math.acos(cosineZenith));
  const elevationDeg = 90 - zenithDeg;

  const azimuthDeg = normalizeDegrees(
    toDeg(
      Math.atan2(
        Math.sin(hourAngleRad),
        Math.cos(hourAngleRad) * Math.sin(latitudeRad) -
          Math.tan(declinationRad) * Math.cos(latitudeRad)
      )
    ) + 180
  );

  const traceId = `${SOLAR_POSITION_ALGORITHM_ID}:${normalizedIso}:${input.latitudeDeg.toFixed(6)}:${input.longitudeDeg.toFixed(6)}`;
  const trace: CalculationTrace = {
    summary: 'UTC gözlem zamanı ve WGS84 enlem/boylamından Güneşin geometrik yerel yükseklik ve azimutu hesaplandı.',
    assumptions: [
      'Gözlem zamanı UTC anına normalize edilir.',
      'Enlem ve boylam WGS84 coğrafi koordinatları olarak yorumlanır.',
      'Güneş konumu NOAA Solar Calculator denklem setinin düşük maliyetli astronomik yaklaşımıyla hesaplanır.',
      'Atmosferik kırılma bu sonuçta uygulanmaz; yükseklik açısı geometriktir.',
      'Azimut coğrafi kuzeyden saat yönünde 0°–360° aralığındadır.'
    ],
    steps: [
      {
        id: 'julian-time',
        title: 'Julian zaman ölçeği',
        formula: 'JD = unix_ms / 86400000 + 2440587.5; T = (JD - 2451545) / 36525',
        substitution: normalizedIso,
        result: `JD=${format(julianDay)}; T=${format(julianCentury, 9)}`
      },
      {
        id: 'solar-declination',
        title: 'Güneş deklinasyonu',
        formula: 'δ = asin(sin(ε) · sin(λ_app))',
        substitution: `λ_app=${format(apparentSolarLongitudeDeg)}°, ε=${format(correctedObliquityDeg)}°`,
        result: `δ=${format(declinationDeg)}°`
      },
      {
        id: 'solar-time',
        title: 'Gerçek güneş zamanı ve saat açısı',
        formula: 'TST = UTC_dk + EoT + 4λ; H = TST / 4 - 180°',
        substitution: `UTC=${format(utcMinutes)} dk, EoT=${format(equationOfTimeMinutes)} dk, λ=${format(input.longitudeDeg)}°`,
        result: `TST=${format(trueSolarTimeMinutes)} dk; H=${format(hourAngleDeg)}°`
      },
      {
        id: 'horizontal-position',
        title: 'Yerel yatay koordinatlar',
        formula: 'cos(z)=sinφ·sinδ+cosφ·cosδ·cosH; h=90°-z; A=atan2(...)',
        substitution: `φ=${format(input.latitudeDeg)}°, δ=${format(declinationDeg)}°, H=${format(hourAngleDeg)}°`,
        result: `yükseklik=${format(elevationDeg)}°; azimut=${format(azimuthDeg)}°`
      }
    ]
  };

  return {
    observedAtIso: normalizedIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    julianDay,
    julianCentury,
    apparentSolarLongitudeDeg,
    declinationDeg,
    equationOfTimeMinutes,
    trueSolarTimeMinutes,
    hourAngleDeg,
    zenithDeg,
    elevationDeg,
    azimuthDeg,
    traceId,
    trace
  };
}
