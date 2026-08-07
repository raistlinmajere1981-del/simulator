from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)


# Ideal sphere: expose base/top angular geometry without changing visibility physics.
path = Path('src/models/ideal-sphere.ts')
text = path.read_text()
text = replace_once(text, "version: '0.4.0'", "version: '0.5.0'", 'ideal sphere version')
text = replace_once(
    text,
    """    const targetTopElevationDeg = sphericalElevationAngleDeg(
      surfaceDistanceM,
      observerHeightM,
      targetTopHeightM,
      radiusM
    );
    const curvatureDropM = surfaceDropFromTangentM(surfaceDistanceM, radiusM);""",
    """    const targetBaseElevationDeg = sphericalElevationAngleDeg(
      surfaceDistanceM,
      observerHeightM,
      targetBaseHeightM,
      radiusM
    );
    const targetTopElevationDeg = sphericalElevationAngleDeg(
      surfaceDistanceM,
      observerHeightM,
      targetTopHeightM,
      radiusM
    );
    const targetAngularHeightDeg = targetTopElevationDeg - targetBaseElevationDeg;
    const curvatureDropM = surfaceDropFromTangentM(surfaceDistanceM, radiusM);""",
    'ideal sphere angle metrics calculation'
)
text = replace_once(
    text,
    """        metric('horizonSurfaceDistanceM', 'Yüzey üzerindeki ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
        metric('targetTopElevationDeg', 'Hedef tepe görüş açısı', targetTopElevationDeg, 'deg'),
        metric('curvatureDropM', 'Teğete göre yüzey düşümü', curvatureDropM, 'm'),""",
    """        metric('horizonSurfaceDistanceM', 'Yüzey üzerindeki ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
        metric('targetBaseElevationDeg', 'Hedef taban görüş açısı', targetBaseElevationDeg, 'deg'),
        metric('targetTopElevationDeg', 'Hedef tepe görüş açısı', targetTopElevationDeg, 'deg'),
        metric('targetAngularHeightDeg', 'Tam hedef açısal yüksekliği', targetAngularHeightDeg, 'deg'),
        metric('curvatureDropM', 'Teğete göre yüzey düşümü', curvatureDropM, 'm'),""",
    'ideal sphere angle metrics output'
)
path.write_text(text)


# Defined plane: expose the same angular channels.
path = Path('src/models/defined-plane.ts')
text = path.read_text()
text = replace_once(text, "version: '0.4.0'", "version: '0.5.0'", 'defined plane version')
text = replace_once(
    text,
    """    const targetTopElevationDeg = planarElevationAngleDeg(
      distanceMeasurement.value,
      observerHeightM,
      targetTopHeightM
    );
    const observation = getMeasurement(experiment, 'visibleFraction', 'fraction');""",
    """    const targetBaseElevationDeg = planarElevationAngleDeg(
      distanceMeasurement.value,
      observerHeightM,
      targetBaseHeightM
    );
    const targetTopElevationDeg = planarElevationAngleDeg(
      distanceMeasurement.value,
      observerHeightM,
      targetTopHeightM
    );
    const targetAngularHeightDeg = targetTopElevationDeg - targetBaseElevationDeg;
    const observation = getMeasurement(experiment, 'visibleFraction', 'fraction');""",
    'defined plane angle metrics calculation'
)
text = replace_once(
    text,
    """        metric('horizonSurfaceDistanceM', 'Yüzey üzerindeki ufuk mesafesi', null, 'm'),
        metric('targetTopElevationDeg', 'Hedef tepe görüş açısı', targetTopElevationDeg, 'deg'),
        metric('curvatureDropM', 'Teğete göre yüzey düşümü', 0, 'm'),""",
    """        metric('horizonSurfaceDistanceM', 'Yüzey üzerindeki ufuk mesafesi', null, 'm'),
        metric('targetBaseElevationDeg', 'Hedef taban görüş açısı', targetBaseElevationDeg, 'deg'),
        metric('targetTopElevationDeg', 'Hedef tepe görüş açısı', targetTopElevationDeg, 'deg'),
        metric('targetAngularHeightDeg', 'Tam hedef açısal yüksekliği', targetAngularHeightDeg, 'deg'),
        metric('curvatureDropM', 'Teğete göre yüzey düşümü', 0, 'm'),""",
    'defined plane angle metrics output'
)
path.write_text(text)


