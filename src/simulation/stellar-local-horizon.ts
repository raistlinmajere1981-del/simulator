import type { CalculationTrace } from '../shared/domain';

export const STELLAR_LOCAL_HORIZON_ALGORITHM_ID = 'stellar-local-horizon-mask';
export const STELLAR_LOCAL_HORIZON_ALGORITHM_VERSION = '0.1.0';

export type StellarLocalHorizonSourceKind = 'manual' | 'external' | 'derived';
export type StellarLocalHorizonStatus = 'above' | 'below' | 'on-horizon';

export interface StellarLocalHorizonPoint {
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface StellarLocalHorizonMask {
  sourceLabel: string;
  sourceKind: StellarLocalHorizonSourceKind;
  points: readonly StellarLocalHorizonPoint[];
}

export interface NormalizedStellarLocalHorizonMask {
  sourceLabel: string;
  sourceKind: StellarLocalHorizonSourceKind;
  points: StellarLocalHorizonPoint[];
  maximumAzimuthGapDeg: number;
}

export interface StellarLocalHorizonInterpolation {
  azimuthDeg: number;
  localHorizonAltitudeDeg: number;
  lowerPoint: StellarLocalHorizonPoint;
  upperPoint: StellarLocalHorizonPoint;
  interpolationFraction: number;
}

export interface StellarLocalHorizonResult {
  azimuthDeg: number;
  geometricAltitudeDeg: number;
  localHorizonAltitudeDeg: number;
  geometricClearanceDeg: number;
  status: StellarLocalHorizonStatus;
  sourceLabel: string;
  sourceKind: StellarLocalHorizonSourceKind;
  maximumAzimuthGapDeg: number;
  traceId: string;
  trace: CalculationTrace;
}

export class StellarLocalHorizonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarLocalHorizonError';
  }
}

const MIN_POINT_COUNT = 3;
const MAX_POINT_COUNT = 1_440;
const AZIMUTH_DUPLICATE_TOLERANCE_DEG = 1e-10;
const HORIZON_TANGENCY_TOLERANCE_DEG = 1e-9;

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function normalizeAzimuthDeg(valueDeg: number): number {
  return ((valueDeg % 360) + 360) % 360;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new StellarLocalHorizonError(`${label} sonlu bir sayı olmalıdır.`);
  }
}

function validateSourceKind(sourceKind: string): asserts sourceKind is StellarLocalHorizonSourceKind {
  if (sourceKind !== 'manual' && sourceKind !== 'external' && sourceKind !== 'derived') {
    throw new StellarLocalHorizonError(`Bilinmeyen yerel ufuk kaynak türü: ${sourceKind}.`);
  }
}

export function normalizeStellarLocalHorizonMask(
  mask: StellarLocalHorizonMask
): NormalizedStellarLocalHorizonMask {
  const sourceLabel = mask.sourceLabel.trim();
  if (!sourceLabel) {
    throw new StellarLocalHorizonError('Yerel ufuk kaynağı için boş olmayan bir etiket gerekir.');
  }
  if (sourceLabel.length > 240) {
    throw new StellarLocalHorizonError('Yerel ufuk kaynak etiketi 240 karakteri aşmamalıdır.');
  }
  validateSourceKind(mask.sourceKind);
  if (!Array.isArray(mask.points) || mask.points.length < MIN_POINT_COUNT) {
    throw new StellarLocalHorizonError(`Yerel ufuk maskesi en az ${MIN_POINT_COUNT} azimut noktası içermelidir.`);
  }
  if (mask.points.length > MAX_POINT_COUNT) {
    throw new StellarLocalHorizonError(`Yerel ufuk maskesi en fazla ${MAX_POINT_COUNT} azimut noktası içerebilir.`);
  }

  const points = mask.points.map((point, index) => {
    assertFinite(point.azimuthDeg, `${index + 1}. nokta azimutu`);
    assertFinite(point.altitudeDeg, `${index + 1}. nokta ufuk yüksekliği`);
    if (point.azimuthDeg < 0 || point.azimuthDeg >= 360) {
      throw new StellarLocalHorizonError(`${index + 1}. nokta azimutu 0° (dahil) ile 360° (hariç) arasında olmalıdır.`);
    }
    if (point.altitudeDeg < -90 || point.altitudeDeg > 90) {
      throw new StellarLocalHorizonError(`${index + 1}. nokta ufuk yüksekliği -90° ile +90° arasında olmalıdır.`);
    }
    return { azimuthDeg: point.azimuthDeg, altitudeDeg: point.altitudeDeg };
  }).sort((left, right) => left.azimuthDeg - right.azimuthDeg);

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    if (current.azimuthDeg - previous.azimuthDeg <= AZIMUTH_DUPLICATE_TOLERANCE_DEG) {
      throw new StellarLocalHorizonError(
        `Yerel ufuk maskesinde yinelenen veya ayırt edilemeyecek kadar yakın azimut var: ${format(previous.azimuthDeg, 10)}° ve ${format(current.azimuthDeg, 10)}°.`
      );
    }
  }

  let maximumAzimuthGapDeg = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    const nextUnwrappedAzimuthDeg = index === points.length - 1
      ? next.azimuthDeg + 360
      : next.azimuthDeg;
    maximumAzimuthGapDeg = Math.max(
      maximumAzimuthGapDeg,
      nextUnwrappedAzimuthDeg - current.azimuthDeg
    );
  }

  return {
    sourceLabel,
    sourceKind: mask.sourceKind,
    points,
    maximumAzimuthGapDeg
  };
}

