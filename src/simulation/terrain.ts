import type {
  TerrainClearanceResult,
  TerrainClearanceSample,
  TerrainProfile,
  TerrainSample
} from '../shared/terrain';

const DISTANCE_TOLERANCE_M = 1e-6;

export interface TerrainLineOfSightInput {
  observerEyeElevationM: number;
  targetTopElevationM: number;
  surfaceDistanceM: number;
}

export interface SphericalTerrainLineOfSightInput extends TerrainLineOfSightInput {
  radiusM: number;
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} sonlu bir sayı olmalıdır.`);
  }
}

export function validateTerrainProfile(profile: TerrainProfile): string[] {
  const errors: string[] = [];

  if (!profile.id.trim()) errors.push('Arazi profili kimliği boş olamaz.');
  if (!profile.label.trim()) errors.push('Arazi profili adı boş olamaz.');
  if (!Number.isFinite(profile.totalDistanceM) || profile.totalDistanceM <= 0) {
    errors.push('Arazi profili toplam mesafesi sıfırdan büyük olmalıdır.');
  }
  if (!Number.isFinite(profile.datum.offsetM)) {
    errors.push('Düşey datum ofseti sonlu bir sayı olmalıdır.');
  }
  if (profile.samples.length < 2) {
    errors.push('Arazi profili en az iki örnek içermelidir.');
    return errors;
  }

  let previousDistance = -Infinity;
  profile.samples.forEach((sample, index) => {
    if (!Number.isFinite(sample.distanceM) || !Number.isFinite(sample.elevationM)) {
      errors.push(`Arazi örneği ${index + 1} sonlu sayılar içermelidir.`);
      return;
    }
    if (sample.distanceM < 0 || sample.distanceM > profile.totalDistanceM) {
      errors.push(`Arazi örneği ${index + 1} profil mesafesi dışında.`);
    }
    if (sample.distanceM <= previousDistance) {
      errors.push('Arazi örnekleri artan mesafe sırasıyla ve tekrarsız olmalıdır.');
    }
    previousDistance = sample.distanceM;
  });

  const first = profile.samples[0];
  const last = profile.samples[profile.samples.length - 1];
  if (Math.abs(first.distanceM) > DISTANCE_TOLERANCE_M) {
    errors.push('Arazi profilinin ilk örneği 0 m konumunda olmalıdır.');
  }
  if (Math.abs(last.distanceM - profile.totalDistanceM) > DISTANCE_TOLERANCE_M) {
    errors.push('Arazi profilinin son örneği toplam mesafede olmalıdır.');
  }

  return errors;
}

function validateAnalysisInput(
  profile: TerrainProfile,
  input: TerrainLineOfSightInput
): void {
  const profileErrors = validateTerrainProfile(profile);
  if (profileErrors.length > 0) {
    throw new RangeError(profileErrors.join(' '));
  }

  assertFinite('Gözlemci göz kotu', input.observerEyeElevationM);
  assertFinite('Hedef tepe kotu', input.targetTopElevationM);
  assertFinite('Yüzey mesafesi', input.surfaceDistanceM);

  if (input.surfaceDistanceM <= 0) {
    throw new RangeError('Yüzey mesafesi sıfırdan büyük olmalıdır.');
  }
  if (Math.abs(profile.totalDistanceM - input.surfaceDistanceM) > DISTANCE_TOLERANCE_M) {
    throw new RangeError('Arazi profili ile deney yüzey mesafesi aynı olmalıdır.');
  }
}

function summarize(
  samples: TerrainClearanceSample[],
  warnings: string[]
): TerrainClearanceResult {
  const interior = samples.filter((sample) =>
    sample.distanceM > DISTANCE_TOLERANCE_M &&
    sample.distanceM < samples[samples.length - 1].distanceM - DISTANCE_TOLERANCE_M
  );

  if (interior.length === 0) {
    return {
      blocked: false,
      minimumClearanceM: null,
      criticalSample: null,
      samples,
      warnings: [...warnings, 'Profilde görüş hattını sınayacak ara örnek bulunmuyor.']
    };
  }

  const criticalSample = interior.reduce((minimum, sample) =>
    sample.clearanceM < minimum.clearanceM ? sample : minimum
  );

  return {
    blocked: criticalSample.clearanceM <= 0,
    minimumClearanceM: criticalSample.clearanceM,
    criticalSample,
    samples,
    warnings
  };
}

function terrainElevationWithOffset(profile: TerrainProfile, sample: TerrainSample): number {
  return sample.elevationM + profile.datum.offsetM;
}

export function analyzePlanarTerrainClearance(
  profile: TerrainProfile,
  input: TerrainLineOfSightInput
): TerrainClearanceResult {
  validateAnalysisInput(profile, input);

  const samples = profile.samples.map<TerrainClearanceSample>((sample) => {
    const fraction = sample.distanceM / input.surfaceDistanceM;
    const lineOfSightElevationM = input.observerEyeElevationM +
      (input.targetTopElevationM - input.observerEyeElevationM) * fraction;
    const elevationM = terrainElevationWithOffset(profile, sample);

    return {
      distanceM: sample.distanceM,
      elevationM,
      lineOfSightElevationM,
      clearanceM: lineOfSightElevationM - elevationM
    };
  });

  return summarize(samples, [
    'Düzlem hesabında görüş hattı iki uç arasında doğrusal enterpolasyondur.'
  ]);
}

function sphericalLineOfSightElevationM(
  distanceFromObserverM: number,
  input: SphericalTerrainLineOfSightInput
): number {
  const totalAngle = input.surfaceDistanceM / input.radiusM;
  const sampleAngle = distanceFromObserverM / input.radiusM;
  const observerRadiusM = input.radiusM + input.observerEyeElevationM;
  const targetRadiusM = input.radiusM + input.targetTopElevationM;

  const observerX = observerRadiusM;
  const observerY = 0;
  const targetX = targetRadiusM * Math.cos(totalAngle);
  const targetY = targetRadiusM * Math.sin(totalAngle);
  const vectorX = targetX - observerX;
  const vectorY = targetY - observerY;
  const rayX = Math.cos(sampleAngle);
  const rayY = Math.sin(sampleAngle);

  const observerCrossRay = observerX * rayY - observerY * rayX;
  const vectorCrossRay = vectorX * rayY - vectorY * rayX;

  if (Math.abs(vectorCrossRay) < Number.EPSILON) {
    return distanceFromObserverM <= DISTANCE_TOLERANCE_M
      ? input.observerEyeElevationM
      : input.targetTopElevationM;
  }

  const segmentFraction = -observerCrossRay / vectorCrossRay;
  const lineX = observerX + segmentFraction * vectorX;
  const lineY = observerY + segmentFraction * vectorY;
  const radialDistanceM = lineX * rayX + lineY * rayY;

  return radialDistanceM - input.radiusM;
}

export function analyzeSphericalTerrainClearance(
  profile: TerrainProfile,
  input: SphericalTerrainLineOfSightInput
): TerrainClearanceResult {
  validateAnalysisInput(profile, input);
  assertFinite('Küre yarıçapı', input.radiusM);
  if (input.radiusM <= 0) {
    throw new RangeError('Küre yarıçapı sıfırdan büyük olmalıdır.');
  }

  const samples = profile.samples.map<TerrainClearanceSample>((sample) => {
    const lineOfSightElevationM = sphericalLineOfSightElevationM(
      sample.distanceM,
      input
    );
    const elevationM = terrainElevationWithOffset(profile, sample);

    return {
      distanceM: sample.distanceM,
      elevationM,
      lineOfSightElevationM,
      clearanceM: lineOfSightElevationM - elevationM
    };
  });

  return summarize(samples, [
    'Küresel hesapta profil noktaları merkezden çıkan yerel düşey doğrultular üzerindedir.',
    'Verilen yarıçap etkin yarıçap ise kırılma profil açıklığına yaklaşık olarak yansır.'
  ]);
}
