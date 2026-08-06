from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


main_path = 'src/main/index.ts'
replace_once(
    main_path,
    """import {
  parseTerrainProfileCsv,
  TerrainProfileColumnMappingRequiredError
} from '../simulation/csv-terrain-profile';
""",
    """import {
  parseTerrainProfileCsv,
  TerrainProfileColumnMappingRequiredError
} from '../simulation/csv-terrain-profile';
import { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';
"""
)
replace_once(
    main_path,
    'const MAX_TERRAIN_CSV_BYTES = 5 * 1024 * 1024;',
    'const MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;'
)
main = Path(main_path).read_text(encoding='utf-8')
if main.count('MAX_TERRAIN_CSV_BYTES') != 1:
    raise RuntimeError('Unexpected CSV size constant usage count')
main = main.replace('MAX_TERRAIN_CSV_BYTES', 'MAX_TERRAIN_PROFILE_BYTES')
main = main.replace(
    'CSV arazi profili için geçerli deney bilgisi gönderilmedi.',
    'Arazi profili için geçerli deney bilgisi gönderilmedi.'
)
main = main.replace(
    'CSV arazi profili için mesafe ve uç kotları geçerli olmalı.',
    'Arazi profili için mesafe ve uç yükseklikleri geçerli olmalı.'
)
handler_marker = """  ipcMain.handle(
    'experiments:report',
"""
geojson_handler = """  ipcMain.handle(
    'terrain:import-geojson',
    async (event, rawContext: unknown): Promise<ImportTerrainProfileResult> => {
      const context = validateTerrainImportContext(rawContext);
      const selection = await showOpenDialog(event, {
        title: 'GeoJSON Arazi Profilini İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'GeoJSON Arazi Profili', extensions: ['geojson', 'json'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return {
          status: 'cancelled',
          message: 'GeoJSON profil içe aktarma iptal edildi.'
        };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size > MAX_TERRAIN_PROFILE_BYTES) {
        throw new Error('GeoJSON arazi profili 5 MB sınırını aşıyor.');
      }

      const content = await fs.readFile(selectedPath, 'utf-8');
      const profile = parseTerrainProfileGeoJson(content, selectedPath, context);
      return {
        status: 'success',
        message: `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
        filePath: selectedPath,
        profile
      };
    }
  );

"""
if main.count(handler_marker) != 1:
    raise RuntimeError('Report handler insertion marker not found exactly once')
main = main.replace(handler_marker, geojson_handler + handler_marker, 1)
Path(main_path).write_text(main, encoding='utf-8')

preload_path = 'src/preload/index.ts'
preload = Path(preload_path).read_text(encoding='utf-8')
preload = preload.replace("version: '0.8.0'", "version: '0.9.0'")
preload_old = """  ) => ipcRenderer.invoke(
    'terrain:import-csv-mapped',
    requestId,
    mapping,
    context
  ) as Promise<ImportTerrainProfileResult>
};
"""
preload_new = """  ) => ipcRenderer.invoke(
    'terrain:import-csv-mapped',
    requestId,
    mapping,
    context
  ) as Promise<ImportTerrainProfileResult>,
  importGeoJsonTerrainProfile: (context: TerrainProfileImportContext) =>
    ipcRenderer.invoke(
      'terrain:import-geojson',
      context
    ) as Promise<ImportTerrainProfileResult>
};
"""
if preload.count(preload_old) != 1:
    raise RuntimeError('Preload terrain API marker not found exactly once')
preload = preload.replace(preload_old, preload_new, 1)
Path(preload_path).write_text(preload, encoding='utf-8')

roadmap_path = 'docs/roadmap.md'
roadmap = Path(roadmap_path).read_text(encoding='utf-8')
roadmap_marker = """## Sonraki gerçek arazi işleri
- GeoJSON profil içe aktarma
"""
roadmap_stage = """## Aşama 3.7 — GeoJSON arazi profili

Durum: tamamlandı

- Doğrudan `LineString`, `Feature` ve tek hatlı `FeatureCollection`
- WGS84 `[boylam, enlem, yükseklik]` koordinatları
- Ardışık noktalar arasında ters jeodezik mesafe hesabı
- Kümülatif mesafeden rota yüzdesi üretimi
- GeoJSON rota mesafesini deneye isteğe bağlı uygulama
- Başlangıç ve bitiş zemin yüksekliklerini bağımsız uygulama
- 5 MB, 2.002 koordinat ve 20.000 km güvenlik sınırları
- Tekrarlanan konum, eksik yükseklik ve birden fazla rota reddi
- GeoJSON kaynağının kayıt, JSON ve HTML raporunda korunması
- Taşınabilir ve yerel kayıt şeması v6
- Uygulama sürümü `0.9.0`

## Sonraki gerçek arazi işleri
"""
if roadmap.count(roadmap_marker) != 1:
    raise RuntimeError('Roadmap GeoJSON marker not found exactly once')
roadmap = roadmap.replace(roadmap_marker, roadmap_stage, 1)
Path(roadmap_path).write_text(roadmap, encoding='utf-8')
