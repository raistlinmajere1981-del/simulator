from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f'anchor missing: {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))

# Saved experiment uncertainty state.
replace_once(
    'src/shared/simulator.ts',
    "import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';\n",
    "import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';\nimport type { ModelInputUncertaintySettings } from './uncertainty';\n"
)
replace_once(
    'src/shared/simulator.ts',
    "  /** Camera/photo calibration metadata and marks; source image bytes are never embedded here. */\n  photoCalibration?: SavedPhotoCalibration;\n  inputs: SimulatorInputs;",
    "  /** Camera/photo calibration metadata and marks; source image bytes are never embedded here. */\n  photoCalibration?: SavedPhotoCalibration;\n  /** Optional explicit model-input uncertainties used by photo/model angular comparison. */\n  photoModelUncertainty?: ModelInputUncertaintySettings;\n  inputs: SimulatorInputs;"
)

# Photo calibration core: camera parameter uncertainty propagation.
replace_once(
    'src/simulation/photo-calibration.ts',
    "import type { CalculationTrace, ModelPrediction } from '../shared/domain';\n",
    "import type { CalculationTrace, ModelPrediction } from '../shared/domain';\nimport type { CameraCalibrationUncertainty } from '../shared/photo-calibration';\nimport { combineUncertaintyContributions } from '../shared/uncertainty';\n"
)
replace_once(
    'src/simulation/photo-calibration.ts',
    "export const PHOTO_CALIBRATION_MODEL_VERSION = '0.1.1';",
    "export const PHOTO_CALIBRATION_MODEL_VERSION = '0.2.0';"
)
replace_once(
    'src/simulation/photo-calibration.ts',
    "  defaultMarkUncertaintyPx: number;\n  distortionCorrected: boolean;",
    "  defaultMarkUncertaintyPx: number;\n  cameraUncertainty?: CameraCalibrationUncertainty;\n  distortionCorrected: boolean;"
)
replace_once(
    'src/simulation/photo-calibration.ts',
    "  intrinsics: CameraIntrinsics;\n  metrics: PhotoCalibrationMetrics;\n  uncertainty: PhotoCalibrationUncertainty;",
    "  intrinsics: CameraIntrinsics;\n  metrics: PhotoCalibrationMetrics;\n  markUncertainty: PhotoCalibrationUncertainty;\n  cameraUncertainty: PhotoCalibrationUncertainty;\n  uncertainty: PhotoCalibrationUncertainty;"
)

anchor = """function uncertaintyEnvelope(\n  intrinsics: CameraIntrinsics,\n  marks: PhotoCalibrationMarks,\n  defaultMarkUncertaintyPx: number\n): PhotoCalibrationUncertainty {"""
if anchor not in Path('src/simulation/photo-calibration.ts').read_text():
    raise RuntimeError('photo uncertainty anchor missing')

