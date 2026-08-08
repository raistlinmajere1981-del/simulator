import type { ModelMetadata, ModelPrediction, ResultStatus, CalculationTrace } from '../shared/domain';
import type { SolarPositionResult } from './solar-position';

export const SHADOW_OBSERVATION_MODEL_ID = 'solar-shadow-observation';
export const SHADOW_OBSERVATION_MODEL_VERSION = '0.1.0';

export interface ShadowObservationSettings {
  gnomonHeightM: number;
  observedShadowLengthM?: number;
  observedShadowLengthUncertaintyM?: number;
  observedShadowAzimuthDeg?: number;
  observedShadowAzimuthUncertaintyDeg?: number;
}

export const DEFAULT_SHADOW_OBSERVATION_SETTINGS: ShadowObservationSettings = {
  gnomonHeightM: 1
};

export interface ShadowObservationResult extends ShadowObservationSettings {
  experimentId: string;
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  solarElevationDeg: number;
  solarAzimuthDeg: number;
  predictedShadowLengthM: number | null;
  predictedShadowAzimuthDeg: number | null;
  impliedObservedSolarElevationDeg: number | null;
  shadowLengthDifferenceM: number | null;
  shadowAzimuthDifferenceDeg: number | null;
  status: ResultStatus;
  traceId: string;
  trace: CalculationTrace;
  warnings: string[];
}

export class ShadowObservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShadowObservationError';
  }
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function normalizeDegrees(valueDeg: number): number {
  return ((valueDeg % 360) + 360) % 360;
}

function circularDifferenceDeg(aDeg: number, bDeg: number): number {
  const raw = Math.abs(normalizeDegrees(aDeg) - normalizeDegrees(bDeg));
  return Math.min(raw, 360 - raw);
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function optionalRange(value: number | undefined, label: string, min: number, max: number): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ShadowObservationError(`${label} ${min} ile ${max} arasında sonlu bir sayı olmalıdır.`);
  }
}

function validateSettings(settings: ShadowObservationSettings): void {
  if (!Number.isFinite(settings.gnomonHeightM) || settings.gnomonHeightM <= 0 || settings.gnomonHeightM > 10_000) {
    throw new ShadowObservationError('Gnomon yüksekliği 0 ile 10.000 m arasında pozitif bir sayı olmalıdır.');
  }
  optionalRange(settings.observedShadowLengthM, 'Gözlenen gölge uzunluğu', 0, 10_000_000);
  optionalRange(settings.observedShadowLengthUncertaintyM, 'Gölge uzunluğu belirsizliği', 0, 1_000_000);
  optionalRange(settings.observedShadowAzimuthDeg, 'Gözlenen gölge azimutu', 0, 360);
  optionalRange(settings.observedShadowAzimuthUncertaintyDeg, 'Gölge azimut belirsizliği', 0, 180);
}

function comparisonStatus(
  lengthDifferenceM: number | null,
  lengthUncertaintyM: number | undefined,
  azimuthDifferenceDeg: number | null,
  azimuthUncertaintyDeg: number | undefined
): ResultStatus {
  const checks: boolean[] = [];
  if (lengthDifferenceM !== null && lengthUncertaintyM !== undefined) {
    checks.push(lengthDifferenceM <= lengthUncertaintyM);
  }
  if (azimuthDifferenceDeg !== null && azimuthUncertaintyDeg !== undefined) {
    checks.push(azimuthDifferenceDeg <= azimuthUncertaintyDeg);
  }
  if (checks.length === 0) return 'indeterminate';
  return checks.every(Boolean) ? 'compatible' : 'incompatible';
}

