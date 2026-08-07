from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# shared/simulator.ts
path = Path('src/shared/simulator.ts')
text = path.read_text()
text = replace_once(
    text,
    "import type { AtmosphereExperimentState } from './atmosphere';\n",
    "import type { AtmosphereExperimentState } from './atmosphere';\nimport type { ImportedObservationPhoto, SavedPhotoCalibration } from './photo-calibration';\n",
    'simulator photo import'
)
text = replace_once(
    text,
    "  /** Persisted advanced-atmosphere editor state; older records derive mode from the legacy standard-refraction flag. */\n  atmosphere?: AtmosphereExperimentState;\n  inputs: SimulatorInputs;",
    "  /** Persisted advanced-atmosphere editor state; older records derive mode from the legacy standard-refraction flag. */\n  atmosphere?: AtmosphereExperimentState;\n  /** Camera/photo calibration metadata and marks; source image bytes are never embedded here. */\n  photoCalibration?: SavedPhotoCalibration;\n  inputs: SimulatorInputs;",
    'saved experiment photo field'
)
text = replace_once(
    text,
    "export interface ImportExperimentResult extends FileOperationResult {\n  experiment?: SavedExperiment;\n  migrated?: boolean;\n  sourceVersion?: number;\n}\n",
    "export interface ImportExperimentResult extends FileOperationResult {\n  experiment?: SavedExperiment;\n  migrated?: boolean;\n  sourceVersion?: number;\n}\n\nexport interface ImportObservationPhotoResult extends FileOperationResult {\n  photo?: ImportedObservationPhoto;\n}\n",
    'photo import result'
)
text = replace_once(
    text,
    "  exportExperimentReport(id: string): Promise<FileOperationResult>;\n  importTerrainProfile(\n",
    "  exportExperimentReport(id: string): Promise<FileOperationResult>;\n  importObservationPhoto(): Promise<ImportObservationPhotoResult>;\n  importTerrainProfile(\n",
    'desktop photo api'
)
path.write_text(text)

