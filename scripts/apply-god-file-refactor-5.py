#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src/renderer/src/AppNext.tsx'


def replace_once(text: str, old: str, new: str, marker: str) -> str:
    if new in text and old not in text:
        print(f'[ok] already applied: {marker}')
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match for {marker}, found {count}')
    print(f'[updated] {marker}')
    return text.replace(old, new, 1)


def remove_once(text: str, old: str, marker: str) -> str:
    count = text.count(old)
    if count == 0:
        print(f'[ok] already removed: {marker}')
        return text
    if count != 1:
        raise RuntimeError(f'Expected at most one match for {marker}, found {count}')
    print(f'[removed] {marker}')
    return text.replace(old, '', 1)


def replace_between(text: str, start: str, end: str, replacement: str, marker: str) -> str:
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count == 0 and replacement in text:
        print(f'[ok] already applied: {marker}')
        return text
    if start_count != 1 or end_count != 1:
        raise RuntimeError(
            f'Expected one start/end for {marker}, found start={start_count}, end={end_count}'
        )
    start_index = text.index(start)
    end_index = text.index(end, start_index)
    print(f'[updated] {marker}')
    return text[:start_index] + replacement + text[end_index:]


app = APP.read_text(encoding='utf-8')

app = replace_once(
    app,
    """import {
  getSimulationScenario,
  normalizeSimulationScenarioId,
  type SimulationScenarioId
} from '../../shared/scenario';""",
    """import {
  getSimulationScenario,
  type SimulationScenarioId
} from '../../shared/scenario';""",
    'remove persistence-only scenario normalizer import'
)
app = remove_once(
    app,
    "import { migrateLegacyManualTerrainPoint } from '../../simulation/manual-terrain-profile';\n",
    'remove legacy terrain migration import from AppNext'
)
app = remove_once(
    app,
    """import {
  atmosphereStateFromLegacyStandardFlag,
  cloneAtmosphereExperimentState
} from '../../simulation/atmosphere-persistence';
""",
    'remove persistence-only atmosphere helpers from AppNext'
)
app = replace_once(
    app,
    """import {
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';""",
    """import {
  PHOTO_CALIBRATION_MODEL_ID,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';""",
    'remove persistence-only photo calibration version import'
)
app = replace_once(
    app,
    """import {
  PHOTO_ANGULAR_COMPARISON_MODEL_VERSION,
  comparePhotoAngularObservation,
  normalizePhotoReferenceKind
} from '../../simulation/photo-angular-comparison';""",
    """import {
  comparePhotoAngularObservation,
  normalizePhotoReferenceKind
} from '../../simulation/photo-angular-comparison';""",
    'remove persistence-only photo comparison version import'
)
for line, marker in [
    ("import { solarSeasonEventsMetadata } from '../../simulation/solar-season-events';\n", 'solar season metadata'),
    ("import { solarTimeOffsetMetadata } from '../../simulation/solar-time-offset';\n", 'solar time metadata'),
    ("import { solarRouteComparisonMetadata } from '../../simulation/solar-route-comparison';\n", 'solar route metadata')
]:
    app = remove_once(app, line, f'remove persistence-only {marker} import')
app = replace_once(
    app,
    """import {
  readSolarEclipseEventSearchSnapshot,
  solarEclipseEventSearchMetadata,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';""",
    """import {
  solarEclipseEventSearchMetadata,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';""",
    'remove persistence-only eclipse snapshot reader import'
)
app = replace_once(
    app,
    """import {
  DEFAULT_SHADOW_OBSERVATION_SETTINGS,
  SHADOW_OBSERVATION_MODEL_ID,
  readShadowObservationSettings,
  shadowObservationMetadata,
  type ShadowObservationSettings
} from '../../simulation/shadow-observation';""",
    """import {
  DEFAULT_SHADOW_OBSERVATION_SETTINGS,
  SHADOW_OBSERVATION_MODEL_ID,
  shadowObservationMetadata,
  type ShadowObservationSettings
} from '../../simulation/shadow-observation';""",
    'remove persistence-only shadow settings reader import'
)
app = replace_once(
    app,
    """import {
  DUAL_SHADOW_COMPARISON_MODEL_ID,
  createDefaultDualShadowComparisonSettings,
  dualShadowComparisonMetadata,
  readDualShadowComparisonSettings,
  type DualShadowComparisonSettings
} from '../../simulation/dual-shadow-comparison';""",
    """import {
  DUAL_SHADOW_COMPARISON_MODEL_ID,
  createDefaultDualShadowComparisonSettings,
  dualShadowComparisonMetadata,
  type DualShadowComparisonSettings
} from '../../simulation/dual-shadow-comparison';""",
    'remove persistence-only dual-shadow settings reader import'
)
app = replace_once(
    app,
    """import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  readStellarObservationSettings,
  stellarObservationMetadata,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';""",
    """import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  stellarObservationMetadata,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';""",
    'remove persistence-only stellar settings reader import'
)
app = replace_once(
    app,
    """import {
  markWaterSurfaceApplicationHistorical,
  readStoredWaterSurfaceState,
  type StoredWaterSurfaceRecord
} from '../../simulation/water-surface-ui-state';""",
    """import {
  markWaterSurfaceApplicationHistorical,
  type StoredWaterSurfaceRecord
} from '../../simulation/water-surface-ui-state';""",
    'remove persistence-only water state reader import'
)

