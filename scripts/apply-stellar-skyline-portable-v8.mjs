import fs from 'node:fs';

function replaceExactlyOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: blok birden fazla bulundu.`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const file = 'src/shared/portable.ts';
let source = fs.readFileSync(file, 'utf8');

source = replaceExactlyOnce(
  source,
  `  type SimulatorInputs,\n  type TerrainProfileSource\n} from './simulator';`,
  `  type SimulatorInputs,\n  type TerrainProfileSource\n} from './simulator';\nimport type { SavedStellarLocalHorizonSource } from './stellar-local-horizon-import';`,
  'saved skyline import'
);
source = replaceExactlyOnce(
  source,
  `} from '../simulation/manual-terrain-profile';`,
  `} from '../simulation/manual-terrain-profile';\nimport { normalizeStellarLocalHorizonMask } from '../simulation/stellar-local-horizon';`,
  'skyline normalizer import'
);
source = source.replace(
  `export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 7;`,
  `export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 8;`
).replace(
  `export const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 7;`,
  `export const LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 8;`
).replaceAll('PortableExperimentFileV7', 'PortableExperimentFileV8')
  .replaceAll('LocalExperimentStoreV7', 'LocalExperimentStoreV8');

const helperAnchor = `function parseTextSetupHistory(value: unknown): TextExperimentSetupProvenance[] | null {`;
const helper = `function parseStellarLocalHorizonSource(value: unknown): SavedStellarLocalHorizonSource | null {\n  if (!isRecord(value) || !isNonEmptyString(value.fileName) || value.fileName.length > 240 ||\n    !isIsoDate(value.importedAtIso) || (value.format !== 'csv' && value.format !== 'json') ||\n    !Number.isInteger(value.pointCount) || !inRange(value.pointCount, 3, 1_440) ||\n    !inRange(value.maximumAzimuthGapDeg, 0, 360) || !Array.isArray(value.points) ||\n    value.points.length !== value.pointCount || !isStringArray(value.warnings) ||\n    value.warnings.length > 100 || !Number.isInteger(value.fileSizeBytes) ||\n    !inRange(value.fileSizeBytes, 1, 2 * 1024 * 1024) ||\n    typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256) ||\n    typeof value.modifiedAfterImport !== 'boolean') {\n    return null;\n  }\n  const points: SavedStellarLocalHorizonSource['points'] = [];\n  for (const item of value.points) {\n    if (!isRecord(item) || !inRange(item.azimuthDeg, 0, 360) || item.azimuthDeg === 360 ||\n      !inRange(item.altitudeDeg, -90, 90)) return null;\n    points.push({ azimuthDeg: item.azimuthDeg, altitudeDeg: item.altitudeDeg });\n  }\n  let normalized;\n  try {\n    normalized = normalizeStellarLocalHorizonMask({\n      sourceKind: 'external',\n      sourceLabel: value.fileName,\n      points\n    });\n  } catch {\n    return null;\n  }\n  if (normalized.points.length !== value.pointCount ||\n    Math.abs(normalized.maximumAzimuthGapDeg - value.maximumAzimuthGapDeg) > 1e-9) {\n    return null;\n  }\n  return {\n    fileName: value.fileName.trim(),\n    importedAtIso: value.importedAtIso,\n    format: value.format,\n    pointCount: value.pointCount,\n    maximumAzimuthGapDeg: value.maximumAzimuthGapDeg,\n    points: normalized.points.map((point) => ({ ...point })),\n    warnings: [...value.warnings],\n    fileSizeBytes: value.fileSizeBytes,\n    sha256: value.sha256,\n    modifiedAfterImport: value.modifiedAfterImport\n  };\n}\n\n`;
if (!source.includes('function parseStellarLocalHorizonSource(')) {
  source = replaceExactlyOnce(source, helperAnchor, `${helper}${helperAnchor}`, 'skyline parser helper');
}

const parseAnchor = `  const textSetupHistory = value.textSetupHistory === undefined\n    ? undefined\n    : parseTextSetupHistory(value.textSetupHistory);\n  if (textSetupHistory === null) return null;`;
const parseWithSkyline = `${parseAnchor}\n  const stellarLocalHorizonSource = value.stellarLocalHorizonSource === undefined\n    ? undefined\n    : parseStellarLocalHorizonSource(value.stellarLocalHorizonSource);\n  if (stellarLocalHorizonSource === null) return null;`;
source = replaceExactlyOnce(source, parseAnchor, parseWithSkyline, 'parse saved skyline');

const returnAnchor = `    ...(textSetupHistory === undefined ? {} : { textSetupHistory }),\n    inputs,`;
source = replaceExactlyOnce(
  source,
  returnAnchor,
  `    ...(textSetupHistory === undefined ? {} : { textSetupHistory }),\n    ...(stellarLocalHorizonSource === undefined ? {} : { stellarLocalHorizonSource }),\n    inputs,`,
  'return saved skyline'
);

source = source.replace(
  `  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&\n    version !== 5 && version !== 6 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {`,
  `  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&\n    version !== 5 && version !== 6 && version !== 7 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {`
).replace(
  `  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&\n    version !== 5 && version !== 6 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {`,
  `  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&\n    version !== 5 && version !== 6 && version !== 7 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {`
);

fs.writeFileSync(file, source);