insert_anchor = """export function createPhotoCalibrationRecord(\n  input: PhotoCalibrationInput\n): PhotoCalibrationRecord {"""
helpers = r'''
const PHOTO_UNCERTAINTY_KEYS: Array<keyof PhotoCalibrationUncertainty> = [
  'horizonRollDeg',
  'targetBaseRelativeElevationDeg',
  'targetTopRelativeElevationDeg',
  'targetAngularHeightDeg'
];

function zeroPhotoUncertainty(): PhotoCalibrationUncertainty {
  return {
    horizonRollDeg: 0,
    targetBaseRelativeElevationDeg: 0,
    targetTopRelativeElevationDeg: 0,
    targetAngularHeightDeg: 0
  };
}

function cameraUncertaintyEnvelope(
  input: PhotoCalibrationInput,
  center: PhotoCalibrationMetrics
): PhotoCalibrationUncertainty {
  const settings = input.cameraUncertainty;
  if (!settings) return zeroPhotoUncertainty();
  const buckets: Record<keyof PhotoCalibrationUncertainty, number[]> = {
    horizonRollDeg: [],
    targetBaseRelativeElevationDeg: [],
    targetTopRelativeElevationDeg: [],
    targetAngularHeightDeg: []
  };

  type CameraParameter = keyof Omit<CameraCalibrationUncertainty, 'combination'>;
  const parameters: CameraParameter[] = input.calibration.sourceKind === 'field-of-view'
    ? ['horizontalFovDeg', 'verticalFovDeg', 'principalPointXPx', 'principalPointYPx']
    : ['focalLengthMm', 'sensorWidthMm', 'sensorHeightMm', 'principalPointXPx', 'principalPointYPx'];

  const evaluateVariant = (parameter: CameraParameter, delta: number): PhotoCalibrationMetrics => {
    const calibration = { ...input.calibration } as CameraCalibrationDefinition;
    let principalPointXPx = input.principalPointXPx;
    let principalPointYPx = input.principalPointYPx;
    if (parameter === 'principalPointXPx') {
      principalPointXPx = (input.principalPointXPx ?? (input.imageWidthPx - 1) / 2) + delta;
    } else if (parameter === 'principalPointYPx') {
      principalPointYPx = (input.principalPointYPx ?? (input.imageHeightPx - 1) / 2) + delta;
    } else if (calibration.sourceKind === 'field-of-view' &&
      (parameter === 'horizontalFovDeg' || parameter === 'verticalFovDeg')) {
      calibration[parameter] += delta;
    } else if (calibration.sourceKind === 'sensor-focal' &&
      (parameter === 'focalLengthMm' || parameter === 'sensorWidthMm' || parameter === 'sensorHeightMm')) {
      calibration[parameter] += delta;
    }
    const intrinsics = resolveCameraIntrinsics({
      imageWidthPx: input.imageWidthPx,
      imageHeightPx: input.imageHeightPx,
      ...(principalPointXPx === undefined ? {} : { principalPointXPx }),
      ...(principalPointYPx === undefined ? {} : { principalPointYPx }),
      calibration
    });
    return evaluateMarks(intrinsics, input.marks);
  };

  for (const parameter of parameters) {
    const uncertainty = settings[parameter];
    if (uncertainty === undefined || uncertainty === 0) continue;
    if (!Number.isFinite(uncertainty) || uncertainty < 0) {
      throw new RangeError(`${parameter} belirsizliği negatif olmayan sonlu bir sayı olmalı.`);
    }
    let minus: PhotoCalibrationMetrics;
    let plus: PhotoCalibrationMetrics;
    try {
      minus = evaluateVariant(parameter, -uncertainty);
      plus = evaluateVariant(parameter, uncertainty);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'geçersiz aralık';
      throw new RangeError(`${parameter} ± belirsizlik aralığı geçersiz: ${message}`);
    }
    for (const key of PHOTO_UNCERTAINTY_KEYS) {
      buckets[key].push(Math.max(
        Math.abs(minus[key] - center[key]),
        Math.abs(plus[key] - center[key])
      ));
    }
  }

  return Object.fromEntries(PHOTO_UNCERTAINTY_KEYS.map((key) => [
    key,
    combineUncertaintyContributions(buckets[key], settings.combination)
  ])) as unknown as PhotoCalibrationUncertainty;
}

function combinedPhotoUncertainty(
  mark: PhotoCalibrationUncertainty,
  camera: PhotoCalibrationUncertainty,
  combination: CameraCalibrationUncertainty['combination']
): PhotoCalibrationUncertainty {
  return Object.fromEntries(PHOTO_UNCERTAINTY_KEYS.map((key) => [
    key,
    combineUncertaintyContributions([mark[key], camera[key]], combination)
  ])) as unknown as PhotoCalibrationUncertainty;
}

'''
replace_once('src/simulation/photo-calibration.ts', insert_anchor, helpers + insert_anchor)
replace_once(
    'src/simulation/photo-calibration.ts',
    """  const uncertainty = uncertaintyEnvelope(\n    intrinsics,\n    input.marks,\n    defaultMarkUncertaintyPx\n  );\n\n  const warnings: string[] = [];""",
    """  const markUncertainty = uncertaintyEnvelope(\n    intrinsics,\n    input.marks,\n    defaultMarkUncertaintyPx\n  );\n  const cameraUncertainty = cameraUncertaintyEnvelope(input, metrics);\n  const uncertaintyCombination = input.cameraUncertainty?.combination ?? 'linear-conservative';\n  const uncertainty = combinedPhotoUncertainty(\n    markUncertainty,\n    cameraUncertainty,\n    uncertaintyCombination\n  );\n\n  const warnings: string[] = [];\n  const hasCameraUncertainty = PHOTO_UNCERTAINTY_KEYS.some((key) => cameraUncertainty[key] > 0);\n  if (!hasCameraUncertainty) {\n    warnings.push('Kamera iç-parametre belirsizliği tanımlanmadı; fotoğraf açı zarfı yalnız piksel işaret belirsizliğini içerir.');\n  } else if (uncertaintyCombination === 'rss-independent') {\n    warnings.push('Fotoğraf belirsizlikleri RSS ile birleştirildi; işaret ve kamera parametre katkılarının bağımsız olduğu varsayılmıştır.');\n  }"""
)
replace_once(
    'src/simulation/photo-calibration.ts',
    "'İşaret belirsizliği, x/y piksel uç durumlarının koruyucu zarfıyla yayılmıştır; kamera iç parametre belirsizliği bu sürümde ayrıca modellenmez.'",
    "input.cameraUncertainty\n      ? `İşaret ve kamera iç-parametre belirsizlikleri ${uncertaintyCombination === 'rss-independent' ? 'RSS bağımsızlık varsayımıyla' : 'koruyucu doğrusal toplamla'} birleştirilmiştir.`\n      : 'İşaret belirsizliği x/y piksel uç durumlarının koruyucu zarfıyla yayılmıştır; kamera iç-parametre belirsizliği kullanıcı tarafından tanımlanmamıştır.'"
)
replace_once(
    'src/simulation/photo-calibration.ts',
    """    intrinsics,\n    metrics,\n    uncertainty\n  };""",
    """    intrinsics,\n    metrics,\n    markUncertainty,\n    cameraUncertainty,\n    uncertainty\n  };"""
)

