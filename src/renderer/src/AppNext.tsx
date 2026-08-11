import { useCallback, useEffect, useMemo, useState } from 'react';
import { simulationModels } from '../../models';
import {
  createDefaultAtmosphereExperimentState,
  type AtmosphereExperimentState
} from '../../shared/atmosphere';
import type {
  ModelMetadata,
  ModelPrediction
} from '../../shared/domain';
import type { SavedPhotoCalibration } from '../../shared/photo-calibration';
import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';
import type { SavedStellarMotionSource } from '../../shared/stellar-motion-source';
import { systemUtcOffsetMinutes } from '../../shared/celestial-time';
import type { HelpPanelId } from '../../shared/help-content';
import type {
  ExperimentSetupApplication,
  TextExperimentSetupProvenance
} from '../../shared/text-experiment-setup';
import {
  DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS,
  hasDefinedModelInputUncertainty,
  type ModelInputUncertaintySettings
} from '../../shared/uncertainty';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type ImportedDemTerrainProfile,
  type ImportedGeoJsonTerrainProfile,
  type TerrainProfileImport,
  type SavedExperiment,
  type SimulatorInputs,
  type TerrainProfileSource
} from '../../shared/simulator';
import type { ManualTerrainPoint } from '../../shared/terrain';
import {
  getSimulationScenario,
  normalizeSimulationScenarioId,
  type SimulationScenarioId
} from '../../shared/scenario';
import type { GeodesicResult } from '../../simulation/geodesy';
import {
  GEOID_CONVERSION_MODEL_ID,
  type GeoidConversionApplication
} from '../../simulation/geoid-conversion-provenance';
import { migrateLegacyManualTerrainPoint } from '../../simulation/manual-terrain-profile';
import { applyImportedTerrainInputs } from '../../simulation/terrain-import-application';
import {
  atmosphereStateFromLegacyStandardFlag,
  cloneAtmosphereExperimentState
} from '../../simulation/atmosphere-persistence';
import {
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';
import {
  PHOTO_ANGULAR_COMPARISON_MODEL_VERSION,
  comparePhotoAngularObservation,
  normalizePhotoReferenceKind
} from '../../simulation/photo-angular-comparison';
import {
  propagateModelAngularUncertainty,
  type ModelAngularUncertaintyResult
} from '../../simulation/photo-model-uncertainty';
import { solarPositionMetadata } from '../../simulation/solar-position-prediction';
import { solarDayEventsMetadata } from '../../simulation/solar-day-events';
import { solarSeasonEventsMetadata } from '../../simulation/solar-season-events';
import { solarTimeOffsetMetadata } from '../../simulation/solar-time-offset';
import { solarRouteComparisonMetadata } from '../../simulation/solar-route-comparison';
import { lunarPositionMetadata } from '../../simulation/lunar-position-prediction';
import { solarEclipseOverlapMetadata } from '../../simulation/solar-eclipse-overlap-prediction';
import {
  readSolarEclipseEventSearchSnapshot,
  solarEclipseEventSearchMetadata,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';
import {
  DEFAULT_SHADOW_OBSERVATION_SETTINGS,
  SHADOW_OBSERVATION_MODEL_ID,
  readShadowObservationSettings,
  shadowObservationMetadata,
  type ShadowObservationSettings
} from '../../simulation/shadow-observation';
import {
  DUAL_SHADOW_COMPARISON_MODEL_ID,
  createDefaultDualShadowComparisonSettings,
  dualShadowComparisonMetadata,
  readDualShadowComparisonSettings,
  type DualShadowComparisonSettings
} from '../../simulation/dual-shadow-comparison';
import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  readStellarObservationSettings,
  stellarObservationMetadata,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';
import {
  WATER_SURFACE_APPLICATION_MODEL_ID,
  type WaterSurfaceApplicationResult
} from '../../simulation/water-surface-application';
import {
  WATER_SURFACE_OBSERVATION_MODEL_ID,
  type WaterSurfaceObservationRecord
} from '../../simulation/water-surface-observation';
import {
  markWaterSurfaceApplicationHistorical,
  readStoredWaterSurfaceState,
  type StoredWaterSurfaceRecord
} from '../../simulation/water-surface-ui-state';
import {
  DataManagerDialog,
  SaveExperimentDialog,
  TraceDialog
} from './dialogs';
import type { TerrainProfileImportOptions } from './MultiPointTerrainEditor';
import { AtmosphereProfileControl } from './AtmosphereProfileControl';
import { WaterSurfaceControl } from './WaterSurfaceControl';
import { PhotoCalibrationControl } from './PhotoCalibrationControl';
import { PhotoAngularComparisonPanel } from './PhotoAngularComparisonPanel';
import { PhotoModelUncertaintyControl } from './PhotoModelUncertaintyControl';
import { HelpOverlay, HelpProvider, PanelHelpButton } from './HelpSystem';
import { TextExperimentSetupDialog } from './TextExperimentSetupDialog';
import { AiWorkflowDialog } from './AiWorkflowDialog';
import { AiGuideDialog } from './AiGuideDialog';
import { AppSidebar as Sidebar } from './app/AppSidebar';
import { HorizonReferencePanel, ObservationPanel } from './app/ObservationReferencePanels';
import { ScenarioSummary } from './app/ScenarioSummary';
import { ModelCard, ResultsTable } from './app/ModelResults';
import { TerrainPanel } from './app/TerrainPanel';
import { useAstronomyCalculations } from './app/useAstronomyCalculations';
import { useExperimentModelState } from './app/useExperimentModelState';
import {
  datumLabels,
  defaultExperimentName,
  isAstronomyScenario
} from './app/app-config';
import {
  clampInputValue,
  getMetric,
  numberFormatter
} from './app/app-formatters';
import type { NumericInputKey, VisualLayerState } from './app/app-types';
import { SolarPositionPanel } from './SolarPositionPanel';
import { SolarDayEventsPanel } from './SolarDayEventsPanel';
import { LunarPositionPanel } from './LunarPositionPanel';
import { EclipseScenarioSummary } from './EclipseScenarioSummary';
import { EclipseSimulationPanel } from './EclipseSimulationPanel';
import { SolarScenarioSummary } from './SolarScenarioSummary';
import { ShadowScenarioSummary } from './ShadowScenarioSummary';
import { ShadowObservationPanel } from './ShadowObservationPanel';
import { DualShadowComparisonPanel } from './DualShadowComparisonPanel';
import { StellarScenarioSummary } from './StellarScenarioSummary';
import { StellarObservationPanel } from './StellarObservationPanel';

interface GeoidConversionRecordState {
  prediction: ModelPrediction;
  modelVersion: string;
}

interface PhotoCalibrationRecordState {
  prediction: ModelPrediction;
  modelVersion: string;
}

const geodesicMetadata: ModelMetadata = {
  id: 'wgs84-geodesic',
  name: 'WGS84 Jeodezik Çözüm',
  version: '0.1.0',
  description: 'İki koordinat arasındaki elipsoidal yüzey mesafesi ve uç azimutları.',
  capabilities: ['surface-distance'],
  assumptions: [
    'Referans elipsoidi WGS84’tür.',
    'Ters problem Vincenty iterasyonuyla çözülür.'
  ]
};

const waterObservationMetadata: ModelMetadata = {
  id: WATER_SURFACE_OBSERVATION_MODEL_ID,
  name: 'Su Yüzeyi Gözlem Kaydı',
  version: '0.1.0',
  description: 'Su seviyesi, gelgit, dalga bağlamı ve düşey belirsizlik provenansı.',
  capabilities: ['water-surface-observation'],
  assumptions: ['Su yüzeyi seçilen düşey datumda yorumlanır.']
};

const waterApplicationMetadata: ModelMetadata = {
  id: WATER_SURFACE_APPLICATION_MODEL_ID,
  name: 'Su Yüzeyi Fiziksel Uygulaması',
  version: '0.1.0',
  description: 'Kayıtlı su yüzeyini seçilen deney uç kotlarına kontrollü uygular.',
  capabilities: ['water-surface-application'],
  assumptions: ['Uygulama yalnız seçilen uç zemin kotlarını değiştirir.']
};

function defaultTerrainPoints(inputs = DEFAULT_SIMULATOR_INPUTS): ManualTerrainPoint[] {
  return migrateLegacyManualTerrainPoint(
    inputs.terrainIntermediateDistancePercent,
    inputs.terrainIntermediateElevationM
  );
}

function geodesicPrediction(result: GeodesicResult | undefined): ModelPrediction | undefined {
  if (!result) return undefined;
  return {
    modelId: geodesicMetadata.id,
    experimentId: 'interactive-target-visibility',
    status: result.method === 'vincenty' ? 'compatible' : 'indeterminate',
    metrics: [
      { key: 'surfaceDistanceM', label: 'WGS84 yüzey mesafesi', value: result.distanceM, unit: 'm' },
      { key: 'initialBearingDeg', label: 'Başlangıç azimutu', value: result.initialBearingDeg, unit: 'deg' },
      { key: 'finalBearingDeg', label: 'Varış azimutu', value: result.finalBearingDeg, unit: 'deg' },
      { key: 'iterations', label: 'İterasyon sayısı', value: result.iterations, unit: 'count' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}

function isImportedDemTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedDemTerrainProfile {
  return 'kind' in profile && profile.kind === 'dem';
}

function isImportedGeoJsonTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return 'kind' in profile && profile.kind === 'geojson';
}

function isCsvTerrainProfileSource(
  source: TerrainProfileSource
): source is Extract<TerrainProfileSource, { kind: 'csv' }> {
  return source.kind === 'csv';
}

function terrainVisualizationSourceLabel(source: TerrainProfileSource | undefined): string {
  if (!source) return 'Manuel profil';
  if (source.kind === 'dem') return `DEM · ${source.fileName}`;
  if (source.kind === 'geojson') return `GeoJSON · ${source.fileName}`;
  return `CSV · ${source.fileName}`;
}

export function AppNext(): React.JSX.Element {
  const [inputs, setInputs] = useState<SimulatorInputs>(DEFAULT_SIMULATOR_INPUTS);
  const [atmosphereState, setAtmosphereState] = useState<AtmosphereExperimentState>(() =>
    createDefaultAtmosphereExperimentState(DEFAULT_SIMULATOR_INPUTS.useStandardRefraction ? 'standard' : 'off')
  );
  const [activeScenarioId, setActiveScenarioId] = useState<SimulationScenarioId>('target-visibility');
  const [shadowObservationSettings, setShadowObservationSettings] = useState<ShadowObservationSettings>(() => ({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS }));
  const [dualShadowSettings, setDualShadowSettings] = useState<DualShadowComparisonSettings>();
  const [stellarObservationSettings, setStellarObservationSettings] = useState<StellarObservationSettings>(() => ({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS }));
  const [stellarLocalHorizonSource, setStellarLocalHorizonSource] = useState<SavedStellarLocalHorizonSource>();
  const [stellarMotionSource, setStellarMotionSource] = useState<SavedStellarMotionSource>();
  const [eclipseEventSearchSnapshot, setEclipseEventSearchSnapshot] = useState<SolarEclipseEventSearchSnapshot>();
  const [eclipseSearchHalfWindowHours, setEclipseSearchHalfWindowHours] = useState(12);
  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(
    defaultTerrainPoints()
  );
  const [terrainProfileSource, setTerrainProfileSource] = useState<TerrainProfileSource>();
  const [geoidConversionRecord, setGeoidConversionRecord] = useState<GeoidConversionRecordState>();
  const [waterObservationRecord, setWaterObservationRecord] = useState<StoredWaterSurfaceRecord>();
  const [waterApplicationRecord, setWaterApplicationRecord] = useState<StoredWaterSurfaceRecord>();
  const [photoCalibration, setPhotoCalibration] = useState<SavedPhotoCalibration>();
  const [photoCalibrationRecord, setPhotoCalibrationRecord] = useState<PhotoCalibrationRecordState>();
  const [photoModelUncertainty, setPhotoModelUncertainty] = useState<ModelInputUncertaintySettings>(() => ({
    ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS
  }));
  const [modelAngularUncertaintyById, setModelAngularUncertaintyById] = useState<Record<string, ModelAngularUncertaintyResult>>({});
  const [isAngularUncertaintyCalculating, setIsAngularUncertaintyCalculating] = useState(false);
  const [modelUncertaintyError, setModelUncertaintyError] = useState<string>();
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState(() => crypto.randomUUID());
  const [activeExperimentName, setActiveExperimentName] = useState('');
  const [experimentObservedAtIso, setExperimentObservedAtIso] = useState(() => new Date().toISOString());
  const [observationUtcOffsetMinutes, setObservationUtcOffsetMinutes] = useState(() => systemUtcOffsetMinutes());
  const [isDirty, setIsDirty] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  const [traceModelId, setTraceModelId] = useState<string>();
  const [storageMessage, setStorageMessage] = useState('');
  const [helpPanelId, setHelpPanelId] = useState<HelpPanelId>();
  const [helpCatalogOpen, setHelpCatalogOpen] = useState(false);
  const [textSetupOpen, setTextSetupOpen] = useState(false);
  const [textSetupInitialText, setTextSetupInitialText] = useState('');
  const [aiWorkflowExperiment, setAiWorkflowExperiment] = useState<SavedExperiment>();
  const [aiGuideOpen, setAiGuideOpen] = useState(false);
  const [textSetupHistory, setTextSetupHistory] = useState<TextExperimentSetupProvenance[]>([]);
  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({
    geographicBoundaries: true,
    terrain: false,
    atmosphere: false,
    grid: true
  });

  const openHelpPanel = useCallback((panelId: HelpPanelId): void => {
    setHelpCatalogOpen(false);
    setHelpPanelId(panelId);
  }, []);
  const openHelpCatalog = useCallback((): void => {
    setHelpPanelId(undefined);
    setHelpCatalogOpen(true);
  }, []);
  const closeHelp = useCallback((): void => {
    setHelpPanelId(undefined);
    setHelpCatalogOpen(false);
  }, []);

  const {
    geodesic,
    effectiveDistanceKm,
    effectiveInputs,
    terrainProfile,
    experiment,
    context,
    runs,
    isCalculating
  } = useExperimentModelState({
    activeExperimentId,
    activeExperimentName,
    activeScenarioId,
    experimentObservedAtIso,
    inputs,
    atmosphereState,
    manualTerrainPoints
  });

  const {
    solarPosition,
    solarPositionPrediction,
    solarDayEventsResult,
    solarDayEventsPrediction,
    solarTimeOffsetResult,
    solarTimeOffsetPrediction,
    solarSeasonEventsResult,
    solarSeasonEventsPrediction,
    solarRouteComparisonCalculation,
    solarRouteComparisonResult,
    solarRouteComparisonPrediction,
    lunarPosition,
    lunarPositionPrediction,
    eclipseOverlapResult,
    eclipseOverlapPrediction,
    eclipseEventSearchSnapshotCurrent,
    eclipseEventSearchPrediction,
    shadowObservationResult,
    shadowObservationPrediction,
    dualShadowComparisonResult,
    dualShadowComparisonPrediction,
    stellarObservationResult,
    stellarObservationPrediction
  } = useAstronomyCalculations({
    activeExperimentId,
    activeScenarioId,
    experimentObservedAtIso,
    observationUtcOffsetMinutes,
    inputs,
    eclipseEventSearchSnapshot,
    shadowObservationSettings,
    dualShadowSettings,
    stellarObservationSettings,
    stellarLocalHorizonSource,
    stellarMotionSource
  });

  useEffect(() => {
    void window.simulatorDesktop.listExperiments()
      .then(setSavedExperiments)
      .catch((error: unknown) => {
        setStorageMessage(error instanceof Error ? error.message : 'Kayıtlar okunamadı.');
      });
  }, []);

  const modelInputUncertaintyDefined = hasDefinedModelInputUncertainty(photoModelUncertainty);

  useEffect(() => {
    if (!photoCalibrationRecord || !modelInputUncertaintyDefined || runs.length === 0) {
      setModelAngularUncertaintyById({});
      setIsAngularUncertaintyCalculating(false);
      setModelUncertaintyError(undefined);
      return;
    }

    let cancelled = false;
    setIsAngularUncertaintyCalculating(true);
    setModelUncertaintyError(undefined);
    const timer = window.setTimeout(() => {
      void Promise.all(simulationModels.map(async (model) => {
        const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
        if (!run || run.prediction.status === 'unsupported') return undefined;
        const result = await propagateModelAngularUncertainty({
          model,
          baselinePrediction: run.prediction,
          experiment,
          context,
          settings: photoModelUncertainty
        });
        return [model.metadata.id, result] as const;
      })).then((entries) => {
        if (cancelled) return;
        setModelAngularUncertaintyById(Object.fromEntries(
          entries.filter((entry): entry is readonly [string, ModelAngularUncertaintyResult] => entry !== undefined)
        ));
        setIsAngularUncertaintyCalculating(false);
      }).catch((error: unknown) => {
        if (cancelled) return;
        setModelAngularUncertaintyById({});
        setModelUncertaintyError(error instanceof Error ? error.message : 'Model belirsizliği yayılamadı.');
        setIsAngularUncertaintyCalculating(false);
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [context, experiment, modelInputUncertaintyDefined, photoCalibrationRecord, photoModelUncertainty, runs]);

  const modelUncertaintyReady = !photoCalibrationRecord || !modelInputUncertaintyDefined || (
    !isAngularUncertaintyCalculating &&
    modelUncertaintyError === undefined &&
    runs.filter((run) => run.prediction.status !== 'unsupported').every(
      (run) => modelAngularUncertaintyById[run.metadata.id] !== undefined
    )
  );

  const photoReferenceKind = normalizePhotoReferenceKind(photoCalibration?.referenceKind);
  const photoAngularComparisons = useMemo(() => {
    if (!photoCalibrationRecord || !modelUncertaintyReady) return [];
    return runs.map((run) => comparePhotoAngularObservation({
      experimentId: activeExperimentId,
      sourceModelId: run.metadata.id,
      sourceModelName: run.metadata.name,
      modelPrediction: run.prediction,
      photoPrediction: photoCalibrationRecord.prediction,
      referenceKind: photoReferenceKind,
      ...(modelInputUncertaintyDefined && modelAngularUncertaintyById[run.metadata.id]
        ? { modelUncertainty: modelAngularUncertaintyById[run.metadata.id] }
        : {})
    }));
  }, [activeExperimentId, modelAngularUncertaintyById, modelInputUncertaintyDefined, modelUncertaintyReady, photoCalibrationRecord, photoReferenceKind, runs]);

  const markTerrainSourceModified = (): void => {
    setTerrainProfileSource((current) => current
      ? { ...current, modifiedAfterImport: true }
      : current);
  };

  const markGeoidConversionModified = (): void => {
    const warning = 'Jeoit dönüşümünden sonra datum veya arazi kotları değiştirildi; kayıt tarihsel işlem provenansı olarak korunuyor.';
    setGeoidConversionRecord((current) => current
      ? {
          ...current,
          prediction: {
            ...current.prediction,
            status: 'indeterminate',
            warnings: current.prediction.warnings.includes(warning)
              ? current.prediction.warnings
              : [...current.prediction.warnings, warning]
          }
        }
      : current);
  };

  const markWaterApplicationModified = (): void => {
    setWaterApplicationRecord((current) => markWaterSurfaceApplicationHistorical(current));
  };

  const updateInputs = (updater: (current: SimulatorInputs) => SimulatorInputs): void => {
    setInputs(updater);
    setIsDirty(true);
  };

  const applyTextExperimentSetup = (application: ExperimentSetupApplication): void => {
    const nextScenario = application.scenarioId;
    const scenarioChanged = nextScenario !== undefined && nextScenario !== activeScenarioId;
    const changed = application.inputChanges;
    const terrainRelevant = changed.surfaceDistanceKm !== undefined || changed.distanceSource !== undefined ||
      changed.observerLatitudeDeg !== undefined || changed.observerLongitudeDeg !== undefined ||
      changed.targetLatitudeDeg !== undefined || changed.targetLongitudeDeg !== undefined ||
      changed.observerGroundElevationM !== undefined || changed.targetGroundElevationM !== undefined;
    const verticalRelevant = changed.verticalDatumKind !== undefined || changed.verticalDatumOffsetM !== undefined ||
      changed.observerGroundElevationM !== undefined || changed.targetGroundElevationM !== undefined;

    if (terrainRelevant) markTerrainSourceModified();
    if (verticalRelevant) {
      markGeoidConversionModified();
      markWaterApplicationModified();
    }

    if (scenarioChanged && nextScenario) {
      setActiveScenarioId(nextScenario);
      setActiveExperimentId(crypto.randomUUID());
      setActiveExperimentName('');
      setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });
      setDualShadowSettings(undefined);
      setStellarObservationSettings({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS });
      setStellarLocalHorizonSource(undefined);
      setStellarMotionSource(undefined);
      setEclipseEventSearchSnapshot(undefined);
      setExperimentObservedAtIso(new Date().toISOString());
      setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
      setGeoidConversionRecord(undefined);
      setWaterObservationRecord(undefined);
      setWaterApplicationRecord(undefined);
      setPhotoCalibration(undefined);
      setPhotoCalibrationRecord(undefined);
      setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS, ...application.modelUncertaintyChanges });
      setModelAngularUncertaintyById({});
      setModelUncertaintyError(undefined);
      setTextSetupHistory([application.provenance]);
    } else {
      if (Object.keys(application.modelUncertaintyChanges).length > 0) {
        setPhotoModelUncertainty((current) => ({ ...current, ...application.modelUncertaintyChanges }));
      }
      setTextSetupHistory((current) => [...current, application.provenance].slice(-50));
    }

    setInputs((current) => ({ ...current, ...application.inputChanges }));
    if (application.atmosphereMode) {
      setAtmosphereState((current) => ({ ...current, mode: application.atmosphereMode! }));
    }
    if (application.experimentName !== undefined) setActiveExperimentName(application.experimentName);
    if (application.observedAtIso !== undefined) setExperimentObservedAtIso(application.observedAtIso);
    if (application.utcOffsetMinutes !== undefined) setObservationUtcOffsetMinutes(application.utcOffsetMinutes);
    if (application.shadowSettingsChanges) {
      setShadowObservationSettings((current) => ({ ...current, ...application.shadowSettingsChanges }));
    }
    if (application.dualShadowStationBChanges) {
      const baseLatitudeDeg = application.inputChanges.observerLatitudeDeg ?? inputs.observerLatitudeDeg;
      const baseLongitudeDeg = application.inputChanges.observerLongitudeDeg ?? inputs.observerLongitudeDeg;
      setDualShadowSettings((current) => ({
        stationB: {
          ...(current?.stationB ?? createDefaultDualShadowComparisonSettings(baseLatitudeDeg, baseLongitudeDeg).stationB),
          ...application.dualShadowStationBChanges
        }
      }));
    }
    if (application.stellarSettingsChanges) {
      const manualHorizonChanged = application.stellarSettingsChanges.localHorizonEnabled !== undefined ||
        application.stellarSettingsChanges.localHorizonNorthDeg !== undefined ||
        application.stellarSettingsChanges.localHorizonNorthEastDeg !== undefined ||
        application.stellarSettingsChanges.localHorizonEastDeg !== undefined ||
        application.stellarSettingsChanges.localHorizonSouthEastDeg !== undefined ||
        application.stellarSettingsChanges.localHorizonSouthDeg !== undefined ||
        application.stellarSettingsChanges.localHorizonSouthWestDeg !== undefined ||
        application.stellarSettingsChanges.localHorizonWestDeg !== undefined ||
        application.stellarSettingsChanges.localHorizonNorthWestDeg !== undefined;
      setStellarObservationSettings((current) => ({
        ...current,
        ...application.stellarSettingsChanges,
        ...(manualHorizonChanged ? { localHorizonSourceMode: 'manual' as const } : {})
      }));
      if (manualHorizonChanged) setStellarLocalHorizonSource(undefined);
    }
    if (application.eclipseSearchHalfWindowHours !== undefined) {
      setEclipseSearchHalfWindowHours(application.eclipseSearchHalfWindowHours);
    }
    setIsDirty(true);
    const count = application.provenance.appliedFields.length;
    setStorageMessage(`Metinden hazırlanan taslaktan ${count} alan uygulandı.`);
  };

  const updateTerrainPoints = (points: ManualTerrainPoint[]): void => {
    setManualTerrainPoints(points);
    markTerrainSourceModified();
    markGeoidConversionModified();
    setIsDirty(true);
  };

  const applyGeoidConversion = (application: GeoidConversionApplication): void => {
    markWaterApplicationModified();
    setInputs((current) => ({
      ...current,
      verticalDatumKind: application.targetDatum,
      observerGroundElevationM: application.observerGroundElevationM,
      targetGroundElevationM: application.targetGroundElevationM
    }));
    setManualTerrainPoints(application.points);
    setGeoidConversionRecord({
      prediction: application.prediction,
      modelVersion: application.modelVersion
    });
    markTerrainSourceModified();
    setIsDirty(true);
    setStorageMessage(
      `Bütün zemin ve arazi kotları ${datumLabels[application.targetDatum]} datumuna dönüştürüldü; provenans kayda hazır.`
    );
  };

  const recordWaterSurface = (record: WaterSurfaceObservationRecord): void => {
    setWaterObservationRecord({
      prediction: record.prediction,
      modelVersion: record.modelVersion
    });
    setWaterApplicationRecord(undefined);
    setIsDirty(true);
    setStorageMessage('Su yüzeyi gözlem kaydı deneye eklendi.');
  };

  const applyWaterSurface = (result: WaterSurfaceApplicationResult): void => {
    setInputs((current) => ({
      ...current,
      observerGroundElevationM: result.observerGroundElevationM,
      targetGroundElevationM: result.targetGroundElevationM
    }));
    setWaterApplicationRecord({
      prediction: result.prediction,
      modelVersion: result.modelVersion
    });
    markTerrainSourceModified();
    markGeoidConversionModified();
    setIsDirty(true);
    setStorageMessage(`Su yüzeyi ${numberFormatter.format(result.appliedWaterSurfaceM)} m olarak seçilen uçlara uygulandı.`);
  };

  const handleNumberChange = (key: NumericInputKey, value: number): void => {
    if (!Number.isFinite(value)) return;
    if (key === 'observerGroundElevationM' ||
      key === 'targetGroundElevationM' ||
      key === 'surfaceDistanceKm' ||
      key === 'observerLatitudeDeg' ||
      key === 'observerLongitudeDeg' ||
      key === 'targetLatitudeDeg' ||
      key === 'targetLongitudeDeg') {
      markTerrainSourceModified();
    }
    if (key === 'observerGroundElevationM' || key === 'targetGroundElevationM') {
      markGeoidConversionModified();
      markWaterApplicationModified();
    }
    if (key === 'verticalDatumOffsetM') {
      markWaterApplicationModified();
    }
    updateInputs((current) => ({ ...current, [key]: clampInputValue(key, value) }));
  };

  const applyTerrainImport = (
    profile: TerrainProfileImport,
    options: TerrainProfileImportOptions
  ): void => {
    const appliedRouteCoordinates = Boolean(
      options.applyRouteCoordinates && isImportedGeoJsonTerrainProfile(profile)
    );
    const appliedRouteDistance = Boolean(
      !appliedRouteCoordinates &&
      options.applyRouteDistance &&
      inputs.distanceSource === 'manual' &&
      profile.sourceDistanceM !== null
    );
    const commonSource = {
      fileName: profile.fileName,
      importedAtIso: new Date().toISOString(),
      sourceDistanceM: profile.sourceDistanceM,
      observerEndpointElevationM: profile.observerEndpointElevationM,
      targetEndpointElevationM: profile.targetEndpointElevationM,
      appliedObserverEndpoint: options.applyObserverEndpoint,
      appliedTargetEndpoint: options.applyTargetEndpoint,
      appliedRouteDistance,
      appliedRouteCoordinates,
      ...(profile.fileSizeBytes !== undefined && profile.sha256 !== undefined
        ? { fileSizeBytes: profile.fileSizeBytes, sha256: profile.sha256 }
        : {}),
      modifiedAfterImport: false
    };
    const source: TerrainProfileSource = isImportedDemTerrainProfile(profile)
      ? {
          ...commonSource,
          kind: 'dem',
          format: profile.format,
          samplingMethod: profile.samplingMethod,
          geodesicMethod: profile.geodesicMethod,
          columnCount: profile.columnCount,
          rowCount: profile.rowCount,
          sampleCount: profile.sampleCount,
          sampleCountMode: profile.sampleCountMode,
          sampleSpacingM: profile.sampleSpacingM,
          cellSizeDeg: profile.cellSizeDeg,
          noDataValue: profile.noDataValue,
          westBoundaryDeg: profile.westBoundaryDeg,
          eastBoundaryDeg: profile.eastBoundaryDeg,
          southBoundaryDeg: profile.southBoundaryDeg,
          northBoundaryDeg: profile.northBoundaryDeg,
          diagnosticStatus: profile.diagnosticStatus,
          effectiveCellSpanM: profile.effectiveCellSpanM,
          sampleSpacingToCellRatio: profile.sampleSpacingToCellRatio,
          minimumCoverageMarginM: profile.minimumCoverageMarginM,
          coverageMarginCellRatio: profile.coverageMarginCellRatio,
          minimumElevationM: profile.minimumElevationM,
          maximumElevationM: profile.maximumElevationM,
          elevationRangeM: profile.elevationRangeM
        }
      : isImportedGeoJsonTerrainProfile(profile)
        ? {
            ...commonSource,
            kind: 'geojson',
            geometryType: profile.geometryType,
            coordinateCount: profile.coordinateCount,
            startLongitudeDeg: profile.startLongitudeDeg,
            startLatitudeDeg: profile.startLatitudeDeg,
            endLongitudeDeg: profile.endLongitudeDeg,
            endLatitudeDeg: profile.endLatitudeDeg,
            elevationSource: profile.elevationSource
          }
        : {
            ...commonSource,
            kind: 'csv',
            delimiter: profile.delimiter,
            distanceUnit: profile.distanceUnit,
            rowCount: profile.rowCount,
            distanceColumnHeader: profile.distanceColumnHeader,
            elevationColumnHeader: profile.elevationColumnHeader
          };

    if (options.applyObserverEndpoint || options.applyTargetEndpoint) {
      markWaterApplicationModified();
    }
    setManualTerrainPoints(profile.points);
    setInputs((current) => applyImportedTerrainInputs(current, profile, options));
    setTerrainProfileSource(source);
    setGeoidConversionRecord(undefined);
    setIsDirty(true);
  };

  const importStellarLocalHorizon = async (): Promise<SavedStellarLocalHorizonSource | undefined> => {
    try {
      const result = await window.simulatorDesktop.importStellarLocalHorizon();
      setStorageMessage(result.message);
      if (result.status !== 'success' || !result.profile) return undefined;
      const nextSource: SavedStellarLocalHorizonSource = {
        ...result.profile,
        points: result.profile.points.map((point) => ({ ...point })),
        warnings: [...result.profile.warnings],
        modifiedAfterImport: false
      };
      setStorageMessage(`“${nextSource.fileName}” skyline kaynağı taslak olarak hazır: ${nextSource.pointCount} nokta doğrulandı. Uygula ve hesapla ile etkinleştirilebilir.`);
      return nextSource;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Skyline profili içe aktarılamadı.';
      setStorageMessage(message);
      throw error;
    }
  };

  const importStellarMotionSource = async (): Promise<SavedStellarMotionSource | undefined> => {
    try {
      const result = await window.simulatorDesktop.importStellarMotionSource();
      setStorageMessage(result.message);
      if (result.status !== 'success' || !result.source) return undefined;
      const source: SavedStellarMotionSource = {
        ...result.source,
        entries: result.source.entries.map((entry) => ({ ...entry }))
      };
      setStorageMessage(`“${source.fileName}” proper-motion kaynağı taslak olarak hazır: ${source.entryCount}/19 kayıt doğrulandı. Uygula ve hesapla ile etkinleştirilebilir.`);
      return source;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'BSC5P proper-motion kaynağı içe aktarılamadı.';
      setStorageMessage(message);
      throw error;
    }
  };

  const loadExperiment = (saved: SavedExperiment): void => {
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
    const storedStellarSettings = readStellarObservationSettings(stellarPrediction);
    const storedStellarSource = saved.stellarLocalHorizonSource
      ? {
          ...saved.stellarLocalHorizonSource,
          points: saved.stellarLocalHorizonSource.points.map((point) => ({ ...point })),
          warnings: [...saved.stellarLocalHorizonSource.warnings],
          ...(saved.stellarLocalHorizonSource.demDerivation
            ? { demDerivation: { ...saved.stellarLocalHorizonSource.demDerivation } }
            : {}),
          ...(saved.stellarLocalHorizonSource.panoramaDerivation
            ? { panoramaDerivation: {
                ...saved.stellarLocalHorizonSource.panoramaDerivation,
                geometry: { ...saved.stellarLocalHorizonSource.panoramaDerivation.geometry },
                marks: saved.stellarLocalHorizonSource.panoramaDerivation.marks.map((mark) => ({ ...mark }))
              } }
            : {})
        }
      : undefined;
    const safeStellarSettings = storedStellarSettings.localHorizonSourceMode === 'external' && !storedStellarSource
      ? { ...storedStellarSettings, localHorizonEnabled: false, localHorizonSourceMode: 'manual' as const }
      : storedStellarSettings;
    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));
    setShadowObservationSettings(readShadowObservationSettings(shadowPrediction));
    setDualShadowSettings(readDualShadowComparisonSettings(dualShadowPrediction));
    setStellarObservationSettings(safeStellarSettings);
    setStellarLocalHorizonSource(storedStellarSource);
    setStellarMotionSource(saved.stellarMotionSource
      ? { ...saved.stellarMotionSource, entries: saved.stellarMotionSource.entries.map((entry) => ({ ...entry })) }
      : undefined);
    setEclipseEventSearchSnapshot(readSolarEclipseEventSearchSnapshot(eclipseEventPrediction));
    setInputs(saved.inputs);
    setAtmosphereState(saved.atmosphere
      ? cloneAtmosphereExperimentState(saved.atmosphere)
      : atmosphereStateFromLegacyStandardFlag(saved.inputs.useStandardRefraction));
    setManualTerrainPoints(saved.manualTerrainPoints ?? defaultTerrainPoints(saved.inputs));
    setTerrainProfileSource(saved.terrainProfileSource);
    setGeoidConversionRecord(geoidPrediction
      ? {
          prediction: geoidPrediction,
          modelVersion: saved.modelVersions[GEOID_CONVERSION_MODEL_ID] ?? 'bilinmiyor'
        }
      : undefined);
    setWaterObservationRecord(storedWater.observation);
    setWaterApplicationRecord(storedWater.application);
    setPhotoCalibration(saved.photoCalibration);
    setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
    setTextSetupHistory(saved.textSetupHistory ?? []);
    setPhotoCalibrationRecord(photoPrediction
      ? {
          prediction: photoPrediction,
          modelVersion: saved.modelVersions[PHOTO_CALIBRATION_MODEL_ID] ?? PHOTO_CALIBRATION_MODEL_VERSION
        }
      : undefined);
    setActiveExperimentId(saved.id);
    setActiveExperimentName(saved.name);
    setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);
    setObservationUtcOffsetMinutes(saved.observationUtcOffsetMinutes ?? systemUtcOffsetMinutes(new Date(saved.observedAtIso ?? saved.createdAtIso)));
    setIsDirty(false);
    setStorageMessage(`“${saved.name}” açıldı.`);
  };

  const buildActiveExperimentRecord = (name: string, now = new Date().toISOString()): SavedExperiment => {
    const existing = savedExperiments.find((item) => item.id === activeExperimentId);
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
        [geodesicMetadata.id, geodesicMetadata.version],
        ...(solarPositionPrediction
          ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const]
          : []),
        ...(solarDayEventsPrediction
          ? [[solarDayEventsMetadata.id, solarDayEventsMetadata.version] as const]
          : []),
        ...(solarTimeOffsetPrediction
          ? [[solarTimeOffsetMetadata.id, solarTimeOffsetMetadata.version] as const]
          : []),
        ...(solarSeasonEventsPrediction
          ? [[solarSeasonEventsMetadata.id, solarSeasonEventsMetadata.version] as const]
          : []),
        ...(solarRouteComparisonPrediction
          ? [[solarRouteComparisonMetadata.id, solarRouteComparisonMetadata.version] as const]
          : []),
        ...(lunarPositionPrediction
          ? [[lunarPositionMetadata.id, lunarPositionMetadata.version] as const]
          : []),
        ...(eclipseOverlapPrediction
          ? [[solarEclipseOverlapMetadata.id, solarEclipseOverlapMetadata.version] as const]
          : []),
        ...(eclipseEventSearchPrediction
          ? [[solarEclipseEventSearchMetadata.id, solarEclipseEventSearchMetadata.version] as const]
          : []),
        ...(shadowObservationPrediction
          ? [[shadowObservationMetadata.id, shadowObservationMetadata.version] as const]
          : []),
        ...(dualShadowComparisonPrediction
          ? [[dualShadowComparisonMetadata.id, dualShadowComparisonMetadata.version] as const]
          : []),
        ...(stellarObservationPrediction
          ? [[stellarObservationMetadata.id, stellarObservationMetadata.version] as const]
          : []),
        ...(geoidConversionRecord
          ? [[GEOID_CONVERSION_MODEL_ID, geoidConversionRecord.modelVersion] as const]
          : []),
        ...(waterObservationRecord
          ? [[WATER_SURFACE_OBSERVATION_MODEL_ID, waterObservationRecord.modelVersion] as const]
          : []),
        ...(waterApplicationRecord
          ? [[WATER_SURFACE_APPLICATION_MODEL_ID, waterApplicationRecord.modelVersion] as const]
          : []),
        ...(photoCalibrationRecord
          ? [[PHOTO_CALIBRATION_MODEL_ID, photoCalibrationRecord.modelVersion] as const]
          : []),
        ...photoAngularComparisons.map((comparison) => [
          comparison.prediction.modelId,
          PHOTO_ANGULAR_COMPARISON_MODEL_VERSION
        ] as const)
      ]),
      predictions: [
        ...(solarPositionPrediction ? [solarPositionPrediction] : []),
        ...(solarDayEventsPrediction ? [solarDayEventsPrediction] : []),
        ...(solarTimeOffsetPrediction ? [solarTimeOffsetPrediction] : []),
        ...(solarSeasonEventsPrediction ? [solarSeasonEventsPrediction] : []),
        ...(solarRouteComparisonPrediction ? [solarRouteComparisonPrediction] : []),
        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),
        ...(eclipseOverlapPrediction ? [eclipseOverlapPrediction] : []),
        ...(eclipseEventSearchPrediction ? [eclipseEventSearchPrediction] : []),
        ...(shadowObservationPrediction ? [shadowObservationPrediction] : []),
        ...(dualShadowComparisonPrediction ? [dualShadowComparisonPrediction] : []),
        ...(stellarObservationPrediction ? [stellarObservationPrediction] : []),
        ...runs.map((run) => run.prediction),
        ...(geoidConversionRecord ? [geoidConversionRecord.prediction] : []),
        ...(waterObservationRecord ? [waterObservationRecord.prediction] : []),
        ...(waterApplicationRecord ? [waterApplicationRecord.prediction] : []),
        ...(photoCalibrationRecord ? [photoCalibrationRecord.prediction] : []),
        ...photoAngularComparisons.map((comparison) => comparison.prediction)
      ]
    };
  };

  const saveExperiment = async (name: string): Promise<void> => {
    if (!modelUncertaintyReady) {
      setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan deney kaydedilmedi.');
      return;
    }
    const record = buildActiveExperimentRecord(name);

    try {
      const saved = await window.simulatorDesktop.saveExperiment(record);
      const savedGeoidPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === GEOID_CONVERSION_MODEL_ID
      );
      const savedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);
      const savedPhotoPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID
      );
      const savedShadowPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID
      );
      const savedDualShadowPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID
      );
      const savedStellarPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID
      );
      const savedEclipseEventPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === solarEclipseEventSearchMetadata.id
      );
      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setActiveExperimentId(saved.id);
      setActiveExperimentName(saved.name);
      setShadowObservationSettings(readShadowObservationSettings(savedShadowPrediction));
      setDualShadowSettings(readDualShadowComparisonSettings(savedDualShadowPrediction));
      {
        const reopenedStellarSettings = readStellarObservationSettings(savedStellarPrediction);
        const reopenedStellarSource = saved.stellarLocalHorizonSource
          ? {
              ...saved.stellarLocalHorizonSource,
              points: saved.stellarLocalHorizonSource.points.map((point) => ({ ...point })),
              warnings: [...saved.stellarLocalHorizonSource.warnings],
              ...(saved.stellarLocalHorizonSource.demDerivation
                ? { demDerivation: { ...saved.stellarLocalHorizonSource.demDerivation } }
                : {}),
              ...(saved.stellarLocalHorizonSource.panoramaDerivation
                ? { panoramaDerivation: {
                    ...saved.stellarLocalHorizonSource.panoramaDerivation,
                    geometry: { ...saved.stellarLocalHorizonSource.panoramaDerivation.geometry },
                    marks: saved.stellarLocalHorizonSource.panoramaDerivation.marks.map((mark) => ({ ...mark }))
                  } }
                : {})
            }
          : undefined;
        setStellarLocalHorizonSource(reopenedStellarSource);
        setStellarMotionSource(saved.stellarMotionSource
          ? { ...saved.stellarMotionSource, entries: saved.stellarMotionSource.entries.map((entry) => ({ ...entry })) }
          : undefined);
        setStellarObservationSettings(reopenedStellarSettings.localHorizonSourceMode === 'external' && !reopenedStellarSource
          ? { ...reopenedStellarSettings, localHorizonEnabled: false, localHorizonSourceMode: 'manual' }
          : reopenedStellarSettings);
      }
      setEclipseEventSearchSnapshot(readSolarEclipseEventSearchSnapshot(savedEclipseEventPrediction));
      setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);
    setObservationUtcOffsetMinutes(saved.observationUtcOffsetMinutes ?? systemUtcOffsetMinutes(new Date(saved.observedAtIso ?? saved.createdAtIso)));
      setAtmosphereState(saved.atmosphere
        ? cloneAtmosphereExperimentState(saved.atmosphere)
        : atmosphereStateFromLegacyStandardFlag(saved.inputs.useStandardRefraction));
      setManualTerrainPoints(saved.manualTerrainPoints ?? manualTerrainPoints);
      setTerrainProfileSource(saved.terrainProfileSource);
      setGeoidConversionRecord(savedGeoidPrediction
        ? {
            prediction: savedGeoidPrediction,
            modelVersion: saved.modelVersions[GEOID_CONVERSION_MODEL_ID] ??
              geoidConversionRecord?.modelVersion ?? 'bilinmiyor'
          }
        : undefined);
      setWaterObservationRecord(savedWater.observation);
      setWaterApplicationRecord(savedWater.application);
      setPhotoCalibration(saved.photoCalibration);
      setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
      setTextSetupHistory(saved.textSetupHistory ?? []);
      setPhotoCalibrationRecord(savedPhotoPrediction
        ? {
            prediction: savedPhotoPrediction,
            modelVersion: saved.modelVersions[PHOTO_CALIBRATION_MODEL_ID] ?? PHOTO_CALIBRATION_MODEL_VERSION
          }
        : undefined);
      setIsDirty(false);
      setSaveDialogOpen(false);
      setStorageMessage(`“${saved.name}” cihazda kaydedildi.`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney kaydedilemedi.');
    }
  };

  const deleteExperiment = async (saved: SavedExperiment): Promise<void> => {
    try {
      const deleted = await window.simulatorDesktop.deleteExperiment(saved.id);
      if (!deleted) return;
      setSavedExperiments((current) => current.filter((item) => item.id !== saved.id));
      if (activeExperimentId === saved.id) {
        setActiveExperimentId(crypto.randomUUID());
        setActiveExperimentName('');
        setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });
      setDualShadowSettings(undefined);
      setStellarObservationSettings({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS });
      setStellarLocalHorizonSource(undefined);
      setStellarMotionSource(undefined);
      setEclipseEventSearchSnapshot(undefined);
        setExperimentObservedAtIso(new Date().toISOString());
      setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
        setAtmosphereState(createDefaultAtmosphereExperimentState('standard'));
        setGeoidConversionRecord(undefined);
        setWaterObservationRecord(undefined);
        setWaterApplicationRecord(undefined);
        setPhotoCalibration(undefined);
        setPhotoCalibrationRecord(undefined);
        setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
        setTextSetupHistory([]);
        setModelAngularUncertaintyById({});
        setModelUncertaintyError(undefined);
        setIsDirty(true);
      }
      setStorageMessage(`“${saved.name}” silindi.`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney silinemedi.');
    }
  };

  const exportExperiment = async (saved: SavedExperiment): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.exportExperiment(saved.id);
      setStorageMessage(result.message);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney dışa aktarılamadı.');
    }
  };

  const importExperiment = async (): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.importExperiment();
      setStorageMessage(result.message);
      if (result.status !== 'success' || !result.experiment) return;
      setSavedExperiments((current) => [
        result.experiment as SavedExperiment,
        ...current.filter((item) => item.id !== result.experiment?.id)
      ]);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney içe aktarılamadı.');
    }
  };

  const exportReport = async (saved: SavedExperiment): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.exportExperimentReport(saved.id);
      setStorageMessage(result.message);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney raporu oluşturulamadı.');
    }
  };

  const modelRun = runs.find((run) => run.metadata.id === traceModelId);
  const geoPrediction = geodesicPrediction(geodesic);
  const selectedMetadata = traceModelId === solarEclipseOverlapMetadata.id
    ? solarEclipseOverlapMetadata
    : traceModelId === solarEclipseEventSearchMetadata.id
      ? solarEclipseEventSearchMetadata
      : traceModelId === stellarObservationMetadata.id
    ? stellarObservationMetadata
    : traceModelId === solarPositionMetadata.id
    ? solarPositionMetadata
    : traceModelId === solarDayEventsMetadata.id
      ? solarDayEventsMetadata
      : traceModelId === lunarPositionMetadata.id
      ? lunarPositionMetadata
      : traceModelId === shadowObservationMetadata.id
        ? shadowObservationMetadata
        : traceModelId === dualShadowComparisonMetadata.id
          ? dualShadowComparisonMetadata
          : traceModelId === geodesicMetadata.id
    ? geodesicMetadata
    : traceModelId === WATER_SURFACE_OBSERVATION_MODEL_ID
      ? waterObservationMetadata
      : traceModelId === WATER_SURFACE_APPLICATION_MODEL_ID
        ? waterApplicationMetadata
        : modelRun?.metadata;
  const selectedPrediction = traceModelId === solarEclipseOverlapMetadata.id
    ? eclipseOverlapPrediction
    : traceModelId === solarEclipseEventSearchMetadata.id
      ? eclipseEventSearchPrediction
      : traceModelId === stellarObservationMetadata.id
    ? stellarObservationPrediction
    : traceModelId === solarPositionMetadata.id
    ? solarPositionPrediction
    : traceModelId === solarDayEventsMetadata.id
      ? solarDayEventsPrediction
      : traceModelId === lunarPositionMetadata.id
      ? lunarPositionPrediction
      : traceModelId === shadowObservationMetadata.id
        ? shadowObservationPrediction
        : traceModelId === dualShadowComparisonMetadata.id
          ? dualShadowComparisonPrediction
          : traceModelId === geodesicMetadata.id
    ? geoPrediction
    : traceModelId === WATER_SURFACE_OBSERVATION_MODEL_ID
      ? waterObservationRecord?.prediction
      : traceModelId === WATER_SURFACE_APPLICATION_MODEL_ID
        ? waterApplicationRecord?.prediction
        : modelRun?.prediction;
  const idealSpherePrediction = runs.find(
    (run) => run.metadata.id === 'ideal-sphere'
  )?.prediction;
  const criticalTerrainDistanceM = getMetric(
    idealSpherePrediction,
    'terrainCriticalDistanceM'
  );

  const resetExperiment = (): void => {
    setInputs(DEFAULT_SIMULATOR_INPUTS);
    setAtmosphereState(createDefaultAtmosphereExperimentState('standard'));
    setManualTerrainPoints(defaultTerrainPoints());
    setTerrainProfileSource(undefined);
    setGeoidConversionRecord(undefined);
    setWaterObservationRecord(undefined);
    setWaterApplicationRecord(undefined);
    setPhotoCalibration(undefined);
    setPhotoCalibrationRecord(undefined);
    setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
    setTextSetupHistory([]);
    setModelAngularUncertaintyById({});
    setModelUncertaintyError(undefined);
    setActiveExperimentId(crypto.randomUUID());
    setActiveExperimentName('');
    setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });
      setDualShadowSettings(undefined);
      setStellarObservationSettings({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS });
      setStellarLocalHorizonSource(undefined);
      setStellarMotionSource(undefined);
      setEclipseEventSearchSnapshot(undefined);
    setExperimentObservedAtIso(new Date().toISOString());
    setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
    setIsDirty(false);
    setStorageMessage('Yeni deney hazırlandı.');
  };

  return (
    <HelpProvider onOpenPanel={openHelpPanel} onOpenCatalog={openHelpCatalog}>
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <button className="menu-button" type="button">☰</button>
          <strong>GEOMETRİK GÖZLEM LABORATUVARI</strong>
          <span className={isCalculating ? 'calculation-state busy' : 'calculation-state ready'}>
            {isCalculating ? 'Hesaplanıyor…' : 'Hesaplama hazır'}
          </span>
          {storageMessage && <span className="storage-message" title={storageMessage}>{storageMessage}</span>}
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => {
            setTextSetupInitialText('');
            setTextSetupOpen(true);
          }}>✦ Metinden Hazırla</button>
          <button type="button" onClick={() => {
            if (isCalculating) {
              setStorageMessage('Hesaplama tamamlanmadan AI paketi hazırlanmadı.');
              return;
            }
            if (!modelUncertaintyReady) {
              setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan AI paketi hazırlanmadı.');
              return;
            }
            setAiWorkflowExperiment(buildActiveExperimentRecord(
              activeExperimentName || defaultExperimentName(activeScenarioId)
            ));
          }}>◇ AI ile Analiz</button>
          <button type="button" onClick={() => setAiGuideOpen(true)}>▧ AI Kılavuzu</button>
          <button type="button" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>
          <button disabled title="Ayarlar modülü sonraki aşamada" type="button">⚙ Ayarlar</button>
          <button type="button" onClick={openHelpCatalog}>ⓘ Yardım</button>
        </div>
      </header>

      <div className="workspace">
        <Sidebar
          experiments={savedExperiments}
          activeScenarioId={activeScenarioId}
          atmosphereMode={atmosphereState.mode}
          visualLayers={visualLayers}
          observedAtIso={experimentObservedAtIso}
          observationUtcOffsetMinutes={observationUtcOffsetMinutes}
          onObservationTimeChange={(observedAtIso, utcOffsetMinutes) => {
            setExperimentObservedAtIso(observedAtIso);
            setObservationUtcOffsetMinutes(utcOffsetMinutes);
            setIsDirty(true);
          }}
          onScenarioChange={(scenarioId) => {
            if (scenarioId === activeScenarioId) return;
            setActiveScenarioId(scenarioId);
            setActiveExperimentId(crypto.randomUUID());
            setActiveExperimentName('');
            setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });
      setDualShadowSettings(undefined);
      setStellarObservationSettings({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS });
      setStellarLocalHorizonSource(undefined);
      setStellarMotionSource(undefined);
      setEclipseEventSearchSnapshot(undefined);
            setExperimentObservedAtIso(new Date().toISOString());
      setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
            setGeoidConversionRecord(undefined);
            setWaterObservationRecord(undefined);
            setWaterApplicationRecord(undefined);
            setPhotoCalibration(undefined);
            setPhotoCalibrationRecord(undefined);
            setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
            setTextSetupHistory([]);
            setModelAngularUncertaintyById({});
            setModelUncertaintyError(undefined);
            setIsDirty(false);
            setStorageMessage(`${getSimulationScenario(scenarioId).label} senaryosu hazırlandı.`);
          }}
          onLoadExperiment={loadExperiment}
          onVisualLayerChange={(key, enabled) => {
            setVisualLayers((current) => ({ ...current, [key]: enabled }));
          }}
        />
        <main className="main-content">
          <div className="top-grid geodesic-top-grid">
            {activeScenarioId === 'sun-moon-observation' ? (
              <SolarScenarioSummary
                activeName={activeExperimentName}
                inputs={inputs}
                isDirty={isDirty}
                onCoordinateChange={(key, value) => handleNumberChange(key, value)}
                onReset={resetExperiment}
                onSave={() => setSaveDialogOpen(true)}
              />
            ) : activeScenarioId === 'eclipse-simulation' ? (
              <EclipseScenarioSummary
                activeName={activeExperimentName}
                inputs={inputs}
                isDirty={isDirty}
                onCoordinateChange={(key, value) => handleNumberChange(key, value)}
                onReset={resetExperiment}
                onSave={() => setSaveDialogOpen(true)}
              />
            ) : activeScenarioId === 'stellar-observation' ? (
              <StellarScenarioSummary
                activeName={activeExperimentName}
                inputs={inputs}
                isDirty={isDirty}
                onCoordinateChange={(key, value) => handleNumberChange(key, value)}
                onReset={resetExperiment}
                onSave={() => setSaveDialogOpen(true)}
              />
            ) : activeScenarioId === 'shadow-observation' ? (
              <ShadowScenarioSummary
                activeName={activeExperimentName}
                inputs={inputs}
                isDirty={isDirty}
                onCoordinateChange={(key, value) => handleNumberChange(key, value)}
                onReset={resetExperiment}
                onSave={() => setSaveDialogOpen(true)}
              />
            ) : (
            <ScenarioSummary
              scenarioId={activeScenarioId}
              activeName={activeExperimentName}
              inputs={inputs}
              atmosphereMode={atmosphereState.mode}
              effectiveDistanceKm={effectiveDistanceKm}
              geodesic={geodesic}
              isDirty={isDirty}
              onDistanceSourceChange={(distanceSource) => {
                markTerrainSourceModified();
                updateInputs((current) => ({ ...current, distanceSource }));
              }}
              onDatumChange={(verticalDatumKind) => {
                markGeoidConversionModified();
                markWaterApplicationModified();
                updateInputs((current) => ({ ...current, verticalDatumKind }));
              }}
              onNumberChange={handleNumberChange}
              onReset={resetExperiment}
              onSave={() => setSaveDialogOpen(true)}
              onShowGeodesicTrace={() => setTraceModelId(geodesicMetadata.id)}
            />
            )}
            {activeScenarioId === 'sun-moon-observation' && solarPosition && lunarPosition && solarDayEventsResult
              ? <>
                  <div className="celestial-reference-stack">
                    <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />
                    <LunarPositionPanel result={lunarPosition} onShowTrace={() => setTraceModelId(lunarPositionMetadata.id)} />
                  </div>
                  <SolarDayEventsPanel
                    result={solarDayEventsResult}
                    solarTimeResult={solarTimeOffsetResult!}
                    seasonResult={solarSeasonEventsResult}
                    routeResult={solarRouteComparisonResult}
                    routeError={solarRouteComparisonCalculation.error}
                    routeEndLatitudeDeg={inputs.targetLatitudeDeg}
                    routeEndLongitudeDeg={inputs.targetLongitudeDeg}
                    onRouteEndCoordinateChange={(key, value) => handleNumberChange(
                      key === 'latitude' ? 'targetLatitudeDeg' : 'targetLongitudeDeg',
                      value
                    )}
                    onShowTrace={() => setTraceModelId(solarDayEventsMetadata.id)}
                  />
                </>
              : activeScenarioId === 'eclipse-simulation' && solarPosition && lunarPosition && eclipseOverlapPrediction
              ? <EclipseSimulationPanel
                  solarPosition={solarPosition}
                  lunarPosition={lunarPosition}
                  eventSearchSnapshot={eclipseEventSearchSnapshot}
                  eventSearchHalfWindowHours={eclipseSearchHalfWindowHours}
                  onEventSearchHalfWindowHoursChange={setEclipseSearchHalfWindowHours}
                  onEventSearchSnapshotChange={(snapshot) => {
                    setEclipseEventSearchSnapshot(snapshot);
                    setIsDirty(true);
                  }}
                  onShowOverlapTrace={() => setTraceModelId(solarEclipseOverlapMetadata.id)}
                  onShowEventSearchTrace={() => setTraceModelId(solarEclipseEventSearchMetadata.id)}
                />
              : activeScenarioId === 'stellar-observation' && stellarObservationResult && stellarObservationPrediction
              ? <StellarObservationPanel
                  result={stellarObservationResult}
                  prediction={stellarObservationPrediction}
                  settings={stellarObservationSettings}
                  observerHeightM={inputs.observerHeightM}
                  externalLocalHorizonSource={stellarLocalHorizonSource}
                  stellarMotionSource={stellarMotionSource}
                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}
                  onImportLocalHorizon={importStellarLocalHorizon}
                  onImportStellarMotion={importStellarMotionSource}
                  onApplyStellarMotion={(source) => {
                    setStellarMotionSource(source);
                    setIsDirty(true);
                  }}
                  onApplyLocalHorizon={(settings, source) => {
                    setStellarObservationSettings(settings);
                    setStellarLocalHorizonSource(source);
                    setIsDirty(true);
                  }}
                  onShowTrace={() => setTraceModelId(stellarObservationMetadata.id)}
                />
              : activeScenarioId === 'shadow-observation' && shadowObservationResult && shadowObservationPrediction
              ? <>
                  <ShadowObservationPanel
                    result={shadowObservationResult}
                    prediction={shadowObservationPrediction}
                    settings={shadowObservationSettings}
                    onChange={(settings) => { setShadowObservationSettings(settings); setIsDirty(true); }}
                    onShowTrace={() => setTraceModelId(shadowObservationMetadata.id)}
                  />
                  <DualShadowComparisonPanel
                    primaryResult={shadowObservationResult}
                    settings={dualShadowSettings}
                    result={dualShadowComparisonResult}
                    prediction={dualShadowComparisonPrediction}
                    onEnable={() => {
                      setDualShadowSettings(createDefaultDualShadowComparisonSettings(inputs.observerLatitudeDeg, inputs.observerLongitudeDeg));
                      setIsDirty(true);
                    }}
                    onDisable={() => { setDualShadowSettings(undefined); setIsDirty(true); }}
                    onChange={(settings) => { setDualShadowSettings(settings); setIsDirty(true); }}
                    onShowTrace={() => setTraceModelId(dualShadowComparisonMetadata.id)}
                  />
                </>
              : activeScenarioId === 'horizon'
              ? <HorizonReferencePanel inputs={inputs} atmosphereMode={atmosphereState.mode} />
              : <ObservationPanel inputs={inputs} />}
          </div>

          {activeScenarioId !== 'horizon' && !isAstronomyScenario(activeScenarioId) && (
            <PhotoCalibrationControl
              key={activeExperimentId}
              experimentId={activeExperimentId}
              savedCalibration={photoCalibration}
              savedPrediction={photoCalibrationRecord?.prediction}
              onSave={(calibration: SavedPhotoCalibration, record: PhotoCalibrationRecord) => {
                setPhotoCalibration(calibration);
                setPhotoCalibrationRecord({
                  prediction: record.prediction,
                  modelVersion: record.modelVersion
                });
                setIsDirty(true);
                setStorageMessage('Fotoğraf kalibrasyonu deneye eklendi.');
              }}
              onClear={() => {
                setPhotoCalibration(undefined);
                setPhotoCalibrationRecord(undefined);
                setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
                setTextSetupHistory([]);
                setModelAngularUncertaintyById({});
                setModelUncertaintyError(undefined);
                setIsDirty(true);
              }}
            />
          )}

          {!isAstronomyScenario(activeScenarioId) && <AtmosphereProfileControl
            state={atmosphereState}
            standardRefractionCoefficient={inputs.refractionCoefficient}
            onChange={(nextState) => {
              setAtmosphereState(nextState);
              setInputs((current) => ({
                ...current,
                useStandardRefraction: nextState.mode === 'standard'
              }));
              setIsDirty(true);
            }}
          />}

          {activeScenarioId !== 'horizon' && !isAstronomyScenario(activeScenarioId) && <TerrainPanel
            experimentId={activeExperimentId}
            inputs={inputs}
            points={manualTerrainPoints}
            source={terrainProfileSource}
            effectiveDistanceKm={effectiveDistanceKm}
            criticalDistanceM={criticalTerrainDistanceM}
            allowRouteDistanceImport={inputs.distanceSource === 'manual'}
            allowDemImport={inputs.distanceSource === 'coordinates'}
            onDatumChange={(verticalDatumKind) => {
              markGeoidConversionModified();
              markWaterApplicationModified();
              updateInputs((current) => ({ ...current, verticalDatumKind }));
            }}
            onModeChange={(terrainMode) => updateInputs((current) => ({ ...current, terrainMode }))}
            onNumberChange={handleNumberChange}
            onPointsChange={updateTerrainPoints}
            onApplyGeoidConversion={applyGeoidConversion}
            onApplyImport={applyTerrainImport}
          />}

          {activeScenarioId !== 'horizon' && !isAstronomyScenario(activeScenarioId) && <WaterSurfaceControl
            experimentId={activeExperimentId}
            experimentObservedAtIso={experimentObservedAtIso}
            verticalDatumKind={inputs.verticalDatumKind}
            observerGroundElevationM={inputs.observerGroundElevationM}
            targetGroundElevationM={inputs.targetGroundElevationM}
            observationRecord={waterObservationRecord}
            applicationRecord={waterApplicationRecord}
            onRecord={recordWaterSurface}
            onApply={applyWaterSurface}
            onShowTrace={setTraceModelId}
          />}

          {!isAstronomyScenario(activeScenarioId) && <div className="model-grid">
            {simulationModels.map((model) => (
              <ModelCard
                key={model.metadata.id}
                scenarioId={activeScenarioId}
                metadata={model.metadata}
                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={effectiveInputs}
                atmosphereState={atmosphereState}
                terrainProfile={terrainProfile}
                terrainSourceLabel={terrainVisualizationSourceLabel(terrainProfileSource)}
                visualLayers={visualLayers}
                onShowTrace={() => setTraceModelId(model.metadata.id)}
              />
            ))}
          </div>}

          {photoCalibrationRecord && (
            <PhotoModelUncertaintyControl
              settings={photoModelUncertainty}
              atmosphereMode={atmosphereState.mode}
              isCalculating={isAngularUncertaintyCalculating}
              error={modelUncertaintyError}
              onChange={(settings) => {
                setPhotoModelUncertainty(settings);
                setIsDirty(true);
              }}
            />
          )}

          <PhotoAngularComparisonPanel
            comparisons={photoAngularComparisons}
            referenceKind={photoReferenceKind}
          />

          {!isAstronomyScenario(activeScenarioId) && <div className="bottom-grid">
            <ResultsTable runs={runs} scenarioId={activeScenarioId} onShowTrace={setTraceModelId} />
            <section className="notes panel">
              <div className="notes-help-heading"><span className="eyebrow">Hesaplama kapsamı</span><PanelHelpButton panelId="calculation-scope" /></div>
              <ul>
                <li>Koordinat modu WGS84 ters jeodezik çözümünü kullanır.</li>
                <li>Zemin ve hedef kotları seçilen ortak düşey datumda yorumlanır.</li>
                <li>Manuel, CSV, GeoJSON ve ESRI ASCII DEM profilleri aynı arazi sözleşmesine bağlanır.</li>
                <li>Jeoit profil dönüşümü kaynak, sürüm/epok, N, belirsizlik ve hesap izini deney sonucunda korur.</li>
                <li>Su yüzeyi kaydı gelgit/dalga belirsizliğini provenans olarak tutar ve yalnız seçilen uç kotlarına kontrollü uygulanır.</li>
                <li>Küre ve düzlem aynı profili kendi geometrilerinde ayrı çözer.</li>
                <li>Standart kırılma kürede etkin yarıçap yaklaşımıdır; katmanlı atmosfer modu meteorolojik profil ve Ciddor optik tanılarını ayrı state olarak taşır.</li>
                <li>Azimutal gösterim yalnızca kartografik referanstır.</li>
              </ul>
              <p>Katmanlı atmosfer profilinin optik ışın izleme çekirdeği hazırdır; görünürlük/ufuk model sonucuna bağlantısı Aşama 4.4 kapsamındadır. Fotoğraf kalibrasyonu bağımsız açısal gözlem kanalı olarak model sonuçlarıyla sonradan karşılaştırılır; dalga yüzeyinin rota boyunca dinamik geometrisi henüz hesaba dahil değildir.</p>
            </section>
          </div>}
        </main>
      </div>

      {aiGuideOpen && <AiGuideDialog onClose={() => setAiGuideOpen(false)} />}
      <TextExperimentSetupDialog
        open={textSetupOpen}
        initialText={textSetupInitialText}
        scenarioId={activeScenarioId}
        experimentName={activeExperimentName}
        observedAtIso={experimentObservedAtIso}
        utcOffsetMinutes={observationUtcOffsetMinutes}
        inputs={inputs}
        atmosphereMode={atmosphereState.mode}
        modelUncertainty={photoModelUncertainty}
        onClose={() => {
          setTextSetupOpen(false);
          setTextSetupInitialText('');
        }}
        onApply={applyTextExperimentSetup}
      />
      {aiWorkflowExperiment && (
        <AiWorkflowDialog
          experiment={aiWorkflowExperiment}
          onClose={() => setAiWorkflowExperiment(undefined)}
          onUseTest={(testBlock) => {
            setAiWorkflowExperiment(undefined);
            setTextSetupInitialText(testBlock);
            setTextSetupOpen(true);
          }}
        />
      )}
      <SaveExperimentDialog
        initialName={activeExperimentName || defaultExperimentName(activeScenarioId)}
        open={saveDialogOpen}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={saveExperiment}
      />
      <DataManagerDialog
        experiments={savedExperiments}
        open={dataManagerOpen}
        onClose={() => setDataManagerOpen(false)}
        onDelete={deleteExperiment}
        onExport={exportExperiment}
        onImport={importExperiment}
        onLoad={loadExperiment}
        onReport={exportReport}
      />
      <TraceDialog
        metadata={selectedMetadata}
        prediction={selectedPrediction}
        onClose={() => setTraceModelId(undefined)}
      />
      <HelpOverlay panelId={helpPanelId} catalogOpen={helpCatalogOpen} onClose={closeHelp} />
    </div>
    </HelpProvider>
  );
}
