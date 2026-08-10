import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const current = fs.readFileSync(path, 'utf8');
  const count = current.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: beklenen parça ${count} kez bulundu`);
  fs.writeFileSync(path, current.replace(before, after));
}

// shared/simulator.ts
replaceOnce(
  'src/shared/simulator.ts',
  "import type {\n  ImportedStellarLocalHorizonProfile,\n  SavedStellarLocalHorizonSource\n} from './stellar-local-horizon-import';\n",
  "import type {\n  ImportedStellarLocalHorizonProfile,\n  SavedStellarLocalHorizonSource\n} from './stellar-local-horizon-import';\nimport type { ImportStellarMotionResult, SavedStellarMotionSource } from './stellar-motion-source';\n"
);
replaceOnce(
  'src/shared/simulator.ts',
  "  /** Optional high-resolution geometric skyline source used by the stellar observation scenario. */\n  stellarLocalHorizonSource?: SavedStellarLocalHorizonSource;\n",
  "  /** Optional high-resolution geometric skyline source used by the stellar observation scenario. */\n  stellarLocalHorizonSource?: SavedStellarLocalHorizonSource;\n  /** Optional verified BSC5P proper-motion source used by the stellar observation scenario. */\n  stellarMotionSource?: SavedStellarMotionSource;\n"
);
replaceOnce(
  'src/shared/simulator.ts',
  "  importStellarLocalHorizon(): Promise<ImportStellarLocalHorizonResult>;\n",
  "  importStellarLocalHorizon(): Promise<ImportStellarLocalHorizonResult>;\n  importStellarMotionSource(): Promise<ImportStellarMotionResult>;\n"
);

// preload
replaceOnce(
  'src/preload/index.ts',
  "} from '../shared/simulator';\n",
  "} from '../shared/simulator';\nimport type { ImportStellarMotionResult } from '../shared/stellar-motion-source';\n"
);
replaceOnce(
  'src/preload/index.ts',
  "  importStellarLocalHorizon: () =>\n    ipcRenderer.invoke('stellar-horizon:import') as Promise<ImportStellarLocalHorizonResult>,\n",
  "  importStellarLocalHorizon: () =>\n    ipcRenderer.invoke('stellar-horizon:import') as Promise<ImportStellarLocalHorizonResult>,\n  importStellarMotionSource: () =>\n    ipcRenderer.invoke('stellar-motion:import') as Promise<ImportStellarMotionResult>,\n"
);

// main imports/constants
replaceOnce(
  'src/main/index.ts',
  "import { parseStellarLocalHorizonFile } from '../simulation/stellar-local-horizon-import';\n",
  "import { parseStellarLocalHorizonFile } from '../simulation/stellar-local-horizon-import';\nimport { buildVerifiedBrightStarMotionSubset } from '../simulation/bsc5p-motion-subset';\nimport { savedStellarMotionSourceFromVerifiedSubset } from '../simulation/stellar-motion-source';\nimport type { ImportStellarMotionResult } from '../shared/stellar-motion-source';\n"
);
replaceOnce(
  'src/main/index.ts',
  "const MAX_STELLAR_HORIZON_BYTES = 2 * 1024 * 1024;\n",
  "const MAX_STELLAR_HORIZON_BYTES = 2 * 1024 * 1024;\nconst MAX_STELLAR_MOTION_BYTES = 4 * 1024 * 1024;\n"
);
const horizonHandlerEnd = `  ipcMain.handle(\n    'terrain:import-csv',`;
const motionHandler = `  ipcMain.handle(\n    'stellar-motion:import',\n    async (event): Promise<ImportStellarMotionResult> => {\n      const selection = await showOpenDialog(event, {\n        title: 'BSC5P Proper Motion Kataloğunu İçe Aktar',\n        properties: ['openFile'],\n        filters: [{ name: 'BSC5P catalog / metin dosyası', extensions: ['txt', 'dat', 'catalog', '*'] }]\n      });\n      const selectedPath = selection.filePaths[0];\n      if (selection.canceled || !selectedPath) {\n        return { status: 'cancelled', message: 'Proper-motion kaynak seçimi iptal edildi.' };\n      }\n\n      const statistics = await fs.stat(selectedPath);\n      if (!statistics.isFile()) throw new Error('Seçilen BSC5P yolu normal bir dosya değil.');\n      if (statistics.size <= 0 || statistics.size > MAX_STELLAR_MOTION_BYTES) {\n        throw new Error('BSC5P kaynak dosyası boş olamaz ve 4 MB sınırını aşamaz.');\n      }\n\n      const bytes = await fs.readFile(selectedPath);\n      const subset = buildVerifiedBrightStarMotionSubset(bytes.toString('utf-8'));\n      const sha256 = createHash('sha256').update(bytes).digest('hex');\n      const source = savedStellarMotionSourceFromVerifiedSubset({\n        subset,\n        fileName: basename(selectedPath),\n        importedAtIso: new Date().toISOString(),\n        fileSizeBytes: bytes.byteLength,\n        sha256\n      });\n      return {\n        status: 'success',\n        message: '“' + source.fileName + '” doğrulandı: ' + source.entryCount + '/19 proper-motion kaydı hazır.',\n        filePath: selectedPath,\n        source\n      };\n    }\n  );\n\n`;
replaceOnce('src/main/index.ts', horizonHandlerEnd, motionHandler + horizonHandlerEnd);

// portable imports/version/types
replaceOnce(
  'src/shared/portable.ts',
  "import type { SavedStellarLocalHorizonSource } from './stellar-local-horizon-import';\n",
  "import type { SavedStellarLocalHorizonSource } from './stellar-local-horizon-import';\nimport type { SavedStellarMotionSource } from './stellar-motion-source';\nimport { verifiedMotionSubsetFromSavedSource } from '../simulation/stellar-motion-source';\n"
);
replaceOnce(
  'src/shared/portable.ts',
  "export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 8;\nexport const LOCAL_EXPERIMENT_STORE_SCHEMA = 'geometric-observation-laboratory/local-experiment-store';\nexport const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 8;\n",
  "export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 9;\nexport const LOCAL_EXPERIMENT_STORE_SCHEMA = 'geometric-observation-laboratory/local-experiment-store';\nexport const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 9;\n"
);
replaceOnce(
  'src/shared/portable.ts',
  'export interface PortableExperimentFileV8 {',
  'export interface PortableExperimentFileV9 {'
);
replaceOnce(
  'src/shared/portable.ts',
  'export interface LocalExperimentStoreV8 {',
  'export interface LocalExperimentStoreV9 {'
);
replaceOnce(
  'src/shared/portable.ts',
  '  store: LocalExperimentStoreV8;',
  '  store: LocalExperimentStoreV9;'
);

// portable motion parser before text history
const textHistoryAnchor = 'function parseTextSetupHistory(value: unknown): TextExperimentSetupProvenance[] | null {';
const motionParser = `function parseStellarMotionSource(value: unknown): SavedStellarMotionSource | null {\n  if (!isRecord(value) || !isNonEmptyString(value.fileName) || value.fileName.length > 240 ||\n    !isIsoDate(value.importedAtIso) || !Number.isInteger(value.fileSizeBytes) ||\n    !inRange(value.fileSizeBytes, 1, 4 * 1024 * 1024) ||\n    typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256) ||\n    !isNonEmptyString(value.subsetId) || !isNonEmptyString(value.subsetVersion) ||\n    !isNonEmptyString(value.sourceCatalog) || !isNonEmptyString(value.sourceFormatId) ||\n    !isNonEmptyString(value.sourceFormatVersion) || !isFiniteNumber(value.sourceEpochJulianYear) ||\n    value.sourceFrame !== 'fk5-j2000' || !Number.isInteger(value.entryCount) || value.entryCount !== 19 ||\n    !Array.isArray(value.entries) || value.entries.length !== value.entryCount ||\n    typeof value.modifiedAfterImport !== 'boolean') {\n    return null;\n  }\n  const entries: SavedStellarMotionSource['entries'] = [];\n  for (const item of value.entries) {\n    if (!isRecord(item) || !isNonEmptyString(item.starId) || !isNonEmptyString(item.commonName) ||\n      !Number.isInteger(item.hrNumber) || !inRange(item.hrNumber, 1, 9110) ||\n      !inRange(item.sourceRightAscensionJ2000Deg, 0, 360) || item.sourceRightAscensionJ2000Deg === 360 ||\n      !inRange(item.sourceDeclinationJ2000Deg, -90, 90) || !isFiniteNumber(item.visualMagnitude) ||\n      !isFiniteNumber(item.properMotionRaStarArcsecPerYear) ||\n      !isFiniteNumber(item.properMotionDecArcsecPerYear) ||\n      (item.parallaxArcsec !== null && !isFiniteNumber(item.parallaxArcsec)) ||\n      (item.radialVelocityKmPerSec !== null && !isFiniteNumber(item.radialVelocityKmPerSec)) ||\n      typeof item.sourceRecord !== 'string' || item.sourceRecord.length !== 197) {\n      return null;\n    }\n    entries.push({\n      starId: item.starId.trim(),\n      commonName: item.commonName.trim(),\n      hrNumber: item.hrNumber,\n      sourceRightAscensionJ2000Deg: item.sourceRightAscensionJ2000Deg,\n      sourceDeclinationJ2000Deg: item.sourceDeclinationJ2000Deg,\n      visualMagnitude: item.visualMagnitude,\n      properMotionRaStarArcsecPerYear: item.properMotionRaStarArcsecPerYear,\n      properMotionDecArcsecPerYear: item.properMotionDecArcsecPerYear,\n      parallaxArcsec: item.parallaxArcsec,\n      radialVelocityKmPerSec: item.radialVelocityKmPerSec,\n      sourceRecord: item.sourceRecord\n    });\n  }\n  const source: SavedStellarMotionSource = {\n    fileName: value.fileName.trim(),\n    importedAtIso: value.importedAtIso,\n    fileSizeBytes: value.fileSizeBytes,\n    sha256: value.sha256,\n    subsetId: value.subsetId.trim(),\n    subsetVersion: value.subsetVersion.trim(),\n    sourceCatalog: value.sourceCatalog.trim(),\n    sourceFormatId: value.sourceFormatId.trim(),\n    sourceFormatVersion: value.sourceFormatVersion.trim(),\n    sourceEpochJulianYear: value.sourceEpochJulianYear,\n    sourceFrame: 'fk5-j2000',\n    entryCount: value.entryCount,\n    entries,\n    modifiedAfterImport: value.modifiedAfterImport\n  };\n  try {\n    verifiedMotionSubsetFromSavedSource(source);\n  } catch {\n    return null;\n  }\n  return { ...source, entries: source.entries.map((entry) => ({ ...entry })) };\n}\n\n`;
replaceOnce('src/shared/portable.ts', textHistoryAnchor, motionParser + textHistoryAnchor);

// parse saved experiment
replaceOnce(
  'src/shared/portable.ts',
  "  const stellarLocalHorizonSource = value.stellarLocalHorizonSource === undefined\n    ? undefined\n    : parseStellarLocalHorizonSource(value.stellarLocalHorizonSource);\n  if (stellarLocalHorizonSource === null) return null;\n",
  "  const stellarLocalHorizonSource = value.stellarLocalHorizonSource === undefined\n    ? undefined\n    : parseStellarLocalHorizonSource(value.stellarLocalHorizonSource);\n  if (stellarLocalHorizonSource === null) return null;\n  const stellarMotionSource = value.stellarMotionSource === undefined\n    ? undefined\n    : parseStellarMotionSource(value.stellarMotionSource);\n  if (stellarMotionSource === null) return null;\n"
);
replaceOnce(
  'src/shared/portable.ts',
  "    ...(stellarLocalHorizonSource === undefined ? {} : { stellarLocalHorizonSource }),\n",
  "    ...(stellarLocalHorizonSource === undefined ? {} : { stellarLocalHorizonSource }),\n    ...(stellarMotionSource === undefined ? {} : { stellarMotionSource }),\n"
);
replaceOnce(
  'src/shared/portable.ts',
  '): PortableExperimentFileV8 {',
  '): PortableExperimentFileV9 {'
);
replaceOnce(
  'src/shared/portable.ts',
  '): LocalExperimentStoreV8 {',
  '): LocalExperimentStoreV9 {'
);
replaceOnce(
  'src/shared/portable.ts',
  "    version !== 5 && version !== 6 && version !== 7 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {",
  "    version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {"
);
replaceOnce(
  'src/shared/portable.ts',
  "    version !== 5 && version !== 6 && version !== 7 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {",
  "    version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {"
);

// app version
replaceOnce('package.json', '"version": "1.17.1"', '"version": "1.18.0"');

console.log('stage 6.23 core patch applied');
