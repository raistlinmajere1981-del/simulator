#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTABLE = ROOT / 'src/shared/portable.ts'
SIMULATOR = ROOT / 'src/shared/simulator.ts'
PRELOAD = ROOT / 'src/preload/index.ts'
MAIN = ROOT / 'src/main/index.ts'
CONTROL = ROOT / 'src/renderer/src/PhotoCalibrationControl.tsx'
PACKAGE = ROOT / 'package.json'


def fail(message: str) -> None:
    raise RuntimeError(message)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


# shared/portable.ts
text = PORTABLE.read_text(encoding='utf-8')
if 'PortableExperimentFileV12' not in text:
    text = replace_once(
        text,
        """} from './portable-sources';

export const PORTABLE_EXPERIMENT_SCHEMA = 'geometric-observation-laboratory/portable-experiment';
export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 11;
""",
        """} from './portable-sources';
import {
  parsePortableExperimentAssets,
  samePhotoSourceMetadata,
  type PortableExperimentAssets
} from './portable-photo-asset';

export const PORTABLE_EXPERIMENT_SCHEMA = 'geometric-observation-laboratory/portable-experiment';
export const PORTABLE_EXPERIMENT_SCHEMA_VERSION = 12;
""",
        'portable asset import/version'
    )
    text = replace_once(
        text,
        """export interface PortableExperimentFileV11 {
  schema: typeof PORTABLE_EXPERIMENT_SCHEMA;
  schemaVersion: typeof PORTABLE_EXPERIMENT_SCHEMA_VERSION;
  exportedAtIso: string;
  application: PortableApplicationInfo;
  experiment: SavedExperiment;
}
""",
        """export interface PortableExperimentFileV12 {
  schema: typeof PORTABLE_EXPERIMENT_SCHEMA;
  schemaVersion: typeof PORTABLE_EXPERIMENT_SCHEMA_VERSION;
  exportedAtIso: string;
  application: PortableApplicationInfo;
  experiment: SavedExperiment;
  assets?: PortableExperimentAssets;
}
""",
        'portable interface'
    )
    text = replace_once(
        text,
        """export interface ParsedPortableExperiment {
  experiment: SavedExperiment;
  sourceVersion: number;
  migrated: boolean;
}
""",
        """export interface ParsedPortableExperiment {
  experiment: SavedExperiment;
  sourceVersion: number;
  migrated: boolean;
  assets?: PortableExperimentAssets;
}
""",
        'parsed portable assets'
    )
    text = replace_once(
        text,
        """export function createPortableExperimentFile(
  experiment: SavedExperiment,
  applicationVersion: string,
  exportedAtIso = new Date().toISOString()
): PortableExperimentFileV11 {
  return {
    schema: PORTABLE_EXPERIMENT_SCHEMA,
    schemaVersion: PORTABLE_EXPERIMENT_SCHEMA_VERSION,
    exportedAtIso,
    application: { name: 'Geometrik Gözlem Laboratuvarı', version: applicationVersion },
    experiment: normalizeExperiment(experiment)
  };
}
""",
        """export function createPortableExperimentFile(
  experiment: SavedExperiment,
  applicationVersion: string,
  exportedAtIso = new Date().toISOString(),
  assets?: PortableExperimentAssets
): PortableExperimentFileV12 {
  return {
    schema: PORTABLE_EXPERIMENT_SCHEMA,
    schemaVersion: PORTABLE_EXPERIMENT_SCHEMA_VERSION,
    exportedAtIso,
    application: { name: 'Geometrik Gözlem Laboratuvarı', version: applicationVersion },
    experiment: normalizeExperiment(experiment),
    ...(assets?.observationPhoto ? { assets } : {})
  };
}
""",
        'create portable assets'
    )
    text = replace_once(
        text,
        """  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 &&
    version !== 10 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
""",
        """  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 &&
    version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 &&
    version !== 10 && version !== 11 && version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION) {
""",
        'portable legacy version 11'
    )
    text = replace_once(
        text,
        """  const experiment = parseSavedExperiment(value.experiment, version < 3);
  if (!experiment) {
    throw new PortableFormatError('Dosyadaki deney verisi eksik, bozuk veya beklenen aralıkların dışında.');
  }
  return {
    experiment,
    sourceVersion: version,
    migrated: version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION
  };
""",
        """  const experiment = parseSavedExperiment(value.experiment, version < 3);
  if (!experiment) {
    throw new PortableFormatError('Dosyadaki deney verisi eksik, bozuk veya beklenen aralıkların dışında.');
  }
  const assets = value.assets === undefined
    ? undefined
    : parsePortableExperimentAssets(value.assets);
  if (assets === null) {
    throw new PortableFormatError('Dosyadaki taşınabilir fotoğraf varlığı bozuk veya desteklenen sınırların dışında.');
  }
  if (assets?.observationPhoto) {
    const expectedSource = experiment.photoCalibration?.source;
    if (!expectedSource || !samePhotoSourceMetadata(assets.observationPhoto.source, expectedSource)) {
      throw new PortableFormatError('Taşınabilir fotoğraf varlığı deneydeki fotoğraf provenansı ile eşleşmiyor.');
    }
  }
  return {
    experiment,
    sourceVersion: version,
    migrated: version !== PORTABLE_EXPERIMENT_SCHEMA_VERSION,
    ...(assets?.observationPhoto ? { assets } : {})
  };
""",
        'parse portable assets'
    )
    PORTABLE.write_text(text, encoding='utf-8')

