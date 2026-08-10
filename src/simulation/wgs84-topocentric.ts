import {
  WGS84_FLATTENING,
  WGS84_SEMI_MAJOR_AXIS_M,
  type GeographicCoordinate
} from './geodesy';

const toRadians = (degrees: number): number => degrees * Math.PI / 180;
const toDegrees = (radians: number): number => radians * 180 / Math.PI;
const WGS84_ECCENTRICITY_SQUARED =
  WGS84_FLATTENING * (2 - WGS84_FLATTENING);

export interface Wgs84GeodeticCoordinate extends GeographicCoordinate {
  ellipsoidalHeightM: number;
}

export interface Wgs84GeocentricCoordinate {
  xM: number;
  yM: number;
  zM: number;
}

export interface TopocentricCoordinate {
  eastM: number;
  northM: number;
  upM: number;
}

export interface TopocentricDirection extends TopocentricCoordinate {
  horizontalDistanceM: number;
  slantDistanceM: number;
  azimuthDeg: number | null;
  elevationDeg: number;
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function validateGeodetic(point: Wgs84GeodeticCoordinate, label: string): void {
  if (!finite(point.latitudeDeg) || point.latitudeDeg < -90 || point.latitudeDeg > 90 ||
    !finite(point.longitudeDeg) || point.longitudeDeg < -180 || point.longitudeDeg > 180 ||
    !finite(point.ellipsoidalHeightM)) {
    throw new RangeError(`${label} WGS84 enlem/boylam ve sonlu elipsoidal yükseklik içermeli.`);
  }
}

function normalizeAzimuth(degrees: number): number {
  return (degrees % 360 + 360) % 360;
}

export function geodeticToWgs84Geocentric(
  point: Wgs84GeodeticCoordinate
): Wgs84GeocentricCoordinate {
  validateGeodetic(point, 'Jeodezik koordinat');

  const latitude = toRadians(point.latitudeDeg);
  const longitude = toRadians(point.longitudeDeg);
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const sinLongitude = Math.sin(longitude);
  const cosLongitude = Math.cos(longitude);
  const primeVerticalRadiusM = WGS84_SEMI_MAJOR_AXIS_M /
    Math.sqrt(1 - WGS84_ECCENTRICITY_SQUARED * sinLatitude ** 2);

  return {
    xM: (primeVerticalRadiusM + point.ellipsoidalHeightM) *
      cosLatitude * cosLongitude,
    yM: (primeVerticalRadiusM + point.ellipsoidalHeightM) *
      cosLatitude * sinLongitude,
    zM: (
      primeVerticalRadiusM * (1 - WGS84_ECCENTRICITY_SQUARED) +
      point.ellipsoidalHeightM
    ) * sinLatitude
  };
}

export function geocentricToTopocentric(
  target: Wgs84GeocentricCoordinate,
  origin: Wgs84GeocentricCoordinate,
  originLatitudeDeg: number,
  originLongitudeDeg: number
): TopocentricCoordinate {
  const allValues = [
    target.xM,
    target.yM,
    target.zM,
    origin.xM,
    origin.yM,
    origin.zM,
    originLatitudeDeg,
    originLongitudeDeg
  ];
  if (!allValues.every(finite) || originLatitudeDeg < -90 || originLatitudeDeg > 90 ||
    originLongitudeDeg < -180 || originLongitudeDeg > 180) {
    throw new RangeError('Toposentrik dönüşüm girdileri sonlu ve WGS84 açı sınırlarında olmalı.');
  }

  const latitude = toRadians(originLatitudeDeg);
  const longitude = toRadians(originLongitudeDeg);
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const sinLongitude = Math.sin(longitude);
  const cosLongitude = Math.cos(longitude);
  const deltaX = target.xM - origin.xM;
  const deltaY = target.yM - origin.yM;
  const deltaZ = target.zM - origin.zM;

  return {
    eastM: -deltaX * sinLongitude + deltaY * cosLongitude,
    northM: -deltaX * sinLatitude * cosLongitude -
      deltaY * sinLatitude * sinLongitude +
      deltaZ * cosLatitude,
    upM: deltaX * cosLatitude * cosLongitude +
      deltaY * cosLatitude * sinLongitude +
      deltaZ * sinLatitude
  };
}

export function topocentricDirectionBetween(
  origin: Wgs84GeodeticCoordinate,
  target: Wgs84GeodeticCoordinate
): TopocentricDirection {
  validateGeodetic(origin, 'Toposentrik başlangıç');
  validateGeodetic(target, 'Toposentrik hedef');

  const originGeocentric = geodeticToWgs84Geocentric(origin);
  const targetGeocentric = geodeticToWgs84Geocentric(target);
  const topocentric = geocentricToTopocentric(
    targetGeocentric,
    originGeocentric,
    origin.latitudeDeg,
    origin.longitudeDeg
  );
  const horizontalDistanceM = Math.hypot(
    topocentric.eastM,
    topocentric.northM
  );
  const slantDistanceM = Math.hypot(horizontalDistanceM, topocentric.upM);
  if (slantDistanceM <= Number.EPSILON) {
    throw new RangeError('Toposentrik yön için başlangıç ve hedef 3B konumları farklı olmalı.');
  }

  return {
    ...topocentric,
    horizontalDistanceM,
    slantDistanceM,
    azimuthDeg: horizontalDistanceM <= Number.EPSILON
      ? null
      : normalizeAzimuth(toDegrees(Math.atan2(
        topocentric.eastM,
        topocentric.northM
      ))),
    elevationDeg: toDegrees(Math.atan2(
      topocentric.upM,
      horizontalDistanceM
    ))
  };
}
