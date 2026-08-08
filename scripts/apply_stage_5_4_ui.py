from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f'anchor missing: {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# PhotoCalibrationControl: optional camera-parameter uncertainty.
# ---------------------------------------------------------------------------
path = 'src/renderer/src/PhotoCalibrationControl.tsx'
replace_once(
    path,
    """  ImportedObservationPhoto,\n  PhotoCalibrationMarks,""",
    """  CameraCalibrationUncertainty,\n  ImportedObservationPhoto,\n  PhotoCalibrationMarks,"""
)
replace_once(
    path,
    """  defaultMarkUncertaintyPx: string;\n  distortionCorrected: boolean;""",
    """  defaultMarkUncertaintyPx: string;\n  cameraUncertaintyCombination: CameraCalibrationUncertainty['combination'];\n  horizontalFovUncertaintyDeg: string;\n  verticalFovUncertaintyDeg: string;\n  focalLengthUncertaintyMm: string;\n  sensorWidthUncertaintyMm: string;\n  sensorHeightUncertaintyMm: string;\n  principalPointXUncertaintyPx: string;\n  principalPointYUncertaintyPx: string;\n  distortionCorrected: boolean;"""
)
replace_once(
    path,
    """    defaultMarkUncertaintyPx: '1',\n    distortionCorrected: false,""",
    """    defaultMarkUncertaintyPx: '1',\n    cameraUncertaintyCombination: 'linear-conservative',\n    horizontalFovUncertaintyDeg: '',\n    verticalFovUncertaintyDeg: '',\n    focalLengthUncertaintyMm: '',\n    sensorWidthUncertaintyMm: '',\n    sensorHeightUncertaintyMm: '',\n    principalPointXUncertaintyPx: '',\n    principalPointYUncertaintyPx: '',\n    distortionCorrected: false,"""
)
replace_once(
    path,
    """    defaultMarkUncertaintyPx: String(saved.defaultMarkUncertaintyPx),\n    distortionCorrected: saved.distortionCorrected,""",
    """    defaultMarkUncertaintyPx: String(saved.defaultMarkUncertaintyPx),\n    cameraUncertaintyCombination: saved.cameraUncertainty?.combination ?? 'linear-conservative',\n    horizontalFovUncertaintyDeg: saved.cameraUncertainty?.horizontalFovDeg === undefined ? '' : String(saved.cameraUncertainty.horizontalFovDeg),\n    verticalFovUncertaintyDeg: saved.cameraUncertainty?.verticalFovDeg === undefined ? '' : String(saved.cameraUncertainty.verticalFovDeg),\n    focalLengthUncertaintyMm: saved.cameraUncertainty?.focalLengthMm === undefined ? '' : String(saved.cameraUncertainty.focalLengthMm),\n    sensorWidthUncertaintyMm: saved.cameraUncertainty?.sensorWidthMm === undefined ? '' : String(saved.cameraUncertainty.sensorWidthMm),\n    sensorHeightUncertaintyMm: saved.cameraUncertainty?.sensorHeightMm === undefined ? '' : String(saved.cameraUncertainty.sensorHeightMm),\n    principalPointXUncertaintyPx: saved.cameraUncertainty?.principalPointXPx === undefined ? '' : String(saved.cameraUncertainty.principalPointXPx),\n    principalPointYUncertaintyPx: saved.cameraUncertainty?.principalPointYPx === undefined ? '' : String(saved.cameraUncertainty.principalPointYPx),\n    distortionCorrected: saved.distortionCorrected,"""
)