# shared/portable.ts
path = Path('src/shared/portable.ts')
text = path.read_text()
text = replace_once(
    text,
    "import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';\n",
    "import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';\nimport type { PhotoCalibrationMarks, PhotoSourceMetadata, SavedPhotoCalibration } from './photo-calibration';\n",
    'portable photo type import'
)
photo_parser = r'''
function parsePhotoSourceMetadata(value: unknown): PhotoSourceMetadata | null {
  if (!isRecord(value) || !isNonEmptyString(value.fileName) ||
    !Number.isInteger(value.fileSizeBytes) || !inRange(value.fileSizeBytes, 1, 25 * 1024 * 1024) ||
    typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256) ||
    (value.mimeType !== 'image/jpeg' && value.mimeType !== 'image/png') ||
    !Number.isInteger(value.imageWidthPx) || !inRange(value.imageWidthPx, 1, 100_000) ||
    !Number.isInteger(value.imageHeightPx) || !inRange(value.imageHeightPx, 1, 100_000) ||
    !isIsoDate(value.importedAtIso)) {
    return null;
  }
  return {
    fileName: value.fileName.trim(),
    fileSizeBytes: value.fileSizeBytes as number,
    sha256: value.sha256,
    mimeType: value.mimeType,
    imageWidthPx: value.imageWidthPx as number,
    imageHeightPx: value.imageHeightPx as number,
    importedAtIso: value.importedAtIso
  };
}

function parsePhotoMark(
  value: unknown,
  imageWidthPx: number,
  imageHeightPx: number
): PhotoCalibrationMarks['horizonStart'] | null {
  if (!isRecord(value) || !inRange(value.xPx, 0, imageWidthPx - 1) ||
    !inRange(value.yPx, 0, imageHeightPx - 1) ||
    (value.uncertaintyPx !== undefined && !inRange(value.uncertaintyPx, 0, 100))) {
    return null;
  }
  return {
    xPx: value.xPx,
    yPx: value.yPx,
    ...(value.uncertaintyPx === undefined ? {} : { uncertaintyPx: value.uncertaintyPx })
  };
}

function parsePhotoCalibration(value: unknown): SavedPhotoCalibration | null {
  if (!isRecord(value)) return null;
  const source = parsePhotoSourceMetadata(value.source);
  if (!source || !isRecord(value.calibration) || !isRecord(value.marks) ||
    !inRange(value.defaultMarkUncertaintyPx, 0, 100) ||
    typeof value.distortionCorrected !== 'boolean' || !isIsoDate(value.recordedAtIso) ||
    (value.notes !== undefined && (typeof value.notes !== 'string' || value.notes.length > 2_000))) {
    return null;
  }

  let calibration: SavedPhotoCalibration['calibration'];
  if (value.calibration.sourceKind === 'field-of-view') {
    if (!inRange(value.calibration.horizontalFovDeg, 0.01, 179) ||
      !inRange(value.calibration.verticalFovDeg, 0.01, 179)) return null;
    calibration = {
      sourceKind: 'field-of-view',
      horizontalFovDeg: value.calibration.horizontalFovDeg,
      verticalFovDeg: value.calibration.verticalFovDeg
    };
  } else if (value.calibration.sourceKind === 'sensor-focal') {
    if (!isFiniteNumber(value.calibration.focalLengthMm) || value.calibration.focalLengthMm <= 0 ||
      value.calibration.focalLengthMm > 10_000 ||
      !isFiniteNumber(value.calibration.sensorWidthMm) || value.calibration.sensorWidthMm <= 0 ||
      value.calibration.sensorWidthMm > 1_000 ||
      !isFiniteNumber(value.calibration.sensorHeightMm) || value.calibration.sensorHeightMm <= 0 ||
      value.calibration.sensorHeightMm > 1_000) return null;
    calibration = {
      sourceKind: 'sensor-focal',
      focalLengthMm: value.calibration.focalLengthMm,
      sensorWidthMm: value.calibration.sensorWidthMm,
      sensorHeightMm: value.calibration.sensorHeightMm
    };
  } else {
    return null;
  }

  if ((value.principalPointXPx !== undefined && !inRange(value.principalPointXPx, 0, source.imageWidthPx - 1)) ||
    (value.principalPointYPx !== undefined && !inRange(value.principalPointYPx, 0, source.imageHeightPx - 1))) {
    return null;
  }

  const horizonStart = parsePhotoMark(value.marks.horizonStart, source.imageWidthPx, source.imageHeightPx);
  const horizonEnd = parsePhotoMark(value.marks.horizonEnd, source.imageWidthPx, source.imageHeightPx);
  const targetBase = parsePhotoMark(value.marks.targetBase, source.imageWidthPx, source.imageHeightPx);
  const targetTop = parsePhotoMark(value.marks.targetTop, source.imageWidthPx, source.imageHeightPx);
  if (!horizonStart || !horizonEnd || !targetBase || !targetTop ||
    Math.abs(horizonEnd.xPx - horizonStart.xPx) < 1) return null;

  return {
    source,
    calibration,
    ...(value.principalPointXPx === undefined ? {} : { principalPointXPx: value.principalPointXPx }),
    ...(value.principalPointYPx === undefined ? {} : { principalPointYPx: value.principalPointYPx }),
    defaultMarkUncertaintyPx: value.defaultMarkUncertaintyPx,
    distortionCorrected: value.distortionCorrected,
    marks: { horizonStart, horizonEnd, targetBase, targetTop },
    recordedAtIso: value.recordedAtIso,
    ...(value.notes === undefined || value.notes.trim() === '' ? {} : { notes: value.notes.trim() })
  };
}

'''
text = replace_once(
    text,
    "function parseSavedExperiment(value: unknown, allowLegacyInputs: boolean): SavedExperiment | null {\n",
    photo_parser + "function parseSavedExperiment(value: unknown, allowLegacyInputs: boolean): SavedExperiment | null {\n",
    'portable photo parser insertion'
)
text = replace_once(
    text,
    "  const atmosphere = value.atmosphere === undefined\n    ? undefined\n    : parseAtmosphereExperimentState(value.atmosphere);\n  if (atmosphere === null) return null;\n\n  return {",
    "  const atmosphere = value.atmosphere === undefined\n    ? undefined\n    : parseAtmosphereExperimentState(value.atmosphere);\n  if (atmosphere === null) return null;\n\n  const photoCalibration = value.photoCalibration === undefined\n    ? undefined\n    : parsePhotoCalibration(value.photoCalibration);\n  if (photoCalibration === null) return null;\n\n  return {",
    'portable parse photo state'
)
text = replace_once(
    text,
    "    ...(atmosphere === undefined ? {} : { atmosphere }),\n    inputs,",
    "    ...(atmosphere === undefined ? {} : { atmosphere }),\n    ...(photoCalibration === undefined ? {} : { photoCalibration }),\n    inputs,",
    'portable return photo state'
)
path.write_text(text)

