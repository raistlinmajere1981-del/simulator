import type {
  LayeredAtmosphereProfile,
  OpticalAtmosphereSettings
} from '../shared/atmosphere';
import type { TerrainProfile } from '../shared/terrain';
import {
  MEAN_EARTH_RADIUS_M,
  sphericalElevationAngleDeg,
  surfaceHorizonDistanceM
} from './geometry';
import {
  traceLayeredAtmosphereRay,
  type LayeredRayPathSample,
  type LayeredRayTerminationReason
} from './layered-ray-tracing';
import { validateAtmosphereProfile } from './atmosphere-profile';

const DISTANCE_TOLERANCE_M = 1e-6;
const CLEARANCE_TOLERANCE_M = 1e-5;
const MAX_TARGET_TRACE_STEPS = 20_000;
const HORIZON_SCAN_ANGLES_DEG = [
  -80, -45, -20, -10, -5, -2, -1, -0.5, -0.2, -0.1, -0.05,
  0, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 45, 80
] as const;

export interface LayeredSphereVisibilityInput {
  profile: LayeredAtmosphereProfile;
  settings: OpticalAtmosphereSettings;
  observerAltitudeM: number;
  targetSurfaceDistanceM: number;
  targetBaseAltitudeM: number;
  targetHeightM: number;
  terrainProfile?: TerrainProfile;
  stepM?: number;
  earthRadiusM?: number;
}

export interface LayeredSphereVisibilityResult {
  minimumVisibleAltitudeM: number;
  visibleHeightM: number;
  hiddenHeightM: number;
  visibleFraction: number;
  hiddenFraction: number;
  targetBaseElevationDeg: number | null;
  targetTopElevationDeg: number | null;
  targetAngularHeightDeg: number | null;
  targetTopTerrainMinimumClearanceM: number | null;
  targetTopTerrainCriticalDistanceM: number | null;
  grazingInitialElevationDeg: number;
  grazingTerrainMinimumClearanceM: number | null;
  grazingTerrainCriticalDistanceM: number | null;
  rayTraceStepM: number;
  warnings: string[];
}

export interface LayeredSphereHorizonInput {
  profile: LayeredAtmosphereProfile;
  settings: OpticalAtmosphereSettings;
  observerAltitudeM: number;
  stepM?: number;
  earthRadiusM?: number;
}

export interface LayeredSphereHorizonResult {
  horizonSurfaceDistanceM: number | null;
  grazingInitialElevationDeg: number | null;
  rayTraceStepM: number;
  warnings: string[];
}

type RayEvaluationStatus = 'clear' | 'blocked' | 'coverage';

interface RayEvaluation {
  angleDeg: number;
  status: RayEvaluationStatus;
  endpointAltitudeM: number | null;
  terrainMinimumClearanceM: number | null;
  terrainCriticalDistanceM: number | null;
  terminationReason: LayeredRayTerminationReason;
  warnings: string[];
}