helper_anchor = """function sourceMetadata(photo: ImportedObservationPhoto): PhotoSourceMetadata {"""
helper = r'''function uncertaintyDraftNumber(value: string, label: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new RangeError(`${label} belirsizliği negatif olmayan sayısal bir değer olmalı.`);
  }
  return parsed;
}

function cameraUncertaintyFromDraft(draft: DraftState): CameraCalibrationUncertainty | undefined {
  const common = {
    principalPointXPx: uncertaintyDraftNumber(draft.principalPointXUncertaintyPx, 'Asal nokta X'),
    principalPointYPx: uncertaintyDraftNumber(draft.principalPointYUncertaintyPx, 'Asal nokta Y')
  };
  const sourceSpecific = draft.calibrationSource === 'field-of-view'
    ? {
        horizontalFovDeg: uncertaintyDraftNumber(draft.horizontalFovUncertaintyDeg, 'Yatay FOV'),
        verticalFovDeg: uncertaintyDraftNumber(draft.verticalFovUncertaintyDeg, 'Düşey FOV')
      }
    : {
        focalLengthMm: uncertaintyDraftNumber(draft.focalLengthUncertaintyMm, 'Odak uzaklığı'),
        sensorWidthMm: uncertaintyDraftNumber(draft.sensorWidthUncertaintyMm, 'Sensör genişliği'),
        sensorHeightMm: uncertaintyDraftNumber(draft.sensorHeightUncertaintyMm, 'Sensör yüksekliği')
      };
  const values = [...Object.values(common), ...Object.values(sourceSpecific)];
  if (values.every((value) => value === undefined)) return undefined;
  return {
    combination: draft.cameraUncertaintyCombination,
    ...Object.fromEntries(Object.entries({ ...common, ...sourceSpecific }).filter(([, value]) => value !== undefined))
  } as CameraCalibrationUncertainty;
}

'''
replace_once(path, helper_anchor, helper + helper_anchor)

replace_once(
    path,
    """    try {\n      const record = createPhotoCalibrationRecord({""",
    """    try {\n      const cameraUncertainty = cameraUncertaintyFromDraft(draft);\n      const record = createPhotoCalibrationRecord({"""
)
replace_once(
    path,
    """        marks: draft.marks,\n        defaultMarkUncertaintyPx,\n        distortionCorrected: draft.distortionCorrected,""",
    """        marks: draft.marks,\n        defaultMarkUncertaintyPx,\n        ...(cameraUncertainty === undefined ? {} : { cameraUncertainty }),\n        distortionCorrected: draft.distortionCorrected,"""
)

replace_once(
    path,
    """    const calibration = draft.calibrationSource === 'field-of-view'\n      ? {""",
    """    const cameraUncertainty = cameraUncertaintyFromDraft(draft);\n    const calibration = draft.calibrationSource === 'field-of-view'\n      ? {"""
)
replace_once(
    path,
    """      defaultMarkUncertaintyPx,\n      distortionCorrected: draft.distortionCorrected,""",
    """      defaultMarkUncertaintyPx,\n      ...(cameraUncertainty === undefined ? {} : { cameraUncertainty }),\n      distortionCorrected: draft.distortionCorrected,"""
)
replace_once(
    path,
    """      marks: saved.marks,\n      defaultMarkUncertaintyPx: saved.defaultMarkUncertaintyPx,\n      distortionCorrected: saved.distortionCorrected,""",
    """      marks: saved.marks,\n      defaultMarkUncertaintyPx: saved.defaultMarkUncertaintyPx,\n      ...(saved.cameraUncertainty === undefined ? {} : { cameraUncertainty: saved.cameraUncertainty }),\n      distortionCorrected: saved.distortionCorrected,"""
)

