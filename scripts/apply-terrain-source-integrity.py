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


write('src/main/terrain-source-integrity.ts', """import { createHash } from 'node:crypto';
import type { TerrainSourceIntegrity } from '../shared/simulator';

export function calculateTerrainSourceIntegrity(
  bytes: Uint8Array
): TerrainSourceIntegrity {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('Kaynak dosya özeti için bayt dizisi gerekli.');
  }
  return {
    fileSizeBytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
}

export function attachTerrainSourceIntegrity<T extends object>(
  profile: T,
  integrity: TerrainSourceIntegrity
): T & TerrainSourceIntegrity {
  return { ...profile, ...integrity };
}
""")

write('tests/terrain-source-integrity.test.ts', """import { describe, expect, it } from 'vitest';
import {
  attachTerrainSourceIntegrity,
  calculateTerrainSourceIntegrity
} from '../src/main/terrain-source-integrity';

describe('terrain source integrity', () => {
  it('calculates exact byte size and the standard SHA-256 digest', () => {
    const integrity = calculateTerrainSourceIntegrity(
      new TextEncoder().encode('abc')
    );

    expect(integrity.fileSizeBytes).toBe(3);
    expect(integrity.sha256)
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('attaches integrity without mutating the parser result', () => {
    const profile = { fileName: 'route.csv', rowCount: 3 };
    const attached = attachTerrainSourceIntegrity(profile, {
      fileSizeBytes: 128,
      sha256: 'a'.repeat(64)
    });

    expect(attached).toEqual({
      fileName: 'route.csv',
      rowCount: 3,
      fileSizeBytes: 128,
      sha256: 'a'.repeat(64)
    });
    expect(profile).toEqual({ fileName: 'route.csv', rowCount: 3 });
  });
});
""")

# Shared integrity contracts.
replace_once(
    'src/shared/simulator.ts',
    """export interface TerrainProfileMappingRequest {
""",
    """export interface TerrainSourceIntegrity {
  fileSizeBytes: number;
  sha256: string;
}

export interface TerrainProfileMappingRequest {
""",
    'integrity contract'
)
replace_once(
    'src/shared/simulator.ts',
    """  appliedRouteCoordinates?: boolean;
  modifiedAfterImport: boolean;
""",
    """  appliedRouteCoordinates?: boolean;
  fileSizeBytes?: number;
  sha256?: string;
  modifiedAfterImport: boolean;
""",
    'stored source integrity fields'
)
replace_once(
    'src/shared/simulator.ts',
    """export interface ImportedTerrainProfile {
  fileName: string;
""",
    """export interface ImportedTerrainProfile {
  fileName: string;
  fileSizeBytes?: number;
  sha256?: string;
""",
    'CSV import integrity fields'
)
replace_once(
    'src/shared/simulator.ts',
    """export interface ImportedGeoJsonTerrainProfile {
  kind: 'geojson';
  fileName: string;
""",
    """export interface ImportedGeoJsonTerrainProfile {
  kind: 'geojson';
  fileName: string;
  fileSizeBytes?: number;
  sha256?: string;
""",
    'GeoJSON import integrity fields'
)
replace_once(
    'src/shared/simulator.ts',
    """export interface ImportedDemTerrainProfile {
  kind: 'dem';
  fileName: string;
""",
    """export interface ImportedDemTerrainProfile {
  kind: 'dem';
  fileName: string;
  fileSizeBytes?: number;
  sha256?: string;
""",
    'DEM import integrity fields'
)

# Main process hashes raw bytes and preserves integrity in mapping cache.
replace_once(
    'src/main/index.ts',
    """import { randomUUID } from 'node:crypto';
""",
    """import { randomUUID } from 'node:crypto';
""",
    'stable crypto import marker'
)
replace_once(
    'src/main/index.ts',
    """  TerrainProfileImportContext
} from '../shared/simulator';
""",
    """  TerrainProfileImportContext,
  TerrainSourceIntegrity
} from '../shared/simulator';
""",
    'main integrity type import'
)
replace_once(
    'src/main/index.ts',
    """import { parseEsriAsciiGrid } from '../simulation/esri-ascii-grid';
""",
    """import { parseEsriAsciiGrid } from '../simulation/esri-ascii-grid';
import {
  attachTerrainSourceIntegrity,
  calculateTerrainSourceIntegrity
} from './terrain-source-integrity';
""",
    'main integrity helper import'
)
replace_once(
    'src/main/index.ts',
    """interface PendingTerrainImport {
  content: string;
  fileName: string;
  createdAtMs: number;
}
""",
    """interface PendingTerrainImport {
  content: string;
  fileName: string;
  integrity: TerrainSourceIntegrity;
  createdAtMs: number;
}
""",
    'pending mapping integrity'
)
replace_once(
    'src/main/index.ts',
    """  fileName: string,
  filePath?: string
): ImportTerrainProfileResult {
""",
    """  fileName: string,
  integrity: TerrainSourceIntegrity,
  filePath?: string
): ImportTerrainProfileResult {
""",
    'mapping helper integrity argument'
)
replace_once(
    'src/main/index.ts',
    """    content,
    fileName,
    createdAtMs: Date.now()
""",
    """    content,
    fileName,
    integrity,
    createdAtMs: Date.now()
""",
    'mapping cache integrity value'
)

