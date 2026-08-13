import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { buildTerrainProfileFromDem } from '../simulation/dem-route-profile';
import {
  parseTerrainProfileCsv,
  TerrainProfileColumnMappingRequiredError
} from '../simulation/csv-terrain-profile';
import { parseEsriAsciiGrid } from '../simulation/esri-ascii-grid';
import { parseTerrainProfileGeoJson } from '../simulation/geojson-terrain-profile';
import type {
  DemTerrainProfileImportContext,
  ImportTerrainProfileResult,
  TerrainProfileColumnMapping,
  TerrainProfileImportContext,
  TerrainSourceIntegrity
} from '../shared/simulator';
import {
  attachTerrainSourceIntegrity,
  calculateTerrainSourceIntegrity
} from './terrain-source-integrity';
import { showOpenDialog } from './ipc-dialogs';

const MAX_TERRAIN_PROFILE_BYTES = 5 * 1024 * 1024;
const MAX_DEM_BYTES = 64 * 1024 * 1024;
const TERRAIN_MAPPING_TTL_MS = 10 * 60 * 1_000;

interface PendingTerrainImport {
  content: string;
  fileName: string;
  integrity: TerrainSourceIntegrity;
  createdAtMs: number;
}

const pendingTerrainImports = new Map<string, PendingTerrainImport>();

function validateTerrainImportContext(value: unknown): TerrainProfileImportContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arazi profili için geçerli deney bilgisi gönderilmedi.');
  }

  const candidate = value as Record<string, unknown>;
  if (!Number.isFinite(candidate.routeDistanceM) ||
    (candidate.routeDistanceM as number) <= 0 ||
    !Number.isFinite(candidate.observerGroundElevationM) ||
    !Number.isFinite(candidate.targetGroundElevationM)) {
    throw new TypeError('Arazi profili için mesafe ve uç yükseklikleri geçerli olmalı.');
  }

  return {
    routeDistanceM: candidate.routeDistanceM as number,
    observerGroundElevationM: candidate.observerGroundElevationM as number,
    targetGroundElevationM: candidate.targetGroundElevationM as number
  };
}

function validateDemImportContext(value: unknown): DemTerrainProfileImportContext {
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
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('CSV sütun eşlemesi geçersiz.');
  }
  const candidate = value as Record<string, unknown>;
  if (!Number.isInteger(candidate.distanceColumnIndex) ||
    !Number.isInteger(candidate.elevationColumnIndex) ||
    (candidate.distanceColumnIndex as number) < 0 ||
    (candidate.elevationColumnIndex as number) < 0 ||
    (candidate.distanceUnit !== 'percent' && candidate.distanceUnit !== 'm' &&
      candidate.distanceUnit !== 'km')) {
    throw new TypeError('CSV sütun eşlemesi geçersiz.');
  }
  return {
    distanceColumnIndex: candidate.distanceColumnIndex as number,
    elevationColumnIndex: candidate.elevationColumnIndex as number,
    distanceUnit: candidate.distanceUnit
  };
}

function purgeExpiredTerrainImports(): void {
  const now = Date.now();
  for (const [requestId, pending] of pendingTerrainImports) {
    if (now - pending.createdAtMs > TERRAIN_MAPPING_TTL_MS) {
      pendingTerrainImports.delete(requestId);
    }
  }
}

function terrainMappingResult(
  error: TerrainProfileColumnMappingRequiredError,
  content: string,
  fileName: string,
  integrity: TerrainSourceIntegrity,
  filePath?: string
): ImportTerrainProfileResult {
  purgeExpiredTerrainImports();
  const requestId = randomUUID();
  pendingTerrainImports.set(requestId, {
    content,
    fileName,
    integrity,
    createdAtMs: Date.now()
  });
  return {
    status: 'success',
    message: 'CSV sütunları otomatik belirlenemedi; eşleme gerekli.',
    filePath,
    mappingRequest: {
      requestId,
      ...error.inspection
    }
  };
}

export function registerTerrainImportIpcHandlers(): void {
  ipcMain.handle(
    'terrain:import-csv',
    async (event, rawContext: unknown): Promise<ImportTerrainProfileResult> => {
      const context = validateTerrainImportContext(rawContext);
      const selection = await showOpenDialog(event, {
        title: 'CSV Arazi Profilini İçe Aktar',
        properties: ['openFile'],
        filters: [
          { name: 'Arazi Profili CSV', extensions: ['csv', 'tsv', 'txt'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'CSV profil içe aktarma iptal edildi.' };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size > MAX_TERRAIN_PROFILE_BYTES) {
        throw new Error('CSV arazi profili 5 MB sınırını aşıyor.');
      }

      const bytes = await fs.readFile(selectedPath);
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
        throw error;
      }
    }
  );

  ipcMain.handle(
    'terrain:import-csv-mapped',
    async (
      _event,
      rawRequestId: unknown,
      rawMapping: unknown,
      rawContext: unknown
    ): Promise<ImportTerrainProfileResult> => {
      purgeExpiredTerrainImports();
      if (typeof rawRequestId !== 'string' || rawRequestId.length === 0) {
        throw new TypeError('CSV eşleme isteği geçersiz.');
      }
      const pending = pendingTerrainImports.get(rawRequestId);
      if (!pending) {
        throw new Error('CSV eşleme isteğinin süresi doldu. Dosyayı yeniden seçin.');
      }
      const mapping = validateTerrainColumnMapping(rawMapping);
      const context = validateTerrainImportContext(rawContext);
      const profile = attachTerrainSourceIntegrity(
        parseTerrainProfileCsv(
          pending.content,
          pending.fileName,
          context,
          mapping
        ),
        pending.integrity
      );
      pendingTerrainImports.delete(rawRequestId);
      return {
        status: 'success',
        message: `“${profile.fileName}” eşlenen sütunlarla okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
        profile
      };
    }
  );

  ipcMain.handle(
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

      const bytes = await fs.readFile(selectedPath);
      const content = bytes.toString('utf-8');
      const grid = parseEsriAsciiGrid(content, selectedPath);
      const profile = attachTerrainSourceIntegrity(
        buildTerrainProfileFromDem(grid, context),
        calculateTerrainSourceIntegrity(bytes)
      );
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

      const bytes = await fs.readFile(selectedPath);
      const content = bytes.toString('utf-8');
      const profile = attachTerrainSourceIntegrity(
        parseTerrainProfileGeoJson(content, selectedPath, context),
        calculateTerrainSourceIntegrity(bytes)
      );
      return {
        status: 'success',
        message: `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
        filePath: selectedPath,
        profile
      };
    }
  );
}