interface HorizonEvaluation {
  angleDeg: number;
  intersectsSurface: boolean;
  intersectionDistanceM: number | null;
  terminationReason: LayeredRayTerminationReason;
  warnings: string[];
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} sonlu bir sayı olmalıdır.`);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function profileBounds(profile: LayeredAtmosphereProfile): { minimumM: number; maximumM: number } {
  const first = profile.samples[0];
  const last = profile.samples[profile.samples.length - 1];
  if (!first || !last) throw new RangeError('Atmosfer profilinde örnek bulunamadı.');
  return { minimumM: first.altitudeM, maximumM: last.altitudeM };
}

function validateCommon(
  profile: LayeredAtmosphereProfile,
  observerAltitudeM: number,
  stepM: number,
  earthRadiusM: number
): void {
  const errors = validateAtmosphereProfile(profile);
  if (errors.length > 0) throw new RangeError(errors.join(' '));
  finite(observerAltitudeM, 'Gözlemci optik yüksekliği');
  finite(stepM, 'Işın izleme adımı');
  finite(earthRadiusM, 'Dünya yarıçapı');
  if (stepM <= 0 || stepM > 5000) {
    throw new RangeError('Işın izleme adımı 0–5000 m aralığında olmalıdır.');
  }
  if (earthRadiusM <= 0) throw new RangeError('Dünya yarıçapı sıfırdan büyük olmalıdır.');

  const bounds = profileBounds(profile);
  if (observerAltitudeM < bounds.minimumM || observerAltitudeM > bounds.maximumM) {
    throw new RangeError(
      `Gözlemci yüksekliği atmosfer profilinin ${bounds.minimumM}–${bounds.maximumM} m ölçüm kapsamı dışında.`
    );
  }
}

function interpolateRaySample(
  samples: readonly LayeredRayPathSample[],
  surfaceDistanceM: number
): LayeredRayPathSample | null {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || surfaceDistanceM < first.surfaceDistanceM - DISTANCE_TOLERANCE_M ||
      surfaceDistanceM > last.surfaceDistanceM + DISTANCE_TOLERANCE_M) {
    return null;
  }
  if (Math.abs(surfaceDistanceM - first.surfaceDistanceM) <= DISTANCE_TOLERANCE_M) {
    return { ...first, surfaceDistanceM };
  }
  if (Math.abs(surfaceDistanceM - last.surfaceDistanceM) <= DISTANCE_TOLERANCE_M) {
    return { ...last, surfaceDistanceM };
  }

  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    const sample = samples[middle]!;
    if (sample.surfaceDistanceM <= surfaceDistanceM) low = middle;
    else high = middle;
  }

  const lower = samples[low]!;
  const upper = samples[high]!;
  const spanM = upper.surfaceDistanceM - lower.surfaceDistanceM;
  if (spanM <= 0) return null;
  const fraction = (surfaceDistanceM - lower.surfaceDistanceM) / spanM;
  const mix = (left: number, right: number): number => left + (right - left) * fraction;
  return {
    pathDistanceM: mix(lower.pathDistanceM, upper.pathDistanceM),
    surfaceDistanceM,
    centralAngleRad: mix(lower.centralAngleRad, upper.centralAngleRad),
    altitudeM: mix(lower.altitudeM, upper.altitudeM),
    elevationDeg: mix(lower.elevationDeg, upper.elevationDeg),
    refractiveIndex: mix(lower.refractiveIndex, upper.refractiveIndex)
  };
}

function terrainClearance(
  raySamples: readonly LayeredRayPathSample[],
  terrainProfile: TerrainProfile | undefined
): { minimumClearanceM: number | null; criticalDistanceM: number | null; covered: boolean } {
  if (!terrainProfile) {
    return { minimumClearanceM: null, criticalDistanceM: null, covered: true };
  }

  const interior = terrainProfile.samples.filter((sample) =>
    sample.distanceM > DISTANCE_TOLERANCE_M &&
    sample.distanceM < terrainProfile.totalDistanceM - DISTANCE_TOLERANCE_M
  );
  if (interior.length === 0) {
    return { minimumClearanceM: null, criticalDistanceM: null, covered: true };
  }

  let minimumClearanceM = Number.POSITIVE_INFINITY;
  let criticalDistanceM: number | null = null;
  for (const sample of interior) {
    const ray = interpolateRaySample(raySamples, sample.distanceM);
    if (!ray) return { minimumClearanceM: null, criticalDistanceM: null, covered: false };
    const terrainElevationM = sample.elevationM + terrainProfile.datum.offsetM;
    const clearanceM = ray.altitudeM - terrainElevationM;
    if (clearanceM < minimumClearanceM) {
      minimumClearanceM = clearanceM;
      criticalDistanceM = sample.distanceM;
    }
  }

  return { minimumClearanceM, criticalDistanceM, covered: true };
}

function targetMaxPathLengthM(
  targetSurfaceDistanceM: number,
  profile: LayeredAtmosphereProfile,
  stepM: number
): number {
  const bounds = profileBounds(profile);
  const verticalSpanM = Math.max(0, bounds.maximumM - bounds.minimumM);
  return targetSurfaceDistanceM * 1.02 + Math.max(1000, verticalSpanM * 4, stepM * 4);
}

function evaluateTargetRay(
  input: LayeredSphereVisibilityInput,
  angleDeg: number,
  stepM: number,
  earthRadiusM: number,
  maxPathLengthM: number
): RayEvaluation {
  const traced = traceLayeredAtmosphereRay(input.profile, {
    settings: input.settings,
    observerAltitudeM: input.observerAltitudeM,
    initialElevationDeg: angleDeg,
    maxPathLengthM,
    stepM,
    earthRadiusM
  });
  const endpoint = interpolateRaySample(traced.samples, input.targetSurfaceDistanceM);
  if (!endpoint) {
    return {
      angleDeg,
      status: traced.terminationReason === 'surface-intersection' ? 'blocked' : 'coverage',
      endpointAltitudeM: null,
      terrainMinimumClearanceM: null,
      terrainCriticalDistanceM: null,
      terminationReason: traced.terminationReason,
      warnings: traced.warnings
    };
  }

  const terrain = terrainClearance(traced.samples, input.terrainProfile);
  if (!terrain.covered) {
    return {
      angleDeg,
      status: 'coverage',
      endpointAltitudeM: endpoint.altitudeM,
      terrainMinimumClearanceM: null,
      terrainCriticalDistanceM: null,
      terminationReason: traced.terminationReason,
      warnings: traced.warnings
    };
  }

  const blocked = terrain.minimumClearanceM !== null &&
    terrain.minimumClearanceM <= CLEARANCE_TOLERANCE_M;
  return {
    angleDeg,
    status: blocked ? 'blocked' : 'clear',
    endpointAltitudeM: endpoint.altitudeM,
    terrainMinimumClearanceM: terrain.minimumClearanceM,
    terrainCriticalDistanceM: terrain.criticalDistanceM,
    terminationReason: traced.terminationReason,
    warnings: traced.warnings
  };
}

function targetSearchAngles(input: LayeredSphereVisibilityInput, earthRadiusM: number): number[] {
  const targetTopAltitudeM = input.targetBaseAltitudeM + input.targetHeightM;
  const baseAngle = sphericalElevationAngleDeg(
    input.targetSurfaceDistanceM,
    input.observerAltitudeM,
    input.targetBaseAltitudeM,
    earthRadiusM
  );
  const topAngle = sphericalElevationAngleDeg(
    input.targetSurfaceDistanceM,
    input.observerAltitudeM,
    targetTopAltitudeM,
    earthRadiusM
  );
  const values = new Set<number>([-89, 89]);
  const offsets = [-5, -2, -1, -0.5, -0.2, -0.1, -0.05, -0.02, -0.01, 0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
  for (const center of [baseAngle, topAngle, 0]) {
    for (const offset of offsets) values.add(clamp(center + offset, -89, 89));
  }
  return [...values].sort((left, right) => left - right);
}

function refineBlockedToClearBoundary(
  input: LayeredSphereVisibilityInput,
  blockedAngleDeg: number,
  clearAngleDeg: number,
  stepM: number,
  earthRadiusM: number,
  maxPathLengthM: number
): RayEvaluation {
  let low = blockedAngleDeg;
  let high = clearAngleDeg;
  let best = evaluateTargetRay(input, high, stepM, earthRadiusM, maxPathLengthM);

  for (let iteration = 0; iteration < 32 && high - low > 1e-7; iteration += 1) {
    const middle = (low + high) / 2;
    const evaluated = evaluateTargetRay(input, middle, stepM, earthRadiusM, maxPathLengthM);
    if (evaluated.status === 'clear') {
      high = middle;
      best = evaluated;
    } else if (evaluated.status === 'blocked') {
      low = middle;
    } else {
      // A profile-limit result cannot define the lower grazing boundary. Move
      // upward only when the known clear bracket remains above it.
      low = middle;
    }
  }
  return best;
}

function solveClearRayToAltitude(
  input: LayeredSphereVisibilityInput,
  targetAltitudeM: number,
  seedEvaluations: readonly RayEvaluation[],
  stepM: number,
  earthRadiusM: number,
  maxPathLengthM: number
): RayEvaluation | null {
  const clear = seedEvaluations
    .filter((item): item is RayEvaluation & { endpointAltitudeM: number } =>
      item.status === 'clear' && item.endpointAltitudeM !== null)
    .sort((left, right) => left.angleDeg - right.angleDeg);
  if (clear.length === 0) return null;

  for (let index = 0; index < clear.length - 1; index += 1) {
    let low = clear[index]!;
    let high = clear[index + 1]!;
    const lowResidual = low.endpointAltitudeM - targetAltitudeM;
    const highResidual = high.endpointAltitudeM - targetAltitudeM;
    if (Math.abs(lowResidual) <= 1e-5) return low;
    if (Math.abs(highResidual) <= 1e-5) return high;
    if (lowResidual * highResidual > 0) continue;

    for (let iteration = 0; iteration < 36 && high.angleDeg - low.angleDeg > 1e-8; iteration += 1) {
      const middleAngle = (low.angleDeg + high.angleDeg) / 2;
      const middle = evaluateTargetRay(input, middleAngle, stepM, earthRadiusM, maxPathLengthM);
      if (middle.status !== 'clear' || middle.endpointAltitudeM === null) {
        return null;
      }
      const clearMiddle = middle as RayEvaluation & { endpointAltitudeM: number };
      const residual = clearMiddle.endpointAltitudeM - targetAltitudeM;
      if (Math.abs(residual) <= 1e-5) return clearMiddle;
      if ((low.endpointAltitudeM - targetAltitudeM) * residual <= 0) high = clearMiddle;
      else low = clearMiddle;
    }
    return Math.abs(low.endpointAltitudeM - targetAltitudeM) <=
      Math.abs(high.endpointAltitudeM - targetAltitudeM) ? low : high;
  }
  return null;
}

export function analyzeLayeredSphereVisibility(
  input: LayeredSphereVisibilityInput
): LayeredSphereVisibilityResult {
  finite(input.targetSurfaceDistanceM, 'Hedef yüzey mesafesi');
  finite(input.targetBaseAltitudeM, 'Hedef taban kotu');
  finite(input.targetHeightM, 'Hedef yüksekliği');
  if (input.targetSurfaceDistanceM <= 0) {
    throw new RangeError('Katmanlı optik görünürlük için hedef yüzey mesafesi sıfırdan büyük olmalıdır.');
  }
  if (input.targetHeightM <= 0) throw new RangeError('Hedef yüksekliği sıfırdan büyük olmalıdır.');

  const stepM = input.stepM ?? 25;
  const earthRadiusM = input.earthRadiusM ?? MEAN_EARTH_RADIUS_M;
  validateCommon(input.profile, input.observerAltitudeM, stepM, earthRadiusM);
  const bounds = profileBounds(input.profile);
  const targetTopAltitudeM = input.targetBaseAltitudeM + input.targetHeightM;
  if (input.targetBaseAltitudeM < bounds.minimumM || targetTopAltitudeM > bounds.maximumM) {
    throw new RangeError(
      `Hedefin ${input.targetBaseAltitudeM}–${targetTopAltitudeM} m düşey aralığı atmosfer profilinin ${bounds.minimumM}–${bounds.maximumM} m ölçüm kapsamı içinde olmalıdır.`
    );
  }
  if (input.terrainProfile &&
      Math.abs(input.terrainProfile.totalDistanceM - input.targetSurfaceDistanceM) > DISTANCE_TOLERANCE_M) {
    throw new RangeError('Arazi profili ile hedef yüzey mesafesi aynı olmalıdır.');
  }

  const maxPathLengthM = targetMaxPathLengthM(input.targetSurfaceDistanceM, input.profile, stepM);
  if (maxPathLengthM / stepM > MAX_TARGET_TRACE_STEPS) {
    const minimumStepM = Math.ceil(maxPathLengthM / MAX_TARGET_TRACE_STEPS);
    throw new RangeError(
      `Katmanlı ışın izi bu mesafe ve ${stepM} m adımla hesaplama sınırını aşıyor. Işın adımını en az ${minimumStepM} m yapın.`
    );
  }

  const angles = targetSearchAngles(input, earthRadiusM);
  const evaluations = angles.map((angleDeg) =>
    evaluateTargetRay(input, angleDeg, stepM, earthRadiusM, maxPathLengthM)
  );
  const candidates = evaluations
    .filter((item): item is RayEvaluation & { endpointAltitudeM: number } =>
      item.status === 'clear' && item.endpointAltitudeM !== null);

  for (let index = 1; index < evaluations.length; index += 1) {
    const previous = evaluations[index - 1]!;
    const current = evaluations[index]!;
    if (previous.status === 'blocked' && current.status === 'clear') {
      const refined = refineBlockedToClearBoundary(
        input,
        previous.angleDeg,
        current.angleDeg,
        stepM,
        earthRadiusM,
        maxPathLengthM
      );
      if (refined.endpointAltitudeM !== null) candidates.push(refined as RayEvaluation & { endpointAltitudeM: number });
    }
  }

  if (candidates.length === 0) {
    const coverageLimited = evaluations.some((item) => item.status === 'coverage');
    throw new RangeError(coverageLimited
      ? 'Atmosfer profilinin ölçülmüş yükseklik kapsamı hedef mesafesine ulaşan açık bir ışın yolu kurmak için yetersiz.'
      : 'Hedef mesafesine yüzey/arazi engelini temizleyerek ulaşan bir katmanlı optik ışın bulunamadı.');
  }

  const grazing = candidates.reduce((minimum, item) =>
    item.endpointAltitudeM < minimum.endpointAltitudeM ? item : minimum,
    candidates[0]!
  );
  const minimumVisibleAltitudeM = grazing.endpointAltitudeM;
  const hiddenHeightM = clamp(
    minimumVisibleAltitudeM - input.targetBaseAltitudeM,
    0,
    input.targetHeightM
  );
  const visibleHeightM = input.targetHeightM - hiddenHeightM;
  const visibleFraction = visibleHeightM / input.targetHeightM;
  const hiddenFraction = 1 - visibleFraction;

  const seeds = [...evaluations, grazing]
    .sort((left, right) => left.angleDeg - right.angleDeg);
  const targetBaseRay = hiddenHeightM <= CLEARANCE_TOLERANCE_M
    ? solveClearRayToAltitude(
        input,
        input.targetBaseAltitudeM,
        seeds,
        stepM,
        earthRadiusM,
        maxPathLengthM
      )
    : null;
  const targetTopRay = targetTopAltitudeM + CLEARANCE_TOLERANCE_M >= minimumVisibleAltitudeM
    ? solveClearRayToAltitude(
        input,
        targetTopAltitudeM,
        seeds,
        stepM,
        earthRadiusM,
        maxPathLengthM
      )
    : null;

  const warnings = new Set<string>();
  for (const item of [...evaluations, grazing, ...(targetBaseRay ? [targetBaseRay] : []), ...(targetTopRay ? [targetTopRay] : [])]) {
    item.warnings.forEach((warning) => warnings.add(warning));
  }
  warnings.add(
    `Katmanlı görünürlük ${stepM} m RK4 ışın adımıyla çözüldü; tek bir sabit k katsayısına indirgenmedi.`
  );
  if (!targetTopRay && visibleFraction > 0) {
    warnings.add('Hedef tepesinin başlangıç yükselim açısı sayısal atış çözümünde güvenilir bir kökle eşleştirilemedi.');
  }

  return {
    minimumVisibleAltitudeM,
    visibleHeightM,
    hiddenHeightM,
    visibleFraction,
    hiddenFraction,
    targetBaseElevationDeg: targetBaseRay?.angleDeg ?? null,
    targetTopElevationDeg: targetTopRay?.angleDeg ?? null,
    targetAngularHeightDeg: targetBaseRay && targetTopRay
      ? targetTopRay.angleDeg - targetBaseRay.angleDeg
      : null,
    targetTopTerrainMinimumClearanceM: targetTopRay?.terrainMinimumClearanceM ?? null,
    targetTopTerrainCriticalDistanceM: targetTopRay?.terrainCriticalDistanceM ?? null,
    grazingInitialElevationDeg: grazing.angleDeg,
    grazingTerrainMinimumClearanceM: grazing.terrainMinimumClearanceM,
    grazingTerrainCriticalDistanceM: grazing.terrainCriticalDistanceM,
    rayTraceStepM: stepM,
    warnings: [...warnings]
  };
}

function approximateSurfaceIntersectionDistanceM(
  last: LayeredRayPathSample,
  stepM: number
): number {
  const elevationRad = last.elevationDeg * Math.PI / 180;
  const downward = -Math.sin(elevationRad);
  if (last.altitudeM <= 0) return last.surfaceDistanceM;
  if (downward <= 1e-9) return last.surfaceDistanceM + stepM;
  const remainingPathM = Math.min(stepM, last.altitudeM / downward);
  return last.surfaceDistanceM + remainingPathM * Math.max(0, Math.cos(elevationRad));
}

function evaluateHorizonRay(
  input: LayeredSphereHorizonInput,
  angleDeg: number,
  stepM: number,
  earthRadiusM: number,
  maxPathLengthM: number
): HorizonEvaluation {
  const traced = traceLayeredAtmosphereRay(input.profile, {
    settings: input.settings,
    observerAltitudeM: input.observerAltitudeM,
    initialElevationDeg: angleDeg,
    maxPathLengthM,
    stepM,
    earthRadiusM
  });
  const last = traced.samples[traced.samples.length - 1];
  const intersectsSurface = traced.terminationReason === 'surface-intersection';
  return {
    angleDeg,
    intersectsSurface,
    intersectionDistanceM: intersectsSurface && last
      ? approximateSurfaceIntersectionDistanceM(last, stepM)
      : null,
    terminationReason: traced.terminationReason,
    warnings: traced.warnings
  };
}

export function analyzeLayeredSphereHorizon(
  input: LayeredSphereHorizonInput
): LayeredSphereHorizonResult {
  const stepM = input.stepM ?? 25;
  const earthRadiusM = input.earthRadiusM ?? MEAN_EARTH_RADIUS_M;
  validateCommon(input.profile, input.observerAltitudeM, stepM, earthRadiusM);
  const bounds = profileBounds(input.profile);
  if (bounds.minimumM > 0 || bounds.maximumM < 0) {
    throw new RangeError('Optik ufuk hesabı için atmosfer profili 0 m referans yüzeyini kapsamalıdır.');
  }

  const geometricHorizonM = surfaceHorizonDistanceM(input.observerAltitudeM, earthRadiusM);
  const maxPathLengthM = Math.max(50_000, geometricHorizonM * 8);
  if (maxPathLengthM / stepM > MAX_TARGET_TRACE_STEPS) {
    const minimumStepM = Math.ceil(maxPathLengthM / MAX_TARGET_TRACE_STEPS);
    throw new RangeError(
      `Optik ufuk taraması ${stepM} m adımla hesaplama sınırını aşıyor. Işın adımını en az ${minimumStepM} m yapın.`
    );
  }

  const evaluations = HORIZON_SCAN_ANGLES_DEG.map((angleDeg) =>
    evaluateHorizonRay(input, angleDeg, stepM, earthRadiusM, maxPathLengthM)
  );
  let best = evaluations
    .filter((item): item is HorizonEvaluation & { intersectionDistanceM: number } =>
      item.intersectsSurface && item.intersectionDistanceM !== null)
    .reduce<(HorizonEvaluation & { intersectionDistanceM: number }) | null>(
      (current, item) => !current || item.intersectionDistanceM > current.intersectionDistanceM ? item : current,
      null
    );

  for (let index = 1; index < evaluations.length; index += 1) {
    const lower = evaluations[index - 1]!;
    const upper = evaluations[index]!;
    if (!lower.intersectsSurface || upper.intersectsSurface) continue;
    let lowAngle = lower.angleDeg;
    let highAngle = upper.angleDeg;
    let low = lower;
    for (let iteration = 0; iteration < 34 && highAngle - lowAngle > 1e-8; iteration += 1) {
      const middleAngle = (lowAngle + highAngle) / 2;
      const middle = evaluateHorizonRay(input, middleAngle, stepM, earthRadiusM, maxPathLengthM);
      if (middle.intersectsSurface) {
        lowAngle = middleAngle;
        low = middle;
      } else {
        highAngle = middleAngle;
      }
    }
    if (low.intersectionDistanceM !== null &&
        (!best || low.intersectionDistanceM > best.intersectionDistanceM)) {
      best = low as HorizonEvaluation & { intersectionDistanceM: number };
    }
  }

  const warnings = new Set<string>();
  evaluations.forEach((item) => item.warnings.forEach((warning) => warnings.add(warning)));
  warnings.add(
    `Optik ufuk yüzey kesişimi ${stepM} m ışın adımı çözünürlüğüyle sınırlandırılmıştır.`
  );

  if (!best) {
    warnings.add('Ölçülmüş atmosfer kapsamı içinde yüzeye dönen bir sınır ışını bulunamadı.');
    return {
      horizonSurfaceDistanceM: null,
      grazingInitialElevationDeg: null,
      rayTraceStepM: stepM,
      warnings: [...warnings]
    };
  }
  if (best.intersectionDistanceM > maxPathLengthM * 0.95) {
    warnings.add('Optik ufuk tarama mesafesinin sınırına ulaştı; daha uzun yol veya daha kalın ölçülmüş profil gerekebilir.');
    return {
      horizonSurfaceDistanceM: null,
      grazingInitialElevationDeg: best.angleDeg,
      rayTraceStepM: stepM,
      warnings: [...warnings]
    };
  }

  return {
    horizonSurfaceDistanceM: best.intersectionDistanceM,
    grazingInitialElevationDeg: best.angleDeg,
    rayTraceStepM: stepM,
    warnings: [...warnings]
  };
}