function interpolateNormalizedMask(
  mask: NormalizedStellarLocalHorizonMask,
  azimuthDeg: number
): StellarLocalHorizonInterpolation {
  assertFinite(azimuthDeg, 'Yıldız azimutu');
  const normalizedAzimuthDeg = normalizeAzimuthDeg(azimuthDeg);
  const points = mask.points;

  for (const point of points) {
    if (Math.abs(point.azimuthDeg - normalizedAzimuthDeg) <= AZIMUTH_DUPLICATE_TOLERANCE_DEG) {
      return {
        azimuthDeg: normalizedAzimuthDeg,
        localHorizonAltitudeDeg: point.altitudeDeg,
        lowerPoint: { ...point },
        upperPoint: { ...point },
        interpolationFraction: 0
      };
    }
  }

  let upperIndex = points.findIndex((point) => point.azimuthDeg > normalizedAzimuthDeg);
  let lowerPoint: StellarLocalHorizonPoint;
  let upperPoint: StellarLocalHorizonPoint;
  let targetUnwrappedAzimuthDeg = normalizedAzimuthDeg;

  if (upperIndex < 0) {
    lowerPoint = points[points.length - 1]!;
    const first = points[0]!;
    upperPoint = { azimuthDeg: first.azimuthDeg + 360, altitudeDeg: first.altitudeDeg };
  } else if (upperIndex === 0) {
    const last = points[points.length - 1]!;
    lowerPoint = { azimuthDeg: last.azimuthDeg - 360, altitudeDeg: last.altitudeDeg };
    upperPoint = points[0]!;
  } else {
    lowerPoint = points[upperIndex - 1]!;
    upperPoint = points[upperIndex]!;
  }

  if (upperIndex < 0 && targetUnwrappedAzimuthDeg < lowerPoint.azimuthDeg) {
    targetUnwrappedAzimuthDeg += 360;
  }

  const spanDeg = upperPoint.azimuthDeg - lowerPoint.azimuthDeg;
  if (!(spanDeg > 0)) {
    throw new StellarLocalHorizonError('Yerel ufuk maskesi azimut aralığı interpolate edilemedi.');
  }
  const interpolationFraction = (targetUnwrappedAzimuthDeg - lowerPoint.azimuthDeg) / spanDeg;
  const localHorizonAltitudeDeg = lowerPoint.altitudeDeg +
    (upperPoint.altitudeDeg - lowerPoint.altitudeDeg) * interpolationFraction;

  return {
    azimuthDeg: normalizedAzimuthDeg,
    localHorizonAltitudeDeg,
    lowerPoint: {
      azimuthDeg: normalizeAzimuthDeg(lowerPoint.azimuthDeg),
      altitudeDeg: lowerPoint.altitudeDeg
    },
    upperPoint: {
      azimuthDeg: normalizeAzimuthDeg(upperPoint.azimuthDeg),
      altitudeDeg: upperPoint.altitudeDeg
    },
    interpolationFraction
  };
}

export function interpolateStellarLocalHorizonAltitude(
  mask: StellarLocalHorizonMask,
  azimuthDeg: number
): StellarLocalHorizonInterpolation {
  return interpolateNormalizedMask(normalizeStellarLocalHorizonMask(mask), azimuthDeg);
}

