#!/usr/bin/env python3
"""Behavior-preserving split for PhotoCalibrationControl.tsx.

Creates a state/view-model helper and a marker viewport component while keeping
PhotoCalibrationControl as the orchestration and persistence boundary. The
script is intentionally fail-closed and must be removed before merge.
"""

from pathlib import Path
import sys
import textwrap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/renderer/src/PhotoCalibrationControl.tsx"
STATE = ROOT / "src/renderer/src/photo-calibration-state.ts"
MARKER = ROOT / "src/renderer/src/PhotoCalibrationMarkerPanel.tsx"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


for target in (STATE, MARKER):
    if target.exists():
        fail(f"target already exists: {target.relative_to(ROOT)}")

text = SOURCE.read_text(encoding="utf-8")
markers = [
    "type MarkKey = keyof PhotoCalibrationMarks;",
    "interface PhotoSessionStatus {",
    "  const candidate = useMemo(() => {",
    "  const loadPhoto = async (): Promise<void> => {",
    "      {preview && (",
    "          <div className=\"photo-camera-grid\">",
    "  const markerRadius = source ? Math.max(8, source.imageWidthPx * 0.012) : 10;",
    "  const markerLabelSize = source ? Math.max(14, source.imageWidthPx * 0.018) : 20;"
]
for marker in markers:
    if text.count(marker) != 1:
        fail(f"expected exactly one marker: {marker}")

helper_start = text.index(markers[0])
status_start = text.index(markers[1])
candidate_start = text.index(markers[2])
load_start = text.index(markers[3])
marker_start = text.index(markers[4])
camera_start = text.index(markers[5])

if not (helper_start < status_start < candidate_start < load_start < marker_start < camera_start):
    fail("unexpected PhotoCalibrationControl section ordering")

helper_block = text[helper_start:status_start]
for old, new in (
    ("type MarkKey =", "export type MarkKey ="),
    ("type CalibrationSource =", "export type CalibrationSource ="),
    ("interface DraftState {", "export interface DraftState {"),
    ("const markOrder:", "export const markOrder:"),
    ("const markLabels:", "export const markLabels:"),
    ("const markShortLabels:", "export const markShortLabels:"),
    ("function emptyDraft(", "export function emptyDraft("),
    ("function draftFromSaved(", "export function draftFromSaved("),
    ("function defaultMarks(", "export function defaultMarks("),
    ("function finiteDraftNumber(", "export function finiteDraftNumber("),
    ("function cameraUncertaintyFromDraft(", "export function cameraUncertaintyFromDraft("),
    ("function sourceMetadata(", "export function sourceMetadata("),
    ("function formatBytes(", "export function formatBytes("),
    ("function formatAngle(", "export function formatAngle("),
    ("function markSummary(", "export function markSummary(")
):
    if helper_block.count(old) != 1:
        fail(f"helper marker changed: {old}")
    helper_block = helper_block.replace(old, new, 1)

candidate_block = text[candidate_start:load_start].rstrip()
candidate_prefix = "  const candidate = useMemo(() => {\n"
candidate_suffix = "\n  }, [draft, experimentId, touchedMarks]);"
if not candidate_block.startswith(candidate_prefix) or not candidate_block.endswith(candidate_suffix):
    fail("candidate useMemo block shape changed")
candidate_inner = candidate_block[len(candidate_prefix):-len(candidate_suffix)]
candidate_inner = textwrap.dedent(candidate_inner).rstrip()
candidate_function = (
    "export function buildPhotoCalibrationCandidate(\n"
    "  draft: DraftState,\n"
    "  experimentId: string,\n"
    "  touchedMarks: ReadonlySet<MarkKey>\n"
    ") {\n"
    + textwrap.indent(candidate_inner, "  ")
    + "\n}\n"
)

state_imports = """import type {
  CameraCalibrationUncertainty,
  ImportedObservationPhoto,
  PhotoCalibrationMarks,
  PhotoReferenceKind,
  PhotoSourceMetadata,
  SavedPhotoCalibration
} from '../../shared/photo-calibration';
import { createPhotoCalibrationRecord } from '../../simulation/photo-calibration';

"""
STATE.write_text(state_imports + helper_block.rstrip() + "\n\n" + candidate_function, encoding="utf-8")