# shared/simulator.ts
text = SIMULATOR.read_text(encoding='utf-8')
if 'LoadObservationPhotoResult' not in text:
    text = replace_once(
        text,
        "import type { ImportedObservationPhoto, SavedPhotoCalibration } from './photo-calibration';",
        "import type { ImportedObservationPhoto, PhotoSourceMetadata, SavedPhotoCalibration } from './photo-calibration';",
        'simulator photo type import'
    )
    text = replace_once(
        text,
        """export interface ImportObservationPhotoResult extends FileOperationResult {
  photo?: ImportedObservationPhoto;
}
""",
        """export interface ImportObservationPhotoResult extends FileOperationResult {
  photo?: ImportedObservationPhoto;
}

export interface LoadObservationPhotoResult {
  status: 'success' | 'missing';
  message: string;
  photo?: ImportedObservationPhoto;
}
""",
        'load photo result'
    )
    text = replace_once(
        text,
        """  importObservationPhoto(): Promise<ImportObservationPhotoResult>;
  importStellarLocalHorizon(): Promise<ImportStellarLocalHorizonResult>;
""",
        """  importObservationPhoto(): Promise<ImportObservationPhotoResult>;
  loadObservationPhoto(source: PhotoSourceMetadata): Promise<LoadObservationPhotoResult>;
  importStellarLocalHorizon(): Promise<ImportStellarLocalHorizonResult>;
""",
        'desktop load photo api'
    )
    SIMULATOR.write_text(text, encoding='utf-8')

# preload/index.ts
text = PRELOAD.read_text(encoding='utf-8')
if "'photo:load-saved'" not in text:
    text = replace_once(text, "  ImportObservationPhotoResult,\n", "  ImportObservationPhotoResult,\n  LoadObservationPhotoResult,\n", 'preload result import')
    text = replace_once(text, "  version: '1.33.0',", "  version: '1.33.1',", 'preload api version')
    text = replace_once(
        text,
        """  importObservationPhoto: () =>
    ipcRenderer.invoke('photo:import') as Promise<ImportObservationPhotoResult>,
  importStellarLocalHorizon: () =>
""",
        """  importObservationPhoto: () =>
    ipcRenderer.invoke('photo:import') as Promise<ImportObservationPhotoResult>,
  loadObservationPhoto: (source) =>
    ipcRenderer.invoke('photo:load-saved', source) as Promise<LoadObservationPhotoResult>,
  importStellarLocalHorizon: () =>
""",
        'preload load saved photo'
    )
    PRELOAD.write_text(text, encoding='utf-8')