export function evaluateStellarLocalHorizon(input: {
  geometricAltitudeDeg: number;
  azimuthDeg: number;
  mask: StellarLocalHorizonMask;
  label?: string;
}): StellarLocalHorizonResult {
  assertFinite(input.geometricAltitudeDeg, 'Geometrik yıldız yüksekliği');
  if (input.geometricAltitudeDeg < -90 || input.geometricAltitudeDeg > 90) {
    throw new StellarLocalHorizonError('Geometrik yıldız yüksekliği -90° ile +90° arasında olmalıdır.');
  }
  const normalizedMask = normalizeStellarLocalHorizonMask(input.mask);
  const interpolation = interpolateNormalizedMask(normalizedMask, input.azimuthDeg);
  const geometricClearanceDeg = input.geometricAltitudeDeg - interpolation.localHorizonAltitudeDeg;
  const status: StellarLocalHorizonStatus = Math.abs(geometricClearanceDeg) <= HORIZON_TANGENCY_TOLERANCE_DEG
    ? 'on-horizon'
    : geometricClearanceDeg > 0
      ? 'above'
      : 'below';
  const traceId = `${STELLAR_LOCAL_HORIZON_ALGORITHM_ID}:${normalizedMask.sourceKind}:${interpolation.azimuthDeg.toFixed(8)}:${input.geometricAltitudeDeg.toFixed(8)}`;
  const trace: CalculationTrace = {
    summary: `${input.label ?? 'Gök cismi'} geometrik yüksekliği, ${normalizedMask.sourceLabel} yerel ufuk maskesiyle karşılaştırıldı.`,
    assumptions: [
      'Maskede azimut gerçek kuzeyden saat yönünde 0–360° aralığında tanımlanır.',
      'Maskenin ardışık noktaları arasında ufuk yüksekliği azimut boyunca doğrusal interpolate edilir; 360°/0° sınırı döngüsel olarak bağlanır.',
      'Bu sonuç geometrik yerel-ufuk açıklığıdır; atmosferik kırılma, sönümleme, gökyüzü parlaklığı ve hava koşulları uygulanmaz.',
      'Kaynak türü yalnız provenans etiketidir; derived seçilmesi maskenin hangi DEM veya arazi algoritmasıyla üretildiğini kendiliğinden kanıtlamaz.'
    ],
    steps: [
      {
        id: 'local-horizon-bracket',
        title: 'Azimut ufuk aralığı',
        formula: 'A → [A₀,A₁] (döngüsel 0°/360°)',
        substitution: `A=${format(interpolation.azimuthDeg)}°; A₀=${format(interpolation.lowerPoint.azimuthDeg)}°; A₁=${format(interpolation.upperPoint.azimuthDeg)}°`,
        result: `f=${format(interpolation.interpolationFraction, 8)}; maskenin en büyük azimut boşluğu=${format(normalizedMask.maximumAzimuthGapDeg)}°`
      },
      {
        id: 'local-horizon-interpolation',
        title: 'Yerel ufuk yüksekliği',
        formula: 'h_ufuk = h₀ + f·(h₁-h₀)',
        substitution: `h₀=${format(interpolation.lowerPoint.altitudeDeg)}°; h₁=${format(interpolation.upperPoint.altitudeDeg)}°`,
        result: `h_ufuk=${format(interpolation.localHorizonAltitudeDeg)}°`
      },
      {
        id: 'local-horizon-clearance',
        title: 'Geometrik ufuk açıklığı',
        formula: 'Δh = h_geometrik - h_ufuk',
        substitution: `h_geometrik=${format(input.geometricAltitudeDeg)}°; h_ufuk=${format(interpolation.localHorizonAltitudeDeg)}°`,
        result: `Δh=${format(geometricClearanceDeg)}°; durum=${status}`
      }
    ]
  };

  return {
    azimuthDeg: interpolation.azimuthDeg,
    geometricAltitudeDeg: input.geometricAltitudeDeg,
    localHorizonAltitudeDeg: interpolation.localHorizonAltitudeDeg,
    geometricClearanceDeg,
    status,
    sourceLabel: normalizedMask.sourceLabel,
    sourceKind: normalizedMask.sourceKind,
    maximumAzimuthGapDeg: normalizedMask.maximumAzimuthGapDeg,
    traceId,
    trace
  };
}
