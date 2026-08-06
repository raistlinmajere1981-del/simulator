from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    write(path, text.replace(old, new, 1))


# Shared source metadata: record whether GeoJSON route coordinates were adopted.
replace_once(
    'src/shared/simulator.ts',
    """  appliedRouteDistance?: boolean;
  modifiedAfterImport: boolean;
""",
    """  appliedRouteDistance?: boolean;
  appliedRouteCoordinates?: boolean;
  modifiedAfterImport: boolean;
""",
    'terrain source coordinate provenance field'
)

# Pure application logic.
write('src/simulation/terrain-import-application.ts', """import type {
  ImportedGeoJsonTerrainProfile,
  SimulatorInputs,
  TerrainProfileImport
} from '../shared/simulator';

export const MAX_IMPORTED_ROUTE_DISTANCE_KM = 20_000;

export interface TerrainProfileApplicationOptions {
  applyObserverEndpoint: boolean;
  applyTargetEndpoint: boolean;
  applyRouteDistance: boolean;
  applyRouteCoordinates: boolean;
}

function isGeoJsonProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return 'kind' in profile && profile.kind === 'geojson';
}

export function getApplicableImportedRouteDistanceKm(
  profile: TerrainProfileImport
): number | null {
  if (profile.sourceDistanceM === null) return null;
  const distanceKm = profile.sourceDistanceM / 1_000;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  if (distanceKm > MAX_IMPORTED_ROUTE_DISTANCE_KM) return null;
  return distanceKm;
}

export function applyImportedTerrainInputs(
  current: SimulatorInputs,
  profile: TerrainProfileImport,
  options: TerrainProfileApplicationOptions
): SimulatorInputs {
  const applyRouteCoordinates = options.applyRouteCoordinates && isGeoJsonProfile(profile);
  const importedDistanceKm = !applyRouteCoordinates &&
    options.applyRouteDistance &&
    current.distanceSource === 'manual'
    ? getApplicableImportedRouteDistanceKm(profile)
    : null;

  return {
    ...current,
    terrainMode: 'manual-points',
    distanceSource: applyRouteCoordinates ? 'coordinates' : current.distanceSource,
    surfaceDistanceKm: importedDistanceKm ?? current.surfaceDistanceKm,
    observerLatitudeDeg: applyRouteCoordinates
      ? profile.startLatitudeDeg
      : current.observerLatitudeDeg,
    observerLongitudeDeg: applyRouteCoordinates
      ? profile.startLongitudeDeg
      : current.observerLongitudeDeg,
    targetLatitudeDeg: applyRouteCoordinates
      ? profile.endLatitudeDeg
      : current.targetLatitudeDeg,
    targetLongitudeDeg: applyRouteCoordinates
      ? profile.endLongitudeDeg
      : current.targetLongitudeDeg,
    observerGroundElevationM: options.applyObserverEndpoint
      ? profile.observerEndpointElevationM
      : current.observerGroundElevationM,
    targetGroundElevationM: options.applyTargetEndpoint
      ? profile.targetEndpointElevationM
      : current.targetGroundElevationM
  };
}
""")

