import { describe, expect, it } from 'vitest';
import {
  parseTerrainProfileCsv,
  TerrainProfileColumnMappingRequiredError
} from '../src/simulation/csv-terrain-profile';

const context = {
  routeDistanceM: 10_000,
  observerGroundElevationM: 0,
  targetGroundElevationM: 0
};

describe('CSV terrain profile import', () => {
  it('parses a comma-separated percentage profile', () => {
    const profile = parseTerrainProfileCsv(
      [
        'distance_percent,elevation_m',
        '0,0',
        '25,3',
        '50,30',
        '75,5',
        '100,0'
      ].join('\n'),
      '/tmp/coast.csv',
      context
    );

    expect(profile.fileName).toBe('coast.csv');
    expect(profile.delimiter).toBe('comma');
    expect(profile.distanceUnit).toBe('percent');
    expect(profile.distanceColumnHeader).toBe('distance_percent');
    expect(profile.elevationColumnHeader).toBe('elevation_m');
    expect(profile.rowCount).toBe(5);
    expect(profile.sourceDistanceM).toBeNull();
    expect(profile.points).toEqual([
      { id: 'csv-line-3', distancePercent: 25, elevationM: 3 },
      { id: 'csv-line-4', distancePercent: 50, elevationM: 30 },
      { id: 'csv-line-5', distancePercent: 75, elevationM: 5 }
    ]);
  });

  it('parses semicolon CSV with Turkish headers and decimal commas', () => {
    const profile = parseTerrainProfileCsv(
      [
        '# QGIS profil dışa aktarımı',
        'mesafe_km;kot_m',
        '0;1,5',
        '2,5;8,25',
        '10;2,75'
      ].join('\n'),
      'profil.csv',
      {
        routeDistanceM: 10_000,
        observerGroundElevationM: 1.5,
        targetGroundElevationM: 2.75
      }
    );

    expect(profile.delimiter).toBe('semicolon');
    expect(profile.distanceUnit).toBe('km');
    expect(profile.sourceDistanceM).toBe(10_000);
    expect(profile.points[0]).toMatchObject({
      distancePercent: 25,
      elevationM: 8.25
    });
    expect(profile.warnings).toEqual(['Ayırıcı: noktalı virgül.']);
  });

  it('parses tab-separated metre distances and normalizes them to percentages', () => {
    const profile = parseTerrainProfileCsv(
      'distance_m\televation_m\n0\t0\n2500\t12\n10000\t0',
      'profile.tsv',
      context
    );

    expect(profile.delimiter).toBe('tab');
    expect(profile.distanceUnit).toBe('m');
    expect(profile.points).toHaveLength(1);
    expect(profile.points[0]?.distancePercent).toBe(25);
  });

  it('warns when CSV route length and endpoint elevations differ from the experiment', () => {
    const profile = parseTerrainProfileCsv(
      'distance_m,elevation_m\n0,2\n5000,10\n20000,4',
      'different.csv',
      context
    );

    expect(profile.sourceDistanceM).toBe(20_000);
    expect(profile.points[0]?.distancePercent).toBe(25);
    expect(profile.warnings.some((warning) => warning.includes('CSV toplam mesafesi 20 km')))
      .toBe(true);
    expect(profile.warnings.some((warning) => warning.includes('gözlemci uç kotu')))
      .toBe(true);
    expect(profile.warnings.some((warning) => warning.includes('hedef uç kotu')))
      .toBe(true);
    expect(profile.warnings.some((warning) => warning.includes('seçilebilir')))
      .toBe(true);
  });

  it('treats an ambiguous distance header as metres with a warning', () => {
    const profile = parseTerrainProfileCsv(
      'mesafe,kot\n0,0\n5000,10\n10000,0',
      'legacy.csv',
      context
    );

    expect(profile.distanceUnit).toBe('m');
    expect(profile.warnings.some((warning) => warning.includes('metre olarak yorumlandı')))
      .toBe(true);
  });

  it('requests column mapping for unknown headers and exposes only a short preview', () => {
    let thrown: unknown;
    try {
      parseTerrainProfileCsv(
        'chainage,terrain_height,station\n0,4,OBS\n1000,8,A\n10000,5,TARGET',
        '/private/example.csv',
        context
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TerrainProfileColumnMappingRequiredError);
    const mappingError = thrown as TerrainProfileColumnMappingRequiredError;
    expect(mappingError.inspection.fileName).toBe('example.csv');
    expect(mappingError.inspection.headers).toEqual([
      'chainage',
      'terrain_height',
      'station'
    ]);
    expect(mappingError.inspection.previewRows).toHaveLength(3);
    expect(mappingError.inspection.reason).toContain('otomatik belirlenemedi');
  });

  it('parses custom columns with an explicit mapping', () => {
    const profile = parseTerrainProfileCsv(
      'chainage,terrain_height,station\n0,4,OBS\n2500,22,A\n10000,5,TARGET',
      'custom.csv',
      context,
      {
        distanceColumnIndex: 0,
        elevationColumnIndex: 1,
        distanceUnit: 'm'
      }
    );

    expect(profile.distanceColumnHeader).toBe('chainage');
    expect(profile.elevationColumnHeader).toBe('terrain_height');
    expect(profile.observerEndpointElevationM).toBe(4);
    expect(profile.targetEndpointElevationM).toBe(5);
    expect(profile.points[0]).toMatchObject({
      distancePercent: 25,
      elevationM: 22
    });
  });

  it('rejects using the same column for distance and elevation', () => {
    expect(() => parseTerrainProfileCsv(
      'x,y\n0,0\n100,1',
      'same.csv',
      context,
      {
        distanceColumnIndex: 0,
        elevationColumnIndex: 0,
        distanceUnit: 'percent'
      }
    )).toThrow('farklı CSV sütunları');
  });

  it('rejects a profile without explicit endpoints', () => {
    expect(() => parseTerrainProfileCsv(
      'distance_percent,elevation_m\n10,5\n90,4',
      'missing-endpoints.csv',
      context
    )).toThrow('ilk mesafe değeri 0 olmalı');
  });

  it('rejects duplicate or decreasing distances', () => {
    expect(() => parseTerrainProfileCsv(
      'distance_percent,elevation_m\n0,0\n50,5\n50,6\n100,0',
      'duplicate.csv',
      context
    )).toThrow('önceki satırdan büyük olmalı');
  });

  it('rejects malformed numbers after mapping or automatic recognition', () => {
    expect(() => parseTerrainProfileCsv(
      'distance_m;elevation_m\n0;0\n5000;abc\n10000;0',
      'bad-number.csv',
      context
    )).toThrow('geçerli bir sayı değil');
  });

  it('supports quoted header cells', () => {
    const profile = parseTerrainProfileCsv(
      '"distance_km";"elevation_m"\n"0";"0"\n"5";"10"\n"10";"0"',
      'quoted.csv',
      context
    );

    expect(profile.points[0]).toMatchObject({
      distancePercent: 50,
      elevationM: 10
    });
  });
});