marker_component = """import type { PointerEvent, RefObject } from 'react';
import type {
  ImportedObservationPhoto,
  PhotoCalibrationMarks,
  PhotoSourceMetadata
} from '../../shared/photo-calibration';
import {
  markLabels,
  markOrder,
  markShortLabels,
  markSummary,
  type MarkKey
} from './photo-calibration-state';

export function PhotoCalibrationMarkerPanel({
  preview,
  source,
  marks,
  selectedMark,
  touchedMarks,
  viewportRef,
  onPlaceSelectedMark,
  onSelectMark
}: {
  preview?: ImportedObservationPhoto;
  source?: PhotoSourceMetadata;
  marks?: PhotoCalibrationMarks;
  selectedMark: MarkKey;
  touchedMarks: ReadonlySet<MarkKey>;
  viewportRef: RefObject<HTMLDivElement | null>;
  onPlaceSelectedMark(event: PointerEvent<SVGSVGElement>): void;
  onSelectMark(mark: MarkKey): void;
}): React.JSX.Element {
  const markerRadius = source ? Math.max(8, source.imageWidthPx * 0.012) : 10;
  const markerLabelSize = source ? Math.max(14, source.imageWidthPx * 0.018) : 20;

  return (
    <>
      {preview && (
        <p className="photo-calibration-note">
          Sıradaki işaret: <strong>{markLabels[selectedMark]}</strong>. Fotoğraf üzerinde ilgili noktaya tıkla;
          seçim otomatik olarak sonraki işarete geçer.
        </p>
      )}

      {preview ? (
        <div
          className="photo-marking-viewport"
          ref={viewportRef}
          style={{ aspectRatio: `${preview.imageWidthPx} / ${preview.imageHeightPx}` }}
        >
          <img alt="Kalibrasyon için yüklenen gözlem" src={preview.dataUrl} />
          {marks && (
            <svg
              aria-label="Fotoğraf kalibrasyon işaretleri"
              onPointerDown={onPlaceSelectedMark}
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 0 ${preview.imageWidthPx} ${preview.imageHeightPx}`}
            >
              <line
                className="photo-horizon-line"
                x1={marks.horizonStart.xPx}
                y1={marks.horizonStart.yPx}
                x2={marks.horizonEnd.xPx}
                y2={marks.horizonEnd.yPx}
              />
              {markOrder.map((key) => {
                const mark = marks[key];
                return (
                  <g className={`photo-mark ${selectedMark === key ? 'active' : ''}`} key={key}>
                    <circle cx={mark.xPx} cy={mark.yPx} r={markerRadius} />
                    <text
                      style={{ fontSize: `${markerLabelSize}px` }}
                      x={mark.xPx + markerRadius * 1.35}
                      y={mark.yPx - markerRadius * 1.35}
                    >{markShortLabels[key]}</text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      ) : source ? (
        <div className="photo-preview-missing">
          Fotoğraf provenansı ve işaretler kayıtlı, ancak kaynak görüntü varlığı bu makinede yok.
          Aynı dosyayı yeniden seç; SHA-256 eşleşirse mevcut kalibrasyon ve işaretler korunur.
        </div>
      ) : null}

      {source && marks && (
        <>
          <div className="photo-mark-tools">
            {markOrder.map((key) => (
              <button
                className={selectedMark === key ? 'active' : ''}
                key={key}
                type="button"
                onClick={() => onSelectMark(key)}
              >
                <b>{markShortLabels[key]}</b>
                <span>{markLabels[key]}</span>
                <small>{touchedMarks.has(key) ? markSummary(marks[key]) : 'fotoğrafta tıkla'}</small>
              </button>
            ))}
          </div>
          {touchedMarks.size < markOrder.length && (
            <p className="photo-warning">
              Yeni fotoğraftaki örnek işaretler ölçüm değildir. Kalibrasyon için dört işaretin
              her birini fotoğraf üzerinde bir kez yerleştir ({touchedMarks.size}/4).
            </p>
          )}
        </>
      )}
    </>
  );
}
"""
MARKER.write_text(marker_component, encoding="utf-8")

