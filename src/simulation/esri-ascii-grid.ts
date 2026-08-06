import { basename } from 'node:path';

const MAX_GRID_COLUMNS = 10_000;
const MAX_GRID_ROWS = 10_000;
const MAX_GRID_CELLS = 4_000_000;

export type EsriAsciiGridOriginMode = 'corner' | 'center';
export type EsriAsciiGridSamplingMethod = 'nearest' | 'bilinear';

export interface EsriAsciiGrid {
  fileName: string;
  columnCount: number;
  rowCount: number;
  originMode: EsriAsciiGridOriginMode;
  westCellCenterDeg: number;
  southCellCenterDeg: number;
  cellSizeDeg: number;
  noDataValue: number | null;
  valuesNorthToSouth: number[];
  westBoundaryDeg: number;
  eastBoundaryDeg: number;
  southBoundaryDeg: number;
  northBoundaryDeg: number;
  warnings: string[];
}

interface ParsedHeader {
  ncols?: number;
  nrows?: number;
  xllcorner?: number;
  xllcenter?: number;
  yllcorner?: number;
  yllcenter?: number;
  cellsize?: number;
  nodata_value?: number;
}

const HEADER_KEYS = new Set([
  'ncols',
  'nrows',
  'xllcorner',
  'xllcenter',
  'yllcorner',
  'yllcenter',
  'cellsize',
  'nodata_value'
]);

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseNumber(raw: string, label: string): number {
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value)) throw new Error(`${label} sayısal olmalı.`);
  return value;
}

function requireInteger(
  value: number | undefined,
  label: string,
  maximum: number
): number {
  if (!Number.isInteger(value) || (value ?? 0) <= 0 || (value ?? 0) > maximum) {
    throw new RangeError(`${label} 1…${maximum} aralığında bir tam sayı olmalı.`);
  }
  return value as number;
}

function isNoData(value: number, noDataValue: number | null): boolean {
  return noDataValue !== null && value === noDataValue;
}

function valueAtSouthRow(
  grid: EsriAsciiGrid,
  columnIndex: number,
  southRowIndex: number
): number | null {
  if (columnIndex < 0 || columnIndex >= grid.columnCount ||
    southRowIndex < 0 || southRowIndex >= grid.rowCount) {
    return null;
  }
  const northRowIndex = grid.rowCount - 1 - southRowIndex;
  const value = grid.valuesNorthToSouth[
    northRowIndex * grid.columnCount + columnIndex
  ];
  if (!finite(value) || isNoData(value, grid.noDataValue)) return null;
  return value;
}

