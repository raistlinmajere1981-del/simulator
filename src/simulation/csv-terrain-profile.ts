import { basename } from 'node:path';
import type {
  CsvTerrainDelimiter,
  CsvTerrainDistanceUnit,
  ImportedTerrainProfile,
  TerrainProfileImportContext
} from '../shared/simulator';
import type { ManualTerrainPoint } from '../shared/terrain';
import { validateManualTerrainPoints } from './manual-terrain-profile';

const MAX_FILE_ROWS = 2_002;
const MAX_ROUTE_DISTANCE_M = 20_000_000;
const MIN_ELEVATION_M = -12_000;
const MAX_ELEVATION_M = 100_000;
const ENDPOINT_TOLERANCE = 1e-7;

interface ParsedCsvLine {
  lineNumber: number;
  cells: string[];
}

interface ParsedSourceRow {
  lineNumber: number;
  distance: number;
  elevationM: number;
}

interface HeaderDefinition {
  distanceIndex: number;
  elevationIndex: number;
  distanceUnit: CsvTerrainDistanceUnit;
  ambiguousDistanceHeader: boolean;
}

const distanceHeaderAliases: Record<CsvTerrainDistanceUnit, Set<string>> = {
  percent: new Set([
    'distance_percent',
    'distance_pct',
    'route_percent',
    'route_position_percent',
    'percent',
    'percentage',
    'yuzde',
    'mesafe_yuzde',
    'rota_yuzdesi',
    'rota_konumu_yuzde',
    'konum_yuzde'
  ]),
  m: new Set([
    'distance_m',
    'distance_meter',
    'distance_metre',
    'mesafe_m',
    'metre',
    'meter'
  ]),
  km: new Set([
    'distance_km',
    'distance_kilometer',
    'distance_kilometre',
    'mesafe_km',
    'kilometre',
    'kilometer'
  ])
};

const ambiguousDistanceHeaders = new Set(['distance', 'mesafe']);
const elevationHeaderAliases = new Set([
  'elevation_m',
  'elevation',
  'height_m',
  'terrain_elevation_m',
  'ground_elevation_m',
  'kot_m',
  'kot',
  'yukseklik_m',
  'yukseklik',
  'rakim_m',
  'rakim'
]);

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/%/g, ' percent ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function delimiterCharacter(delimiter: CsvTerrainDelimiter): string {
  if (delimiter === 'semicolon') return ';';
  if (delimiter === 'tab') return '\t';
  return ',';
}

function delimiterLabel(delimiter: CsvTerrainDelimiter): string {
  if (delimiter === 'semicolon') return 'noktalı virgül';
  if (delimiter === 'tab') return 'sekme';
  return 'virgül';
}

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let quoted = false;
  let count = 0;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(headerLine: string): CsvTerrainDelimiter {
  const candidates: Array<{ delimiter: CsvTerrainDelimiter; count: number; priority: number }> = [
    { delimiter: 'semicolon', count: countDelimiterOutsideQuotes(headerLine, ';'), priority: 3 },
    { delimiter: 'tab', count: countDelimiterOutsideQuotes(headerLine, '\t'), priority: 2 },
    { delimiter: 'comma', count: countDelimiterOutsideQuotes(headerLine, ','), priority: 1 }
  ];

  candidates.sort((left, right) => right.count - left.count || right.priority - left.priority);
  const winner = candidates[0];
  if (!winner || winner.count < 1) {
    throw new Error('CSV başlığında virgül, noktalı virgül veya sekme ayırıcı bulunamadı.');
  }
  return winner.delimiter;
}

function splitCsvLine(line: string, delimiter: string, lineNumber: number): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  if (quoted) {
    throw new Error(`${lineNumber}. satırda kapatılmamış çift tırnak var.`);
  }

  cells.push(current.trim());
  return cells;
}

function nonEmptyCsvLines(content: string): string[] {
  return content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('#');
    });
}

function parseLines(content: string): {
  delimiter: CsvTerrainDelimiter;
  lines: ParsedCsvLine[];
} {
  const rawLines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstDataIndex = rawLines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('#');
  });

  if (firstDataIndex < 0) throw new Error('CSV dosyası boş.');
  const headerLine = rawLines[firstDataIndex];
  if (headerLine === undefined) throw new Error('CSV başlığı okunamadı.');

  const delimiter = detectDelimiter(headerLine);
  const delimiterChar = delimiterCharacter(delimiter);
  const lines: ParsedCsvLine[] = [];

  for (let index = firstDataIndex; index < rawLines.length; index += 1) {
    const rawLine = rawLines[index];
    if (rawLine === undefined) continue;
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    lines.push({
      lineNumber: index + 1,
      cells: splitCsvLine(rawLine, delimiterChar, index + 1)
    });
  }

  return { delimiter, lines };
}

