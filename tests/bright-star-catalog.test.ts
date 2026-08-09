import { describe, expect, it } from 'vitest';
import {
  BRIGHT_STAR_CATALOG,
  BRIGHT_STAR_CATALOG_ID,
  getBrightStarById,
  resolveBrightStarForObservation,
  searchBrightStars
} from '../src/simulation/bright-star-catalog';

describe('bright star catalog', () => {
  it('contains a unique, magnitude-ordered offline reference subset', () => {
    expect(BRIGHT_STAR_CATALOG_ID).toBe('bsc5p-curated-reference');
    expect(BRIGHT_STAR_CATALOG.length).toBeGreaterThanOrEqual(15);
    expect(new Set(BRIGHT_STAR_CATALOG.map((star) => star.id)).size).toBe(BRIGHT_STAR_CATALOG.length);
    for (let index = 1; index < BRIGHT_STAR_CATALOG.length; index += 1) {
      expect(BRIGHT_STAR_CATALOG[index]!.visualMagnitude)
        .toBeGreaterThanOrEqual(BRIGHT_STAR_CATALOG[index - 1]!.visualMagnitude);
    }
  });

  it('keeps every catalog direction inside valid J2000 ranges', () => {
    for (const star of BRIGHT_STAR_CATALOG) {
      expect(star.sourceFrame).toBe('mean-j2000');
      expect(star.rightAscensionJ2000Deg).toBeGreaterThanOrEqual(0);
      expect(star.rightAscensionJ2000Deg).toBeLessThan(360);
      expect(star.declinationJ2000Deg).toBeGreaterThanOrEqual(-90);
      expect(star.declinationJ2000Deg).toBeLessThanOrEqual(90);
      expect(Number.isFinite(star.visualMagnitude)).toBe(true);
      expect(star.hrNumber).toBeGreaterThan(0);
    }
  });

  it('supports lookup and human-friendly search', () => {
    expect(getBrightStarById('hr-2491')?.commonName).toBe('Sirius');
    expect(searchBrightStars('sirius').map((star) => star.commonName)).toEqual(['Sirius']);
    expect(searchBrightStars('orion').map((star) => star.commonName)).toEqual(['Rigel', 'Betelgeuse']);
    expect(searchBrightStars('hr 424').map((star) => star.commonName)).toEqual(['Polaris']);
  });

  it('resolves a catalog star to an explicit mean-of-date precession result', () => {
    const resolved = resolveBrightStarForObservation('hr-2491', '2026-08-09T12:00:00Z');
    expect(resolved.star.commonName).toBe('Sirius');
    expect(resolved.precession.sourceFrame).toBe('mean-j2000');
    expect(resolved.precession.meanOfDateRightAscensionDeg).toBeCloseTo(101.58438278, 6);
    expect(resolved.precession.meanOfDateDeclinationDeg).toBeCloseTo(-16.74548129, 6);
  });

  it('rejects unknown star ids instead of silently substituting a catalog entry', () => {
    expect(() => resolveBrightStarForObservation('unknown-star', '2026-08-09T12:00:00Z'))
      .toThrow('bilinmeyen kimlik');
  });
});