old_photo_import = """import type {
  CameraCalibrationUncertainty,
  ImportedObservationPhoto,
  PhotoCalibrationMarks,
  PhotoReferenceKind,
  PhotoSourceMetadata,
  SavedPhotoCalibration
} from '../../shared/photo-calibration';
"""
new_photo_import = """import type {
  CameraCalibrationUncertainty,
  ImportedObservationPhoto,
  PhotoReferenceKind,
  SavedPhotoCalibration
} from '../../shared/photo-calibration';
"""
if text.count(old_photo_import) != 1:
    fail("photo calibration import block changed")
text = text.replace(old_photo_import, new_photo_import, 1)

state_import = """import {
  buildPhotoCalibrationCandidate,
  cameraUncertaintyFromDraft,
  defaultMarks,
  draftFromSaved,
  emptyDraft,
  finiteDraftNumber,
  formatAngle,
  formatBytes,
  markOrder,
  sourceMetadata,
  type CalibrationSource,
  type DraftState,
  type MarkKey
} from './photo-calibration-state';
"""
anchor = "import { containedImagePointerToPixel } from '../../simulation/photo-overlay';\n"
if text.count(anchor) != 1:
    fail("photo overlay import anchor changed")
text = text.replace(anchor, anchor + state_import, 1)

help_anchor = "import { PanelHelpButton } from './HelpSystem';\n"
if text.count(help_anchor) != 1:
    fail("HelpSystem import anchor changed")
text = text.replace(help_anchor, help_anchor + "import { PhotoCalibrationMarkerPanel } from './PhotoCalibrationMarkerPanel';\n", 1)

# Remove moved helper definitions.
text = text[:helper_start] + text[status_start:]

# Recompute candidate markers after the earlier removal and replace useMemo body.
candidate_start = text.index("  const candidate = useMemo(() => {")
load_start = text.index("  const loadPhoto = async (): Promise<void> => {")
text = (
    text[:candidate_start]
    + "  const candidate = useMemo(\n"
      "    () => buildPhotoCalibrationCandidate(draft, experimentId, touchedMarks),\n"
      "    [draft, experimentId, touchedMarks]\n"
      "  );\n\n"
    + text[load_start:]
)

for line in (
    "  const markerRadius = source ? Math.max(8, source.imageWidthPx * 0.012) : 10;\n",
    "  const markerLabelSize = source ? Math.max(14, source.imageWidthPx * 0.018) : 20;\n"
):
    if text.count(line) != 1:
        fail(f"marker sizing line changed: {line.strip()}")
    text = text.replace(line, "", 1)

marker_start = text.index("      {preview && (")
camera_start = text.index("          <div className=\"photo-camera-grid\">")
marker_replacement = """      <PhotoCalibrationMarkerPanel
        marks={marks}
        onPlaceSelectedMark={placeSelectedMark}
        onSelectMark={setSelectedMark}
        preview={preview}
        selectedMark={selectedMark}
        source={source}
        touchedMarks={touchedMarks}
        viewportRef={viewportRef}
      />

      {source && marks && (
        <>
"""
text = text[:marker_start] + marker_replacement + text[camera_start:]

if "const markLabels:" in text or "function cameraUncertaintyFromDraft(" in text:
    fail("moved state helpers unexpectedly remained in PhotoCalibrationControl")
if "photo-marking-viewport" in text or "photo-mark-tools" in text:
    fail("marker UI unexpectedly remained in PhotoCalibrationControl")
if "buildPhotoCalibrationCandidate(draft, experimentId, touchedMarks)" not in text:
    fail("candidate view-model call missing")

SOURCE.write_text(text, encoding="utf-8")

print("PhotoCalibrationControl refactor applied successfully.")
print("Created:")
print(f"  - {STATE.relative_to(ROOT)}")
print(f"  - {MARKER.relative_to(ROOT)}")
print(f"Updated: {SOURCE.relative_to(ROOT)}")
