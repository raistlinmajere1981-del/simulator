import { describe, expect, it } from 'vitest';
import {
  BSC5P_FIXED_WIDTH_RECORD_LENGTH,
  Bsc5pFixedWidthError,
  parseBsc5pFixedWidthCatalog,
  parseBsc5pFixedWidthRecord
} from '../src/simulation/bsc5p-fixed-width';

function put(line: string[], startByte: number, endByte: number, value: string): void {
  const width = endByte - startByte + 1;
  if (value.length > width) throw new Error(`fixture değeri ${width} karaktere sığmıyor: ${value}`);
  const padded = value.padStart(width, ' ');
  for (let index = 0; index < width; index += 1) {
    line[startByte - 1 + index] = padded[index] ?? ' ';
  }
}

function makeRecord(overrides: {
  hr?: number;
  name?: string;
  raHours?: number;
  raMinutes?: number;
  raSeconds?: number;
  decSign?: '+' | '-';
  decDegrees?: number;
  decMinutes?: number;
  decSeconds?: number;
  vmag?: number | null;
  pmRaStar?: number | null;
  pmDec?: number | null;
  parallax?: number | null;
  radialVelocity?: number | null;
  note?: boolean;
} = {}): string {
  const line = Array<string>(BSC5P_FIXED_WIDTH_RECORD_LENGTH).fill(' ');
  const hr = overrides.hr ?? 2491;
  put(line, 1, 4, String(hr));
  put(line, 5, 14, overrides.name ?? 'SYNTHETIC');
  put(line, 26, 31, '123456');
  put(line, 32, 37, '234567');
  put(line, 38, 41, '1234');
  put(line, 76, 77, String(overrides.raHours ?? 6));
  put(line, 78, 79, String(overrides.raMinutes ?? 45));
  put(line, 80, 83, (overrides.raSeconds ?? 8.9).toFixed(1));
  put(line, 84, 84, overrides.decSign ?? '-');
  put(line, 85, 86, String(overrides.decDegrees ?? 16));
  put(line, 87, 88, String(overrides.decMinutes ?? 42));
  put(line, 89, 90, String(overrides.decSeconds ?? 58));
  if (overrides.vmag !== null) put(line, 103, 107, (overrides.vmag ?? -1.46).toFixed(2));
  if (overrides.pmRaStar !== null) put(line, 149, 154, (overrides.pmRaStar ?? -0.5).toFixed(3));
  if (overrides.pmDec !== null) put(line, 155, 160, (overrides.pmDec ?? -1.2).toFixed(3));
  if (overrides.parallax !== null) put(line, 162, 166, (overrides.parallax ?? 0.25).toFixed(3));
  if (overrides.radialVelocity !== null) put(line, 167, 170, String(overrides.radialVelocity ?? -12));
  put(line, 197, 197, overrides.note === false ? ' ' : '*');
  return line.join('');
}

describe('BSC5P fixed-width parser', () => {
  it('reads the documented HR, J2000, Vmag and proper-motion byte ranges', () => {
    const record = parseBsc5pFixedWidthRecord(makeRecord());

    expect(record.hrNumber).toBe(2491);
    expect(record.catalogName).toBe('SYNTHETIC');
    expect(record.hdNumber).toBe(123456);
    expect(record.saoNumber).toBe(234567);
    expect(record.fk5Number).toBe(1234);
    expect(record.rightAscensionJ2000Deg).toBeCloseTo((6 + 45 / 60 + 8.9 / 3600) * 15, 12);
    expect(record.declinationJ2000Deg).toBeCloseTo(-(16 + 42 / 60 + 58 / 3600), 12);
    expect(record.visualMagnitude).toBe(-1.46);
    expect(record.properMotionRaStarArcsecPerYear).toBe(-0.5);
    expect(record.properMotionDecArcsecPerYear).toBe(-1.2);
    expect(record.parallaxArcsec).toBe(0.25);
    expect(record.radialVelocityKmPerSec).toBe(-12);
    expect(record.hasNote).toBe(true);
    expect(record.sourceEpochJulianYear).toBe(2000);
    expect(record.sourceFrame).toBe('fk5-j2000');
  });

  it('keeps documented blank numeric fields as null instead of inventing zero', () => {
    const record = parseBsc5pFixedWidthRecord(makeRecord({
      vmag: null,
      pmRaStar: null,
      pmDec: null,
      parallax: null,
      radialVelocity: null,
      note: false
    }));

    expect(record.visualMagnitude).toBeNull();
    expect(record.properMotionRaStarArcsecPerYear).toBeNull();
    expect(record.properMotionDecArcsecPerYear).toBeNull();
    expect(record.parallaxArcsec).toBeNull();
    expect(record.radialVelocityKmPerSec).toBeNull();
    expect(record.hasNote).toBe(false);
  });

  it('accepts records whose complete J2000 position is blank', () => {
    const line = makeRecord().split('');
    for (let index = 75; index < 90; index += 1) line[index] = ' ';
    const record = parseBsc5pFixedWidthRecord(line.join(''));
    expect(record.rightAscensionJ2000Deg).toBeNull();
    expect(record.declinationJ2000Deg).toBeNull();
  });

  it('rejects a partially missing J2000 position', () => {
    const line = makeRecord().split('');
    line[83] = ' ';
    expect(() => parseBsc5pFixedWidthRecord(line.join(''))).toThrow(Bsc5pFixedWidthError);
  });

  it('rejects wrong record length and invalid coordinate ranges', () => {
    expect(() => parseBsc5pFixedWidthRecord('2491')).toThrow('197');
    expect(() => parseBsc5pFixedWidthRecord(makeRecord({ raHours: 24 }))).toThrow('RA saati');
    expect(() => parseBsc5pFixedWidthRecord(makeRecord({ decDegrees: 90, decMinutes: 1 }))).toThrow('±90°');
  });

  it('parses a catalog text and rejects duplicate HR identifiers', () => {
    const first = makeRecord({ hr: 2491 });
    const second = makeRecord({ hr: 7001, name: 'SECOND' });
    expect(parseBsc5pFixedWidthCatalog(`${first}\n${second}\n`)).toHaveLength(2);
    expect(() => parseBsc5pFixedWidthCatalog(`${first}\n${first}`)).toThrow('yinelenen HR');
  });
});