# Layered sphere solver: solve the target base only when it is physically visible.
path = Path('src/simulation/layered-sphere-visibility.ts')
text = path.read_text()
text = replace_once(
    text,
    """  targetTopElevationDeg: number | null;
  targetTopTerrainMinimumClearanceM: number | null;""",
    """  targetBaseElevationDeg: number | null;
  targetTopElevationDeg: number | null;
  targetAngularHeightDeg: number | null;
  targetTopTerrainMinimumClearanceM: number | null;""",
    'layered result angle interface'
)
text = replace_once(
    text,
    """  const seeds = [...evaluations, grazing]
    .sort((left, right) => left.angleDeg - right.angleDeg);
  const targetTopRay = targetTopAltitudeM + CLEARANCE_TOLERANCE_M >= minimumVisibleAltitudeM
    ? solveClearRayToAltitude(""",
    """  const seeds = [...evaluations, grazing]
    .sort((left, right) => left.angleDeg - right.angleDeg);
  const targetBaseRay = hiddenHeightM <= CLEARANCE_TOLERANCE_M
    ? solveClearRayToAltitude(
        input,
        input.targetBaseAltitudeM,
        seeds,
        stepM,
        earthRadiusM,
        maxPathLengthM
      )
    : null;
  const targetTopRay = targetTopAltitudeM + CLEARANCE_TOLERANCE_M >= minimumVisibleAltitudeM
    ? solveClearRayToAltitude(""",
    'layered target base solve'
)
text = replace_once(
    text,
    """  for (const item of [...evaluations, grazing, ...(targetTopRay ? [targetTopRay] : [])]) {""",
    """  for (const item of [...evaluations, grazing, ...(targetBaseRay ? [targetBaseRay] : []), ...(targetTopRay ? [targetTopRay] : [])]) {""",
    'layered warning sources'
)
text = replace_once(
    text,
    """    hiddenFraction,
    targetTopElevationDeg: targetTopRay?.angleDeg ?? null,
    targetTopTerrainMinimumClearanceM:""",
    """    hiddenFraction,
    targetBaseElevationDeg: targetBaseRay?.angleDeg ?? null,
    targetTopElevationDeg: targetTopRay?.angleDeg ?? null,
    targetAngularHeightDeg: targetBaseRay && targetTopRay
      ? targetTopRay.angleDeg - targetBaseRay.angleDeg
      : null,
    targetTopTerrainMinimumClearanceM:""",
    'layered result angle output'
)
path.write_text(text)


# Layered model: publish the new solver channels.
path = Path('src/models/ideal-sphere-layered.ts')
text = path.read_text()
text = replace_once(text, "version: '0.5.0'", "version: '0.6.0'", 'layered model version')
text = replace_once(
    text,
    """          metric('horizonSurfaceDistanceM', 'Katmanlı optik ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
          metric('targetTopElevationDeg', 'Hedef tepe optik görüş açısı', visibility.targetTopElevationDeg, 'deg'),
          metric('curvatureDropM', 'Geometrik yüzey düşümü', curvatureDropM, 'm'),""",
    """          metric('horizonSurfaceDistanceM', 'Katmanlı optik ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
          metric('targetBaseElevationDeg', 'Hedef taban optik görüş açısı', visibility.targetBaseElevationDeg, 'deg'),
          metric('targetTopElevationDeg', 'Hedef tepe optik görüş açısı', visibility.targetTopElevationDeg, 'deg'),
          metric('targetAngularHeightDeg', 'Tam hedef optik açısal yüksekliği', visibility.targetAngularHeightDeg, 'deg'),
          metric('curvatureDropM', 'Geometrik yüzey düşümü', curvatureDropM, 'm'),""",
    'layered model angle metrics output'
)
path.write_text(text)


# Portable calibration: preserve explicit reference semantics while keeping legacy absence intact.
path = Path('src/shared/portable.ts')
text = path.read_text()
text = replace_once(
    text,
    """    typeof value.distortionCorrected !== 'boolean' || !isIsoDate(value.recordedAtIso) ||
    (value.notes !== undefined && (typeof value.notes !== 'string' || value.notes.length > 2_000))) {""",
    """    typeof value.distortionCorrected !== 'boolean' || !isIsoDate(value.recordedAtIso) ||
    (value.referenceKind !== undefined && value.referenceKind !== 'visual-reference' && value.referenceKind !== 'local-horizontal') ||
    (value.notes !== undefined && (typeof value.notes !== 'string' || value.notes.length > 2_000))) {""",
    'portable reference validation'
)
text = replace_once(
    text,
    """    marks: { horizonStart, horizonEnd, targetBase, targetTop },
    recordedAtIso: value.recordedAtIso,
    ...(value.notes === undefined || value.notes.trim() === '' ? {} : { notes: value.notes.trim() })""",
    """    marks: { horizonStart, horizonEnd, targetBase, targetTop },
    recordedAtIso: value.recordedAtIso,
    ...(value.referenceKind === undefined ? {} : { referenceKind: value.referenceKind }),
    ...(value.notes === undefined || value.notes.trim() === '' ? {} : { notes: value.notes.trim() })""",
    'portable reference output'
)
path.write_text(text)


