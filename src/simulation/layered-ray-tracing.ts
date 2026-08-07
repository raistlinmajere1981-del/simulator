import type {
  LayeredAtmosphereProfile,
  OpticalAtmosphereSettings
} from '../shared/atmosphere';
import { MEAN_EARTH_RADIUS_M } from './geometry';
import {
  buildOpticalAtmosphereProfile,
  opticalIndexAtAltitude,
  type OpticalAtmosphereProfile
} from './optical-refraction';

export type LayeredRayTerminationReason =
  | 'max-path'
  | 'profile-limit'
  | 'surface-intersection';

export interface LayeredRayTraceOptions {
  settings: OpticalAtmosphereSettings;
  observerAltitudeM: number;
  initialElevationDeg: number;
  maxPathLengthM: number;
  stepM?: number;
  earthRadiusM?: number;
}

export interface LayeredRayPathSample {
  pathDistanceM: number;
  surfaceDistanceM: number;
  centralAngleRad: number;
  altitudeM: number;
  elevationDeg: number;
  refractiveIndex: number;
}

export interface LayeredRayTraceResult {
  opticalProfile: OpticalAtmosphereProfile;
  samples: LayeredRayPathSample[];
  terminationReason: LayeredRayTerminationReason;
  warnings: string[];
}

interface RayState {
  xM: number;
  yM: number;
  tx: number;
  ty: number;
}