# Photo angular comparison: use combined photo + model input uncertainty.
Path('src/simulation/photo-angular-comparison.ts').write_text(r'''import type {
  CalculationTraceStep,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from '../shared/domain';
import type { PhotoReferenceKind } from '../shared/photo-calibration';
import { combineUncertaintyContributions } from '../shared/uncertainty';
import { PHOTO_CALIBRATION_MODEL_ID } from './photo-calibration';
import type {
  AngularMetricKey,
  ModelAngularUncertaintyResult
} from './photo-model-uncertainty';

export const PHOTO_ANGULAR_COMPARISON_MODEL_PREFIX = 'photo-angular-comparison';
export const PHOTO_ANGULAR_COMPARISON_MODEL_VERSION = '0.2.0';
export const PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M = 0.01;

export interface PhotoAngularComparisonInput {
  experimentId: string;
  sourceModelId: string;
  sourceModelName: string;
  modelPrediction: ModelPrediction;
  photoPrediction: ModelPrediction;
  referenceKind?: PhotoReferenceKind;
  modelUncertainty?: ModelAngularUncertaintyResult;
}

export interface PhotoAngularChannelResult {
  key: 'targetAngularHeight' | 'targetBase' | 'targetTop';
  label: string;
  observedDeg: number;
  photoUncertaintyDeg: number;
  predictedDeg: number;
  modelUncertaintyDeg?: number;
  combinedUncertaintyDeg: number;
  differenceDeg: number;
  status: 'compatible' | 'incompatible';
}

export interface PhotoAngularComparisonResult {
  sourceModelId: string;
  sourceModelName: string;
  referenceKind: PhotoReferenceKind;
  channels: PhotoAngularChannelResult[];
  prediction: ModelPrediction;
  modelVersion: typeof PHOTO_ANGULAR_COMPARISON_MODEL_VERSION;
}

function metric(prediction: ModelPrediction, key: string): PredictionMetric | undefined {
  return prediction.metrics.find((candidate) => candidate.key === key);
}

function finiteMetricValue(prediction: ModelPrediction, key: string): number | null {
  const value = metric(prediction, key)?.value;
  return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
}

function observedMetric(
  prediction: ModelPrediction,
  key: string
): { value: number; uncertainty: number } | null {
  const candidate = metric(prediction, key);
  if (!candidate || candidate.value === null || !Number.isFinite(candidate.value)) return null;
  const uncertainty = candidate.uncertainty ?? 0;
  if (!Number.isFinite(uncertainty) || uncertainty < 0) return null;
  return { value: candidate.value, uncertainty };
}

function comparisonMetric(
  key: string,
  label: string,
  value: number | null,
  unit: string,
  uncertainty?: number
): PredictionMetric {
  return { key, label, value, unit, ...(uncertainty === undefined ? {} : { uncertainty }) };
}

function modelMetricUncertainty(
  result: ModelAngularUncertaintyResult | undefined,
  metricKey: AngularMetricKey
): number | null | undefined {
  if (!result || result.definedParameterCount === 0) return undefined;
  return result.metricUncertaintyDeg[metricKey];
}

function compareChannel(
  key: PhotoAngularChannelResult['key'],
  label: string,
  observed: { value: number; uncertainty: number },
  predictedDeg: number,
  modelMetricKey: AngularMetricKey,
  modelUncertainty: ModelAngularUncertaintyResult | undefined
): PhotoAngularChannelResult | null {
  const modelUncertaintyDeg = modelMetricUncertainty(modelUncertainty, modelMetricKey);
  if (modelUncertaintyDeg === null) return null;
  const combinedUncertaintyDeg = combineUncertaintyContributions(
    [observed.uncertainty, modelUncertaintyDeg ?? 0],
    modelUncertainty?.combination ?? 'linear-conservative'
  );
  const differenceDeg = Math.abs(predictedDeg - observed.value);
  return {
    key,
    label,
    observedDeg: observed.value,
    photoUncertaintyDeg: observed.uncertainty,
    predictedDeg,
    ...(modelUncertaintyDeg === undefined ? {} : { modelUncertaintyDeg }),
    combinedUncertaintyDeg,
    differenceDeg,
    status: differenceDeg <= combinedUncertaintyDeg + 1e-12 ? 'compatible' : 'incompatible'
  };
}

export function photoAngularComparisonModelId(sourceModelId: string): string {
  return `${PHOTO_ANGULAR_COMPARISON_MODEL_PREFIX}:${sourceModelId}`;
}

export function normalizePhotoReferenceKind(
  referenceKind: PhotoReferenceKind | undefined
): PhotoReferenceKind {
  return referenceKind === 'local-horizontal' ? 'local-horizontal' : 'visual-reference';
}

export function comparePhotoAngularObservation(
  input: PhotoAngularComparisonInput
): PhotoAngularComparisonResult {
  if (input.photoPrediction.modelId !== PHOTO_CALIBRATION_MODEL_ID) {
    throw new RangeError('Fotoğraf karşılaştırması için fotoğraf kalibrasyonu tahmini zorunludur.');
  }

  const referenceKind = normalizePhotoReferenceKind(input.referenceKind);
  const comparisonId = photoAngularComparisonModelId(input.sourceModelId);
  const warnings: string[] = [];
  const steps: CalculationTraceStep[] = [];
  const channels: PhotoAngularChannelResult[] = [];

  const observedAngularHeightCandidate = observedMetric(input.photoPrediction, 'targetAngularHeightDeg');
  const photoTargetGeometryValid = observedAngularHeightCandidate === null || observedAngularHeightCandidate.value > 0;
  const observedAngularHeight = photoTargetGeometryValid ? observedAngularHeightCandidate : null;
  const observedBase = observedMetric(input.photoPrediction, 'targetBaseRelativeElevationDeg');
  const observedTop = observedMetric(input.photoPrediction, 'targetTopRelativeElevationDeg');
  const predictedAngularHeight = finiteMetricValue(input.modelPrediction, 'targetAngularHeightDeg');
  const predictedBase = finiteMetricValue(input.modelPrediction, 'targetBaseElevationDeg');
  const predictedTop = finiteMetricValue(input.modelPrediction, 'targetTopElevationDeg');
  const hiddenHeightM = finiteMetricValue(input.modelPrediction, 'hiddenHeightM');
  const visibleFraction = finiteMetricValue(input.modelPrediction, 'visibleFraction');
  const baseVisible = predictedBase !== null && (
    hiddenHeightM === null || hiddenHeightM <= PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M
  );
  const topVisible = predictedTop !== null && (
    visibleFraction === null || visibleFraction > 1e-9
  );

  const addChannel = (
    key: PhotoAngularChannelResult['key'],
    label: string,
    observed: { value: number; uncertainty: number },
    predicted: number,
    modelKey: AngularMetricKey
  ): void => {
    const channel = compareChannel(key, label, observed, predicted, modelKey, input.modelUncertainty);
    if (!channel) {
      warnings.push(`${label} için model belirsizlik aralığında açı kanalı sonlu kalmadı; uyum puanı üretilmedi.`);
      return;
    }
    channels.push(channel);
  };

  if (!photoTargetGeometryValid) {
    warnings.push('Fotoğraf hedef açısal yüksekliği pozitif değil; TABAN/TEPE işaretleri düzeltilmeden model karşılaştırması yapılmadı.');
  } else if (input.modelPrediction.status === 'unsupported') {
    warnings.push(`${input.sourceModelName} bu deney için fiziksel açısal tahmin üretmedi.`);
  } else if (input.modelUncertainty && input.modelUncertainty.definedParameterCount === 0) {
    warnings.push('Model girdi belirsizliği tanımlandı fakat geçerli bir hassasiyet katkısı üretilemedi; karşılaştırma yapılmadı.');
  } else {
    if (observedAngularHeight && predictedAngularHeight !== null && baseVisible && topVisible) {
      addChannel('targetAngularHeight', 'Hedef açısal yüksekliği', observedAngularHeight, predictedAngularHeight, 'targetAngularHeightDeg');
    } else if (observedAngularHeight && !baseVisible) {
      warnings.push('Model hedef tabanını görünür öngörmediği için tam hedef açısal yüksekliği fotoğrafla karşılaştırılmadı.');
    } else if (observedAngularHeight && predictedAngularHeight === null) {
      warnings.push('Model tam hedef açısal yüksekliği tahmini üretmedi.');
    }

    if (referenceKind === 'local-horizontal') {
      if (observedTop && predictedTop !== null && topVisible) {
        addChannel('targetTop', 'Hedef tepe açısı', observedTop, predictedTop, 'targetTopElevationDeg');
      } else if (observedTop && !topVisible) {
        warnings.push('Model hedef tepesini görünür öngörmediği için tepe açısı karşılaştırılmadı.');
      }
      if (observedBase && predictedBase !== null && baseVisible) {
        addChannel('targetBase', 'Hedef taban açısı', observedBase, predictedBase, 'targetBaseElevationDeg');
      } else if (observedBase && !baseVisible) {
        warnings.push('Model hedef tabanını görünür öngörmediği için taban açısı karşılaştırılmadı.');
      }
    } else {
      warnings.push('U1–U2 çizgisi yalnız görsel referans olarak işaretli; taban ve tepe mutlak açıları yerel yatayla doğrudan karşılaştırılmadı.');
    }
  }

  if (!input.modelUncertainty) {
    warnings.push('Model girdi belirsizliği tanımlanmadı; uyum zarfı yalnız fotoğraf kalibrasyonu belirsizliğini içerir.');
  } else {
    warnings.push(...input.modelUncertainty.warnings);
  }

  for (const channel of channels) {
    steps.push({
      id: `compare-${channel.key}`,
      title: channel.label,
      formula: '|α_model - α_foto| ≤ u_birleşik',
      substitution: `|${channel.predictedDeg.toFixed(6)}° - ${channel.observedDeg.toFixed(6)}°| = ${channel.differenceDeg.toFixed(6)}°; u_foto=${channel.photoUncertaintyDeg.toFixed(6)}°; u_model=${(channel.modelUncertaintyDeg ?? 0).toFixed(6)}°; u_birleşik=${channel.combinedUncertaintyDeg.toFixed(6)}°`,
      result: channel.status === 'compatible'
        ? 'Birleşik belirsizlik zarfıyla uyumlu'
        : 'Birleşik belirsizlik zarfının dışında'
    });
  }

  let status: ResultStatus;
  if (!photoTargetGeometryValid) status = 'indeterminate';
  else if (input.modelPrediction.status === 'unsupported') status = 'unsupported';
  else if (channels.length === 0) status = 'indeterminate';
  else status = channels.some((channel) => channel.status === 'incompatible')
    ? 'incompatible'
    : 'compatible';

  const metrics: PredictionMetric[] = [
    comparisonMetric('comparedChannelCount', 'Karşılaştırılan açı kanalı', channels.length, 'count')
  ];
  for (const channel of channels) {
    metrics.push(
      comparisonMetric(`${channel.key}ObservedDeg`, `${channel.label} · fotoğraf`, channel.observedDeg, 'deg', channel.photoUncertaintyDeg),
      comparisonMetric(`${channel.key}PredictedDeg`, `${channel.label} · model`, channel.predictedDeg, 'deg', channel.modelUncertaintyDeg),
      comparisonMetric(`${channel.key}CombinedUncertaintyDeg`, `${channel.label} · birleşik belirsizlik`, channel.combinedUncertaintyDeg, 'deg'),
      comparisonMetric(`${channel.key}DifferenceDeg`, `${channel.label} · mutlak fark`, channel.differenceDeg, 'deg')
    );
  }

  const prediction: ModelPrediction = {
    modelId: comparisonId,
    experimentId: input.experimentId,
    status,
    metrics,
    warnings: [...new Set(warnings)],
    traceId: `${comparisonId}:${input.experimentId}:${input.photoPrediction.traceId}`,
    trace: {
      summary: `${input.sourceModelName} açısal tahminleri bağımsız fotoğraf gözlemi ve tanımlı model-girdi belirsizlikleriyle karşılaştırıldı.`,
      assumptions: [
        'Fotoğraf kalibrasyonu model tahminini üretmek için kullanılmaz; karşılaştırma sonradan ve tek yönlü yapılır.',
        input.modelUncertainty
          ? `Fotoğraf ve model belirsizlikleri ${input.modelUncertainty.combination === 'rss-independent' ? 'RSS bağımsızlık varsayımıyla' : 'koruyucu doğrusal toplamla'} birleştirilmiştir.`
          : 'Model girdi belirsizliği tanımlanmadığından yalnız fotoğraf kalibrasyonu zarfı kullanılmıştır.',
        `Hedef tabanı görünürlük sınıflamasında ${PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M} m sayısal tolerans kullanılır.`,
        referenceKind === 'local-horizontal'
          ? 'U1–U2 referans çizgisinin fiziksel yerel yatayı temsil ettiği kullanıcı tarafından açıkça belirtilmiştir.'
          : 'U1–U2 çizgisinin fiziksel yerel yatay olduğu varsayılmamıştır; yalnız referans-ofsetinden bağımsız açı kanalları karşılaştırılır.',
        'Model hedef tabanını görünmez öngörüyorsa fiziksel taban ve tam hedef açısal yüksekliği için uyum puanı üretilmez.'
      ],
      steps
    }
  };

  return {
    sourceModelId: input.sourceModelId,
    sourceModelName: input.sourceModelName,
    referenceKind,
    channels,
    prediction,
    modelVersion: PHOTO_ANGULAR_COMPARISON_MODEL_VERSION
  };
}
''')

