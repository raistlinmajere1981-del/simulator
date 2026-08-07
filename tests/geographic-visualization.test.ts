import { describe, expect, it } from 'vitest';
import { extractGeographicLineStrings } from '../src/simulation/geographic-visualization';

describe('extractGeographicLineStrings', () => {
  it('extracts valid LineString coordinates', () => {
    expect(extractGeographicLineStrings({
      type: 'LineString',
      coordinates: [[29, 41], [33, 40], [35, 39]]
    })).toEqual([[[29, 41], [33, 40], [35, 39]]]);
  });

  it('extracts valid MultiLineString coordinates and skips unusable lines', () => {
    expect(extractGeographicLineStrings({
      type: 'MultiLineString',
      coordinates: [
        [[-10, 50], [0, 52]],
        [[200, 20], [10, 15]],
        [[100, -20], [110, -25], [120, -30]]
      ]
    })).toEqual([
      [[-10, 50], [0, 52]],
      [[100, -20], [110, -25], [120, -30]]
    ]);
  });

  it('returns an empty list for unsupported or malformed geometry', () => {
    expect(extractGeographicLineStrings(null)).toEqual([]);
    expect(extractGeographicLineStrings({ type: 'Polygon', coordinates: [] })).toEqual([]);
    expect(extractGeographicLineStrings({ type: 'LineString', coordinates: [[29, 95], ['x', 41]] })).toEqual([]);
  });
});
