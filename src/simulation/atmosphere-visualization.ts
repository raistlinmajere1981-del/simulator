import type { LayeredRayPathSample } from './layered-ray-tracing';
import {
  coordinateAtWgs84PathFraction,
  createWgs84GeodesicPath
} from './geodesic-path';
import type { GeographicCoordinate } from './geodesy';
import {
  latitudeLongitudeToSpherePoint,
  type VisualizationPoint3
} from './model-visualization';

export interface AtmosphereVisualizationPoint {
  point: VisualizationPoint3;
  surfaceDistanceM: number;
  altitudeM: number;
}

export interface AtmosphereVisualizationPath {
  points: AtmosphereVisualizationPoint[];
  sourceSampleCount: number;
  altitudeMinimumM: number;
  altitudeMaximumM: number;
}

export interface BuildAtmosphereVisualizationPathInput {
  samples: readonly LayeredRayPathSample[];
  observerCoordinate: GeographicCoordinate;
  targetCoordinate?: GeographicCoordinate;
  targetSurfaceDistanceM?: number;
  profileMinimumAltitudeM: number;
  profileMaximumAltitudeM: number;
  maxPoints?: number;
}

const VISUAL_SURFACE_RADIUS = 1.025;
const VISUAL_ATMOSPHERE_THICKNESS = 0.105;

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} sonlu bir sayı olmalı.`);
}

function normalize(point: VisualizationPoint3): VisualizationPoint3 {
  const length = Math.hypot(point[0], point[1], point[2]);
  if (!Number.isFinite(length) || length <= 0) throw new RangeError('Görsel yön vektörü geçersiz.');
  return [point[0] / length, point[1] / length, point[2] / length];
}

function scale(point: VisualizationPoint3, factor: number): VisualizationPoint3 {
  return [point[0] * factor, point[1] * factor, point[2] * factor];
}

function dot(left: VisualizationPoint3, right: VisualizationPoint3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function subtract(left: VisualizationPoint3, right: VisualizationPoint3): VisualizationPoint3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function add(left: VisualizationPoint3, right: VisualizationPoint3): VisualizationPoint3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function localEastDirection(observerCoordinate: GeographicCoordinate): VisualizationPoint3 {
  const longitude = observerCoordinate.longitudeDeg >= 179.99
    ? observerCoordinate.longitudeDeg - 0.01
    : observerCoordinate.longitudeDeg + 0.01;
  const observer = normalize(latitudeLongitudeToSpherePoint(observerCoordinate, 1));
  const nearby = normalize(latitudeLongitudeToSpherePoint({
    latitudeDeg: observerCoordinate.latitudeDeg,
    longitudeDeg: longitude
  }, 1));
  const projected = subtract(nearby, scale(observer, dot(observer, nearby)));
  return normalize(projected);
}

function syntheticGreatCirclePoint(
  observerCoordinate: GeographicCoordinate,
  centralAngleRad: number,
  radiusScale: number
): VisualizationPoint3 {
  const observer = normalize(latitudeLongitudeToSpherePoint(observerCoordinate, 1));
  const tangent = localEastDirection(observerCoordinate);
  const direction = add(
    scale(observer, Math.cos(centralAngleRad)),
    scale(tangent, Math.sin(centralAngleRad))
  );
  return scale(normalize(direction), radiusScale);
}

export function atmosphereVisualRadiusScale(
  altitudeM: number,
  profileMinimumAltitudeM: number,
  profileMaximumAltitudeM: number
): number {
  finite(altitudeM, 'Atmosfer görsel yüksekliği');
  finite(profileMinimumAltitudeM, 'Atmosfer profil alt sınırı');
  finite(profileMaximumAltitudeM, 'Atmosfer profil üst sınırı');
  if (profileMaximumAltitudeM <= profileMinimumAltitudeM) {
    throw new RangeError('Atmosfer görsel ölçeği için profil üst sınırı alt sınırdan büyük olmalı.');
  }
  const fraction = Math.min(1, Math.max(0,
    (altitudeM - profileMinimumAltitudeM) /
    (profileMaximumAltitudeM - profileMinimumAltitudeM)
  ));
  return VISUAL_SURFACE_RADIUS + fraction * VISUAL_ATMOSPHERE_THICKNESS;
}

export function downsampleLayeredRayPath(
  samples: readonly LayeredRayPathSample[],
  maxPoints = 420
): LayeredRayPathSample[] {
  if (!Number.isInteger(maxPoints) || maxPoints < 2 || maxPoints > 2_000) {
    throw new RangeError('Atmosfer görsel örnek sınırı 2–2000 aralığında tam sayı olmalı.');
  }
  if (samples.length <= maxPoints) return samples.map((sample) => ({ ...sample }));

  const selected: LayeredRayPathSample[] = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round(index * (samples.length - 1) / (maxPoints - 1));
    selected.push({ ...samples[sourceIndex]! });
  }
  return selected;
}

export function buildAtmosphereVisualizationPath(
  input: BuildAtmosphereVisualizationPathInput
): AtmosphereVisualizationPath {
  if (input.samples.length < 2) {
    throw new RangeError('Atmosfer ışın görselleştirmesi için en az iki örnek gerekli.');
  }
  const samples = downsampleLayeredRayPath(input.samples, input.maxPoints ?? 420);
  const hasTargetRoute = input.targetCoordinate !== undefined &&
    Number.isFinite(input.targetSurfaceDistanceM) &&
    (input.targetSurfaceDistanceM ?? 0) > 0;
  const path = hasTargetRoute
    ? createWgs84GeodesicPath(input.observerCoordinate, input.targetCoordinate!)
    : undefined;

  const points = samples.map((sample) => {
    const radiusScale = atmosphereVisualRadiusScale(
      sample.altitudeM,
      input.profileMinimumAltitudeM,
      input.profileMaximumAltitudeM
    );

    let point: VisualizationPoint3;
    if (path && input.targetSurfaceDistanceM) {
      const fraction = Math.min(1, Math.max(0, sample.surfaceDistanceM / input.targetSurfaceDistanceM));
      const coordinate = coordinateAtWgs84PathFraction(path, fraction).coordinate;
      point = scale(normalize(latitudeLongitudeToSpherePoint(coordinate, 1)), radiusScale);
    } else {
      point = syntheticGreatCirclePoint(input.observerCoordinate, sample.centralAngleRad, radiusScale);
    }

    return {
      point,
      surfaceDistanceM: sample.surfaceDistanceM,
      altitudeM: sample.altitudeM
    };
  });

  return {
    points,
    sourceSampleCount: input.samples.length,
    altitudeMinimumM: input.profileMinimumAltitudeM,
    altitudeMaximumM: input.profileMaximumAltitudeM
  };
}