# main/index.ts
path = Path('src/main/index.ts')
text = path.read_text()
text = replace_once(
    text,
    "  ipcMain,\n  shell,",
    "  ipcMain,\n  nativeImage,\n  shell,",
    'main nativeImage import'
)
text = replace_once(
    text,
    "import { randomUUID } from 'node:crypto';\n",
    "import { createHash, randomUUID } from 'node:crypto';\n",
    'main crypto import'
)
text = replace_once(
    text,
    "import { join } from 'node:path';\n",
    "import { basename, extname, join } from 'node:path';\n",
    'main path import'
)
text = replace_once(
    text,
    "  ImportExperimentResult,\n  ImportTerrainProfileResult,",
    "  ImportExperimentResult,\n  ImportObservationPhotoResult,\n  ImportTerrainProfileResult,",
    'main photo result import'
)
text = replace_once(
    text,
    "const MAX_DEM_BYTES = 64 * 1024 * 1024;\n",
    "const MAX_DEM_BYTES = 64 * 1024 * 1024;\nconst MAX_OBSERVATION_PHOTO_BYTES = 25 * 1024 * 1024;\n",
    'main photo size constant'
)
photo_handler = r'''
  ipcMain.handle(
    'photo:import',
    async (event): Promise<ImportObservationPhotoResult> => {
      const selection = await showOpenDialog(event, {
        title: 'Gözlem Fotoğrafını Aç',
        properties: ['openFile'],
        filters: [
          { name: 'Gözlem Fotoğrafı', extensions: ['jpg', 'jpeg', 'png'] }
        ]
      });
      const selectedPath = selection.filePaths[0];
      if (selection.canceled || !selectedPath) {
        return { status: 'cancelled', message: 'Fotoğraf seçimi iptal edildi.' };
      }

      const extension = extname(selectedPath).toLowerCase();
      const mimeType = extension === '.png'
        ? 'image/png' as const
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg' as const
          : null;
      if (!mimeType) throw new Error('Yalnız PNG ve JPEG gözlem fotoğrafları desteklenir.');

      const statistics = await fs.stat(selectedPath);
      if (!statistics.isFile()) throw new Error('Seçilen yol normal bir dosya değil.');
      if (statistics.size <= 0 || statistics.size > MAX_OBSERVATION_PHOTO_BYTES) {
        throw new Error('Gözlem fotoğrafı boş olamaz ve 25 MB sınırını aşamaz.');
      }

      const bytes = await fs.readFile(selectedPath);
      const image = nativeImage.createFromBuffer(bytes);
      if (image.isEmpty()) throw new Error('Seçilen dosya geçerli bir görüntü olarak çözümlenemedi.');
      const size = image.getSize();
      if (!Number.isInteger(size.width) || !Number.isInteger(size.height) ||
        size.width < 1 || size.height < 1 || size.width > 100_000 || size.height > 100_000) {
        throw new Error('Görüntü piksel boyutları desteklenen aralığın dışında.');
      }

      const sha256 = createHash('sha256').update(bytes).digest('hex');
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

'''
text = replace_once(
    text,
    "  ipcMain.handle(\n    'terrain:import-csv',",
    photo_handler + "  ipcMain.handle(\n    'terrain:import-csv',",
    'main photo handler'
)
path.write_text(text)

# preload/index.ts
path = Path('src/preload/index.ts')
text = path.read_text()
text = replace_once(
    text,
    "  ImportExperimentResult,\n  ImportTerrainProfileResult,",
    "  ImportExperimentResult,\n  ImportObservationPhotoResult,\n  ImportTerrainProfileResult,",
    'preload photo import type'
)
text = replace_once(
    text,
    "  exportExperimentReport: (id) =>\n    ipcRenderer.invoke('experiments:report', id) as Promise<FileOperationResult>,\n  importTerrainProfile:",
    "  exportExperimentReport: (id) =>\n    ipcRenderer.invoke('experiments:report', id) as Promise<FileOperationResult>,\n  importObservationPhoto: () =>\n    ipcRenderer.invoke('photo:import') as Promise<ImportObservationPhotoResult>,\n  importTerrainProfile:",
    'preload photo api'
)
path.write_text(text)

