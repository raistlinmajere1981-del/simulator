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


write('src/simulation/dem-import-options.ts', """export type DemSampleCountMode = 'automatic' | 'manual';

export const MIN_DEM_SAMPLE_COUNT = 3;
export const MAX_DEM_SAMPLE_COUNT = 2_002;

export function requestedDemSampleCount(
  mode: DemSampleCountMode,
  value: number
): number | undefined {
  if (mode === 'automatic') return undefined;
  if (!Number.isInteger(value) || value < MIN_DEM_SAMPLE_COUNT ||
    value > MAX_DEM_SAMPLE_COUNT) {
    throw new RangeError(
      `Manuel DEM örnek sayısı ${MIN_DEM_SAMPLE_COUNT}…${MAX_DEM_SAMPLE_COUNT} aralığında bir tam sayı olmalı.`
    );
  }
  return value;
}
""")

write('tests/dem-import-options.test.ts', """import { describe, expect, it } from 'vitest';
import {
  requestedDemSampleCount
} from '../src/simulation/dem-import-options';

describe('DEM import options', () => {
  it('omits sample count in automatic mode', () => {
    expect(requestedDemSampleCount('automatic', 101)).toBeUndefined();
  });

  it('returns a validated manual sample count', () => {
    expect(requestedDemSampleCount('manual', 101)).toBe(101);
    expect(requestedDemSampleCount('manual', 3)).toBe(3);
    expect(requestedDemSampleCount('manual', 2_002)).toBe(2_002);
  });

  it('rejects non-integer and out-of-range manual counts', () => {
    expect(() => requestedDemSampleCount('manual', 2)).toThrow('3…2002');
    expect(() => requestedDemSampleCount('manual', 2_003)).toThrow('3…2002');
    expect(() => requestedDemSampleCount('manual', 10.5)).toThrow('tam sayı');
  });
});
""")

# Shared contracts and provenance.
replace_once(
    'src/shared/simulator.ts',
    """export type DemTerrainSamplingMethod = 'nearest' | 'bilinear';
""",
    """export type DemTerrainSamplingMethod = 'nearest' | 'bilinear';
export type DemTerrainSampleCountMode = 'automatic' | 'manual';
""",
    'DEM sample count mode type'
)
replace_once(
    'src/shared/simulator.ts',
    """  sampleCount: number;
  sampleSpacingM: number;
""",
    """  sampleCount: number;
  sampleCountMode?: DemTerrainSampleCountMode;
  sampleSpacingM: number;
""",
    'DEM source sample mode'
)
# There are two sampleCount blocks; add required mode to imported profile separately.
simulator = read('src/shared/simulator.ts')
imported_marker = """export interface ImportedDemTerrainProfile {
  kind: 'dem';
  fileName: string;
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleSpacingM: number;
"""
imported_replacement = """export interface ImportedDemTerrainProfile {
  kind: 'dem';
  fileName: string;
  format: 'esri-ascii';
  samplingMethod: DemTerrainSamplingMethod;
  geodesicMethod: SavedGeodesicMethod;
  columnCount: number;
  rowCount: number;
  sampleCount: number;
  sampleCountMode: DemTerrainSampleCountMode;
  sampleSpacingM: number;
"""
if simulator.count(imported_marker) != 1:
    raise RuntimeError(f'imported DEM sample mode: expected one match, found {simulator.count(imported_marker)}')
write('src/shared/simulator.ts', simulator.replace(imported_marker, imported_replacement, 1))

# Profile engine records whether count was automatic or manual.
replace_once(
    'src/simulation/dem-route-profile.ts',
    """    sampleCount,
    sampleSpacingM: path.totalDistanceM / (sampleCount - 1),
""",
    """    sampleCount,
    sampleCountMode: requestedSampleCount === undefined ? 'automatic' : 'manual',
    sampleSpacingM: path.totalDistanceM / (sampleCount - 1),
""",
    'DEM result sample mode'
)