export function calculateShadowObservation(input: {
  experimentId: string;
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  solarPosition: SolarPositionResult;
  settings: ShadowObservationSettings;
}): ShadowObservationResult {
  validateSettings(input.settings);
  if (input.solarPosition.observedAtIso !== new Date(input.observedAtIso).toISOString()) {
    throw new ShadowObservationError('Gölge hesabı ile Güneş konumu aynı gözlem anını kullanmalıdır.');
  }
  if (Math.abs(input.solarPosition.latitudeDeg - input.latitudeDeg) > 1e-9 ||
      Math.abs(input.solarPosition.longitudeDeg - input.longitudeDeg) > 1e-9) {
    throw new ShadowObservationError('Gölge hesabı ile Güneş konumu aynı WGS84 gözlem noktasını kullanmalıdır.');
  }

  const directSun = input.solarPosition.elevationDeg > 0;
  const elevationRad = input.solarPosition.elevationDeg * DEG_TO_RAD;
  const predictedShadowLengthM = directSun
    ? input.settings.gnomonHeightM / Math.tan(elevationRad)
    : null;
  const predictedShadowAzimuthDeg = directSun
    ? normalizeDegrees(input.solarPosition.azimuthDeg + 180)
    : null;
  const impliedObservedSolarElevationDeg = input.settings.observedShadowLengthM === undefined
    ? null
    : Math.atan2(input.settings.gnomonHeightM, input.settings.observedShadowLengthM) * RAD_TO_DEG;
  const shadowLengthDifferenceM = predictedShadowLengthM === null || input.settings.observedShadowLengthM === undefined
    ? null
    : Math.abs(predictedShadowLengthM - input.settings.observedShadowLengthM);
  const shadowAzimuthDifferenceDeg = predictedShadowAzimuthDeg === null || input.settings.observedShadowAzimuthDeg === undefined
    ? null
    : circularDifferenceDeg(predictedShadowAzimuthDeg, input.settings.observedShadowAzimuthDeg);

  const status = directSun
    ? comparisonStatus(
        shadowLengthDifferenceM,
        input.settings.observedShadowLengthUncertaintyM,
        shadowAzimuthDifferenceDeg,
        input.settings.observedShadowAzimuthUncertaintyDeg
      )
    : 'indeterminate';

  const warnings: string[] = [
    'Gnomonun yerel düşeye dik, ölçüm yüzeyinin yerel yataya paralel olduğu varsayılır.',
    'Güneş yüksekliği geometriktir; atmosferik kırılma ve yerel topoğrafik ufuk uygulanmaz.',
    'Bu astronomik referans tek başına herhangi bir Dünya şekli modelini doğrulamaz.'
  ];
  if (!directSun) warnings.unshift('Güneş geometrik ufkun altında; doğrudan Güneş gölgesi üretilmedi.');
  if ((input.settings.observedShadowLengthM !== undefined && input.settings.observedShadowLengthUncertaintyM === undefined) ||
      (input.settings.observedShadowAzimuthDeg !== undefined && input.settings.observedShadowAzimuthUncertaintyDeg === undefined)) {
    warnings.push('Gözlenen değerlerden en az biri belirsizliği olmadan girildi; bu kanal uyum kararı üretmez.');
  }

  const traceId = `${SHADOW_OBSERVATION_MODEL_ID}:${input.experimentId}:${input.solarPosition.observedAtIso}`;
  const trace: CalculationTrace = {
    summary: 'Geometrik Güneş konumundan dikey gnomonun yerel yatay yüzeydeki beklenen gölge uzunluğu ve yönü hesaplandı; varsa saha ölçümü belirsizlikleriyle karşılaştırıldı.',
    assumptions: [...warnings],
    steps: [
      {
        id: 'shadow-length',
        title: 'Gölge uzunluğu',
        formula: 'L = h / tan(α)',
        substitution: `h=${format(input.settings.gnomonHeightM)} m; α=${format(input.solarPosition.elevationDeg)}°`,
        result: predictedShadowLengthM === null ? 'Güneş ufuk altında; doğrudan gölge tanımsız.' : `L=${format(predictedShadowLengthM)} m`
      },
      {
        id: 'shadow-azimuth',
        title: 'Gölge yönü',
        formula: 'A_gölge = (A_güneş + 180°) mod 360°',
        substitution: `A_güneş=${format(input.solarPosition.azimuthDeg)}°`,
        result: predictedShadowAzimuthDeg === null ? 'Güneş ufuk altında; gölge azimutu tanımsız.' : `A_gölge=${format(predictedShadowAzimuthDeg)}°`
      },
      ...(impliedObservedSolarElevationDeg === null ? [] : [{
        id: 'observed-angle',
        title: 'Ölçülen gölgeden Güneş yüksekliği',
        formula: 'α_obs = atan2(h, L_obs)',
        substitution: `h=${format(input.settings.gnomonHeightM)} m; L_obs=${format(input.settings.observedShadowLengthM!)} m`,
        result: `α_obs=${format(impliedObservedSolarElevationDeg)}°`
      }]),
      ...(shadowLengthDifferenceM === null && shadowAzimuthDifferenceDeg === null ? [] : [{
        id: 'observation-comparison',
        title: 'Saha gözlemi karşılaştırması',
        formula: 'ΔL = |L_model-L_obs|; ΔA = en küçük dairesel açı farkı',
        substitution: `ΔL=${shadowLengthDifferenceM === null ? 'tanımsız' : `${format(shadowLengthDifferenceM)} m`}; ΔA=${shadowAzimuthDifferenceDeg === null ? 'tanımsız' : `${format(shadowAzimuthDifferenceDeg)}°`}`,
        result: status === 'compatible' ? 'Tanımlı belirsizlik kanallarıyla uyumlu.' : status === 'incompatible' ? 'En az bir tanımlı belirsizlik kanalıyla uyumsuz.' : 'Karar için ölçüm belirsizliği yetersiz.'
      }])
    ]
  };

  return {
    ...input.settings,
    experimentId: input.experimentId,
    observedAtIso: input.solarPosition.observedAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    solarElevationDeg: input.solarPosition.elevationDeg,
    solarAzimuthDeg: input.solarPosition.azimuthDeg,
    predictedShadowLengthM,
    predictedShadowAzimuthDeg,
    impliedObservedSolarElevationDeg,
    shadowLengthDifferenceM,
    shadowAzimuthDifferenceDeg,
    status,
    traceId,
    trace,
    warnings
  };
}

