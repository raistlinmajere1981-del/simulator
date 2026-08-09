import type { CalculationTrace } from '../shared/domain';

export const STELLAR_PRECESSION_ALGORITHM_ID = 'stellar-precession-iau2006';
export const STELLAR_PRECESSION_ALGORITHM_VERSION = '0.1.0';

export type StellarCatalogFrame = 'icrs' | 'mean-j2000';
export type StellarMatrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number]
];
export type StellarVector3 = readonly [number, number, number];

export interface StellarPrecessionInput {
  observedAtIso: string;
  rightAscensionDeg: number;
  declinationDeg: number;
  sourceFrame: StellarCatalogFrame;
  label?: string;
}

export interface StellarPrecessionResult {
  observedAtIso: string;
  sourceFrame: StellarCatalogFrame;
  sourceRightAscensionDeg: number;
  sourceDeclinationDeg: number;
  meanOfDateRightAscensionDeg: number;
  meanOfDateDeclinationDeg: number;
  angularShiftArcsec: number;
  julianDayApproxTt: number;
  julianCenturyApproxTt: number;
  matrix: StellarMatrix3;
  traceId: string;
  trace: CalculationTrace;
}

export class StellarPrecessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarPrecessionError';
  }
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ARCSEC_TO_RAD = DEG_TO_RAD / 3600;
const J2000_JULIAN_DAY = 2_451_545;
const JULIAN_CENTURY_DAYS = 36_525;

const toRad = (valueDeg: number): number => valueDeg * DEG_TO_RAD;
const toDeg = (valueRad: number): number => valueRad * RAD_TO_DEG;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const normalizeDegrees = (valueDeg: number): number => ((valueDeg % 360) + 360) % 360;

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateDirection(rightAscensionDeg: number, declinationDeg: number): void {
  if (!Number.isFinite(rightAscensionDeg) || rightAscensionDeg < 0 || rightAscensionDeg >= 360) {
    throw new StellarPrecessionError('Sağ açıklık 0° (dahil) ile 360° (hariç) arasında olmalıdır.');
  }
  if (!Number.isFinite(declinationDeg) || declinationDeg < -90 || declinationDeg > 90) {
    throw new StellarPrecessionError('Deklinasyon -90° ile +90° arasında olmalıdır.');
  }
}

function identityMatrix(): StellarMatrix3 {
  return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}

function rotateX(angleRad: number): StellarMatrix3 {
  const cosine = Math.cos(angleRad);
  const sine = Math.sin(angleRad);
  return [[1, 0, 0], [0, cosine, sine], [0, -sine, cosine]];
}

function rotateZ(angleRad: number): StellarMatrix3 {
  const cosine = Math.cos(angleRad);
  const sine = Math.sin(angleRad);
  return [[cosine, sine, 0], [-sine, cosine, 0], [0, 0, 1]];
}

function multiplyMatrices(left: StellarMatrix3, right: StellarMatrix3): StellarMatrix3 {
  const value = (row: 0 | 1 | 2, column: 0 | 1 | 2): number =>
    left[row][0] * right[0][column] +
    left[row][1] * right[1][column] +
    left[row][2] * right[2][column];
  return [
    [value(0, 0), value(0, 1), value(0, 2)],
    [value(1, 0), value(1, 1), value(1, 2)],
    [value(2, 0), value(2, 1), value(2, 2)]
  ];
}

function transposeMatrix(matrix: StellarMatrix3): StellarMatrix3 {
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]]
  ];
}

function multiplyMatrixVector(matrix: StellarMatrix3, vector: StellarVector3): StellarVector3 {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
  ];
}

