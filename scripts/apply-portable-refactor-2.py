#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTABLE = ROOT / 'src/shared/portable.ts'
SOURCES = ROOT / 'src/shared/portable-sources.ts'

START_MARKER = 'function parsePhotoSourceMetadata('
END_MARKER = 'function parseSavedExperiment('
EXPORT_NAMES = [
    'parseModelInputUncertainty',
    'parsePhotoCalibration',
    'parseStellarLocalHorizonSource',
    'parseStellarMotionSource',
    'parseTextSetupHistory',
]

SOURCES_HEADER = """import type { SavedStellarDemSkylineDerivation, SavedStellarLocalHorizonSource } from './stellar-local-horizon-import';
import type { SavedStellarMotionSource } from './stellar-motion-source';
import { verifiedMotionSubsetFromSavedSource } from '../simulation/stellar-motion-source';
import type { ModelInputUncertaintySettings, UncertaintyCombination } from './uncertainty';
import type { CameraCalibrationUncertainty, PhotoCalibrationMarks, PhotoSourceMetadata, SavedPhotoCalibration } from './photo-calibration';
import type { TextExperimentSetupProvenance } from './text-experiment-setup';
import { normalizeStellarLocalHorizonMask } from '../simulation/stellar-local-horizon';
import { parseSavedStellarPanoramaLocalHorizonSource } from '../simulation/stellar-panorama-skyline-persistence';
import {
  inRange,
  isFiniteNumber,
  isIsoDate,
  isNonEmptyString,
  isRecord,
  isStringArray
} from './portable-core';

"""

SOURCES_IMPORT = """import {
  parseModelInputUncertainty,
  parsePhotoCalibration,
  parseStellarLocalHorizonSource,
  parseStellarMotionSource,
  parseTextSetupHistory
} from './portable-sources';
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
if SOURCES.exists() and "from './portable-sources';" in source and START_MARKER not in source:
    print('Portable refactor phase 2 already applied.')
    raise SystemExit(0)
if SOURCES.exists():
    fail(f'{SOURCES} already exists but portable.ts does not look fully migrated.')
if source.count(START_MARKER) != 1 or source.count(END_MARKER) != 1:
    fail(
        f'Expected one extraction boundary, start={source.count(START_MARKER)}, '
        f'end={source.count(END_MARKER)}'
    )

# Extract first so later import edits cannot invalidate offsets.
start = source.index(START_MARKER)
end = source.index(END_MARKER, start)
block = source[start:end]
for name in EXPORT_NAMES:
    block = add_export(block, name)
SOURCES.write_text(SOURCES_HEADER + block.rstrip() + '\n', encoding='utf-8')
source = source[:start] + source[end:]

# Remove imports now owned by portable-sources.ts.
remove_lines = [
    "import type { SavedStellarDemSkylineDerivation, SavedStellarLocalHorizonSource } from './stellar-local-horizon-import';\n",
    "import type { SavedStellarMotionSource } from './stellar-motion-source';\n",
    "import { verifiedMotionSubsetFromSavedSource } from '../simulation/stellar-motion-source';\n",
    "import type { ModelInputUncertaintySettings, UncertaintyCombination } from './uncertainty';\n",
    "import type { CameraCalibrationUncertainty, PhotoCalibrationMarks, PhotoSourceMetadata, SavedPhotoCalibration } from './photo-calibration';\n",
    "import type { TextExperimentSetupProvenance } from './text-experiment-setup';\n",
    "import { normalizeStellarLocalHorizonMask } from '../simulation/stellar-local-horizon';\n",
    "import { parseSavedStellarPanoramaLocalHorizonSource } from '../simulation/stellar-panorama-skyline-persistence';\n",
]
for line in remove_lines:
    if source.count(line) != 1:
        fail(f'Expected one moved source import {line.strip()!r}, found {source.count(line)}')
    source = source.replace(line, '', 1)

old_core_import = """import {
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
export { isModelPrediction, isSimulatorInputs } from './portable-core';
"""
new_core_import = """import {
  cloneTrace,
  deriveLegacyManualPoints,
  isFiniteNumber,
  isIsoDate,
  isModelPrediction,
  isNonEmptyString,
  isRecord,
  isSavedGeodesic,
  normalizeGeodesic,
  parseManualTerrainPoints,
  parseSimulatorInputs,
  parseTerrainProfileSource
} from './portable-core';
export { isModelPrediction, isSimulatorInputs } from './portable-core';
"""
if source.count(old_core_import) != 1:
    fail(f'Expected one portable-core import block, found {source.count(old_core_import)}')
source = source.replace(old_core_import, new_core_import + SOURCES_IMPORT, 1)

PORTABLE.write_text(source, encoding='utf-8')
print('Portable refactor phase 2 source provenance extraction applied successfully.')