camera_ui_anchor = """          {(candidate.error || (savedCalibration && isDirty)) && ("""
camera_ui = r'''          <div className="photo-camera-uncertainty">
            <div className="photo-camera-uncertainty-heading">
              <div>
                <span className="eyebrow">Kamera iç-parametre belirsizliği</span>
                <strong>Opsiyonel ± aralıklar</strong>
              </div>
              <select
                value={draft.cameraUncertaintyCombination}
                onChange={(event) => updateDraft(
                  'cameraUncertaintyCombination',
                  event.currentTarget.value as CameraCalibrationUncertainty['combination']
                )}
              >
                <option value="linear-conservative">Koruyucu doğrusal toplam</option>
                <option value="rss-independent">RSS · bağımsız bileşenler</option>
              </select>
            </div>
            <p>
              Boş alan “belirsizlik tanımlanmadı” demektir. Kamera için ölçmediğin ± değerleri doldurma;
              uygulama varsayımsal hata payı üretmez.
            </p>
            <div className="photo-camera-grid photo-camera-uncertainty-grid">
              {draft.calibrationSource === 'field-of-view' ? (
                <>
                  <label><span>Yatay FOV ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.horizontalFovUncertaintyDeg} onChange={(event) => updateDraft('horizontalFovUncertaintyDeg', event.currentTarget.value)} /><em>°</em></div></label>
                  <label><span>Düşey FOV ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.verticalFovUncertaintyDeg} onChange={(event) => updateDraft('verticalFovUncertaintyDeg', event.currentTarget.value)} /><em>°</em></div></label>
                </>
              ) : (
                <>
                  <label><span>Odak uzaklığı ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.focalLengthUncertaintyMm} onChange={(event) => updateDraft('focalLengthUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                  <label><span>Sensör genişliği ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.sensorWidthUncertaintyMm} onChange={(event) => updateDraft('sensorWidthUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                  <label><span>Sensör yüksekliği ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.sensorHeightUncertaintyMm} onChange={(event) => updateDraft('sensorHeightUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                </>
              )}
              <label><span>Asal nokta X ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.principalPointXUncertaintyPx} onChange={(event) => updateDraft('principalPointXUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
              <label><span>Asal nokta Y ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.principalPointYUncertaintyPx} onChange={(event) => updateDraft('principalPointYUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
            </div>
            {draft.cameraUncertaintyCombination === 'rss-independent' && (
              <p className="photo-warning">RSS seçimi kamera belirsizlik bileşenlerinin bağımsız olduğu varsayımını gerektirir.</p>
            )}
          </div>

'''
replace_once(path, camera_ui_anchor, camera_ui + camera_ui_anchor)

# CSS for camera uncertainty section.
p = Path('src/renderer/src/photo-calibration-control.css')
css = p.read_text()
css += r'''

.photo-camera-uncertainty {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #2d5260;
  border-radius: 6px;
  background: rgba(17, 42, 52, .42);
}

.photo-camera-uncertainty-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.photo-camera-uncertainty-heading > div {
  display: grid;
  gap: 2px;
}

.photo-camera-uncertainty-heading strong {
  color: #c9dde5;
  font-size: 12px;
}

.photo-camera-uncertainty-heading select {
  min-width: 220px;
  height: 31px;
  border: 1px solid #335363;
  border-radius: 4px;
  background: #0e1c26;
  color: #cbdce4;
  padding: 0 8px;
}

.photo-camera-uncertainty > p {
  margin: 0 0 8px;
  color: #7f97a3;
  font-size: 10px;
  line-height: 1.4;
}

.photo-camera-uncertainty-grid {
  margin-top: 0;
}
'''
p.write_text(css)

# ---------------------------------------------------------------------------
# AppNext: async model-input uncertainty propagation and persistence.
# ---------------------------------------------------------------------------
path = 'src/renderer/src/AppNext.tsx'
replace_once(
    path,
    """import type { SavedPhotoCalibration } from '../../shared/photo-calibration';\n""",
    """import type { SavedPhotoCalibration } from '../../shared/photo-calibration';\nimport {\n  DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS,\n  hasDefinedModelInputUncertainty,\n  type ModelInputUncertaintySettings\n} from '../../shared/uncertainty';\n"""
)
replace_once(
    path,
    """  normalizePhotoReferenceKind\n} from '../../simulation/photo-angular-comparison';\n""",
    """  normalizePhotoReferenceKind\n} from '../../simulation/photo-angular-comparison';\nimport {\n  propagateModelAngularUncertainty,\n  type ModelAngularUncertaintyResult\n} from '../../simulation/photo-model-uncertainty';\n"""
)
replace_once(
    path,
    """import { PhotoAngularComparisonPanel } from './PhotoAngularComparisonPanel';\n""",
    """import { PhotoAngularComparisonPanel } from './PhotoAngularComparisonPanel';\nimport { PhotoModelUncertaintyControl } from './PhotoModelUncertaintyControl';\n"""
)
replace_once(
    path,
    """  const [photoCalibrationRecord, setPhotoCalibrationRecord] = useState<PhotoCalibrationRecordState>();\n  const [runs, setRuns] = useState<ModelRun[]>([]);""",
    """  const [photoCalibrationRecord, setPhotoCalibrationRecord] = useState<PhotoCalibrationRecordState>();\n  const [photoModelUncertainty, setPhotoModelUncertainty] = useState<ModelInputUncertaintySettings>(() => ({\n    ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS\n  }));\n  const [modelAngularUncertaintyById, setModelAngularUncertaintyById] = useState<Record<string, ModelAngularUncertaintyResult>>({});\n  const [isAngularUncertaintyCalculating, setIsAngularUncertaintyCalculating] = useState(false);\n  const [modelUncertaintyError, setModelUncertaintyError] = useState<string>();\n  const [runs, setRuns] = useState<ModelRun[]>([]);"""
)