# report/html-report.ts
path = Path('src/report/html-report.ts')
text = path.read_text()
text = replace_once(
    text,
    "  'azimuthal-projection': 'Azimutal Gösterim'\n};",
    "  'azimuthal-projection': 'Azimutal Gösterim',\n  'photo-calibration': 'Fotoğraf / Kamera Kalibrasyonu'\n};",
    'report photo model name'
)
photo_report = r'''
function photoCalibrationSection(experiment: SavedExperiment): string {
  const calibration = experiment.photoCalibration;
  if (!calibration) return '';
  const source = calibration.source;
  const cameraRows = calibration.calibration.sourceKind === 'field-of-view'
    ? `<tr><td>Kalibrasyon yöntemi</td><td>Yatay / düşey FOV</td></tr>
       <tr><td>Yatay FOV</td><td>${metricNumberFormatters.degree.format(calibration.calibration.horizontalFovDeg)}°</td></tr>
       <tr><td>Düşey FOV</td><td>${metricNumberFormatters.degree.format(calibration.calibration.verticalFovDeg)}°</td></tr>`
    : `<tr><td>Kalibrasyon yöntemi</td><td>Sensör + odak uzaklığı</td></tr>
       <tr><td>Odak uzaklığı</td><td>${inputNumberFormatter.format(calibration.calibration.focalLengthMm)} mm</td></tr>
       <tr><td>Sensör</td><td>${inputNumberFormatter.format(calibration.calibration.sensorWidthMm)} × ${inputNumberFormatter.format(calibration.calibration.sensorHeightMm)} mm</td></tr>`;
  const markRows = Object.entries({
    'Ufuk / referans sol': calibration.marks.horizonStart,
    'Ufuk / referans sağ': calibration.marks.horizonEnd,
    'Hedef tabanı': calibration.marks.targetBase,
    'Hedef tepesi': calibration.marks.targetTop
  }).map(([label, mark]) => `<tr><td>${escapeHtml(label)}</td><td>${inputNumberFormatter.format(mark.xPx)}, ${inputNumberFormatter.format(mark.yPx)} px${mark.uncertaintyPx === undefined ? '' : ` · ±${inputNumberFormatter.format(mark.uncertaintyPx)} px`}</td></tr>`).join('');

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Fotoğraf kaynak ve işaretleme provenansı</h2><span>Görüntü baytları rapora veya deney JSON’una gömülmez</span></div>
        <strong class="status status-compatible">Kalibrasyon kaydı</strong>
      </header>
      <div class="two-column">
        <div>
          <h3>Kaynak fotoğraf</h3>
          <table><tbody>
            <tr><td>Dosya adı</td><td>${escapeHtml(source.fileName)}</td></tr>
            <tr><td>Görüntü boyutu</td><td>${source.imageWidthPx} × ${source.imageHeightPx} px</td></tr>
            <tr><td>Dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
            <tr><td>MIME</td><td>${escapeHtml(source.mimeType)}</td></tr>
            <tr><td>İçe aktarma</td><td>${formatDate(source.importedAtIso)}</td></tr>
            <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
            ${cameraRows}
            <tr><td>Asal nokta</td><td>${calibration.principalPointXPx === undefined || calibration.principalPointYPx === undefined ? 'Görüntü merkezi (varsayılan)' : `${inputNumberFormatter.format(calibration.principalPointXPx)}, ${inputNumberFormatter.format(calibration.principalPointYPx)} px`}</td></tr>
            <tr><td>Distorsiyon önceden düzeltildi</td><td>${yesNo(calibration.distortionCorrected)}</td></tr>
            <tr><td>Varsayılan işaret belirsizliği</td><td>±${inputNumberFormatter.format(calibration.defaultMarkUncertaintyPx)} px</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>İşaretler</h3>
          <table><tbody>${markRows}</tbody></table>
          <p class="muted">Kalibrasyon kayıt zamanı: ${formatDate(calibration.recordedAtIso)}</p>
          ${calibration.notes ? `<p>${escapeHtml(calibration.notes)}</p>` : ''}
        </div>
      </div>
    </section>`;
}

'''
text = replace_once(
    text,
    "export function createExperimentHtmlReport(\n",
    photo_report + "export function createExperimentHtmlReport(\n",
    'report photo section insertion'
)
text = replace_once(
    text,
    "    ${verticalTerrainSection(experiment, effectiveDistanceKm)}\n    ${experiment.predictions.map((prediction) => predictionSection(",
    "    ${verticalTerrainSection(experiment, effectiveDistanceKm)}\n    ${photoCalibrationSection(experiment)}\n    ${experiment.predictions.map((prediction) => predictionSection(",
    'report render photo section'
)
path.write_text(text)

