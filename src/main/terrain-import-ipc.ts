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
import type { UiLocale } from '../shared/ui-locale';
import {
  attachTerrainSourceIntegrity,
  calculateTerrainSourceIntegrity
} from './terrain-source-integrity';
import { showOpenDialog } from './ipc-dialogs';
import { ipcText, resolveIpcLocale } from './ipc-i18n';

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

function validateTerrainImportContext(value: unknown, locale: UiLocale): TerrainProfileImportContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(ipcText(locale, 'Arazi profili için geçerli deney bilgisi gönderilmedi.', 'Valid experiment context was not provided for the terrain profile.'));
  }

  const candidate = value as Record<string, unknown>;
  if (!Number.isFinite(candidate.routeDistanceM) ||
    (candidate.routeDistanceM as number) <= 0 ||
    !Number.isFinite(candidate.observerGroundElevationM) ||
    !Number.isFinite(candidate.targetGroundElevationM)) {
    throw new TypeError(ipcText(locale, 'Arazi profili için mesafe ve uç yükseklikleri geçerli olmalı.', 'Terrain-profile distance and endpoint elevations must be valid.'));
  }

  return {
    routeDistanceM: candidate.routeDistanceM as number,
    observerGroundElevationM: candidate.observerGroundElevationM as number,
    targetGroundElevationM: candidate.targetGroundElevationM as number
  };
}

function validateDemImportContext(value: unknown, locale: UiLocale): DemTerrainProfileImportContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(ipcText(locale, 'DEM profili için geçerli rota koordinatları gönderilmedi.', 'Valid route coordinates were not provided for the DEM profile.'));
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
    throw new TypeError(ipcText(locale, 'DEM rota koordinatları, örnekleme yöntemi veya örnek sayısı geçersiz.', 'DEM route coordinates, sampling method or sample count are invalid.'));
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

