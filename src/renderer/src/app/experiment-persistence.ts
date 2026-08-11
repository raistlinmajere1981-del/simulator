import { simulationModels } from '../../../models';
import type { AtmosphereExperimentState } from '../../../shared/atmosphere';
import type { ModelMetadata, ModelPrediction } from '../../../shared/domain';
import type { SavedPhotoCalibration } from '../../../shared/photo-calibration';
import { normalizeSimulationScenarioId, type SimulationScenarioId } from '../../../shared/scenario';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment,
  type SimulatorInputs,
  type TerrainProfileSource
} from '../../../shared/simulator';
import type { SavedStellarLocalHorizonSource } from '../../../shared/stellar-local-horizon-import';
import type { SavedStellarMotionSource } from '../../../shared/stellar-motion-source';
import type { ManualTerrainPoint } from '../../../shared/terrain';
import type { TextExperimentSetupProvenance } from '../../../shared/text-experiment-setup';
import {
  DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS,
  type ModelInputUncertaintySettings
} from '../../../shared/uncertainty';
import { systemUtcOffsetMinutes } from '../../../shared/celestial-time';
import {
  atmosphereStateFromLegacyStandardFlag,
  cloneAtmosphereExperimentState
} from '../../../simulation/atmosphere-persistence';
import {
  DUAL_SHADOW_COMPARISON_MODEL_ID,
  DUAL_SHADOW_COMPARISON_MODEL_VERSION,
  readDualShadowComparisonSettings,
  type DualShadowComparisonSettings
} from '../../../simulation/dual-shadow-comparison';
import { GEOID_CONVERSION_MODEL_ID } from '../../../simulation/geoid-conversion-provenance';
import { migrateLegacyManualTerrainPoint } from '../../../simulation/manual-terrain-profile';
import {
  PHOTO_ANGULAR_COMPARISON_MODEL_VERSION,
  type PhotoAngularComparisonResult
} from '../../../simulation/photo-angular-comparison';
import {
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION
} from '../../../simulation/photo-calibration';
import type { ModelRun } from '../../../simulation/runner';
import {
  SHADOW_OBSERVATION_MODEL_ID,
  readShadowObservationSettings,
  shadowObservationMetadata,
  type ShadowObservationSettings
} from '../../../simulation/shadow-observation';
import {
  STELLAR_OBSERVATION_MODEL_ID,
  readStellarObservationSettings,
  stellarObservationMetadata,
  type StellarObservationSettings
} from '../../../simulation/stellar-observation';
import { solarPositionMetadata } from '../../../simulation/solar-position-prediction';
import { solarDayEventsMetadata } from '../../../simulation/solar-day-events';
import { solarSeasonEventsMetadata } from '../../../simulation/solar-season-events';
import { solarTimeOffsetMetadata } from '../../../simulation/solar-time-offset';
import { solarRouteComparisonMetadata } from '../../../simulation/solar-route-comparison';
import { lunarPositionMetadata } from '../../../simulation/lunar-position-prediction';
import { solarEclipseOverlapMetadata } from '../../../simulation/solar-eclipse-overlap-prediction';
import {
  readSolarEclipseEventSearchSnapshot,
  solarEclipseEventSearchMetadata,
  type SolarEclipseEventSearchSnapshot
} from '../../../simulation/solar-eclipse-event-search-prediction';
import { WATER_SURFACE_APPLICATION_MODEL_ID } from '../../../simulation/water-surface-application';
import { WATER_SURFACE_OBSERVATION_MODEL_ID } from '../../../simulation/water-surface-observation';
import {
  readStoredWaterSurfaceState,
  type StoredWaterSurfaceRecord
} from '../../../simulation/water-surface-ui-state';

export interface StoredPredictionRecord {
  prediction: ModelPrediction;
  modelVersion: string;
}

