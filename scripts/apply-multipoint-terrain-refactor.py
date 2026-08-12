#!/usr/bin/env python3
"""Behavior-preserving split for MultiPointTerrainEditor.tsx.

Moves pure terrain editor/view helpers, import review UI, and profile point UI into
focused renderer modules. The parent keeps import orchestration, drag state, and
application callbacks. This helper is temporary and must be removed pre-merge.
"""

from pathlib import Path
import sys
import textwrap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/renderer/src/MultiPointTerrainEditor.tsx"
VIEW_MODEL = ROOT / "src/renderer/src/terrain-editor-view-model.ts"
IMPORT_REVIEW = ROOT / "src/renderer/src/TerrainImportReviewPanel.tsx"
POINTS_PANEL = ROOT / "src/renderer/src/TerrainProfilePointsPanel.tsx"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


for target in (VIEW_MODEL, IMPORT_REVIEW, POINTS_PANEL):
    if target.exists():
        fail(f"target already exists: {target.relative_to(ROOT)}")

text = SOURCE.read_text(encoding="utf-8")
markers = [
    "interface PreviewPoint {",
    "export function MultiPointTerrainEditor({",
    "      {mappingRequest && (",
    "      <div className=\"terrain-profile-preview\" aria-label=\"Arazi yüksekliği grafiği\">",
    "      {(operationError || validationErrors.length > 0) && ("
]
for marker in markers:
    if text.count(marker) != 1:
        fail(f"expected exactly one marker: {marker}")

helper_start = text.index(markers[0])
panel_start = text.index(markers[1])
review_start = text.index(markers[2])
points_start = text.index(markers[3])
errors_start = text.index(markers[4])
if not (helper_start < panel_start < review_start < points_start < errors_start):
    fail("unexpected MultiPointTerrainEditor section ordering")

helper_block = text[helper_start:panel_start]
for old, new in (
    ("interface PreviewPoint {", "export interface PreviewPoint {"),
    ("interface TerrainPointDragState {", "export interface TerrainPointDragState {"),
    ("const MAX_EDITOR_POINTS =", "export const MAX_EDITOR_POINTS ="),
    ("const numberFormatter =", "export const numberFormatter ="),
    ("function findLargestGapPoint(", "export function findLargestGapPoint("),
    ("function previewCoordinates(", "export function previewCoordinates("),
    ("function isGeoJsonProfile(", "export function isGeoJsonProfile("),
    ("function isDemProfile(", "export function isDemProfile("),
    ("function distanceUnitLabel(", "export function distanceUnitLabel("),
    ("function sourceDistanceLabel(", "export function sourceDistanceLabel("),
    ("function sourceRecordLabel(", "export function sourceRecordLabel("),
    ("function demDiagnosticLabel(", "export function demDiagnosticLabel("),
    ("function sourceRecordCount(", "export function sourceRecordCount("),
    ("function delimiterLabel(", "export function delimiterLabel(")
):
    if helper_block.count(old) != 1:
        fail(f"helper marker changed: {old}")
    helper_block = helper_block.replace(old, new, 1)

view_imports = """import type {
  ImportedDemTerrainProfile,
  ImportedGeoJsonTerrainProfile,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import type { ManualTerrainPoint } from '../../shared/terrain';
import { sortManualTerrainPoints } from '../../simulation/manual-terrain-profile';

"""
VIEW_MODEL.write_text(view_imports + helper_block.rstrip() + "\n", encoding="utf-8")

review_block = textwrap.dedent(text[review_start:points_start].rstrip())
replacements = (
    ("sortedPoints.length", "currentPointCount"),
    ("setMappingDistanceIndex(", "onMappingDistanceIndexChange("),
    ("setMappingElevationIndex(", "onMappingElevationIndexChange("),
    ("setMappingDistanceUnit(", "onMappingDistanceUnitChange("),
    ("setMappingRequest(undefined)", "onCancelMapping()"),
    ("void applyColumnMapping()", "void onApplyColumnMapping()"),
    ("setApplyRouteCoordinates(", "onApplyRouteCoordinatesChange("),
    ("setApplyRouteDistance(", "onApplyRouteDistanceChange("),
    ("setApplyObserverEndpoint(", "onApplyObserverEndpointChange("),
    ("setApplyTargetEndpoint(", "onApplyTargetEndpointChange("),
    ("setPendingImport(undefined)", "onCancelImport()"),
    ("onClick={applyTerrainProfile}", "onClick={onApplyTerrainProfile}")
)
for old, new in replacements:
    if old not in review_block:
        fail(f"import review marker changed: {old}")
    review_block = review_block.replace(old, new)

