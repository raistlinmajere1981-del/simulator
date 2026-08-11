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

remove_imports = [
    ("import { calculateSolarPosition } from '../../simulation/solar-position';\n", 'solar position calculator'),
    ("import { calculateLunarPosition } from '../../simulation/lunar-position';\n", 'lunar position calculator'),
    ("import { calculateSolarEclipseOverlap } from '../../simulation/solar-eclipse-overlap';\n", 'eclipse overlap calculator'),
    ("import { verifiedMotionSubsetFromSavedSource } from '../../simulation/stellar-motion-source';\n", 'stellar motion subset helper'),
]
for old, marker in remove_imports:
    app = remove_once(app, old, f'remove {marker} import from AppNext')

app = replace_once(
    app,
    "import { createSolarPositionPrediction, solarPositionMetadata } from '../../simulation/solar-position-prediction';",
    "import { solarPositionMetadata } from '../../simulation/solar-position-prediction';",
    'keep only solar position metadata in AppNext'
)
app = replace_once(
    app,
    """import {
  calculateSolarDayEvents,
  createSolarDayEventsPrediction,
  solarDayEventsMetadata
} from '../../simulation/solar-day-events';""",
    "import { solarDayEventsMetadata } from '../../simulation/solar-day-events';",
    'keep only solar day metadata in AppNext'
)
app = replace_once(
    app,
    """import {
  calculateSolarSeasonEvents,
  createSolarSeasonEventsPrediction,
  solarSeasonEventsMetadata
} from '../../simulation/solar-season-events';""",
    "import { solarSeasonEventsMetadata } from '../../simulation/solar-season-events';",
    'keep only solar season metadata in AppNext'
)
app = replace_once(
    app,
    """import {
  calculateSolarTimeOffset,
  createSolarTimeOffsetPrediction,
  solarTimeOffsetMetadata
} from '../../simulation/solar-time-offset';""",
    "import { solarTimeOffsetMetadata } from '../../simulation/solar-time-offset';",
    'keep only solar time metadata in AppNext'
)
app = replace_once(
    app,
    """import {
  calculateSolarRouteComparison,
  createSolarRouteComparisonPrediction,
  solarRouteComparisonMetadata
} from '../../simulation/solar-route-comparison';""",
    "import { solarRouteComparisonMetadata } from '../../simulation/solar-route-comparison';",
    'keep only solar route metadata in AppNext'
)
app = replace_once(
    app,
    "import { createLunarPositionPrediction, lunarPositionMetadata } from '../../simulation/lunar-position-prediction';",
    "import { lunarPositionMetadata } from '../../simulation/lunar-position-prediction';",
    'keep only lunar metadata in AppNext'
)
app = replace_once(
    app,
    "import { createSolarEclipseOverlapPrediction, solarEclipseOverlapMetadata } from '../../simulation/solar-eclipse-overlap-prediction';",
    "import { solarEclipseOverlapMetadata } from '../../simulation/solar-eclipse-overlap-prediction';",
    'keep only eclipse overlap metadata in AppNext'
)
app = replace_once(
    app,
    """import {
  createSolarEclipseEventSearchPrediction,
  readSolarEclipseEventSearchSnapshot,
  solarEclipseEventSearchMetadata,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';""",
    """import {
  readSolarEclipseEventSearchSnapshot,
  solarEclipseEventSearchMetadata,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';""",
    'remove eclipse event prediction creator from AppNext'
)
app = replace_once(
    app,
    """import {
  DEFAULT_SHADOW_OBSERVATION_SETTINGS,
  SHADOW_OBSERVATION_MODEL_ID,
  calculateShadowObservation,
  createShadowObservationPrediction,
  readShadowObservationSettings,
  shadowObservationMetadata,
  type ShadowObservationSettings
} from '../../simulation/shadow-observation';""",
    """import {
  DEFAULT_SHADOW_OBSERVATION_SETTINGS,
  SHADOW_OBSERVATION_MODEL_ID,
  readShadowObservationSettings,
  shadowObservationMetadata,
  type ShadowObservationSettings
} from '../../simulation/shadow-observation';""",
    'remove shadow calculators from AppNext'
)
app = replace_once(
    app,
    """import {
  DUAL_SHADOW_COMPARISON_MODEL_ID,
  calculateDualShadowComparison,
  createDefaultDualShadowComparisonSettings,
  createDualShadowComparisonPrediction,
  dualShadowComparisonMetadata,
  readDualShadowComparisonSettings,
  type DualShadowComparisonSettings
} from '../../simulation/dual-shadow-comparison';""",
    """import {
  DUAL_SHADOW_COMPARISON_MODEL_ID,
  createDefaultDualShadowComparisonSettings,
  dualShadowComparisonMetadata,
  readDualShadowComparisonSettings,
  type DualShadowComparisonSettings
} from '../../simulation/dual-shadow-comparison';""",
    'remove dual shadow calculators from AppNext'
)
app = replace_once(
    app,
    """import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  calculateStellarObservation,
  createStellarObservationPrediction,
  readStellarObservationSettings,
  stellarObservationMetadata,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';""",
    """import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  readStellarObservationSettings,
  stellarObservationMetadata,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';""",
    'remove stellar calculators from AppNext'
)

app = replace_once(
    app,
    "import { TerrainPanel } from './app/TerrainPanel';\n",
    """import { TerrainPanel } from './app/TerrainPanel';
import { useAstronomyCalculations } from './app/useAstronomyCalculations';
""",
    'add astronomy calculation hook import'
)

replacement = """  const {
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

"""
app = replace_between(
    app,
    "  const solarPosition = useMemo(() =>",
    "  const context = useMemo(() => ({",
    replacement,
    'replace embedded astronomy calculation chain with hook'
)

APP.write_text(app, encoding='utf-8')
print('God-file refactor phase 3 astronomy calculation extraction applied successfully.')
