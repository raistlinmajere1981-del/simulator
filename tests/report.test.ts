import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { savedExperimentFixture } from './portable.test';

describe('experiment html report', () => {
  it('includes inputs, WGS84, terrain points, CSV provenance and model traces', () => {
    const html = createExperimentHtmlReport(
      savedExperimentFixture,
      '2026-08-05T14:00:00.000Z'
    );

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Kıyı görünürlük deneyi');
    expect(html).toContain('WGS84 koordinat çözümü');
    expect(html).toContain('WGS84 Jeodezik Çözüm');
    expect(html).toContain('Başlangıç azimutu');
    expect(html).toContain('wgs84:fixture');
    expect(html).toContain('Düşey Referans ve Arazi');
    expect(html).toContain('Taşınabilir deney şeması v7');
    expect(html).toContain('Ortalama deniz seviyesi');
    expect(html).toContain('Datum / gelgit ofseti');
    expect(html).toContain('3 ara noktalı manuel profil');
    expect(html).toContain('Ara nokta 1');
    expect(html).toContain('Ara nokta 2');
    expect(html).toContain('Ara nokta 3');
    expect(html).toContain('%25');
    expect(html).toContain('%50');
    expect(html).toContain('%75');
    expect(html).toContain('8,5 m');
    expect(html).toContain('Profil kaynağı ve provenans');
    expect(html).toContain('terrain-profile.csv');
    expect(html).toContain('distance_percent');
    expect(html).toContain('elevation_m');
    expect(html).toContain('Rota yüzdesi');
    expect(html).toContain('Deneye uygulandı: Evet');
    expect(html).toContain('Kayıt, içe aktarılan kaynakla eşleşiyor');
    expect(html).toContain('%51,92');
    expect(html).toContain('Görünür hedef oranı');
    expect(html).toContain('ideal-sphere:experiment-1:standard');
    expect(html).toContain('@media print');
  });

  it('includes GeoJSON provenance and endpoint coordinates', () => {
  const html = createExperimentHtmlReport({
    ...savedExperimentFixture,
    terrainProfileSource: {
      kind: 'geojson',
      fileName: 'terrain-route.geojson',
      importedAtIso: '2026-08-05T12:05:00.000Z',
      sourceDistanceM: 12_345,
      observerEndpointElevationM: 4,
      targetEndpointElevationM: 5,
      appliedObserverEndpoint: true,
      appliedTargetEndpoint: true,
      appliedRouteDistance: false,
      appliedRouteCoordinates: true,
      modifiedAfterImport: false,
      geometryType: 'LineString',
      coordinateCount: 6,
      startLongitudeDeg: 28.9784,
      startLatitudeDeg: 41.0082,
      endLongitudeDeg: 29.06,
      endLatitudeDeg: 41.058,
      elevationSource: 'coordinate-z'
    }
  });

  expect(html).toContain('GeoJSON kaynak kaydı');
  expect(html).toContain('terrain-route.geojson');
  expect(html).toContain('Koordinatların üçüncü bileşeni (Z)');
  expect(html).toContain('Deney mesafesine uygulandı: Hayır');
  expect(html).toContain('Rota koordinatları');
  expect(html).toContain('Deneye uygulandı: Evet');
  expect(html).toContain('41,0082°');
});

it('includes ESRI ASCII DEM sampling provenance', () => {
  const html = createExperimentHtmlReport({
    ...savedExperimentFixture,
    terrainProfileSource: {
      kind: 'dem',
      fileName: 'route-dem.asc',
      importedAtIso: '2026-08-06T15:00:00.000Z',
      sourceDistanceM: 22_500,
      observerEndpointElevationM: 12,
      targetEndpointElevationM: 18,
      appliedObserverEndpoint: true,
      appliedTargetEndpoint: false,
      appliedRouteDistance: false,
      appliedRouteCoordinates: false,
      modifiedAfterImport: false,
      format: 'esri-ascii',
      samplingMethod: 'bilinear',
      geodesicMethod: 'vincenty',
      columnCount: 10,
      rowCount: 10,
      sampleCount: 101,
      sampleSpacingM: 225,
      cellSizeDeg: 0.03,
      noDataValue: -9999,
      westBoundaryDeg: 28.885,
      eastBoundaryDeg: 29.185,
      southBoundaryDeg: 40.885,
      northBoundaryDeg: 41.185
    }
  });

  expect(html).toContain('ESRI ASCII DEM kaynak kaydı');
  expect(html).toContain('route-dem.asc');
  expect(html).toContain('10 × 10 hücre');
  expect(html).toContain('101 nokta');
  expect(html).toContain('İki doğrusal');
  expect(html).toContain('WGS84 Vincenty');
});

it('uses manual distance to convert every route percentage', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      inputs: {
        ...savedExperimentFixture.inputs,
        distanceSource: 'manual',
        surfaceDistanceKm: 40
      },
      geodesic: undefined
    });

    expect(html).toContain('40 km');
    expect(html).toContain('10 km');
    expect(html).toContain('20 km');
    expect(html).toContain('30 km');
    expect(html).toContain('Manuel giriş');
    expect(html).not.toContain('Jeodezik hesap izi');
    expect(html).toContain('Düşey Referans ve Arazi');
  });

  it('shows when an imported profile was modified later', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      terrainProfileSource: {
        ...savedExperimentFixture.terrainProfileSource!,
        modifiedAfterImport: true,
        appliedTargetEndpoint: false
      }
    });

    expect(html).toContain('İçe aktarımdan sonra düzenlendi');
    expect(html).toContain('Deneye uygulandı: Hayır');
    expect(html).toContain('source-modified');
  });

  it('describes the no-profile mode explicitly', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      inputs: {
        ...savedExperimentFixture.inputs,
        terrainMode: 'off'
      }
    });

    expect(html).toContain('Profil kapalı');
    expect(html).toContain('yalnızca gözlemci ve hedef zemin kotları kullanıldı');
  });

  it('falls back to the legacy single point and reports no source metadata', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      manualTerrainPoints: undefined,
      terrainProfileSource: undefined
    });

    expect(html).toContain('1 ara noktalı manuel profil');
    expect(html).toContain('%50');
    expect(html).toContain('8,5 m');
    expect(html).toContain('kayıtlı bir dış profil kaynağı bulunmuyor');
  });

  it('escapes user-controlled source and experiment text', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      name: '<script>alert("x")</script>',
      terrainProfileSource: {
        ...savedExperimentFixture.terrainProfileSource!,
        fileName: '<img src=x onerror=alert(1)>.csv'
      }
    });

    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;.csv');
  });
});