function parseHeader(headerCells: string[]): HeaderDefinition {
  const normalized = headerCells.map(normalizeHeader);
  let distanceIndex = -1;
  let distanceUnit: CsvTerrainDistanceUnit | undefined;
  let ambiguousDistanceHeader = false;

  for (const unit of ['percent', 'm', 'km'] as const) {
    const index = normalized.findIndex((header) => distanceHeaderAliases[unit].has(header));
    if (index >= 0) {
      if (distanceIndex >= 0) {
        throw new Error('CSV başlığında birden fazla mesafe sütunu tanımlanmış.');
      }
      distanceIndex = index;
      distanceUnit = unit;
    }
  }

  if (distanceIndex < 0) {
    const ambiguousIndex = normalized.findIndex((header) => ambiguousDistanceHeaders.has(header));
    if (ambiguousIndex >= 0) {
      distanceIndex = ambiguousIndex;
      distanceUnit = 'm';
      ambiguousDistanceHeader = true;
    }
  }

  const elevationIndexes = normalized
    .map((header, index) => elevationHeaderAliases.has(header) ? index : -1)
    .filter((index) => index >= 0);

  if (distanceIndex < 0 || !distanceUnit) {
    throw new Error(
      'Mesafe sütunu bulunamadı. distance_m, distance_km veya distance_percent başlıklarından birini kullanın.'
    );
  }
  if (elevationIndexes.length === 0) {
    throw new Error('Kot sütunu bulunamadı. elevation_m veya kot_m başlığını kullanın.');
  }
  if (elevationIndexes.length > 1) {
    throw new Error('CSV başlığında birden fazla kot sütunu tanımlanmış.');
  }

  const elevationIndex = elevationIndexes[0];
  if (elevationIndex === undefined) throw new Error('Kot sütunu bulunamadı.');
  if (distanceIndex === elevationIndex) {
    throw new Error('Mesafe ve kot aynı CSV sütununu kullanamaz.');
  }

  return { distanceIndex, elevationIndex, distanceUnit, ambiguousDistanceHeader };
}

function normalizeNumericText(value: string, delimiter: CsvTerrainDelimiter): string {
  const compact = value.replace(/[\s\u00a0]/g, '');
  if (compact.length === 0) return compact;

  if (delimiter !== 'comma') {
    const commaIndex = compact.lastIndexOf(',');
    const dotIndex = compact.lastIndexOf('.');
    if (commaIndex >= 0 && dotIndex >= 0) {
      if (commaIndex > dotIndex) {
        return compact.replaceAll('.', '').replace(',', '.');
      }
      return compact.replaceAll(',', '');
    }
    if (commaIndex >= 0) return compact.replace(',', '.');
  }

  return compact;
}

function parseNumber(
  value: string,
  delimiter: CsvTerrainDelimiter,
  lineNumber: number,
  columnLabel: string
): number {
  const normalized = normalizeNumericText(value, delimiter);
  if (normalized.length === 0) {
    throw new Error(`${lineNumber}. satırdaki ${columnLabel} değeri boş.`);
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) {
    throw new Error(`${lineNumber}. satırdaki ${columnLabel} değeri geçerli bir sayı değil: “${value}”.`);
  }

  const result = Number(normalized);
  if (!Number.isFinite(result)) {
    throw new Error(`${lineNumber}. satırdaki ${columnLabel} değeri sonlu değil.`);
  }
  return result;
}

function unitToMetres(value: number, unit: CsvTerrainDistanceUnit): number {
  if (unit === 'km') return value * 1_000;
  return value;
}

function approximatelyEqual(left: number, right: number, tolerance = ENDPOINT_TOLERANCE): boolean {
  return Math.abs(left - right) <= tolerance;
}

function validateContext(context: TerrainProfileImportContext): void {
  if (!Number.isFinite(context.routeDistanceM) || context.routeDistanceM <= 0 ||
    context.routeDistanceM > MAX_ROUTE_DISTANCE_M) {
    throw new RangeError('CSV içe aktarma için geçerli bir deney mesafesi gerekli.');
  }
  if (!Number.isFinite(context.observerGroundElevationM) ||
    !Number.isFinite(context.targetGroundElevationM)) {
    throw new RangeError('CSV içe aktarma için geçerli uç zemin kotları gerekli.');
  }
}

