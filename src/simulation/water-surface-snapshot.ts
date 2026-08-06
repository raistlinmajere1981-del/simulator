import type { CalculationTraceStep, ModelPrediction, PredictionMetric } from '../shared/domain';
import type { VerticalDatumKind } from '../shared/terrain';
import {
  WATER_SURFACE_OBSERVATION_MODEL_ID,
  type TidePhase,
  type WaterLevelSourceKind,
  type WaterUncertaintyCombination
} from './water-surface-observation';

export interface WaterSurfaceObservationSnapshot {
  experimentId: string;
  sourceLabel: string;
  sourceKind: WaterLevelSourceKind;
  observedAtIso: string;
  recordedAtIso: string;
  verticalDatumKind: VerticalDatumKind;
  waterLevelM: number;
  waterLevelUncertaintyM?: number;
  waveVerticalUncertaintyM?: number;
  significantWaveHeightM?: number;
  uncertaintyCombination: WaterUncertaintyCombination;
  tidePhase: TidePhase;
  stationLabel?: string;
  sourceIssuedAtIso?: string;
  notes?: string;
  combinedUncertaintyM: number | null;
  lowerWaterSurfaceM: number | null;
  upperWaterSurfaceM: number | null;
}

export class WaterSurfaceSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaterSurfaceSnapshotError';
  }
}

const explicitOffsetIsoPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

const sourceKinds: WaterLevelSourceKind[] = [
  'manual-observation',
  'tide-gauge',
  'tide-prediction',
  'survey'
];

const datumSuffixes: Array<[string, VerticalDatumKind]> = [
  ['ortometrik / ortalama deniz seviyesi', 'orthometric-msl'],
  ['WGS84 elipsoidal yükseklik', 'ellipsoidal-wgs84'],
  ['yerel düşey referans', 'local']
];

const sourceLabels: Record<WaterLevelSourceKind, string> = {
  'manual-observation': 'manuel gözlem',
  'tide-gauge': 'gelgit ölçer',
  'tide-prediction': 'gelgit tahmini',
  survey: 'ölçme / nivelman'
};

const tidePhaseByLabel: Record<string, TidePhase> = {
  yükseliyor: 'rising',
  alçalıyor: 'falling',
  'yüksek su': 'high-water',
  'alçak su': 'low-water',
  'durgun geçiş': 'slack',
  bilinmiyor: 'unknown'
};

function isExplicitIso(value: string): boolean {
  return explicitOffsetIsoPattern.test(value) && !Number.isNaN(Date.parse(value));
}

function step(prediction: ModelPrediction, id: string): CalculationTraceStep {
  const found = prediction.trace.steps.find((candidate) => candidate.id === id);
  if (!found) {
    throw new WaterSurfaceSnapshotError(`Su yüzeyi kaydında “${id}” hesap adımı bulunamadı.`);
  }
  return found;
}

function metric(prediction: ModelPrediction, key: string): PredictionMetric {
  const found = prediction.metrics.find((candidate) => candidate.key === key);
  if (!found) {
    throw new WaterSurfaceSnapshotError(`Su yüzeyi kaydında “${key}” metriği bulunamadı.`);
  }
  return found;
}

function optionalMetricValue(
  prediction: ModelPrediction,
  key: string
): number | undefined {
  const value = metric(prediction, key).value;
  return value === null ? undefined : value;
}

function nullableMetricValue(
  prediction: ModelPrediction,
  key: string
): number | null {
  return metric(prediction, key).value;
}

function parseTraceId(traceId: string): {
  recordedAtIso: string;
  sourceKind: WaterLevelSourceKind;
} {
  if (!traceId.startsWith('water-surface:')) {
    throw new WaterSurfaceSnapshotError('Su yüzeyi iz kimliği beklenen önekle başlamıyor.');
  }
  for (const sourceKind of sourceKinds) {
    const suffix = `:${sourceKind}`;
    if (!traceId.endsWith(suffix)) continue;
    const recordedAtIso = traceId.slice('water-surface:'.length, -suffix.length);
    if (!isExplicitIso(recordedAtIso)) {
      throw new WaterSurfaceSnapshotError('Su yüzeyi kayıt zamanı geçersiz.');
    }
    return { recordedAtIso, sourceKind };
  }
  throw new WaterSurfaceSnapshotError('Su yüzeyi kaynak türü iz kimliğinden çözülemedi.');
}

