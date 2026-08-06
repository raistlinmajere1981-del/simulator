from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    write(path, text.replace(old, new, 1))


# Shared desktop API.
replace_once(
    'src/shared/simulator.ts',
    """  importGeoJsonTerrainProfile(
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
}
""",
    """  importGeoJsonTerrainProfile(
    context: TerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
  importDemTerrainProfile(
    context: DemTerrainProfileImportContext
  ): Promise<ImportTerrainProfileResult>;
}
""",
    'DEM desktop API contract'
)

# Electron main process.
replace_once(
    'src/main/index.ts',
    """  FileOperationResult,
  ImportExperimentResult,
""",
    """  DemTerrainProfileImportContext,
  FileOperationResult,
  ImportExperimentResult,
""",
    'main DEM context type import'
)
replace_once(
    'src/main/index.ts',
    """import { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';
""",
    """import { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';
import { buildTerrainProfileFromDem } from '../simulation/dem-route-profile';
import { parseEsriAsciiGrid } from '../simulation/esri-ascii-grid';
""",
    'main DEM module imports'
)
replace_once(
    'src/main/index.ts',
    """const MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;
""",
    """const MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;
const MAX_DEM_BYTES = 64 * 1024 * 1024;
""",
    'DEM file size limit'
)
replace_once(
    'src/main/index.ts',
    """function validateTerrainColumnMapping(value: unknown): TerrainProfileColumnMapping {
""",
    """function validateDemImportContext(value: unknown): DemTerrainProfileImportContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('DEM profili için geçerli rota koordinatları gönderilmedi.');
  }
  const candidate = value as Record<string, unknown>;
  const coordinates = [
    candidate.observerLatitudeDeg,
    candidate.observerLongitudeDeg,
    candidate.targetLatitudeDeg,
    candidate.targetLongitudeDeg
  ];
  if (!coordinates.every((coordinate) => Number.isFinite(coordinate)) ||
    (candidate.observerLatitudeDeg as number) < -90 ||
    (candidate.observerLatitudeDeg as number) > 90 ||
    (candidate.targetLatitudeDeg as number) < -90 ||
    (candidate.targetLatitudeDeg as number) > 90 ||
    (candidate.observerLongitudeDeg as number) < -180 ||
    (candidate.observerLongitudeDeg as number) > 180 ||
    (candidate.targetLongitudeDeg as number) < -180 ||
    (candidate.targetLongitudeDeg as number) > 180 ||
    (candidate.samplingMethod !== 'nearest' && candidate.samplingMethod !== 'bilinear') ||
    (candidate.sampleCount !== undefined &&
      (!Number.isInteger(candidate.sampleCount) ||
        (candidate.sampleCount as number) < 3 ||
        (candidate.sampleCount as number) > 2_002))) {
    throw new TypeError('DEM rota koordinatları, örnekleme yöntemi veya örnek sayısı geçersiz.');
  }
  return {
    observerLatitudeDeg: candidate.observerLatitudeDeg as number,
    observerLongitudeDeg: candidate.observerLongitudeDeg as number,
    targetLatitudeDeg: candidate.targetLatitudeDeg as number,
    targetLongitudeDeg: candidate.targetLongitudeDeg as number,
    samplingMethod: candidate.samplingMethod,
    ...(candidate.sampleCount === undefined
      ? {}
      : { sampleCount: candidate.sampleCount as number })
  };
}

function validateTerrainColumnMapping(value: unknown): TerrainProfileColumnMapping {
""",
    'DEM context validation'
)
replace_once(
    'src/main/index.ts',
    """  ipcMain.handle(
    'terrain:import-geojson',
""",
    """  ipcMain.handle(
    'terrain:import-dem',
    async (event, rawContext: unknown): Promise<ImportTerrainProfileResult> => {
      const context = validateDemImportContext(rawContext);
      const selection = await showOpenDialog(event, {
        title: 'ESRI ASCII DEM Dosyasını İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'ESRI ASCII Grid DEM', extensions: ['asc', 'txt'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'DEM içe aktarma iptal edildi.' };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size > MAX_DEM_BYTES) {
        throw new Error('ESRI ASCII DEM dosyası 64 MB sınırını aşıyor.');
      }

      const content = await fs.readFile(selectedPath, 'utf-8');
      const grid = parseEsriAsciiGrid(content, selectedPath);
      const profile = buildTerrainProfileFromDem(grid, context);
      return {
        status: 'success',
        message: `“${profile.fileName}” DEM rotası örneklendi: ${profile.points.length} ara nokta uygulamaya hazır.`,
        filePath: selectedPath,
        profile
      };
    }
  );

  ipcMain.handle(
    'terrain:import-geojson',
""",
    'DEM IPC handler'
)

