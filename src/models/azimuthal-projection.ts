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
    version: '0.2.0',
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
      traceId: `${this.metadata.id}:${experiment.id}:unsupported`,
      trace: {
        summary:
          'Projeksiyon konumları harita düzlemine dönüştürür; hedef görünürlüğü için gerekli fiziksel kuralları tanımlamaz.',
        assumptions: this.metadata.assumptions,
        steps: [
          {
            id: 'missing-surface-geometry',
            title: 'Eksik yüzey geometrisi',
            formula: 'Tanımsız',
            substitution: 'Yerel yüzey normali ve fiziksel yükseklik ilişkisi verilmedi.',
            result: 'Hesaplanamaz'
          },
          {
            id: 'missing-light-path',
            title: 'Eksik ışık ilerleme kuralı',
            formula: 'Tanımsız',
            substitution: 'Işığın üç boyutlu uzayda izleyeceği yol belirtilmedi.',
            result: 'Hesaplanamaz'
          },
          {
            id: 'missing-horizon',
            title: 'Eksik ufuk tanımı',
            formula: 'Tanımsız',
            substitution: 'Projeksiyon ölçeği fiziksel engellenme veya ufuk üretmez.',
            result: 'Hesaplanamaz'
          }
        ]
      }
    };
  }
}
