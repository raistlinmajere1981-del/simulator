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


def cut_between(text: str, start: str, end: str, marker: str) -> str:
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count == 0:
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
    """  type SavedExperiment,
  type SimulatorInputs,
  type TerrainMode,
  type TerrainProfileSource""",
    """  type SavedExperiment,
  type SimulatorInputs,
  type TerrainProfileSource""",
    'remove TerrainMode from AppNext'
)

app = replace_once(
    app,
    """import type {
  ManualTerrainPoint,
  TerrainProfile,
  VerticalDatumKind
} from '../../shared/terrain';""",
    """import type {
  ManualTerrainPoint,
  TerrainProfile
} from '../../shared/terrain';""",
    'remove VerticalDatumKind from AppNext'
)

app = replace_once(
    app,
    """import {
  MultiPointTerrainEditor,
  type TerrainProfileImportOptions
} from './MultiPointTerrainEditor';""",
    "import type { TerrainProfileImportOptions } from './MultiPointTerrainEditor';",
    'keep only TerrainProfileImportOptions in AppNext'
)

app = remove_once(
    app,
    "import { GeoidConversionControl } from './GeoidConversionControl';\n",
    'remove GeoidConversionControl import'
)
app = remove_once(
    app,
    "import { WorldModelViewport } from './WorldModelViewport';\n",
    'remove WorldModelViewport import'
)
app = remove_once(
    app,
    "import { NumericField } from './app/NumericField';\n",
    'remove NumericField import'
)
app = remove_once(
    app,
    "import { CelestialTimeCard } from './CelestialTimeCard';\n",
    'remove stale CelestialTimeCard import'
)
app = remove_once(
    app,
    "import { DraftNumberInput } from './DraftNumberInput';\n",
    'remove stale DraftNumberInput import'
)

app = replace_once(
    app,
    """import {
  datumLabels,
  defaultExperimentName,
  getPresentation,
  isAstronomyScenario
} from './app/app-config';""",
    """import {
  datumLabels,
  defaultExperimentName,
  isAstronomyScenario
} from './app/app-config';""",
    'remove getPresentation from AppNext'
)

app = replace_once(
    app,
    """import {
  clampInputValue,
  formatAngle,
  formatDifference,
  formatDistance,
  formatMetres,
  formatPercent,
  getMetric,
  numberFormatter,
  statusLabels
} from './app/app-formatters';""",
    """import {
  clampInputValue,
  getMetric,
  numberFormatter
} from './app/app-formatters';""",
    'remove renderer-only formatters from AppNext'
)

app = replace_once(
    app,
    "import { ScenarioSummary } from './app/ScenarioSummary';\n",
    """import { ScenarioSummary } from './app/ScenarioSummary';
import { ModelCard, ResultsTable } from './app/ModelResults';
import { TerrainPanel } from './app/TerrainPanel';
""",
    'add phase 2 renderer imports'
)

app = cut_between(
    app,
    'function TerrainPanel({',
    'export function AppNext(): React.JSX.Element {',
    'remove TerrainPanel ModelCard ResultsTable blocks'
)

APP.write_text(app, encoding='utf-8')
print('God-file refactor phase 2 AppNext extraction applied successfully.')
