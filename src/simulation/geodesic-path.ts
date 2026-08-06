import {
  MEAN_EARTH_RADIUS_M,
  WGS84_FLATTENING,
  WGS84_SEMI_MAJOR_AXIS_M,
  WGS84_SEMI_MINOR_AXIS_M,
  inverseWgs84Geodesic,
  isValidCoordinate,
  type GeodesicMethod,
  type GeographicCoordinate
} from './geodesy';

const toRadians = (degrees: number): number => degrees * Math.PI / 180;
const toDegrees = (radians: number): number => radians * 180 / Math.PI;

function normalizeLongitude(degrees: number): number {
  return ((degrees + 540) % 360) - 180;
}

export interface Wgs84GeodesicPath {
  start: GeographicCoordinate;
  end: GeographicCoordinate;
  totalDistanceM: number;
  initialBearingDeg: number;
  method: GeodesicMethod;
  warnings: string[];
}

export interface GeodesicPathPoint {
  coordinate: GeographicCoordinate;
  method: GeodesicMethod;
  warning?: string;
}

function sphericalDirect(
  start: GeographicCoordinate,
  bearingDeg: number,
  distanceM: number
): GeographicCoordinate {
  const angularDistance = distanceM / MEAN_EARTH_RADIUS_M;
  const bearing = toRadians(bearingDeg);
  const latitude1 = toRadians(start.latitudeDeg);
  const longitude1 = toRadians(start.longitudeDeg);
  const sinLatitude1 = Math.sin(latitude1);
  const cosLatitude1 = Math.cos(latitude1);
  const sinAngularDistance = Math.sin(angularDistance);
  const cosAngularDistance = Math.cos(angularDistance);

  const latitude2 = Math.asin(
    sinLatitude1 * cosAngularDistance +
    cosLatitude1 * sinAngularDistance * Math.cos(bearing)
  );
  const longitudeDelta = Math.atan2(
    Math.sin(bearing) * sinAngularDistance * cosLatitude1,
    cosAngularDistance - sinLatitude1 * Math.sin(latitude2)
  );

  return {
    latitudeDeg: toDegrees(latitude2),
    longitudeDeg: normalizeLongitude(toDegrees(longitude1 + longitudeDelta))
  };
}

function vincentyDirect(
  start: GeographicCoordinate,
  bearingDeg: number,
  distanceM: number,
  maxIterations = 200,
  toleranceRad = 1e-12
): GeographicCoordinate | null {
  const a = WGS84_SEMI_MAJOR_AXIS_M;
  const b = WGS84_SEMI_MINOR_AXIS_M;
  const f = WGS84_FLATTENING;
  const alpha1 = toRadians(bearingDeg);
  const sinAlpha1 = Math.sin(alpha1);
  const cosAlpha1 = Math.cos(alpha1);
  const latitude1 = toRadians(start.latitudeDeg);
  const longitude1 = toRadians(start.longitudeDeg);
  const tanU1 = (1 - f) * Math.tan(latitude1);
  const cosU1 = 1 / Math.sqrt(1 + tanU1 ** 2);
  const sinU1 = tanU1 * cosU1;
  const sigma1 = Math.atan2(tanU1, cosAlpha1);
  const sinAlpha = cosU1 * sinAlpha1;
  const cosSqAlpha = Math.max(0, 1 - sinAlpha ** 2);
  const uSq = cosSqAlpha * (a ** 2 - b ** 2) / b ** 2;
  const A = 1 + uSq / 16_384 * (
    4_096 + uSq * (-768 + uSq * (320 - 175 * uSq))
  );
  const B = uSq / 1_024 * (
    256 + uSq * (-128 + uSq * (74 - 47 * uSq))
  );

  let sigma = distanceM / (b * A);
  let converged = false;
  let sinSigma = 0;
  let cosSigma = 0;
  let cos2SigmaM = 0;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    sinSigma = Math.sin(sigma);
    cosSigma = Math.cos(sigma);
    cos2SigmaM = Math.cos(2 * sigma1 + sigma);
    const deltaSigma = B * sinSigma * (
      cos2SigmaM + B / 4 * (
        cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
        B / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) *
        (-3 + 4 * cos2SigmaM ** 2)
      )
    );
    const nextSigma = distanceM / (b * A) + deltaSigma;
    if (Math.abs(nextSigma - sigma) <= toleranceRad) {
      sigma = nextSigma;
      converged = true;
      break;
    }
    sigma = nextSigma;
  }

  if (!converged) return null;

  sinSigma = Math.sin(sigma);
  cosSigma = Math.cos(sigma);
  cos2SigmaM = Math.cos(2 * sigma1 + sigma);
  const temporary = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
  const latitude2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
    (1 - f) * Math.sqrt(sinAlpha ** 2 + temporary ** 2)
  );
  const lambda = Math.atan2(
    sinSigma * sinAlpha1,
    cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1
  );
  const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
  const longitudeCorrection = lambda - (1 - C) * f * sinAlpha * (
    sigma + C * sinSigma * (
      cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)
    )
  );

  return {
    latitudeDeg: toDegrees(latitude2),
    longitudeDeg: normalizeLongitude(toDegrees(longitude1 + longitudeCorrection))
  };
}

export function createWgs84GeodesicPath(
  start: GeographicCoordinate,
  end: GeographicCoordinate
): Wgs84GeodesicPath {
  if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
    throw new RangeError('Rota koordinatları WGS84 enlem/boylam sınırlarında olmalı.');
  }
  const inverse = inverseWgs84Geodesic(start, end);
  if (!Number.isFinite(inverse.distanceM) || inverse.distanceM <= 0) {
    throw new RangeError('DEM rotası için farklı başlangıç ve bitiş koordinatları gerekli.');
  }
  return {
    start: { ...start },
    end: { ...end },
    totalDistanceM: inverse.distanceM,
    initialBearingDeg: inverse.initialBearingDeg,
    method: inverse.method,
    warnings: [...inverse.warnings]
  };
}

export function coordinateAtWgs84PathFraction(
  path: Wgs84GeodesicPath,
  fraction: number
): GeodesicPathPoint {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new RangeError('Rota kesri 0…1 aralığında olmalı.');
  }
  if (fraction === 0) return { coordinate: { ...path.start }, method: path.method };
  if (fraction === 1) return { coordinate: { ...path.end }, method: path.method };

  const distanceM = path.totalDistanceM * fraction;
  if (path.method === 'vincenty') {
    const coordinate = vincentyDirect(path.start, path.initialBearingDeg, distanceM);
    if (coordinate) return { coordinate, method: 'vincenty' };
  }

  return {
    coordinate: sphericalDirect(path.start, path.initialBearingDeg, distanceM),
    method: 'spherical-fallback',
    warning: 'WGS84 doğrudan çözümü yakınsamayıp küresel rota ara noktası kullanıldı.'
  };
}
