#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'src/report/html-report.ts'


def replace_once(text: str, old: str, new: str, marker: str) -> str:
    if new in text and old not in text:
        print(f'[ok] already applied: {marker}')
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match for {marker}, found {count}')
    print(f'[updated] {marker}')
    return text.replace(old, new, 1)


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


report = REPORT.read_text(encoding='utf-8')

old_imports = """import type {
  CalculationTrace,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from '../shared/domain';
import type {
  CsvTerrainDelimiter,
  CsvTerrainDistanceUnit,
  SavedExperiment,
  TerrainProfileSource
} from '../shared/simulator';
import type { VerticalDatumKind } from '../shared/terrain';
import { PORTABLE_EXPERIMENT_SCHEMA_VERSION } from '../shared/portable';
import {
  migrateLegacyManualTerrainPoint,
  sortManualTerrainPoints
} from '../simulation/manual-terrain-profile';
"""
new_imports = """import type { SavedExperiment } from '../shared/simulator';
import {
  astronomyModelIds,
  coordinateFormatter,
  escapeHtml,
  formatDate,
  inputNumberFormatter,
  metricNumberFormatters,
  predictionSection,
  yesNo
} from './report-core';
import { geodesicSection, verticalTerrainSection } from './report-terrain';
"""
report = replace_once(report, old_imports, new_imports, 'replace report helper imports')

report = replace_between(
    report,
    'const statusLabels:',
    'function astronomyResultsSection(',
    '',
    'remove generic formatting and prediction rendering block'
)

report = replace_between(
    report,
    'function geodesicSection(',
    'function stellarLocalHorizonSourceSection(',
    '',
    'remove geodesic and terrain rendering block'
)

REPORT.write_text(report, encoding='utf-8')
print('HTML report refactor phase 1 applied successfully.')
