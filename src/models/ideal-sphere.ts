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
import {
  analyzeSphericalTerrainClearance,
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
  if (!Number.isFinite(value)) return '∞';
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

export class IdealSphereModel implements SimulationModel {
  readonly metadata: ModelMetadata = {
    id: 'ideal-sphere',
    name: 'İdeal Küre',
    version: '0.5.0',
    description:
      'Ortalama yarıçaplı küresel yüzey üzerinde görüş hattı, ufuk ve isteğe bağlı arazi profili hesabı.',
    capabilities: [
      'surface-distance',
      'line-of-sight',
      'horizon',
      'atmospheric-refraction',
      'terrain-profile'
    ],
    assumptions: [
      'Temel yüzey ideal küredir.',
      'Kotlar ortak bir düşey datumdan yerel radyal yükseklik olarak uygulanır.',
      'Arazi profili verilirse örnekler görüş hattı boyunca değerlendirilir.',
      'Standart kırılma etkin yarıçap yaklaşımıyla temsil edilir.'
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
    if (context.atmosphereMode === 'profile') {
      validationErrors.push('Atmosfer profiliyle ışın izleme henüz uygulanmadı.');
    }

    if (validationErrors.length > 0) {
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

    const observerHeightM = experiment.observer.elevationM + experiment.observer.eyeHeightM;

    if (experiment.type === 'horizon') {
      const horizonSurfaceDistanceM = surfaceHorizonDistanceM(observerHeightM, radiusM);
      return {
        modelId: this.metadata.id,
        experimentId: experiment.id,
        status: 'compatible',
        metrics: [
          metric('horizonSurfaceDistanceM', 'Geometrik ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
          metric('observerTotalElevationM', 'Gözlemci toplam kotu', observerHeightM, 'm'),
          metric('effectiveRadiusM', 'Kullanılan etkin yarıçap', radiusM, 'm')
        ],
        warnings,
        traceId: `${this.metadata.id}:${experiment.id}:horizon`,
        trace: {
          summary: 'Küresel yüzeyde gözlemcinin toplam kotundan geometrik ufuk yüzey mesafesi hesaplandı.',
          assumptions: this.metadata.assumptions,
          steps: [
            {
              id: 'effective-radius',
              title: 'Kullanılan yarıçap',
              formula: context.atmosphereMode === 'standard' ? 'Rₑ = R / (1 - k)' : 'Rₑ = R',
              substitution: context.atmosphereMode === 'standard'
                ? `${format(baseRadiusM)} / (1 - ${format(coefficient)})`
                : `${format(baseRadiusM)}`,
              result: `${format(radiusM)} m`
            },
            {
              id: 'horizon-distance',
              title: 'Geometrik ufuk mesafesi',
              formula: 'sₕ = Rₑ · acos(Rₑ / (Rₑ + hₒ))',
              substitution: `hₒ=${format(observerHeightM)} m, Rₑ=${format(radiusM)} m`,
              result: `${format(horizonSurfaceDistanceM)} m`
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
    const surfaceDistanceM = distanceMeasurement.value;

    const geometricMinimumVisibleHeightM = minimumVisiblePointHeightM(
      surfaceDistanceM,
      observerHeightM,
      radiusM
    );

    let terrainMinimumClearanceM: number | null = null;
    let terrainCriticalDistanceM: number | null = null;
    let terrainRequiredTargetElevationM: number | null = null;

    if (experiment.terrainProfile) {
      const terrainClearance = analyzeSphericalTerrainClearance(
        experiment.terrainProfile,
        {
          observerEyeElevationM: observerHeightM,
          targetTopElevationM: targetTopHeightM,
          surfaceDistanceM,
          radiusM
        }
      );
      terrainMinimumClearanceM = terrainClearance.minimumClearanceM;
      terrainCriticalDistanceM = terrainClearance.criticalSample?.distanceM ?? null;
      terrainRequiredTargetElevationM = minimumClearTargetElevationM(
        experiment.terrainProfile,
        {
          observerEyeElevationM: observerHeightM,
          targetBaseElevationM: targetBaseHeightM,
          surfaceDistanceM,
          geometry: { kind: 'spherical', radiusM }
        }
      );
      warnings.push(
        terrainClearance.blocked
          ? `Arazi profili mevcut hedef tepesinin görüş hattını ${format(Math.abs(terrainMinimumClearanceM ?? 0), 2)} m kesiyor.`
          : 'Arazi profili görüş hattı boyunca uygulandı; hedef tepesi araziyi temizliyor.'
      );
    }

    const minimumVisibleHeightM = Math.max(
      geometricMinimumVisibleHeightM,
      terrainRequiredTargetElevationM ?? Number.NEGATIVE_INFINITY
    );
    const hiddenHeightM = clamp(
      minimumVisibleHeightM - targetBaseHeightM,
      0,
      experiment.target.heightM
    );
    const visibleHeightM = experiment.target.heightM - hiddenHeightM;
    const visibleFraction = experiment.target.heightM === 0
      ? 0
      : visibleHeightM / experiment.target.heightM;
    const hiddenFraction = 1 - visibleFraction;
    const horizonSurfaceDistanceM = surfaceHorizonDistanceM(observerHeightM, radiusM);
    const targetBaseElevationDeg = sphericalElevationAngleDeg(
      surfaceDistanceM,
      observerHeightM,
      targetBaseHeightM,
      radiusM
    );
    const targetTopElevationDeg = sphericalElevationAngleDeg(
      surfaceDistanceM,
      observerHeightM,
      targetTopHeightM,
      radiusM
    );
    const targetAngularHeightDeg = targetTopElevationDeg - targetBaseElevationDeg;
    const curvatureDropM = surfaceDropFromTangentM(surfaceDistanceM, radiusM);
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
        title: 'Arazi profili ve gerekli hedef kotu',
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
        'Küresel yüzeyde gözlemci ufku, hedefte görünmesi gereken en düşük kot ve varsa arazi engellerinden sonra kalan görünür bölüm hesaplandı.',
      assumptions: this.metadata.assumptions,
      steps: [
        {
          id: 'effective-radius',
          title: 'Kullanılan yarıçap',
          formula: context.atmosphereMode === 'standard' ? 'Rₑ = R / (1 - k)' : 'Rₑ = R',
          substitution: context.atmosphereMode === 'standard'
            ? `${format(baseRadiusM)} / (1 - ${format(coefficient)})`
            : `${format(baseRadiusM)}`,
          result: `${format(radiusM)} m`,
          note: context.atmosphereMode === 'standard'
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
          title: 'Eğrilikten kaynaklanan en düşük görünür kot',
          formula: 'hₘᵢₙ = Rₑ / cos(s/Rₑ - acos(Rₑ/(Rₑ+hₒ))) - Rₑ',
          substitution: `s=${format(surfaceDistanceM)} m, hₒ=${format(observerHeightM)} m, Rₑ=${format(radiusM)} m`,
          result: `${format(geometricMinimumVisibleHeightM)} m`
        },
        ...terrainSteps,
        {
          id: 'visible-fraction',
          title: 'Görünür hedef oranı',
          formula: 'f = (H - clamp(max(h_eğrilik, h_arazi) - hᵦ, 0, H)) / H',
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
        metric('horizonSurfaceDistanceM', 'Yüzey üzerindeki ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
        metric('targetBaseElevationDeg', 'Hedef taban görüş açısı', targetBaseElevationDeg, 'deg'),
        metric('targetTopElevationDeg', 'Hedef tepe görüş açısı', targetTopElevationDeg, 'deg'),
        metric('targetAngularHeightDeg', 'Tam hedef açısal yüksekliği', targetAngularHeightDeg, 'deg'),
        metric('curvatureDropM', 'Teğete göre yüzey düşümü', curvatureDropM, 'm'),
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
      traceId: `${this.metadata.id}:${experiment.id}:${context.atmosphereMode}:${experiment.terrainProfile?.id ?? 'no-terrain'}`,
      trace
    };
  }
}