# Renderer controls.
editor_path = 'src/renderer/src/MultiPointTerrainEditor.tsx'
replace_once(
    editor_path,
    """  CsvTerrainDistanceUnit,
  ImportedDemTerrainProfile,
""",
    """  CsvTerrainDistanceUnit,
  DemTerrainSamplingMethod,
  ImportedDemTerrainProfile,
""",
    'editor DEM sampling type import'
)
replace_once(
    editor_path,
    """import {
  getTerrainPointDragBounds,
  terrainPointFromDragDelta
} from '../../simulation/terrain-profile-drag';
""",
    """import {
  getTerrainPointDragBounds,
  terrainPointFromDragDelta
} from '../../simulation/terrain-profile-drag';
import {
  requestedDemSampleCount,
  type DemSampleCountMode
} from '../../simulation/dem-import-options';
""",
    'editor DEM option helper import'
)
replace_once(
    editor_path,
    """  const [applyRouteCoordinates, setApplyRouteCoordinates] = useState(false);
  const [importMessage, setImportMessage] = useState('');
""",
    """  const [applyRouteCoordinates, setApplyRouteCoordinates] = useState(false);
  const [demSamplingMethod, setDemSamplingMethod] = useState<DemTerrainSamplingMethod>('bilinear');
  const [demSampleCountMode, setDemSampleCountMode] = useState<DemSampleCountMode>('automatic');
  const [demManualSampleCount, setDemManualSampleCount] = useState(101);
  const [importMessage, setImportMessage] = useState('');
""",
    'editor DEM option state'
)
replace_once(
    editor_path,
    """    setOperationError('');
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
""",
    """    setOperationError('');
    setImportMessage('');
    let sampleCount: number | undefined;
    try {
      sampleCount = requestedDemSampleCount(demSampleCountMode, demManualSampleCount);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : 'DEM örnek sayısı geçersiz.'
      );
      return;
    }
    setIsImporting(true);
    try {
      const result = await window.simulatorDesktop.importDemTerrainProfile({
        observerLatitudeDeg,
        observerLongitudeDeg,
        targetLatitudeDeg,
        targetLongitudeDeg,
        samplingMethod: demSamplingMethod,
        ...(sampleCount === undefined ? {} : { sampleCount })
      });
""",
    'editor DEM request options'
)
replace_once(
    editor_path,
    """      </header>

      {mappingRequest && (
""",
    """      </header>

      {allowDemImport && (
        <div className="terrain-mapping-controls terrain-dem-controls">
          <label title="DEM hücrelerinden rota yüksekliği üretme yöntemi">
            <span>DEM örnekleme yöntemi</span>
            <select
              value={demSamplingMethod}
              onChange={(event) => setDemSamplingMethod(
                event.currentTarget.value as DemTerrainSamplingMethod
              )}
            >
              <option value="bilinear">İki doğrusal</option>
              <option value="nearest">En yakın hücre</option>
            </select>
          </label>
          <label title="Otomatik mod grid çözünürlüğüne göre örnek sayısını belirler">
            <span>Rota örnek sayısı</span>
            <select
              value={demSampleCountMode}
              onChange={(event) => setDemSampleCountMode(
                event.currentTarget.value as DemSampleCountMode
              )}
            >
              <option value="automatic">Grid çözünürlüğüne göre otomatik</option>
              <option value="manual">Manuel sayı</option>
            </select>
          </label>
          {demSampleCountMode === 'manual' && (
            <label title="Başlangıç ve bitiş dahil 3…2002 rota örneği">
              <span>Manuel örnek sayısı</span>
              <input
                max={2_002}
                min={3}
                step={1}
                type="number"
                value={demManualSampleCount}
                onChange={(event) => setDemManualSampleCount(Number(event.currentTarget.value))}
              />
            </label>
          )}
        </div>
      )}

      {mappingRequest && (
""",
    'editor DEM controls block'
)
replace_once(
    editor_path,
    """              <span>Örnekleme: <b>{pendingImport.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</b></span>
              <span>Örnek aralığı: <b>{numberFormatter.format(pendingImport.sampleSpacingM)} m</b></span>
""",
    """              <span>Örnekleme: <b>{pendingImport.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</b></span>
              <span>Örnek sayısı modu: <b>{pendingImport.sampleCountMode === 'manual' ? 'manuel' : 'grid çözünürlüğüne göre otomatik'}</b></span>
              <span>Örnek aralığı: <b>{numberFormatter.format(pendingImport.sampleSpacingM)} m</b></span>
""",
    'editor pending DEM sample mode'
)