# Terrain editor: connect GeoJSON file selection and expose coordinate adoption.
editor_path = 'src/renderer/src/MultiPointTerrainEditor.tsx'
replace_once(
    editor_path,
    """  const [applyRouteDistance, setApplyRouteDistance] = useState(false);
  const [importMessage, setImportMessage] = useState('');
""",
    """  const [applyRouteDistance, setApplyRouteDistance] = useState(false);
  const [applyRouteCoordinates, setApplyRouteCoordinates] = useState(false);
  const [importMessage, setImportMessage] = useState('');
""",
    'coordinate adoption state'
)
replace_once(
    editor_path,
    """    setApplyTargetEndpoint(false);
    setApplyRouteDistance(false);
  };
""",
    """    setApplyTargetEndpoint(false);
    setApplyRouteDistance(false);
    setApplyRouteCoordinates(false);
  };
""",
    'reset import options'
)
replace_once(
    editor_path,
    """  const applyColumnMapping = async (): Promise<void> => {
""",
    """  const chooseGeoJsonProfile = async (): Promise<void> => {
    setOperationError('');
    setImportMessage('');
    setIsImporting(true);
    try {
      const result = await window.simulatorDesktop.importGeoJsonTerrainProfile({
        routeDistanceM: routeDistanceKm * 1_000,
        observerGroundElevationM,
        targetGroundElevationM
      });
      if (result.status === 'cancelled') {
        setPendingImport(undefined);
        setMappingRequest(undefined);
        setImportMessage(result.message);
        return;
      }
      if (result.profile) stageProfile(result.profile);
    } catch (error) {
      setPendingImport(undefined);
      setMappingRequest(undefined);
      setOperationError(
        error instanceof Error ? error.message : 'GeoJSON arazi profili okunamadı.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const applyColumnMapping = async (): Promise<void> => {
""",
    'GeoJSON selection handler'
)
replace_once(
    editor_path,
    """  const applyCsvProfile = (): void => {
""",
    """  const applyTerrainProfile = (): void => {
""",
    'generic import apply handler name'
)
replace_once(
    editor_path,
    """      applyObserverEndpoint,
      applyTargetEndpoint,
      applyRouteDistance
    });
""",
    """      applyObserverEndpoint,
      applyTargetEndpoint,
      applyRouteDistance,
      applyRouteCoordinates
    });
""",
    'coordinate application option dispatch'
)
replace_once(
    editor_path,
    """          </button>
          <button
            disabled={disabled || sortedPoints.length >= MAX_EDITOR_POINTS}
""",
    """          </button>
          <button
            className="terrain-csv-button"
            disabled={disabled || isImporting || routeDistanceKm <= 0}
            title="WGS84 boylam, enlem ve yükseklik taşıyan bir GeoJSON rotasını kullan"
            type="button"
            onClick={() => void chooseGeoJsonProfile()}
          >
            {isImporting ? 'Dosya okunuyor…' : 'GeoJSON dosyasından al'}
          </button>
          <button
            disabled={disabled || sortedPoints.length >= MAX_EDITOR_POINTS}
""",
    'GeoJSON editor button'
)
replace_once(
    editor_path,
    """            Ara noktalar dosyadan alınır. Aşağıdaki seçenekler CSV rota uzunluğunun
            ve başlangıç-bitiş zemin yüksekliğinin deneye aktarılmasını sağlar.
""",
    """            Ara noktalar dosyadan alınır. Aşağıdaki seçenekler kaynak rota bilgisinin
            ve başlangıç-bitiş zemin yüksekliğinin deneye aktarılmasını sağlar.
""",
    'generic import review guide'
)
route_options_old = """          <div className="terrain-endpoint-options">
            {allowRouteDistanceImport && pendingSourceDistanceKm !== null && (
              <label title="İşaretlenirse manuel yüzey mesafesi CSV dosyasının toplam rotasıyla değiştirilir">
                <input
                  checked={applyRouteDistance}
                  type="checkbox"
                  onChange={(event) => setApplyRouteDistance(event.currentTarget.checked)}
                />
                <span>Deney mesafesini CSV rotasına ayarla: <b>{numberFormatter.format(pendingSourceDistanceKm)} km</b></span>
              </label>
            )}
"""
route_options_new = """          <div className="terrain-endpoint-options">
            {isGeoJsonProfile(pendingImport) && (
              <label title="İşaretlenirse gözlemci ve hedef koordinatları GeoJSON rotasının uçlarından alınır ve mesafe WGS84 ile yeniden hesaplanır">
                <input
                  checked={applyRouteCoordinates}
                  type="checkbox"
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setApplyRouteCoordinates(checked);
                    if (checked) setApplyRouteDistance(false);
                  }}
                />
                <span>
                  Deney koordinatlarını GeoJSON rotasından al:
                  <b> {pendingImport.startLatitudeDeg.toFixed(6)}°, {pendingImport.startLongitudeDeg.toFixed(6)}° → {pendingImport.endLatitudeDeg.toFixed(6)}°, {pendingImport.endLongitudeDeg.toFixed(6)}°</b>
                </span>
              </label>
            )}
            {allowRouteDistanceImport && pendingSourceDistanceKm !== null && (
              <label title="İşaretlenirse manuel yüzey mesafesi dosyanın toplam rotasıyla değiştirilir">
                <input
                  checked={applyRouteDistance}
                  disabled={applyRouteCoordinates}
                  type="checkbox"
                  onChange={(event) => setApplyRouteDistance(event.currentTarget.checked)}
                />
                <span>Deney mesafesini dosyadaki rotaya ayarla: <b>{numberFormatter.format(pendingSourceDistanceKm)} km</b></span>
              </label>
            )}
"""
replace_once(editor_path, route_options_old, route_options_new, 'route and coordinate import options')
replace_once(
    editor_path,
    'onClick={applyCsvProfile}>Arazi profilini uygula',
    'onClick={applyTerrainProfile}>Arazi profilini uygula',
    'generic terrain import apply button'
)

