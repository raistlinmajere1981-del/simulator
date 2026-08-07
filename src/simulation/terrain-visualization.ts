import type { TerrainProfile } from '../shared/terrain';

const DISTANCE_TOLERANCE_M = 1e-6;
const RELIEF_TOLERANCE_M = 1e-9;
const MAX_VISUALIZATION_SAMPLES = 20_000;

export interface TerrainVisualizationSample {
  distanceM: number;
  distanceFraction: number;
  elevationM: number;
  baselineElevationM: number;
  reliefM: number;
  normalizedRelief: number;
}

export interface TerrainVisualizationProfile {
  label: string;
  source: TerrainProfile['source'];
  totalDistanceM: number;
  minimumElevationM: number;
  maximumElevationM: number;
  maximumAbsoluteReliefM: number;
  samples: TerrainVisualizationSample[];
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} sonlu olmalı.`);
}

export function buildTerrainVisualizationProfile(
  profile: TerrainProfile
): TerrainVisualizationProfile {
  finite(profile.totalDistanceM, 'Arazi profil mesafesi');
  if (profile.totalDistanceM <= 0) {
    throw new RangeError('Arazi profil mesafesi sıfırdan büyük olmalı.');
  }
  if (profile.samples.length < 2) {
    throw new RangeError('Arazi görselleştirmesi en az iki profil örneği gerektirir.');
  }
  if (profile.samples.length > MAX_VISUALIZATION_SAMPLES) {
    throw new RangeError(`Arazi görselleştirmesi en fazla ${MAX_VISUALIZATION_SAMPLES} örnek destekler.`);
  }

  let previousDistanceM = -Infinity;
  for (const [index, sample] of profile.samples.entries()) {
    finite(sample.distanceM, `Arazi örneği ${index + 1} mesafesi`);
    finite(sample.elevationM, `Arazi örneği ${index + 1} kotu`);
    if (sample.distanceM < -DISTANCE_TOLERANCE_M ||
      sample.distanceM > profile.totalDistanceM + DISTANCE_TOLERANCE_M) {
      throw new RangeError(`Arazi örneği ${index + 1} profil mesafesi dışında.`);
    }
    if (sample.distanceM <= previousDistanceM + DISTANCE_TOLERANCE_M) {
      throw new RangeError('Arazi örnek mesafeleri artan ve tekrarsız olmalı.');
    }
    previousDistanceM = sample.distanceM;
  }

  const first = profile.samples[0];
  const last = profile.samples[profile.samples.length - 1];
  if (Math.abs(first.distanceM) > DISTANCE_TOLERANCE_M ||
    Math.abs(last.distanceM - profile.totalDistanceM) > DISTANCE_TOLERANCE_M) {
    throw new RangeError('Arazi görselleştirmesi profil uç örneklerini gerektirir.');
  }

  const rawSamples = profile.samples.map((sample) => {
    const distanceFraction = sample.distanceM / profile.totalDistanceM;
    const baselineElevationM = first.elevationM +
      (last.elevationM - first.elevationM) * distanceFraction;
    const reliefM = sample.elevationM - baselineElevationM;
    return {
      distanceM: sample.distanceM,
      distanceFraction,
      elevationM: sample.elevationM,
      baselineElevationM,
      reliefM
    };
  });
  const maximumAbsoluteReliefM = rawSamples.reduce(
    (maximum, sample) => Math.max(maximum, Math.abs(sample.reliefM)),
    0
  );

  return {
    label: profile.label,
    source: profile.source,
    totalDistanceM: profile.totalDistanceM,
    minimumElevationM: Math.min(...profile.samples.map((sample) => sample.elevationM)),
    maximumElevationM: Math.max(...profile.samples.map((sample) => sample.elevationM)),
    maximumAbsoluteReliefM,
    samples: rawSamples.map((sample) => ({
      ...sample,
      normalizedRelief: maximumAbsoluteReliefM <= RELIEF_TOLERANCE_M
        ? 0
        : sample.reliefM / maximumAbsoluteReliefM
    }))
  };
}
