export type VerticalDatumKind =
  | 'orthometric-msl'
  | 'ellipsoidal-wgs84'
  | 'local';

export type TerrainProfileSource = 'manual' | 'imported' | 'dem';

export interface VerticalDatumDefinition {
  kind: VerticalDatumKind;
  label: string;
  /**
   * Optional offset from the declared datum in metres. A tide or local
   * benchmark correction can be represented here without changing samples.
   */
  offsetM: number;
}

export interface TerrainSample {
  /** Surface distance from the observer along the selected route. */
  distanceM: number;
  /** Elevation relative to the declared vertical datum. */
  elevationM: number;
}

export interface TerrainProfile {
  id: string;
  label: string;
  source: TerrainProfileSource;
  datum: VerticalDatumDefinition;
  totalDistanceM: number;
  samples: TerrainSample[];
}

export interface TerrainClearanceSample extends TerrainSample {
  lineOfSightElevationM: number;
  clearanceM: number;
}

export interface TerrainClearanceResult {
  blocked: boolean;
  minimumClearanceM: number | null;
  criticalSample: TerrainClearanceSample | null;
  samples: TerrainClearanceSample[];
  warnings: string[];
}