comparison_anchor = """  const photoReferenceKind = normalizePhotoReferenceKind(photoCalibration?.referenceKind);\n  const photoAngularComparisons = useMemo(() => {"""
effect = r'''  const modelInputUncertaintyDefined = hasDefinedModelInputUncertainty(photoModelUncertainty);

  useEffect(() => {
    if (!photoCalibrationRecord || !modelInputUncertaintyDefined || runs.length === 0) {
      setModelAngularUncertaintyById({});
      setIsAngularUncertaintyCalculating(false);
      setModelUncertaintyError(undefined);
      return;
    }

    let cancelled = false;
    setIsAngularUncertaintyCalculating(true);
    setModelUncertaintyError(undefined);
    const timer = window.setTimeout(() => {
      void Promise.all(simulationModels.map(async (model) => {
        const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
        if (!run || run.prediction.status === 'unsupported') return undefined;
        const result = await propagateModelAngularUncertainty({
          model,
          baselinePrediction: run.prediction,
          experiment,
          context,
          settings: photoModelUncertainty
        });
        return [model.metadata.id, result] as const;
      })).then((entries) => {
        if (cancelled) return;
        setModelAngularUncertaintyById(Object.fromEntries(
          entries.filter((entry): entry is readonly [string, ModelAngularUncertaintyResult] => entry !== undefined)
        ));
        setIsAngularUncertaintyCalculating(false);
      }).catch((error: unknown) => {
        if (cancelled) return;
        setModelAngularUncertaintyById({});
        setModelUncertaintyError(error instanceof Error ? error.message : 'Model belirsizliği yayılamadı.');
        setIsAngularUncertaintyCalculating(false);
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [context, experiment, modelInputUncertaintyDefined, photoCalibrationRecord, photoModelUncertainty, runs]);

  const modelUncertaintyReady = !modelInputUncertaintyDefined || (
    !isAngularUncertaintyCalculating &&
    modelUncertaintyError === undefined &&
    runs.filter((run) => run.prediction.status !== 'unsupported').every(
      (run) => modelAngularUncertaintyById[run.metadata.id] !== undefined
    )
  );

'''
replace_once(path, comparison_anchor, effect + comparison_anchor)
replace_once(
    path,
    """    if (!photoCalibrationRecord) return [];\n    return runs.map((run) => comparePhotoAngularObservation({""",
    """    if (!photoCalibrationRecord || !modelUncertaintyReady) return [];\n    return runs.map((run) => comparePhotoAngularObservation({"""
)
replace_once(
    path,
    """      photoPrediction: photoCalibrationRecord.prediction,\n      referenceKind: photoReferenceKind\n    }));\n  }, [activeExperimentId, photoCalibrationRecord, photoReferenceKind, runs]);""",
    """      photoPrediction: photoCalibrationRecord.prediction,\n      referenceKind: photoReferenceKind,\n      ...(modelInputUncertaintyDefined && modelAngularUncertaintyById[run.metadata.id]\n        ? { modelUncertainty: modelAngularUncertaintyById[run.metadata.id] }\n        : {})\n    }));\n  }, [activeExperimentId, modelAngularUncertaintyById, modelInputUncertaintyDefined, modelUncertaintyReady, photoCalibrationRecord, photoReferenceKind, runs]);"""
)

