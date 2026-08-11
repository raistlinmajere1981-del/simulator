#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTABLE = ROOT / 'src/shared/portable.ts'
CORE = ROOT / 'src/shared/portable-core.ts'

START_MARKER = 'function isRecord('
END_MARKER = 'function parsePhotoSourceMetadata('
EXPORT_NAMES = [
    'isRecord',
    'isFiniteNumber',
    'isNonEmptyString',
    'isIsoDate',
    'inRange',
    'isStringArray',
    'parseManualTerrainPoints',
    'parseTerrainProfileSource',
    'parseSimulatorInputs',
    'isSimulatorInputs',
    'isModelPrediction',
    'isSavedGeodesic',
    'cloneTrace',
    'normalizeGeodesic',
    'deriveLegacyManualPoints',
]

CORE_HEADER = """import type {
  CalculationTrace,
  CalculationTraceStep,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from './domain';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type CsvTerrainDelimiter,
  type CsvTerrainDistanceUnit,
  type SavedGeodesicCalculation,
  type SimulatorInputs,
  type TerrainProfileSource
} from './simulator';
import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';
import {
  migrateLegacyManualTerrainPoint,
  sortManualTerrainPoints,
  validateManualTerrainPoints
} from '../simulation/manual-terrain-profile';

"""

CORE_IMPORT = """import {
  cloneTrace,
  deriveLegacyManualPoints,
  inRange,
  isFiniteNumber,
  isIsoDate,
  isModelPrediction,
  isNonEmptyString,
  isRecord,
  isSavedGeodesic,
  isSimulatorInputs,
  isStringArray,
  normalizeGeodesic,
  parseManualTerrainPoints,
  parseSimulatorInputs,
  parseTerrainProfileSource
} from './portable-core';
"""


def fail(message: str) -> None:
    raise RuntimeError(message)


def add_export(block: str, name: str) -> str:
    plain = f'function {name}('
    exported = f'export function {name}('
    if exported in block:
        return block
    if block.count(plain) != 1:
        fail(f'Expected one {plain!r}, found {block.count(plain)}')
    return block.replace(plain, exported, 1)


source = PORTABLE.read_text(encoding='utf-8')
if CORE.exists() and "from './portable-core';" in source and START_MARKER not in source:
    print('Portable refactor phase 1 already applied.')
    raise SystemExit(0)
if CORE.exists():
    fail(f'{CORE} already exists but portable.ts does not look fully migrated.')
if source.count(START_MARKER) != 1 or source.count(END_MARKER) != 1:
    fail(
        f'Expected one extraction boundary, start={source.count(START_MARKER)}, '
        f'end={source.count(END_MARKER)}'
    )

# Extract first, before any import edits, so offsets cannot be invalidated.
start = source.index(START_MARKER)
end = source.index(END_MARKER, start)
block = source[start:end]
for name in EXPORT_NAMES:
    block = add_export(block, name)
CORE.write_text(CORE_HEADER + block.rstrip() + '\n', encoding='utf-8')
source = source[:start] + source[end:]

# Remove imports that are now owned by portable-core.ts.
old_domain = """import type {
  CalculationTrace,
  CalculationTraceStep,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from './domain';
"""
if source.count(old_domain) != 1:
    fail(f'Expected one domain import block, found {source.count(old_domain)}')
source = source.replace(old_domain, '', 1)

old_simulator = """import {
  DEFAULT_SIMULATOR_INPUTS,
  type CsvTerrainDelimiter,
  type CsvTerrainDistanceUnit,
  type SavedExperiment,
  type SavedGeodesicCalculation,
  type SimulatorInputs,
  type TerrainProfileSource
} from './simulator';
"""
new_simulator = """import type {
  SavedExperiment,
  TerrainProfileSource
} from './simulator';
"""
if source.count(old_simulator) != 1:
    fail(f'Expected one simulator import block, found {source.count(old_simulator)}')
source = source.replace(old_simulator, new_simulator, 1)

old_terrain = "import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';\n"
if source.count(old_terrain) != 1:
    fail(f'Expected one terrain type import, found {source.count(old_terrain)}')
source = source.replace(old_terrain, '', 1)

old_manual = """import {
  migrateLegacyManualTerrainPoint,
  sortManualTerrainPoints,
  validateManualTerrainPoints
} from '../simulation/manual-terrain-profile';
"""
if source.count(old_manual) != 1:
    fail(f'Expected one manual terrain import block, found {source.count(old_manual)}')
source = source.replace(old_manual, '', 1)

anchor = "import { parseSavedStellarPanoramaLocalHorizonSource } from '../simulation/stellar-panorama-skyline-persistence';\n"
if source.count(anchor) != 1:
    fail(f'Expected one portable-core import anchor, found {source.count(anchor)}')
source = source.replace(anchor, anchor + CORE_IMPORT, 1)

PORTABLE.write_text(source, encoding='utf-8')
print('Portable refactor phase 1 core validation extraction applied successfully.')
