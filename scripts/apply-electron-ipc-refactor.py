#!/usr/bin/env python3
"""Behavior-preserving split of src/main/index.ts into focused Electron main/IPC modules.

The script extracts existing handler bodies verbatim and only rewires module imports/registration.
It is temporary and must be removed before merge.
"""

from pathlib import Path
import sys
import textwrap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/main/index.ts"
DIALOGS = ROOT / "src/main/ipc-dialogs.ts"
STORE = ROOT / "src/main/experiment-store.ts"
EXPERIMENT = ROOT / "src/main/experiment-ipc.ts"
PHOTO = ROOT / "src/main/photo-ipc.ts"
STELLAR = ROOT / "src/main/stellar-source-ipc.ts"
TERRAIN = ROOT / "src/main/terrain-import-ipc.ts"
WINDOW = ROOT / "src/main/main-window.ts"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


for target in (DIALOGS, STORE, EXPERIMENT, PHOTO, STELLAR, TERRAIN, WINDOW):
    if target.exists():
        fail(f"target already exists: {target.relative_to(ROOT)}")

text = SOURCE.read_text(encoding="utf-8")
markers = {
    "experiments_path": "function experimentsFilePath(): string {",
    "safe_stem": "function safeFileStem(value: string): string {",
    "store_tail": "async function replaceFileAtomically(",
    "terrain_helpers": "function validateTerrainImportContext(value: unknown): TerrainProfileImportContext {",
    "register": "function registerExperimentHandlers(): void {",
    "experiment_list": "  ipcMain.handle('experiments:list', async () => readExperiments());",
    "photo": "  ipcMain.handle(\n    'photo:import',",
    "stellar": "  ipcMain.handle(\n    'stellar-horizon:import',",
    "terrain": "  ipcMain.handle(\n    'terrain:import-csv',",
    "report": "  ipcMain.handle(\n    'experiments:report',",
    "window": "function createMainWindow(): void {",
    "ready": "app.whenReady().then(() => {"
}
for name, marker in markers.items():
    if text.count(marker) != 1:
        fail(f"expected exactly one {name} marker")

experiments_path_start = text.index(markers["experiments_path"])
safe_start = text.index(markers["safe_stem"])
store_tail_start = text.index(markers["store_tail"])
terrain_helpers_start = text.index(markers["terrain_helpers"])
register_start = text.index(markers["register"])
experiment_list_start = text.index(markers["experiment_list"])
photo_start = text.index(markers["photo"])
stellar_start = text.index(markers["stellar"])
terrain_start = text.index(markers["terrain"])
report_start = text.index(markers["report"])
window_start = text.index(markers["window"])
ready_start = text.index(markers["ready"])
register_end = text.rfind("\n}\n\n", report_start, window_start)
if register_end < 0:
    fail("registerExperimentHandlers closing brace not found")

order = [
    experiments_path_start, safe_start, store_tail_start, terrain_helpers_start,
    register_start, experiment_list_start, photo_start, stellar_start,
    terrain_start, report_start, register_end, window_start, ready_start
]
if order != sorted(order):
    fail("unexpected src/main/index.ts section ordering")

# Dialog ownership and safe file-name helper.
dialog_body = text[safe_start:store_tail_start].rstrip()
DIALOGS.write_text(
    """import {\n  BrowserWindow,\n  dialog,\n  type IpcMainInvokeEvent,\n  type OpenDialogOptions,\n  type SaveDialogOptions\n} from 'electron';\n\n"""
    + dialog_body
      .replace("function safeFileStem(", "export function safeFileStem(", 1)
      .replace("async function showSaveDialog(", "export async function showSaveDialog(", 1)
      .replace("async function showOpenDialog(", "export async function showOpenDialog(", 1)
    + "\n",
    encoding="utf-8"
)

# Local experiment persistence stays independent of IPC/UI dialogs.
store_body = (
    text[experiments_path_start:safe_start].rstrip()
    + "\n\n"
    + text[store_tail_start:terrain_helpers_start].rstrip()
)
for old, new in (
    ("async function readExperiments(", "export async function readExperiments("),
    ("async function writeExperiments(", "export async function writeExperiments("),
    ("async function getExperimentOrThrow(", "export async function getExperimentOrThrow(")
):
    if store_body.count(old) != 1:
        fail(f"store export marker changed: {old}")
    store_body = store_body.replace(old, new, 1)