# Photo UI: let the user explicitly classify U1-U2. Default remains non-physical visual reference.
path = Path('src/renderer/src/PhotoCalibrationControl.tsx')
text = path.read_text()
text = replace_once(
    text,
    """  PhotoCalibrationMarks,
  PhotoSourceMetadata,
  SavedPhotoCalibration""",
    """  PhotoCalibrationMarks,
  PhotoReferenceKind,
  PhotoSourceMetadata,
  SavedPhotoCalibration""",
    'photo control reference import'
)
text = replace_once(
    text,
    """  defaultMarkUncertaintyPx: string;
  distortionCorrected: boolean;
  marks?: PhotoCalibrationMarks;""",
    """  defaultMarkUncertaintyPx: string;
  distortionCorrected: boolean;
  referenceKind: PhotoReferenceKind;
  marks?: PhotoCalibrationMarks;""",
    'photo control draft reference'
)
text = replace_once(
    text,
    """    defaultMarkUncertaintyPx: '1',
    distortionCorrected: false,
    notes: ''""",
    """    defaultMarkUncertaintyPx: '1',
    distortionCorrected: false,
    referenceKind: 'visual-reference',
    notes: ''""",
    'photo control empty reference'
)
text = replace_once(
    text,
    """    defaultMarkUncertaintyPx: String(saved.defaultMarkUncertaintyPx),
    distortionCorrected: saved.distortionCorrected,
    marks:""",
    """    defaultMarkUncertaintyPx: String(saved.defaultMarkUncertaintyPx),
    distortionCorrected: saved.distortionCorrected,
    referenceKind: saved.referenceKind ?? 'visual-reference',
    marks:""",
    'photo control saved reference'
)
text = replace_once(
    text,
    """      distortionCorrected: draft.distortionCorrected,
      marks: {""",
    """      distortionCorrected: draft.distortionCorrected,
      referenceKind: draft.referenceKind,
      marks: {""",
    'photo control persist reference'
)
text = replace_once(
    text,
    """            <label>
              <span>Kalibrasyon yöntemi</span>
              <select
                value={draft.calibrationSource}
                onChange={(event) => updateDraft('calibrationSource', event.currentTarget.value as CalibrationSource)}
              >
                <option value=\"field-of-view\">Yatay / düşey görüş açısı</option>
                <option value=\"sensor-focal\">Sensör + odak uzaklığı</option>
              </select>
            </label>

            {draft.calibrationSource === 'field-of-view' ? (""",
    """            <label>
              <span>Kalibrasyon yöntemi</span>
              <select
                value={draft.calibrationSource}
                onChange={(event) => updateDraft('calibrationSource', event.currentTarget.value as CalibrationSource)}
              >
                <option value=\"field-of-view\">Yatay / düşey görüş açısı</option>
                <option value=\"sensor-focal\">Sensör + odak uzaklığı</option>
              </select>
            </label>
            <label>
              <span>U1–U2 referans anlamı</span>
              <select
                value={draft.referenceKind}
                onChange={(event) => updateDraft('referenceKind', event.currentTarget.value as PhotoReferenceKind)}
              >
                <option value=\"visual-reference\">Görsel referans · yalnız açısal yükseklik</option>
                <option value=\"local-horizontal\">Fiziksel yerel yatay · taban/tepe de karşılaştır</option>
              </select>
            </label>

            {draft.calibrationSource === 'field-of-view' ? (""",
    'photo control reference selector'
)
path.write_text(text)