export interface RestoredExperimentState {
  activeScenarioId: SimulationScenarioId;
  shadowObservationSettings: ShadowObservationSettings;
  dualShadowSettings: DualShadowComparisonSettings | undefined;
  stellarObservationSettings: StellarObservationSettings;
  stellarLocalHorizonSource: SavedStellarLocalHorizonSource | undefined;
  stellarMotionSource: SavedStellarMotionSource | undefined;
  eclipseEventSearchSnapshot: SolarEclipseEventSearchSnapshot | undefined;
  inputs: SimulatorInputs;
  atmosphereState: AtmosphereExperimentState;
  manualTerrainPoints: ManualTerrainPoint[];
  terrainProfileSource: TerrainProfileSource | undefined;
  geoidConversionRecord: StoredPredictionRecord | undefined;
  waterObservationRecord: StoredWaterSurfaceRecord | undefined;
  waterApplicationRecord: StoredWaterSurfaceRecord | undefined;
  photoCalibration: SavedPhotoCalibration | undefined;
  photoModelUncertainty: ModelInputUncertaintySettings;
  textSetupHistory: TextExperimentSetupProvenance[];
  photoCalibrationRecord: StoredPredictionRecord | undefined;
  activeExperimentId: string;
  activeExperimentName: string;
  experimentObservedAtIso: string;
  observationUtcOffsetMinutes: number;
}

export function defaultTerrainPoints(
  inputs: SimulatorInputs = DEFAULT_SIMULATOR_INPUTS
): ManualTerrainPoint[] {
  return migrateLegacyManualTerrainPoint(
    inputs.terrainIntermediateDistancePercent,
    inputs.terrainIntermediateElevationM
  );
}

function cloneStellarLocalHorizonSource(
  source: SavedStellarLocalHorizonSource | undefined
): SavedStellarLocalHorizonSource | undefined {
  if (!source) return undefined;
  return {
    ...source,
    points: source.points.map((point) => ({ ...point })),
    warnings: [...source.warnings],
    ...(source.demDerivation ? { demDerivation: { ...source.demDerivation } } : {}),
    ...(source.panoramaDerivation
      ? {
          panoramaDerivation: {
            ...source.panoramaDerivation,
            geometry: { ...source.panoramaDerivation.geometry },
            marks: source.panoramaDerivation.marks.map((mark) => ({ ...mark }))
          }
        }
      : {})
  };
}