STORE.write_text(
    """import { app } from 'electron';\nimport { promises as fs } from 'node:fs';\nimport { join } from 'node:path';\nimport {\n  createLocalExperimentStore,\n  parseLocalExperimentStore\n} from '../shared/portable';\nimport type { SavedExperiment } from '../shared/simulator';\n\nconst EXPERIMENTS_FILE_NAME = 'experiments.json';\n\n"""
    + store_body + "\n",
    encoding="utf-8"
)

# Existing experiment CRUD/portable/report handlers, verbatim inside a focused registrar.
experiment_primary = text[experiment_list_start:photo_start].rstrip()
report_block = text[report_start:register_end].rstrip()
EXPERIMENT.write_text(
    """import { app, ipcMain } from 'electron';\nimport { randomUUID } from 'node:crypto';\nimport { promises as fs } from 'node:fs';\nimport { join } from 'node:path';\nimport { createExperimentHtmlReport } from '../report/html-report';\nimport {\n  createPortableExperimentFile,\n  isSavedExperiment,\n  parsePortableExperimentFile\n} from '../shared/portable';\nimport type {\n  FileOperationResult,\n  ImportExperimentResult,\n  SavedExperiment\n} from '../shared/simulator';\nimport {\n  createPortableObservationPhotoAsset,\n  persistPortableObservationPhotoAsset\n} from './observation-photo-assets';\nimport {\n  getExperimentOrThrow,\n  readExperiments,\n  writeExperiments\n} from './experiment-store';\nimport { safeFileStem, showOpenDialog, showSaveDialog } from './ipc-dialogs';\n\nexport function registerExperimentIpcHandlers(): void {\n"""
    + experiment_primary + "\n\n" + report_block + "\n}\n",
    encoding="utf-8"
)

# Observation-photo handlers.
photo_block = text[photo_start:stellar_start].rstrip()
PHOTO.write_text(
    """import { ipcMain, nativeImage } from 'electron';\nimport { createHash } from 'node:crypto';\nimport { promises as fs } from 'node:fs';\nimport { basename, extname } from 'node:path';\nimport {\n  MAX_PORTABLE_OBSERVATION_PHOTO_BYTES,\n  parsePhotoSourceMetadata\n} from '../shared/portable-photo-asset';\nimport type {\n  ImportObservationPhotoResult,\n  LoadObservationPhotoResult\n} from '../shared/simulator';\nimport {\n  loadObservationPhotoAsset,\n  persistObservationPhotoBytes\n} from './observation-photo-assets';\nimport { showOpenDialog } from './ipc-dialogs';\n\nexport function registerPhotoIpcHandlers(): void {\n"""
    + photo_block + "\n}\n",
    encoding="utf-8"
)

# Stellar local-horizon and proper-motion source imports.
stellar_block = text[stellar_start:terrain_start].rstrip()
STELLAR.write_text(
    """import { ipcMain } from 'electron';\nimport { createHash } from 'node:crypto';\nimport { promises as fs } from 'node:fs';\nimport { basename } from 'node:path';\nimport { buildVerifiedBrightStarMotionSubset } from '../simulation/bsc5p-motion-subset';\nimport { parseStellarLocalHorizonFile } from '../simulation/stellar-local-horizon-import';\nimport { savedStellarMotionSourceFromVerifiedSubset } from '../simulation/stellar-motion-source';\nimport type { ImportStellarMotionResult } from '../shared/stellar-motion-source';\nimport type { ImportStellarLocalHorizonResult } from '../shared/simulator';\nimport { calculateTerrainSourceIntegrity } from './terrain-source-integrity';\nimport { showOpenDialog } from './ipc-dialogs';\n\nconst MAX_STELLAR_HORIZON_BYTES = 2 * 1024 * 1024;\nconst MAX_STELLAR_MOTION_BYTES = 4 * 1024 * 1024;\n\nexport function registerStellarSourceIpcHandlers(): void {\n"""
    + stellar_block + "\n}\n",
    encoding="utf-8"
)