main = read('src/main/index.ts')
old_csv_read = """      const content = await fs.readFile(selectedPath, 'utf-8');
      try {
        const profile = parseTerrainProfileCsv(content, selectedPath, context);
        return {
          status: 'success',
          message: `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
          filePath: selectedPath,
          profile
        };
      } catch (error) {
        if (error instanceof TerrainProfileColumnMappingRequiredError) {
          return terrainMappingResult(error, content, selectedPath, selectedPath);
        }
"""
new_csv_read = """      const bytes = await fs.readFile(selectedPath);
      const content = bytes.toString('utf-8');
      const integrity = calculateTerrainSourceIntegrity(bytes);
      try {
        const profile = attachTerrainSourceIntegrity(
          parseTerrainProfileCsv(content, selectedPath, context),
          integrity
        );
        return {
          status: 'success',
          message: `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
          filePath: selectedPath,
          profile
        };
      } catch (error) {
        if (error instanceof TerrainProfileColumnMappingRequiredError) {
          return terrainMappingResult(
            error,
            content,
            selectedPath,
            integrity,
            selectedPath
          );
        }
"""
if main.count(old_csv_read) != 1:
    raise RuntimeError(f'CSV byte hashing block: expected one match, found {main.count(old_csv_read)}')
main = main.replace(old_csv_read, new_csv_read, 1)
old_mapped = """      const profile = parseTerrainProfileCsv(
        pending.content,
        pending.fileName,
        context,
        mapping
      );
"""
new_mapped = """      const profile = attachTerrainSourceIntegrity(
        parseTerrainProfileCsv(
          pending.content,
          pending.fileName,
          context,
          mapping
        ),
        pending.integrity
      );
"""
if main.count(old_mapped) != 1:
    raise RuntimeError(f'mapped CSV integrity block: expected one match, found {main.count(old_mapped)}')
main = main.replace(old_mapped, new_mapped, 1)
old_dem = """      const content = await fs.readFile(selectedPath, 'utf-8');
      const grid = parseEsriAsciiGrid(content, selectedPath);
      const profile = buildTerrainProfileFromDem(grid, context);
"""
new_dem = """      const bytes = await fs.readFile(selectedPath);
      const content = bytes.toString('utf-8');
      const grid = parseEsriAsciiGrid(content, selectedPath);
      const profile = attachTerrainSourceIntegrity(
        buildTerrainProfileFromDem(grid, context),
        calculateTerrainSourceIntegrity(bytes)
      );
"""
if main.count(old_dem) != 1:
    raise RuntimeError(f'DEM integrity block: expected one match, found {main.count(old_dem)}')
main = main.replace(old_dem, new_dem, 1)
old_geo = """      const content = await fs.readFile(selectedPath, 'utf-8');
      const profile = parseTerrainProfileGeoJson(content, selectedPath, context);
"""
new_geo = """      const bytes = await fs.readFile(selectedPath);
      const content = bytes.toString('utf-8');
      const profile = attachTerrainSourceIntegrity(
        parseTerrainProfileGeoJson(content, selectedPath, context),
        calculateTerrainSourceIntegrity(bytes)
      );
"""
if main.count(old_geo) != 1:
    raise RuntimeError(f'GeoJSON integrity block: expected one match, found {main.count(old_geo)}')
write('src/main/index.ts', main.replace(old_geo, new_geo, 1))

