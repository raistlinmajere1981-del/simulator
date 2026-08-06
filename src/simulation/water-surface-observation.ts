import type { CalculationTrace, ModelPrediction } from '../shared/domain';
import type { VerticalDatumKind } from '../shared/terrain';

export const WATER_SURFACE_OBSERVATION_MODEL_ID = 'water-surface-observation';
export const WATER_SURFACE_OBSERVATION_MODEL_VERSION = '0.1.0';

export type WaterLevelSourceKind =
  | 'manual-observation'
  | 'tide-gauge'
  | 'tide-prediction'
  | 'survey';

export type TidePhase =
  | 'rising'
  | 'falling'
  | 'high-water'
  | 'low-water'
  | 'slack'
  | 'unknown';

export type WaterUncertaintyCombination =
  | 'linear-conservative'
  | 'rss-independent';

export interface WaterSurfaceObservationInput {
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
  uncertaintyCombination?: WaterUncertaintyCombination;
  tidePhase?: TidePhase;
  stationLabel?: string;
  sourceIssuedAtIso?: string;
  notes?: string;
}

export interface WaterSurfaceObservationRecord {
  prediction: ModelPrediction;
  modelVersion: typeof WATER_SURFACE_OBSERVATION_MODEL_VERSION;
  combinedUncertaintyM: number | null;
  lowerWaterSurfaceM: number | null;
  upperWaterSurfaceM: number | null;
}

const explicitOffsetIsoPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function requiredText(value: string, maximumLength: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maximumLength) {
    throw new RangeError(`${label} 1…${maximumLength} karakter olmalı.`);
  }
  return trimmed;
}

function optionalText(
  value: string | undefined,
  maximumLength: number,
  label: string
): string | undefined {
  if (value === undefined || value.trim().length === 0) return undefined;
  return requiredText(value, maximumLength, label);
}

function explicitIso(value: string, label: string): string {
  const trimmed = value.trim();
  if (!explicitOffsetIsoPattern.test(trimmed) || Number.isNaN(Date.parse(trimmed))) {
    throw new RangeError(`${label} saat dilimi içeren geçerli bir ISO tarih olmalı.`);
  }
  return trimmed;
}

