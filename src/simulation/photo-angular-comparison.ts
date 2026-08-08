import type {
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
