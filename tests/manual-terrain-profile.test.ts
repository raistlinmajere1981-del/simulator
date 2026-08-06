import { describe, expect, it } from 'vitest';
import {
  buildManualTerrainProfile,
  insertManualTerrainPoint,
  migrateLegacyManualTerrainPoint,
  removeManualTerrainPoint,
  sortManualTerrainPoints,
  updateManualTerrainPoint,
  validateManualTerrainPoints
} from '../src/simulation/manual-terrain-profile';
import { validateTerrainProfile } from '../src/simulation/terrain';
import type { ManualTerrainPoint } from '../src/shared/terrain';

const points: ManualTerrainPoint[] = [
  { id: 'p2', distancePercent: 75, elevationM: 12 },
  { id: 'p1', distancePercent: 25, elevationM: 4 },
  { id: 'p3', distancePercent: 50, elevationM: 9 }
];

describe('multi-point manual terrain profile', () => {
  it('sorts points without mutating the source array', () => {
    const source = points.map((point) => ({ ...point }));
    const sorted = sortManualTerrainPoints(source);

    expect(sorted.map((point) => point.id)).toEqual(['p1', 'p3', 'p2']);
    expect(source.map((point) => point.id)).toEqual(['p2', 'p1', 'p3']);
    expect(sorted[0]).not.toBe(source[1]);
  });

  it('builds endpoint and interior samples in route order', () => {
    const profile = buildManualTerrainProfile({
      id: 'manual-profile',
      label: 'Çok noktalı profil',
      datum: {
        kind: 'orthometric-msl',
        label: 'Ortalama deniz seviyesi',
        offsetM: 0.4
      },
      totalDistanceM: 20_000,
      observerGroundElevationM: 2,
      targetGroundElevationM: 6,
      points
    });

    expect(profile.samples).toEqual([
      { distanceM: 0, elevationM: 2 },
      { distanceM: 5_000, elevationM: 4 },
      { distanceM: 10_000, elevationM: 9 },
      { distanceM: 15_000, elevationM: 12 },
      { distanceM: 20_000, elevationM: 6 }
    ]);
    expect(validateTerrainProfile(profile)).toEqual([]);
  });

  it('allows a profile with only derived endpoints', () => {
    const profile = buildManualTerrainProfile({
      id: 'endpoints-only',
      label: 'Yalnız uçlar',
      datum: {
        kind: 'local',
        label: 'Yerel datum',
        offsetM: 0
      },
      totalDistanceM: 1_000,
      observerGroundElevationM: 1,
      targetGroundElevationM: 3,
      points: []
    });

    expect(profile.samples).toHaveLength(2);
    expect(validateTerrainProfile(profile)).toEqual([]);
  });

  it('rejects duplicate percentages, duplicate ids and endpoint percentages', () => {
    const invalid: ManualTerrainPoint[] = [
      { id: 'same', distancePercent: 0, elevationM: 1 },
      { id: 'same', distancePercent: 40, elevationM: 2 },
      { id: 'p3', distancePercent: 40, elevationM: 3 },
      { id: 'p4', distancePercent: 100, elevationM: 4 }
    ];

    const errors = validateManualTerrainPoints(invalid).join(' ');
    expect(errors).toContain('kimliği tekrarlanıyor');
    expect(errors).toContain('0 ile 100 arasında');
    expect(errors).toContain('yüzde konumları tekrarsız');
  });

  it('inserts, updates and removes points with sorted immutable results', () => {
    const inserted = insertManualTerrainPoint(
      [{ id: 'p1', distancePercent: 20, elevationM: 2 }],
      { id: 'p2', distancePercent: 10, elevationM: 1 }
    );
    expect(inserted.map((point) => point.id)).toEqual(['p2', 'p1']);

    const updated = updateManualTerrainPoint(inserted, 'p1', {
      distancePercent: 5,
      elevationM: 8
    });
    expect(updated.map((point) => point.id)).toEqual(['p1', 'p2']);
    expect(updated[0]?.elevationM).toBe(8);

    const removed = removeManualTerrainPoint(updated, 'p2');
    expect(removed).toEqual([{ id: 'p1', distancePercent: 5, elevationM: 8 }]);
    expect(updated).toHaveLength(2);
  });

  it('migrates the legacy intermediate point deterministically', () => {
    expect(migrateLegacyManualTerrainPoint(50, 7.5)).toEqual([
      {
        id: 'legacy-intermediate-1',
        distancePercent: 50,
        elevationM: 7.5
      }
    ]);
  });

  it('rejects edits that would create an invalid point set', () => {
    expect(() => updateManualTerrainPoint(
      [
        { id: 'a', distancePercent: 20, elevationM: 1 },
        { id: 'b', distancePercent: 40, elevationM: 2 }
      ],
      'b',
      { distancePercent: 20 }
    )).toThrow('tekrarsız');
  });
});
