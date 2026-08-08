import type {
  ExperimentDefinition,
  ModelPrediction
} from '../shared/domain';
import type { TerrainProfile } from '../shared/terrain';
import {
  combineUncertaintyContributions,
  hasDefinedModelInputUncertainty,
  type ModelInputUncertaintySettings
} from '../shared/uncertainty';
import type { SimulationContext, SimulationModel } from './model-contract';

export const MODEL_ANGULAR_UNCERTAINTY_VERSION = '0.1.0';

export type AngularMetricKey =
  | 'targetBaseElevationDeg'
  | 'targetTopElevationDeg'
  | 'targetAngularHeightDeg';

export type ModelUncertaintyParameterKey =
  | 'surfaceDistanceM'
  | 'observerEyeHeightM'
  | 'observerGroundElevationM'
  | 'targetHeightM'
  | 'targetGroundElevationM'
  | 'refractionCoefficient';

export interface ModelUncertaintyContribution {
  parameter: ModelUncertaintyParameterKey;
  label: string;
  inputUncertainty: number;
  inputUnit: string;
  metricContributionsDeg: Partial<Record<AngularMetricKey, number | null>>;
}

export interface ModelAngularUncertaintyResult {
  sourceModelId: string;
  combination: ModelInputUncertaintySettings['combination'];
  definedParameterCount: number;
  metricUncertaintyDeg: Partial<Record<AngularMetricKey, number | null>>;
  contributions: ModelUncertaintyContribution[];
  warnings: string[];
  version: typeof MODEL_ANGULAR_UNCERTAINTY_VERSION;
}

interface PropagationInput {
  model: SimulationModel;
  baselinePrediction: ModelPrediction;
  experiment: ExperimentDefinition;
  context: SimulationContext;
  settings: ModelInputUncertaintySettings;
}

const ANGULAR_METRICS: AngularMetricKey[] = [
  'targetBaseElevationDeg',
  'targetTopElevationDeg',
  'targetAngularHeightDeg'
];

function metricValue(prediction: ModelPrediction, key: AngularMetricKey): number | null {
  const value = prediction.metrics.find((metric) => metric.key === key)?.value;
  return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
}

function cloneTerrainProfile(
  profile: TerrainProfile | undefined,
  options: {
    distanceScale?: number;
    observerElevationDeltaM?: number;
    targetElevationDeltaM?: number;
  }
): TerrainProfile | undefined {
  if (!profile) return undefined;
  const distanceScale = options.distanceScale ?? 1;
  const samples = profile.samples.map((sample, index) => {
    const isObserver = index === 0;
    const isTarget = index === profile.samples.length - 1;
    return {
      distanceM: sample.distanceM * distanceScale,
      elevationM: sample.elevationM +
        (isObserver ? options.observerElevationDeltaM ?? 0 : 0) +
        (isTarget ? options.targetElevationDeltaM ?? 0 : 0)
    };
  });
  return {
    ...profile,
    totalDistanceM: profile.totalDistanceM * distanceScale,
    samples
  };
}

function cloneExperiment(experiment: ExperimentDefinition): ExperimentDefinition {
  return {
    ...experiment,
    observer: { ...experiment.observer },
    ...(experiment.target ? { target: { ...experiment.target } } : {}),
    ...(experiment.terrainProfile ? {
      terrainProfile: {
        ...experiment.terrainProfile,
        datum: { ...experiment.terrainProfile.datum },
        samples: experiment.terrainProfile.samples.map((sample) => ({ ...sample }))
      }
    } : {}),
    measurements: Object.fromEntries(
      Object.entries(experiment.measurements).map(([key, value]) => [key, { ...value }])
    )
  };
}