app = replace_once(
    app,
    "import { useExperimentModelState } from './app/useExperimentModelState';\n",
    """import { useExperimentModelState } from './app/useExperimentModelState';
import {
  buildSavedExperimentRecord,
  defaultTerrainPoints,
  restoreSavedExperiment,
  type RestoredExperimentState
} from './app/experiment-persistence';
""",
    'add experiment persistence helpers import'
)

app = replace_between(
    app,
    'function defaultTerrainPoints(',
    'function geodesicPrediction(',
    '',
    'remove embedded default terrain point helper'
)

persistence_block = """  const applyRestoredExperimentState = (
    restored: RestoredExperimentState,
    message: string
  ): void => {
    setActiveScenarioId(restored.activeScenarioId);
    setShadowObservationSettings(restored.shadowObservationSettings);
    setDualShadowSettings(restored.dualShadowSettings);
    setStellarObservationSettings(restored.stellarObservationSettings);
    setStellarLocalHorizonSource(restored.stellarLocalHorizonSource);
    setStellarMotionSource(restored.stellarMotionSource);
    setEclipseEventSearchSnapshot(restored.eclipseEventSearchSnapshot);
    setInputs(restored.inputs);
    setAtmosphereState(restored.atmosphereState);
    setManualTerrainPoints(restored.manualTerrainPoints);
    setTerrainProfileSource(restored.terrainProfileSource);
    setGeoidConversionRecord(restored.geoidConversionRecord);
    setWaterObservationRecord(restored.waterObservationRecord);
    setWaterApplicationRecord(restored.waterApplicationRecord);
    setPhotoCalibration(restored.photoCalibration);
    setPhotoModelUncertainty(restored.photoModelUncertainty);
    setTextSetupHistory(restored.textSetupHistory);
    setPhotoCalibrationRecord(restored.photoCalibrationRecord);
    setActiveExperimentId(restored.activeExperimentId);
    setActiveExperimentName(restored.activeExperimentName);
    setExperimentObservedAtIso(restored.experimentObservedAtIso);
    setObservationUtcOffsetMinutes(restored.observationUtcOffsetMinutes);
    setIsDirty(false);
    setStorageMessage(message);
  };

  const loadExperiment = (saved: SavedExperiment): void => {
    applyRestoredExperimentState(restoreSavedExperiment(saved), `“${saved.name}” açıldı.`);
  };

  const buildActiveExperimentRecord = (
    name: string,
    now = new Date().toISOString()
  ): SavedExperiment => buildSavedExperimentRecord({
    name,
    now,
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
    geodesicModelMetadata: geodesicMetadata,
    astronomyPredictions: {
      solarPosition: solarPositionPrediction,
      solarDayEvents: solarDayEventsPrediction,
      solarTimeOffset: solarTimeOffsetPrediction,
      solarSeasonEvents: solarSeasonEventsPrediction,
      solarRouteComparison: solarRouteComparisonPrediction,
      lunarPosition: lunarPositionPrediction,
      eclipseOverlap: eclipseOverlapPrediction,
      eclipseEventSearch: eclipseEventSearchPrediction,
      shadowObservation: shadowObservationPrediction,
      dualShadowComparison: dualShadowComparisonPrediction,
      stellarObservation: stellarObservationPrediction
    },
    runs,
    geoidConversionRecord,
    waterObservationRecord,
    waterApplicationRecord,
    photoCalibrationRecord,
    photoAngularComparisons
  });

"""

app = replace_between(
    app,
    '  const loadExperiment = (saved: SavedExperiment): void => {',
    '  const saveExperiment = async (name: string): Promise<void> => {',
    persistence_block,
    'replace embedded load/record persistence logic'
)

save_block = """  const saveExperiment = async (name: string): Promise<void> => {
    if (!modelUncertaintyReady) {
      setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan deney kaydedilmedi.');
      return;
    }
    const record = buildActiveExperimentRecord(name);

    try {
      const saved = await window.simulatorDesktop.saveExperiment(record);
      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      applyRestoredExperimentState(
        restoreSavedExperiment(saved),
        `“${saved.name}” cihazda kaydedildi.`
      );
      setSaveDialogOpen(false);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney kaydedilemedi.');
    }
  };

"""
app = replace_between(
    app,
    '  const saveExperiment = async (name: string): Promise<void> => {',
    '  const deleteExperiment = async (saved: SavedExperiment): Promise<void> => {',
    save_block,
    'replace embedded post-save reopen logic'
)

APP.write_text(app, encoding='utf-8')
print('God-file refactor phase 5 persistence extraction applied successfully.')