# Preload bridge.
replace_once(
    'src/preload/index.ts',
    """  FileOperationResult,
""",
    """  DemTerrainProfileImportContext,
  FileOperationResult,
""",
    'preload DEM context import'
)
replace_once(
    'src/preload/index.ts',
    """  importGeoJsonTerrainProfile: (context: TerrainProfileImportContext) =>
    ipcRenderer.invoke(
      'terrain:import-geojson',
      context
    ) as Promise<ImportTerrainProfileResult>
};
""",
    """  importGeoJsonTerrainProfile: (context: TerrainProfileImportContext) =>
    ipcRenderer.invoke(
      'terrain:import-geojson',
      context
    ) as Promise<ImportTerrainProfileResult>,
  importDemTerrainProfile: (context: DemTerrainProfileImportContext) =>
    ipcRenderer.invoke(
      'terrain:import-dem',
      context
    ) as Promise<ImportTerrainProfileResult>
};
""",
    'preload DEM method'
)

# Renderer terrain editor.
editor_path = 'src/renderer/src/MultiPointTerrainEditor.tsx'
replace_once(
    editor_path,
    """  CsvTerrainDistanceUnit,
  ImportedGeoJsonTerrainProfile,
""",
    """  CsvTerrainDistanceUnit,
  ImportedDemTerrainProfile,
  ImportedGeoJsonTerrainProfile,
""",
    'editor DEM profile import'
)
replace_once(
    editor_path,
    """  allowRouteDistanceImport: boolean;
  observerGroundElevationM: number;
""",
    """  allowRouteDistanceImport: boolean;
  allowDemImport: boolean;
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  targetLatitudeDeg: number;
  targetLongitudeDeg: number;
  observerGroundElevationM: number;
""",
    'editor DEM route props'
)
replace_once(
    editor_path,
    """function distanceUnitLabel(profile: TerrainProfileImport): string {
  if (isGeoJsonProfile(profile)) return 'WGS84 koordinatları';
  if (profile.distanceUnit === 'percent') return 'rotanın yüzdesi';
  if (profile.distanceUnit === 'km') return 'kilometre';
  return 'metre';
}

function sourceDistanceLabel(profile: TerrainProfileImport): string {
  if (profile.sourceDistanceM === null) return 'Konumlar yüzde olarak verilmiş';
  const sourceLabel = isGeoJsonProfile(profile) ? 'GeoJSON rotası' : 'CSV rotası';
  return `${numberFormatter.format(profile.sourceDistanceM / 1_000)} km ${sourceLabel}`;
}
""",
    """function isDemProfile(
  profile: TerrainProfileImport
): profile is ImportedDemTerrainProfile {
  return 'kind' in profile && profile.kind === 'dem';
}

function distanceUnitLabel(profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return 'WGS84 rota örnekleri';
  if (isGeoJsonProfile(profile)) return 'WGS84 koordinatları';
  if (profile.distanceUnit === 'percent') return 'rotanın yüzdesi';
  if (profile.distanceUnit === 'km') return 'kilometre';
  return 'metre';
}

function sourceDistanceLabel(profile: TerrainProfileImport): string {
  if (profile.sourceDistanceM === null) return 'Konumlar yüzde olarak verilmiş';
  const sourceLabel = isDemProfile(profile)
    ? 'DEM örnek rotası'
    : isGeoJsonProfile(profile)
      ? 'GeoJSON rotası'
      : 'CSV rotası';
  return `${numberFormatter.format(profile.sourceDistanceM / 1_000)} km ${sourceLabel}`;
}

function sourceRecordLabel(profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return 'DEM rota örneği';
  if (isGeoJsonProfile(profile)) return 'GeoJSON koordinatı';
  return 'Dosyadaki veri satırı';
}

function sourceRecordCount(profile: TerrainProfileImport): number {
  if (isDemProfile(profile)) return profile.sampleCount;
  if (isGeoJsonProfile(profile)) return profile.coordinateCount;
  return profile.rowCount;
}
""",
    'editor DEM type narrowing helpers'
)
replace_once(
    editor_path,
    """  routeDistanceKm,
  allowRouteDistanceImport,
  observerGroundElevationM,
""",
    """  routeDistanceKm,
  allowRouteDistanceImport,
  allowDemImport,
  observerLatitudeDeg,
  observerLongitudeDeg,
  targetLatitudeDeg,
  targetLongitudeDeg,
  observerGroundElevationM,
""",
    'editor DEM props destructuring'
)
replace_once(
    editor_path,
    """  const applyColumnMapping = async (): Promise<void> => {
""",
    """  const chooseDemProfile = async (): Promise<void> => {
    if (!allowDemImport) {
      setOperationError('DEM profili için deney mesafe kaynağı koordinat olmalı.');
      return;
    }
    setOperationError('');
    setImportMessage('');
    setIsImporting(true);
    try {
      const result = await window.simulatorDesktop.importDemTerrainProfile({
        observerLatitudeDeg,
        observerLongitudeDeg,
        targetLatitudeDeg,
        targetLongitudeDeg,
        samplingMethod: 'bilinear'
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
        error instanceof Error ? error.message : 'ESRI ASCII DEM profili oluşturulamadı.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const applyColumnMapping = async (): Promise<void> => {
""",
    'editor DEM selection handler'
)
replace_once(
    editor_path,
    """          <button
            disabled={disabled || sortedPoints.length >= MAX_EDITOR_POINTS}
""",
    """          <button
            className="terrain-csv-button"
            disabled={disabled || isImporting || !allowDemImport}
            title={allowDemImport
              ? 'Geçerli gözlemci-hedef koordinatları boyunca ESRI ASCII DEM dosyasını iki doğrusal yöntemle örnekle'
              : 'DEM profili için önce mesafe kaynağını koordinat yapın'}
            type="button"
            onClick={() => void chooseDemProfile()}
          >
            {isImporting ? 'Dosya okunuyor…' : 'DEM dosyasından al'}
          </button>
          <button
            disabled={disabled || sortedPoints.length >= MAX_EDITOR_POINTS}
""",
    'editor DEM button'
)
replace_once(
    editor_path,
    """              <small>{isGeoJsonProfile(pendingImport) ? 'GeoJSON koordinatı' : 'Dosyadaki veri satırı'}</small>
              <strong>{isGeoJsonProfile(pendingImport) ? pendingImport.coordinateCount : pendingImport.rowCount}</strong>
""",
    """              <small>{sourceRecordLabel(pendingImport)}</small>
              <strong>{sourceRecordCount(pendingImport)}</strong>
""",
    'editor source record metric'
)
replace_once(
    editor_path,
    """          {isGeoJsonProfile(pendingImport) ? (
            <div className="terrain-import-columns">
              <span>Geometri: <b>{pendingImport.geometryType}</b></span>
              <span>Yükseklik kaynağı: <b>koordinatların üçüncü bileşeni (Z)</b></span>
              <span>Başlangıç: <b>{pendingImport.startLatitudeDeg.toFixed(6)}°, {pendingImport.startLongitudeDeg.toFixed(6)}°</b></span>
              <span>Bitiş: <b>{pendingImport.endLatitudeDeg.toFixed(6)}°, {pendingImport.endLongitudeDeg.toFixed(6)}°</b></span>
            </div>
          ) : (
            <div className="terrain-import-columns">
              <span>Rotadaki yer sütunu: <b>{pendingImport.distanceColumnHeader}</b></span>
              <span>Arazi yüksekliği sütunu: <b>{pendingImport.elevationColumnHeader}</b></span>
            </div>
          )}
""",
    """          {isDemProfile(pendingImport) ? (
            <div className="terrain-import-columns">
              <span>Grid: <b>{pendingImport.columnCount} × {pendingImport.rowCount} hücre</b></span>
              <span>Hücre boyutu: <b>{pendingImport.cellSizeDeg.toFixed(8)}°</b></span>
              <span>Örnekleme: <b>{pendingImport.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</b></span>
              <span>Örnek aralığı: <b>{numberFormatter.format(pendingImport.sampleSpacingM)} m</b></span>
              <span>Jeodezik yöntem: <b>{pendingImport.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'küresel yedek'}</b></span>
            </div>
          ) : isGeoJsonProfile(pendingImport) ? (
            <div className="terrain-import-columns">
              <span>Geometri: <b>{pendingImport.geometryType}</b></span>
              <span>Yükseklik kaynağı: <b>koordinatların üçüncü bileşeni (Z)</b></span>
              <span>Başlangıç: <b>{pendingImport.startLatitudeDeg.toFixed(6)}°, {pendingImport.startLongitudeDeg.toFixed(6)}°</b></span>
              <span>Bitiş: <b>{pendingImport.endLatitudeDeg.toFixed(6)}°, {pendingImport.endLongitudeDeg.toFixed(6)}°</b></span>
            </div>
          ) : (
            <div className="terrain-import-columns">
              <span>Rotadaki yer sütunu: <b>{pendingImport.distanceColumnHeader}</b></span>
              <span>Arazi yüksekliği sütunu: <b>{pendingImport.elevationColumnHeader}</b></span>
            </div>
          )}
""",
    'editor DEM review details'
)