# App integration and source provenance.
app_path = 'src/renderer/src/AppNext.tsx'
replace_once(
    app_path,
    """function isImportedGeoJsonTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return isImportedGeoJsonTerrainProfile(profile);
}
""",
    """function isImportedGeoJsonTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return 'kind' in profile && profile.kind === 'geojson';
}
""",
    'recursive GeoJSON type guard'
)
replace_once(
    app_path,
    """              <span>{source.coordinateCount} koordinat · WGS84 LineString · Z → yükseklik</span>
""",
    """              <span>
                {source.coordinateCount} koordinat · WGS84 LineString · Z → yükseklik
                {source.appliedRouteCoordinates === true ? ' · deney koordinatlarına uygulandı' : ''}
              </span>
""",
    'GeoJSON source coordinate status'
)
replace_once(
    app_path,
    """    if (key === 'observerGroundElevationM' ||
      key === 'targetGroundElevationM' ||
      key === 'surfaceDistanceKm') {
""",
    """    if (key === 'observerGroundElevationM' ||
      key === 'targetGroundElevationM' ||
      key === 'surfaceDistanceKm' ||
      key === 'observerLatitudeDeg' ||
      key === 'observerLongitudeDeg' ||
      key === 'targetLatitudeDeg' ||
      key === 'targetLongitudeDeg') {
""",
    'coordinate edits mark provenance modified'
)
replace_once(
    app_path,
    """    const appliedRouteDistance = Boolean(
      options.applyRouteDistance &&
      inputs.distanceSource === 'manual' &&
      profile.sourceDistanceM !== null
    );
""",
    """    const appliedRouteCoordinates = Boolean(
      options.applyRouteCoordinates && isImportedGeoJsonTerrainProfile(profile)
    );
    const appliedRouteDistance = Boolean(
      !appliedRouteCoordinates &&
      options.applyRouteDistance &&
      inputs.distanceSource === 'manual' &&
      profile.sourceDistanceM !== null
    );
""",
    'applied coordinate and distance provenance calculation'
)
replace_once(
    app_path,
    """      appliedTargetEndpoint: options.applyTargetEndpoint,
      appliedRouteDistance,
      modifiedAfterImport: false
""",
    """      appliedTargetEndpoint: options.applyTargetEndpoint,
      appliedRouteDistance,
      appliedRouteCoordinates,
      modifiedAfterImport: false
""",
    'persist coordinate provenance'
)