function parseSourceTime(prediction: ModelPrediction): {
  sourceLabel: string;
  observedAtIso: string;
  verticalDatumKind: VerticalDatumKind;
  stationLabel?: string;
  sourceIssuedAtIso?: string;
} {
  const sourceStep = step(prediction, 'source-time');
  let verticalDatumKind: VerticalDatumKind | undefined;
  let withoutDatum = sourceStep.substitution;
  for (const [datumLabel, kind] of datumSuffixes) {
    const suffix = `; ${datumLabel}`;
    if (!withoutDatum.endsWith(suffix)) continue;
    verticalDatumKind = kind;
    withoutDatum = withoutDatum.slice(0, -suffix.length);
    break;
  }
  if (!verticalDatumKind) {
    throw new WaterSurfaceSnapshotError('Su yüzeyi düşey datumu hesap izinden çözülemedi.');
  }
  const timeSeparator = withoutDatum.lastIndexOf('; ');
  if (timeSeparator <= 0) {
    throw new WaterSurfaceSnapshotError('Su yüzeyi kaynak etiketi veya gözlem zamanı eksik.');
  }
  const sourceLabel = withoutDatum.slice(0, timeSeparator).trim();
  const observedAtIso = withoutDatum.slice(timeSeparator + 2).trim();
  if (sourceLabel.length === 0 || !isExplicitIso(observedAtIso)) {
    throw new WaterSurfaceSnapshotError('Su yüzeyi kaynak etiketi veya gözlem zamanı geçersiz.');
  }
  const { sourceKind } = parseTraceId(prediction.traceId);
  const sourceKindLabel = sourceLabels[sourceKind];
  const stationPrefix = `${sourceKindLabel} · `;
  const stationLabel = sourceStep.result.startsWith(stationPrefix)
    ? sourceStep.result.slice(stationPrefix.length).trim()
    : undefined;
  const issuedPrefix = 'Kaynak yayın zamanı: ';
  const sourceIssuedAtIso = sourceStep.note?.startsWith(issuedPrefix)
    ? sourceStep.note.slice(issuedPrefix.length).trim()
    : undefined;
  if (sourceIssuedAtIso !== undefined && !isExplicitIso(sourceIssuedAtIso)) {
    throw new WaterSurfaceSnapshotError('Su yüzeyi kaynak yayın zamanı geçersiz.');
  }
  return {
    sourceLabel,
    observedAtIso,
    verticalDatumKind,
    ...(stationLabel === undefined || stationLabel.length === 0 ? {} : { stationLabel }),
    ...(sourceIssuedAtIso === undefined ? {} : { sourceIssuedAtIso })
  };
}

function parseTidePhase(prediction: ModelPrediction): TidePhase {
  const result = step(prediction, 'wave-context').result;
  const prefix = 'Gelgit evresi: ';
  if (!result.startsWith(prefix)) {
    throw new WaterSurfaceSnapshotError('Gelgit evresi hesap izinden çözülemedi.');
  }
  const phase = tidePhaseByLabel[result.slice(prefix.length).trim()];
  if (!phase) {
    throw new WaterSurfaceSnapshotError('Gelgit evresi tanınmıyor.');
  }
  return phase;
}

function parseCombination(prediction: ModelPrediction): WaterUncertaintyCombination {
  const formula = step(prediction, 'uncertainty').formula;
  if (formula === 'u_toplam = u_su + u_dalga') return 'linear-conservative';
  if (formula === 'u_toplam = √(u_su² + u_dalga²)') return 'rss-independent';
  throw new WaterSurfaceSnapshotError('Su yüzeyi belirsizlik birleşim yöntemi tanınmıyor.');
}

function expectedCombined(
  waterLevelUncertaintyM: number | undefined,
  waveVerticalUncertaintyM: number | undefined,
  method: WaterUncertaintyCombination
): number | null {
  if (waterLevelUncertaintyM === undefined && waveVerticalUncertaintyM === undefined) {
    return null;
  }
  const water = waterLevelUncertaintyM ?? 0;
  const wave = waveVerticalUncertaintyM ?? 0;
  return method === 'rss-independent' ? Math.hypot(water, wave) : water + wave;
}

function nearlyEqual(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= Number.EPSILON * scale * 32;
}

