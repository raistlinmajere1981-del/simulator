import {
  coordinateAtWgs84PathFraction,
  createWgs84GeodesicPath
} from './geodesic-path';
import type { GeographicCoordinate } from './geodesy';

export type VisualizationPoint3 = readonly [number, number, number];

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} sonlu olmalı.`);
}

function validCoordinate(coordinate: GeographicCoordinate): void {
  finite(coordinate.latitudeDeg, 'Enlem');
  finite(coordinate.longitudeDeg, 'Boylam');
  if (coordinate.latitudeDeg < -90 || coordinate.latitudeDeg > 90) {
    throw new RangeError('Enlem -90…90° aralığında olmalı.');
  }
  if (coordinate.longitudeDeg < -180 || coordinate.longitudeDeg > 180) {
    throw new RangeError('Boylam -180…180° aralığında olmalı.');
  }
}

export function latitudeLongitudeToSpherePoint(
  coordinate: GeographicCoordinate,
  radius = 1
): VisualizationPoint3 {
  validCoordinate(coordinate);
  finite(radius, 'Yarıçap');
  if (radius <= 0) throw new RangeError('Yarıçap sıfırdan büyük olmalı.');

  const latitude = coordinate.latitudeDeg * Math.PI / 180;
  const longitude = coordinate.longitudeDeg * Math.PI / 180;
  const cosLatitude = Math.cos(latitude);

  return [
    radius * cosLatitude * Math.cos(longitude),
    radius * Math.sin(latitude),
    -radius * cosLatitude * Math.sin(longitude)
  ];
}

export function latitudeLongitudeToNorthPolarAzimuthalPoint(
  coordinate: GeographicCoordinate,
  diskRadius = 1
): VisualizationPoint3 {
  validCoordinate(coordinate);
  finite(diskRadius, 'Disk yarıçapı');
  if (diskRadius <= 0) throw new RangeError('Disk yarıçapı sıfırdan büyük olmalı.');

  const radialFraction = (90 - coordinate.latitudeDeg) / 180;
  const angle = coordinate.longitudeDeg * Math.PI / 180;
  const radius = diskRadius * radialFraction;

  return [
    radius * Math.sin(angle),
    0,
    -radius * Math.cos(angle)
  ];
}

export function buildWgs84VisualizationRoute(
  start: GeographicCoordinate,
  end: GeographicCoordinate,
  segmentCount = 64
): GeographicCoordinate[] {
  if (!Number.isInteger(segmentCount) || segmentCount < 2 || segmentCount > 512) {
    throw new RangeError('Görsel rota parça sayısı 2…512 aralığında tam sayı olmalı.');
  }
  const path = createWgs84GeodesicPath(start, end);
  return Array.from({ length: segmentCount + 1 }, (_, index) =>
    coordinateAtWgs84PathFraction(path, index / segmentCount).coordinate
  );
}
