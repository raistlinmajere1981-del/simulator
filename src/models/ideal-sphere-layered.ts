import type {
  CalculationTrace,
  ExperimentDefinition,
  ModelCapability,
  ModelMetadata,
  ModelPrediction,
  PredictionMetric
} from '../shared/domain';
import {
  MEAN_EARTH_RADIUS_M,
  surfaceDropFromTangentM
} from '../simulation/geometry';
import {
  evaluateFractionPrediction,
  getMeasurement
} from '../simulation/evaluation';
import {
  analyzeLayeredSphereHorizon,
  analyzeLayeredSphereVisibility
} from '../simulation/layered-sphere-visibility';
import type {
  SimulationContext,
  SimulationModel
} from '../simulation/model-contract';
import { IdealSphereModel } from './ideal-sphere';

function metric(
  key: string,
  label: string,
  value: number | null,
  unit: string
): PredictionMetric {
  return { key, label, value, unit };
}

function format(value: number | null, digits = 3): string {
  if (value === null) return '—';
  if (!Number.isFinite(value)) return '∞';
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function unsupported(
  metadata: ModelMetadata,
  experiment: ExperimentDefinition,
  warnings: string[]
): ModelPrediction {
  return {
    modelId: metadata.id,
    experimentId: experiment.id,
    status: 'unsupported',
    metrics: [],
    warnings,
    traceId: `${metadata.id}:${experiment.id}:profile:unsupported`,
    trace: {
      summary: 'Katmanlı atmosfer hesabı gerekli deney veya profil girdileriyle başlatılamadı.',
      assumptions: metadata.assumptions,
      steps: []
    }
  };
}

function indeterminate(
  metadata: ModelMetadata,
  experiment: ExperimentDefinition,
  warning: string
): ModelPrediction {
  return {
    modelId: metadata.id,
    experimentId: experiment.id,
    status: 'indeterminate',
    metrics: [],
    warnings: [warning],
    traceId: `${metadata.id}:${experiment.id}:profile:indeterminate`,
    trace: {
      summary: 'Katmanlı atmosfer seçildi ancak ölçülmüş profil kapsamı güvenilir bir fiziksel sonuç üretmeye yetmedi.',
      assumptions: metadata.assumptions,
      steps: [{
        id: 'profile-coverage',
        title: 'Atmosfer profili kapsam kontrolü',
        formula: 'ışın yolu ⊂ ölçülmüş profil yüksekliği',
        substitution: warning,
        result: 'Sonuç belirlenemedi'
      }]
    }
  };
}

export class IdealSphereLayeredModel implements SimulationModel {
  private readonly base = new IdealSphereModel();

  readonly metadata: ModelMetadata = {
    ...this.base.metadata,
    version: '0.5.0',
    description:
      'Ortalama yarıçaplı küresel yüzey üzerinde görüş hattı, ufuk, arazi ve seçildiğinde katmanlı optik atmosfer hesabı.',
    assumptions: [
      'Temel yüzey ideal küredir.',
      'Kotlar ortak bir düşey datumdan yerel radyal yükseklik olarak uygulanır.',
      'Arazi profili verilirse örnekler aynı optik ışın yolu üzerinde değerlendirilir.',
      'Standart kırılma etkin yarıçap yaklaşımıyla; katmanlı atmosfer ise Ciddor kırılma indisi ve RK4 ışın iziyle ayrı çözülür.',
      'Katmanlı atmosfer yatay yönde homojen ve yalnız yükseklikle değişen ölçülmüş profil olarak kabul edilir.',
      'Atmosfer profili dışında meteorolojik ekstrapolasyon yapılmaz.'
    ]
  };

  supports(capability: ModelCapability): boolean {
    return this.base.supports(capability);
  }

  validateExperiment(experiment: ExperimentDefinition): string[] {
    return this.base.validateExperiment(experiment);
  }

  async predict(
    experiment: ExperimentDefinition,
    context: SimulationContext
  ): Promise<ModelPrediction> {
    if (context.atmosphereMode !== 'profile') {
      return this.base.predict(experiment, context);
    }

    const validationErrors = this.validateExperiment(experiment);
    if (!context.atmosphereProfile) validationErrors.push('Katmanlı atmosfer profili bulunamadı.');
    if (!context.opticalAtmosphereSettings) validationErrors.push('Optik atmosfer ayarları bulunamadı.');
    if (!Number.isFinite(context.rayTraceStepM) || (context.rayTraceStepM ?? 0) <= 0) {
      validationErrors.push('Geçerli ışın izleme adımı bulunamadı.');
    }
    if (validationErrors.length > 0 || !context.atmosphereProfile ||
        !context.opticalAtmosphereSettings || !context.rayTraceStepM) {
      return unsupported(this.metadata, experiment, validationErrors);
    }

    const observerAltitudeM = experiment.observer.elevationM + experiment.observer.eyeHeightM;
    const profile = context.atmosphereProfile;
    const settings = context.opticalAtmosphereSettings;
    const rayTraceStepM = context.rayTraceStepM;

    try {
      if (experiment.type === 'horizon') {
        const horizon = analyzeLayeredSphereHorizon({
          profile,
          settings,
          observerAltitudeM,
          stepM: rayTraceStepM,
          earthRadiusM: MEAN_EARTH_RADIUS_M
        });
        const status = horizon.horizonSurfaceDistanceM === null ? 'indeterminate' : 'compatible';
        const trace: CalculationTrace = {
          summary:
            'Gözlemciden farklı başlangıç yükselim açılarıyla katmanlı optik ışınlar izlenerek yüzeye dönen ve ölçülmüş atmosfer içinde kalan sınır ışını arandı.',
          assumptions: this.metadata.assumptions,
          steps: [
            {
              id: 'profile-source',
              title: 'Katmanlı atmosfer ve optik ayarlar',
              formula: 'n(h) = Ciddor(T(h), p(h), RH(h), λ, CO₂)',
              substitution: `${profile.sourceLabel}; ${settings.wavelengthNm} nm; CO₂ ${settings.carbonDioxidePpm} ppm`,
              result: `${profile.samples.length} meteorolojik örnek`
            },
            {
              id: 'ray-integration',
              title: 'Küresel katmanlı ışın izi',
              formula: 'd(n t̂)/ds = ∇n',
              substitution: `RK4 adımı ${format(rayTraceStepM)} m; R=${format(MEAN_EARTH_RADIUS_M)} m`,
              result: horizon.grazingInitialElevationDeg === null
                ? 'Sınır ışını belirlenemedi'
                : `Sınır başlangıç açısı ${format(horizon.grazingInitialElevationDeg, 6)}°`
            },
            {
              id: 'optical-horizon',
              title: 'Optik ufuk yüzey mesafesi',
              formula: 'sₕ = max{s_yüzey-kesişim}',
              substitution: 'Yüzeye dönen ışınlar ile profil-kapsam sınırı arasındaki geçiş tarandı.',
              result: horizon.horizonSurfaceDistanceM === null
                ? 'Ölçülmüş profil içinde belirlenemedi'
                : `${format(horizon.horizonSurfaceDistanceM)} m`
            }
          ]
        };
        return {
          modelId: this.metadata.id,
          experimentId: experiment.id,
          status,
          metrics: [
            metric('horizonSurfaceDistanceM', 'Katmanlı optik ufuk mesafesi', horizon.horizonSurfaceDistanceM, 'm'),
            metric('observerTotalElevationM', 'Gözlemci toplam kotu', observerAltitudeM, 'm'),
            metric('effectiveRadiusM', 'Tekil etkin yarıçap', null, 'm'),
            metric('profileGrazingElevationDeg', 'Sınır ışın başlangıç açısı', horizon.grazingInitialElevationDeg, 'deg'),
            metric('rayTraceStepM', 'Işın izleme adımı', rayTraceStepM, 'm')
          ],
          warnings: horizon.warnings,
          traceId: `${this.metadata.id}:${experiment.id}:profile:horizon`,
          trace
        };
      }

      if (!experiment.target) {
        return unsupported(this.metadata, experiment, ['Hedef bilgisi zorunludur.']);
      }
      const distance = getMeasurement(experiment, 'surfaceDistanceM', 'm');
      if (!distance || distance.value <= 0) {
        return unsupported(this.metadata, experiment, [
          'Katmanlı optik görünürlük için sıfırdan büyük surfaceDistanceM zorunludur.'
        ]);
      }

      const targetBaseAltitudeM = experiment.target.elevationM;
      const targetTopAltitudeM = targetBaseAltitudeM + experiment.target.heightM;
      const visibility = analyzeLayeredSphereVisibility({
        profile,
        settings,
        observerAltitudeM,
        targetSurfaceDistanceM: distance.value,
        targetBaseAltitudeM,
        targetHeightM: experiment.target.heightM,
        terrainProfile: experiment.terrainProfile,
        stepM: rayTraceStepM,
        earthRadiusM: MEAN_EARTH_RADIUS_M
      });

      let horizonSurfaceDistanceM: number | null = null;
      const warnings = new Set<string>(visibility.warnings);
      try {
        const horizon = analyzeLayeredSphereHorizon({
          profile,
          settings,
          observerAltitudeM,
          stepM: rayTraceStepM,
          earthRadiusM: MEAN_EARTH_RADIUS_M
        });
        horizonSurfaceDistanceM = horizon.horizonSurfaceDistanceM;
        horizon.warnings.forEach((warning) => warnings.add(warning));
      } catch (error) {
        warnings.add(
          error instanceof Error
            ? `Optik ufuk ayrıca hesaplanamadı: ${error.message}`
            : 'Optik ufuk ayrıca hesaplanamadı.'
        );
      }

      const observation = getMeasurement(experiment, 'visibleFraction', 'fraction');
      const evaluation = evaluateFractionPrediction(visibility.visibleFraction, observation);
      const curvatureDropM = surfaceDropFromTangentM(distance.value, MEAN_EARTH_RADIUS_M);

      const trace: CalculationTrace = {
        summary:
          'Katmanlı atmosferde farklı başlangıç açılarıyla küresel ışın yolları tarandı; yüzey ve varsa arazi profilini temizleyen en düşük ışın hedef mesafesindeki görünürlük sınırını belirledi.',
        assumptions: this.metadata.assumptions,
        steps: [
          {
            id: 'profile-source',
            title: 'Meteorolojik profil ve optik indis',
            formula: 'n(h) = Ciddor(T(h), p(h), RH(h), λ, CO₂)',
            substitution: `${profile.sourceLabel}; ${settings.wavelengthNm} nm; CO₂ ${settings.carbonDioxidePpm} ppm`,
            result: `${profile.samples.length} örnek · RK4 adımı ${format(rayTraceStepM)} m`
          },
          {
            id: 'grazing-ray',
            title: 'En düşük açık optik ışın',
            formula: 'h_min(s) = min_α { h_ışın(s, α) | açıklık(α) > 0 }',
            substitution: `s=${format(distance.value)} m; başlangıç açısı ${format(visibility.grazingInitialElevationDeg, 6)}°`,
            result: `h_min=${format(visibility.minimumVisibleAltitudeM)} m`,
            note: visibility.grazingTerrainMinimumClearanceM === null
              ? 'Arazi profili kapalı veya ara örnek yok.'
              : `Kritik arazi açıklığı ${format(visibility.grazingTerrainMinimumClearanceM)} m @ ${format(visibility.grazingTerrainCriticalDistanceM)} m.`
          },
          {
            id: 'visible-fraction',
            title: 'Görünür hedef oranı',
            formula: 'f = (H - clamp(h_min - h_taban, 0, H)) / H',
            substitution: `H=${format(experiment.target.heightM)} m; h_taban=${format(targetBaseAltitudeM)} m; h_min=${format(visibility.minimumVisibleAltitudeM)} m`,
            result: `%${format(visibility.visibleFraction * 100, 2)}`
          },
          {
            id: 'target-top-ray',
            title: 'Hedef tepesine optik atış çözümü',
            formula: 'h_ışın(s, α_tepe) = h_tepe',
            substitution: `h_tepe=${format(targetTopAltitudeM)} m`,
            result: visibility.targetTopElevationDeg === null
              ? 'Açık bir hedef-tepe ışını eşleştirilemedi'
              : `α_tepe=${format(visibility.targetTopElevationDeg, 6)}°`,
            note: visibility.targetTopTerrainMinimumClearanceM === null
              ? undefined
              : `Hedef-tepe ışınının minimum arazi açıklığı ${format(visibility.targetTopTerrainMinimumClearanceM)} m.`
          },
          {
            id: 'observation-comparison',
            title: 'Gözlem karşılaştırması',
            formula: 'Δ = |f_tahmin - f_gözlem|',
            substitution: observation
              ? `|${format(visibility.visibleFraction * 100, 2)} - ${format(observation.value * 100, 2)}|`
              : 'Gözlem değeri girilmedi.',
            result: evaluation.difference === null
              ? 'Karşılaştırma yok'
              : `${format(evaluation.difference * 100, 2)} yüzde puan`
          }
        ]
      };

      return {
        modelId: this.metadata.id,
        experimentId: experiment.id,
        status: evaluation.status,
        metrics: [
          metric('visibleHeightM', 'Görünür hedef yüksekliği', visibility.visibleHeightM, 'm'),
          metric('hiddenHeightM', 'Gizlenen hedef yüksekliği', visibility.hiddenHeightM, 'm'),
          metric('visibleFraction', 'Görünür oran', visibility.visibleFraction, 'fraction'),
          metric('hiddenFraction', 'Gizlenen oran', visibility.hiddenFraction, 'fraction'),
          metric('horizonSurfaceDistanceM', 'Katmanlı optik ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
          metric('targetTopElevationDeg', 'Hedef tepe optik görüş açısı', visibility.targetTopElevationDeg, 'deg'),
          metric('curvatureDropM', 'Geometrik yüzey düşümü', curvatureDropM, 'm'),
          metric('terrainMinimumClearanceM', 'Hedef-tepe ışını arazi minimum açıklığı', visibility.targetTopTerrainMinimumClearanceM, 'm'),
          metric('terrainCriticalDistanceM', 'Kritik arazi mesafesi', visibility.targetTopTerrainCriticalDistanceM, 'm'),
          metric(
            'terrainRequiredTargetElevationM',
            'Optik/terrain görünürlük sınır kotu',
            experiment.terrainProfile ? visibility.minimumVisibleAltitudeM : null,
            'm'
          ),
          metric('profileMinimumVisibleAltitudeM', 'Katmanlı optik minimum görünür kot', visibility.minimumVisibleAltitudeM, 'm'),
          metric('profileGrazingElevationDeg', 'Sınır ışın başlangıç açısı', visibility.grazingInitialElevationDeg, 'deg'),
          metric('rayTraceStepM', 'Işın izleme adımı', visibility.rayTraceStepM, 'm'),
          metric(
            'observationDifferencePp',
            'Gözlem farkı',
            evaluation.difference === null ? null : evaluation.difference * 100,
            'percentage-point'
          )
        ],
        warnings: [...warnings],
        traceId: `${this.metadata.id}:${experiment.id}:profile:${experiment.terrainProfile?.id ?? 'no-terrain'}`,
        trace
      };
    } catch (error) {
      return indeterminate(
        this.metadata,
        experiment,
        error instanceof Error ? error.message : 'Katmanlı atmosfer hesabı tamamlanamadı.'
      );
    }
  }
}