# Main renderer integration.
app_path = 'src/renderer/src/AppNext.tsx'
replace_once(
    app_path,
    """  type DistanceSource,
  type ImportedGeoJsonTerrainProfile,
""",
    """  type DistanceSource,
  type ImportedDemTerrainProfile,
  type ImportedGeoJsonTerrainProfile,
""",
    'App DEM profile import'
)
replace_once(
    app_path,
    """function isImportedGeoJsonTerrainProfile(
""",
    """function isImportedDemTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedDemTerrainProfile {
  return 'kind' in profile && profile.kind === 'dem';
}

function isImportedGeoJsonTerrainProfile(
""",
    'App DEM imported type guard'
)
replace_once(
    app_path,
    """function TerrainPanel({
  inputs,
""",
    """function TerrainPanel({
  inputs,
""",
    'TerrainPanel stable marker'
)
replace_once(
    app_path,
    """  allowRouteDistanceImport,
  onDatumChange,
""",
    """  allowRouteDistanceImport,
  allowDemImport,
  onDatumChange,
""",
    'TerrainPanel DEM prop destructuring'
)
replace_once(
    app_path,
    """  allowRouteDistanceImport: boolean;
  onDatumChange(kind: VerticalDatumKind): void;
""",
    """  allowRouteDistanceImport: boolean;
  allowDemImport: boolean;
  onDatumChange(kind: VerticalDatumKind): void;
""",
    'TerrainPanel DEM prop type'
)
replace_once(
    app_path,
    """            <strong>{isCsvTerrainProfileSource(source) ? 'CSV kaynağı' : 'GeoJSON kaynağı'}: {source.fileName}</strong>
            {isCsvTerrainProfileSource(source) ? (
              <span>{source.distanceColumnHeader} → mesafe · {source.elevationColumnHeader} → yükseklik · {source.rowCount} satır</span>
            ) : (
              <span>
                {source.coordinateCount} koordinat · WGS84 LineString · Z → yükseklik
                {source.appliedRouteCoordinates === true ? ' · deney koordinatlarına uygulandı' : ''}
              </span>
            )}
""",
    """            <strong>{source.kind === 'csv' ? 'CSV kaynağı' : source.kind === 'geojson' ? 'GeoJSON kaynağı' : 'DEM kaynağı'}: {source.fileName}</strong>
            {source.kind === 'csv' ? (
              <span>{source.distanceColumnHeader} → mesafe · {source.elevationColumnHeader} → yükseklik · {source.rowCount} satır</span>
            ) : source.kind === 'geojson' ? (
              <span>
                {source.coordinateCount} koordinat · WGS84 LineString · Z → yükseklik
                {source.appliedRouteCoordinates === true ? ' · deney koordinatlarına uygulandı' : ''}
              </span>
            ) : (
              <span>{source.sampleCount} rota örneği · {source.columnCount} × {source.rowCount} grid · {source.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</span>
            )}
""",
    'App DEM source strip'
)
replace_once(
    app_path,
    """          allowRouteDistanceImport={allowRouteDistanceImport}
          observerGroundElevationM={inputs.observerGroundElevationM}
""",
    """          allowRouteDistanceImport={allowRouteDistanceImport}
          allowDemImport={allowDemImport}
          observerLatitudeDeg={inputs.observerLatitudeDeg}
          observerLongitudeDeg={inputs.observerLongitudeDeg}
          targetLatitudeDeg={inputs.targetLatitudeDeg}
          targetLongitudeDeg={inputs.targetLongitudeDeg}
          observerGroundElevationM={inputs.observerGroundElevationM}
""",
    'App DEM editor route props'
)
replace_once(
    app_path,
    """    const source: TerrainProfileSource = isImportedGeoJsonTerrainProfile(profile)
      ? {
          ...commonSource,
          kind: 'geojson',
          geometryType: profile.geometryType,
          coordinateCount: profile.coordinateCount,
          startLongitudeDeg: profile.startLongitudeDeg,
          startLatitudeDeg: profile.startLatitudeDeg,
          endLongitudeDeg: profile.endLongitudeDeg,
          endLatitudeDeg: profile.endLatitudeDeg,
          elevationSource: profile.elevationSource
        }
      : {
          ...commonSource,
          kind: 'csv',
          delimiter: profile.delimiter,
          distanceUnit: profile.distanceUnit,
          rowCount: profile.rowCount,
          distanceColumnHeader: profile.distanceColumnHeader,
          elevationColumnHeader: profile.elevationColumnHeader
        };
""",
    """    const source: TerrainProfileSource = isImportedDemTerrainProfile(profile)
      ? {
          ...commonSource,
          kind: 'dem',
          format: profile.format,
          samplingMethod: profile.samplingMethod,
          geodesicMethod: profile.geodesicMethod,
          columnCount: profile.columnCount,
          rowCount: profile.rowCount,
          sampleCount: profile.sampleCount,
          sampleSpacingM: profile.sampleSpacingM,
          cellSizeDeg: profile.cellSizeDeg,
          noDataValue: profile.noDataValue,
          westBoundaryDeg: profile.westBoundaryDeg,
          eastBoundaryDeg: profile.eastBoundaryDeg,
          southBoundaryDeg: profile.southBoundaryDeg,
          northBoundaryDeg: profile.northBoundaryDeg
        }
      : isImportedGeoJsonTerrainProfile(profile)
        ? {
            ...commonSource,
            kind: 'geojson',
            geometryType: profile.geometryType,
            coordinateCount: profile.coordinateCount,
            startLongitudeDeg: profile.startLongitudeDeg,
            startLatitudeDeg: profile.startLatitudeDeg,
            endLongitudeDeg: profile.endLongitudeDeg,
            endLatitudeDeg: profile.endLatitudeDeg,
            elevationSource: profile.elevationSource
          }
        : {
            ...commonSource,
            kind: 'csv',
            delimiter: profile.delimiter,
            distanceUnit: profile.distanceUnit,
            rowCount: profile.rowCount,
            distanceColumnHeader: profile.distanceColumnHeader,
            elevationColumnHeader: profile.elevationColumnHeader
          };
""",
    'App DEM source construction'
)
replace_once(
    app_path,
    """            allowRouteDistanceImport={inputs.distanceSource === 'manual'}
            onDatumChange=""",
    """            allowRouteDistanceImport={inputs.distanceSource === 'manual'}
            allowDemImport={inputs.distanceSource === 'coordinates'}
            onDatumChange=""",
    'App TerrainPanel DEM availability'
)