# Portable parser: optional camera/model uncertainty fields without inventing legacy values.
replace_once(
    'src/shared/portable.ts',
    "  type TerrainProfileSource\n} from './simulator';",
    "  type TerrainProfileSource\n} from './simulator';\nimport type { ModelInputUncertaintySettings, UncertaintyCombination } from './uncertainty';"
)
replace_once(
    'src/shared/portable.ts',
    "import type { PhotoCalibrationMarks, PhotoSourceMetadata, SavedPhotoCalibration } from './photo-calibration';",
    "import type { CameraCalibrationUncertainty, PhotoCalibrationMarks, PhotoSourceMetadata, SavedPhotoCalibration } from './photo-calibration';"
)

photo_parser_anchor = "function parsePhotoCalibration(value: unknown): SavedPhotoCalibration | null {"
parser_helpers = r'''
function parseUncertaintyCombination(value: unknown): UncertaintyCombination | null {
  return value === 'linear-conservative' || value === 'rss-independent' ? value : null;
}

function optionalNonNegative(value: unknown, maximum: number): number | undefined | null {
  if (value === undefined) return undefined;
  return inRange(value, 0, maximum) ? value : null;
}

function parseCameraCalibrationUncertainty(value: unknown): CameraCalibrationUncertainty | null {
  if (!isRecord(value)) return null;
  const combination = parseUncertaintyCombination(value.combination);
  if (!combination) return null;
  const horizontalFovDeg = optionalNonNegative(value.horizontalFovDeg, 179);
  const verticalFovDeg = optionalNonNegative(value.verticalFovDeg, 179);
  const focalLengthMm = optionalNonNegative(value.focalLengthMm, 10_000);
  const sensorWidthMm = optionalNonNegative(value.sensorWidthMm, 1_000);
  const sensorHeightMm = optionalNonNegative(value.sensorHeightMm, 1_000);
  const principalPointXPx = optionalNonNegative(value.principalPointXPx, 200_000);
  const principalPointYPx = optionalNonNegative(value.principalPointYPx, 200_000);
  if ([horizontalFovDeg, verticalFovDeg, focalLengthMm, sensorWidthMm, sensorHeightMm, principalPointXPx, principalPointYPx].some((item) => item === null)) return null;
  return {
    combination,
    ...(horizontalFovDeg === undefined ? {} : { horizontalFovDeg }),
    ...(verticalFovDeg === undefined ? {} : { verticalFovDeg }),
    ...(focalLengthMm === undefined ? {} : { focalLengthMm }),
    ...(sensorWidthMm === undefined ? {} : { sensorWidthMm }),
    ...(sensorHeightMm === undefined ? {} : { sensorHeightMm }),
    ...(principalPointXPx === undefined ? {} : { principalPointXPx }),
    ...(principalPointYPx === undefined ? {} : { principalPointYPx })
  };
}

function parseModelInputUncertainty(value: unknown): ModelInputUncertaintySettings | null {
  if (!isRecord(value)) return null;
  const combination = parseUncertaintyCombination(value.combination);
  if (!combination) return null;
  const surfaceDistanceM = optionalNonNegative(value.surfaceDistanceM, 20_000_000);
  const observerEyeHeightM = optionalNonNegative(value.observerEyeHeightM, 100_000);
  const observerGroundElevationM = optionalNonNegative(value.observerGroundElevationM, 100_000);
  const targetHeightM = optionalNonNegative(value.targetHeightM, 100_000);
  const targetGroundElevationM = optionalNonNegative(value.targetGroundElevationM, 100_000);
  const refractionCoefficient = optionalNonNegative(value.refractionCoefficient, 2);
  if ([surfaceDistanceM, observerEyeHeightM, observerGroundElevationM, targetHeightM, targetGroundElevationM, refractionCoefficient].some((item) => item === null)) return null;
  return {
    combination,
    ...(surfaceDistanceM === undefined ? {} : { surfaceDistanceM }),
    ...(observerEyeHeightM === undefined ? {} : { observerEyeHeightM }),
    ...(observerGroundElevationM === undefined ? {} : { observerGroundElevationM }),
    ...(targetHeightM === undefined ? {} : { targetHeightM }),
    ...(targetGroundElevationM === undefined ? {} : { targetGroundElevationM }),
    ...(refractionCoefficient === undefined ? {} : { refractionCoefficient })
  };
}

'''
replace_once('src/shared/portable.ts', photo_parser_anchor, parser_helpers + photo_parser_anchor)
replace_once(
    'src/shared/portable.ts',
    """  const source = parsePhotoSourceMetadata(value.source);\n  if (!source || !isRecord(value.calibration) || !isRecord(value.marks) ||""",
    """  const source = parsePhotoSourceMetadata(value.source);\n  const cameraUncertainty = value.cameraUncertainty === undefined\n    ? undefined\n    : parseCameraCalibrationUncertainty(value.cameraUncertainty);\n  if (cameraUncertainty === null) return null;\n  if (!source || !isRecord(value.calibration) || !isRecord(value.marks) ||"""
)
replace_once(
    'src/shared/portable.ts',
    """    defaultMarkUncertaintyPx: value.defaultMarkUncertaintyPx,\n    distortionCorrected: value.distortionCorrected,""",
    """    defaultMarkUncertaintyPx: value.defaultMarkUncertaintyPx,\n    ...(cameraUncertainty === undefined ? {} : { cameraUncertainty }),\n    distortionCorrected: value.distortionCorrected,"""
)
replace_once(
    'src/shared/portable.ts',
    """  const photoCalibration = value.photoCalibration === undefined\n    ? undefined\n    : parsePhotoCalibration(value.photoCalibration);\n  if (photoCalibration === null) return null;\n\n  return {""",
    """  const photoCalibration = value.photoCalibration === undefined\n    ? undefined\n    : parsePhotoCalibration(value.photoCalibration);\n  if (photoCalibration === null) return null;\n  const photoModelUncertainty = value.photoModelUncertainty === undefined\n    ? undefined\n    : parseModelInputUncertainty(value.photoModelUncertainty);\n  if (photoModelUncertainty === null) return null;\n\n  return {"""
)
replace_once(
    'src/shared/portable.ts',
    """    ...(photoCalibration === undefined ? {} : { photoCalibration }),\n    inputs,""",
    """    ...(photoCalibration === undefined ? {} : { photoCalibration }),\n    ...(photoModelUncertainty === undefined ? {} : { photoModelUncertainty }),\n    inputs,"""
)