# App provenance strip and source creation.
replace_once(
    'src/renderer/src/AppNext.tsx',
    """              <span>{source.sampleCount} rota örneği · {source.columnCount} × {source.rowCount} grid · {source.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</span>
""",
    """              <span>{source.sampleCount} rota örneği ({source.sampleCountMode === 'manual' ? 'manuel' : 'otomatik'}) · {source.columnCount} × {source.rowCount} grid · {source.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</span>
""",
    'App DEM source mode strip'
)
replace_once(
    'src/renderer/src/AppNext.tsx',
    """          sampleCount: profile.sampleCount,
          sampleSpacingM: profile.sampleSpacingM,
""",
    """          sampleCount: profile.sampleCount,
          sampleCountMode: profile.sampleCountMode,
          sampleSpacingM: profile.sampleSpacingM,
""",
    'App DEM source mode construction'
)

# Portable parser accepts missing field in older v7 records.
replace_once(
    'src/shared/portable.ts',
    """      !Number.isInteger(value.sampleCount) || !inRange(value.sampleCount, 3, 2_002) ||
      !isFiniteNumber(value.sampleSpacingM) || value.sampleSpacingM <= 0 ||
""",
    """      !Number.isInteger(value.sampleCount) || !inRange(value.sampleCount, 3, 2_002) ||
      (value.sampleCountMode !== undefined &&
        value.sampleCountMode !== 'automatic' && value.sampleCountMode !== 'manual') ||
      !isFiniteNumber(value.sampleSpacingM) || value.sampleSpacingM <= 0 ||
""",
    'portable DEM sample mode validation'
)
replace_once(
    'src/shared/portable.ts',
    """      sampleCount: value.sampleCount as number,
      sampleSpacingM: value.sampleSpacingM,
""",
    """      sampleCount: value.sampleCount as number,
      ...(value.sampleCountMode === 'automatic' || value.sampleCountMode === 'manual'
        ? { sampleCountMode: value.sampleCountMode }
        : {}),
      sampleSpacingM: value.sampleSpacingM,
""",
    'portable DEM sample mode parsing'
)

# Report provenance.
replace_once(
    'src/report/html-report.ts',
    """    <tr><td>Rota örneği</td><td>${source.sampleCount} nokta · ${inputNumberFormatter.format(source.sampleSpacingM)} m aralık</td></tr>
    <tr><td>Örnekleme</td><td>${source.samplingMethod === 'bilinear' ? 'İki doğrusal' : 'En yakın hücre'}</td></tr>
""",
    """    <tr><td>Rota örneği</td><td>${source.sampleCount} nokta · ${inputNumberFormatter.format(source.sampleSpacingM)} m aralık</td></tr>
    <tr><td>Örnek sayısı modu</td><td>${source.sampleCountMode === 'manual' ? 'Manuel' : 'Grid çözünürlüğüne göre otomatik'}</td></tr>
    <tr><td>Örnekleme</td><td>${source.samplingMethod === 'bilinear' ? 'İki doğrusal' : 'En yakın hücre'}</td></tr>
""",
    'report DEM sample mode'
)