function directionVector(rightAscensionDeg: number, declinationDeg: number): StellarVector3 {
  const ra = toRad(rightAscensionDeg);
  const dec = toRad(declinationDeg);
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

function directionFromVector(vector: StellarVector3): { rightAscensionDeg: number; declinationDeg: number } {
  const radius = Math.hypot(vector[0], vector[1], vector[2]);
  const rightAscensionDeg = normalizeDegrees(toDeg(Math.atan2(vector[1], vector[0])));
  const declinationDeg = toDeg(Math.asin(clamp(vector[2] / radius, -1, 1)));
  return { rightAscensionDeg, declinationDeg };
}

function horner(t: number, coefficients: readonly number[]): number {
  return coefficients.reduceRight((accumulator, coefficient) => accumulator * t + coefficient, 0);
}

export function calculateIau2006BiasPrecessionMatrixFromJulianDateTt(
  julianDayTt: number
): StellarMatrix3 {
  if (!Number.isFinite(julianDayTt)) {
    throw new StellarPrecessionError('TT Julian günü sonlu bir sayı olmalıdır.');
  }
  const t = (julianDayTt - J2000_JULIAN_DAY) / JULIAN_CENTURY_DAYS;
  const gammaBar = horner(t, [-0.052928, 10.556378, 0.4932044, -0.00031238, -0.000002788, 0.0000000260]) * ARCSEC_TO_RAD;
  const phiBar = horner(t, [84381.412819, -46.811016, 0.0511268, 0.00053289, -0.000000440, -0.0000000176]) * ARCSEC_TO_RAD;
  const psiBar = horner(t, [-0.041775, 5038.481484, 1.5584175, -0.00018522, -0.000026452, -0.0000000148]) * ARCSEC_TO_RAD;
  const epsilonA = horner(t, [84381.406, -46.836769, -0.0001831, 0.00200340, -0.000000576, -0.0000000434]) * ARCSEC_TO_RAD;

  let matrix = identityMatrix();
  matrix = multiplyMatrices(rotateZ(gammaBar), matrix);
  matrix = multiplyMatrices(rotateX(phiBar), matrix);
  matrix = multiplyMatrices(rotateZ(-psiBar), matrix);
  matrix = multiplyMatrices(rotateX(-epsilonA), matrix);
  return matrix;
}

export function calculateIau2006MeanJ2000ToDateMatrixFromJulianDateTt(
  julianDayTt: number
): StellarMatrix3 {
  const biasPrecessionAtDate = calculateIau2006BiasPrecessionMatrixFromJulianDateTt(julianDayTt);
  const frameBiasAtJ2000 = calculateIau2006BiasPrecessionMatrixFromJulianDateTt(J2000_JULIAN_DAY);
  return multiplyMatrices(biasPrecessionAtDate, transposeMatrix(frameBiasAtJ2000));
}

export function precessStellarDirectionToMeanOfDate(input: StellarPrecessionInput): StellarPrecessionResult {
  if (!hasExplicitTimezone(input.observedAtIso)) {
    throw new StellarPrecessionError('Gözlem zamanı açık saat dilimi (Z veya ±SS:dd) içermelidir.');
  }
  const instant = new Date(input.observedAtIso);
  if (Number.isNaN(instant.getTime())) {
    throw new StellarPrecessionError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  validateDirection(input.rightAscensionDeg, input.declinationDeg);
  const observedAtIso = instant.toISOString();
  const julianDayApproxTt = instant.getTime() / 86_400_000 + 2_440_587.5;
  const julianCenturyApproxTt = (julianDayApproxTt - J2000_JULIAN_DAY) / JULIAN_CENTURY_DAYS;
  const matrix = input.sourceFrame === 'icrs'
    ? calculateIau2006BiasPrecessionMatrixFromJulianDateTt(julianDayApproxTt)
    : calculateIau2006MeanJ2000ToDateMatrixFromJulianDateTt(julianDayApproxTt);

  const sourceVector = directionVector(input.rightAscensionDeg, input.declinationDeg);
  const targetVector = multiplyMatrixVector(matrix, sourceVector);
  const meanOfDate = directionFromVector(targetVector);
  const dot = clamp(
    sourceVector[0] * targetVector[0] + sourceVector[1] * targetVector[1] + sourceVector[2] * targetVector[2],
    -1,
    1
  );
  const angularShiftArcsec = toDeg(Math.acos(dot)) * 3600;
  const frameLabel = input.sourceFrame === 'icrs' ? 'ICRS/GCRS yönü' : 'ortalama J2000 ekvatoryal yönü';
  const traceId = `${STELLAR_PRECESSION_ALGORITHM_ID}:${input.sourceFrame}:${observedAtIso}:${input.rightAscensionDeg.toFixed(8)}:${input.declinationDeg.toFixed(8)}`;
  const trace: CalculationTrace = {
    summary: `${frameLabel}, IAU 2006 Fukushima–Williams bias/precession geometrisiyle gözlem tarihinin ortalama ekvator/equinox sistemine dönüştürüldü.`,
    assumptions: [
      'IAU 2006 precession modeli Fukushima–Williams dört-açı formülasyonu ile uygulanır.',
      input.sourceFrame === 'icrs'
        ? 'ICRS/GCRS yönü için frame bias ve precession birlikte uygulanır.'
        : 'Ortalama J2000 yönü için J2000 frame-bias matrisi çıkarılarak yalnız J2000→tarih precession dönüşümü uygulanır.',
      'Bu düşük maliyetli çevrimdışı katmanda kayıtlı UTC anı precession zaman değişkeni için TT vekili olarak kullanılır; UTC–TT farkı ayrıca modellenmez.',
      'Nutation uygulanmaz; çıktı gözlem tarihinin ortalama ekvator/equinox sistemindedir.',
      'Proper motion, yıllık paralaks, radyal hız, ışık sapması ve aberration uygulanmaz.'
    ],
    steps: [
      {
        id: 'precession-time',
        title: 'Precession zaman değişkeni',
        formula: 'T ≈ (JD_UTC - 2451545.0) / 36525',
        substitution: observedAtIso,
        result: `JD≈${format(julianDayApproxTt)}; T≈${format(julianCenturyApproxTt, 9)}`
      },
      {
        id: 'iau2006-matrix',
        title: 'IAU 2006 bias/precession matrisi',
        formula: 'P×B = R1(-εA) · R3(-ψ̄) · R1(φ̄) · R3(γ̄)',
        substitution: `kaynak çerçeve=${input.sourceFrame}`,
        result: input.sourceFrame === 'icrs' ? 'P×B uygulandı' : 'P(t)×B · Bᵀ(J2000) uygulandı'
      },
      {
        id: 'equatorial-direction',
        title: 'Ortalama-tarih ekvatoryal yön',
        formula: '(α,δ) → birim vektör → matris → (α_t,δ_t)',
        substitution: `α0=${format(input.rightAscensionDeg)}°; δ0=${format(input.declinationDeg)}°`,
        result: `α_t=${format(meanOfDate.rightAscensionDeg)}°; δ_t=${format(meanOfDate.declinationDeg)}°; açısal kayma≈${format(angularShiftArcsec, 3)}″`
      }
    ]
  };

  return {
    observedAtIso,
    sourceFrame: input.sourceFrame,
    sourceRightAscensionDeg: input.rightAscensionDeg,
    sourceDeclinationDeg: input.declinationDeg,
    meanOfDateRightAscensionDeg: meanOfDate.rightAscensionDeg,
    meanOfDateDeclinationDeg: meanOfDate.declinationDeg,
    angularShiftArcsec,
    julianDayApproxTt,
    julianCenturyApproxTt,
    matrix,
    traceId,
    trace
  };
}
