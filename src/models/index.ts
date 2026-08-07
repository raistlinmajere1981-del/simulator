import { AzimuthalProjectionReference } from './azimuthal-projection';
import { DefinedPlaneModel } from './defined-plane';
import { IdealSphereLayeredModel } from './ideal-sphere-layered';

export const simulationModels = [
  new IdealSphereLayeredModel(),
  new DefinedPlaneModel(),
  new AzimuthalProjectionReference()
];