# Load/save/reopen state.
replace_once(
    path,
    """    setPhotoCalibration(saved.photoCalibration);\n    setPhotoCalibrationRecord(photoPrediction""",
    """    setPhotoCalibration(saved.photoCalibration);\n    setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n    setPhotoCalibrationRecord(photoPrediction"""
)
replace_once(
    path,
    """      atmosphere: cloneAtmosphereExperimentState(atmosphereState),\n      ...(photoCalibration ? { photoCalibration } : {}),\n      inputs,""",
    """      atmosphere: cloneAtmosphereExperimentState(atmosphereState),\n      ...(photoCalibration ? { photoCalibration } : {}),\n      ...(photoCalibration && modelInputUncertaintyDefined ? { photoModelUncertainty } : {}),\n      inputs,"""
)
replace_once(
    path,
    """  const saveExperiment = async (name: string): Promise<void> => {\n    const now = new Date().toISOString();""",
    """  const saveExperiment = async (name: string): Promise<void> => {\n    if (!modelUncertaintyReady) {\n      setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan deney kaydedilmedi.');\n      return;\n    }\n    const now = new Date().toISOString();"""
)
# The same setPhotoCalibration appears a second time in save result; replace next occurrence now.
replace_once(
    path,
    """      setPhotoCalibration(saved.photoCalibration);\n      setPhotoCalibrationRecord(savedPhotoPrediction""",
    """      setPhotoCalibration(saved.photoCalibration);\n      setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n      setPhotoCalibrationRecord(savedPhotoPrediction"""
)

# Resets and scenario transitions: each clear sequence gets uncertainty reset too.
text = Path(path).read_text()
text = text.replace(
    """        setPhotoCalibration(undefined);\n        setPhotoCalibrationRecord(undefined);""",
    """        setPhotoCalibration(undefined);\n        setPhotoCalibrationRecord(undefined);\n        setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n        setModelAngularUncertaintyById({});\n        setModelUncertaintyError(undefined);"""
)
text = text.replace(
    """            setPhotoCalibration(undefined);\n            setPhotoCalibrationRecord(undefined);""",
    """            setPhotoCalibration(undefined);\n            setPhotoCalibrationRecord(undefined);\n            setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n            setModelAngularUncertaintyById({});\n            setModelUncertaintyError(undefined);"""
)
text = text.replace(
    """                setPhotoCalibration(undefined);\n                setPhotoCalibrationRecord(undefined);""",
    """                setPhotoCalibration(undefined);\n                setPhotoCalibrationRecord(undefined);\n                setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n                setModelAngularUncertaintyById({});\n                setModelUncertaintyError(undefined);"""
)
Path(path).write_text(text)

# Clear photo should also clear hidden model uncertainty settings.
replace_once(
    path,
    """              onClear={() => {\n                setPhotoCalibration(undefined);\n                setPhotoCalibrationRecord(undefined);\n                setIsDirty(true);\n              }}""",
    """              onClear={() => {\n                setPhotoCalibration(undefined);\n                setPhotoCalibrationRecord(undefined);\n                setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n                setModelAngularUncertaintyById({});\n                setModelUncertaintyError(undefined);\n                setIsDirty(true);\n              }}"""
)

# Render uncertainty controls immediately before the comparison table.
replace_once(
    path,
    """          <PhotoAngularComparisonPanel\n            comparisons={photoAngularComparisons}\n            referenceKind={photoReferenceKind}\n          />""",
    """          {photoCalibrationRecord && (\n            <PhotoModelUncertaintyControl\n              settings={photoModelUncertainty}\n              atmosphereMode={atmosphereState.mode}\n              isCalculating={isAngularUncertaintyCalculating}\n              error={modelUncertaintyError}\n              onChange={(settings) => {\n                setPhotoModelUncertainty(settings);\n                setIsDirty(true);\n              }}\n            />\n          )}\n\n          <PhotoAngularComparisonPanel\n            comparisons={photoAngularComparisons}\n            referenceKind={photoReferenceKind}\n          />"""
)

