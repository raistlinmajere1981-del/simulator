import fs from 'node:fs';

function replaceExactlyOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: beklenen blok birden fazla bulundu.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const file = 'src/main/index.ts';
let source = fs.readFileSync(file, 'utf8');

source = replaceExactlyOnce(
  source,
  `  ImportObservationPhotoResult,\n  ImportTerrainProfileResult,`,
  `  ImportObservationPhotoResult,\n  ImportStellarLocalHorizonResult,\n  ImportTerrainProfileResult,`,
  'simulator type import'
);

source = replaceExactlyOnce(
  source,
  `import { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';`,
  `import { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';\nimport { parseStellarLocalHorizonFile } from '../simulation/stellar-local-horizon-import';`,
  'skyline parser import'
);

source = replaceExactlyOnce(
  source,
  `const MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;\nconst MAX_DEM_BYTES = 64 * 1024 * 1024;`,
  `const MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;\nconst MAX_STELLAR_HORIZON_BYTES = 2 * 1024 * 1024;\nconst MAX_DEM_BYTES = 64 * 1024 * 1024;`,
  'skyline size limit'
);

const anchor = `  ipcMain.handle(\n    'terrain:import-csv',`;
const handler = `  ipcMain.handle(\n    'stellar-horizon:import',\n    async (event): Promise<ImportStellarLocalHorizonResult> => {\n      const selection = await showOpenDialog(event, {\n        title: 'Yerel Skyline Profilini İçe Aktar',\n        properties: ['openFile'],\n        filters: [\n          { name: 'Skyline Profili', extensions: ['csv', 'tsv', 'txt', 'json'] },\n          { name: 'Tüm Dosyalar', extensions: ['*'] }\n        ]\n      });\n      const selectedPath = selection.filePaths[0];\n      if (selection.canceled || !selectedPath) {\n        return { status: 'cancelled', message: 'Skyline profil içe aktarma iptal edildi.' };\n      }\n\n      const statistics = await fs.stat(selectedPath);\n      if (!statistics.isFile()) throw new Error('Seçilen skyline yolu normal bir dosya değil.');\n      if (statistics.size <= 0 || statistics.size > MAX_STELLAR_HORIZON_BYTES) {\n        throw new Error('Skyline profili boş olamaz ve 2 MB sınırını aşamaz.');\n      }\n\n      const bytes = await fs.readFile(selectedPath);\n      const parsed = parseStellarLocalHorizonFile(bytes.toString('utf-8'), selectedPath);\n      const integrity = calculateTerrainSourceIntegrity(bytes);\n      const profile = {\n        ...parsed,\n        importedAtIso: new Date().toISOString(),\n        ...integrity\n      };\n      return {\n        status: 'success',\n        message: '“' + profile.fileName + '” skyline profili okundu: ' + profile.pointCount + ' nokta doğrulandı.',\n        filePath: selectedPath,\n        profile\n      };\n    }\n  );\n\n`;
if (!source.includes("'stellar-horizon:import'")) {
  source = replaceExactlyOnce(source, anchor, `${handler}${anchor}`, 'skyline IPC handler');
}

fs.writeFileSync(file, source);