# Core regression tests.
Path('tests/photo-model-uncertainty.test.ts').write_text(r'''import { describe, expect, it } from 'vitest';
import { simulationModels } from '../src/models';
import type { ExperimentDefinition } from '../src/shared/domain';
import { propagateModelAngularUncertainty } from '../src/simulation/photo-model-uncertainty';

const experiment: ExperimentDefinition = {
  id: 'uncertainty-exp',
  title: 'uncertainty',
  type: 'target-visibility',
  observer: { latitudeDeg: 0, longitudeDeg: 0, elevationM: 0, eyeHeightM: 10 },
  target: { latitudeDeg: 0, longitudeDeg: 0.1, elevationM: 0, heightM: 15, label: 'target' },
  observedAtIso: '2026-08-08T10:00:00+03:00',
  measurements: {
    surfaceDistanceM: { value: 1000, uncertainty: 0, unit: 'm' },
    visibleFraction: { value: 1, uncertainty: 0.1, unit: 'fraction' }
  }
};

const context = { atmosphereMode: 'standard' as const, refractionCoefficient: 0.13 };

describe('photo model angular uncertainty', () => {
  it('propagates explicit distance/height/k uncertainty into angular metrics', async () => {
    const model = simulationModels[0]!;
    const baseline = await model.predict(experiment, context);
    const result = await propagateModelAngularUncertainty({
      model,
      baselinePrediction: baseline,
      experiment,
      context,
      settings: {
        combination: 'linear-conservative',
        surfaceDistanceM: 5,
        observerEyeHeightM: 0.1,
        targetHeightM: 0.2,
        refractionCoefficient: 0.01
      }
    });
    expect(result.definedParameterCount).toBe(4);
    expect(result.metricUncertaintyDeg.targetTopElevationDeg).toBeGreaterThan(0);
    expect(result.metricUncertaintyDeg.targetAngularHeightDeg).toBeGreaterThan(0);
  });

  it('does not silently apply k uncertainty outside standard atmosphere mode', async () => {
    const model = simulationModels[1]!;
    const offContext = { atmosphereMode: 'off' as const };
    const baseline = await model.predict(experiment, offContext);
    const result = await propagateModelAngularUncertainty({
      model,
      baselinePrediction: baseline,
      experiment,
      context: offContext,
      settings: { combination: 'linear-conservative', refractionCoefficient: 0.01 }
    });
    expect(result.definedParameterCount).toBe(0);
    expect(result.warnings.join(' ')).toContain('Standart k');
  });
});
''')