export const shadowObservationMetadata: ModelMetadata = {
  id: SHADOW_OBSERVATION_MODEL_ID,
  name: 'Gölge Geometrisi · Astronomik Referans',
  version: SHADOW_OBSERVATION_MODEL_VERSION,
  description: 'Dikey gnomon için geometrik Güneş konumundan gölge uzunluğu/yönü ve isteğe bağlı saha ölçümü karşılaştırması.',
  capabilities: ['shadow-geometry'],
  assumptions: [
    'Gnomon yerel düşeye paralel ve ölçüm yüzeyi yerel yataydır.',
    'Güneş konumu geometrik astronomik referanstır.',
    'Atmosferik kırılma ve topoğrafik ufuk uygulanmaz.'
  ]
};

export function createShadowObservationPrediction(result: ShadowObservationResult): ModelPrediction {
  return {
    modelId: SHADOW_OBSERVATION_MODEL_ID,
    experimentId: result.experimentId,
    status: result.status,
    metrics: [
      { key: 'gnomonHeightM', label: 'Gnomon yüksekliği', value: result.gnomonHeightM, unit: 'm' },
      { key: 'solarElevationDeg', label: 'Geometrik Güneş yüksekliği', value: result.solarElevationDeg, unit: 'deg' },
      { key: 'solarAzimuthDeg', label: 'Güneş azimutu', value: result.solarAzimuthDeg, unit: 'deg' },
      { key: 'predictedShadowLengthM', label: 'Beklenen gölge uzunluğu', value: result.predictedShadowLengthM, unit: 'm' },
      { key: 'predictedShadowAzimuthDeg', label: 'Beklenen gölge azimutu', value: result.predictedShadowAzimuthDeg, unit: 'deg' },
      { key: 'observedShadowLengthM', label: 'Gözlenen gölge uzunluğu', value: result.observedShadowLengthM ?? null, unit: 'm', ...(result.observedShadowLengthUncertaintyM === undefined ? {} : { uncertainty: result.observedShadowLengthUncertaintyM }) },
      { key: 'observedShadowAzimuthDeg', label: 'Gözlenen gölge azimutu', value: result.observedShadowAzimuthDeg ?? null, unit: 'deg', ...(result.observedShadowAzimuthUncertaintyDeg === undefined ? {} : { uncertainty: result.observedShadowAzimuthUncertaintyDeg }) },
      { key: 'impliedObservedSolarElevationDeg', label: 'Gölgeden türetilen Güneş yüksekliği', value: result.impliedObservedSolarElevationDeg, unit: 'deg' },
      { key: 'shadowLengthDifferenceM', label: 'Gölge uzunluğu farkı', value: result.shadowLengthDifferenceM, unit: 'm' },
      { key: 'shadowAzimuthDifferenceDeg', label: 'Gölge yönü farkı', value: result.shadowAzimuthDifferenceDeg, unit: 'deg' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}

export function readShadowObservationSettings(prediction: ModelPrediction | undefined): ShadowObservationSettings {
  if (!prediction || prediction.modelId !== SHADOW_OBSERVATION_MODEL_ID) {
    return { ...DEFAULT_SHADOW_OBSERVATION_SETTINGS };
  }
  const metric = (key: string) => prediction.metrics.find((item) => item.key === key);
  const gnomonHeight = metric('gnomonHeightM')?.value;
  const length = metric('observedShadowLengthM');
  const azimuth = metric('observedShadowAzimuthDeg');
  return {
    gnomonHeightM: typeof gnomonHeight === 'number' && gnomonHeight > 0 ? gnomonHeight : DEFAULT_SHADOW_OBSERVATION_SETTINGS.gnomonHeightM,
    ...(typeof length?.value === 'number' ? { observedShadowLengthM: length.value } : {}),
    ...(typeof length?.uncertainty === 'number' ? { observedShadowLengthUncertaintyM: length.uncertainty } : {}),
    ...(typeof azimuth?.value === 'number' ? { observedShadowAzimuthDeg: azimuth.value } : {}),
    ...(typeof azimuth?.uncertainty === 'number' ? { observedShadowAzimuthUncertaintyDeg: azimuth.uncertainty } : {})
  };
}
