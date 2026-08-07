import { describe, expect, it } from 'vitest';
import type { TerrainProfile } from '../src/shared/terrain';
import { buildTerrainVisualizationProfile } from '../src/simulation/terrain-visualization';

function profile(samples: TerrainProfile['samples']): TerrainProfile {
  return {
    id: 'terrain-visual-test',
    label: 'Test profil',
    source: 'manual',
    datum: { kind: 'orthometric-msl', label: 'MSL', offsetM: 0 },
    totalDistanceM: 1_000,
    samples
  };
}

describe('buildTerrainVisualizationProfile', () => {
  it('normalizes relief relative to the endpoint baseline', () => {
    const result = buildTerrainVisualizationProfile(profile([
      { distanceM: 0, elevationM: 10 },
      { distanceM: 250, elevationM: 30 },
      { distanceM: 500, elevationM: 5 },
      { distanceM: 1_000, elevationM: 20 }
    ]));

    expect(result.minimumElevationM).toBe(5);
    expect(result.maximumElevationM).toBe(30);
    expect(result.samples[0].normalizedRelief).toBe(0);
    expect(result.samples.at(-1)?.normalizedRelief).toBe(0);
    expect(result.samples[1].reliefM).toBeCloseTo(17.5, 8);
    expect(result.samples[2].reliefM).toBeCloseTo(-10, 8);
    expect(result.samples[1].normalizedRelief).toBe(1);
    expect(result.samples[2].normalizedRelief).toBeCloseTo(-10 / 17.5, 8);
  });

  it('keeps a flat or linearly sloping profile visually neutral', () => {
    const result = buildTerrainVisualizationProfile(profile([
      { distanceM: 0, elevationM: 10 },
      { distanceM: 500, elevationM: 15 },
      { distanceM: 1_000, elevationM: 20 }
    ]));

    expect(result.maximumAbsoluteReliefM).toBe(0);
    expect(result.samples.map((sample) => sample.normalizedRelief)).toEqual([0, 0, 0]);
  });

  it('rejects profiles without ordered endpoint samples', () => {
    expect(() => buildTerrainVisualizationProfile(profile([
      { distanceM: 100, elevationM: 10 },
      { distanceM: 1_000, elevationM: 20 }
    ]))).toThrow('profil uç örneklerini');

    expect(() => buildTerrainVisualizationProfile(profile([
      { distanceM: 0, elevationM: 10 },
      { distanceM: 700, elevationM: 12 },
      { distanceM: 600, elevationM: 13 },
      { distanceM: 1_000, elevationM: 20 }
    ]))).toThrow('artan ve tekrarsız');
  });
});
