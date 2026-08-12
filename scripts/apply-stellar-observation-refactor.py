#!/usr/bin/env python3
"""Behavior-preserving split for StellarObservationPanel.tsx.

Moves pure formatting/draft helpers and the two largest result visualizations into
focused modules while keeping interaction state and apply/import orchestration in
StellarObservationPanel. This helper is temporary and must be removed pre-merge.
"""

from pathlib import Path
import sys
import textwrap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/renderer/src/StellarObservationPanel.tsx"
VIEW_MODEL = ROOT / "src/renderer/src/stellar-observation-view-model.ts"
SKY = ROOT / "src/renderer/src/StellarSkySnapshotPanel.tsx"
RESULTS = ROOT / "src/renderer/src/StellarObservationResults.tsx"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


for target in (VIEW_MODEL, SKY, RESULTS):
    if target.exists():
        fail(f"target already exists: {target.relative_to(ROOT)}")

text = SOURCE.read_text(encoding="utf-8")
markers = [
    "const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });",
    "export function StellarObservationPanel({",
    "  const position = result.position;",
    "  const sourceDraftDirty = externalSourceSignature(draftExternalLocalHorizonSource) !== appliedExternalSourceSignature;",
    "      <div className={showSkySnapshot ? 'stellar-sky-panel active' : 'stellar-sky-panel'}>",
    "      <div className=\"stellar-coordinate-grid\">",
    "    </section>\n  );"
]
for marker in markers:
    if text.count(marker) != 1:
        fail(f"expected exactly one marker: {marker}")

helper_start = text.index(markers[0])
panel_start = text.index(markers[1])
helper_block = text[helper_start:panel_start]

# Export the pure helpers and draft/source utility surface used by the split modules.
for old, new in (
    ("const angleFormatter =", "export const angleFormatter ="),
    ("const preciseFormatter =", "export const preciseFormatter ="),
    ("type LocalHorizonDirectionKey =", "export type LocalHorizonDirectionKey ="),
    ("type LocalHorizonDraft =", "export type LocalHorizonDraft ="),
    ("const horizonClassLabels:", "export const horizonClassLabels:"),
    ("function formatAngle(", "export function formatAngle("),
    ("function formatDuration(", "export function formatDuration("),
    ("function formatClock(", "export function formatClock("),
    ("function formatImportedAt(", "export function formatImportedAt("),
    ("function trailPolyline(", "export function trailPolyline("),
    ("function apparentTrailPolyline(", "export function apparentTrailPolyline("),
    ("function localHorizonPolyline(", "export function localHorizonPolyline("),
    ("function currentLocalHorizonState(", "export function currentLocalHorizonState("),
    ("function localHorizonDraftFromSettings(", "export function localHorizonDraftFromSettings("),
    ("function localHorizonSignature(", "export function localHorizonSignature("),
    ("function localHorizonDraftMatchesSettings(", "export function localHorizonDraftMatchesSettings("),
    ("function cloneExternalSource(", "export function cloneExternalSource("),
    ("function externalSourceSignature(", "export function externalSourceSignature("),
    ("function cloneMotionSource(", "export function cloneMotionSource("),
    ("function motionSourceSignature(", "export function motionSourceSignature(")
):
    if helper_block.count(old) != 1:
        fail(f"helper marker changed: {old}")
    helper_block = helper_block.replace(old, new, 1)

view_imports = """import {
  STELLAR_LOCAL_HORIZON_DIRECTIONS,
  type StellarObservationResult,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';
import type { SavedStellarMotionSource } from '../../shared/stellar-motion-source';

"""
VIEW_MODEL.write_text(view_imports + helper_block.rstrip() + "\n", encoding="utf-8")

# Capture the existing sky snapshot JSX and the final deterministic result/trace JSX.
sky_start = text.index(markers[4])
results_start = text.index(markers[5])
section_close = text.index(markers[6])
if not (panel_start < sky_start < results_start < section_close):
    fail("unexpected stellar panel section ordering")

sky_block = text[sky_start:results_start].rstrip()
results_block = text[results_start:section_close].rstrip()

sky_jsx = textwrap.dedent(sky_block).replace(
    "setShowSkySnapshot(event.currentTarget.checked)",
    "onShowChange(event.currentTarget.checked)"
)
sky_component = """import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import { projectStellarSkyPoint, stellarSkyMarkerRadius } from './stellar-sky-visualization';
import { angleFormatter } from './stellar-observation-view-model';

export function StellarSkySnapshotPanel({
  result,
  settings,
  show,
  onShowChange
}: {
  result: StellarObservationResult;
  settings: StellarObservationSettings;
  show: boolean;
  onShowChange(show: boolean): void;
}): React.JSX.Element {
  const showSkySnapshot = show;
  const skyStars = result.skySnapshot.stars.filter((star) => star.aboveGeometricHorizon && star.azimuthDeg !== null);
  const brightestSkyStarIds = new Set(
    [...skyStars]
      .sort((left, right) => left.visualMagnitude - right.visualMagnitude)
      .slice(0, 5)
      .map((star) => star.starId)
  );
  brightestSkyStarIds.add(settings.starId);
  const selectedSkyStar = result.skySnapshot.stars.find((star) => star.starId === settings.starId);
  const plottedLocalCounts = {
    above: skyStars.filter((star) => star.localHorizonStatus === 'above').length,
    onHorizon: skyStars.filter((star) => star.localHorizonStatus === 'on-horizon').length,
    below: skyStars.filter((star) => star.localHorizonStatus === 'below').length
  };

  return (
""" + textwrap.indent(sky_jsx, "    ") + "\n  );\n}\n"
SKY.write_text(sky_component, encoding="utf-8")