import_review_component = """import type {
  CsvTerrainDistanceUnit,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';
import {
  delimiterLabel,
  demDiagnosticLabel,
  distanceUnitLabel,
  isDemProfile,
  isGeoJsonProfile,
  numberFormatter,
  sourceDistanceLabel,
  sourceRecordCount,
  sourceRecordLabel
} from './terrain-editor-view-model';

export function TerrainImportReviewPanel({
  mappingRequest,
  mappingDistanceIndex,
  mappingElevationIndex,
  mappingDistanceUnit,
  isImporting,
  pendingImport,
  currentPointCount,
  pendingSourceDistanceKm,
  allowRouteDistanceImport,
  applyObserverEndpoint,
  applyTargetEndpoint,
  applyRouteDistance,
  applyRouteCoordinates,
  observerGroundElevationM,
  targetGroundElevationM,
  observerHeightM,
  targetHeightM,
  verticalDatumOffsetM,
  useStandardRefraction,
  refractionCoefficient,
  onMappingDistanceIndexChange,
  onMappingElevationIndexChange,
  onMappingDistanceUnitChange,
  onCancelMapping,
  onApplyColumnMapping,
  onApplyObserverEndpointChange,
  onApplyTargetEndpointChange,
  onApplyRouteDistanceChange,
  onApplyRouteCoordinatesChange,
  onCancelImport,
  onApplyTerrainProfile
}: {
  mappingRequest?: TerrainProfileMappingRequest;
  mappingDistanceIndex: number;
  mappingElevationIndex: number;
  mappingDistanceUnit: CsvTerrainDistanceUnit;
  isImporting: boolean;
  pendingImport?: TerrainProfileImport;
  currentPointCount: number;
  pendingSourceDistanceKm: number | null;
  allowRouteDistanceImport: boolean;
  applyObserverEndpoint: boolean;
  applyTargetEndpoint: boolean;
  applyRouteDistance: boolean;
  applyRouteCoordinates: boolean;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  observerHeightM: number;
  targetHeightM: number;
  verticalDatumOffsetM: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
  onMappingDistanceIndexChange(value: number): void;
  onMappingElevationIndexChange(value: number): void;
  onMappingDistanceUnitChange(value: CsvTerrainDistanceUnit): void;
  onCancelMapping(): void;
  onApplyColumnMapping(): Promise<void>;
  onApplyObserverEndpointChange(value: boolean): void;
  onApplyTargetEndpointChange(value: boolean): void;
  onApplyRouteDistanceChange(value: boolean): void;
  onApplyRouteCoordinatesChange(value: boolean): void;
  onCancelImport(): void;
  onApplyTerrainProfile(): void;
}): React.JSX.Element {
  return (
    <>
""" + textwrap.indent(review_block, "      ") + "\n    </>\n  );\n}\n"
IMPORT_REVIEW.write_text(import_review_component, encoding="utf-8")

points_block = textwrap.dedent(text[points_start:errors_start].rstrip())
for old, new in (
    ("beginTerrainPointDrag", "onBeginTerrainPointDrag"),
    ("moveTerrainPointDrag", "onMoveTerrainPointDrag"),
    ("endTerrainPointDrag", "onEndTerrainPointDrag"),
    ("apply(() =>", "onApplyOperation(() =>")
):
    if old not in points_block:
        fail(f"terrain points marker changed: {old}")
    points_block = points_block.replace(old, new)

points_component = """import type { PointerEvent } from 'react';
import type { ManualTerrainPoint } from '../../shared/terrain';
import {
  removeManualTerrainPoint,
  updateManualTerrainPoint
} from '../../simulation/manual-terrain-profile';
import { DraftNumberInput } from './DraftNumberInput';
import { numberFormatter, type PreviewPoint } from './terrain-editor-view-model';

export function TerrainProfilePointsPanel({
  preview,
  previewPoints,
  sortedPoints,
  routeDistanceKm,
  criticalPercent,
  disabled,
  onBeginTerrainPointDrag,
  onMoveTerrainPointDrag,
  onEndTerrainPointDrag,
  onApplyOperation
}: {
  preview: {
    polyline: string;
    minimumElevationM: number;
    maximumElevationM: number;
  };
  previewPoints: readonly PreviewPoint[];
  sortedPoints: readonly ManualTerrainPoint[];
  routeDistanceKm: number;
  criticalPercent: number | null;
  disabled: boolean;
  onBeginTerrainPointDrag(event: PointerEvent<SVGCircleElement>, point: PreviewPoint): void;
  onMoveTerrainPointDrag(event: PointerEvent<SVGCircleElement>): void;
  onEndTerrainPointDrag(event: PointerEvent<SVGCircleElement>): void;
  onApplyOperation(operation: () => ManualTerrainPoint[]): void;
}): React.JSX.Element {
  return (
    <>
""" + textwrap.indent(points_block, "      ") + "\n    </>\n  );\n}\n"
POINTS_PANEL.write_text(points_component, encoding="utf-8")

