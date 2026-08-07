import type {
  CalculationTraceStep,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from '../shared/domain';
import type { PhotoReferenceKind } from '../shared/photo-calibration';
import { PHOTO_CALIBRATION_MODEL_ID } from './photo-calibration';

export const PHOTO_ANGULAR_COMPARISON_MODEL_PREFIX = 'photo-angular-comparison';
export const PHOTO_ANGULAR_COMPARISON_MODEL_VERSION = '0.1.0';
export const PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M = 0.01;

export interface PhotoAngularComparisonInput {
  experimentId: string;
  sourceModelId: string;
  sourceModelName: string;
  modelPrediction: ModelPrediction;
  photoPrediction: ModelPrediction;
  referenceKind?: PhotoReferenceKind;
}

export interface PhotoAngularChannelResult {
  key: 'targetAngularHeight' | 'targetBase' | 'targetTop';
  label: string;
  observedDeg: number;
  uncertaintyDeg: number;
  predictedDeg: number;
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

function compareChannel(
  key: PhotoAngularChannelResult['key'],
  label: string,
  observed: { value: number; uncertainty: number },
  predictedDeg: number
): PhotoAngularChannelResult {
  const differenceDeg = Math.abs(predictedDeg - observed.value);
  return {
    key,
    label,
    observedDeg: observed.value,
    uncertaintyDeg: observed.uncertainty,
    predictedDeg,
    differenceDeg,
    status: differenceDeg <= observed.uncertainty + 1e-12 ? 'compatible' : 'incompatible'
  };
}

function comparisonMetric(
  key: string,
  label: string,
  value: number | null,
  unit: string,
  uncertainty?: number
): PredictionMetric {
  return {
    key,
    label,
    value,
    unit,
    ...(uncertainty === undefined ? {} : { uncertainty })
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

  if (!photoTargetGeometryValid) {
    warnings.push('Fotoğraf hedef açısal yüksekliği pozitif değil; TABAN/TEPE işaretleri düzeltilmeden model karşılaştırması yapılmadı.');
  } else if (input.modelPrediction.status === 'unsupported') {
    warnings.push(`${input.sourceModelName} bu deney için fiziksel açısal tahmin üretmedi.`);
  } else {
    if (observedAngularHeight && predictedAngularHeight !== null && baseVisible && topVisible) {
      channels.push(compareChannel(
        'targetAngularHeight',
        'Hedef açısal yüksekliği',
        observedAngularHeight,
        predictedAngularHeight
      ));
    } else if (observedAngularHeight && !baseVisible) {
      warnings.push('Model hedef tabanını görünür öngörmediği için tam hedef açısal yüksekliği fotoğrafla karşılaştırılmadı.');
    } else if (observedAngularHeight && predictedAngularHeight === null) {
      warnings.push('Model tam hedef açısal yüksekliği tahmini üretmedi.');
    }

    if (referenceKind === 'local-horizontal') {
      if (observedTop && predictedTop !== null && topVisible) {
        channels.push(compareChannel('targetTop', 'Hedef tepe açısı', observedTop, predictedTop));
      } else if (observedTop && !topVisible) {
        warnings.push('Model hedef tepesini görünür öngörmediği için tepe açısı karşılaştırılmadı.');
      }

      if (observedBase && predictedBase !== null && baseVisible) {
        channels.push(compareChannel('targetBase', 'Hedef taban açısı', observedBase, predictedBase));
      } else if (observedBase && !baseVisible) {
        warnings.push('Model hedef tabanını görünür öngörmediği için taban açısı karşılaştırılmadı.');
      }
    } else {
      warnings.push('U1–U2 çizgisi yalnız görsel referans olarak işaretli; taban ve tepe mutlak açıları yerel yatayla doğrudan karşılaştırılmadı.');
    }
  }

  for (const channel of channels) {
    steps.push({
      id: `compare-${channel.key}`,
      title: channel.label,
      formula: '|α_model - α_foto| ≤ u_foto',
      substitution: `|${channel.predictedDeg.toFixed(6)}° - ${channel.observedDeg.toFixed(6)}°| = ${channel.differenceDeg.toFixed(6)}°; u=${channel.uncertaintyDeg.toFixed(6)}°`,
      result: channel.status === 'compatible'
        ? 'Fotoğraf belirsizlik aralığıyla uyumlu'
        : 'Fotoğraf belirsizlik aralığının dışında'
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
      comparisonMetric(`${channel.key}ObservedDeg`, `${channel.label} · fotoğraf`, channel.observedDeg, 'deg', channel.uncertaintyDeg),
      comparisonMetric(`${channel.key}PredictedDeg`, `${channel.label} · model`, channel.predictedDeg, 'deg'),
      comparisonMetric(`${channel.key}DifferenceDeg`, `${channel.label} · mutlak fark`, channel.differenceDeg, 'deg')
    );
  }

  const prediction: ModelPrediction = {
    modelId: comparisonId,
    experimentId: input.experimentId,
    status,
    metrics,
    warnings,
    traceId: `${comparisonId}:${input.experimentId}:${input.photoPrediction.traceId}`,
    trace: {
      summary: `${input.sourceModelName} açısal tahminleri bağımsız fotoğraf kalibrasyonu gözlemiyle karşılaştırıldı.`,
      assumptions: [
        'Fotoğraf kalibrasyonu model tahminini üretmek için kullanılmaz; karşılaştırma sonradan ve tek yönlü yapılır.',
        'Fotoğraf işaret belirsizliği ± sınır olarak kullanılır; bu sürümde model/girdi belirsizliği ayrıca yayılmaz.',
        `Hedef tabanı görünürlük sınıflamasında sayısal çözümle uyumlu ${PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M} m tolerans kullanılır.`,
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