# Portable schema v7 and DEM provenance parser.
portable_path = 'src/shared/portable.ts'
portable = read(portable_path)
portable = portable.replace('PORTABLE_EXPERIMENT_SCHEMA_VERSION = 6', 'PORTABLE_EXPERIMENT_SCHEMA_VERSION = 7')
portable = portable.replace('LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 6', 'LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION = 7')
portable = portable.replace('PortableExperimentFileV6', 'PortableExperimentFileV7')
portable = portable.replace('LocalExperimentStoreV6', 'LocalExperimentStoreV7')
old_dem_marker = """  return null;
}

function parseSimulatorInputs"""
dem_parser = """  if (value.kind === 'dem') {
    const noDataValid = value.noDataValue === null || isFiniteNumber(value.noDataValue);
    if (value.format !== 'esri-ascii' ||
      (value.samplingMethod !== 'nearest' && value.samplingMethod !== 'bilinear') ||
      (value.geodesicMethod !== 'vincenty' && value.geodesicMethod !== 'spherical-fallback') ||
      !Number.isInteger(value.columnCount) || !inRange(value.columnCount, 1, 10_000) ||
      !Number.isInteger(value.rowCount) || !inRange(value.rowCount, 1, 10_000) ||
      (value.columnCount as number) * (value.rowCount as number) > 4_000_000 ||
      !Number.isInteger(value.sampleCount) || !inRange(value.sampleCount, 3, 2_002) ||
      !isFiniteNumber(value.sampleSpacingM) || value.sampleSpacingM <= 0 ||
      !isFiniteNumber(value.cellSizeDeg) || value.cellSizeDeg <= 0 || value.cellSizeDeg > 180 ||
      !noDataValid ||
      !inRange(value.westBoundaryDeg, -180, 180) ||
      !inRange(value.eastBoundaryDeg, -180, 180) ||
      !inRange(value.southBoundaryDeg, -90, 90) ||
      !inRange(value.northBoundaryDeg, -90, 90) ||
      value.westBoundaryDeg >= value.eastBoundaryDeg ||
      value.southBoundaryDeg >= value.northBoundaryDeg ||
      !isFiniteNumber(value.sourceDistanceM) || value.sourceDistanceM <= 0) {
      return null;
    }
    return {
      ...common,
      kind: 'dem',
      sourceDistanceM: value.sourceDistanceM,
      format: 'esri-ascii',
      samplingMethod: value.samplingMethod,
      geodesicMethod: value.geodesicMethod,
      columnCount: value.columnCount as number,
      rowCount: value.rowCount as number,
      sampleCount: value.sampleCount as number,
      sampleSpacingM: value.sampleSpacingM,
      cellSizeDeg: value.cellSizeDeg,
      noDataValue: value.noDataValue as number | null,
      westBoundaryDeg: value.westBoundaryDeg,
      eastBoundaryDeg: value.eastBoundaryDeg,
      southBoundaryDeg: value.southBoundaryDeg,
      northBoundaryDeg: value.northBoundaryDeg
    };
  }

  return null;
}

function parseSimulatorInputs"""
if portable.count(old_dem_marker) != 1:
    raise RuntimeError(f'portable DEM parser marker: expected one match, found {portable.count(old_dem_marker)}')