# Renderer persists and surfaces integrity.
replace_once(
    'src/renderer/src/AppNext.tsx',
    """      appliedRouteCoordinates,
      modifiedAfterImport: false
""",
    """      appliedRouteCoordinates,
      ...(profile.fileSizeBytes !== undefined && profile.sha256 !== undefined
        ? { fileSizeBytes: profile.fileSizeBytes, sha256: profile.sha256 }
        : {}),
      modifiedAfterImport: false
""",
    'App integrity source construction'
)
replace_once(
    'src/renderer/src/AppNext.tsx',
    """          <span>{source.modifiedAfterImport ? 'İÇE AKTARIMDAN SONRA DÜZENLENDİ' : 'KAYNAKLA EŞLEŞİYOR'}</span>
""",
    """          <span>
            {source.sha256 ? `SHA-256 ${source.sha256.slice(0, 12)}… · ` : ''}
            {source.modifiedAfterImport ? 'İÇE AKTARIMDAN SONRA DÜZENLENDİ' : 'KAYNAKLA EŞLEŞİYOR'}
          </span>
""",
    'App source hash strip'
)

# Portable parser accepts old sources and validates all-or-none integrity.
replace_once(
    'src/shared/portable.ts',
    """  if (value.sourceDistanceM !== null &&
""",
    """  const hasIntegrity = value.fileSizeBytes !== undefined || value.sha256 !== undefined;
  const integrityValid = !hasIntegrity || (
    Number.isInteger(value.fileSizeBytes) &&
    inRange(value.fileSizeBytes, 1, 64 * 1024 * 1024) &&
    typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256)
  );
  if (!integrityValid) return null;

  if (value.sourceDistanceM !== null &&
""",
    'portable integrity validation'
)
replace_once(
    'src/shared/portable.ts',
    """    ...(typeof value.appliedRouteCoordinates === 'boolean'
      ? { appliedRouteCoordinates: value.appliedRouteCoordinates }
      : {}),
    modifiedAfterImport: value.modifiedAfterImport
""",
    """    ...(typeof value.appliedRouteCoordinates === 'boolean'
      ? { appliedRouteCoordinates: value.appliedRouteCoordinates }
      : {}),
    ...(hasIntegrity ? {
      fileSizeBytes: value.fileSizeBytes as number,
      sha256: value.sha256 as string
    } : {}),
    modifiedAfterImport: value.modifiedAfterImport
""",
    'portable integrity parsing'
)

# Report full provenance.
replace_once(
    'src/report/html-report.ts',
    """  const commonRows = `
    <tr><td>Dosya adı</td><td>${escapeHtml(source.fileName)}</td></tr>
    <tr><td>İçe aktarma zamanı</td><td>${formatDate(source.importedAtIso)}</td></tr>
""",
    """  const integrityRows = source.fileSizeBytes !== undefined && source.sha256 !== undefined
    ? `
    <tr><td>Kaynak dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
    <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>`
    : '<tr><td>Dosya bütünlüğü</td><td>Bu eski kayıtta boyut ve SHA-256 özeti bulunmuyor.</td></tr>';
  const commonRows = `
    <tr><td>Dosya adı</td><td>${escapeHtml(source.fileName)}</td></tr>
    <tr><td>İçe aktarma zamanı</td><td>${formatDate(source.importedAtIso)}</td></tr>
    ${integrityRows}
""",
    'report integrity rows'
)

# Fixtures and compatibility.
known_hash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
replace_once(
    'tests/portable.test.ts',
    """    appliedRouteCoordinates: false,
    modifiedAfterImport: false
""",
    f"""    appliedRouteCoordinates: false,
    fileSizeBytes: 128,
    sha256: '{known_hash}',
    modifiedAfterImport: false
""",
    'CSV fixture integrity'
)
replace_once(
    'tests/portable.test.ts',
    """    appliedRouteCoordinates: true,
    modifiedAfterImport: false,
""",
    """    appliedRouteCoordinates: true,
    fileSizeBytes: 256,
    sha256: 'b'.repeat(64),
    modifiedAfterImport: false,
""",
    'GeoJSON fixture integrity'
)
replace_once(
    'tests/portable.test.ts',
    """      appliedRouteCoordinates: false,
      modifiedAfterImport: false,
""",
    """      appliedRouteCoordinates: false,
      fileSizeBytes: 1_024,
      sha256: 'c'.repeat(64),
      modifiedAfterImport: false,
""",
    'DEM fixture integrity'
)
replace_once(
    'tests/portable.test.ts',
    """    delete legacySource.appliedRouteCoordinates;
""",
    """    delete legacySource.appliedRouteCoordinates;
    delete legacySource.fileSizeBytes;
    delete legacySource.sha256;
""",
    'legacy source integrity removal'
)
replace_once(
    'tests/portable.test.ts',
    """    expect(parsed.experiment.terrainProfileSource?.appliedRouteCoordinates).toBeUndefined();
""",
    """    expect(parsed.experiment.terrainProfileSource?.appliedRouteCoordinates).toBeUndefined();
    expect(parsed.experiment.terrainProfileSource?.sha256).toBeUndefined();
""",
    'legacy integrity assertion'
)

