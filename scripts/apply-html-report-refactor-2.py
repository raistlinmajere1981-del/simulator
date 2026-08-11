#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'src/report/html-report.ts'
PROVENANCE = ROOT / 'src/report/report-provenance.ts'

FUNCTIONS = [
    'stellarLocalHorizonSourceSection',
    'stellarMotionSourceSection',
    'photoCalibrationSection',
    'photoModelUncertaintySection',
    'textSetupHistorySection',
]

CORE_IMPORT_OLD = """import {
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

CORE_IMPORT_NEW = """import {
  astronomyModelIds,
  coordinateFormatter,
  escapeHtml,
  formatDate,
  inputNumberFormatter,
  predictionSection
} from './report-core';
import {
  photoCalibrationSection,
  photoModelUncertaintySection,
  stellarLocalHorizonSourceSection,
  stellarMotionSourceSection,
  textSetupHistorySection
} from './report-provenance';
import { geodesicSection, verticalTerrainSection } from './report-terrain';
"""

PROVENANCE_HEADER = """import type { SavedExperiment } from '../shared/simulator';
import {
  coordinateFormatter,
  escapeHtml,
  formatDate,
  inputNumberFormatter,
  metricNumberFormatters,
  yesNo
} from './report-core';

"""


def fail(message: str) -> None:
    raise RuntimeError(message)


def already_applied(report: str) -> bool:
    return (
        PROVENANCE.exists()
        and "from './report-provenance';" in report
        and 'function stellarLocalHorizonSourceSection(' not in report
    )


report = REPORT.read_text(encoding='utf-8')
if already_applied(report):
    print('HTML report refactor phase 2 already applied.')
    raise SystemExit(0)

if PROVENANCE.exists():
    fail(f'{PROVENANCE} already exists but html-report.ts does not look fully migrated.')

if report.count(CORE_IMPORT_OLD) != 1:
    fail(f'Expected exactly one report-core import block, found {report.count(CORE_IMPORT_OLD)}')

start_marker = 'function stellarLocalHorizonSourceSection('
end_marker = 'export function createExperimentHtmlReport('
if report.count(start_marker) != 1 or report.count(end_marker) != 1:
    fail(
        'Expected one provenance block boundary: '
        f'start={report.count(start_marker)}, end={report.count(end_marker)}'
    )

start = report.index(start_marker)
end = report.index(end_marker, start)
block = report[start:end]

for name in FUNCTIONS:
    marker = f'function {name}('
    if block.count(marker) != 1:
        fail(f'Expected exactly one {marker!r} in provenance block, found {block.count(marker)}')
    block = block.replace(marker, f'export function {name}(', 1)

provenance = PROVENANCE_HEADER + block.rstrip() + '\n'
PROVENANCE.write_text(provenance, encoding='utf-8')

report = report.replace(CORE_IMPORT_OLD, CORE_IMPORT_NEW, 1)
report = report[:start] + report[end:]
REPORT.write_text(report, encoding='utf-8')

print('HTML report refactor phase 2 provenance extraction applied successfully.')