# App integration: compute comparisons after model runs, persist snapshots and render panel.
path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()
text = replace_once(
    text,
    """import type { SavedPhotoCalibration } from '../../shared/photo-calibration';""",
    """import type { SavedPhotoCalibration } from '../../shared/photo-calibration';""",
    'app photo import noop'
)
text = replace_once(
    text,
    """import {
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';""",
    """import {
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';
import {
  PHOTO_ANGULAR_COMPARISON_MODEL_VERSION,
  comparePhotoAngularObservation,
  normalizePhotoReferenceKind
} from '../../simulation/photo-angular-comparison';""",
    'app comparison import'
)
text = replace_once(
    text,
    """import { PhotoCalibrationControl } from './PhotoCalibrationControl';
import { WorldModelViewport } from './WorldModelViewport';""",
    """import { PhotoCalibrationControl } from './PhotoCalibrationControl';
import { PhotoAngularComparisonPanel } from './PhotoAngularComparisonPanel';
import { WorldModelViewport } from './WorldModelViewport';""",
    'app comparison panel import'
)
text = replace_once(
    text,
    """  useEffect(() => {
    let cancelled = false;
    setIsCalculating(true);
    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });
    return () => { cancelled = true; };
  }, [context, experiment]);""",
    """  useEffect(() => {
    let cancelled = false;
    setIsCalculating(true);
    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });
    return () => { cancelled = true; };
  }, [context, experiment]);

  const photoReferenceKind = normalizePhotoReferenceKind(photoCalibration?.referenceKind);
  const photoAngularComparisons = useMemo(() => {
    if (!photoCalibrationRecord) return [];
    return runs.map((run) => comparePhotoAngularObservation({
      experimentId: activeExperimentId,
      sourceModelId: run.metadata.id,
      sourceModelName: run.metadata.name,
      modelPrediction: run.prediction,
      photoPrediction: photoCalibrationRecord.prediction,
      referenceKind: photoReferenceKind
    }));
  }, [activeExperimentId, photoCalibrationRecord, photoReferenceKind, runs]);""",
    'app comparison memo'
)
text = replace_once(
    text,
    """        ...(photoCalibrationRecord
          ? [[PHOTO_CALIBRATION_MODEL_ID, photoCalibrationRecord.modelVersion] as const]
          : [])
      ]),""",
    """        ...(photoCalibrationRecord
          ? [[PHOTO_CALIBRATION_MODEL_ID, photoCalibrationRecord.modelVersion] as const]
          : []),
        ...photoAngularComparisons.map((comparison) => [
          comparison.prediction.modelId,
          PHOTO_ANGULAR_COMPARISON_MODEL_VERSION
        ] as const)
      ]),""",
    'app comparison model versions'
)
text = replace_once(
    text,
    """        ...(waterApplicationRecord ? [waterApplicationRecord.prediction] : []),
        ...(photoCalibrationRecord ? [photoCalibrationRecord.prediction] : [])
      ]""",
    """        ...(waterApplicationRecord ? [waterApplicationRecord.prediction] : []),
        ...(photoCalibrationRecord ? [photoCalibrationRecord.prediction] : []),
        ...photoAngularComparisons.map((comparison) => comparison.prediction)
      ]""",
    'app comparison predictions'
)
text = replace_once(
    text,
    """          <div className=\"bottom-grid\">
            <ResultsTable runs={runs} scenarioId={activeScenarioId} onShowTrace={setTraceModelId} />
            <section className=\"notes panel\">""",
    """          <PhotoAngularComparisonPanel
            comparisons={photoAngularComparisons}
            referenceKind={photoReferenceKind}
          />

          <div className=\"bottom-grid\">
            <ResultsTable runs={runs} scenarioId={activeScenarioId} onShowTrace={setTraceModelId} />
            <section className=\"notes panel\">""",
    'app comparison panel render'
)
text = text.replace(
    'Kamera kalibrasyonu ve dalga yüzeyinin rota boyunca dinamik geometrisi henüz hesaba dahil değildir.',
    'Fotoğraf kalibrasyonu bağımsız açısal gözlem kanalı olarak model sonuçlarıyla sonradan karşılaştırılır; dalga yüzeyinin rota boyunca dinamik geometrisi henüz hesaba dahil değildir.',
    1
)
path.write_text(text)


# Report names for persisted comparison snapshots.
path = Path('src/report/html-report.ts')
text = path.read_text()
text = replace_once(
    text,
    """function predictionSection(
  prediction: ModelPrediction,
  modelVersion: string | undefined
): string {
  const modelName = modelNames[prediction.modelId] ?? prediction.modelId;""",
    """function predictionDisplayName(modelId: string): string {
  const comparisonPrefix = 'photo-angular-comparison:';
  if (modelId.startsWith(comparisonPrefix)) {
    const sourceModelId = modelId.slice(comparisonPrefix.length);
    return `Fotoğraf Açısal Karşılaştırması · ${modelNames[sourceModelId] ?? sourceModelId}`;
  }
  return modelNames[modelId] ?? modelId;
}

function predictionSection(
  prediction: ModelPrediction,
  modelVersion: string | undefined
): string {
  const modelName = predictionDisplayName(prediction.modelId);""",
    'report comparison display name'
)
path.write_text(text)
