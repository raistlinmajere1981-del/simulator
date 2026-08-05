import type {
  ExperimentDefinition,
  ModelCapability,
  ModelMetadata,
  ModelPrediction,
  PredictionMetric
} from '../shared/domain';
import {
  clamp,
  effectiveRadiusM,
  MEAN_EARTH_RADIUS_M,
  minimumVisiblePointHeightM,
  sphericalElevationAngleDeg,
  surfaceDropFromTangentM,
  surfaceHorizonDistanceM
} from '../simulation/geometry';
import {
  evaluateFractionPrediction,
  getMeasurement
} from '../simulation/evaluation';
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

export class IdealSphereModel implements SimulationModel {
  readonly metadata: ModelMetadata = {
    id: 'ideal-sphere',
    name: 'İdeal Küre',
    version: '0.1.0',
    description:
      'Ortalama yarıçaplı küresel yüzey üzerinde görüş hattı ve ufuk hesabı.',
    capabilities: [
      'surface-distance',
      'line-of-sight',
      'horizon',
      'atmospheric-refraction'
    ],
    assumptions: [
      'Yüzey ideal küredir.',
      'Arazi ve dalga yüksekliği hesaba katılmaz.',
      'Standart kırılma etkin yarıçap yaklaşımıyla temsil edilir.'
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

    if (context.atmosphereMode === 'profile') {
      validationErrors.push(
        'Atmosfer profiliyle ışın izleme henüz uygulanmadı.'
      );
    }

    if (validationErrors.length > 0 || !experiment.target) {
      return {
        modelId: this.metadata.id,
        experimentId: experiment.id,
        status: 'unsupported',
        metrics: [],
        warnings: validationErrors,
        traceId: `${this.metadata.id}:${experiment.id}:unsupported`
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
    let radiusM = MEAN_EARTH_RADIUS_M;

    if (context.atmosphereMode === 'standard') {
      const coefficient = context.refractionCoefficient ?? 0.13;
      radiusM = effectiveRadiusM(radiusM, coefficient);
      warnings.push(
        `Standart kırılma etkin yarıçap yaklaşımıyla uygulandı (k=${coefficient.toFixed(3)}).`
      );
    }

    const observerHeightM =
      experiment.observer.elevationM + experiment.observer.eyeHeightM;
    const targetBaseHeightM = experiment.target.elevationM;
    const targetTopHeightM =
      experiment.target.elevationM + experiment.target.heightM;
    const surfaceDistanceM = distanceMeasurement.value;

    const minimumVisibleHeightM = minimumVisiblePointHeightM(
      surfaceDistanceM,
      observerHeightM,
      radiusM
    );
    const hiddenHeightM = clamp(
      minimumVisibleHeightM - targetBaseHeightM,
      0,
      experiment.target.heightM
    );
    const visibleHeightM = experiment.target.heightM - hiddenHeightM;
    const visibleFraction =
      experiment.target.heightM === 0
        ? 0
        : visibleHeightM / experiment.target.heightM;
    const hiddenFraction = 1 - visibleFraction;
    const evaluation = evaluateFractionPrediction(
      visibleFraction,
      getMeasurement(experiment, 'visibleFraction', 'fraction')
    );

    return {
      modelId: this.metadata.id,
      experimentId: experiment.id,
      status: evaluation.status,
      metrics: [
        metric('visibleHeightM', 'Görünür hedef yüksekliği', visibleHeightM, 'm'),
        metric('hiddenHeightM', 'Gizlenen hedef yüksekliği', hiddenHeightM, 'm'),
        metric('visibleFraction', 'Görünür oran', visibleFraction, 'fraction'),
        metric('hiddenFraction', 'Gizlenen oran', hiddenFraction, 'fraction'),
        metric(
          'horizonSurfaceDistanceM',
          'Yüzey üzerindeki ufuk mesafesi',
          surfaceHorizonDistanceM(observerHeightM, radiusM),
          'm'
        ),
        metric(
          'targetTopElevationDeg',
          'Hedef tepe görüş açısı',
          sphericalElevationAngleDeg(
            surfaceDistanceM,
            observerHeightM,
            targetTopHeightM,
            radiusM
          ),
          'deg'
        ),
        metric(
          'curvatureDropM',
          'Teğete göre yüzey düşümü',
          surfaceDropFromTangentM(surfaceDistanceM, radiusM),
          'm'
        ),
        metric(
          'observationDifferencePp',
          'Gözlem farkı',
          evaluation.difference === null ? null : evaluation.difference * 100,
          'percentage-point'
        )
      ],
      warnings,
      traceId: `${this.metadata.id}:${experiment.id}:${context.atmosphereMode}`
    };
  }
}
