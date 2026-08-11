#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src/renderer/src/AppNext.tsx'


def replace_once(text: str, old: str, new: str, marker: str) -> str:
    if new in text:
        print(f'[ok] already applied: {marker}')
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match for {marker}, found {count}')
    print(f'[updated] {marker}')
    return text.replace(old, new, 1)


def cut_between(text: str, start: str, end: str, marker: str) -> str:
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count == 0 and marker in text:
        print(f'[ok] already removed: {marker}')
        return text
    if start_count != 1 or end_count != 1:
        raise RuntimeError(
            f'Expected one start/end for {marker}, found start={start_count}, end={end_count}'
        )
    start_index = text.index(start)
    end_index = text.index(end, start_index)
    print(f'[removed] {marker}')
    return text[:start_index] + text[end_index:]


app = APP.read_text(encoding='utf-8')

app = replace_once(
    app,
    """import {
  createDefaultAtmosphereExperimentState,
  type AtmosphereExperimentState,
  type AtmosphereMode
} from '../../shared/atmosphere';""",
    """import {
  createDefaultAtmosphereExperimentState,
  type AtmosphereExperimentState
} from '../../shared/atmosphere';""",
    'remove AppNext AtmosphereMode import'
)

app = replace_once(
    app,
    """import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction,
  ResultStatus
} from '../../shared/domain';""",
    """import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction
} from '../../shared/domain';""",
    'remove AppNext ResultStatus import'
)

app = replace_once(
    app,
    """  DEFAULT_SIMULATOR_INPUTS,
  type DistanceSource,
  type ImportedDemTerrainProfile,""",
    """  DEFAULT_SIMULATOR_INPUTS,
  type ImportedDemTerrainProfile,""",
    'remove AppNext DistanceSource import'
)

app = replace_once(
    app,
    """import {
  VISIBILITY_SCENARIOS,
  SUN_MOON_SCENARIO,
  SHADOW_SCENARIO,
  STELLAR_SCENARIO,
  ECLIPSE_SCENARIO,
  getSimulationScenario,
  normalizeSimulationScenarioId,
  type SimulationScenarioId
} from '../../shared/scenario';""",
    """import {
  getSimulationScenario,
  normalizeSimulationScenarioId,
  type SimulationScenarioId
} from '../../shared/scenario';""",
    'remove sidebar-only scenario constants from AppNext'
)

app = replace_once(
    app,
    "import { CelestialTimeCard } from './CelestialTimeCard';\n",
    '',
    'remove CelestialTimeCard import'
)
app = replace_once(
    app,
    "import { DraftNumberInput } from './DraftNumberInput';\n",
    '',
    'remove DraftNumberInput import'
)

anchor = "import { AiGuideDialog } from './AiGuideDialog';\n"
new_imports = """import { AiGuideDialog } from './AiGuideDialog';
import { AppSidebar as Sidebar } from './app/AppSidebar';
import { NumericField } from './app/NumericField';
import { HorizonReferencePanel, ObservationPanel } from './app/ObservationReferencePanels';
import { ScenarioSummary } from './app/ScenarioSummary';
import {
  datumLabels,
  defaultExperimentName,
  getPresentation,
  isAstronomyScenario
} from './app/app-config';
import {
  clampInputValue,
  formatAngle,
  formatDifference,
  formatDistance,
  formatMetres,
  formatPercent,
  getMetric,
  numberFormatter,
  statusLabels
} from './app/app-formatters';
import type { NumericInputKey, VisualLayerState } from './app/app-types';
"""
app = replace_once(app, anchor, new_imports, 'add extracted app module imports')

app = cut_between(
    app,
    "type ModelTone = 'green' | 'amber' | 'violet';",
    'interface GeoidConversionRecordState {',
    'remove local presentation/input type block'
)

app = cut_between(
    app,
    'interface VisualLayerState {',
    'const geodesicMetadata: ModelMetadata = {',
    'remove local sidebar/config block'
)

app = cut_between(
    app,
    'const statusLabels: Record<ResultStatus, string> = {',
    'function defaultTerrainPoints(',
    'remove local format/input helper block'
)

app = cut_between(
    app,
    'function Sidebar({',
    'function isImportedDemTerrainProfile(',
    'remove extracted embedded renderer components'
)

APP.write_text(app, encoding='utf-8')
print('God-file refactor phase 1 AppNext extraction applied successfully.')
