export type DemSampleCountMode = 'automatic' | 'manual';

export const MIN_DEM_SAMPLE_COUNT = 3;
export const MAX_DEM_SAMPLE_COUNT = 2_002;

export function requestedDemSampleCount(
  mode: DemSampleCountMode,
  value: number
): number | undefined {
  if (mode === 'automatic') return undefined;
  if (!Number.isInteger(value) || value < MIN_DEM_SAMPLE_COUNT ||
    value > MAX_DEM_SAMPLE_COUNT) {
    throw new RangeError(
      `Manuel DEM örnek sayısı ${MIN_DEM_SAMPLE_COUNT}…${MAX_DEM_SAMPLE_COUNT} aralığında bir tam sayı olmalı.`
    );
  }
  return value;
}