# Portable parser: preserve the optional field while keeping v6 files compatible.
replace_once(
    'src/shared/portable.ts',
    """    appliedTargetEndpoint: value.appliedTargetEndpoint,
    appliedRouteDistance: value.appliedRouteDistance === true,
    modifiedAfterImport: value.modifiedAfterImport
""",
    """    appliedTargetEndpoint: value.appliedTargetEndpoint,
    appliedRouteDistance: value.appliedRouteDistance === true,
    ...(typeof value.appliedRouteCoordinates === 'boolean'
      ? { appliedRouteCoordinates: value.appliedRouteCoordinates }
      : {}),
    modifiedAfterImport: value.modifiedAfterImport
""",
    'portable coordinate provenance parsing'
)

# HTML report provenance.
replace_once(
    'src/report/html-report.ts',
    """    <tr><td>Bitiş koordinatı</td><td>${coordinateFormatter.format(source.endLatitudeDeg)}°, ${coordinateFormatter.format(source.endLongitudeDeg)}°</td></tr>`;
""",
    """    <tr><td>Bitiş koordinatı</td><td>${coordinateFormatter.format(source.endLatitudeDeg)}°, ${coordinateFormatter.format(source.endLongitudeDeg)}°</td></tr>
    <tr><td>Rota koordinatları</td><td>Deneye uygulandı: ${yesNo(source.appliedRouteCoordinates === true)}</td></tr>`;
""",
    'report coordinate provenance row'
)

# Tests for pure application logic.
write('tests/terrain-import-application.test.ts', """import { describe, expect, it } from 'vitest';
import {
  applyImportedTerrainInputs,
  getApplicableImportedRouteDistanceKm
} from '../src/simulation/terrain-import-application';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type ImportedGeoJsonTerrainProfile,
  type ImportedTerrainProfile
} from '../src/shared/simulator';

const profile: ImportedTerrainProfile = {
  fileName: 'route.csv',
  delimiter: 'comma',
  distanceUnit: 'm',
  distanceColumnHeader: 'distance_m',
  elevationColumnHeader: 'elevation_m',
  rowCount: 3,
  sourceDistanceM: 10_000,
  observerEndpointElevationM: 4,
  targetEndpointElevationM: 5,
  points: [{ id: 'p1', distancePercent: 50, elevationM: 20 }],
  warnings: []
};

const geoJsonProfile: ImportedGeoJsonTerrainProfile = {
  kind: 'geojson',
  fileName: 'route.geojson',
  geometryType: 'LineString',
  coordinateCount: 3,
  sourceDistanceM: 12_345,
  startLongitudeDeg: 28.9784,
  startLatitudeDeg: 41.0082,
  endLongitudeDeg: 29.06,
  endLatitudeDeg: 41.058,
  elevationSource: 'coordinate-z',
  observerEndpointElevationM: 4,
  targetEndpointElevationM: 5,
  points: [{ id: 'g1', distancePercent: 50, elevationM: 22 }],
  warnings: []
};

const noCoordinateAdoption = {
  applyObserverEndpoint: false,
  applyTargetEndpoint: false,
  applyRouteDistance: false,
  applyRouteCoordinates: false
};

describe('terrain profile application', () => {
  it('applies the CSV route distance in manual distance mode when selected', () => {
    const result = applyImportedTerrainInputs(
      { ...DEFAULT_SIMULATOR_INPUTS, surfaceDistanceKm: 22.38 },
      profile,
      {
        applyObserverEndpoint: true,
        applyTargetEndpoint: true,
        applyRouteDistance: true,
        applyRouteCoordinates: false
      }
    );

    expect(result.surfaceDistanceKm).toBe(10);
    expect(result.observerGroundElevationM).toBe(4);
    expect(result.targetGroundElevationM).toBe(5);
    expect(result.terrainMode).toBe('manual-points');
  });

  it('keeps the current route distance when the option is not selected', () => {
    const result = applyImportedTerrainInputs(
      { ...DEFAULT_SIMULATOR_INPUTS, surfaceDistanceKm: 22.38 },
      profile,
      noCoordinateAdoption
    );

    expect(result.surfaceDistanceKm).toBe(22.38);
  });

  it('does not override a coordinate-derived route distance', () => {
    const result = applyImportedTerrainInputs(
      {
        ...DEFAULT_SIMULATOR_INPUTS,
        distanceSource: 'coordinates',
        surfaceDistanceKm: 22.38
      },
      profile,
      { ...noCoordinateAdoption, applyRouteDistance: true }
    );

    expect(result.surfaceDistanceKm).toBe(22.38);
  });

  it('adopts GeoJSON route endpoints as experiment coordinates', () => {
    const result = applyImportedTerrainInputs(
      {
        ...DEFAULT_SIMULATOR_INPUTS,
        distanceSource: 'manual',
        surfaceDistanceKm: 40
      },
      geoJsonProfile,
      {
        applyObserverEndpoint: true,
        applyTargetEndpoint: true,
        applyRouteDistance: true,
        applyRouteCoordinates: true
      }
    );

    expect(result.distanceSource).toBe('coordinates');
    expect(result.surfaceDistanceKm).toBe(40);
    expect(result.observerLatitudeDeg).toBe(41.0082);
    expect(result.observerLongitudeDeg).toBe(28.9784);
    expect(result.targetLatitudeDeg).toBe(41.058);
    expect(result.targetLongitudeDeg).toBe(29.06);
    expect(result.observerGroundElevationM).toBe(4);
    expect(result.targetGroundElevationM).toBe(5);
  });

  it('does not treat a CSV profile as a coordinate source', () => {
    const result = applyImportedTerrainInputs(
      { ...DEFAULT_SIMULATOR_INPUTS, distanceSource: 'manual' },
      profile,
      { ...noCoordinateAdoption, applyRouteCoordinates: true }
    );

    expect(result.distanceSource).toBe('manual');
    expect(result.observerLatitudeDeg).toBe(DEFAULT_SIMULATOR_INPUTS.observerLatitudeDeg);
  });

  it('rejects percentage-only and out-of-range source distances', () => {
    expect(getApplicableImportedRouteDistanceKm({
      ...profile,
      sourceDistanceM: null,
      distanceUnit: 'percent'
    })).toBeNull();
    expect(getApplicableImportedRouteDistanceKm({
      ...profile,
      sourceDistanceM: 20_000_001
    })).toBeNull();
  });
});
""")