# main/index.ts
text = MAIN.read_text(encoding='utf-8')
if "'photo:load-saved'" not in text:
    text = replace_once(
        text,
        """  ImportExperimentResult,
  ImportObservationPhotoResult,
  ImportStellarLocalHorizonResult,
""",
        """  ImportExperimentResult,
  ImportObservationPhotoResult,
  ImportStellarLocalHorizonResult,
  LoadObservationPhotoResult,
""",
        'main load photo result import'
    )
    anchor = "import { registerStellarPanoramaSkylineHandlers } from './stellar-panorama-skyline-ipc';\n"
    addition = """import {
  MAX_PORTABLE_OBSERVATION_PHOTO_BYTES,
  parsePhotoSourceMetadata
} from '../shared/portable-photo-asset';
import {
  createPortableObservationPhotoAsset,
  loadObservationPhotoAsset,
  persistObservationPhotoBytes,
  persistPortableObservationPhotoAsset
} from './observation-photo-assets';
"""
    text = replace_once(text, anchor, anchor + addition, 'main photo asset imports')
    text = replace_once(
        text,
        "const MAX_OBSERVATION_PHOTO_BYTES = 25 * 1024 * 1024;\n",
        '',
        'remove old photo size constant'
    )
    text = replace_once(
        text,
        """      const portable = createPortableExperimentFile(
        experiment,
        app.getVersion()
      );
""",
        """      const observationPhoto = experiment.photoCalibration
        ? await createPortableObservationPhotoAsset(experiment.photoCalibration.source)
        : undefined;
      const portable = createPortableExperimentFile(
        experiment,
        app.getVersion(),
        undefined,
        observationPhoto ? { observationPhoto } : undefined
      );
""",
        'export portable photo asset'
    )
    text = replace_once(
        text,
        """      return {
        status: 'success',
        message: `“${experiment.name}” taşınabilir deney dosyası olarak kaydedildi.`,
        filePath: selection.filePath
      };
""",
        """      const missingPhotoAsset = Boolean(experiment.photoCalibration && !observationPhoto);
      return {
        status: 'success',
        message: missingPhotoAsset
          ? `“${experiment.name}” dışa aktarıldı; kayıtlı kaynak fotoğraf bu makinede bulunamadığı için dosyada yalnız fotoğraf provenansı ve işaretler var.`
          : `“${experiment.name}” taşınabilir deney dosyası olarak kaydedildi.`,
        filePath: selection.filePath
      };
""",
        'export photo asset warning'
    )
    text = replace_once(
        text,
        """      const parsed = parsePortableExperimentFile(json);
      const experiments = await readExperiments();
""",
        """      const parsed = parsePortableExperimentFile(json);
      if (parsed.assets?.observationPhoto) {
        await persistPortableObservationPhotoAsset(
          parsed.assets.observationPhoto,
          parsed.experiment.photoCalibration?.source
        );
      }
      const experiments = await readExperiments();
""",
        'import portable photo asset'
    )
    text = replace_once(
        text,
        """      if (statistics.size <= 0 || statistics.size > MAX_OBSERVATION_PHOTO_BYTES) {
""",
        """      if (statistics.size <= 0 || statistics.size > MAX_PORTABLE_OBSERVATION_PHOTO_BYTES) {
""",
        'photo import size constant'
    )
    text = replace_once(
        text,
        """      const sha256 = createHash('sha256').update(bytes).digest('hex');
      return {
        status: 'success',
        message: `“${basename(selectedPath)}” fotoğraf kalibrasyonu için açıldı.`,
        photo: {
          fileName: basename(selectedPath),
          fileSizeBytes: bytes.byteLength,
          sha256,
          mimeType,
          imageWidthPx: size.width,
          imageHeightPx: size.height,
          importedAtIso: new Date().toISOString(),
          dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`
        }
      };
    }
  );

  ipcMain.handle(
    'stellar-horizon:import',
""",
        """      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const source = {
        fileName: basename(selectedPath),
        fileSizeBytes: bytes.byteLength,
        sha256,
        mimeType,
        imageWidthPx: size.width,
        imageHeightPx: size.height,
        importedAtIso: new Date().toISOString()
      };
      await persistObservationPhotoBytes(bytes, source);
      return {
        status: 'success',
        message: `“${basename(selectedPath)}” fotoğraf kalibrasyonu için açıldı ve yerel varlık deposuna alındı.`,
        photo: {
          ...source,
          dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`
        }
      };
    }
  );

  ipcMain.handle(
    'photo:load-saved',
    async (_event, rawSource: unknown): Promise<LoadObservationPhotoResult> => {
      const source = parsePhotoSourceMetadata(rawSource);
      if (!source) throw new TypeError('Kayıtlı gözlem fotoğrafı provenansı geçersiz.');
      const photo = await loadObservationPhotoAsset(source);
      return photo
        ? {
            status: 'success',
            message: `“${source.fileName}” SHA-256 doğrulanarak yerel varlık deposundan yüklendi.`,
            photo
          }
        : {
            status: 'missing',
            message: 'Kayıtlı fotoğraf provenansı ve işaretler mevcut, ancak kaynak görüntü varlığı bu makinede bulunamadı.'
          };
    }
  );

  ipcMain.handle(
    'stellar-horizon:import',
""",
        'photo import persistence/load handler'
    )
    MAIN.write_text(text, encoding='utf-8')

