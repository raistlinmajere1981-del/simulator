import { describe, expect, it } from 'vitest';
import {
  parseStellarLocalHorizonCsv,
  parseStellarLocalHorizonFile,
  parseStellarLocalHorizonJson,
  StellarLocalHorizonImportError
} from '../src/simulation/stellar-local-horizon-import';

describe('stellar local horizon import', () => {
  it('parses a headed comma-separated skyline and normalizes the source name', () => {
    const parsed = parseStellarLocalHorizonCsv(
      'azimuthDeg,altitudeDeg\n0,2\n90,5\n180,1\n270,4\n',
      '/tmp/observations/skyline.csv'
    );
    expect(parsed.fileName).toBe('skyline.csv');
    expect(parsed.format).toBe('csv');
    expect(parsed.pointCount).toBe(4);
    expect(parsed.maximumAzimuthGapDeg).toBe(90);
    expect(parsed.points).toEqual([
      { azimuthDeg: 0, altitudeDeg: 2 },
      { azimuthDeg: 90, altitudeDeg: 5 },
      { azimuthDeg: 180, altitudeDeg: 1 },
      { azimuthDeg: 270, altitudeDeg: 4 }
    ]);
  });

  it('accepts a two-column file without a header', () => {
    const parsed = parseStellarLocalHorizonCsv(
      '0,1\n120,2\n240,3\n',
      'plain.csv'
    );
    expect(parsed.points).toHaveLength(3);
    expect(parsed.points[1]).toEqual({ azimuthDeg: 120, altitudeDeg: 2 });
  });

  it('prefers semicolon delimiter so decimal comma values remain usable', () => {
    const parsed = parseStellarLocalHorizonCsv(
      'azimut;ufuk_yuksekligi\n0;1,5\n120;2,25\n240;-0,75\n',
      'turkce.csv'
    );
    expect(parsed.points.map((point) => point.altitudeDeg)).toEqual([1.5, 2.25, -0.75]);
  });

  it('sorts an unsorted source and emits source-density warnings', () => {
    const parsed = parseStellarLocalHorizonCsv(
      'azimuthDeg,altitudeDeg\n240,3\n0,1\n120,2\n',
      'unsorted.csv'
    );
    expect(parsed.points.map((point) => point.azimuthDeg)).toEqual([0, 120, 240]);
    expect(parsed.warnings.some((warning) => warning.includes('sıralı değildi'))).toBe(true);
    expect(parsed.warnings.some((warning) => warning.includes('çok sınırlıdır'))).toBe(true);
  });

  it('parses JSON object points and pair-array points', () => {
    const objectProfile = parseStellarLocalHorizonJson(JSON.stringify({
      points: [
        { azimuthDeg: 0, altitudeDeg: 1 },
        { azimuth: 120, elevation: 2 },
        { azimut: 240, ufukYuksekligi: 3 }
      ]
    }), 'profile.json');
    expect(objectProfile.points.map((point) => point.altitudeDeg)).toEqual([1, 2, 3]);

    const pairProfile = parseStellarLocalHorizonJson(
      JSON.stringify([[0, 1], [180, 2], [270, 3]]),
      'pairs.json'
    );
    expect(pairProfile.points[1]).toEqual({ azimuthDeg: 180, altitudeDeg: 2 });
  });

  it('selects parser from extension or content fallback', () => {
    expect(parseStellarLocalHorizonFile(
      JSON.stringify({ points: [[0, 0], [120, 1], [240, 2]] }),
      'mask.json'
    ).format).toBe('json');
    expect(parseStellarLocalHorizonFile(
      '0;0\n120;1\n240;2\n',
      'mask.dat'
    ).format).toBe('csv');
  });

  it('rejects duplicates, invalid altitude and malformed JSON', () => {
    expect(() => parseStellarLocalHorizonCsv(
      '0,0\n120,1\n120,2\n',
      'duplicate.csv'
    )).toThrow(StellarLocalHorizonImportError);
    expect(() => parseStellarLocalHorizonJson(
      JSON.stringify([[0, 0], [120, 91], [240, 0]]),
      'bad.json'
    )).toThrow('-90°');
    expect(() => parseStellarLocalHorizonJson('{bad json', 'bad.json')).toThrow('geçerli JSON');
  });

  it('enforces the 1,440-point engine limit', () => {
    const rows = ['azimuthDeg,altitudeDeg'];
    for (let index = 0; index < 1_441; index += 1) {
      rows.push(`${index * 360 / 1_441},0`);
    }
    expect(() => parseStellarLocalHorizonCsv(rows.join('\n'), 'dense.csv')).toThrow('1.440');
  });
});