function finiteInRange(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} ${minimum}…${maximum} aralığında sonlu olmalı.`);
  }
}

function optionalNonNegative(
  value: number | undefined,
  maximum: number,
  label: string
): number | undefined {
  if (value === undefined) return undefined;
  finiteInRange(value, 0, maximum, label);
  return value;
}

function datumLabel(kind: VerticalDatumKind): string {
  if (kind === 'orthometric-msl') return 'ortometrik / ortalama deniz seviyesi';
  if (kind === 'ellipsoidal-wgs84') return 'WGS84 elipsoidal yükseklik';
  return 'yerel düşey referans';
}

function sourceKindLabel(kind: WaterLevelSourceKind): string {
  if (kind === 'manual-observation') return 'manuel gözlem';
  if (kind === 'tide-gauge') return 'gelgit ölçer';
  if (kind === 'tide-prediction') return 'gelgit tahmini';
  return 'ölçme / nivelman';
}

function tidePhaseLabel(phase: TidePhase | undefined): string {
  if (phase === 'rising') return 'yükseliyor';
  if (phase === 'falling') return 'alçalıyor';
  if (phase === 'high-water') return 'yüksek su';
  if (phase === 'low-water') return 'alçak su';
  if (phase === 'slack') return 'durgun geçiş';
  return 'bilinmiyor';
}

function combineUncertainty(
  waterLevelUncertaintyM: number | undefined,
  waveVerticalUncertaintyM: number | undefined,
  method: WaterUncertaintyCombination
): number | null {
  if (waterLevelUncertaintyM === undefined && waveVerticalUncertaintyM === undefined) {
    return null;
  }
  const water = waterLevelUncertaintyM ?? 0;
  const wave = waveVerticalUncertaintyM ?? 0;
  return method === 'rss-independent'
    ? Math.hypot(water, wave)
    : water + wave;
}

export function createWaterSurfaceObservationRecord(
  input: WaterSurfaceObservationInput
): WaterSurfaceObservationRecord {
  const experimentId = requiredText(input.experimentId, 200, 'Deney kimliği');
  const sourceLabel = requiredText(input.sourceLabel, 160, 'Kaynak etiketi');
  const observedAtIso = explicitIso(input.observedAtIso, 'Gözlem zamanı');
  const recordedAtIso = explicitIso(input.recordedAtIso, 'Kayıt zamanı');
  const sourceIssuedAtIso = input.sourceIssuedAtIso === undefined
    ? undefined
    : explicitIso(input.sourceIssuedAtIso, 'Kaynak yayın zamanı');
  const stationLabel = optionalText(input.stationLabel, 160, 'İstasyon etiketi');
  const notes = optionalText(input.notes, 500, 'Not');
  finiteInRange(input.waterLevelM, -12_000, 12_000, 'Su seviyesi');
  const waterLevelUncertaintyM = optionalNonNegative(
    input.waterLevelUncertaintyM,
    1_000,
    'Su seviyesi belirsizliği'
  );
  const waveVerticalUncertaintyM = optionalNonNegative(
    input.waveVerticalUncertaintyM,
    1_000,
    'Dalga düşey belirsizliği'
  );
  const significantWaveHeightM = optionalNonNegative(
    input.significantWaveHeightM,
    1_000,
    'Anlamlı dalga yüksekliği'
  );
  const method = input.uncertaintyCombination ?? 'linear-conservative';
  const combinedUncertaintyM = combineUncertainty(
    waterLevelUncertaintyM,
    waveVerticalUncertaintyM,
    method
  );
  const lowerWaterSurfaceM = combinedUncertaintyM === null
    ? null
    : input.waterLevelM - combinedUncertaintyM;
  const upperWaterSurfaceM = combinedUncertaintyM === null
    ? null
    : input.waterLevelM + combinedUncertaintyM;

  const warnings: string[] = [];
  if (combinedUncertaintyM === null) {
    warnings.push('Su seviyesi ve dalga için sayısal belirsizlik belirtilmedi.');
  }
  if (waterLevelUncertaintyM === undefined) {
    warnings.push('Su seviyesi ölçüm/tahmin belirsizliği belirtilmedi.');
  }
  if (waveVerticalUncertaintyM === undefined) {
    warnings.push('Dalga kaynaklı düşey belirsizlik belirtilmedi.');
  }
  if (significantWaveHeightM !== undefined && waveVerticalUncertaintyM === undefined) {
    warnings.push('Anlamlı dalga yüksekliği otomatik olarak düşey belirsizliğe çevrilmedi.');
  }
  if (input.sourceKind === 'tide-prediction') {
    warnings.push('Kaynak bir gelgit tahminidir; doğrudan saha ölçümü değildir.');
    if (sourceIssuedAtIso === undefined) {
      warnings.push('Gelgit tahmininin yayın zamanı belirtilmedi.');
    }
  }
  if (input.verticalDatumKind === 'local') {
    warnings.push('Yerel düşey referansın ulusal veya jeodezik datuma bağı belirtilmedi.');
  }
  if (input.tidePhase === undefined || input.tidePhase === 'unknown') {
    warnings.push('Gelgit evresi bilinmiyor.');
  }
  if (method === 'rss-independent') {
    warnings.push('Kök-toplam-kare birleşimi, su seviyesi ve dalga belirsizliklerinin bağımsız olduğu varsayımını kullanır.');
  }

  const assumptions = [
    `Su seviyesi ${datumLabel(input.verticalDatumKind)} datumuna göre yorumlanmıştır.`,
    'Su seviyesi, gözlem anındaki durgun su yüzeyi tahmini olarak ele alınmıştır.',
    'Dalga düşey belirsizliği su seviyesinden ayrı bir bileşen olarak tutulmuştur.',
    method === 'rss-independent'
      ? 'Belirsizlik bileşenleri bağımsız kabul edilerek kök-toplam-kare ile birleştirilmiştir.'
      : 'Belirsizlik bileşenleri koruyucu doğrusal toplamla birleştirilmiştir.',
    'Anlamlı dalga yüksekliği doğrudan görüş geometrisine veya düşey belirsizliğe çevrilmemiştir.'
  ];

  const trace: CalculationTrace = {
    summary: `Su yüzeyi kaydı: ${input.waterLevelM.toFixed(3)} m; ${sourceKindLabel(input.sourceKind)}; ${observedAtIso}.`,
    assumptions,
    steps: [
      {
        id: 'source-time',
        title: 'Kaynak ve gözlem zamanı',
        formula: 'kaynak + gözlem zamanı + düşey datum',
        substitution: `${sourceLabel}; ${observedAtIso}; ${datumLabel(input.verticalDatumKind)}`,
        result: stationLabel === undefined
          ? sourceKindLabel(input.sourceKind)
          : `${sourceKindLabel(input.sourceKind)} · ${stationLabel}`,
        ...(sourceIssuedAtIso === undefined
          ? {}
          : { note: `Kaynak yayın zamanı: ${sourceIssuedAtIso}` })
      },
      {
        id: 'water-level',
        title: 'Anlık su seviyesi',
        formula: 'z_su = ölçülen veya tahmin edilen su seviyesi',
        substitution: `z_su = ${input.waterLevelM.toFixed(6)} m`,
        result: `${input.waterLevelM.toFixed(6)} m`
      },
      {
        id: 'wave-context',
        title: 'Dalga bağlamı',
        formula: 'H_s provenans; u_dalga doğrudan düşey belirsizlik',
        substitution: `H_s = ${significantWaveHeightM === undefined ? 'verilmedi' : `${significantWaveHeightM.toFixed(6)} m`}; u_dalga = ${waveVerticalUncertaintyM === undefined ? 'verilmedi' : `${waveVerticalUncertaintyM.toFixed(6)} m`}`,
        result: `Gelgit evresi: ${tidePhaseLabel(input.tidePhase)}`
      },
      {
        id: 'uncertainty',
        title: 'Birleşik düşey belirsizlik',
        formula: method === 'rss-independent'
          ? 'u_toplam = √(u_su² + u_dalga²)'
          : 'u_toplam = u_su + u_dalga',
        substitution: `u_su = ${waterLevelUncertaintyM === undefined ? '0 (belirtilmedi)' : waterLevelUncertaintyM.toFixed(6)} m; u_dalga = ${waveVerticalUncertaintyM === undefined ? '0 (belirtilmedi)' : waveVerticalUncertaintyM.toFixed(6)} m`,
        result: combinedUncertaintyM === null
          ? 'Hesaplanmadı.'
          : `±${combinedUncertaintyM.toFixed(6)} m`
      },
      {
        id: 'water-envelope',
        title: 'Su yüzeyi düşey aralığı',
        formula: 'z_alt = z_su - u_toplam; z_üst = z_su + u_toplam',
        substitution: combinedUncertaintyM === null
          ? 'u_toplam tanımsız'
          : `z_su = ${input.waterLevelM.toFixed(6)} m; u_toplam = ${combinedUncertaintyM.toFixed(6)} m`,
        result: lowerWaterSurfaceM === null || upperWaterSurfaceM === null
          ? 'Aralık hesaplanmadı.'
          : `${lowerWaterSurfaceM.toFixed(6)}…${upperWaterSurfaceM.toFixed(6)} m`,
        ...(notes === undefined ? {} : { note: notes })
      }
    ]
  };

  const prediction: ModelPrediction = {
    modelId: WATER_SURFACE_OBSERVATION_MODEL_ID,
    experimentId,
    status: combinedUncertaintyM === null ? 'indeterminate' : 'compatible',
    metrics: [
      {
        key: 'waterLevelM',
        label: 'Anlık su seviyesi',
        value: input.waterLevelM,
        unit: 'm',
        ...(waterLevelUncertaintyM === undefined
          ? {}
          : { uncertainty: waterLevelUncertaintyM })
      },
      {
        key: 'waterLevelUncertaintyM',
        label: 'Su seviyesi belirsizliği',
        value: waterLevelUncertaintyM ?? null,
        unit: 'm'
      },
      {
        key: 'waveVerticalUncertaintyM',
        label: 'Dalga düşey belirsizliği',
        value: waveVerticalUncertaintyM ?? null,
        unit: 'm'
      },
      {
        key: 'significantWaveHeightM',
        label: 'Anlamlı dalga yüksekliği',
        value: significantWaveHeightM ?? null,
        unit: 'm'
      },
      {
        key: 'combinedWaterSurfaceUncertaintyM',
        label: 'Birleşik su yüzeyi belirsizliği',
        value: combinedUncertaintyM,
        unit: 'm'
      },
      {
        key: 'lowerWaterSurfaceM',
        label: 'Alt su yüzeyi sınırı',
        value: lowerWaterSurfaceM,
        unit: 'm'
      },
      {
        key: 'upperWaterSurfaceM',
        label: 'Üst su yüzeyi sınırı',
        value: upperWaterSurfaceM,
        unit: 'm'
      }
    ],
    warnings,
    traceId: `water-surface:${recordedAtIso}:${input.sourceKind}`,
    trace
  };

  return {
    prediction,
    modelVersion: WATER_SURFACE_OBSERVATION_MODEL_VERSION,
    combinedUncertaintyM,
    lowerWaterSurfaceM,
    upperWaterSurfaceM
  };
}