portable = portable.replace(old_dem_marker, dem_parser, 1)
old_portable_versions = """  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
"""
new_portable_versions = """  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== 6 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
"""
if portable.count(old_portable_versions) != 1:
    raise RuntimeError('portable version condition was not found exactly once')
portable = portable.replace(old_portable_versions, new_portable_versions, 1)
old_local_versions = """  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {
"""
new_local_versions = """  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== 6 && version !== LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION) {
"""
if portable.count(old_local_versions) != 1:
    raise RuntimeError('local version condition was not found exactly once')
portable = portable.replace(old_local_versions, new_local_versions, 1)
write(portable_path, portable)

# Portable tests.
portable_test_path = 'tests/portable.test.ts'
replace_once(
    portable_test_path,
    'expect(parsed.sourceVersion).toBe(6);',
    'expect(parsed.sourceVersion).toBe(7);',
    'current portable source version assertion'
)
replace_once(
    portable_test_path,
    """  it('migrates a version 5 CSV source and defaults route application metadata', () => {
""",
    """  it('round-trips ESRI ASCII DEM terrain provenance', () => {
    const demSource = {
      kind: 'dem' as const,
      fileName: 'istanbul.asc',
      importedAtIso: '2026-08-06T15:00:00.000Z',
      sourceDistanceM: 22_500,
      observerEndpointElevationM: 12,
      targetEndpointElevationM: 18,
      appliedObserverEndpoint: true,
      appliedTargetEndpoint: true,
      appliedRouteDistance: false,
      appliedRouteCoordinates: false,
      modifiedAfterImport: false,
      format: 'esri-ascii' as const,
      samplingMethod: 'bilinear' as const,
      geodesicMethod: 'vincenty' as const,
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
    };
    const file = createPortableExperimentFile({
      ...savedExperimentFixture,
      terrainProfileSource: demSource
    }, '1.0.0');
    const parsed = parsePortableExperimentFile(file);

    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.terrainProfileSource).toEqual(demSource);
  });

  it('migrates a version 6 experiment into schema v7', () => {
    const parsed = parsePortableExperimentFile({
      schema: PORTABLE_EXPERIMENT_SCHEMA,
      schemaVersion: 6,
      exportedAtIso: '2026-08-06T15:00:00.000Z',
      application: { name: 'Geometrik Gözlem Laboratuvarı', version: '0.9.3' },
      experiment: savedExperimentFixture
    });

    expect(parsed.migrated).toBe(true);
    expect(parsed.sourceVersion).toBe(6);
    expect(parsed.experiment.terrainProfileSource?.kind).toBe('csv');
  });

  it('migrates a version 5 CSV source and defaults route application metadata', () => {
""",
    'portable DEM provenance tests'
)

