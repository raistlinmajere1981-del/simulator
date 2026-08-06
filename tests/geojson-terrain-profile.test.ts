import { describe, expect, it } from 'vitest';
import { parseTerrainProfileGeoJson } from '../src/simulation/geojson-terrain-profile';

const context = {
  routeDistanceM: 2_226.39,
  observerGroundElevationM: 4,
  targetGroundElevationM: 5
};

describe('GeoJSON terrain profile import', () => {
  it('parses a 3D LineString and derives cumulative WGS84 route percentages', () => {
    const profile = parseTerrainProfileGeoJson(JSON.stringify({
      type: 'LineString',
      coordinates: [
        [0, 0, 4],
        [0.01, 0, 22],
        [0.02, 0, 5]
      ]
    }), '/tmp/equator.geojson', context);

    expect(profile.kind).toBe('geojson');
    expect(profile.fileName).toBe('equator.geojson');
    expect(profile.coordinateCount).toBe(3);
    expect(profile.sourceDistanceM).toBeCloseTo(2_226.39, 0);
    expect(profile.points).toHaveLength(1);
    expect(profile.points[0]).toMatchObject({ elevationM: 22 });
    expect(profile.points[0]?.distancePercent).toBeCloseTo(50, 6);
    expect(profile.observerEndpointElevationM).toBe(4);
    expect(profile.targetEndpointElevationM).toBe(5);
  });

  it('accepts a FeatureCollection containing exactly one LineString', () => {
    const profile = parseTerrainProfileGeoJson(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'route' }, geometry: {
          type: 'LineString',
          coordinates: [[29, 41, 3], [29.01, 41.005, 8]]
        }},
        { type: 'Feature', properties: {}, geometry: {
          type: 'Point', coordinates: [29, 41, 3]
        }}
      ]
    }), 'route.json', context);

    expect(profile.coordinateCount).toBe(2);
    expect(profile.points).toEqual([]);
    expect(profile.sourceDistanceM).toBeGreaterThan(900);
  });

  it('rejects coordinates without a Z elevation', () => {
    expect(() => parseTerrainProfileGeoJson(JSON.stringify({
      type: 'LineString',
      coordinates: [[0, 0], [0.01, 0]]
    }), 'missing-z.geojson', context)).toThrow('[boylam, enlem, yükseklik]');
  });

  it('rejects repeated consecutive positions', () => {
    expect(() => parseTerrainProfileGeoJson(JSON.stringify({
      type: 'LineString',
      coordinates: [[0, 0, 1], [0, 0, 2]]
    }), 'duplicate.geojson', context)).toThrow('aynı konumu');
  });

  it('rejects FeatureCollections with multiple routes', () => {
    expect(() => parseTerrainProfileGeoJson(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: {
          type: 'LineString', coordinates: [[0, 0, 1], [0.01, 0, 2]]
        }},
        { type: 'Feature', properties: {}, geometry: {
          type: 'LineString', coordinates: [[1, 1, 1], [1.01, 1, 2]]
        }}
      ]
    }), 'multiple.geojson', context)).toThrow('birden fazla LineString');
  });
});