# Portable and report tests.
portable_test_path = 'tests/portable.test.ts'
replace_once(
    portable_test_path,
    """    appliedRouteDistance: false,
    modifiedAfterImport: false
""",
    """    appliedRouteDistance: false,
    appliedRouteCoordinates: false,
    modifiedAfterImport: false
""",
    'CSV fixture coordinate provenance'
)
replace_once(
    portable_test_path,
    """    appliedRouteDistance: true,
    modifiedAfterImport: false,
""",
    """    appliedRouteDistance: false,
    appliedRouteCoordinates: true,
    modifiedAfterImport: false,
""",
    'GeoJSON fixture coordinate provenance'
)
replace_once(
    portable_test_path,
    """    delete legacySource.kind;
    delete legacySource.appliedRouteDistance;
""",
    """    delete legacySource.kind;
    delete legacySource.appliedRouteDistance;
    delete legacySource.appliedRouteCoordinates;
""",
    'legacy v5 coordinate provenance removal'
)
replace_once(
    portable_test_path,
    """    expect(parsed.experiment.terrainProfileSource?.kind).toBe('csv');
    expect(parsed.experiment.terrainProfileSource?.appliedRouteDistance).toBe(false);
""",
    """    expect(parsed.experiment.terrainProfileSource?.kind).toBe('csv');
    expect(parsed.experiment.terrainProfileSource?.appliedRouteDistance).toBe(false);
    expect(parsed.experiment.terrainProfileSource?.appliedRouteCoordinates).toBeUndefined();
""",
    'legacy v5 coordinate provenance assertion'
)

