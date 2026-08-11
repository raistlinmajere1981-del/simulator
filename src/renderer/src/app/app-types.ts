import type { SimulatorInputs } from '../../../shared/simulator';

export type NumericInputKey = Exclude<
  keyof SimulatorInputs,
  | 'useStandardRefraction'
  | 'distanceSource'
  | 'terrainMode'
  | 'verticalDatumKind'
>;

export interface VisualLayerState {
  geographicBoundaries: boolean;
  terrain: boolean;
  atmosphere: boolean;
  grid: boolean;
}
