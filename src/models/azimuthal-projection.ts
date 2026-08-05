import type {
  ExperimentDefinition,
  ModelCapability,
  ModelMetadata,
  ModelPrediction
} from '../shared/domain';
import type {
  SimulationContext,
  SimulationModel
} from '../simulation/model-contract';

export class AzimuthalProjectionReference implements SimulationModel {
  readonly metadata: ModelMetadata = {
    id: 'azimuthal-projection',
    name: 'Azimutal Gösterim',
    version: '0.1.0',
    description:
      'Harita projeksiyonu referansı. Tek başına fiziksel yüzey veya ışık modeli değildir.',
    capabilities: ['surface-distance'],
    assumptions: [
      'Bu bileşen yalnızca kartografik gösterimdir.',
      'Dikey yön, ışık yolu ve fiziksel ufuk tanımlı değildir.'
    ]
  };

  supports(capability: ModelCapability): boolean {
    return this.metadata.capabilities.includes(capability);
  }

  validateExperiment(_experiment: ExperimentDefinition): string[] {
    return [
      'Azimutal projeksiyon tek başına hedef görünürlüğü tahmini üretemez.'
    ];
  }

  async predict(
    experiment: ExperimentDefinition,
    _context: SimulationContext
  ): Promise<ModelPrediction> {
    return {
      modelId: this.metadata.id,
      experimentId: experiment.id,
      status: 'unsupported',
      metrics: [],
      warnings: this.validateExperiment(experiment),
      traceId: `${this.metadata.id}:${experiment.id}:unsupported`
    };
  }
}