replace_once(
    'tests/photo-calibration.test.ts',
    """  it('warns instead of silently treating uncorrected lens distortion as calibrated away', () => {""",
    r'''  it('adds explicit camera FOV uncertainty to the photo angle envelope', () => {
    const baseline = createPhotoCalibrationRecord(baseInput());
    const record = createPhotoCalibrationRecord({
      ...baseInput(),
      cameraUncertainty: {
        combination: 'linear-conservative',
        horizontalFovDeg: 0.5,
        verticalFovDeg: 0.5
      }
    });
    expect(record.cameraUncertainty.targetAngularHeightDeg).toBeGreaterThan(0);
    expect(record.uncertainty.targetAngularHeightDeg)
      .toBeGreaterThan(baseline.uncertainty.targetAngularHeightDeg);
    expect(record.prediction.metrics.find((metric) => metric.key === 'targetAngularHeightDeg')?.uncertainty)
      .toBeCloseTo(record.uncertainty.targetAngularHeightDeg, 10);
  });

  it('rejects camera uncertainty intervals that cross invalid calibration values', () => {
    expect(() => createPhotoCalibrationRecord({
      ...baseInput(),
      cameraUncertainty: {
        combination: 'linear-conservative',
        verticalFovDeg: 90
      }
    })).toThrow(/belirsizlik aralığı geçersiz/);
  });

  it('warns instead of silently treating uncorrected lens distortion as calibrated away', () => {'''
)

