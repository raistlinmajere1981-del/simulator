import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type OpenDialogOptions
} from 'electron';
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';
import type {
  GenerateStellarDemSkylineResult,
  ImportStellarDemSkylineResult,
  StellarDemSkylineDraft,
  StellarDemSkylineGenerationSettings
} from '../shared/stellar-local-horizon-import';
import { generateDemSkyline } from '../simulation/dem-skyline';
import { parseEsriAsciiGrid, type EsriAsciiGrid } from '../simulation/esri-ascii-grid';
import { savedStellarLocalHorizonSourceFromDemSkyline } from '../simulation/stellar-dem-skyline-source';
import type { UiLocale } from '../shared/ui-locale';
import { ipcText, resolveIpcLocale } from './ipc-i18n';

const MAX_DEM_BYTES = 64 * 1024 * 1024;
const PENDING_DEM_TTL_MS = 10 * 60 * 1_000;

interface PendingStellarDemSkylineImport {
  grid: EsriAsciiGrid;
  draft: StellarDemSkylineDraft;
  createdAtMs: number;
}

const pendingImports = new Map<string, PendingStellarDemSkylineImport>();

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function purgeExpiredImports(): void {
  const now = Date.now();
  for (const [requestId, pending] of pendingImports) {
    if (now - pending.createdAtMs > PENDING_DEM_TTL_MS) {
      pendingImports.delete(requestId);
    }
  }
}

function validateGenerationSettings(value: unknown, locale: UiLocale): StellarDemSkylineGenerationSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(ipcText(locale, 'DEM skyline hesap ayarları geçersiz.', 'DEM skyline calculation settings are invalid.'));
  }
  const candidate = value as Record<string, unknown>;
  const numericKeys = [
    'observerLatitudeDeg',
    'observerLongitudeDeg',
    'observerHeightM',
    'heightDatumToEllipsoidOffsetM',
    'azimuthStepDeg',
    'distanceStepM',
    'maximumDistanceM'
  ] as const;
  if (!numericKeys.every((key) => Number.isFinite(candidate[key])) ||
    (candidate.samplingMethod !== 'nearest' && candidate.samplingMethod !== 'bilinear')) {
    throw new TypeError(ipcText(locale, 'DEM skyline hesap ayarları sonlu sayılar ve geçerli örnekleme yöntemi içermeli.', 'DEM skyline calculation settings must contain finite numbers and a valid sampling method.'));
  }
  return {
    observerLatitudeDeg: candidate.observerLatitudeDeg as number,
    observerLongitudeDeg: candidate.observerLongitudeDeg as number,
    observerHeightM: candidate.observerHeightM as number,
    heightDatumToEllipsoidOffsetM: candidate.heightDatumToEllipsoidOffsetM as number,
    azimuthStepDeg: candidate.azimuthStepDeg as number,
    distanceStepM: candidate.distanceStepM as number,
    maximumDistanceM: candidate.maximumDistanceM as number,
    samplingMethod: candidate.samplingMethod
  };
}

function diagnostics(result: ReturnType<typeof generateDemSkyline>): GenerateStellarDemSkylineResult['diagnostics'] {
  return {
    pointCount: result.pointCount,
    knownPointCount: result.knownPointCount,
    completeRayCount: result.completeRayCount,
    coverageLimitedRayCount: result.coverageLimitedRayCount,
    noDataAffectedRayCount: result.noDataAffectedRayCount,
    noCoverageRayCount: result.noCoverageRayCount
  };
}