interface RayDerivative {
  xM: number;
  yM: number;
  tx: number;
  ty: number;
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} sonlu bir sayı olmalıdır.`);
}

function statePlus(
  state: RayState,
  derivative: RayDerivative,
  scale: number
): RayState {
  return {
    xM: state.xM + derivative.xM * scale,
    yM: state.yM + derivative.yM * scale,
    tx: state.tx + derivative.tx * scale,
    ty: state.ty + derivative.ty * scale
  };
}

function derivativeAt(
  state: RayState,
  opticalProfile: OpticalAtmosphereProfile,
  earthRadiusM: number
): RayDerivative {
  const radiusM = Math.hypot(state.xM, state.yM);
  const altitudeM = radiusM - earthRadiusM;
  const optical = opticalIndexAtAltitude(opticalProfile, altitudeM);
  const radialX = state.xM / radiusM;
  const radialY = state.yM / radiusM;
  const gradientX = optical.refractiveIndexGradientPerM * radialX;
  const gradientY = optical.refractiveIndexGradientPerM * radialY;
  const tangentGradient = state.tx * gradientX + state.ty * gradientY;

  return {
    xM: state.tx,
    yM: state.ty,
    tx: (gradientX - state.tx * tangentGradient) / optical.refractiveIndex,
    ty: (gradientY - state.ty * tangentGradient) / optical.refractiveIndex
  };
}

function rk4Step(
  state: RayState,
  stepM: number,
  opticalProfile: OpticalAtmosphereProfile,
  earthRadiusM: number
): RayState {
  const k1 = derivativeAt(state, opticalProfile, earthRadiusM);
  const k2 = derivativeAt(statePlus(state, k1, stepM / 2), opticalProfile, earthRadiusM);
  const k3 = derivativeAt(statePlus(state, k2, stepM / 2), opticalProfile, earthRadiusM);
  const k4 = derivativeAt(statePlus(state, k3, stepM), opticalProfile, earthRadiusM);

  const next: RayState = {
    xM: state.xM + stepM * (k1.xM + 2 * k2.xM + 2 * k3.xM + k4.xM) / 6,
    yM: state.yM + stepM * (k1.yM + 2 * k2.yM + 2 * k3.yM + k4.yM) / 6,
    tx: state.tx + stepM * (k1.tx + 2 * k2.tx + 2 * k3.tx + k4.tx) / 6,
    ty: state.ty + stepM * (k1.ty + 2 * k2.ty + 2 * k3.ty + k4.ty) / 6
  };

  const tangentMagnitude = Math.hypot(next.tx, next.ty);
  if (!Number.isFinite(tangentMagnitude) || tangentMagnitude <= 0) {
    throw new Error('Işın yön vektörü sayısal olarak geçersiz hale geldi.');
  }
  next.tx /= tangentMagnitude;
  next.ty /= tangentMagnitude;
  return next;
}

function toPathSample(
  state: RayState,
  pathDistanceM: number,
  opticalProfile: OpticalAtmosphereProfile,
  earthRadiusM: number
): LayeredRayPathSample {
  const radiusM = Math.hypot(state.xM, state.yM);
  const altitudeM = radiusM - earthRadiusM;
  const centralAngleRad = Math.atan2(state.yM, state.xM);
  const radialX = state.xM / radiusM;
  const radialY = state.yM / radiusM;
  const localTangentX = -radialY;
  const localTangentY = radialX;
  const radialComponent = state.tx * radialX + state.ty * radialY;
  const tangentComponent = state.tx * localTangentX + state.ty * localTangentY;
  const elevationDeg = Math.atan2(radialComponent, tangentComponent) * 180 / Math.PI;
  const refractiveIndex = opticalIndexAtAltitude(opticalProfile, altitudeM).refractiveIndex;

  return {
    pathDistanceM,
    surfaceDistanceM: centralAngleRad * earthRadiusM,
    centralAngleRad,
    altitudeM,
    elevationDeg,
    refractiveIndex
  };
}

export function traceLayeredAtmosphereRay(
  profile: LayeredAtmosphereProfile,
  options: LayeredRayTraceOptions
): LayeredRayTraceResult {
  finite(options.observerAltitudeM, 'Gözlemci yüksekliği');
  finite(options.initialElevationDeg, 'Başlangıç yükselim açısı');
  finite(options.maxPathLengthM, 'Azami ışın yolu');
  if (Math.abs(options.initialElevationDeg) >= 90) {
    throw new Error('Başlangıç yükselim açısı -90° ile +90° arasında olmalıdır.');
  }
  if (options.maxPathLengthM <= 0) {
    throw new Error('Azami ışın yolu sıfırdan büyük olmalıdır.');
  }

  const earthRadiusM = options.earthRadiusM ?? MEAN_EARTH_RADIUS_M;
  finite(earthRadiusM, 'Dünya yarıçapı');
  if (earthRadiusM <= 0) throw new Error('Dünya yarıçapı sıfırdan büyük olmalıdır.');

  const stepM = options.stepM ?? 25;
  finite(stepM, 'Işın izleme adımı');
  if (stepM <= 0 || stepM > 5000) {
    throw new Error('Işın izleme adımı 0–5000 m aralığında olmalıdır.');
  }

  const opticalProfile = buildOpticalAtmosphereProfile(profile, options.settings, earthRadiusM);
  const first = opticalProfile.samples[0]!;
  const last = opticalProfile.samples[opticalProfile.samples.length - 1]!;
  if (options.observerAltitudeM < first.altitudeM || options.observerAltitudeM > last.altitudeM) {
    throw new Error(
      `Gözlemci yüksekliği optik atmosfer profili kapsamı dışında: ${first.altitudeM}–${last.altitudeM} m.`
    );
  }

  const warnings: string[] = [];
  const minimumLayerThicknessM = Math.min(...opticalProfile.layers.map((layer) => layer.thicknessM));
  if (stepM > minimumLayerThicknessM / 4) {
    warnings.push(
      `Işın izleme adımı (${stepM} m), en ince atmosfer katmanının dörtte birinden büyüktür (${minimumLayerThicknessM} m). Daha küçük adım çözünürlüğü artırabilir.`
    );
  }

  const elevationRad = options.initialElevationDeg * Math.PI / 180;
  let state: RayState = {
    xM: earthRadiusM + options.observerAltitudeM,
    yM: 0,
    tx: Math.sin(elevationRad),
    ty: Math.cos(elevationRad)
  };
  let pathDistanceM = 0;
  const samples: LayeredRayPathSample[] = [
    toPathSample(state, pathDistanceM, opticalProfile, earthRadiusM)
  ];
  let terminationReason: LayeredRayTerminationReason = 'max-path';

  while (pathDistanceM < options.maxPathLengthM) {
    const currentStepM = Math.min(stepM, options.maxPathLengthM - pathDistanceM);
    let next: RayState;
    try {
      next = rk4Step(state, currentStepM, opticalProfile, earthRadiusM);
    } catch (error) {
      if (error instanceof Error && error.message.includes('profil')) {
        terminationReason = 'profile-limit';
        warnings.push('Işın atmosfer profilinin ölçülmüş yükseklik kapsamına ulaştığı için izleme durduruldu.');
        break;
      }
      throw error;
    }

    const nextAltitudeM = Math.hypot(next.xM, next.yM) - earthRadiusM;
    if (nextAltitudeM <= 0 && first.altitudeM <= 0) {
      terminationReason = 'surface-intersection';
      state = next;
      pathDistanceM += currentStepM;
      break;
    }

    state = next;
    pathDistanceM += currentStepM;
    try {
      samples.push(toPathSample(state, pathDistanceM, opticalProfile, earthRadiusM));
    } catch (error) {
      if (error instanceof Error && error.message.includes('profil')) {
        terminationReason = 'profile-limit';
        warnings.push('Işın atmosfer profilinin ölçülmüş yükseklik kapsamına ulaştığı için izleme durduruldu.');
        break;
      }
      throw error;
    }
  }

  return {
    opticalProfile,
    samples,
    terminationReason,
    warnings
  };
}
