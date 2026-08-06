import { describe, expect, it } from 'vitest';
import {
  attachTerrainSourceIntegrity,
  calculateTerrainSourceIntegrity
} from '../src/main/terrain-source-integrity';

describe('terrain source integrity', () => {
  it('calculates exact byte size and the standard SHA-256 digest', () => {
    const integrity = calculateTerrainSourceIntegrity(
      new TextEncoder().encode('abc')
    );

    expect(integrity.fileSizeBytes).toBe(3);
    expect(integrity.sha256)
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('attaches integrity without mutating the parser result', () => {
    const profile = { fileName: 'route.csv', rowCount: 3 };
    const attached = attachTerrainSourceIntegrity(profile, {
      fileSizeBytes: 128,
      sha256: 'a'.repeat(64)
    });

    expect(attached).toEqual({
      fileName: 'route.csv',
      rowCount: 3,
      fileSizeBytes: 128,
      sha256: 'a'.repeat(64)
    });
    expect(profile).toEqual({ fileName: 'route.csv', rowCount: 3 });
  });
});
