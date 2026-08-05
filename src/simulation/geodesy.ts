import type { CalculationTrace } from '../shared/domain';

export const WGS84_SEMI_MAJOR_AXIS_M = 6_378_137;
export const WGS84_FLATTENING = 1 / 298.257_223_563;
export const WGS84_SEMI_MINOR_AXIS_M =
  WGS84_SEMI_MAJOR_AXIS_M * (1 - WGS84_FLATTENING);
export const MEAN_EARTH_RADIUS_M = 6_371_008.8;

export interface GeographicCoordinate {
  latitudeDeg: number;
  longitudeDeg: number;
}

export type GeodesicMethod = 'vincenty' | 'spherical-fallback';

export interface GeodesicResult {
  method: GeodesicMethod;
  converged: boolean;
  iterations: number;
  distanceM: number;
  initialBearingDeg: number;
  finalBearingDeg: number;
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

const toRadians = (degrees: number): number => degrees * Math.PI / 180;
const toDegrees = (radians: number): number => radians * 180 / Math.PI;

function normalizeBearing(degrees: number): number {
  return (degrees % 360 + 360) % 360;
}

function normalizeLongitudeDelta(degrees: number): number {
  return ((degrees + 540) % 360) - 180;
}

export function isValidCoordinate(point: GeographicCoordinate): boolean {
  return (
    Number.isFinite(point.latitudeDeg) &&
    point.latitudeDeg >= -90 &&
    point.latitudeDeg <= 90 &&
    Number.isFinite(point.longitudeDeg) &&
    point.longitudeDeg >= -180 &&
    point.longitudeDeg <= 180
  );
}

function coordinateText(point: GeographicCoordinate): string {
  return `${point.latitudeDeg.toFixed(6)},${point.longitudeDeg.toFixed(6)}`;
}

function sphericalInverse(
  start: GeographicCoordinate,
  end: GeographicCoordinate
): Omit<GeodesicResult, 'traceId' | 'trace'> {
  const phi1 = toRadians(start.latitudeDeg);
  const phi2 = toRadians(end.latitudeDeg);
  const deltaPhi = phi2 - phi1;
  const deltaLambda = toRadians(
    normalizeLongitudeDelta(end.longitudeDeg - start.longitudeDeg)
  );
  const haversine =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const centralAngle = 2 * Math.atan2(
    Math.sqrt(haversine),
    Math.sqrt(Math.max(0, 1 - haversine))
  );

  if (centralAngle === 0) {
    return {
      method: 'spherical-fallback',
      converged: false,
      iterations: 0,
      distanceM: 0,
      initialBearingDeg: 0,
      finalBearingDeg: 0,
      warnings: ['Noktalar çakıştığı için azimut yönü tanımsız kabul edildi.']
    };
  }

  const initial = Math.atan2(
    Math.sin(deltaLambda) * Math.cos(phi2),
    Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
  );
  const reverse = Math.atan2(
    -Math.sin(deltaLambda) * Math.cos(phi1),
    Math.cos(phi2) * Math.sin(phi1) -
      Math.sin(phi2) * Math.cos(phi1) * Math.cos(deltaLambda)
  );

  return {
    method: 'spherical-fallback',
    converged: false,
    iterations: 0,
    distanceM: MEAN_EARTH_RADIUS_M * centralAngle,
    initialBearingDeg: normalizeBearing(toDegrees(initial)),
    finalBearingDeg: normalizeBearing(toDegrees(reverse) + 180),
    warnings: [
      'Vincenty iterasyonu yakın-antipodal geometride yakınsamadı; ortalama yarıçaplı küresel yedek çözüm kullanıldı.'
    ]
  };
}

export function inverseWgs84Geodesic(
  start: GeographicCoordinate,
  end: GeographicCoordinate,
  maxIterations = 200,
  toleranceRad = 1e-12
): GeodesicResult {
  if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
    throw new RangeError('Enlem -90…90°, boylam -180…180° aralığında olmalıdır.');
  }

