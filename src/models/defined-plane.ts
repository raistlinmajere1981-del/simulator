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
import { clamp, planarElevationAngleDeg } from '../simulation/geometry';
import {
  analyzePlanarTerrainClearance,
  minimumClearTargetElevationM,
  validateTerrainProfile
} from '../simulation/terrain';
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
    version: '0.5.0',
    description:
      'Düz yüzey ve doğrusal ışık varsayımıyla, isteğe bağlı arazi profili üzerinden görüş hesabı.',
    capabilities: ['surface-distance', 'line-of-sight', 'horizon', 'terrain-profile'],
    assumptions: [
      'Temel yüzey sonsuz düzlemdir.',
      'Işık doğrusal ilerler.',
      'Arazi profili yoksa yüzey engelsiz kabul edilir.',
      'Kotlar ortak bir düşey datumda doğrusal yüksekliklerdir.',
      'Geometrik ufuk sonlu değildir.'
    ]
  };

  supports(capability: ModelCapability): boolean {
    return this.metadata.capabilities.includes(capability);
  }

  validateExperiment(experiment: ExperimentDefinition): string[] {
    const errors: string[] = [];
    const distance = getMeasurement(experiment, 'surfaceDistanceM', 'm');

    if (experiment.type !== 'target-visibility' && experiment.type !== 'horizon') {
      errors.push('Bu sürüm hedef görünürlüğü ve ufuk deneylerini destekler.');
    }
    if (experiment.type === 'target-visibility') {
      if (!experiment.target) errors.push('Hedef bilgisi zorunludur.');
      if (!distance || distance.value < 0) {
        errors.push('Metre biriminde geçerli surfaceDistanceM ölçümü zorunludur.');
      }
      if (experiment.terrainProfile) {
        errors.push(...validateTerrainProfile(experiment.terrainProfile));
        if (distance && Math.abs(experiment.terrainProfile.totalDistanceM - distance.value) > 1e-6) {
          errors.push('Arazi profili ile deney yüzey mesafesi aynı olmalıdır.');
        }
      }
    }

    return errors;
  }

  async predict(
    experiment: ExperimentDefinition,
    context: SimulationContext
  ): Promise<ModelPrediction> {
    const validationErrors = this.validateExperiment(experiment);

    if (validationErrors.length > 0) {
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

    const warnings: string[] = [];
    if (context.atmosphereMode !== 'off') {
      warnings.push(
        'Bu düzlem tanımı atmosferik kırılma kuralı içermediği için kırılma uygulanmadı.'
      );
    }

    const observerHeightM = experiment.observer.elevationM + experiment.observer.eyeHeightM;

    if (experiment.type === 'horizon') {
      return {
        modelId: this.metadata.id,
        experimentId: experiment.id,
        status: 'compatible',
        metrics: [
          metric('horizonSurfaceDistanceM', 'Geometrik ufuk mesafesi', null, 'm'),
          metric('observerTotalElevationM', 'Gözlemci toplam kotu', observerHeightM, 'm')
        ],
        warnings,
        traceId: `${this.metadata.id}:${experiment.id}:horizon`,
        trace: {
          summary: 'Tanımlı sonsuz düzlemde yüzey eğriliğinden kaynaklanan sonlu geometrik ufuk yoktur.',
          assumptions: this.metadata.assumptions,
          steps: [
            {
              id: 'horizon',
              title: 'Geometrik ufuk',
              formula: 'sₕ = ∞',
              substitution: 'Yüzey sonsuz düzlem ve ışık doğrusal tanımlıdır.',
              result: '∞',
              note: 'Yerel arazi veya fiziksel engeller bu geometrik tanımdan ayrı değerlendirilir.'
            }
          ]
        }
      };
    }

    if (!experiment.target) throw new Error('Hedef bilgisi bulunamadı.');
    const distanceMeasurement = getMeasurement(experiment, 'surfaceDistanceM', 'm');
    if (!distanceMeasurement) throw new Error('Yüzey mesafesi bulunamadı.');
    const targetBaseHeightM = experiment.target.elevationM;
    const targetTopHeightM = targetBaseHeightM + experiment.target.heightM;

    let terrainMinimumClearanceM: number | null = null;
    let terrainCriticalDistanceM: number | null = null;
    let terrainRequiredTargetElevationM: number | null = null;

    if (experiment.terrainProfile) {
      const terrainClearance = analyzePlanarTerrainClearance(
        experiment.terrainProfile,
        {
          observerEyeElevationM: observerHeightM,
          targetTopElevationM: targetTopHeightM,
          surfaceDistanceM: distanceMeasurement.value
        }
      );
      terrainMinimumClearanceM = terrainClearance.minimumClearanceM;
      terrainCriticalDistanceM = terrainClearance.criticalSample?.distanceM ?? null;
      terrainRequiredTargetElevationM = minimumClearTargetElevationM(
        experiment.terrainProfile,
        {
          observerEyeElevationM: observerHeightM,
          targetBaseElevationM: targetBaseHeightM,
          surfaceDistanceM: distanceMeasurement.value,
          geometry: { kind: 'planar' }
        }
      );
      warnings.push(
        terrainClearance.blocked
          ? `Arazi profili mevcut hedef tepesinin görüş hattını ${format(Math.abs(terrainMinimumClearanceM ?? 0), 2)} m kesiyor.`
          : 'Arazi profili doğrusal görüş hattına uygulandı; hedef tepesi araziyi temizliyor.'
      );
    }

    const requiredTargetElevationM = terrainRequiredTargetElevationM ?? targetBaseHeightM;
    const hiddenHeightM = clamp(
      requiredTargetElevationM - targetBaseHeightM,
      0,
      experiment.target.heightM
    );
    const visibleHeightM = experiment.target.heightM - hiddenHeightM;
    const visibleFraction = experiment.target.heightM > 0
      ? visibleHeightM / experiment.target.heightM
      : 0;
    const hiddenFraction = 1 - visibleFraction;
    const targetBaseElevationDeg = planarElevationAngleDeg(
      distanceMeasurement.value,
      observerHeightM,
      targetBaseHeightM
    );
    const targetTopElevationDeg = planarElevationAngleDeg(
      distanceMeasurement.value,
      observerHeightM,
      targetTopHeightM
    );
    const targetAngularHeightDeg = targetTopElevationDeg - targetBaseElevationDeg;
    const observation = getMeasurement(experiment, 'visibleFraction', 'fraction');
    const evaluation = evaluateFractionPrediction(visibleFraction, observation);

    const terrainSteps = experiment.terrainProfile ? [
      {
        id: 'vertical-reference',
        title: 'Düşey referans ve uç kotları',
        formula: 'h_göz = z_gözlemci + H_göz; h_hedef = z_hedef + H_hedef',
        substitution: `h_göz=${format(observerHeightM)} m, z_hedef=${format(targetBaseHeightM)} m, h_tepe=${format(targetTopHeightM)} m`,
        result: `${experiment.terrainProfile.datum.label}; ofset ${format(experiment.terrainProfile.datum.offsetM)} m`
      },
      {
        id: 'terrain-clearance',
        title: 'Doğrusal görüş hattı ve arazi',
        formula: 'h_gerekli = min{h | min(açıklık(h)) > 0}',
        substitution: `${experiment.terrainProfile.samples.length} örnek; kritik mesafe ${terrainCriticalDistanceM === null ? '—' : `${format(terrainCriticalDistanceM)} m`}`,
        result: terrainRequiredTargetElevationM === null
          ? 'Ara örnek yok'
          : `${format(terrainRequiredTargetElevationM)} m`,
        note: terrainMinimumClearanceM === null
          ? undefined
          : `Mevcut hedef tepesi için minimum açıklık ${format(terrainMinimumClearanceM)} m.`
      }
    ] : [];

    const trace: CalculationTrace = {
      summary:
        'Düz yüzey ve doğrusal ışık varsayımında hedef görünürlüğü, ortak düşey kotlar ve varsa arazi profilinin görüş hattı kesişimiyle hesaplandı.',
      assumptions: this.metadata.assumptions,
      steps: [
        {
          id: 'horizon',
          title: 'Geometrik ufuk',
          formula: 'sₕ = ∞',
          substitution: 'Düzlem üzerinde yüzey eğriliği tanımlı değil.',
          result: '∞',
          note: 'Arazi profili yerel engel oluşturabilir; bu geometrik ufku sonlu yapmaz.'
        },
        ...terrainSteps,
        {
          id: 'visible-fraction',
          title: 'Görünür hedef oranı',
          formula: 'f = (H - clamp(h_gerekli - hᵦ, 0, H)) / H',
          substitution: `(${format(experiment.target.heightM)} - ${format(hiddenHeightM)}) / ${format(experiment.target.heightM)}`,
          result: `%${format(visibleFraction * 100, 2)}`
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
          substitution: observation
            ? `|${format(visibleFraction * 100, 2)} - ${format(observation.value * 100, 2)}|`
            : 'Gözlem değeri girilmedi.',
          result: evaluation.difference === null
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
        metric('horizonSurfaceDistanceM', 'Yüzey üzerindeki ufuk mesafesi', null, 'm'),
        metric('targetBaseElevationDeg', 'Hedef taban görüş açısı', targetBaseElevationDeg, 'deg'),
        metric('targetTopElevationDeg', 'Hedef tepe görüş açısı', targetTopElevationDeg, 'deg'),
        metric('targetAngularHeightDeg', 'Tam hedef açısal yüksekliği', targetAngularHeightDeg, 'deg'),
        metric('curvatureDropM', 'Teğete göre yüzey düşümü', 0, 'm'),
        metric('terrainMinimumClearanceM', 'Arazi minimum açıklığı', terrainMinimumClearanceM, 'm'),
        metric('terrainCriticalDistanceM', 'Kritik arazi mesafesi', terrainCriticalDistanceM, 'm'),
        metric('terrainRequiredTargetElevationM', 'Araziyi temizleyen hedef kotu', terrainRequiredTargetElevationM, 'm'),
        metric(
          'observationDifferencePp',
          'Gözlem farkı',
          evaluation.difference === null ? null : evaluation.difference * 100,
          'percentage-point'
        )
      ],
      warnings,
      traceId: `${this.metadata.id}:${experiment.id}:${experiment.terrainProfile?.id ?? 'no-terrain'}`,
      trace
    };
  }
}