# ---------------------------------------------------------------------------
# Report: show camera and model uncertainty provenance.
# ---------------------------------------------------------------------------
path = 'src/report/html-report.ts'
replace_once(
    path,
    """  const markRows = Object.entries({""",
    r'''  const cameraUncertaintyRows = calibration.cameraUncertainty
    ? Object.entries({
        'Yatay FOV ±': calibration.cameraUncertainty.horizontalFovDeg === undefined ? undefined : `${metricNumberFormatters.degree.format(calibration.cameraUncertainty.horizontalFovDeg)}°`,
        'Düşey FOV ±': calibration.cameraUncertainty.verticalFovDeg === undefined ? undefined : `${metricNumberFormatters.degree.format(calibration.cameraUncertainty.verticalFovDeg)}°`,
        'Odak uzaklığı ±': calibration.cameraUncertainty.focalLengthMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.focalLengthMm)} mm`,
        'Sensör genişliği ±': calibration.cameraUncertainty.sensorWidthMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.sensorWidthMm)} mm`,
        'Sensör yüksekliği ±': calibration.cameraUncertainty.sensorHeightMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.sensorHeightMm)} mm`,
        'Asal nokta X ±': calibration.cameraUncertainty.principalPointXPx === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.principalPointXPx)} px`,
        'Asal nokta Y ±': calibration.cameraUncertainty.principalPointYPx === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.principalPointYPx)} px`
      }).filter(([, value]) => value !== undefined).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')
    : '<tr><td>Kamera iç-parametre belirsizliği</td><td>Tanımlanmadı</td></tr>';
  const cameraCombinationRow = calibration.cameraUncertainty
    ? `<tr><td>Kamera belirsizlik birleşimi</td><td>${calibration.cameraUncertainty.combination === 'rss-independent' ? 'RSS · bağımsız bileşenler' : 'Koruyucu doğrusal toplam'}</td></tr>`
    : '';
  const markRows = Object.entries({'''
)
replace_once(
    path,
    """            ${cameraRows}\n            <tr><td>Asal nokta</td>""",
    """            ${cameraRows}\n            ${cameraCombinationRow}\n            ${cameraUncertaintyRows}\n            <tr><td>Asal nokta</td>"""
)

report_helper_anchor = """export function createExperimentHtmlReport("""
report_helper = r'''
function photoModelUncertaintySection(experiment: SavedExperiment): string {
  const settings = experiment.photoModelUncertainty;
  if (!settings) return '';
  const rows = Object.entries({
    'Etkin yüzey mesafesi ±': settings.surfaceDistanceM === undefined ? undefined : `${inputNumberFormatter.format(settings.surfaceDistanceM)} m`,
    'Göz yüksekliği ±': settings.observerEyeHeightM === undefined ? undefined : `${inputNumberFormatter.format(settings.observerEyeHeightM)} m`,
    'Gözlemci zemin kotu ±': settings.observerGroundElevationM === undefined ? undefined : `${inputNumberFormatter.format(settings.observerGroundElevationM)} m`,
    'Hedef yüksekliği ±': settings.targetHeightM === undefined ? undefined : `${inputNumberFormatter.format(settings.targetHeightM)} m`,
    'Hedef taban kotu ±': settings.targetGroundElevationM === undefined ? undefined : `${inputNumberFormatter.format(settings.targetGroundElevationM)} m`,
    'Kırılma katsayısı k ±': settings.refractionCoefficient === undefined ? undefined : inputNumberFormatter.format(settings.refractionCoefficient)
  }).filter(([, value]) => value !== undefined).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Fotoğraf / model belirsizlik ayarları</h2><span>Nominal model girdilerini değiştirmeyen hassasiyet aralıkları</span></div>
        <strong class="status status-compatible">${settings.combination === 'rss-independent' ? 'RSS' : 'Koruyucu toplam'}</strong>
      </header>
      <p>Boş bırakılan bileşenler sıfır belirsizlik sayılmaz; bu raporda yalnız kullanıcı tarafından açıkça tanımlanan ± aralıklar listelenir.</p>
      <table><tbody>${rows || '<tr><td colspan="2">Model girdi belirsizliği tanımlanmadı.</td></tr>'}</tbody></table>
    </section>`;
}

'''
replace_once(path, report_helper_anchor, report_helper + report_helper_anchor)
replace_once(
    path,
    """    ${photoCalibrationSection(experiment)}\n    ${experiment.predictions.map""",
    """    ${photoCalibrationSection(experiment)}\n    ${photoModelUncertaintySection(experiment)}\n    ${experiment.predictions.map"""
)