function positiveUncertainty(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} belirsizliği negatif olmayan sonlu bir sayı olmalı.`);
  }
  return value > 0 ? value : undefined;
}

async function perturbedPrediction(
  model: SimulationModel,
  experiment: ExperimentDefinition,
  context: SimulationContext,
  parameter: ModelUncertaintyParameterKey,
  delta: number
): Promise<ModelPrediction> {
  const variant = cloneExperiment(experiment);
  const variantContext: SimulationContext = { ...context };

  if (parameter === 'surfaceDistanceM') {
    const measurement = variant.measurements.surfaceDistanceM;
    if (!measurement || measurement.unit !== 'm') {
      throw new RangeError('Yüzey mesafesi belirsizliği için surfaceDistanceM ölçümü bulunamadı.');
    }
    const nextDistance = measurement.value + delta;
    if (!(nextDistance > 0)) {
      throw new RangeError('Mesafe belirsizliği alt sınırı sıfırdan büyük kalmalı.');
    }
    const scale = measurement.value > 0 ? nextDistance / measurement.value : 1;
    variant.measurements.surfaceDistanceM = { ...measurement, value: nextDistance };
    variant.terrainProfile = cloneTerrainProfile(variant.terrainProfile, { distanceScale: scale });
  } else if (parameter === 'observerEyeHeightM') {
    const next = variant.observer.eyeHeightM + delta;
    if (next < 0) throw new RangeError('Göz yüksekliği belirsizliği negatif fiziksel yüksekliğe taşmamalı.');
    variant.observer.eyeHeightM = next;
  } else if (parameter === 'observerGroundElevationM') {
    variant.observer.elevationM += delta;
    variant.terrainProfile = cloneTerrainProfile(variant.terrainProfile, {
      observerElevationDeltaM: delta
    });
  } else if (parameter === 'targetHeightM') {
    if (!variant.target) throw new RangeError('Hedef yüksekliği belirsizliği için hedef bulunamadı.');
    const next = variant.target.heightM + delta;
    if (!(next > 0)) throw new RangeError('Hedef yüksekliği belirsizliği alt sınırı sıfırdan büyük kalmalı.');
    variant.target.heightM = next;
  } else if (parameter === 'targetGroundElevationM') {
    if (!variant.target) throw new RangeError('Hedef taban kotu belirsizliği için hedef bulunamadı.');
    variant.target.elevationM += delta;
    variant.terrainProfile = cloneTerrainProfile(variant.terrainProfile, {
      targetElevationDeltaM: delta
    });
  } else if (parameter === 'refractionCoefficient') {
    if (variantContext.atmosphereMode !== 'standard') {
      throw new RangeError('k belirsizliği yalnız Standart k atmosfer modunda yayılabilir.');
    }
    const base = variantContext.refractionCoefficient ?? 0.13;
    const next = base + delta;
    if (!(next > -1 && next < 0.99)) {
      throw new RangeError('k belirsizliği fiziksel hesap aralığını (-1, 0,99) aşmamalı.');
    }
    variantContext.refractionCoefficient = next;
  }

  return model.predict(variant, variantContext);
}

export async function propagateModelAngularUncertainty(
  input: PropagationInput
): Promise<ModelAngularUncertaintyResult> {
  const warnings: string[] = [];
  const contributions: ModelUncertaintyContribution[] = [];
  const contributionBuckets: Record<AngularMetricKey, number[]> = {
    targetBaseElevationDeg: [],
    targetTopElevationDeg: [],
    targetAngularHeightDeg: []
  };
  const unavailable = new Set<AngularMetricKey>();

  if (!hasDefinedModelInputUncertainty(input.settings)) {
    return {
      sourceModelId: input.model.metadata.id,
      combination: input.settings.combination,
      definedParameterCount: 0,
      metricUncertaintyDeg: {},
      contributions,
      warnings: ['Model girdi belirsizliği tanımlanmadı.'],
      version: MODEL_ANGULAR_UNCERTAINTY_VERSION
    };
  }

  const parameters: Array<{
    key: ModelUncertaintyParameterKey;
    label: string;
    unit: string;
    uncertainty?: number;
  }> = [
    { key: 'surfaceDistanceM', label: 'Etkin yüzey mesafesi', unit: 'm', uncertainty: input.settings.surfaceDistanceM },
    { key: 'observerEyeHeightM', label: 'Göz yüksekliği', unit: 'm', uncertainty: input.settings.observerEyeHeightM },
    { key: 'observerGroundElevationM', label: 'Gözlemci zemin kotu', unit: 'm', uncertainty: input.settings.observerGroundElevationM },
    { key: 'targetHeightM', label: 'Hedef yüksekliği', unit: 'm', uncertainty: input.settings.targetHeightM },
    { key: 'targetGroundElevationM', label: 'Hedef taban kotu', unit: 'm', uncertainty: input.settings.targetGroundElevationM },
    { key: 'refractionCoefficient', label: 'Standart kırılma katsayısı k', unit: '1', uncertainty: input.settings.refractionCoefficient }
  ];

  for (const parameter of parameters) {
    const uncertainty = positiveUncertainty(parameter.uncertainty, parameter.label);
    if (uncertainty === undefined) continue;
    if (parameter.key === 'refractionCoefficient' && input.context.atmosphereMode !== 'standard') {
      warnings.push('k belirsizliği tanımlı olsa da atmosfer modu Standart k olmadığı için bu bileşen kullanılmadı.');
      continue;
    }

    let minus: ModelPrediction;
    let plus: ModelPrediction;
    try {
      [minus, plus] = await Promise.all([
        perturbedPrediction(input.model, input.experiment, input.context, parameter.key, -uncertainty),
        perturbedPrediction(input.model, input.experiment, input.context, parameter.key, uncertainty)
      ]);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `${parameter.label} belirsizliği yayılmadı.`);
      continue;
    }

    const metricContributionsDeg: Partial<Record<AngularMetricKey, number | null>> = {};
    for (const key of ANGULAR_METRICS) {
      const baseline = metricValue(input.baselinePrediction, key);
      if (baseline === null) continue;
      const minusValue = metricValue(minus, key);
      const plusValue = metricValue(plus, key);
      if (minusValue === null || plusValue === null || minus.status === 'unsupported' || plus.status === 'unsupported') {
        metricContributionsDeg[key] = null;
        unavailable.add(key);
        continue;
      }
      const contribution = Math.max(
        Math.abs(minusValue - baseline),
        Math.abs(plusValue - baseline)
      );
      metricContributionsDeg[key] = contribution;
      contributionBuckets[key].push(contribution);
    }

    contributions.push({
      parameter: parameter.key,
      label: parameter.label,
      inputUncertainty: uncertainty,
      inputUnit: parameter.unit,
      metricContributionsDeg
    });
  }

  if (input.context.atmosphereMode === 'profile') {
    warnings.push('Katmanlı atmosfer sıcaklık/basınç/nem ölçüm belirsizlikleri bu aşamada tanımlı değildir; yalnız geometri girdileri yayılır.');
  }
  if (input.experiment.terrainProfile && input.experiment.terrainProfile.samples.length > 2) {
    warnings.push('Ara terrain/DEM örneklerinin düşey doğruluk belirsizliği ayrı bir veri alanı olmadığı için modele yayılmadı.');
  }

  const metricUncertaintyDeg: Partial<Record<AngularMetricKey, number | null>> = {};
  for (const key of ANGULAR_METRICS) {
    if (metricValue(input.baselinePrediction, key) === null) continue;
    metricUncertaintyDeg[key] = unavailable.has(key)
      ? null
      : combineUncertaintyContributions(contributionBuckets[key], input.settings.combination);
  }

  return {
    sourceModelId: input.model.metadata.id,
    combination: input.settings.combination,
    definedParameterCount: contributions.length,
    metricUncertaintyDeg,
    contributions,
    warnings,
    version: MODEL_ANGULAR_UNCERTAINTY_VERSION
  };
}