export function restoreSavedExperiment(saved: SavedExperiment): RestoredExperimentState {
  const geoidPrediction = saved.predictions.find(
    (prediction) => prediction.modelId === GEOID_CONVERSION_MODEL_ID
  );
  const storedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);
  const photoPrediction = saved.predictions.find(
    (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID
  );
  const shadowPrediction = saved.predictions.find(
    (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID
  );
  const dualShadowPrediction = saved.predictions.find(
    (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID
  );
  const stellarPrediction = saved.predictions.find(
    (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID
  );
  const eclipseEventPrediction = saved.predictions.find(
    (prediction) => prediction.modelId === solarEclipseEventSearchMetadata.id
  );
  const stellarLocalHorizonSource = cloneStellarLocalHorizonSource(saved.stellarLocalHorizonSource);
  const storedStellarSettings = readStellarObservationSettings(stellarPrediction);
  const stellarObservationSettings = storedStellarSettings.localHorizonSourceMode === 'external' && !stellarLocalHorizonSource
    ? { ...storedStellarSettings, localHorizonEnabled: false, localHorizonSourceMode: 'manual' as const }
    : storedStellarSettings;
  const experimentObservedAtIso = saved.observedAtIso ?? saved.createdAtIso;

  return {
    activeScenarioId: normalizeSimulationScenarioId(saved.scenarioId),
    shadowObservationSettings: readShadowObservationSettings(shadowPrediction),
    dualShadowSettings: readDualShadowComparisonSettings(dualShadowPrediction),
    stellarObservationSettings,
    stellarLocalHorizonSource,
    stellarMotionSource: saved.stellarMotionSource
      ? { ...saved.stellarMotionSource, entries: saved.stellarMotionSource.entries.map((entry) => ({ ...entry })) }
      : undefined,
    eclipseEventSearchSnapshot: readSolarEclipseEventSearchSnapshot(eclipseEventPrediction),
    inputs: saved.inputs,
    atmosphereState: saved.atmosphere
      ? cloneAtmosphereExperimentState(saved.atmosphere)
      : atmosphereStateFromLegacyStandardFlag(saved.inputs.useStandardRefraction),
    manualTerrainPoints: saved.manualTerrainPoints ?? defaultTerrainPoints(saved.inputs),
    terrainProfileSource: saved.terrainProfileSource,
    geoidConversionRecord: geoidPrediction
      ? {
          prediction: geoidPrediction,
          modelVersion: saved.modelVersions[GEOID_CONVERSION_MODEL_ID] ?? 'bilinmiyor'
        }
      : undefined,
    waterObservationRecord: storedWater.observation,
    waterApplicationRecord: storedWater.application,
    photoCalibration: saved.photoCalibration,
    photoModelUncertainty: saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS },
    textSetupHistory: saved.textSetupHistory ?? [],
    photoCalibrationRecord: photoPrediction
      ? {
          prediction: photoPrediction,
          modelVersion: saved.modelVersions[PHOTO_CALIBRATION_MODEL_ID] ?? PHOTO_CALIBRATION_MODEL_VERSION
        }
      : undefined,
    activeExperimentId: saved.id,
    activeExperimentName: saved.name,
    experimentObservedAtIso,
    observationUtcOffsetMinutes: saved.observationUtcOffsetMinutes ?? systemUtcOffsetMinutes(new Date(experimentObservedAtIso))
  };
}

interface AstronomyPredictions {
  solarPosition?: ModelPrediction;
  solarDayEvents?: ModelPrediction;
  solarTimeOffset?: ModelPrediction;
  solarSeasonEvents?: ModelPrediction;
  solarRouteComparison?: ModelPrediction;
  lunarPosition?: ModelPrediction;
  eclipseOverlap?: ModelPrediction;
  eclipseEventSearch?: ModelPrediction;
  shadowObservation?: ModelPrediction;
  dualShadowComparison?: ModelPrediction;
  stellarObservation?: ModelPrediction;
}

export interface BuildSavedExperimentRecordArgs {
  name: string;
  now?: string;
  activeExperimentId: string;
  savedExperiments: SavedExperiment[];
  experimentObservedAtIso: string;
  observationUtcOffsetMinutes: number;
  activeScenarioId: SimulationScenarioId;
  atmosphereState: AtmosphereExperimentState;
  photoCalibration: SavedPhotoCalibration | undefined;
  modelInputUncertaintyDefined: boolean;
  photoModelUncertainty: ModelInputUncertaintySettings;
  textSetupHistory: TextExperimentSetupProvenance[];
  stellarLocalHorizonSource: SavedStellarLocalHorizonSource | undefined;
  stellarMotionSource: SavedStellarMotionSource | undefined;
  inputs: SimulatorInputs;
  manualTerrainPoints: ManualTerrainPoint[];
  terrainProfileSource: TerrainProfileSource | undefined;
  geodesic: SavedExperiment['geodesic'];
  geodesicModelMetadata: ModelMetadata;
  astronomyPredictions: AstronomyPredictions;
  runs: ModelRun[];
  geoidConversionRecord: StoredPredictionRecord | undefined;
  waterObservationRecord: StoredWaterSurfaceRecord | undefined;
  waterApplicationRecord: StoredWaterSurfaceRecord | undefined;
  photoCalibrationRecord: StoredPredictionRecord | undefined;
  photoAngularComparisons: PhotoAngularComparisonResult[];
}

export function buildSavedExperimentRecord({
  name,
  now = new Date().toISOString(),
  activeExperimentId,
  savedExperiments,
  experimentObservedAtIso,
  observationUtcOffsetMinutes,
  activeScenarioId,
  atmosphereState,
  photoCalibration,
  modelInputUncertaintyDefined,
  photoModelUncertainty,
  textSetupHistory,
  stellarLocalHorizonSource,
  stellarMotionSource,
  inputs,
  manualTerrainPoints,
  terrainProfileSource,
  geodesic,
  geodesicModelMetadata,
  astronomyPredictions,
  runs,
  geoidConversionRecord,
  waterObservationRecord,
  waterApplicationRecord,
  photoCalibrationRecord,
  photoAngularComparisons
}: BuildSavedExperimentRecordArgs): SavedExperiment {
  const existing = savedExperiments.find((item) => item.id === activeExperimentId);
  const astronomyVersions = [
    ...(astronomyPredictions.solarPosition ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const] : []),
    ...(astronomyPredictions.solarDayEvents ? [[solarDayEventsMetadata.id, solarDayEventsMetadata.version] as const] : []),
    ...(astronomyPredictions.solarTimeOffset ? [[solarTimeOffsetMetadata.id, solarTimeOffsetMetadata.version] as const] : []),
    ...(astronomyPredictions.solarSeasonEvents ? [[solarSeasonEventsMetadata.id, solarSeasonEventsMetadata.version] as const] : []),
    ...(astronomyPredictions.solarRouteComparison ? [[solarRouteComparisonMetadata.id, solarRouteComparisonMetadata.version] as const] : []),
    ...(astronomyPredictions.lunarPosition ? [[lunarPositionMetadata.id, lunarPositionMetadata.version] as const] : []),
    ...(astronomyPredictions.eclipseOverlap ? [[solarEclipseOverlapMetadata.id, solarEclipseOverlapMetadata.version] as const] : []),
    ...(astronomyPredictions.eclipseEventSearch ? [[solarEclipseEventSearchMetadata.id, solarEclipseEventSearchMetadata.version] as const] : []),
    ...(astronomyPredictions.shadowObservation ? [[shadowObservationMetadata.id, shadowObservationMetadata.version] as const] : []),
    ...(astronomyPredictions.dualShadowComparison ? [[DUAL_SHADOW_COMPARISON_MODEL_ID, DUAL_SHADOW_COMPARISON_MODEL_VERSION] as const] : []),
    ...(astronomyPredictions.stellarObservation ? [[stellarObservationMetadata.id, stellarObservationMetadata.version] as const] : [])
  ];

  return {
    id: activeExperimentId,
    name,
    createdAtIso: existing?.createdAtIso ?? now,
    updatedAtIso: now,
    observedAtIso: experimentObservedAtIso,
    observationUtcOffsetMinutes,
    scenarioId: activeScenarioId,
    atmosphere: cloneAtmosphereExperimentState(atmosphereState),
    ...(photoCalibration ? { photoCalibration } : {}),
    ...(modelInputUncertaintyDefined ? { photoModelUncertainty } : {}),
    ...(textSetupHistory.length > 0 ? { textSetupHistory } : {}),
    ...(stellarLocalHorizonSource ? { stellarLocalHorizonSource } : {}),
    ...(stellarMotionSource ? { stellarMotionSource } : {}),
    inputs,
    manualTerrainPoints,
    terrainProfileSource,
    geodesic,
    modelVersions: Object.fromEntries([
      ...simulationModels.map((model) => [model.metadata.id, model.metadata.version] as const),
      [geodesicModelMetadata.id, geodesicModelMetadata.version] as const,
      ...astronomyVersions,
      ...(geoidConversionRecord ? [[GEOID_CONVERSION_MODEL_ID, geoidConversionRecord.modelVersion] as const] : []),
      ...(waterObservationRecord ? [[WATER_SURFACE_OBSERVATION_MODEL_ID, waterObservationRecord.modelVersion] as const] : []),
      ...(waterApplicationRecord ? [[WATER_SURFACE_APPLICATION_MODEL_ID, waterApplicationRecord.modelVersion] as const] : []),
      ...(photoCalibrationRecord ? [[PHOTO_CALIBRATION_MODEL_ID, photoCalibrationRecord.modelVersion] as const] : []),
      ...photoAngularComparisons.map((comparison) => [
        comparison.prediction.modelId,
        PHOTO_ANGULAR_COMPARISON_MODEL_VERSION
      ] as const)
    ]),
    predictions: [
      ...Object.values(astronomyPredictions).filter((prediction): prediction is ModelPrediction => prediction !== undefined),
      ...runs.map((run) => run.prediction),
      ...(geoidConversionRecord ? [geoidConversionRecord.prediction] : []),
      ...(waterObservationRecord ? [waterObservationRecord.prediction] : []),
      ...(waterApplicationRecord ? [waterApplicationRecord.prediction] : []),
      ...(photoCalibrationRecord ? [photoCalibrationRecord.prediction] : []),
      ...photoAngularComparisons.map((comparison) => comparison.prediction)
    ]
  };
}
