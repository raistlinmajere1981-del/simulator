import { AzimuthalProjectionReference } from './azimuthal-projection';
import { DefinedPlaneModel } from './defined-plane';
import { IdealSphereModel } from './ideal-sphere';

export const simulationModels = [
  new IdealSphereModel(),
  new DefinedPlaneModel(),
  new AzimuthalProjectionReference()
];