# ---------------------------------------------------------------------------
# Persistence/report regression coverage.
# ---------------------------------------------------------------------------
path = 'tests/photo-calibration-persistence.test.ts'
replace_once(
    path,
    """  defaultMarkUncertaintyPx: 1.5,\n  distortionCorrected: false,""",
    """  defaultMarkUncertaintyPx: 1.5,\n  cameraUncertainty: {\n    combination: 'linear-conservative',\n    horizontalFovDeg: 0.4,\n    verticalFovDeg: 0.3,\n    principalPointXPx: 0.5,\n    principalPointYPx: 0.5\n  },\n  distortionCorrected: false,"""
)
replace_once(
    path,
    """    defaultMarkUncertaintyPx: calibration.defaultMarkUncertaintyPx,\n    distortionCorrected: calibration.distortionCorrected,""",
    """    defaultMarkUncertaintyPx: calibration.defaultMarkUncertaintyPx,\n    cameraUncertainty: calibration.cameraUncertainty,\n    distortionCorrected: calibration.distortionCorrected,"""
)
replace_once(
    path,
    """    photoCalibration: calibration,\n    inputs: { ...DEFAULT_SIMULATOR_INPUTS },""",
    """    photoCalibration: calibration,\n    photoModelUncertainty: {\n      combination: 'linear-conservative',\n      surfaceDistanceM: 5,\n      observerEyeHeightM: 0.1,\n      targetHeightM: 0.2,\n      refractionCoefficient: 0.01\n    },\n    inputs: { ...DEFAULT_SIMULATOR_INPUTS },"""
)
replace_once(
    path,
    """    expect(parsed.photoCalibration?.referenceKind).toBe('local-horizontal');\n    expect(parsed.predictions.find""",
    """    expect(parsed.photoCalibration?.referenceKind).toBe('local-horizontal');\n    expect(parsed.photoCalibration?.cameraUncertainty).toEqual(calibration.cameraUncertainty);\n    expect(parsed.photoModelUncertainty).toEqual(savedExperiment().photoModelUncertainty);\n    expect(parsed.predictions.find"""
)
replace_once(
    path,
    """    expect(report).toContain('Fotoğraf / Kamera Kalibrasyonu');\n    expect(report).not.toContain('data:image');""",
    """    expect(report).toContain('Fotoğraf / Kamera Kalibrasyonu');\n    expect(report).toContain('Kamera belirsizlik birleşimi');\n    expect(report).toContain('Fotoğraf / model belirsizlik ayarları');\n    expect(report).toContain('Etkin yüzey mesafesi ±');\n    expect(report).not.toContain('data:image');"""
)

# ---------------------------------------------------------------------------
# Version and docs.
# ---------------------------------------------------------------------------
path = 'package.json'
text = Path(path).read_text().replace('"version": "1.4.2"', '"version": "1.5.0"', 1)
Path(path).write_text(text)
path = 'src/preload/index.ts'
text = Path(path).read_text().replace("version: '1.4.2'", "version: '1.5.0'", 1)
Path(path).write_text(text)