  const traceIdBase = `wgs84:${coordinateText(start)}:${coordinateText(end)}`;
  if (
    start.latitudeDeg === end.latitudeDeg &&
    start.longitudeDeg === end.longitudeDeg
  ) {
    return {
      method: 'vincenty',
      converged: true,
      iterations: 0,
      distanceM: 0,
      initialBearingDeg: 0,
      finalBearingDeg: 0,
      warnings: ['Noktalar çakıştığı için azimut yönü tanımsız kabul edildi.'],
      traceId: `${traceIdBase}:coincident`,
      trace: {
        summary: 'Gözlemci ve hedef koordinatları aynı olduğu için jeodezik mesafe sıfırdır.',
        assumptions: [
          'Referans elipsoidi WGS84’tür.',
          'Koordinatlar jeodezik enlem ve boylamdır.'
        ],
        steps: [
          {
            id: 'coincident-points',
            title: 'Çakışan noktalar',
            formula: 'P₁ = P₂ ⇒ s = 0',
            substitution: `${coordinateText(start)} = ${coordinateText(end)}`,
            result: '0 m',
            note: 'Mesafe sıfırken başlangıç ve varış azimutları fiziksel olarak tanımsızdır.'
          }
        ]
      }
    };
  }

  const a = WGS84_SEMI_MAJOR_AXIS_M;
  const f = WGS84_FLATTENING;
  const b = WGS84_SEMI_MINOR_AXIS_M;
  const phi1 = toRadians(start.latitudeDeg);
  const phi2 = toRadians(end.latitudeDeg);
  const L = toRadians(normalizeLongitudeDelta(end.longitudeDeg - start.longitudeDeg));
  const U1 = Math.atan((1 - f) * Math.tan(phi1));
  const U2 = Math.atan((1 - f) * Math.tan(phi2));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let iterations = 0;
  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let sinAlpha = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;
  let converged = false;

  while (iterations < maxIterations) {
    iterations += 1;
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    const x = cosU2 * sinLambda;
    const y = cosU1 * sinU2 - sinU1 * cosU2 * cosLambda;
    sinSigma = Math.hypot(x, y);

    if (sinSigma === 0) {
      converged = true;
      break;
    }

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    cosSqAlpha = Math.max(0, 1 - sinAlpha ** 2);
    cos2SigmaM = cosSqAlpha < Number.EPSILON
      ? 0
      : cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
    const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    const previousLambda = lambda;
    lambda = L + (1 - C) * f * sinAlpha * (
      sigma + C * sinSigma * (
        cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)
      )
    );