replace_once(
    'tests/photo-angular-comparison.test.ts',
    """  it('marks a channel incompatible when the model lies outside the photo uncertainty envelope', () => {""",
    r'''  it('combines model-input and photo uncertainty before scoring', () => {
    const model = prediction('defined-plane', [
      { key: 'targetBaseElevationDeg', value: -0.1 },
      { key: 'targetTopElevationDeg', value: 1.2 },
      { key: 'targetAngularHeightDeg', value: 1.3 },
      { key: 'hiddenHeightM', value: 0 },
      { key: 'visibleFraction', value: 1 }
    ]);
    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'defined-plane',
      sourceModelName: 'Tanımlı Düzlem',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'visual-reference',
      modelUncertainty: {
        sourceModelId: 'defined-plane',
        combination: 'linear-conservative',
        definedParameterCount: 1,
        metricUncertaintyDeg: { targetAngularHeightDeg: 0.2 },
        contributions: [],
        warnings: [],
        version: '0.1.0'
      }
    });
    expect(result.channels[0]?.photoUncertaintyDeg).toBeCloseTo(0.15, 10);
    expect(result.channels[0]?.modelUncertaintyDeg).toBeCloseTo(0.2, 10);
    expect(result.channels[0]?.combinedUncertaintyDeg).toBeCloseTo(0.35, 10);
    expect(result.prediction.status).toBe('compatible');
  });

  it('does not score a metric when its model uncertainty crosses an undefined angular state', () => {
    const model = prediction('ideal-sphere', [
      { key: 'targetBaseElevationDeg', value: -0.1 },
      { key: 'targetTopElevationDeg', value: 0.85 },
      { key: 'targetAngularHeightDeg', value: 0.95 },
      { key: 'hiddenHeightM', value: 0 },
      { key: 'visibleFraction', value: 1 }
    ]);
    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'ideal-sphere',
      sourceModelName: 'İdeal Küre',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'visual-reference',
      modelUncertainty: {
        sourceModelId: 'ideal-sphere',
        combination: 'linear-conservative',
        definedParameterCount: 1,
        metricUncertaintyDeg: { targetAngularHeightDeg: null },
        contributions: [],
        warnings: [],
        version: '0.1.0'
      }
    });
    expect(result.channels).toHaveLength(0);
    expect(result.prediction.status).toBe('indeterminate');
  });

  it('marks a channel incompatible when the model lies outside the photo uncertainty envelope', () => {'''
)

# Remove this patch machinery from the product branch before the workflow commit.
Path('scripts/apply_stage_5_4_core.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-5-4-core.yml').unlink(missing_ok=True)
