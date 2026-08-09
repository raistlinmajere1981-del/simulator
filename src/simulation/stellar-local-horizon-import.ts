import type {
  StellarLocalHorizonImportFormat,
  StellarLocalHorizonImportPoint
} from '../shared/stellar-local-horizon-import';
import {
  normalizeStellarLocalHorizonMask,
  type NormalizedStellarLocalHorizonMask,
  type StellarLocalHorizonMask
} from './stellar-local-horizon';

export const STELLAR_LOCAL_HORIZON_IMPORT_VERSION = '0.1.0';

export interface ParsedStellarLocalHorizonProfile {
  fileName: string;
  format: StellarLocalHorizonImportFormat;
  pointCount: number;
  maximumAzimuthGapDeg: number;
  points: StellarLocalHorizonImportPoint[];
  warnings: string[];
}

export class StellarLocalHorizonImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarLocalHorizonImportError';
  }
}

const AZIMUTH_HEADERS = new Set([
  'azimuth', 'azimuthdeg', 'azimut', 'azimutdeg', 'bearing', 'bearingdeg',
  'yon', 'yonder', 'direction', 'directiondeg'
]);
const ALTITUDE_HEADERS = new Set([
  'altitude', 'altitudedeg', 'elevation', 'elevationdeg', 'horizon',
  'horizonaltitude', 'horizonaltitudedeg', 'ufuk', 'ufukyuksekligi',
  'ufukyuksekligideg', 'yukseklik', 'yukseklikdeg'
]);

function normalizeHeader(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '');
}

function parseFiniteNumber(raw: unknown, label: string): number {
  if (typeof raw === 'number') {
    if (Number.isFinite(raw)) return raw;
    throw new StellarLocalHorizonImportError(`${label} sonlu bir sayı olmalıdır.`);
  }
  if (typeof raw !== 'string') {
    throw new StellarLocalHorizonImportError(`${label} sayı olarak okunamadı.`);
  }
  const trimmed = raw.trim();
  if (!trimmed) throw new StellarLocalHorizonImportError(`${label} boş olamaz.`);
  const normalized = trimmed.includes(',') && !trimmed.includes('.')
    ? trimmed.replace(',', '.')
    : trimmed;
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new StellarLocalHorizonImportError(`${label} geçerli bir sayı değil: “${raw}”.`);
  }
  return value;
}

function sourceFileName(fileName: string): string {
  const normalizedPath = fileName.replace(/\\/g, '/');
  const value = (normalizedPath.split('/').pop() ?? '').trim();
  if (!value) throw new StellarLocalHorizonImportError('Skyline kaynak dosyası adı boş olamaz.');
  return value.slice(0, 240);
}

function fileExtension(fileName: string): string {
  const name = sourceFileName(fileName);
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLocaleLowerCase('en-US');
}

function warningsForNormalized(
  normalized: NormalizedStellarLocalHorizonMask,
  sourceOrderWasSorted: boolean
): string[] {
  const warnings: string[] = [];
  if (!sourceOrderWasSorted) {
    warnings.push('Kaynak azimut satırları sıralı değildi; profil 0°→360° artan azimut sırasına normalize edildi.');
  }
  if (normalized.points.length < 8) {
    warnings.push('Skyline profili 8 noktadan az içeriyor; ara azimutlarda doğrusal interpolasyon kaba olabilir.');
  }
  if (normalized.maximumAzimuthGapDeg > 90) {
    warnings.push(`Skyline profilinin en büyük azimut boşluğu ${normalized.maximumAzimuthGapDeg.toFixed(3)}°; yerel ufuk ayrıntısı bu yönde çok sınırlıdır.`);
  } else if (normalized.maximumAzimuthGapDeg > 45) {
    warnings.push(`Skyline profilinin en büyük azimut boşluğu ${normalized.maximumAzimuthGapDeg.toFixed(3)}°; bu yönde interpolasyon dikkatle yorumlanmalıdır.`);
  }
  return warnings;
}

function finalize(
  fileName: string,
  format: StellarLocalHorizonImportFormat,
  points: StellarLocalHorizonImportPoint[]
): ParsedStellarLocalHorizonProfile {
  const sourceOrderWasSorted = points.every((point, index) =>
    index === 0 || points[index - 1]!.azimuthDeg < point.azimuthDeg
  );
  const mask: StellarLocalHorizonMask = {
    sourceLabel: sourceFileName(fileName),
    sourceKind: 'external',
    points
  };
  let normalized: NormalizedStellarLocalHorizonMask;
  try {
    normalized = normalizeStellarLocalHorizonMask(mask);
  } catch (error) {
    throw new StellarLocalHorizonImportError(
      error instanceof Error ? error.message : 'Skyline profili doğrulanamadı.'
    );
  }
  return {
    fileName: sourceFileName(fileName),
    format,
    pointCount: normalized.points.length,
    maximumAzimuthGapDeg: normalized.maximumAzimuthGapDeg,
    points: normalized.points.map((point) => ({ ...point })),
    warnings: warningsForNormalized(normalized, sourceOrderWasSorted)
  };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const output: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      output.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (quoted) throw new StellarLocalHorizonImportError('CSV satırında kapanmamış çift tırnak var.');
  output.push(current.trim());
  return output;
}

function detectDelimiter(line: string): ',' | ';' | '\t' {
  const tabColumns = splitCsvLine(line, '\t').length;
  if (tabColumns >= 2) return '\t';
  const semicolonColumns = splitCsvLine(line, ';').length;
  if (semicolonColumns >= 2) return ';';
  const commaColumns = splitCsvLine(line, ',').length;
  if (commaColumns >= 2) return ',';
  throw new StellarLocalHorizonImportError('Skyline CSV dosyasında en az iki sütun bulunmalıdır.');
}

