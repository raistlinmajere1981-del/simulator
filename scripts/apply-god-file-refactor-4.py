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
    """import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction
} from '../../shared/domain';""",
    """import type {
  ModelMetadata,
  ModelPrediction
} from '../../shared/domain';""",
    'remove ExperimentDefinition type from AppNext'
)

app = replace_once(
    app,
    """import type {
  ManualTerrainPoint,
  TerrainProfile
} from '../../shared/terrain';""",
    "import type { ManualTerrainPoint } from '../../shared/terrain';",
    'remove TerrainProfile type from AppNext'
)

app = replace_once(
    app,
    """import {
  inverseWgs84Geodesic,
  type GeodesicResult
} from '../../simulation/geodesy';""",
    "import type { GeodesicResult } from '../../simulation/geodesy';",
    'keep only GeodesicResult type in AppNext'
)

app = replace_once(
    app,
    """import {
  buildManualTerrainProfile,
  migrateLegacyManualTerrainPoint
} from '../../simulation/manual-terrain-profile';""",
    "import { migrateLegacyManualTerrainPoint } from '../../simulation/manual-terrain-profile';",
    'remove terrain profile builder from AppNext'
)

app = remove_once(
    app,
    """import {
  runSimulationModels,
  type ModelRun
} from '../../simulation/runner';
""",
    'remove generic model runner import from AppNext'
)

app = replace_once(
    app,
    "import { useAstronomyCalculations } from './app/useAstronomyCalculations';\n",
    """import { useAstronomyCalculations } from './app/useAstronomyCalculations';
import { useExperimentModelState } from './app/useExperimentModelState';
""",
    'add experiment model state hook import'
)

app = replace_between(
    app,
    'function buildTerrainProfile(',
    'function geodesicPrediction(',
    '',
    'remove embedded terrain profile builder'
)

app = remove_once(
    app,
    "  const [runs, setRuns] = useState<ModelRun[]>([]);\n",
    'remove runs state from AppNext'
)
app = remove_once(
    app,
    "  const [isCalculating, setIsCalculating] = useState(true);\n",
    'remove calculation state from AppNext'
)

model_state_call = """  const {
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

"""

app = replace_between(
    app,
    '  const geodesic = useMemo(() => {',
    '  const {\n    solarPosition,',
    model_state_call,
    'replace generic derived experiment/model state with hook'
)

app = replace_between(
    app,
    '  const context = useMemo(() => ({',
    '  useEffect(() => {\n    void window.simulatorDesktop.listExperiments()',
    '',
    'remove embedded model context derivation'
)

app = remove_once(
    app,
    """  useEffect(() => {
    if (isAstronomyScenario(activeScenarioId)) {
      setRuns([]);
      setIsCalculating(false);
      return;
    }
    let cancelled = false;
    setIsCalculating(true);
    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });
    return () => { cancelled = true; };
  }, [activeScenarioId, context, experiment]);

""",
    'remove embedded generic model run effect'
)

APP.write_text(app, encoding='utf-8')
print('God-file refactor phase 4 experiment/model state extraction applied successfully.')
