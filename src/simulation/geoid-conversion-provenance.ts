import type { CalculationTrace, ModelPrediction } from '../shared/domain';
import type { ManualTerrainPoint } from '../shared/terrain';
import type { GeoidHeightDatum } from './geoid-height-conversion';
import type { GeoidProfileConversionResult } from './geoid-profile-conversion';

export const GEOID_CONVERSION_MODEL_ID = 'geoid-height-conversion';
export const GEOID_CONVERSION_MODEL_VERSION = '0.2.0';

export interface GeoidConversionProvenanceInput {
  experimentId: string;
  sourceLabel: string;
  sourceModelVersion?: string;
  sourceEpoch?: string;
  appliedAtIso: string;
  geoidUndulationM: number;
  geoidUndulationUncertaintyM?: number;
  result: GeoidProfileConversionResult;
}

export interface GeoidConversionApplication {
  targetDatum: GeoidHeightDatum;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  points: ManualTerrainPoint[];
  prediction: ModelPrediction;
  modelVersion: typeof GEOID_CONVERSION_MODEL_VERSION;
}

function trimmedRequired(value: string, maximumLength: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maximumLength) {
    throw new RangeError(`${label} 1…${maximumLength} karakter olmalı.`);
  }
  return trimmed;
}

function trimmedOptional(
  value: string | undefined,
  maximumLength: number,
  label: string
): string | undefined {
  if (value === undefined || value.trim().length === 0) return undefined;
  return trimmedRequired(value, maximumLength, label);
}