# Remove the moved helper block first, then rewrite imports on fresh text.
text = text[:helper_start] + text[panel_start:]
old_simulator_import = """import type {
  CsvTerrainDistanceUnit,
  DemTerrainSamplingMethod,
  ImportedDemTerrainProfile,
  ImportedGeoJsonTerrainProfile,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
"""
new_simulator_import = """import type {
  CsvTerrainDistanceUnit,
  DemTerrainSamplingMethod,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
"""
if text.count(old_simulator_import) != 1:
    fail("shared simulator import block changed")
text = text.replace(old_simulator_import, new_simulator_import, 1)
if text.count("  removeManualTerrainPoint,\n") != 1:
    fail("manual terrain remove import changed")
text = text.replace("  removeManualTerrainPoint,\n", "", 1)
if text.count("import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';\n") != 1:
    fail("DEM review import changed")
text = text.replace("import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';\n", "", 1)

anchor = "import { DraftNumberInput } from './DraftNumberInput';\n"
if text.count(anchor) != 1:
    fail("DraftNumberInput import anchor changed")
extra_imports = """import { TerrainImportReviewPanel } from './TerrainImportReviewPanel';
import { TerrainProfilePointsPanel } from './TerrainProfilePointsPanel';
import {
  MAX_EDITOR_POINTS,
  findLargestGapPoint,
  previewCoordinates,
  type PreviewPoint,
  type TerrainPointDragState
} from './terrain-editor-view-model';
"""
text = text.replace(anchor, anchor + extra_imports, 1)

# Re-locate moved JSX after earlier source edits and replace with focused components.
review_start = text.index(markers[2])
points_start = text.index(markers[3])
errors_start = text.index(markers[4])
review_replacement = """      <TerrainImportReviewPanel
        allowRouteDistanceImport={allowRouteDistanceImport}
        applyObserverEndpoint={applyObserverEndpoint}
        applyRouteCoordinates={applyRouteCoordinates}
        applyRouteDistance={applyRouteDistance}
        applyTargetEndpoint={applyTargetEndpoint}
        currentPointCount={sortedPoints.length}
        isImporting={isImporting}
        mappingDistanceIndex={mappingDistanceIndex}
        mappingDistanceUnit={mappingDistanceUnit}
        mappingElevationIndex={mappingElevationIndex}
        mappingRequest={mappingRequest}
        observerGroundElevationM={observerGroundElevationM}
        observerHeightM={observerHeightM}
        onApplyColumnMapping={applyColumnMapping}
        onApplyObserverEndpointChange={setApplyObserverEndpoint}
        onApplyRouteCoordinatesChange={setApplyRouteCoordinates}
        onApplyRouteDistanceChange={setApplyRouteDistance}
        onApplyTargetEndpointChange={setApplyTargetEndpoint}
        onApplyTerrainProfile={applyTerrainProfile}
        onCancelImport={() => setPendingImport(undefined)}
        onCancelMapping={() => setMappingRequest(undefined)}
        onMappingDistanceIndexChange={setMappingDistanceIndex}
        onMappingDistanceUnitChange={setMappingDistanceUnit}
        onMappingElevationIndexChange={setMappingElevationIndex}
        pendingImport={pendingImport}
        pendingSourceDistanceKm={pendingSourceDistanceKm}
        refractionCoefficient={refractionCoefficient}
        targetGroundElevationM={targetGroundElevationM}
        targetHeightM={targetHeightM}
        useStandardRefraction={useStandardRefraction}
        verticalDatumOffsetM={verticalDatumOffsetM}
      />

"""
text = text[:review_start] + review_replacement + text[points_start:]

points_start = text.index(markers[3])
errors_start = text.index(markers[4])
points_replacement = """      <TerrainProfilePointsPanel
        criticalPercent={criticalPercent}
        disabled={disabled}
        onApplyOperation={apply}
        onBeginTerrainPointDrag={beginTerrainPointDrag}
        onEndTerrainPointDrag={endTerrainPointDrag}
        onMoveTerrainPointDrag={moveTerrainPointDrag}
        preview={preview}
        previewPoints={previewPoints}
        routeDistanceKm={routeDistanceKm}
        sortedPoints={sortedPoints}
      />

"""
text = text[:points_start] + points_replacement + text[errors_start:]

for forbidden in (
    "function findLargestGapPoint(",
    "function sourceDistanceLabel(",
    "className=\"terrain-import-review\"",
    "className=\"terrain-profile-preview\"",
    "className=\"terrain-point-list\""
):
    if forbidden in text:
        fail(f"moved responsibility unexpectedly remained in editor: {forbidden}")
if "<TerrainImportReviewPanel" not in text or "<TerrainProfilePointsPanel" not in text:
    fail("split component calls missing")
if "numberFormatter" in text:
    fail("number formatter unexpectedly remained in parent")

SOURCE.write_text(text, encoding="utf-8")

print("MultiPointTerrainEditor refactor applied successfully.")
print("Created:")
for target in (VIEW_MODEL, IMPORT_REVIEW, POINTS_PANEL):
    print(f"  - {target.relative_to(ROOT)}")
print(f"Updated: {SOURCE.relative_to(ROOT)}")