# renderer AppNext.tsx
path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()
text = replace_once(
    text,
    "} from '../../shared/domain';\nimport {\n  DEFAULT_SIMULATOR_INPUTS,",
    "} from '../../shared/domain';\nimport type { SavedPhotoCalibration } from '../../shared/photo-calibration';\nimport {\n  DEFAULT_SIMULATOR_INPUTS,",
    'app photo shared import'
)
text = replace_once(
    text,
    "import {\n  WATER_SURFACE_APPLICATION_MODEL_ID,",
    "import {\n  PHOTO_CALIBRATION_MODEL_ID,\n  PHOTO_CALIBRATION_MODEL_VERSION,\n  type PhotoCalibrationRecord\n} from '../../simulation/photo-calibration';\nimport {\n  WATER_SURFACE_APPLICATION_MODEL_ID,",
    'app photo model import'
)
text = replace_once(
    text,
    "import { WaterSurfaceControl } from './WaterSurfaceControl';\n",
    "import { WaterSurfaceControl } from './WaterSurfaceControl';\nimport { PhotoCalibrationControl } from './PhotoCalibrationControl';\n",
    'app photo component import'
)
text = replace_once(
    text,
    "interface GeoidConversionRecordState {\n  prediction: ModelPrediction;\n  modelVersion: string;\n}\n",
    "interface GeoidConversionRecordState {\n  prediction: ModelPrediction;\n  modelVersion: string;\n}\n\ninterface PhotoCalibrationRecordState {\n  prediction: ModelPrediction;\n  modelVersion: string;\n}\n",
    'app photo record state interface'
)
text = replace_once(
    text,
    "        <span>Belirsizlik: ±%{numberFormatter.format(inputs.observationUncertaintyPercent)}</span>\n        <button disabled title=\"Fotoğraf kalibrasyon modülü henüz eklenmedi\" type=\"button\">\n          Görsel yükleme yakında\n        </button>\n",
    "        <span>Belirsizlik: ±%{numberFormatter.format(inputs.observationUncertaintyPercent)}</span>\n        <span>Fotoğraf ölçümü aşağıdaki kalibrasyon panelinden eklenebilir.</span>\n",
    'app observation photo message'
)
text = replace_once(
    text,
    "  const [waterObservationRecord, setWaterObservationRecord] = useState<StoredWaterSurfaceRecord>();\n  const [waterApplicationRecord, setWaterApplicationRecord] = useState<StoredWaterSurfaceRecord>();\n",
    "  const [waterObservationRecord, setWaterObservationRecord] = useState<StoredWaterSurfaceRecord>();\n  const [waterApplicationRecord, setWaterApplicationRecord] = useState<StoredWaterSurfaceRecord>();\n  const [photoCalibration, setPhotoCalibration] = useState<SavedPhotoCalibration>();\n  const [photoCalibrationRecord, setPhotoCalibrationRecord] = useState<PhotoCalibrationRecordState>();\n",
    'app photo state'
)
text = replace_once(
    text,
    "    const storedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);\n",
    "    const storedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);\n    const photoPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID\n    );\n",
    'app load photo prediction'
)
text = replace_once(
    text,
    "    setWaterObservationRecord(storedWater.observation);\n    setWaterApplicationRecord(storedWater.application);\n    setActiveExperimentId(saved.id);",
    "    setWaterObservationRecord(storedWater.observation);\n    setWaterApplicationRecord(storedWater.application);\n    setPhotoCalibration(saved.photoCalibration);\n    setPhotoCalibrationRecord(photoPrediction\n      ? {\n          prediction: photoPrediction,\n          modelVersion: saved.modelVersions[PHOTO_CALIBRATION_MODEL_ID] ?? PHOTO_CALIBRATION_MODEL_VERSION\n        }\n      : undefined);\n    setActiveExperimentId(saved.id);",
    'app load photo state'
)
text = replace_once(
    text,
    "      atmosphere: cloneAtmosphereExperimentState(atmosphereState),\n      inputs,",
    "      atmosphere: cloneAtmosphereExperimentState(atmosphereState),\n      ...(photoCalibration ? { photoCalibration } : {}),\n      inputs,",
    'app save photo state'
)
text = replace_once(
    text,
    "        ...(waterApplicationRecord\n          ? [[WATER_SURFACE_APPLICATION_MODEL_ID, waterApplicationRecord.modelVersion] as const]\n          : [])\n      ]),",
    "        ...(waterApplicationRecord\n          ? [[WATER_SURFACE_APPLICATION_MODEL_ID, waterApplicationRecord.modelVersion] as const]\n          : []),\n        ...(photoCalibrationRecord\n          ? [[PHOTO_CALIBRATION_MODEL_ID, photoCalibrationRecord.modelVersion] as const]\n          : [])\n      ]),",
    'app save photo version'
)
text = replace_once(
    text,
    "        ...(waterObservationRecord ? [waterObservationRecord.prediction] : []),\n        ...(waterApplicationRecord ? [waterApplicationRecord.prediction] : [])\n      ]",
    "        ...(waterObservationRecord ? [waterObservationRecord.prediction] : []),\n        ...(waterApplicationRecord ? [waterApplicationRecord.prediction] : []),\n        ...(photoCalibrationRecord ? [photoCalibrationRecord.prediction] : [])\n      ]",
    'app save photo prediction'
)
text = replace_once(
    text,
    "      const savedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);\n",
    "      const savedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);\n      const savedPhotoPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID\n      );\n",
    'app saved photo prediction'
)
text = replace_once(
    text,
    "      setWaterObservationRecord(savedWater.observation);\n      setWaterApplicationRecord(savedWater.application);\n      setIsDirty(false);",
    "      setWaterObservationRecord(savedWater.observation);\n      setWaterApplicationRecord(savedWater.application);\n      setPhotoCalibration(saved.photoCalibration);\n      setPhotoCalibrationRecord(savedPhotoPrediction\n        ? {\n            prediction: savedPhotoPrediction,\n            modelVersion: saved.modelVersions[PHOTO_CALIBRATION_MODEL_ID] ?? PHOTO_CALIBRATION_MODEL_VERSION\n          }\n        : undefined);\n      setIsDirty(false);",
    'app saved photo state'
)
# clear photo state in three reset/new flows
text = text.replace(
    "        setWaterObservationRecord(undefined);\n        setWaterApplicationRecord(undefined);\n        setIsDirty(true);",
    "        setWaterObservationRecord(undefined);\n        setWaterApplicationRecord(undefined);\n        setPhotoCalibration(undefined);\n        setPhotoCalibrationRecord(undefined);\n        setIsDirty(true);",
    1
)
text = text.replace(
    "            setWaterObservationRecord(undefined);\n            setWaterApplicationRecord(undefined);\n            setIsDirty(false);",
    "            setWaterObservationRecord(undefined);\n            setWaterApplicationRecord(undefined);\n            setPhotoCalibration(undefined);\n            setPhotoCalibrationRecord(undefined);\n            setIsDirty(false);",
    1
)
text = text.replace(
    "                setWaterObservationRecord(undefined);\n                setWaterApplicationRecord(undefined);\n                setActiveExperimentId(crypto.randomUUID());",
    "                setWaterObservationRecord(undefined);\n                setWaterApplicationRecord(undefined);\n                setPhotoCalibration(undefined);\n                setPhotoCalibrationRecord(undefined);\n                setActiveExperimentId(crypto.randomUUID());",
    1
)
text = replace_once(
    text,
    "          </div>\n\n          <AtmosphereProfileControl",
    "          </div>\n\n          {activeScenarioId !== 'horizon' && (\n            <PhotoCalibrationControl\n              key={activeExperimentId}\n              experimentId={activeExperimentId}\n              savedCalibration={photoCalibration}\n              savedPrediction={photoCalibrationRecord?.prediction}\n              onSave={(calibration: SavedPhotoCalibration, record: PhotoCalibrationRecord) => {\n                setPhotoCalibration(calibration);\n                setPhotoCalibrationRecord({\n                  prediction: record.prediction,\n                  modelVersion: record.modelVersion\n                });\n                setIsDirty(true);\n                setStorageMessage('Fotoğraf kalibrasyonu deneye eklendi.');\n              }}\n              onClear={() => {\n                setPhotoCalibration(undefined);\n                setPhotoCalibrationRecord(undefined);\n                setIsDirty(true);\n              }}\n            />\n          )}\n\n          <AtmosphereProfileControl",
    'app render photo control'
)
path.write_text(text)

# Remove an unused local introduced in PhotoCalibrationControl.
path = Path('src/renderer/src/PhotoCalibrationControl.tsx')
text = path.read_text()
text = text.replace("  const displayRecord = isDirty ? candidate.record : candidate.record ?? (savedPrediction ? undefined : candidate.record);\n", "")
path.write_text(text)
