import type { CalculationTrace, ModelMetadata, ModelPrediction, ResultStatus } from '../shared/domain';
import { inverseWgs84Geodesic } from './geodesy';
import { calculateSolarPosition } from './solar-position';
import {
  calculateShadowObservation,
  type ShadowObservationResult,
  type ShadowObservationSettings
} from './shadow-observation';

export const DUAL_SHADOW_COMPARISON_MODEL_ID = 'dual-shadow-comparison';
export const DUAL_SHADOW_COMPARISON_MODEL_VERSION = '0.1.0';

export interface DualShadowStationSettings {
  latitudeDeg: number;
  longitudeDeg: number;
  gnomonHeightM: number;
  observedShadowLengthM?: number;
  observedShadowLengthUncertaintyM?: number;
  observedShadowAzimuthDeg?: number;
  observedShadowAzimuthUncertaintyDeg?: number;
}

export interface DualShadowComparisonSettings {
  stationB: DualShadowStationSettings;
}

export interface DualShadowComparisonResult {
  experimentId: string;
  observedAtIso: string;
  stationA: ShadowObservationResult;
  stationB: ShadowObservationResult;
  separationDistanceM: number;
  initialBearingDeg: number;
  predictedSolarElevationDifferenceDeg: number;
  predictedShadowAzimuthDifferenceDeg: number | null;
  normalizedShadowLengthA: number | null;
  normalizedShadowLengthB: number | null;
  observedSolarElevationDifferenceDeg: number | null;
  observedSolarElevationDifferenceUncertaintyDeg: number | null;
  solarElevationDifferenceResidualDeg: number | null;
  observedShadowAzimuthDifferenceDeg: number | null;
  observedShadowAzimuthDifferenceUncertaintyDeg: number | null;
  shadowAzimuthDifferenceResidualDeg: number | null;
  status: ResultStatus;
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

const RAD_TO_DEG = 180 / Math.PI;

function normalizeDegrees(valueDeg: number): number {
  return ((valueDeg % 360) + 360) % 360;
}

function signedCircularDifferenceDeg(toDeg: number, fromDeg: number): number {
  return ((normalizeDegrees(toDeg) - normalizeDegrees(fromDeg) + 540) % 360) - 180;
}

function circularDifferenceDeg(aDeg: number, bDeg: number): number {
  return Math.abs(signedCircularDifferenceDeg(aDeg, bDeg));
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateStation(station: DualShadowStationSettings, label: string): void {
  if (!Number.isFinite(station.latitudeDeg) || station.latitudeDeg < -90 || station.latitudeDeg > 90) {
    throw new RangeError(`${label} enlemi -90° ile +90° arasında olmalıdır.`);
  }
  if (!Number.isFinite(station.longitudeDeg) || station.longitudeDeg < -180 || station.longitudeDeg > 180) {
    throw new RangeError(`${label} boylamı -180° ile +180° arasında olmalıdır.`);
  }
  if (!Number.isFinite(station.gnomonHeightM) || station.gnomonHeightM <= 0 || station.gnomonHeightM > 10_000) {
    throw new RangeError(`${label} gnomon yüksekliği 0 ile 10.000 m arasında pozitif olmalıdır.`);
  }
}

function asShadowSettings(station: DualShadowStationSettings): ShadowObservationSettings {
  return {
    gnomonHeightM: station.gnomonHeightM,
    ...(station.observedShadowLengthM === undefined ? {} : { observedShadowLengthM: station.observedShadowLengthM }),
    ...(station.observedShadowLengthUncertaintyM === undefined ? {} : { observedShadowLengthUncertaintyM: station.observedShadowLengthUncertaintyM }),
    ...(station.observedShadowAzimuthDeg === undefined ? {} : { observedShadowAzimuthDeg: station.observedShadowAzimuthDeg }),
    ...(station.observedShadowAzimuthUncertaintyDeg === undefined ? {} : { observedShadowAzimuthUncertaintyDeg: station.observedShadowAzimuthUncertaintyDeg })
  };
}

function elevationUncertaintyDeg(
  gnomonHeightM: number,
  observedShadowLengthM: number | undefined,
  observedShadowLengthUncertaintyM: number | undefined
): number | null {
  if (observedShadowLengthM === undefined || observedShadowLengthUncertaintyM === undefined) return null;
  const nominal = Math.atan2(gnomonHeightM, observedShadowLengthM) * RAD_TO_DEG;
  const lowLength = Math.max(0, observedShadowLengthM - observedShadowLengthUncertaintyM);
  const highLength = observedShadowLengthM + observedShadowLengthUncertaintyM;
  const highAngle = Math.atan2(gnomonHeightM, lowLength) * RAD_TO_DEG;
  const lowAngle = Math.atan2(gnomonHeightM, highLength) * RAD_TO_DEG;
  return Math.max(Math.abs(highAngle - nominal), Math.abs(nominal - lowAngle));
}

function comparisonStatus(checks: boolean[]): ResultStatus {
  if (checks.length === 0) return 'indeterminate';
  return checks.every(Boolean) ? 'compatible' : 'incompatible';
}

export function createDefaultDualShadowComparisonSettings(
  primaryLatitudeDeg: number,
  primaryLongitudeDeg: number
): DualShadowComparisonSettings {
  return {
    stationB: {
      latitudeDeg: primaryLatitudeDeg,
      longitudeDeg: primaryLongitudeDeg,
      gnomonHeightM: 1
    }
  };
}

export function calculateDualShadowComparison(input: {
  experimentId: string;
  observedAtIso: string;
  stationA: DualShadowStationSettings;
  stationB: DualShadowStationSettings;
}): DualShadowComparisonResult {
  validateStation(input.stationA, 'A noktası');
  validateStation(input.stationB, 'B noktası');
  const normalizedObservedAtIso = new Date(input.observedAtIso).toISOString();

  const solarA = calculateSolarPosition({
    observedAtIso: normalizedObservedAtIso,
    latitudeDeg: input.stationA.latitudeDeg,
    longitudeDeg: input.stationA.longitudeDeg
  });
  const solarB = calculateSolarPosition({
    observedAtIso: normalizedObservedAtIso,
    latitudeDeg: input.stationB.latitudeDeg,
    longitudeDeg: input.stationB.longitudeDeg
  });
  const stationA = calculateShadowObservation({
    experimentId: `${input.experimentId}:station-a`,
    observedAtIso: normalizedObservedAtIso,
    latitudeDeg: input.stationA.latitudeDeg,
    longitudeDeg: input.stationA.longitudeDeg,
    solarPosition: solarA,
    settings: asShadowSettings(input.stationA)
  });
  const stationB = calculateShadowObservation({
    experimentId: `${input.experimentId}:station-b`,
    observedAtIso: normalizedObservedAtIso,
    latitudeDeg: input.stationB.latitudeDeg,
    longitudeDeg: input.stationB.longitudeDeg,
    solarPosition: solarB,
    settings: asShadowSettings(input.stationB)
  });
  const geodesic = inverseWgs84Geodesic(
    { latitudeDeg: input.stationA.latitudeDeg, longitudeDeg: input.stationA.longitudeDeg },
    { latitudeDeg: input.stationB.latitudeDeg, longitudeDeg: input.stationB.longitudeDeg }
  );

  const predictedSolarElevationDifferenceDeg = solarB.elevationDeg - solarA.elevationDeg;
  const predictedShadowAzimuthDifferenceDeg =
    stationA.predictedShadowAzimuthDeg === null || stationB.predictedShadowAzimuthDeg === null
      ? null
      : signedCircularDifferenceDeg(stationB.predictedShadowAzimuthDeg, stationA.predictedShadowAzimuthDeg);
  const normalizedShadowLengthA = stationA.predictedShadowLengthM === null
    ? null
    : stationA.predictedShadowLengthM / input.stationA.gnomonHeightM;
  const normalizedShadowLengthB = stationB.predictedShadowLengthM === null
    ? null
    : stationB.predictedShadowLengthM / input.stationB.gnomonHeightM;

  const observedSolarElevationDifferenceDeg =
    stationA.impliedObservedSolarElevationDeg === null || stationB.impliedObservedSolarElevationDeg === null
      ? null
      : stationB.impliedObservedSolarElevationDeg - stationA.impliedObservedSolarElevationDeg;
  const elevationUncertaintyA = elevationUncertaintyDeg(
    input.stationA.gnomonHeightM,
    input.stationA.observedShadowLengthM,
    input.stationA.observedShadowLengthUncertaintyM
  );
  const elevationUncertaintyB = elevationUncertaintyDeg(
    input.stationB.gnomonHeightM,
    input.stationB.observedShadowLengthM,
    input.stationB.observedShadowLengthUncertaintyM
  );
  const observedSolarElevationDifferenceUncertaintyDeg =
    elevationUncertaintyA === null || elevationUncertaintyB === null
      ? null
      : elevationUncertaintyA + elevationUncertaintyB;
  const solarElevationDifferenceResidualDeg = observedSolarElevationDifferenceDeg === null
    ? null
    : Math.abs(predictedSolarElevationDifferenceDeg - observedSolarElevationDifferenceDeg);

  const observedShadowAzimuthDifferenceDeg =
    input.stationA.observedShadowAzimuthDeg === undefined || input.stationB.observedShadowAzimuthDeg === undefined
      ? null
      : signedCircularDifferenceDeg(input.stationB.observedShadowAzimuthDeg, input.stationA.observedShadowAzimuthDeg);
  const observedShadowAzimuthDifferenceUncertaintyDeg =
    input.stationA.observedShadowAzimuthUncertaintyDeg === undefined || input.stationB.observedShadowAzimuthUncertaintyDeg === undefined
      ? null
      : input.stationA.observedShadowAzimuthUncertaintyDeg + input.stationB.observedShadowAzimuthUncertaintyDeg;
  const shadowAzimuthDifferenceResidualDeg =
    predictedShadowAzimuthDifferenceDeg === null || observedShadowAzimuthDifferenceDeg === null
      ? null
      : circularDifferenceDeg(predictedShadowAzimuthDifferenceDeg, observedShadowAzimuthDifferenceDeg);

  const checks: boolean[] = [];
  if (solarElevationDifferenceResidualDeg !== null && observedSolarElevationDifferenceUncertaintyDeg !== null) {
    checks.push(solarElevationDifferenceResidualDeg <= observedSolarElevationDifferenceUncertaintyDeg);
  }
  if (shadowAzimuthDifferenceResidualDeg !== null && observedShadowAzimuthDifferenceUncertaintyDeg !== null) {
    checks.push(shadowAzimuthDifferenceResidualDeg <= observedShadowAzimuthDifferenceUncertaintyDeg);
  }
  const bothDirectSun = stationA.predictedShadowLengthM !== null && stationB.predictedShadowLengthM !== null;
  const status = bothDirectSun ? comparisonStatus(checks) : 'indeterminate';

  const warnings = [
    'İki nokta aynı UTC gözlem anını kullanır; yerel saat metinlerinin aynı olması gerekmez.',
    'Noktalar arası mesafe WGS84 jeodezik referansıdır ve tek başına bir Dünya şekli modelinin tahmini değildir.',
    'Gölge karşılaştırması geometrik Güneş konumunu kullanır; atmosferik kırılma ve topoğrafik ufuk uygulanmaz.',
    'Bu karşılaştırma tek başına Dünya yarıçapı veya şekli çıkarımı yapmaz; modele özgü Güneş/ışık kuralları ayrıca tanımlanmalıdır.'
  ];
  if (geodesic.distanceM < 1) warnings.unshift('A ve B noktaları 1 metreden daha yakın; iki-konum karşılaştırması anlamlı bir coğrafi baz çizgisi oluşturmuyor.');
  if (!bothDirectSun) warnings.unshift('En az bir noktada Güneş geometrik ufkun altında; eşzamanlı doğrudan gölge karşılaştırması için karar üretilmedi.');
  if (observedSolarElevationDifferenceDeg !== null && observedSolarElevationDifferenceUncertaintyDeg === null) {
    warnings.push('İki gölge uzunluğu girilmiş olsa da uzunluk belirsizliklerinden biri eksik; açı farkı için uyum kararı verilmedi.');
  }
  if (observedShadowAzimuthDifferenceDeg !== null && observedShadowAzimuthDifferenceUncertaintyDeg === null) {
    warnings.push('İki gölge yönü girilmiş olsa da azimut belirsizliklerinden biri eksik; yön farkı için uyum kararı verilmedi.');
  }

  const traceId = `${DUAL_SHADOW_COMPARISON_MODEL_ID}:${input.experimentId}:${normalizedObservedAtIso}`;
  const trace: CalculationTrace = {
    summary: 'Aynı UTC anında iki WGS84 gözlem noktasının geometrik Güneş ve dikey gnomon gölgeleri bağımsız çözüldü; varsa saha ölçümlerinden türetilen açı/yön farkları karşılaştırıldı.',
    assumptions: warnings,
    steps: [
      {
        id: 'baseline',
        title: 'İki nokta arasındaki referans baz çizgisi',
        formula: 'WGS84 ters jeodezik',
        substitution: `A=(${format(input.stationA.latitudeDeg)}, ${format(input.stationA.longitudeDeg)}); B=(${format(input.stationB.latitudeDeg)}, ${format(input.stationB.longitudeDeg)})`,
        result: `mesafe=${format(geodesic.distanceM)} m; başlangıç azimutu=${format(geodesic.initialBearingDeg)}°`
      },
      {
        id: 'solar-difference',
        title: 'Eşzamanlı Güneş yüksekliği farkı',
        formula: 'Δα = α_B - α_A',
        substitution: `α_A=${format(solarA.elevationDeg)}°; α_B=${format(solarB.elevationDeg)}°`,
        result: `Δα_model=${format(predictedSolarElevationDifferenceDeg)}°`
      },
      {
        id: 'normalized-shadows',
        title: 'Gnomon yüksekliğinden bağımsız gölge oranı',
        formula: 'L/h = cot(α)',
        substitution: `A=${normalizedShadowLengthA === null ? 'tanımsız' : format(normalizedShadowLengthA)}; B=${normalizedShadowLengthB === null ? 'tanımsız' : format(normalizedShadowLengthB)}`,
        result: bothDirectSun ? 'Her iki noktada da doğrudan geometrik Güneş gölgesi tanımlı.' : 'En az bir noktada doğrudan gölge tanımsız.'
      },
      ...(observedSolarElevationDifferenceDeg === null ? [] : [{
        id: 'observed-elevation-difference',
        title: 'Saha gölgelerinden türetilen açı farkı',
        formula: 'α_obs = atan2(h, L_obs); Δα_obs = α_B,obs - α_A,obs',
        substitution: `Δα_obs=${format(observedSolarElevationDifferenceDeg)}°; ±=${observedSolarElevationDifferenceUncertaintyDeg === null ? 'tanımsız' : `${format(observedSolarElevationDifferenceUncertaintyDeg)}°`}`,
        result: solarElevationDifferenceResidualDeg === null ? 'Fark tanımsız.' : `|Δα_model-Δα_obs|=${format(solarElevationDifferenceResidualDeg)}°`
      }]),
      ...(observedShadowAzimuthDifferenceDeg === null ? [] : [{
        id: 'observed-direction-difference',
        title: 'Saha gölge yönü farkı',
        formula: 'ΔA = signedCircular(A_B - A_A)',
        substitution: `ΔA_obs=${format(observedShadowAzimuthDifferenceDeg)}°; ±=${observedShadowAzimuthDifferenceUncertaintyDeg === null ? 'tanımsız' : `${format(observedShadowAzimuthDifferenceUncertaintyDeg)}°`}`,
        result: shadowAzimuthDifferenceResidualDeg === null ? 'Model yön farkı tanımsız.' : `dairesel artık=${format(shadowAzimuthDifferenceResidualDeg)}°`
      }])
    ]
  };

  return {
    experimentId: input.experimentId,
    observedAtIso: normalizedObservedAtIso,
    stationA,
    stationB,
    separationDistanceM: geodesic.distanceM,
    initialBearingDeg: geodesic.initialBearingDeg,
    predictedSolarElevationDifferenceDeg,
    predictedShadowAzimuthDifferenceDeg,
    normalizedShadowLengthA,
    normalizedShadowLengthB,
    observedSolarElevationDifferenceDeg,
    observedSolarElevationDifferenceUncertaintyDeg,
    solarElevationDifferenceResidualDeg,
    observedShadowAzimuthDifferenceDeg,
    observedShadowAzimuthDifferenceUncertaintyDeg,
    shadowAzimuthDifferenceResidualDeg,
    status,
    warnings,
    traceId,
    trace
  };
}

export const dualShadowComparisonMetadata: ModelMetadata = {
  id: DUAL_SHADOW_COMPARISON_MODEL_ID,
  name: 'İki Konumlu Gölge Karşılaştırması · Astronomik Referans',
  version: DUAL_SHADOW_COMPARISON_MODEL_VERSION,
  description: 'Aynı UTC anında iki WGS84 konumundaki dikey gnomon gölgelerini ve saha ölçümlerinden türetilen açı/yön farklarını karşılaştırır.',
  capabilities: ['dual-shadow-comparison'],
  assumptions: [
    'Her iki gnomon yerel düşeye paralel ve ölçüm yüzeyleri yerel yataydır.',
    'Her iki nokta aynı UTC fiziksel anını kullanır.',
    'Güneş konumu geometrik astronomik referanstır; atmosferik kırılma ve topoğrafik ufuk uygulanmaz.'
  ]
};

export function createDualShadowComparisonPrediction(result: DualShadowComparisonResult): ModelPrediction {
  return {
    modelId: DUAL_SHADOW_COMPARISON_MODEL_ID,
    experimentId: result.experimentId,
    status: result.status,
    metrics: [
      { key: 'stationBLatitudeDeg', label: 'B noktası enlemi', value: result.stationB.latitudeDeg, unit: 'deg' },
      { key: 'stationBLongitudeDeg', label: 'B noktası boylamı', value: result.stationB.longitudeDeg, unit: 'deg' },
      { key: 'stationBGnomonHeightM', label: 'B noktası gnomon yüksekliği', value: result.stationB.gnomonHeightM, unit: 'm' },
      { key: 'stationBObservedShadowLengthM', label: 'B gözlenen gölge uzunluğu', value: result.stationB.observedShadowLengthM ?? null, unit: 'm', ...(result.stationB.observedShadowLengthUncertaintyM === undefined ? {} : { uncertainty: result.stationB.observedShadowLengthUncertaintyM }) },
      { key: 'stationBObservedShadowAzimuthDeg', label: 'B gözlenen gölge azimutu', value: result.stationB.observedShadowAzimuthDeg ?? null, unit: 'deg', ...(result.stationB.observedShadowAzimuthUncertaintyDeg === undefined ? {} : { uncertainty: result.stationB.observedShadowAzimuthUncertaintyDeg }) },
      { key: 'separationDistanceM', label: 'WGS84 nokta ayrımı', value: result.separationDistanceM, unit: 'm' },
      { key: 'initialBearingDeg', label: 'A→B WGS84 başlangıç azimutu', value: result.initialBearingDeg, unit: 'deg' },
      { key: 'stationASolarElevationDeg', label: 'A Güneş yüksekliği', value: result.stationA.solarElevationDeg, unit: 'deg' },
      { key: 'stationBSolarElevationDeg', label: 'B Güneş yüksekliği', value: result.stationB.solarElevationDeg, unit: 'deg' },
      { key: 'predictedSolarElevationDifferenceDeg', label: 'Beklenen Güneş yükseklik farkı B-A', value: result.predictedSolarElevationDifferenceDeg, unit: 'deg' },
      { key: 'observedSolarElevationDifferenceDeg', label: 'Gözlenen gölgelerden Güneş yükseklik farkı B-A', value: result.observedSolarElevationDifferenceDeg, unit: 'deg', ...(result.observedSolarElevationDifferenceUncertaintyDeg === null ? {} : { uncertainty: result.observedSolarElevationDifferenceUncertaintyDeg }) },
      { key: 'solarElevationDifferenceResidualDeg', label: 'Güneş yükseklik farkı artığı', value: result.solarElevationDifferenceResidualDeg, unit: 'deg' },
      { key: 'predictedShadowAzimuthDifferenceDeg', label: 'Beklenen gölge yönü farkı B-A', value: result.predictedShadowAzimuthDifferenceDeg, unit: 'deg' },
      { key: 'observedShadowAzimuthDifferenceDeg', label: 'Gözlenen gölge yönü farkı B-A', value: result.observedShadowAzimuthDifferenceDeg, unit: 'deg', ...(result.observedShadowAzimuthDifferenceUncertaintyDeg === null ? {} : { uncertainty: result.observedShadowAzimuthDifferenceUncertaintyDeg }) },
      { key: 'shadowAzimuthDifferenceResidualDeg', label: 'Gölge yönü farkı artığı', value: result.shadowAzimuthDifferenceResidualDeg, unit: 'deg' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}

export function readDualShadowComparisonSettings(prediction: ModelPrediction | undefined): DualShadowComparisonSettings | undefined {
  if (!prediction || prediction.modelId !== DUAL_SHADOW_COMPARISON_MODEL_ID) return undefined;
  const metric = (key: string) => prediction.metrics.find((item) => item.key === key);
  const latitude = metric('stationBLatitudeDeg')?.value;
  const longitude = metric('stationBLongitudeDeg')?.value;
  const gnomonHeight = metric('stationBGnomonHeightM')?.value;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof gnomonHeight !== 'number') return undefined;
  const length = metric('stationBObservedShadowLengthM');
  const azimuth = metric('stationBObservedShadowAzimuthDeg');
  return {
    stationB: {
      latitudeDeg: latitude,
      longitudeDeg: longitude,
      gnomonHeightM: gnomonHeight,
      ...(typeof length?.value === 'number' ? { observedShadowLengthM: length.value } : {}),
      ...(typeof length?.uncertainty === 'number' ? { observedShadowLengthUncertaintyM: length.uncertainty } : {}),
      ...(typeof azimuth?.value === 'number' ? { observedShadowAzimuthDeg: azimuth.value } : {}),
      ...(typeof azimuth?.uncertainty === 'number' ? { observedShadowAzimuthUncertaintyDeg: azimuth.uncertainty } : {})
    }
  };
}