function datumLabel(datum: GeoidHeightDatum): string {
  return datum === 'ellipsoidal-wgs84'
    ? 'WGS84 elipsoidal yükseklik'
    : 'ortometrik / deniz seviyesi yüksekliği';
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} sonlu olmalı.`);
  }
}

export function createGeoidConversionApplication(
  input: GeoidConversionProvenanceInput
): GeoidConversionApplication {
  const experimentId = trimmedRequired(input.experimentId, 200, 'Deney kimliği');
  const sourceLabel = trimmedRequired(input.sourceLabel, 120, 'Kaynak/model etiketi');
  const sourceModelVersion = trimmedOptional(
    input.sourceModelVersion,
    80,
    'Kaynak model sürümü'
  );
  const sourceEpoch = trimmedOptional(input.sourceEpoch, 80, 'Kaynak model epoku');
  if (Number.isNaN(Date.parse(input.appliedAtIso))) {
    throw new RangeError('Dönüşüm zamanı geçerli bir ISO tarih olmalı.');
  }
  finite(input.geoidUndulationM, 'Jeoit ondülasyonu');
  if (input.geoidUndulationUncertaintyM !== undefined) {
    finite(input.geoidUndulationUncertaintyM, 'Jeoit ondülasyonu belirsizliği');
    if (input.geoidUndulationUncertaintyM < 0) {
      throw new RangeError('Jeoit ondülasyonu belirsizliği negatif olamaz.');
    }
  }
  finite(input.result.correctionM, 'Profil düzeltmesi');
  if (input.result.from === input.result.to) {
    throw new RangeError('Provenans için kaynak ve hedef datum farklı olmalı.');
  }

  const convertedPointCount = input.result.points.length + 2;
  const directionFormula = input.result.from === 'ellipsoidal-wgs84'
    ? 'H = h - N'
    : 'h = H + N';
  const uncertaintyLabel = input.geoidUndulationUncertaintyM === undefined
    ? 'verilmedi'
    : `±${input.geoidUndulationUncertaintyM.toFixed(6)} m`;
  const sourceDetail = [
    sourceLabel,
    sourceModelVersion ? `sürüm ${sourceModelVersion}` : undefined,
    sourceEpoch ? `epok ${sourceEpoch}` : undefined
  ].filter((item): item is string => item !== undefined).join(' · ');
  const assumptions = [
    'Jeoit ondülasyonu işaret sözleşmesi N = h - H olarak uygulanmıştır.',
    `Kaynak/model: ${sourceDetail}.`,
    'Aynı jeoit ondülasyonunun gözlemci, hedef ve bütün rota örnekleri için geçerli olduğu kullanıcı tarafından kabul edilmiştir.',
    'Mevcut datum / gelgit ofseti jeoit dönüşümünden ayrı tutulmuştur.',
    'Nokta kimlikleri, rota yüzdeleri ve sırası değiştirilmemiştir.'
  ];
  const warnings = [
    'Kaynak/model etiketi ve girilen jeoit ondülasyonu uygulama tarafından bağımsız olarak doğrulanmadı.',
    'Tek bir N değeri bütün rotaya uygulanmıştır; uzamsal jeoit değişimi modellenmemiştir.'
  ];
  if (sourceModelVersion === undefined) {
    warnings.push('Kaynak jeoit modelinin sürümü belirtilmedi.');
  }
  if (sourceEpoch === undefined) {
    warnings.push('Kaynak jeoit modelinin epoku belirtilmedi.');
  }
  if (input.geoidUndulationUncertaintyM === undefined) {
    warnings.push('Jeoit ondülasyonu belirsizliği belirtilmedi.');
  }

  const trace: CalculationTrace = {
    summary: `${datumLabel(input.result.from)} → ${datumLabel(input.result.to)} profil dönüşümü; ${convertedPointCount} kot birlikte güncellendi.`,
    assumptions,
    steps: [
      {
        id: 'source',
        title: 'Jeoit kaynağı ve zaman',
        formula: 'kaynak + sürüm + epok + uygulama zamanı',
        substitution: sourceDetail,
        result: input.appliedAtIso,
        note: 'Kaynak bilgileri kullanıcı tarafından girilmiştir.'
      },
      {
        id: 'sign-convention',
        title: 'İşaret sözleşmesi ve dönüşüm yönü',
        formula: `N = h - H; ${directionFormula}`,
        substitution: `N = ${input.geoidUndulationM.toFixed(6)} m`,
        result: `${datumLabel(input.result.from)} → ${datumLabel(input.result.to)}`
      },
      {
        id: 'common-correction',
        title: 'Ortak profil düzeltmesi',
        formula: 'z_out = z_in + düzeltme',
        substitution: `düzeltme = ${input.result.correctionM.toFixed(6)} m`,
        result: `${convertedPointCount} kot aynı düzeltmeyle dönüştürüldü.`
      },
      {
        id: 'endpoints',
        title: 'Dönüştürülmüş uç kotları',
        formula: 'gözlemci ve hedef uçlarına ortak düzeltme',
        substitution: `gözlemci = ${input.result.observerGroundElevationM.toFixed(6)} m; hedef = ${input.result.targetGroundElevationM.toFixed(6)} m`,
        result: `${input.result.points.length} ara nokta ile birlikte uygulandı.`
      },
      {
        id: 'uncertainty',
        title: 'Jeoit ondülasyonu belirsizliği',
        formula: 'u_N',
        substitution: uncertaintyLabel,
        result: input.result.uncertaintyM === null
          ? 'Profil belirsizliği hesaplanmadı.'
          : `±${input.result.uncertaintyM.toFixed(6)} m`
      }
    ]
  };
  const prediction: ModelPrediction = {
    modelId: GEOID_CONVERSION_MODEL_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      {
        key: 'geoidUndulationM',
        label: 'Jeoit ondülasyonu N',
        value: input.geoidUndulationM,
        unit: 'm',
        ...(input.geoidUndulationUncertaintyM === undefined
          ? {}
          : { uncertainty: input.geoidUndulationUncertaintyM })
      },
      {
        key: 'geoidUndulationUncertaintyM',
        label: 'Jeoit ondülasyonu belirsizliği',
        value: input.geoidUndulationUncertaintyM ?? null,
        unit: 'm'
      },
      {
        key: 'profileCorrectionM',
        label: 'Bütün kotlara uygulanan düzeltme',
        value: input.result.correctionM,
        unit: 'm'
      },
      {
        key: 'convertedPointCount',
        label: 'Dönüştürülen toplam kot',
        value: convertedPointCount,
        unit: 'count'
      }
    ],
    warnings,
    traceId: `geoid-profile:${input.appliedAtIso}:${input.result.from}:${input.result.to}`,
    trace
  };

  return {
    targetDatum: input.result.to,
    observerGroundElevationM: input.result.observerGroundElevationM,
    targetGroundElevationM: input.result.targetGroundElevationM,
    points: input.result.points.map((point) => ({ ...point })),
    prediction,
    modelVersion: GEOID_CONVERSION_MODEL_VERSION
  };
}