export function registerStellarDemSkylineHandlers(): void {
  ipcMain.handle(
    'stellar-skyline-dem:import',
    async (event, requestedLocale?: unknown): Promise<ImportStellarDemSkylineResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      purgeExpiredImports();
      const owner = parentWindow(event);
      const options: OpenDialogOptions = {
        title: ipcText(locale, '360° Skyline için ESRI ASCII DEM Seç', 'Select ESRI ASCII DEM for 360° Skyline'),
        properties: ['openFile'],
        filters: [
          { name: 'ESRI ASCII Grid DEM', extensions: ['asc', 'txt'] },
          { name: ipcText(locale, 'Tüm Dosyalar', 'All Files'), extensions: ['*'] }
        ]
      };
      const selection = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: ipcText(locale, 'DEM skyline kaynak seçimi iptal edildi.', 'DEM skyline source selection was cancelled.') };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error(ipcText(locale, 'Seçilen DEM yolu normal bir dosya değil.', 'The selected DEM path is not a regular file.'));
      if (statistics.size <= 0 || statistics.size > MAX_DEM_BYTES) {
        throw new Error(ipcText(locale, 'ESRI ASCII DEM dosyası boş olamaz ve 64 MB sınırını aşamaz.', 'The ESRI ASCII DEM file cannot be empty or exceed the 64 MB limit.'));
      }

      const bytes = await fs.readFile(selectedPath);
      const grid = parseEsriAsciiGrid(bytes.toString('utf-8'), selectedPath);
      const requestId = randomUUID();
      const draft: StellarDemSkylineDraft = {
        requestId,
        fileName: basename(selectedPath),
        importedAtIso: new Date().toISOString(),
        fileSizeBytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        columnCount: grid.columnCount,
        rowCount: grid.rowCount,
        cellSizeDeg: grid.cellSizeDeg,
        noDataValue: grid.noDataValue,
        westBoundaryDeg: grid.westBoundaryDeg,
        eastBoundaryDeg: grid.eastBoundaryDeg,
        southBoundaryDeg: grid.southBoundaryDeg,
        northBoundaryDeg: grid.northBoundaryDeg,
        warnings: [...grid.warnings]
      };
      pendingImports.set(requestId, { grid, draft, createdAtMs: Date.now() });

      return {
        status: 'success',
        message: locale === 'en'
          ? `“${draft.fileName}” DEM draft ready: ${draft.columnCount}×${draft.rowCount} cells. The 360° scan has not been run yet.`
          : `“${draft.fileName}” DEM taslağı hazır: ${draft.columnCount}×${draft.rowCount} hücre. 360° tarama henüz çalıştırılmadı.`,
        filePath: selectedPath,
        draft
      };
    }
  );

  ipcMain.handle(
    'stellar-skyline-dem:generate',
    async (
      _event,
      rawRequestId: unknown,
      rawSettings: unknown,
      requestedLocale?: unknown
    ): Promise<GenerateStellarDemSkylineResult> => {
      const locale = resolveIpcLocale(requestedLocale);
      purgeExpiredImports();
      if (typeof rawRequestId !== 'string' || rawRequestId.length === 0) {
        throw new TypeError(ipcText(locale, 'DEM skyline taslak kimliği geçersiz.', 'The DEM skyline draft id is invalid.'));
      }
      const pending = pendingImports.get(rawRequestId);
      if (!pending) {
        throw new Error(ipcText(locale, 'DEM skyline taslağının süresi doldu. Dosyayı yeniden seçin.', 'The DEM skyline draft expired. Select the file again.'));
      }
      const settings = validateGenerationSettings(rawSettings, locale);
      const result = generateDemSkyline({
        grid: pending.grid,
        observer: {
          latitudeDeg: settings.observerLatitudeDeg,
          longitudeDeg: settings.observerLongitudeDeg
        },
        observerHeightM: settings.observerHeightM,
        heightDatumToEllipsoidOffsetM: settings.heightDatumToEllipsoidOffsetM,
        azimuthStepDeg: settings.azimuthStepDeg,
        distanceStepM: settings.distanceStepM,
        maximumDistanceM: settings.maximumDistanceM,
        samplingMethod: settings.samplingMethod
      });

      if (!result.completeCoverage) {
        return {
          status: 'success',
          completeCoverage: false,
          message: locale === 'en'
            ? `DEM 360° coverage is incomplete: ${result.completeRayCount}/${result.pointCount} azimuths are complete. The source was not applied to the stellar skyline.`
            : `DEM 360° kapsaması eksik: ${result.completeRayCount}/${result.pointCount} azimut tam. Kaynak yıldız skyline'ına uygulanmadı.`,
          diagnostics: diagnostics(result)
        };
      }

      const source = savedStellarLocalHorizonSourceFromDemSkyline({
        draft: pending.draft,
        settings,
        result
      });

      return {
        status: 'success',
        completeCoverage: true,
        message: locale === 'en'
          ? `A complete 360° geometric skyline with ${source.pointCount} points was generated from “${source.fileName}” DEM.`
          : `“${source.fileName}” DEM'den ${source.pointCount} noktalı tam 360° geometrik skyline üretildi.`,
        source,
        diagnostics: diagnostics(result)
      };
    }
  );
}