report_test_path = 'tests/report.test.ts'
replace_once(
    report_test_path,
    """      appliedRouteDistance: true,
      modifiedAfterImport: false,
""",
    """      appliedRouteDistance: false,
      appliedRouteCoordinates: true,
      modifiedAfterImport: false,
""",
    'report GeoJSON coordinate provenance fixture'
)
replace_once(
    report_test_path,
    """  expect(html).toContain('Deney mesafesine uygulandı: Evet');
  expect(html).toContain('41,0082°');
""",
    """  expect(html).toContain('Deney mesafesine uygulandı: Hayır');
  expect(html).toContain('Rota koordinatları');
  expect(html).toContain('Deneye uygulandı: Evet');
  expect(html).toContain('41,0082°');
""",
    'report coordinate provenance assertions'
)

# Version and documentation.
replace_once('package.json', '"version": "0.9.0"', '"version": "0.9.1"', 'package version')
replace_once(
    'src/preload/index.ts',
    "version: '0.9.0'",
    "version: '0.9.1'",
    'desktop API version'
)
replace_once(
    'docs/geojson-terrain-profile.md',
    """Koordinatların üçüncü bileşeni zemin yüksekliği olarak kullanılır. Yüksekliğin
ortometrik mi elipsoidal mı olduğu dosyadan otomatik anlaşılamaz; kullanıcı
deneyde uygun düşey referansı seçmelidir.
""",
    """Koordinatların üçüncü bileşeni zemin yüksekliği olarak kullanılır. Yüksekliğin
ortometrik mi elipsoidal mı olduğu dosyadan otomatik anlaşılamaz; kullanıcı
deneyde uygun düşey referansı seçmelidir.

İçe aktarma incelemesinde rota uçları deneyin gözlemci ve hedef koordinatlarına
isteğe bağlı uygulanabilir. Bu seçenek seçildiğinde deney koordinat moduna geçer
ve kullanılan yüzey mesafesi WGS84 ters jeodezik çözümle yeniden hesaplanır.
Manuel rota mesafesini uygulama seçeneğiyle aynı anda kullanılamaz.
""",
    'GeoJSON coordinate adoption documentation'
)
replace_once(
    'README.md',
    """gerçek jeodezik parça mesafeleriyle arazi profiline dönüştürülebilir. Örnek dosya:
`examples/terrain-profile-wgs84.geojson`.
""",
    """gerçek jeodezik parça mesafeleriyle arazi profiline dönüştürülebilir. Rota uçları
isteğe bağlı olarak deneyin gözlemci ve hedef koordinatlarına aktarılabilir. Örnek dosya:
`examples/terrain-profile-wgs84.geojson`.
""",
    'README GeoJSON coordinate adoption'
)
replace_once(
    'docs/roadmap.md',
    """## Sonraki gerçek arazi işleri
""",
    """## Aşama 3.8 — GeoJSON rota koordinatlarını deneye aktarma

Durum: tamamlandı

- GeoJSON dosya seçiminin arazi paneline bağlanması
- Rota başlangıç ve bitiş koordinatlarını bağımsız uygulama seçeneği
- Seçildiğinde deneyin koordinat moduna geçirilmesi
- Yüzey mesafesinin WGS84 ile otomatik yeniden hesaplanması
- Manuel rota mesafesi seçeneğiyle karşılıklı dışlama
- Koordinat uygulama durumunun kayıt ve HTML raporunda korunması
- Koordinatlar sonradan değiştirildiğinde kaynak değişiklik işareti
- Hatalı özyinelemeli GeoJSON tür denetiminin düzeltilmesi
- Saf uygulama testleri ve uçtan uca Electron derlemesi
- Uygulama sürümü `0.9.1`

## Sonraki gerçek arazi işleri
""",
    'roadmap GeoJSON coordinate adoption stage'
)
