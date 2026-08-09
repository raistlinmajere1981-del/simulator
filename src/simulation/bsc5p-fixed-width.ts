export const BSC5P_FIXED_WIDTH_RECORD_LENGTH = 197;
export const BSC5P_FIXED_WIDTH_FORMAT_ID = 'cds-v50-fixed-width';
export const BSC5P_FIXED_WIDTH_FORMAT_VERSION = '0.1.0';
export const BSC5P_FIXED_WIDTH_SOURCE = 'CDS V/50 · Bright Star Catalogue, 5th Revised Edition';
export const BSC5P_SOURCE_EPOCH_JULIAN_YEAR = 2000;

export interface Bsc5pCatalogRecord {
  rawLine: string;
  hrNumber: number;
  catalogName: string | null;
  hdNumber: number | null;
  saoNumber: number | null;
  fk5Number: number | null;
  rightAscensionJ2000Deg: number | null;
  declinationJ2000Deg: number | null;
  visualMagnitude: number | null;
  properMotionRaStarArcsecPerYear: number | null;
  properMotionDecArcsecPerYear: number | null;
  parallaxArcsec: number | null;
  radialVelocityKmPerSec: number | null;
  hasNote: boolean;
  sourceEpochJulianYear: typeof BSC5P_SOURCE_EPOCH_JULIAN_YEAR;
  sourceFrame: 'fk5-j2000';
}

export class Bsc5pFixedWidthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Bsc5pFixedWidthError';
  }
}

interface ByteRange {
  start: number;
  end: number;
}

const BYTES = {
  hr: { start: 1, end: 4 },
  name: { start: 5, end: 14 },
  hd: { start: 26, end: 31 },
  sao: { start: 32, end: 37 },
  fk5: { start: 38, end: 41 },
  raHours: { start: 76, end: 77 },
  raMinutes: { start: 78, end: 79 },
  raSeconds: { start: 80, end: 83 },
  decSign: { start: 84, end: 84 },
  decDegrees: { start: 85, end: 86 },
  decMinutes: { start: 87, end: 88 },
  decSeconds: { start: 89, end: 90 },
  visualMagnitude: { start: 103, end: 107 },
  properMotionRaStar: { start: 149, end: 154 },
  properMotionDec: { start: 155, end: 160 },
  parallax: { start: 162, end: 166 },
  radialVelocity: { start: 167, end: 170 },
  noteFlag: { start: 197, end: 197 }
} as const satisfies Record<string, ByteRange>;

function field(line: string, range: ByteRange): string {
  return line.slice(range.start - 1, range.end);
}

function nullableString(line: string, range: ByteRange): string | null {
  const value = field(line, range).trim();
  return value.length === 0 ? null : value;
}

function parseRequiredInteger(line: string, range: ByteRange, label: string): number {
  const raw = field(line, range).trim();
  if (!/^\d+$/.test(raw)) {
    throw new Bsc5pFixedWidthError(`${label} alanı geçerli bir tamsayı değil: ${raw || '(boş)'}`);
  }
  return Number.parseInt(raw, 10);
}

function parseOptionalInteger(line: string, range: ByteRange, label: string): number | null {
  const raw = field(line, range).trim();
  if (!raw) return null;
  if (!/^[+-]?\d+$/.test(raw)) {
    throw new Bsc5pFixedWidthError(`${label} alanı geçerli bir tamsayı değil: ${raw}`);
  }
  return Number.parseInt(raw, 10);
}

function parseOptionalFloat(line: string, range: ByteRange, label: string): number | null {
  const raw = field(line, range).trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Bsc5pFixedWidthError(`${label} alanı geçerli bir sayı değil: ${raw}`);
  }
  return value;
}

function requireIntegerRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Bsc5pFixedWidthError(`${label} ${min}..${max} aralığında olmalıdır; alınan=${value}.`);
  }
}

