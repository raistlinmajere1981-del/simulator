import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction
} from '../shared/domain';
import type { SimulationContext, SimulationModel } from './model-contract';

export interface ModelRun {
  metadata: ModelMetadata;
  prediction: ModelPrediction;
}

export async function runSimulationModels(
  models: SimulationModel[],
  experiment: ExperimentDefinition,
  context: SimulationContext
): Promise<ModelRun[]> {
  return Promise.all(
    models.map(async (model) => {
      try {
        const prediction = await model.predict(experiment, context);
        return { metadata: model.metadata, prediction };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Bilinmeyen hesaplama hatası.';

        return {
          metadata: model.metadata,
          prediction: {
            modelId: model.metadata.id,
            experimentId: experiment.id,
            status: 'unsupported',
            metrics: [],
            warnings: [`Model hesaplaması tamamlanamadı: ${message}`],
            traceId: `${model.metadata.id}:${experiment.id}:error`
          }
        };
      }
    })
  );
}
