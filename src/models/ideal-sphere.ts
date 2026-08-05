import type {
  CalculationTrace,
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

function format(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '∞';
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

export class IdealSphereModel implements SimulationModel {
  readonly metadata: ModelMetadata = {
    id: 'ideal-sphere',
    name: 'İdeal Küre',
    version: '0.2.0',
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
        traceId: `${this.metadata.id}:${experiment.id}:unsupported`,
        trace: {
          summary: 'Gerekli deney girdileri veya desteklenen atmosfer modu bulunamadı.',
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
    const baseRadiusM = MEAN_EARTH_RADIUS_M;
    let radiusM = baseRadiusM;
    const coefficient = context.refractionCoefficient ?? 0.13;

    if (context.atmosphereMode === 'standard') {
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
    const horizonSurfaceDistanceM = surfaceHorizonDistanceM(observerHeightM, radiusM);
    const targetTopElevationDeg = sphericalElevationAngleDeg(
      surfaceDistanceM,
      observerHeightM,
      targetTopHeightM,
      radiusM
    );
    const curvatureDropM = surfaceDropFromTangentM(surfaceDistanceM, radiusM);
    const observation = getMeasurement(experiment, 'visibleFraction', 'fraction');
    const evaluation = evaluateFractionPrediction(visibleFraction, observation);

    const trace: CalculationTrace = {
      summary:
        'Küresel yüzeyde gözlemci ufku, hedefin görünmesi gereken en düşük noktası ve hedefin kalan görünür bölümü hesaplandı.',
      assumptions: this.metadata.assumptions,
      steps: [
        {
          id: 'effective-radius',
          title: 'Kullanılan yarıçap',
          formula:
            context.atmosphereMode === 'standard'
              ? 'Rₑ = R / (1 - k)'
              : 'Rₑ = R',
          substitution:
            context.atmosphereMode === 'standard'
              ? `${format(baseRadiusM)} / (1 - ${format(coefficient)})`
              : `${format(baseRadiusM)}`,
          result: `${format(radiusM)} m`,
          note:
            context.atmosphereMode === 'standard'
              ? 'Etkin yarıçap yaklaşımı standart kırılmayı yaklaşık temsil eder.'
              : 'Atmosferik kırılma uygulanmadı.'
        },
        {
          id: 'horizon-distance',
          title: 'Gözlemci ufuk mesafesi',
          formula: 'sₕ = Rₑ · acos(Rₑ / (Rₑ + hₒ))',
          substitution: `${format(radiusM)} · acos(${format(radiusM)} / (${format(radiusM)} + ${format(observerHeightM)}))`,
          result: `${format(horizonSurfaceDistanceM)} m`
        },
        {
          id: 'minimum-visible-height',
          title: 'Hedefte görünmesi gereken en düşük nokta',
          formula: 'hₘᵢₙ = Rₑ / cos(s/Rₑ - acos(Rₑ/(Rₑ+hₒ))) - Rₑ',
          substitution: `s=${format(surfaceDistanceM)} m, hₒ=${format(observerHeightM)} m, Rₑ=${format(radiusM)} m`,
          result: `${format(minimumVisibleHeightM)} m`
        },
        {
          id: 'visible-fraction',
          title: 'Görünür hedef oranı',
          formula: 'f = (H - clamp(hₘᵢₙ - hᵦ, 0, H)) / H',
          substitution: `(${format(experiment.target.heightM)} - ${format(hiddenHeightM)}) / ${format(experiment.target.heightM)}`,
          result: `%${format(visibleFraction * 100, 2)}`
        },
        {
          id: 'target-angle',
          title: 'Hedef tepe açısı',
          formula: 'α = atan2(y, x)',
          substitution: `s=${format(surfaceDistanceM)} m, hₒ=${format(observerHeightM)} m, hₜ=${format(targetTopHeightM)} m`,
          result: `${format(targetTopElevationDeg, 4)}°`
        },
        {
          id: 'observation-comparison',
          title: 'Gözlem karşılaştırması',
          formula: 'Δ = |fₜₐₕₘᵢₙ - f_gözlem|',
          substitution:
            observation
              ? `|${format(visibleFraction * 100, 2)} - ${format(observation.value * 100, 2)}|`
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
        metric('visibleHeightM', 'Görünür hedef yüksekliği', visibleHeightM, 'm'),
        metric('hiddenHeightM', 'Gizlenen hedef yüksekliği', hiddenHeightM, 'm'),
        metric('visibleFraction', 'Görünür oran', visibleFraction, 'fraction'),
        metric('hiddenFraction', 'Gizlenen oran', hiddenFraction, 'fraction'),
        metric(
          'horizonSurfaceDistanceM',
          'Yüzey üzerindeki ufuk mesafesi',
          horizonSurfaceDistanceM,
          'm'
        ),
        metric(
          'targetTopElevationDeg',
          'Hedef tepe görüş açısı',
          targetTopElevationDeg,
          'deg'
        ),
        metric(
          'curvatureDropM',
          'Teğete göre yüzey düşümü',
          curvatureDropM,
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
      traceId: `${this.metadata.id}:${experiment.id}:${context.atmosphereMode}`,
      trace
    };
  }
}