Path('docs/roadmap-stage-5.4.md').write_text(r'''# Aşama 5.4 — Birleşik Fotoğraf / Model Belirsizlik Zarfı

Sürüm: `1.5.0`

Bu aşamada fotoğraf açısal gözlemi ile fiziksel model tahmininin karşılaştırması, yalnız piksel işaret belirsizliğinden çıkarılıp açıkça tanımlanmış kamera ve model girdi belirsizliklerini de kapsayan bir hassasiyet zarfına genişletildi.

## Bilimsel sınır

- Fotoğraf kalibrasyonu model tahminini üretmek için kullanılmaz; karşılaştırma hâlâ sonradan ve tek yönlüdür.
- Boş belirsizlik alanı `±0` değildir. Ölçülmemiş bir belirsizlik için yazılım varsayımsal sayı üretmez.
- Varsayılan birleşim `koruyucu doğrusal toplam`dır.
- `RSS` yalnız bileşenlerin bağımsız olduğu savunulabiliyorsa kullanıcı tarafından açıkça seçilir ve bu varsayım hesap izinde korunur.
- Model girdi belirsizliği, nominal girdiyi değiştirmez; model her tanımlı parametrenin alt/üst uçlarında ayrıca çözülür ve nominal açıdan en büyük sapma katkı olarak alınır.
- Belirsizlik aralığı bir açı kanalını fiziksel olarak tanımsız duruma geçirirse o kanal için sonlu uyum puanı uydurulmaz.

## Fotoğraf tarafı

Kamera kalibrasyon kaydı isteğe bağlı olarak şu ± aralıkları taşıyabilir:

- yatay/düşey FOV,
- odak uzaklığı,
- sensör genişliği/yüksekliği,
- asal nokta X/Y.

Piksel işaret zarfı ile kamera iç-parametre zarfı seçilen yöntemle birleşir. Fotoğraf dosyası yine deney JSON’una gömülmez.

## Model tarafı

Deney karşılaştırması isteğe bağlı olarak şu girdi belirsizliklerini yayabilir:

- etkin yüzey mesafesi,
- göz yüksekliği,
- gözlemci zemin kotu,
- hedef yüksekliği,
- hedef taban kotu,
- Standart k modunda kırılma katsayısı `k`.

Katmanlı atmosfer sıcaklık/basınç/nem örneklerinin ve ara DEM/terrain örneklerinin doğruluk belirsizlikleri bu sürümde ayrı veri alanlarına sahip değildir; yazılım bunlara sayı uydurmaz ve eksik kapsamı açık uyarı olarak taşır.

## Kayıt ve rapor

Kamera belirsizlikleri fotoğraf kalibrasyon provenansına, model girdi belirsizlikleri deney kaydına eklenir. `.ggl.json` round-trip ve çevrimdışı HTML raporu bu bilgileri korur. Eski kayıtlar belirsizlik alanları olmadan güvenle açılmaya devam eder.
''')

path = 'README.md'
text = Path(path).read_text()
text = text.replace('- [`docs/roadmap-stage-5.3.md`](docs/roadmap-stage-5.3.md)', '- [`docs/roadmap-stage-5.3.md`](docs/roadmap-stage-5.3.md)\n- [`docs/roadmap-stage-5.4.md`](docs/roadmap-stage-5.4.md)', 1)
text = text.replace('Aktif geliştirme sürümü `1.4.2`dir.', 'Aktif geliştirme sürümü `1.5.0`dir.', 1)
text = text.replace('Fotoğraf baytları deney JSON’una gömülmez.', 'Fotoğraf baytları deney JSON’una gömülmez. `1.5.0` ile fotoğraf işaret zarfına isteğe bağlı kamera iç-parametre belirsizlikleri eklenebilir; mesafe, göz/zemin/hedef kotu ve Standart k belirsizlikleri ise modeli nominal girdiden bağımsız alt/üst uçlarda yeniden çözerek fotoğraf karşılaştırmasının birleşik zarfına katılır. Boş belirsizlik alanlarına varsayımsal ± değer atanmaz.', 1)
Path(path).write_text(text)

# Remove patch machinery from the product commit.
Path('scripts/apply_stage_5_4_ui.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-5-4-ui.yml').unlink(missing_ok=True)