    if (Math.abs(lambda - previousLambda) <= toleranceRad) {
      converged = true;
      break;
    }
  }

  if (!converged) {
    const fallback = sphericalInverse(start, end);
    return {
      ...fallback,
      traceId: `${traceIdBase}:spherical-fallback`,
      trace: {
        summary: 'WGS84 Vincenty iterasyonu yakınsamadığı için açıkça işaretlenmiş küresel yedek çözüm üretildi.',
        assumptions: [
          'Öncelikli referans elipsoidi WGS84’tür.',
          `Vincenty iterasyon sınırı ${maxIterations} adımdır.`,
          `Yedek çözüm ortalama Dünya yarıçapı ${MEAN_EARTH_RADIUS_M.toFixed(1)} m kullanır.`
        ],
        steps: [
          {
            id: 'vincenty-non-convergence',
            title: 'Vincenty yakınsama kontrolü',
            formula: '|λₙ − λₙ₋₁| ≤ ε',
            substitution: `${maxIterations} iterasyonda ε=${toleranceRad}`,
            result: 'Yakınsama yok'
          },
          {
            id: 'spherical-fallback-distance',
            title: 'Küresel yedek mesafe',
            formula: 's = R̄ · Δσ',
            substitution: `R̄=${MEAN_EARTH_RADIUS_M.toFixed(1)} m`,
            result: `${fallback.distanceM.toFixed(3)} m`,
            note: 'Bu sonuç elipsoidal Vincenty sonucu değildir.'
          }
        ]
      }
    };
  }

  if (sinSigma === 0) {
    return inverseWgs84Geodesic(start, start, maxIterations, toleranceRad);
  }

  const uSq = cosSqAlpha * (a ** 2 - b ** 2) / b ** 2;
  const A = 1 + uSq / 16_384 * (
    4_096 + uSq * (-768 + uSq * (320 - 175 * uSq))
  );
  const B = uSq / 1_024 * (
    256 + uSq * (-128 + uSq * (74 - 47 * uSq))
  );
  const deltaSigma = B * sinSigma * (
    cos2SigmaM + B / 4 * (
      cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
      B / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) *
      (-3 + 4 * cos2SigmaM ** 2)
    )
  );
  const distanceM = b * A * (sigma - deltaSigma);
  const initialBearingDeg = normalizeBearing(toDegrees(Math.atan2(
    cosU2 * Math.sin(lambda),
    cosU1 * sinU2 - sinU1 * cosU2 * Math.cos(lambda)
  )));
  const finalBearingDeg = normalizeBearing(toDegrees(Math.atan2(
    cosU1 * Math.sin(lambda),
    -sinU1 * cosU2 + cosU1 * sinU2 * Math.cos(lambda)
  )));

  return {
    method: 'vincenty',
    converged: true,
    iterations,
    distanceM,
    initialBearingDeg,
    finalBearingDeg,
    warnings: [],
    traceId: `${traceIdBase}:vincenty:${iterations}`,
    trace: {
      summary: 'WGS84 elipsoidi üzerinde ters jeodezik problem çözülerek yüzey mesafesi ve iki uçtaki azimutlar hesaplandı.',
      assumptions: [
        'Referans elipsoidi WGS84’tür.',
        'Koordinatlar jeodezik enlem ve boylamdır.',
        'Arazi yüksekliği jeodezik yüzey mesafesini değiştirmez.',
        'Ters çözüm Vincenty iterasyonudur.'
      ],
      steps: [
        {
          id: 'wgs84-parameters',
          title: 'WGS84 elipsoid parametreleri',
          formula: 'b = a · (1 − f)',
          substitution: `a=${a} m, f=1/298.257223563`,
          result: `b=${b.toFixed(6)} m`
        },
        {
          id: 'reduced-latitudes',
          title: 'İndirgenmiş enlemler',
          formula: 'U = atan((1 − f) · tan φ)',
          substitution: `φ₁=${start.latitudeDeg}°, φ₂=${end.latitudeDeg}°`,
          result: `U₁=${toDegrees(U1).toFixed(9)}°, U₂=${toDegrees(U2).toFixed(9)}°`
        },
        {
          id: 'lambda-iteration',
          title: 'Boylam farkı iterasyonu',
          formula: '|λₙ − λₙ₋₁| ≤ ε',
          substitution: `ε=${toleranceRad}`,
          result: `${iterations} iterasyonda yakınsadı`
        },
        {
          id: 'ellipsoidal-distance',
          title: 'Elipsoidal yüzey mesafesi',
          formula: 's = b · A · (σ − Δσ)',
          substitution: `b=${b.toFixed(3)} m, A=${A.toFixed(12)}, σ=${sigma.toFixed(12)}, Δσ=${deltaSigma.toFixed(12)}`,
          result: `${distanceM.toFixed(3)} m`
        },
        {
          id: 'endpoint-bearings',
          title: 'Başlangıç ve varış azimutları',
          formula: 'α₁, α₂ = atan2(y, x)',
          substitution: `λ=${toDegrees(lambda).toFixed(9)}°`,
          result: `α₁=${initialBearingDeg.toFixed(6)}°, α₂=${finalBearingDeg.toFixed(6)}°`
        }
      ]
    }
  };
}