function validateTerrainColumnMapping(value: unknown, locale: UiLocale): TerrainProfileColumnMapping {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(ipcText(locale, 'CSV sütun eşlemesi geçersiz.', 'The CSV column mapping is invalid.'));
  }
  const candidate = value as Record<string, unknown>;
  if (!Number.isInteger(candidate.distanceColumnIndex) ||
    !Number.isInteger(candidate.elevationColumnIndex) ||
    (candidate.distanceColumnIndex as number) < 0 ||
    (candidate.elevationColumnIndex as number) < 0 ||
    (candidate.distanceUnit !== 'percent' && candidate.distanceUnit !== 'm' &&
      candidate.distanceUnit !== 'km')) {
    throw new TypeError(ipcText(locale, 'CSV sütun eşlemesi geçersiz.', 'The CSV column mapping is invalid.'));
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
  locale: UiLocale,
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
    message: ipcText(locale, 'CSV sütunları otomatik belirlenemedi; eşleme gerekli.', 'CSV columns could not be detected automatically; mapping is required.'),
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
    async (
      event,
      rawContext: unknown,
      requestedLocale?: unknown
    ): Promise<ImportTerrainProfileResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const context = validateTerrainImportContext(rawContext, locale);
      const selection = await showOpenDialog(event, {
        title: ipcText(locale, 'CSV Arazi Profilini İçe Aktar', 'Import CSV Terrain Profile'),
        properties: ['openFile'],
        filters: [
          { name: ipcText(locale, 'Arazi Profili CSV', 'Terrain Profile CSV'), extensions: ['csv', 'tsv', 'txt'] },
          { name: ipcText(locale, 'Tüm Dosyalar', 'All Files'), extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'CSV profil içe aktarma iptal edildi.', 'CSV profile import was cancelled.') };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen yol normal bir dosya değil.', 'The selected path is not a regular file.'));
      if (statistics.size > MAX_TERRAIN_PROFILE_BYTES) {
        throw new Error(ipcText(locale, 'CSV arazi profili 5 MB sınırını aşıyor.', 'The CSV terrain profile exceeds the 5 MB limit.'));
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
          message: locale === 'en'
            ? `“${profile.fileName}” loaded: ${profile.points.length} intermediate points are ready to apply.`
            : `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
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
            locale,
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
      rawContext: unknown,
      requestedLocale?: unknown
    ): Promise<ImportTerrainProfileResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      purgeExpiredTerrainImports();
      if (typeof rawRequestId !== 'string' || rawRequestId.length === 0) {
        throw new TypeError(ipcText(locale, 'CSV eşleme isteği geçersiz.', 'The CSV mapping request is invalid.'));
      }
      const pending = pendingTerrainImports.get(rawRequestId);
      if (!pending) {
        throw new Error(ipcText(locale, 'CSV eşleme isteğinin süresi doldu. Dosyayı yeniden seçin.', 'The CSV mapping request expired. Select the file again.'));
      }
      const mapping = validateTerrainColumnMapping(rawMapping, locale);
      const context = validateTerrainImportContext(rawContext, locale);
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
        message: locale === 'en'
          ? `“${profile.fileName}” loaded with mapped columns: ${profile.points.length} intermediate points are ready to apply.`
          : `“${profile.fileName}” eşlenen sütunlarla okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
        profile
      };
    }
  );

  ipcMain.handle(
    'terrain:import-dem',
    async (
      event,
      rawContext: unknown,
      requestedLocale?: unknown
    ): Promise<ImportTerrainProfileResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const context = validateDemImportContext(rawContext, locale);
      const selection = await showOpenDialog(event, {
        title: ipcText(locale, 'ESRI ASCII DEM Dosyasını İçe Aktar', 'Import ESRI ASCII DEM File'),
        properties: ['openFile'],
        filters: [
          { name: 'ESRI ASCII Grid DEM', extensions: ['asc', 'txt'] },
          { name: ipcText(locale, 'Tüm Dosyalar', 'All Files'), extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'DEM içe aktarma iptal edildi.', 'DEM import was cancelled.') };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen yol normal bir dosya değil.', 'The selected path is not a regular file.'));
      if (statistics.size > MAX_DEM_BYTES) {
        throw new Error(ipcText(locale, 'ESRI ASCII DEM dosyası 64 MB sınırını aşıyor.', 'The ESRI ASCII DEM file exceeds the 64 MB limit.'));
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
        message: locale === 'en'
          ? `“${profile.fileName}” DEM route sampled: ${profile.points.length} intermediate points are ready to apply.`
          : `“${profile.fileName}” DEM rotası örneklendi: ${profile.points.length} ara nokta uygulamaya hazır.`,
        filePath: selectedPath,
        profile
      };
    }
  );

  ipcMain.handle(
    'terrain:import-geojson',
    async (
      event,
      rawContext: unknown,
      requestedLocale?: unknown
    ): Promise<ImportTerrainProfileResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      const context = validateTerrainImportContext(rawContext, locale);
      const selection = await showOpenDialog(event, {
        title: ipcText(locale, 'GeoJSON Arazi Profilini İçe Aktar', 'Import GeoJSON Terrain Profile'),
        properties: ['openFile'],
        filters: [
          { name: ipcText(locale, 'GeoJSON Arazi Profili', 'GeoJSON Terrain Profile'), extensions: ['geojson', 'json'] },
          { name: ipcText(locale, 'Tüm Dosyalar', 'All Files'), extensions: ['*'] }
        ]
      });

      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return {
          status: 'cancelled',
          message: ipcText(locale, 'GeoJSON profil içe aktarma iptal edildi.', 'GeoJSON profile import was cancelled.')
        };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen yol normal bir dosya değil.', 'The selected path is not a regular file.'));
      if (statistics.size > MAX_TERRAIN_PROFILE_BYTES) {
        throw new Error(ipcText(locale, 'GeoJSON arazi profili 5 MB sınırını aşıyor.', 'The GeoJSON terrain profile exceeds the 5 MB limit.'));
      }

      const bytes = await fs.readFile(selectedPath);
      const content = bytes.toString('utf-8');
      const profile = attachTerrainSourceIntegrity(
        parseTerrainProfileGeoJson(content, selectedPath, context),
        calculateTerrainSourceIntegrity(bytes)
      );
      return {
        status: 'success',
        message: locale === 'en'
          ? `“${profile.fileName}” loaded: ${profile.points.length} intermediate points are ready to apply.`
          : `“${profile.fileName}” okundu: ${profile.points.length} ara nokta uygulamaya hazır.`,
        filePath: selectedPath,
        profile
      };
    }
  );
}