results_jsx = textwrap.dedent(results_block)
results_component = """import { BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';
import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { ModelPrediction } from '../../shared/domain';
import {
  angleFormatter,
  apparentTrailPolyline,
  formatAngle,
  formatClock,
  formatDuration,
  horizonClassLabels,
  localHorizonPolyline,
  preciseFormatter,
  trailPolyline
} from './stellar-observation-view-model';

export function StellarObservationResults({
  result,
  prediction,
  settings,
  showRefractionDiagnostic
}: {
  result: StellarObservationResult;
  prediction: ModelPrediction;
  settings: StellarObservationSettings;
  showRefractionDiagnostic: boolean;
}): React.JSX.Element {
  const position = result.position;
  const firstLocalSample = result.localHorizonTrail?.samples[0];
  const crossings = result.trail.horizonCrossings;
  const localCrossings = result.localHorizonTrail?.localHorizonCrossings ?? [];
  const polyline = trailPolyline(result);
  const apparentPolyline = apparentTrailPolyline(result);
  const skylinePolyline = localHorizonPolyline(result);

  return (
    <>
""" + textwrap.indent(results_jsx, "      ") + "\n    </>\n  );\n}\n"
RESULTS.write_text(results_component, encoding="utf-8")

# Remove the moved helper block and adjust imports.
text = text[:helper_start] + text[panel_start:]
old_catalog_import = "import { BRIGHT_STAR_CATALOG, BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';\n"
new_catalog_import = "import { BRIGHT_STAR_CATALOG } from '../../simulation/bright-star-catalog';\n"
if text.count(old_catalog_import) != 1:
    fail("bright-star catalog import changed")
text = text.replace(old_catalog_import, new_catalog_import, 1)

old_visual_import = "import { projectStellarSkyPoint, stellarSkyMarkerRadius } from './stellar-sky-visualization';\n"
if text.count(old_visual_import) != 1:
    fail("stellar sky visualization import changed")
text = text.replace(old_visual_import, "", 1)

component_anchor = "import { StellarPanoramaSkylineControl } from './StellarPanoramaSkylineControl';\n"
if text.count(component_anchor) != 1:
    fail("stellar panorama import anchor changed")
extra_imports = """import { StellarObservationResults } from './StellarObservationResults';
import { StellarSkySnapshotPanel } from './StellarSkySnapshotPanel';
import {
  angleFormatter,
  cloneExternalSource,
  cloneMotionSource,
  currentLocalHorizonState,
  externalSourceSignature,
  formatAngle,
  formatImportedAt,
  localHorizonDraftFromSettings,
  localHorizonDraftMatchesSettings,
  localHorizonSignature,
  motionSourceSignature,
  type LocalHorizonDirectionKey,
  type LocalHorizonDraft
} from './stellar-observation-view-model';
"""
text = text.replace(component_anchor, component_anchor + extra_imports, 1)

# Replace the large derived visualization state with only values still owned by the parent.
derived_start = text.index(markers[2])
source_dirty_start = text.index(markers[3])
text = (
    text[:derived_start]
    + "  const position = result.position;\n"
      "  const localState = currentLocalHorizonState(result);\n"
      "  const apparent = result.apparentDiagnostic;\n"
    + text[source_dirty_start:]
)

# Re-locate JSX sections after earlier edits and replace them with focused components.
sky_start = text.index(markers[4])
results_start = text.index(markers[5])
section_close = text.index(markers[6])
text = (
    text[:sky_start]
    + "      <StellarSkySnapshotPanel\n"
      "        onShowChange={setShowSkySnapshot}\n"
      "        result={result}\n"
      "        settings={settings}\n"
      "        show={showSkySnapshot}\n"
      "      />\n\n"
    + text[results_start:]
)
results_start = text.index(markers[5])
section_close = text.index(markers[6])
text = (
    text[:results_start]
    + "      <StellarObservationResults\n"
      "        prediction={prediction}\n"
      "        result={result}\n"
      "        settings={settings}\n"
      "        showRefractionDiagnostic={showRefractionDiagnostic}\n"
      "      />\n"
    + text[section_close:]
)

# Guardrails: moved responsibilities must not remain in the orchestrator.
for forbidden in (
    "const horizonClassLabels:",
    "function trailPolyline(",
    "projectStellarSkyPoint(",
    "className=\"stellar-coordinate-grid\"",
    "className=\"stellar-sky-chart-wrap\""
):
    if forbidden in text:
        fail(f"moved responsibility unexpectedly remained in panel: {forbidden}")
if "<StellarSkySnapshotPanel" not in text or "<StellarObservationResults" not in text:
    fail("split component calls missing")

SOURCE.write_text(text, encoding="utf-8")

print("StellarObservationPanel refactor applied successfully.")
print("Created:")
for target in (VIEW_MODEL, SKY, RESULTS):
    print(f"  - {target.relative_to(ROOT)}")
print(f"Updated: {SOURCE.relative_to(ROOT)}")
