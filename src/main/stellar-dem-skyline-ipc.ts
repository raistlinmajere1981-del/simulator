import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
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

function validateGenerationSettings(value: unknown): StellarDemSkylineGenerationSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('DEM skyline hesap ayarları geçersiz.');
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
    throw new TypeError('DEM skyline hesap ayarları sonlu sayılar ve geçerli örnekleme yöntemi içermeli.');
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
    async (event): Promise<ImportStellarDemSkylineResult> => {
      purgeExpiredImports();
      const owner = parentWindow(event);
      const options = {
        title: '360° Skyline için ESRI ASCII DEM Seç',
        properties: ['openFile'] as const,
        filters: [
          { name: 'ESRI ASCII Grid DEM', extensions: ['asc', 'txt'] },
          { name: 'Tüm Dosyalar', extensions: ['*'] }
        ]
      };
      const selection = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'DEM skyline kaynak seçimi iptal edildi.' };
      }

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen DEM yolu normal bir dosya değil.');
      if (statistics.size <= 0 || statistics.size > MAX_DEM_BYTES) {
        throw new Error('ESRI ASCII DEM dosyası boş olamaz ve 64 MB sınırını aşamaz.');
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
        message: `“${draft.fileName}” DEM taslağı hazır: ${draft.columnCount}×${draft.rowCount} hücre. 360° tarama henüz çalıştırılmadı.`,
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
      rawSettings: unknown
    ): Promise<GenerateStellarDemSkylineResult> => {
      purgeExpiredImports();
      if (typeof rawRequestId !== 'string' || rawRequestId.length === 0) {
        throw new TypeError('DEM skyline taslak kimliği geçersiz.');
      }
      const pending = pendingImports.get(rawRequestId);
      if (!pending) {
        throw new Error('DEM skyline taslağının süresi doldu. Dosyayı yeniden seçin.');
      }
      const settings = validateGenerationSettings(rawSettings);
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
          message: `DEM 360° kapsaması eksik: ${result.completeRayCount}/${result.pointCount} azimut tam. Kaynak yıldız skyline'ına uygulanmadı.`,
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
        message: `“${source.fileName}” DEM'den ${source.pointCount} noktalı tam 360° geometrik skyline üretildi.`,
        source,
        diagnostics: diagnostics(result)
      };
    }
  );
}