# Report tests and schema label.
replace_once(
    'tests/report.test.ts',
    "expect(html).toContain('Taşınabilir deney şeması v6');",
    "expect(html).toContain('Taşınabilir deney şeması v7');",
    'report schema version expectation'
)
replace_once(
    'tests/report.test.ts',
    """it('uses manual distance to convert every route percentage', () => {
""",
    """it('includes ESRI ASCII DEM sampling provenance', () => {
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
""",
    'report DEM provenance test'
)

# Example DEM.
write('examples/dem-route-wgs84.asc', """ncols 10
nrows 10
xllcenter 28.900000
yllcenter 40.900000
cellsize 0.030000
NODATA_value -9999
42 44 46 48 50 52 54 56 58 60
38 40 42 44 46 48 50 52 54 56
34 36 38 40 42 44 46 48 50 52
30 32 34 36 38 40 42 44 46 48
26 28 30 32 34 36 38 40 42 44
22 24 26 28 30 32 34 36 38 40
18 20 22 24 26 28 30 32 34 36
14 16 18 20 22 24 26 28 30 32
10 12 14 16 18 20 22 24 26 28
6 8 10 12 14 16 18 20 22 24
""")

# Version and docs.
replace_once('package.json', '"version": "0.9.3"', '"version": "1.0.0"', 'package version 1.0')
replace_once('src/preload/index.ts', "version: '0.9.3'", "version: '1.0.0'", 'preload version 1.0')
replace_once(
    'docs/esri-ascii-dem.md',
    """Bu aşama yalnız ayrıştırma ve örnekleme çekirdeğidir. Sonraki aşamada Electron
dosya seçimi, rota boyunca jeodezik örnek noktaları ve arazi profiline dönüşüm
bu modülün üzerine bağlanacaktır.
""",
    """## Rota profili oluşturma

DEM içe aktarma yalnız koordinat mesafe modunda kullanılabilir. Uygulama,
gözlemci ve hedef arasında WGS84 ters jeodezik çözümü kurar; rota üzerindeki ara
koordinatları Vincenty doğrudan çözümüyle üretir ve grid'i varsayılan olarak iki
doğrusal yöntemle örnekler.

Örnek sayısı grid hücre boyutuna göre otomatik belirlenir ve 3…2.002 aralığında
sınırlandırılır. Rota kapsam dışına çıkarsa veya bir örnek NODATA hücresine denk
gelirse profil bütünüyle reddedilir; eksik kısımlar sıfır yükseklikle doldurulmaz.

Dosya içeriği renderer sürecine gönderilmez. Ana süreç yalnız oluşturulan arazi
noktalarını, grid çözünürlüğünü, kapsamı, örnekleme yöntemini ve kaynak dosya
adını aktarır. Kaynak bilgileri deney kaydında ve HTML raporunda korunur.

Örnek dosya: `examples/dem-route-wgs84.asc`.
""",
    'DEM route flow documentation'
)
replace_once(
    'README.md',
    """- [`docs/esri-ascii-dem.md`](docs/esri-ascii-dem.md)
""",
    """- [`docs/esri-ascii-dem.md`](docs/esri-ascii-dem.md)

Koordinat modunda ESRI ASCII Grid DEM dosyaları gözlemci-hedef rotası boyunca
WGS84 ara koordinatlarında örneklenerek arazi profiline dönüştürülebilir.
""",
    'README DEM route summary'
)
replace_once(
    'docs/roadmap.md',
    """## Sonraki gerçek arazi işleri
- Sayısal yükseklik modeli dosya akışı
""",
    """## Aşama 3.11 — ESRI ASCII DEM rota profili

Durum: tamamlandı

- Electron ana sürecinde 64 MB sınırla güvenli DEM dosya seçimi
- Koordinat modundaki gözlemci-hedef rotasının WGS84 ters çözümü
- Rota ara koordinatlarının Vincenty doğrudan çözümüyle üretilmesi
- Grid çözünürlüğüne göre otomatik 3…2.002 örnek
- Varsayılan iki doğrusal yükseklik örnekleme
- Kapsam dışı veya NODATA örneğinde profil bütününün reddedilmesi
- DEM uç yüksekliklerini bağımsız uygulama seçenekleri
- Grid, örnekleme ve çözünürlük provenansının kayıt ve raporda korunması
- Taşınabilir ve yerel kayıt şeması v7
- Örnek ESRI ASCII grid dosyası
- Uygulama sürümü `1.0.0`

## Sonraki gerçek arazi işleri
""",
    'roadmap DEM route stage'
)