function parseJ2000Direction(line: string): {
  rightAscensionJ2000Deg: number | null;
  declinationJ2000Deg: number | null;
} {
  const raHourRaw = nullableString(line, BYTES.raHours);
  const raMinuteRaw = nullableString(line, BYTES.raMinutes);
  const raSecondRaw = nullableString(line, BYTES.raSeconds);
  const decSignRaw = nullableString(line, BYTES.decSign);
  const decDegreeRaw = nullableString(line, BYTES.decDegrees);
  const decMinuteRaw = nullableString(line, BYTES.decMinutes);
  const decSecondRaw = nullableString(line, BYTES.decSeconds);

  const raFields = [raHourRaw, raMinuteRaw, raSecondRaw];
  const decFields = [decSignRaw, decDegreeRaw, decMinuteRaw, decSecondRaw];
  const raPresent = raFields.some((value) => value !== null);
  const decPresent = decFields.some((value) => value !== null);

  if (!raPresent && !decPresent) {
    return { rightAscensionJ2000Deg: null, declinationJ2000Deg: null };
  }
  if (raFields.some((value) => value === null) || decFields.some((value) => value === null)) {
    throw new Bsc5pFixedWidthError('J2000 konumu kısmi alanlarla tanımlanmış; RA/Dec alanlarının tümü birlikte bulunmalıdır.');
  }

  const raHours = Number(raHourRaw);
  const raMinutes = Number(raMinuteRaw);
  const raSeconds = Number(raSecondRaw);
  const decDegrees = Number(decDegreeRaw);
  const decMinutes = Number(decMinuteRaw);
  const decSeconds = Number(decSecondRaw);
  if (![raHours, raMinutes, raSeconds, decDegrees, decMinutes, decSeconds].every(Number.isFinite)) {
    throw new Bsc5pFixedWidthError('J2000 RA/Dec alanlarından biri geçerli bir sayı değil.');
  }
  requireIntegerRange(raHours, 0, 23, 'J2000 RA saati');
  requireIntegerRange(raMinutes, 0, 59, 'J2000 RA dakikası');
  if (raSeconds < 0 || raSeconds >= 60) {
    throw new Bsc5pFixedWidthError(`J2000 RA saniyesi 0..<60 aralığında olmalıdır; alınan=${raSeconds}.`);
  }
  requireIntegerRange(decDegrees, 0, 90, 'J2000 Dec derecesi');
  requireIntegerRange(decMinutes, 0, 59, 'J2000 Dec dakikası');
  requireIntegerRange(decSeconds, 0, 59, 'J2000 Dec saniyesi');
  if (decSignRaw !== '+' && decSignRaw !== '-') {
    throw new Bsc5pFixedWidthError(`J2000 Dec işareti '+' veya '-' olmalıdır; alınan=${decSignRaw}.`);
  }
  if (decDegrees === 90 && (decMinutes !== 0 || decSeconds !== 0)) {
    throw new Bsc5pFixedWidthError('±90° deklinasyonda dakika ve saniye sıfır olmalıdır.');
  }

  const rightAscensionJ2000Deg = (raHours + raMinutes / 60 + raSeconds / 3600) * 15;
  const declinationAbsDeg = decDegrees + decMinutes / 60 + decSeconds / 3600;
  const declinationJ2000Deg = (decSignRaw === '-' ? -1 : 1) * declinationAbsDeg;
  return { rightAscensionJ2000Deg, declinationJ2000Deg };
}

/**
 * Parses one 197-byte/character ASCII record from CDS catalogue V/50.
 *
 * Byte offsets follow the catalogue ReadMe. In particular, pmRA occupies
 * bytes 149-154 and is the projected component μ_α*=cos(δ)·dα/dt; pmDE
 * occupies bytes 155-160. Blank numeric fields are represented as null.
 */
export function parseBsc5pFixedWidthRecord(rawLine: string): Bsc5pCatalogRecord {
  const line = rawLine.replace(/[\r\n]+$/, '');
  if (line.length !== BSC5P_FIXED_WIDTH_RECORD_LENGTH) {
    throw new Bsc5pFixedWidthError(
      `BSC5P kayıt satırı tam ${BSC5P_FIXED_WIDTH_RECORD_LENGTH} karakter olmalıdır; alınan=${line.length}.`
    );
  }

  const hrNumber = parseRequiredInteger(line, BYTES.hr, 'HR');
  requireIntegerRange(hrNumber, 1, 9110, 'HR');
  const direction = parseJ2000Direction(line);
  const visualMagnitude = parseOptionalFloat(line, BYTES.visualMagnitude, 'Vmag');
  const properMotionRaStarArcsecPerYear = parseOptionalFloat(
    line,
    BYTES.properMotionRaStar,
    'pmRA'
  );
  const properMotionDecArcsecPerYear = parseOptionalFloat(line, BYTES.properMotionDec, 'pmDE');
  const parallaxArcsec = parseOptionalFloat(line, BYTES.parallax, 'Parallax');
  const radialVelocityKmPerSec = parseOptionalInteger(line, BYTES.radialVelocity, 'RadVel');
  const noteFlag = field(line, BYTES.noteFlag);
  if (noteFlag !== ' ' && noteFlag !== '*') {
    throw new Bsc5pFixedWidthError(`NoteFlag alanı boş veya '*' olmalıdır; alınan=${JSON.stringify(noteFlag)}.`);
  }

  return {
    rawLine: line,
    hrNumber,
    catalogName: nullableString(line, BYTES.name),
    hdNumber: parseOptionalInteger(line, BYTES.hd, 'HD'),
    saoNumber: parseOptionalInteger(line, BYTES.sao, 'SAO'),
    fk5Number: parseOptionalInteger(line, BYTES.fk5, 'FK5'),
    ...direction,
    visualMagnitude,
    properMotionRaStarArcsecPerYear,
    properMotionDecArcsecPerYear,
    parallaxArcsec,
    radialVelocityKmPerSec,
    hasNote: noteFlag === '*',
    sourceEpochJulianYear: BSC5P_SOURCE_EPOCH_JULIAN_YEAR,
    sourceFrame: 'fk5-j2000'
  };
}

export function parseBsc5pFixedWidthCatalog(text: string): Bsc5pCatalogRecord[] {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const records = lines.map(parseBsc5pFixedWidthRecord);
  const seen = new Set<number>();
  for (const record of records) {
    if (seen.has(record.hrNumber)) {
      throw new Bsc5pFixedWidthError(`BSC5P kaynak metninde yinelenen HR numarası: ${record.hrNumber}.`);
    }
    seen.add(record.hrNumber);
  }
  return records;
}