replace_once(
    'tests/report.test.ts',
    """    expect(html).toContain('terrain-profile.csv');
""",
    f"""    expect(html).toContain('terrain-profile.csv');
    expect(html).toContain('Kaynak dosya boyutu');
    expect(html).toContain('128 bayt');
    expect(html).toContain('SHA-256');
    expect(html).toContain('{known_hash}');
""",
    'CSV report integrity assertions'
)
replace_once(
    'tests/report.test.ts',
    """      appliedRouteCoordinates: true,
      modifiedAfterImport: false,
""",
    """      appliedRouteCoordinates: true,
      fileSizeBytes: 256,
      sha256: 'b'.repeat(64),
      modifiedAfterImport: false,
""",
    'GeoJSON report integrity fixture'
)
replace_once(
    'tests/report.test.ts',
    """      appliedRouteCoordinates: false,
      modifiedAfterImport: false,
""",
    """      appliedRouteCoordinates: false,
      fileSizeBytes: 1_024,
      sha256: 'c'.repeat(64),
      modifiedAfterImport: false,
""",
    'DEM report integrity fixture'
)
replace_once(
    'tests/dem-source-compatibility.test.ts',
    """    expect(source?.kind === 'dem' ? source.sampleCountMode : 'unexpected-source')
      .toBeUndefined();
""",
    """    expect(source?.kind === 'dem' ? source.sampleCountMode : 'unexpected-source')
      .toBeUndefined();
    expect(source?.sha256).toBeUndefined();
""",
    'old v7 integrity compatibility assertion'
)

# Version and documentation.
replace_once('package.json', '"version": "1.0.2"', '"version": "1.0.3"', 'package version')
replace_once('src/preload/index.ts', "version: '1.0.2'", "version: '1.0.3'", 'preload version')
write('docs/terrain-source-integrity.md', """# Arazi kaynak dosyası bütünlüğü

CSV, GeoJSON ve ESRI ASCII DEM içe aktarmalarında uygulama kaynak dosyanın ham
baytlarını ana süreçte okur. Dosyanın tam bayt uzunluğu ve SHA-256 özeti hesaplanır.
Ham dosya içeriği renderer sürecine aktarılmaz.

CSV sütunlarının kullanıcı tarafından eşlenmesi gerektiğinde boyut ve özet, süreli
ana süreç önbelleğinde dosya içeriğiyle birlikte korunur. Eşleme sonrasında oluşan
profil aynı kaynak özetiyle kaydedilir.

Boyut ve SHA-256 özeti:

- yerel deney kaydında,
- taşınabilir `.ggl.json` dosyasında,
- kaynak şeridinde kısa özet olarak,
- HTML raporunda tam değer olarak

saklanır. SHA-256 özeti dosyanın sonradan değiştirilip değiştirilmediğini karşılaştırmak
için kullanılabilir; dosyanın doğruluğunu, güvenilirliğini veya bilimsel kalitesini
tek başına kanıtlamaz.

Eski şema-v7 kayıtlarında bu alanlar bulunmayabilir. Boyut ve SHA-256 ya birlikte
bulunur ya da ikisi de bulunmaz; kısmi veya biçimi bozuk bütünlük bilgisi reddedilir.
""")
replace_once(
    'README.md',
    """- [`docs/esri-ascii-dem.md`](docs/esri-ascii-dem.md)
""",
    """- [`docs/esri-ascii-dem.md`](docs/esri-ascii-dem.md)
- [`docs/terrain-source-integrity.md`](docs/terrain-source-integrity.md)
""",
    'integrity documentation link'
)
replace_once(
    'docs/roadmap.md',
    """## Sonraki gerçek arazi işleri
""",
    """## Aşama 3.14 — Arazi kaynak dosyası bütünlüğü

Durum: tamamlandı

- CSV, GeoJSON ve DEM ham dosya baytlarından SHA-256 özeti
- Tam kaynak dosya boyutunun bayt olarak kaydı
- CSV sütun eşleme önbelleğinde bütünlük bilgisinin korunması
- Kısa özetin kaynak şeridinde gösterilmesi
- Tam boyut ve SHA-256 değerinin JSON ve HTML raporunda korunması
- Kısmi veya biçimi bozuk bütünlük provenansının reddedilmesi
- Eski şema-v7 kayıtlarıyla geriye dönük uyumluluk
- Bilinen SHA-256 test vektörü
- Uygulama sürümü `1.0.3`

## Sonraki gerçek arazi işleri
""",
    'roadmap integrity stage'
)