function within(value: number, minimum: number, maximum: number): boolean {
  return value >= minimum && value <= maximum;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function parseEsriAsciiGrid(
  content: string,
  fileName: string
): EsriAsciiGrid {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const header: ParsedHeader = {};
  let dataStartLine = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line) continue;
    const tokens = line.split(/\s+/);
    const key = tokens[0]?.toLowerCase() ?? '';
    if (!HEADER_KEYS.has(key)) {
      dataStartLine = index;
      break;
    }
    if (tokens.length < 2) throw new Error(`${key} başlık değeri eksik.`);
    if (Object.prototype.hasOwnProperty.call(header, key)) {
      throw new Error(`ESRI ASCII başlığı tekrarlanıyor: ${key}.`);
    }
    header[key as keyof ParsedHeader] = parseNumber(tokens[1] ?? '', key);
  }

  if (dataStartLine < 0) throw new Error('ESRI ASCII dosyasında hücre verisi bulunamadı.');

  const columnCount = requireInteger(header.ncols, 'ncols', MAX_GRID_COLUMNS);
  const rowCount = requireInteger(header.nrows, 'nrows', MAX_GRID_ROWS);
  if (columnCount * rowCount > MAX_GRID_CELLS) {
    throw new RangeError(`DEM en fazla ${MAX_GRID_CELLS.toLocaleString('tr-TR')} hücre içerebilir.`);
  }

  if (!finite(header.cellsize) || header.cellsize <= 0 || header.cellsize > 180) {
    throw new RangeError('cellsize 0…180 derece aralığında olmalı.');
  }
  const cellSizeDeg = header.cellsize;
  const hasAnyCornerOrigin = finite(header.xllcorner) || finite(header.yllcorner);
  const hasAnyCenterOrigin = finite(header.xllcenter) || finite(header.yllcenter);
  const hasCornerOrigin = finite(header.xllcorner) && finite(header.yllcorner);
  const hasCenterOrigin = finite(header.xllcenter) && finite(header.yllcenter);
  if ((hasAnyCornerOrigin && !hasCornerOrigin) ||
    (hasAnyCenterOrigin && !hasCenterOrigin) ||
    hasCornerOrigin === hasCenterOrigin) {
    throw new Error(
      'Tam olarak bir eksiksiz xllcorner/yllcorner veya xllcenter/yllcenter çifti gerekli.'
    );
  }

  const originMode: EsriAsciiGridOriginMode = hasCornerOrigin ? 'corner' : 'center';
  const westCellCenterDeg = hasCornerOrigin
    ? (header.xllcorner as number) + cellSizeDeg / 2
    : header.xllcenter as number;
  const southCellCenterDeg = hasCornerOrigin
    ? (header.yllcorner as number) + cellSizeDeg / 2
    : header.yllcenter as number;
  const westBoundaryDeg = westCellCenterDeg - cellSizeDeg / 2;
  const eastBoundaryDeg = westCellCenterDeg + (columnCount - 0.5) * cellSizeDeg;
  const southBoundaryDeg = southCellCenterDeg - cellSizeDeg / 2;
  const northBoundaryDeg = southCellCenterDeg + (rowCount - 0.5) * cellSizeDeg;

  if (westBoundaryDeg < -180 || eastBoundaryDeg > 180 ||
    southBoundaryDeg < -90 || northBoundaryDeg > 90) {
    throw new RangeError(
      'DEM kapsamı WGS84 boylam/enlem sınırlarının dışına taşıyor; bu sürüm yalnız coğrafi derece ızgaralarını destekler.'
    );
  }

  const dataRows = lines
    .slice(dataStartLine)
    .map((line) => line.trim())
    .filter(Boolean);
  if (dataRows.length != rowCount) {
    throw new Error(`DEM ${rowCount} veri satırı bekliyor; ${dataRows.length} satır bulundu.`);
  }

  const valuesNorthToSouth: number[] = [];
  dataRows.forEach((line, rowIndex) => {
    const tokens = line.split(/\s+/);
    if (tokens.length !== columnCount) {
      throw new Error(
        `${rowIndex + 1}. DEM veri satırı ${columnCount} hücre yerine ${tokens.length} hücre içeriyor.`
      );
    }
    tokens.forEach((token, columnIndex) => {
      valuesNorthToSouth.push(parseNumber(
        token,
        `${rowIndex + 1}. satır ${columnIndex + 1}. hücre`
      ));
    });
  });

  const noDataValue = finite(header.nodata_value) ? header.nodata_value : null;
  const warnings: string[] = [];
  if (noDataValue === null) {
    warnings.push('NODATA_value başlığı bulunmadı; bütün sayısal hücreler geçerli kabul edildi.');
  }

  return {
    fileName: basename(fileName),
    columnCount,
    rowCount,
    originMode,
    westCellCenterDeg,
    southCellCenterDeg,
    cellSizeDeg,
    noDataValue,
    valuesNorthToSouth,
    westBoundaryDeg,
    eastBoundaryDeg,
    southBoundaryDeg,
    northBoundaryDeg,
    warnings
  };
}

export function sampleEsriAsciiGrid(
  grid: EsriAsciiGrid,
  longitudeDeg: number,
  latitudeDeg: number,
  method: EsriAsciiGridSamplingMethod = 'bilinear'
): number | null {
  if (!Number.isFinite(longitudeDeg) || !Number.isFinite(latitudeDeg)) {
    throw new RangeError('DEM örnekleme koordinatları sonlu olmalı.');
  }
  if (!within(longitudeDeg, grid.westBoundaryDeg, grid.eastBoundaryDeg) ||
    !within(latitudeDeg, grid.southBoundaryDeg, grid.northBoundaryDeg)) {
    return null;
  }

  const columnPosition = clamp(
    (longitudeDeg - grid.westCellCenterDeg) / grid.cellSizeDeg,
    0,
    grid.columnCount - 1
  );
  const southRowPosition = clamp(
    (latitudeDeg - grid.southCellCenterDeg) / grid.cellSizeDeg,
    0,
    grid.rowCount - 1
  );

  if (method === 'nearest') {
    return valueAtSouthRow(
      grid,
      Math.round(columnPosition),
      Math.round(southRowPosition)
    );
  }

  const leftColumn = Math.floor(columnPosition);
  const rightColumn = Math.min(grid.columnCount - 1, leftColumn + 1);
  const southRow = Math.floor(southRowPosition);
  const northRow = Math.min(grid.rowCount - 1, southRow + 1);
  const westFraction = columnPosition - leftColumn;
  const northFraction = southRowPosition - southRow;

  const southWest = valueAtSouthRow(grid, leftColumn, southRow);
  const southEast = valueAtSouthRow(grid, rightColumn, southRow);
  const northWest = valueAtSouthRow(grid, leftColumn, northRow);
  const northEast = valueAtSouthRow(grid, rightColumn, northRow);
  if (southWest === null || southEast === null ||
    northWest === null || northEast === null) {
    return null;
  }

  const southValue = southWest + (southEast - southWest) * westFraction;
  const northValue = northWest + (northEast - northWest) * westFraction;
  return southValue + (northValue - southValue) * northFraction;
}