# Terrain validation, pending CSV mapping state, and import handlers.
terrain_helpers = text[terrain_helpers_start:register_start].rstrip()
terrain_handlers = text[terrain_start:report_start].rstrip()
TERRAIN.write_text(
    """import { ipcMain } from 'electron';\nimport { randomUUID } from 'node:crypto';\nimport { promises as fs } from 'node:fs';\nimport { buildTerrainProfileFromDem } from '../simulation/dem-route-profile';\nimport {\n  parseTerrainProfileCsv,\n  TerrainProfileColumnMappingRequiredError\n} from '../simulation/csv-terrain-profile';\nimport { parseEsriAsciiGrid } from '../simulation/esri-ascii-grid';\nimport { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';\nimport type {\n  DemTerrainProfileImportContext,\n  ImportTerrainProfileResult,\n  TerrainProfileColumnMapping,\n  TerrainProfileImportContext,\n  TerrainSourceIntegrity\n} from '../shared/simulator';\nimport {\n  attachTerrainSourceIntegrity,\n  calculateTerrainSourceIntegrity\n} from './terrain-source-integrity';\nimport { showOpenDialog } from './ipc-dialogs';\n\nconst MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;\nconst MAX_DEM_BYTES = 64 * 1024 * 1024;\nconst TERRAIN_MAPPING_TTL_MS = 10 * 60 * 1_000;\n\ninterface PendingTerrainImport {\n  content: string;\n  fileName: string;\n  integrity: TerrainSourceIntegrity;\n  createdAtMs: number;\n}\n\nconst pendingTerrainImports = new Map<string, PendingTerrainImport>();\n\n"""
    + terrain_helpers + "\n\nexport function registerTerrainImportIpcHandlers(): void {\n"
    + terrain_handlers + "\n}\n",
    encoding="utf-8"
)

# Window creation is infrastructure, separate from IPC registration and app lifecycle.
window_block = text[window_start:ready_start].rstrip().replace(
    "function createMainWindow(): void {",
    "export function createMainWindow(): void {",
    1
)
WINDOW.write_text(
    """import { BrowserWindow, shell } from 'electron';\nimport { join } from 'node:path';\n\n"""
    + window_block + "\n",
    encoding="utf-8"
)

# Thin bootstrap/wiring entry point.
new_index = """import { app, BrowserWindow } from 'electron';
import { registerExperimentIpcHandlers } from './experiment-ipc';
import { registerPhotoIpcHandlers } from './photo-ipc';
import { registerStellarSourceIpcHandlers } from './stellar-source-ipc';
import { registerTerrainImportIpcHandlers } from './terrain-import-ipc';
import { registerStellarDemSkylineHandlers } from './stellar-dem-skyline-ipc';
import { registerStellarPanoramaSkylineHandlers } from './stellar-panorama-skyline-ipc';
import { createMainWindow } from './main-window';

function registerIpcHandlers(): void {
  registerExperimentIpcHandlers();
  registerPhotoIpcHandlers();
  registerStellarSourceIpcHandlers();
  registerTerrainImportIpcHandlers();
  registerStellarDemSkylineHandlers();
  registerStellarPanoramaSkylineHandlers();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
"""
SOURCE.write_text(new_index, encoding="utf-8")

# Fail closed on accidental loss/duplication of handler channels.
combined = "\n".join(
    target.read_text(encoding="utf-8")
    for target in (EXPERIMENT, PHOTO, STELLAR, TERRAIN)
)
for channel in (
    "experiments:list", "experiments:save", "experiments:delete", "experiments:export",
    "experiments:import", "experiments:report", "photo:import", "photo:load-saved",
    "stellar-horizon:import", "stellar-motion:import", "terrain:import-csv",
    "terrain:import-csv-mapped", "terrain:import-dem", "terrain:import-geojson"
):
    if combined.count(f"'{channel}'") != 1:
        fail(f"IPC channel lost or duplicated: {channel}")

print("Electron main/IPC refactor applied successfully.")
print("Created:")
for target in (DIALOGS, STORE, EXPERIMENT, PHOTO, STELLAR, TERRAIN, WINDOW):
    print(f"  - {target.relative_to(ROOT)}")
print(f"Updated: {SOURCE.relative_to(ROOT)}")