# renderer PhotoCalibrationControl.tsx
text = CONTROL.read_text(encoding='utf-8')
if 'loadObservationPhoto(savedCalibration.source)' not in text:
    text = replace_once(
        text,
        """  useEffect(() => {
    setPreview(undefined);
    setDraft(draftFromSaved(savedCalibration));
    setSelectedMark('horizonStart');
    setTouchedMarks(new Set(savedCalibration ? markOrder : []));
    setIsDirty(false);
    setMessage('');
  // Parent calibration updates in the same experiment must not discard the session photo preview.
  }, [experimentId]);
""",
        """  useEffect(() => {
    let cancelled = false;
    setPreview(undefined);
    setDraft(draftFromSaved(savedCalibration));
    setSelectedMark('horizonStart');
    setTouchedMarks(new Set(savedCalibration ? markOrder : []));
    setIsDirty(false);
    setMessage('');

    if (savedCalibration) {
      void window.simulatorDesktop.loadObservationPhoto(savedCalibration.source)
        .then((result) => {
          if (cancelled) return;
          if (result.status === 'success' && result.photo) {
            setPreview(result.photo);
            setMessage(result.message);
          } else {
            setMessage(result.message);
          }
        })
        .catch((caught) => {
          if (!cancelled) {
            setMessage(caught instanceof Error ? caught.message : 'Kayıtlı fotoğraf varlığı yüklenemedi.');
          }
        });
    }

    return () => {
      cancelled = true;
    };
  // Parent calibration updates in the same experiment must not discard the session photo preview.
  }, [experimentId]);
""",
        'auto restore saved photo asset'
    )
    text = replace_once(
        text,
        """      <p className="photo-calibration-note">
        Fotoğraf dosyası deney JSON’una gömülmez. Kayıtta dosya adı, boyut, SHA-256,
        görüntü ölçüsü, kamera parametreleri, işaretler ve hesap sonucu tutulur.
      </p>
""",
        """      <p className="photo-calibration-note">
        Fotoğraf, deney kaydından ayrı ve SHA-256 anahtarlı yerel varlık olarak tutulur.
        Taşınabilir deney JSON’u oluşturulurken mevcut kaynak görüntü de pakete eklenir;
        provenans, kamera parametreleri ve işaretler ayrıca doğrulanır.
      </p>
""",
        'photo persistence note'
    )
    text = replace_once(
        text,
        """        <div className="photo-preview-missing">
          Bu kayıt fotoğrafın kendisini saklamaz. İşaretleri görüntü üzerinde görmek için
          aynı dosyayı yeniden seç; SHA-256 eşleşirse mevcut kalibrasyon korunur.
        </div>
""",
        """        <div className="photo-preview-missing">
          Fotoğraf provenansı ve işaretler kayıtlı, ancak kaynak görüntü varlığı bu makinede yok.
          Aynı dosyayı yeniden seç; SHA-256 eşleşirse mevcut kalibrasyon ve işaretler korunur.
        </div>
""",
        'missing photo asset copy'
    )
    CONTROL.write_text(text, encoding='utf-8')

# package.json patch version only.
text = PACKAGE.read_text(encoding='utf-8')
if '"version": "1.33.1"' not in text:
    text = replace_once(text, '"version": "1.33.0"', '"version": "1.33.1"', 'package version')
    PACKAGE.write_text(text, encoding='utf-8')

print('Portable photo asset round-trip integration applied successfully.')
