import type {
  AtmosphereMode,
  LayeredAtmosphereProfile,
  OpticalAtmosphereSettings
} from '../shared/atmosphere';
import type {
  ExperimentDefinition,
  ModelCapability,
  ModelMetadata,
  ModelPrediction
} from '../shared/domain';

export interface SimulationContext {
  atmosphereMode: AtmosphereMode;
  refractionCoefficient?: number;
  atmosphereProfile?: LayeredAtmosphereProfile;
  opticalAtmosphereSettings?: OpticalAtmosphereSettings;
  rayTraceStepM?: number;
  seed?: number;
}

export interface SimulationModel {
  readonly metadata: ModelMetadata;

  supports(capability: ModelCapability): boolean;

  validateExperiment(experiment: ExperimentDefinition): string[];

  predict(
    experiment: ExperimentDefinition,
    context: SimulationContext
  ): Promise<ModelPrediction>;
}

export function hasCapabilities(
  model: SimulationModel,
  required: ModelCapability[]
): boolean {
  return required.every((capability) => model.supports(capability));
}