# Tests.
replace_once(
    'tests/dem-route-profile.test.ts',
    """    expect(profile.sampleCount).toBe(5);
    expect(profile.points).toHaveLength(3);
""",
    """    expect(profile.sampleCount).toBe(5);
    expect(profile.sampleCountMode).toBe('manual');
    expect(profile.points).toHaveLength(3);
""",
    'manual DEM sample mode test'
)
replace_once(
    'tests/dem-route-profile.test.ts',
    """    expect(profile.sampleCount).toBeGreaterThanOrEqual(3);
    expect(profile.sampleCount).toBeLessThanOrEqual(2_002);
""",
    """    expect(profile.sampleCount).toBeGreaterThanOrEqual(3);
    expect(profile.sampleCount).toBeLessThanOrEqual(2_002);
    expect(profile.sampleCountMode).toBe('automatic');
""",
    'automatic DEM sample mode test'
)
replace_once(
    'tests/portable.test.ts',
    """      sampleCount: 101,
      sampleSpacingM: 225,
""",
    """      sampleCount: 101,
      sampleCountMode: 'manual' as const,
      sampleSpacingM: 225,
""",
    'portable DEM sample mode fixture'
)
replace_once(
    'tests/report.test.ts',
    """      sampleCount: 101,
      sampleSpacingM: 225,
""",
    """      sampleCount: 101,
      sampleCountMode: 'manual',
      sampleSpacingM: 225,
""",
    'report DEM sample mode fixture'
)
replace_once(
    'tests/report.test.ts',
    """  expect(html).toContain('101 nokta');
  expect(html).toContain('İki doğrusal');
""",
    """  expect(html).toContain('101 nokta');
  expect(html).toContain('Örnek sayısı modu');
  expect(html).toContain('Manuel');
  expect(html).toContain('İki doğrusal');
""",
    'report DEM sample mode assertions'
)

# Version and docs.
replace_once('package.json', '"version": "1.0.0"', '"version": "1.0.1"', 'package version')
replace_once('src/preload/index.ts', "version: '1.0.0'", "version: '1.0.1'", 'preload version')
replace_once(
    'docs/esri-ascii-dem.md',
    """Örnek sayısı grid hücre boyutuna göre otomatik belirlenir ve 3…2.002 aralığında
sınırlandırılır. Rota kapsam dışına çıkarsa veya bir örnek NODATA hücresine denk
gelirse profil bütünüyle reddedilir; eksik kısımlar sıfır yükseklikle doldurulmaz.
""",
    """Örnek sayısı varsayılan olarak grid hücre boyutuna göre otomatik belirlenir ve
3…2.002 aralığında sınırlandırılır. Kullanıcı gerektiğinde bu aralıkta kesin bir
örnek sayısı seçebilir. Örnekleme yöntemi iki doğrusal veya en yakın hücre olarak
belirlenebilir; yöntem ve örnek sayısının otomatik/manüel oluşu kaynak kaydında
korunur. Rota kapsam dışına çıkarsa veya bir örnek NODATA hücresine denk gelirse
profil bütünüyle reddedilir; eksik kısımlar sıfır yükseklikle doldurulmaz.
""",
    'DEM control documentation'
)
replace_once(
    'docs/roadmap.md',
    """## Sonraki gerçek arazi işleri
""",
    """## Aşama 3.12 — DEM örnekleme denetimleri

Durum: tamamlandı

- İki doğrusal ve en yakın hücre yöntemleri arasında seçim
- Grid çözünürlüğüne göre otomatik örnek sayısı
- 3…2.002 aralığında manuel örnek sayısı
- Geçersiz manuel sayının dosya seçilmeden reddedilmesi
- Otomatik/manüel örnek sayısı modunun kayıt ve raporda korunması
- Saf seçenek doğrulama testleri
- Uygulama sürümü `1.0.1`

## Sonraki gerçek arazi işleri
""",
    'roadmap DEM controls stage'
)