function identifyColumns(cells: string[]): { azimuthIndex: number; altitudeIndex: number } | null {
  let azimuthIndex = -1;
  let altitudeIndex = -1;
  cells.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (azimuthIndex < 0 && AZIMUTH_HEADERS.has(key)) azimuthIndex = index;
    if (altitudeIndex < 0 && ALTITUDE_HEADERS.has(key)) altitudeIndex = index;
  });
  return azimuthIndex >= 0 && altitudeIndex >= 0 && azimuthIndex !== altitudeIndex
    ? { azimuthIndex, altitudeIndex }
    : null;
}

export function parseStellarLocalHorizonCsv(
  content: string,
  fileName: string
): ParsedStellarLocalHorizonProfile {
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned
    .split(/\r?\n/)
    .map((line, index) => ({ text: line.trim(), lineNumber: index + 1 }))
    .filter((line) => line.text.length > 0 && !line.text.startsWith('#'));
  const first = lines[0];
  if (!first) throw new StellarLocalHorizonImportError('Skyline CSV dosyası boş.');
  const delimiter = detectDelimiter(first.text);
  const firstCells = splitCsvLine(first.text, delimiter);
  const identified = identifyColumns(firstCells);
  const firstTwoNumeric = firstCells.length >= 2 && (() => {
    try {
      parseFiniteNumber(firstCells[0], 'İlk satır azimutu');
      parseFiniteNumber(firstCells[1], 'İlk satır ufuk yüksekliği');
      return true;
    } catch {
      return false;
    }
  })();
  if (!identified && !firstTwoNumeric) {
    throw new StellarLocalHorizonImportError(
      'Skyline CSV başlığında azimut ve ufuk yüksekliği sütunları tanınamadı. Önerilen başlık: azimuthDeg,altitudeDeg.'
    );
  }

  const azimuthIndex = identified?.azimuthIndex ?? 0;
  const altitudeIndex = identified?.altitudeIndex ?? 1;
  const dataLines = identified ? lines.slice(1) : lines;
  const points: StellarLocalHorizonImportPoint[] = dataLines.map((line) => {
    const cells = splitCsvLine(line.text, delimiter);
    if (azimuthIndex >= cells.length || altitudeIndex >= cells.length) {
      throw new StellarLocalHorizonImportError(`${line.lineNumber}. CSV satırında azimut veya ufuk yüksekliği sütunu eksik.`);
    }
    return {
      azimuthDeg: parseFiniteNumber(cells[azimuthIndex], `${line.lineNumber}. satır azimutu`),
      altitudeDeg: parseFiniteNumber(cells[altitudeIndex], `${line.lineNumber}. satır ufuk yüksekliği`)
    };
  });
  return finalize(fileName, 'csv', points);
}

function pointFromJson(value: unknown, index: number): StellarLocalHorizonImportPoint {
  if (Array.isArray(value)) {
    if (value.length < 2) {
      throw new StellarLocalHorizonImportError(`${index + 1}. JSON noktası [azimut, yükseklik] biçiminde en az iki değer içermelidir.`);
    }
    return {
      azimuthDeg: parseFiniteNumber(value[0], `${index + 1}. JSON noktası azimutu`),
      altitudeDeg: parseFiniteNumber(value[1], `${index + 1}. JSON noktası ufuk yüksekliği`)
    };
  }
  if (typeof value !== 'object' || value === null) {
    throw new StellarLocalHorizonImportError(`${index + 1}. JSON noktası nesne veya [azimut, yükseklik] dizisi olmalıdır.`);
  }
  const record = value as Record<string, unknown>;
  const azimuth = record.azimuthDeg ?? record.azimuth ?? record.azimutDeg ?? record.azimut;
  const altitude = record.altitudeDeg ?? record.altitude ?? record.horizonAltitudeDeg ??
    record.elevationDeg ?? record.elevation ?? record.ufukYuksekligi;
  return {
    azimuthDeg: parseFiniteNumber(azimuth, `${index + 1}. JSON noktası azimutu`),
    altitudeDeg: parseFiniteNumber(altitude, `${index + 1}. JSON noktası ufuk yüksekliği`)
  };
}

export function parseStellarLocalHorizonJson(
  content: string,
  fileName: string
): ParsedStellarLocalHorizonProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new StellarLocalHorizonImportError('Skyline JSON dosyası geçerli JSON içermiyor.');
  }
  const rawPoints = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as Record<string, unknown>).points)
      ? (parsed as Record<string, unknown>).points as unknown[]
      : null;
  if (!rawPoints) {
    throw new StellarLocalHorizonImportError('Skyline JSON kökü bir nokta dizisi veya {"points":[...]} nesnesi olmalıdır.');
  }
  return finalize(fileName, 'json', rawPoints.map(pointFromJson));
}

export function parseStellarLocalHorizonFile(
  content: string,
  fileName: string
): ParsedStellarLocalHorizonProfile {
  const extension = fileExtension(fileName);
  if (extension === '.json') return parseStellarLocalHorizonJson(content, fileName);
  if (extension === '.csv' || extension === '.tsv' || extension === '.txt') {
    return parseStellarLocalHorizonCsv(content, fileName);
  }
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseStellarLocalHorizonJson(content, fileName);
  }
  return parseStellarLocalHorizonCsv(content, fileName);
}
