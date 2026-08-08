export type UncertaintyCombination = 'linear-conservative' | 'rss-independent';

/**
 * Optional user-supplied input ranges for sensitivity propagation. These are
 * deterministic +/- bounds, not probabilistic confidence intervals or implied
 * one-sigma values. Missing fields mean "uncertainty not defined"; they must
 * not be interpreted as measured zero uncertainty.
 */
export interface ModelInputUncertaintySettings {
  combination: UncertaintyCombination;
  surfaceDistanceM?: number;
  observerEyeHeightM?: number;
  observerGroundElevationM?: number;
  targetHeightM?: number;
  targetGroundElevationM?: number;
  refractionCoefficient?: number;
}

export const DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS: ModelInputUncertaintySettings = {
  combination: 'linear-conservative'
};

/**
 * Linear mode is the conservative bound. RSS is valid only when the caller can
 * justify treating the individual sensitivity contributions as independent.
 * Neither mode assigns a probability or confidence level to the result.
 */
export function combineUncertaintyContributions(
  values: readonly number[],
  combination: UncertaintyCombination
): number {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (combination === 'rss-independent') {
    return Math.sqrt(finite.reduce((sum, value) => sum + value * value, 0));
  }
  return finite.reduce((sum, value) => sum + value, 0);
}

export function hasDefinedModelInputUncertainty(
  settings: ModelInputUncertaintySettings | undefined
): boolean {
  if (!settings) return false;
  return [
    settings.surfaceDistanceM,
    settings.observerEyeHeightM,
    settings.observerGroundElevationM,
    settings.targetHeightM,
    settings.targetGroundElevationM,
    settings.refractionCoefficient
  ].some((value) => value !== undefined && Number.isFinite(value) && value > 0);
}
