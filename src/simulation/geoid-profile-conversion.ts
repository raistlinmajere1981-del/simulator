import type { ManualTerrainPoint } from '../shared/terrain';
import {
  convertGeoidHeight,
  type GeoidHeightDatum
} from './geoid-height-conversion';

export interface GeoidProfileConversionInput {
  from: GeoidHeightDatum;
  to: GeoidHeightDatum;
  geoidUndulationM: number;
  geoidUndulationUncertaintyM?: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  points: readonly ManualTerrainPoint[];
}

export interface GeoidProfileConversionResult {
  from: GeoidHeightDatum;
  to: GeoidHeightDatum;
  correctionM: number;
  uncertaintyM: number | null;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  points: ManualTerrainPoint[];
}

export function convertGeoidTerrainProfile(
  input: GeoidProfileConversionInput
): GeoidProfileConversionResult {
  if (input.from === input.to) {
    throw new RangeError('Profil dönüşümü için kaynak ve hedef datum farklı olmalı.');
  }
  const common = {
    from: input.from,
    to: input.to,
    geoidUndulationM: input.geoidUndulationM,
    ...(input.geoidUndulationUncertaintyM === undefined
      ? {}
      : { geoidUndulationUncertaintyM: input.geoidUndulationUncertaintyM })
  };
  const observer = convertGeoidHeight({
    ...common,
    valueM: input.observerGroundElevationM
  });
  const target = convertGeoidHeight({
    ...common,
    valueM: input.targetGroundElevationM
  });
  const points = input.points.map((point) => ({
    ...point,
    elevationM: convertGeoidHeight({
      ...common,
      valueM: point.elevationM
    }).valueM
  }));

  return {
    from: input.from,
    to: input.to,
    correctionM: observer.correctionM,
    uncertaintyM: observer.uncertaintyM,
    observerGroundElevationM: observer.valueM,
    targetGroundElevationM: target.valueM,
    points
  };
}
