import type {
  CalculationTrace,
  ExperimentDefinition,
  ModelCapability,
  ModelMetadata,
  ModelPrediction,
  PredictionMetric
} from '../shared/domain';
import {
  evaluateFractionPrediction,
  getMeasurement
} from '../simulation/evaluation';
import { planarElevationAngleDeg } from '../simulation/geometry';
import type {
  SimulationContext,
  SimulationModel
} from '../simulation/model-contract';

function metric(
  key: string,
  label: string,
  value: number | null,
  unit: string
): PredictionMetric {
  return { key, label, value, unit };
}

function format(value: number, digits = 3): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

export class DefinedPlaneModel implements SimulationModel {
  readonly metadata: ModelMetadata = {
    id: 'defined-plane',
    name: 'Tanımlı Düzlem',
    version: '0.2.0',
    description:
      'Düz, engelsiz yüzey ve doğrusal ışık varsayımıyla görüş hesabı.',
    capabilities: ['surface-distance', 'line-of-sight', 'horizon'],
    assumptions: [
      'Yüzey sonsuz düzlemdir.',
      'Işık doğrusal ilerler.',
      'Arazi, dalga ve optik kırılma bulunmaz.',
      'Geometrik ufuk sonlu değildir.'
    ]
  };

  supports(capability: ModelCapability): boolean {
    return this.metadata.capabilities.includes(capability);
  }

  validateExperiment(experiment: ExperimentDefinition): string[] {
    const errors: string[] = [];
    const distance = getMeasurement(experiment, 'surfaceDistanceM', 'm');

    if (experiment.type !== 'target-visibility') {
      errors.push('Bu sürüm yalnızca hedef görünürlüğü deneyini destekler.');
    }

    if (!experiment.target) {
      errors.push('Hedef bilgisi zorunludur.');
    }

    if (!distance || distance.value < 0) {
      errors.push('Metre biriminde geçerli surfaceDistanceM ölçümü zorunludur.');
    }

    return errors;
  }

  async predict(
    experiment: ExperimentDefinition,
    context: SimulationContext
  ): Promise<ModelPrediction> {
    const validationErrors = this.validateExperiment(experiment);

    if (validationErrors.length > 0 || !experiment.target) {
      return {
        modelId: this.metadata.id,
        experimentId: experiment.id,
        status: 'unsupported',
        metrics: [],
        warnings: validationErrors,
        traceId: `${this.metadata.id}:${experiment.id}:unsupported`,
        trace: {
          summary: 'Gerekli deney girdileri bulunamadı.',
          assumptions: this.metadata.assumptions,
          steps: []
        }
      };
    }

    const distanceMeasurement = getMeasurement(
      experiment,
      'surfaceDistanceM',
      'm'
    );

    if (!distanceMeasurement) {
      throw new Error('Yüzey mesafesi bulunamadı.');
    }

    const warnings: string[] = [];

    if (context.atmosphereMode !== 'off') {
      warnings.push(
        'Bu düzlem tanımı atmosferik kırılma kuralı içermediği için kırılma uygulanmadı.'
      );
    }

    const observerHeightM =
      experiment.observer.elevationM + experiment.observer.eyeHeightM;
    const targetTopHeightM =
      experiment.target.elevationM + experiment.target.heightM;
    const visibleFraction = experiment.target.heightM > 0 ? 1 : 0;
    const targetTopElevationDeg = planarElevationAngleDeg(
      distanceMeasurement.value,
      observerHeightM,
      targetTopHeightM
    );
    const observation = getMeasurement(experiment, 'visibleFraction', 'fraction');
    const evaluation = evaluateFractionPrediction(visibleFraction, observation);

    const trace: CalculationTrace = {
      summary:
        'Engelsiz sonsuz düzlem ve doğrusal ışık varsayımında hedefin tamamı görünür kabul edildi; yalnızca hedef tepe açısı ve gözlem farkı hesaplandı.',
      assumptions: this.metadata.assumptions,
      steps: [
        {
          id: 'horizon',
          title: 'Geometrik ufuk',
          formula: 'sₕ = ∞',
          substitution: 'Düzlem üzerinde yüzey eğriliği veya engel tanımlı değil.',
          result: '∞',
          note: 'Bu sonuç yalnızca tanımlanan engelsiz düzlem sözleşmesine aittir.'
        },
        {
          id: 'visible-fraction',
          title: 'Görünür hedef oranı',
          formula: 'f = 1',
          substitution: `H=${format(experiment.target.heightM)} m; gizleyen yüzey veya engel yok`,
          result: '%100'
        },
        {
          id: 'target-angle',
          title: 'Hedef tepe açısı',
          formula: 'α = atan2(hₜ - hₒ, d)',
          substitution: `atan2(${format(targetTopHeightM)} - ${format(observerHeightM)}, ${format(distanceMeasurement.value)})`,
          result: `${format(targetTopElevationDeg, 4)}°`
        },
        {
          id: 'observation-comparison',
          title: 'Gözlem karşılaştırması',
          formula: 'Δ = |fₜₐₕₘᵢₙ - f_gözlem|',
          substitution:
            observation
              ? `|100 - ${format(observation.value * 100, 2)}|`
              : 'Gözlem değeri girilmedi.',
          result:
            evaluation.difference === null
              ? 'Karşılaştırma yok'
              : `${format(evaluation.difference * 100, 2)} yüzde puan`,
          note: observation
            ? `Gözlem belirsizliği ±%${format(observation.uncertainty * 100, 2)}.`
            : undefined
        }
      ]
    };

    return {
      modelId: this.metadata.id,
      experimentId: experiment.id,
      status: evaluation.status,
      metrics: [
        metric(
          'visibleHeightM',
          'Görünür hedef yüksekliği',
          experiment.target.heightM,
          'm'
        ),
        metric('hiddenHeightM', 'Gizlenen hedef yüksekliği', 0, 'm'),
        metric('visibleFraction', 'Görünür oran', visibleFraction, 'fraction'),
        metric('hiddenFraction', 'Gizlenen oran', 0, 'fraction'),
        metric(
          'horizonSurfaceDistanceM',
          'Yüzey üzerindeki ufuk mesafesi',
          null,
          'm'
        ),
        metric(
          'targetTopElevationDeg',
          'Hedef tepe görüş açısı',
          targetTopElevationDeg,
          'deg'
        ),
        metric('curvatureDropM', 'Teğete göre yüzey düşümü', 0, 'm'),
        metric(
          'observationDifferencePp',
          'Gözlem farkı',
          evaluation.difference === null ? null : evaluation.difference * 100,
          'percentage-point'
        )
      ],
      warnings,
      traceId: `${this.metadata.id}:${experiment.id}:${context.atmosphereMode}`,
      trace
    };
  }
}