function assertDerivedValues(
  waterLevelM: number,
  waterLevelUncertaintyM: number | undefined,
  waveVerticalUncertaintyM: number | undefined,
  method: WaterUncertaintyCombination,
  combinedUncertaintyM: number | null,
  lowerWaterSurfaceM: number | null,
  upperWaterSurfaceM: number | null
): void {
  const expected = expectedCombined(
    waterLevelUncertaintyM,
    waveVerticalUncertaintyM,
    method
  );
  if (expected === null) {
    if (combinedUncertaintyM !== null ||
      lowerWaterSurfaceM !== null || upperWaterSurfaceM !== null) {
      throw new WaterSurfaceSnapshotError('Belirsizliği olmayan kayıtta türetilmiş su yüzeyi aralığı bulunuyor.');
    }
    return;
  }
  if (combinedUncertaintyM === null ||
    lowerWaterSurfaceM === null || upperWaterSurfaceM === null ||
    !nearlyEqual(combinedUncertaintyM, expected) ||
    !nearlyEqual(lowerWaterSurfaceM, waterLevelM - expected) ||
    !nearlyEqual(upperWaterSurfaceM, waterLevelM + expected)) {
    throw new WaterSurfaceSnapshotError('Su yüzeyi kaydındaki birleşik belirsizlik veya düşey aralık tutarsız.');
  }
}

export function decodeWaterSurfaceObservationSnapshot(
  prediction: ModelPrediction
): WaterSurfaceObservationSnapshot {
  if (prediction.modelId !== WATER_SURFACE_OBSERVATION_MODEL_ID) {
    throw new WaterSurfaceSnapshotError('Tahmin bir su yüzeyi gözlem kaydı değil.');
  }
  const { recordedAtIso, sourceKind } = parseTraceId(prediction.traceId);
  const source = parseSourceTime(prediction);
  const waterLevelMetric = metric(prediction, 'waterLevelM');
  if (waterLevelMetric.value === null) {
    throw new WaterSurfaceSnapshotError('Anlık su seviyesi metriği boş olamaz.');
  }
  const waterLevelM = waterLevelMetric.value;
  const waterLevelUncertaintyM = optionalMetricValue(
    prediction,
    'waterLevelUncertaintyM'
  );
  if (waterLevelMetric.uncertainty !== undefined &&
    waterLevelUncertaintyM !== undefined &&
    !nearlyEqual(waterLevelMetric.uncertainty, waterLevelUncertaintyM)) {
    throw new WaterSurfaceSnapshotError('Su seviyesi metriğinin belirsizlik alanları birbiriyle tutarsız.');
  }
  const waveVerticalUncertaintyM = optionalMetricValue(
    prediction,
    'waveVerticalUncertaintyM'
  );
  const significantWaveHeightM = optionalMetricValue(
    prediction,
    'significantWaveHeightM'
  );
  const combinedUncertaintyM = nullableMetricValue(
    prediction,
    'combinedWaterSurfaceUncertaintyM'
  );
  const lowerWaterSurfaceM = nullableMetricValue(prediction, 'lowerWaterSurfaceM');
  const upperWaterSurfaceM = nullableMetricValue(prediction, 'upperWaterSurfaceM');
  const uncertaintyCombination = parseCombination(prediction);
  assertDerivedValues(
    waterLevelM,
    waterLevelUncertaintyM,
    waveVerticalUncertaintyM,
    uncertaintyCombination,
    combinedUncertaintyM,
    lowerWaterSurfaceM,
    upperWaterSurfaceM
  );
  const notes = step(prediction, 'water-envelope').note?.trim();

  return {
    experimentId: prediction.experimentId,
    sourceLabel: source.sourceLabel,
    sourceKind,
    observedAtIso: source.observedAtIso,
    recordedAtIso,
    verticalDatumKind: source.verticalDatumKind,
    waterLevelM,
    ...(waterLevelUncertaintyM === undefined ? {} : { waterLevelUncertaintyM }),
    ...(waveVerticalUncertaintyM === undefined ? {} : { waveVerticalUncertaintyM }),
    ...(significantWaveHeightM === undefined ? {} : { significantWaveHeightM }),
    uncertaintyCombination,
    tidePhase: parseTidePhase(prediction),
    ...(source.stationLabel === undefined ? {} : { stationLabel: source.stationLabel }),
    ...(source.sourceIssuedAtIso === undefined
      ? {}
      : { sourceIssuedAtIso: source.sourceIssuedAtIso }),
    ...(notes === undefined || notes.length === 0 ? {} : { notes }),
    combinedUncertaintyM,
    lowerWaterSurfaceM,
    upperWaterSurfaceM
  };
}
