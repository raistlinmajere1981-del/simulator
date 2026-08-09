import type { CalculationTrace } from '../shared/domain';

export const STELLAR_PROPER_MOTION_ALGORITHM_ID = 'stellar-proper-motion-tangent-sphere';
export const STELLAR_PROPER_MOTION_ALGORITHM_VERSION = '0.1.0';

export interface StellarProperMotionInput {
  observedAtIso: string;
  sourceEpochJulianYear: number;
  rightAscensionDeg: number;
  declinationDeg: number;
  properMotionRaStarArcsecPerYear: number;
  properMotionDecArcsecPerYear: number;
  label?: string;
}

export interface StellarProperMotionResult {
  observedAtIso: string;
  sourceEpochJulianYear: number;
  elapsedJulianYears: number;
  sourceRightAscensionDeg: number;
  sourceDeclinationDeg: number;
  properMotionRaStarArcsecPerYear: number;
  properMotionDecArcsecPerYear: number;
  totalProperMotionArcsecPerYear: number;
  propagatedRightAscensionDeg: number;
  propagatedDeclinationDeg: number;
  angularShiftArcsec: number;
  traceId: string;
  trace: CalculationTrace;
}

export class StellarProperMotionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarProperMotionError';
  }
}

type Vector3 = readonly [number, number, number];

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ARCSEC_TO_RAD = DEG_TO_RAD / 3600;
const RAD_TO_ARCSEC = RAD_TO_DEG * 3600;
const J2000_JULIAN_DAY = 2_451_545;
const JULIAN_YEAR_DAYS = 365.25;
const MAX_ABS_PROPER_MOTION_ARCSEC_PER_YEAR = 100;

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function normalizeDegrees(valueDeg: number): number {
  return ((valueDeg % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function add(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scale(vector: Vector3, factor: number): Vector3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function dot(left: Vector3, right: Vector3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Vector3, right: Vector3): Vector3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function norm(vector: Vector3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector: Vector3): Vector3 {
  const length = norm(vector);
  if (!(length > 0) || !Number.isFinite(length)) {
    throw new StellarProperMotionError('Yıldız yön vektörü normalize edilemedi.');
  }
  return scale(vector, 1 / length);
}

function directionVector(rightAscensionDeg: number, declinationDeg: number): Vector3 {
  const rightAscensionRad = rightAscensionDeg * DEG_TO_RAD;
  const declinationRad = declinationDeg * DEG_TO_RAD;
  const cosDeclination = Math.cos(declinationRad);
  return [
    cosDeclination * Math.cos(rightAscensionRad),
    cosDeclination * Math.sin(rightAscensionRad),
    Math.sin(declinationRad)
  ];
}

function tangentBasis(rightAscensionDeg: number, declinationDeg: number): {
  raStar: Vector3;
  dec: Vector3;
} {
  const rightAscensionRad = rightAscensionDeg * DEG_TO_RAD;
  const declinationRad = declinationDeg * DEG_TO_RAD;
  const sinRa = Math.sin(rightAscensionRad);
  const cosRa = Math.cos(rightAscensionRad);
  const sinDec = Math.sin(declinationRad);
  const cosDec = Math.cos(declinationRad);
  return {
    raStar: [-sinRa, cosRa, 0],
    dec: [-sinDec * cosRa, -sinDec * sinRa, cosDec]
  };
}

function directionFromVector(vector: Vector3): {
  rightAscensionDeg: number;
  declinationDeg: number;
} {
  const unit = normalize(vector);
  return {
    rightAscensionDeg: normalizeDegrees(Math.atan2(unit[1], unit[0]) * RAD_TO_DEG),
    declinationDeg: Math.asin(clamp(unit[2], -1, 1)) * RAD_TO_DEG
  };
}

function validateInput(input: StellarProperMotionInput): Date {
  if (!hasExplicitTimezone(input.observedAtIso)) {
    throw new StellarProperMotionError('Gözlem zamanı açık saat dilimi (Z veya ±SS:dd) içermelidir.');
  }
  const observedAt = new Date(input.observedAtIso);
  if (Number.isNaN(observedAt.getTime())) {
    throw new StellarProperMotionError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  if (!Number.isFinite(input.sourceEpochJulianYear) ||
    input.sourceEpochJulianYear < 1000 || input.sourceEpochJulianYear > 3000) {
    throw new StellarProperMotionError('Kaynak epok 1000 ile 3000 arasında sonlu bir Julian yılı olmalıdır.');
  }
  if (!Number.isFinite(input.rightAscensionDeg) ||
    input.rightAscensionDeg < 0 || input.rightAscensionDeg >= 360) {
    throw new StellarProperMotionError('Sağ açıklık 0° (dahil) ile 360° (hariç) arasında olmalıdır.');
  }
  if (!Number.isFinite(input.declinationDeg) ||
    input.declinationDeg < -90 || input.declinationDeg > 90) {
    throw new StellarProperMotionError('Deklinasyon -90° ile +90° arasında olmalıdır.');
  }
  for (const [label, value] of [
    ['RA* proper motion', input.properMotionRaStarArcsecPerYear],
    ['Dec proper motion', input.properMotionDecArcsecPerYear]
  ] as const) {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_ABS_PROPER_MOTION_ARCSEC_PER_YEAR) {
      throw new StellarProperMotionError(
        `${label} sonlu olmalı ve mutlak değeri ${MAX_ABS_PROPER_MOTION_ARCSEC_PER_YEAR}″/yıl sınırını aşmamalıdır.`
      );
    }
  }
  return observedAt;
}

/**
 * Propagates a catalogue direction using only the two angular proper-motion
 * components.  μ_α* is interpreted in the conventional projected form
 * cos(δ)·dα/dt, so the calculation stays finite at the celestial poles.
 *
 * The two components define the tangent direction at the catalogue epoch. The
 * direction is advanced on the unit sphere along that great-circle tangent at
 * constant angular speed. This is intentionally not a full six-parameter
 * space-motion solution: parallax, radial velocity and perspective
 * acceleration are outside this stage.
 */
export function propagateStellarProperMotion(
  input: StellarProperMotionInput
): StellarProperMotionResult {
  const observedAt = validateInput(input);
  const observedAtIso = observedAt.toISOString();
  const observedJulianDay = observedAt.getTime() / 86_400_000 + 2_440_587.5;
  const sourceEpochJulianDay = J2000_JULIAN_DAY +
    (input.sourceEpochJulianYear - 2000) * JULIAN_YEAR_DAYS;
  const elapsedJulianYears = (observedJulianDay - sourceEpochJulianDay) / JULIAN_YEAR_DAYS;
  const totalProperMotionArcsecPerYear = Math.hypot(
    input.properMotionRaStarArcsecPerYear,
    input.properMotionDecArcsecPerYear
  );

  const sourceVector = directionVector(input.rightAscensionDeg, input.declinationDeg);
  let propagatedVector = sourceVector;

  if (totalProperMotionArcsecPerYear > 0 && elapsedJulianYears !== 0) {
    const basis = tangentBasis(input.rightAscensionDeg, input.declinationDeg);
    const tangent = add(
      scale(basis.raStar, input.properMotionRaStarArcsecPerYear),
      scale(basis.dec, input.properMotionDecArcsecPerYear)
    );
    const tangentUnit = normalize(tangent);
    const signedAngularDistanceRad = totalProperMotionArcsecPerYear *
      ARCSEC_TO_RAD * elapsedJulianYears;
    propagatedVector = normalize(add(
      scale(sourceVector, Math.cos(signedAngularDistanceRad)),
      scale(tangentUnit, Math.sin(signedAngularDistanceRad))
    ));
  }

  const propagated = directionFromVector(propagatedVector);
  const angularShiftRad = Math.atan2(
    norm(cross(sourceVector, propagatedVector)),
    clamp(dot(sourceVector, propagatedVector), -1, 1)
  );
  const angularShiftArcsec = Math.abs(angularShiftRad) * RAD_TO_ARCSEC;
  const traceId = `${STELLAR_PROPER_MOTION_ALGORITHM_ID}:${input.sourceEpochJulianYear.toFixed(4)}:${observedAtIso}:${input.rightAscensionDeg.toFixed(8)}:${input.declinationDeg.toFixed(8)}`;
  const trace: CalculationTrace = {
    summary: `${input.label ?? 'Katalog yıldızı'} yönü, katalog proper-motion bileşenleriyle kaynak epoktan gözlem anına taşındı.`,
    assumptions: [
      'RA proper motion μ_α* = cos(δ)·dα/dt biçimindeki yansıtılmış teğetsel bileşen olarak yorumlanır.',
      'Kaynak epok Julian yılıdır; bir Julian yıl 365,25 gün kabul edilir.',
      'İki proper-motion bileşeni kaynak epoktaki teğet yönü tanımlar ve birim küre üzerinde sabit açısal hızla ilerletilir.',
      'Paralaks, radyal hız ve perspektif ivmelenmesi uygulanmaz; bu nedenle sonuç tam altı-parametreli uzay hareketi değildir.',
      'Nutation, aberration ve gözlemciye özgü apparent-place düzeltmeleri bu katmanın dışında tutulur.'
    ],
    steps: [
      {
        id: 'proper-motion-time',
        title: 'Epok zaman farkı',
        formula: 'Δt = (JD_obs - [2451545.0 + (JY_epoch-2000)·365.25]) / 365.25',
        substitution: `epok=J${format(input.sourceEpochJulianYear, 4)}; gözlem=${observedAtIso}`,
        result: `Δt=${format(elapsedJulianYears, 9)} Julian yıl`
      },
      {
        id: 'proper-motion-tangent',
        title: 'Teğetsel hareket vektörü',
        formula: 'μ⃗ = μ_α*·e_α + μ_δ·e_δ; μ=sqrt(μ_α*²+μ_δ²)',
        substitution: `μ_α*=${format(input.properMotionRaStarArcsecPerYear, 6)}″/yıl; μ_δ=${format(input.properMotionDecArcsecPerYear, 6)}″/yıl`,
        result: `μ=${format(totalProperMotionArcsecPerYear, 6)}″/yıl`
      },
      {
        id: 'proper-motion-sphere',
        title: 'Birim küre üzerinde yayılım',
        formula: 'r(t)=r₀·cos(μΔt)+û_μ·sin(μΔt)',
        substitution: `α₀=${format(input.rightAscensionDeg)}°; δ₀=${format(input.declinationDeg)}°`,
        result: `α=${format(propagated.rightAscensionDeg)}°; δ=${format(propagated.declinationDeg)}°; kayma=${format(angularShiftArcsec, 6)}″`
      }
    ]
  };

  return {
    observedAtIso,
    sourceEpochJulianYear: input.sourceEpochJulianYear,
    elapsedJulianYears,
    sourceRightAscensionDeg: input.rightAscensionDeg,
    sourceDeclinationDeg: input.declinationDeg,
    properMotionRaStarArcsecPerYear: input.properMotionRaStarArcsecPerYear,
    properMotionDecArcsecPerYear: input.properMotionDecArcsecPerYear,
    totalProperMotionArcsecPerYear,
    propagatedRightAscensionDeg: propagated.rightAscensionDeg,
    propagatedDeclinationDeg: propagated.declinationDeg,
    angularShiftArcsec,
    traceId,
    trace
  };
}