function validateRows(rows: ParsedSourceRow[], unit: CsvTerrainDistanceUnit): number | null {
  if (rows.length < 2) {
    throw new Error('CSV profili en az gözlemci ve hedef uç satırlarını içermeli.');
  }
  if (rows.length > MAX_FILE_ROWS) {
    throw new Error(`CSV profili en fazla ${MAX_FILE_ROWS} satır içerebilir.`);
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) continue;
    if (row.elevationM < MIN_ELEVATION_M || row.elevationM > MAX_ELEVATION_M) {
      throw new RangeError(
        `${row.lineNumber}. satırdaki kot ${MIN_ELEVATION_M}…${MAX_ELEVATION_M} m aralığında olmalı.`
      );
    }
    if (row.distance < 0) {
      throw new RangeError(`${row.lineNumber}. satırdaki mesafe negatif olamaz.`);
    }
    const previous = rows[index - 1];
    if (previous && row.distance <= previous.distance) {
      throw new RangeError(
        `${row.lineNumber}. satırdaki mesafe önceki satırdan büyük olmalı.`
      );
    }
  }

  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) throw new Error('CSV profil uçları okunamadı.');
  if (!approximatelyEqual(first.distance, 0)) {
    throw new RangeError('CSV profilinin ilk mesafe değeri 0 olmalı.');
  }

  if (unit === 'percent') {
    if (!approximatelyEqual(last.distance, 100)) {
      throw new RangeError('Yüzde tabanlı CSV profilinin son mesafe değeri 100 olmalı.');
    }
    for (const row of rows) {
      if (row.distance < 0 || row.distance > 100) {
        throw new RangeError(`${row.lineNumber}. satırdaki yüzde 0…100 aralığında olmalı.`);
      }
    }
    return null;
  }

  const sourceDistanceM = unitToMetres(last.distance, unit);
  if (sourceDistanceM <= 0 || sourceDistanceM > MAX_ROUTE_DISTANCE_M) {
    throw new RangeError('CSV profilinin toplam mesafesi 0 ile 20.000 km arasında olmalı.');
  }
  return sourceDistanceM;
}

function differenceWarning(
  label: string,
  importedValue: number,
  currentValue: number,
  unit = 'm'
): string | null {
  if (Math.abs(importedValue - currentValue) <= 0.01) return null;
  return `CSV ${label} ${importedValue.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${unit}; mevcut deney ${currentValue.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${unit}. Mevcut deney değeri korunacak.`;
}

export function parseTerrainProfileCsv(
  content: string,
  fileName: string,
  context: TerrainProfileImportContext
): ImportedTerrainProfile {
  validateContext(context);
  if (nonEmptyCsvLines(content).length === 0) throw new Error('CSV dosyası boş.');

  const { delimiter, lines } = parseLines(content);
  const header = lines[0];
  if (!header) throw new Error('CSV başlığı bulunamadı.');
  const headerDefinition = parseHeader(header.cells);
  const sourceRows: ParsedSourceRow[] = [];

  for (const line of lines.slice(1)) {
    const distanceCell = line.cells[headerDefinition.distanceIndex];
    const elevationCell = line.cells[headerDefinition.elevationIndex];
    if (distanceCell === undefined || elevationCell === undefined) {
      throw new Error(
        `${line.lineNumber}. satır başlıktaki mesafe ve kot sütunlarını içermiyor.`
      );
    }
    sourceRows.push({
      lineNumber: line.lineNumber,
      distance: parseNumber(distanceCell, delimiter, line.lineNumber, 'mesafe'),
      elevationM: parseNumber(elevationCell, delimiter, line.lineNumber, 'kot')
    });
  }

  const sourceDistanceM = validateRows(sourceRows, headerDefinition.distanceUnit);
  const first = sourceRows[0];
  const last = sourceRows[sourceRows.length - 1];
  if (!first || !last) throw new Error('CSV profil uçları okunamadı.');

  const points: ManualTerrainPoint[] = sourceRows.slice(1, -1).map((row) => {
    const distancePercent = headerDefinition.distanceUnit === 'percent'
      ? row.distance
      : unitToMetres(row.distance, headerDefinition.distanceUnit) /
        (sourceDistanceM as number) * 100;
    return {
      id: `csv-line-${row.lineNumber}`,
      distancePercent,
      elevationM: row.elevationM
    };
  });

  const pointErrors = validateManualTerrainPoints(points);
  if (pointErrors.length > 0) {
    throw new Error(`CSV profil noktaları geçersiz: ${pointErrors.join(' ')}`);
  }

  const warnings: string[] = [];
  if (headerDefinition.ambiguousDistanceHeader) {
    warnings.push('“distance/mesafe” başlığı metre olarak yorumlandı. Birimi açık yazmak için distance_m veya mesafe_m kullanın.');
  }
  if (sourceDistanceM !== null) {
    const ratio = Math.abs(sourceDistanceM - context.routeDistanceM) /
      Math.max(sourceDistanceM, context.routeDistanceM);
    if (ratio > 0.01) {
      warnings.push(
        `CSV toplam mesafesi ${(sourceDistanceM / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} km; mevcut deney mesafesi ${(context.routeDistanceM / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} km. Ara noktalar CSV toplamına göre yüzdeye dönüştürüldü.`
      );
    }
  }

  const observerWarning = differenceWarning(
    'gözlemci uç kotu',
    first.elevationM,
    context.observerGroundElevationM
  );
  if (observerWarning) warnings.push(observerWarning);
  const targetWarning = differenceWarning(
    'hedef uç kotu',
    last.elevationM,
    context.targetGroundElevationM
  );
  if (targetWarning) warnings.push(targetWarning);

  return {
    fileName: basename(fileName),
    delimiter,
    distanceUnit: headerDefinition.distanceUnit,
    rowCount: sourceRows.length,
    sourceDistanceM,
    observerEndpointElevationM: first.elevationM,
    targetEndpointElevationM: last.elevationM,
    points,
    warnings: [
      `Ayırıcı: ${delimiterLabel(delimiter)}.`,
      ...warnings
    ]
  };
}
