import type { CalculationTrace, ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  createWgs84GeodesicPath,
  coordinateAtWgs84PathFraction,
  type Wgs84GeodesicPath
} from './geodesic-path';
import { calculateSolarPosition } from './solar-position';
import { calculateSolarTimeOffset, type SolarClockReading } from './solar-time-offset';

export const SOLAR_ROUTE_COMPARISON_MODEL_ID = 'solar-route-comparison';
export const SOLAR_ROUTE_COMPARISON_MODEL_VERSION = '0.1.0';
export const DEFAULT_SOLAR_ROUTE_SAMPLE_COUNT = 5;

export interface SolarRouteComparisonInput {
  experimentId: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  startLatitudeDeg: number;
  startLongitudeDeg: number;
  endLatitudeDeg: number;
  endLongitudeDeg: number;
  sampleCount?: number;
}

export interface SolarRouteSample {
  fraction: number;
  distanceM: number;
  latitudeDeg: number;
  longitudeDeg: number;
  solarElevationDeg: number;
  solarAzimuthDeg: number;
  apparentSolarClock: SolarClockReading;
  apparentSolarCorrectionMinutes: number;
}

export interface SolarRouteComparisonResult {
  experimentId: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  routeDistanceM: number;
  initialBearingDeg: number;
  routeMethod: Wgs84GeodesicPath['method'];
  samples: SolarRouteSample[];
  startSolarElevationDeg: number;
  endSolarElevationDeg: number;
  endMinusStartElevationDeg: number;
  startSolarAzimuthDeg: number;
  endSolarAzimuthDeg: number;
  apparentSolarClockDifferenceMinutes: number;
  minimumSolarElevationDeg: number;
  maximumSolarElevationDeg: number;
  horizonSideChangeCount: number;
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

function format(value: number, digits = 3): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateSampleCount(sampleCount: number): number {
  if (!Number.isInteger(sampleCount) || sampleCount < 3 || sampleCount > 33) {
    throw new RangeError('Rota karşılaştırması için örnek sayısı 3–33 arasında tam sayı olmalıdır.');
  }
  return sampleCount;
}

function normalizeClockDifferenceMinutes(valueMinutes: number): number {
  return ((valueMinutes + 720) % 1_440 + 1_440) % 1_440 - 720;
}

function clockTotalMinutes(clock: SolarClockReading): number {
  return clock.dayOffset * 1_440 + clock.minuteOfDay;
}

function horizonSideChangeCount(samples: SolarRouteSample[]): number {
  let count = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (!previous || !current) continue;
    const previousAbove = previous.solarElevationDeg >= 0;
    const currentAbove = current.solarElevationDeg >= 0;
    if (previousAbove !== currentAbove) count += 1;
  }
  return count;
}

export function calculateSolarRouteComparison(
  input: SolarRouteComparisonInput
): SolarRouteComparisonResult {
  const sampleCount = validateSampleCount(input.sampleCount ?? DEFAULT_SOLAR_ROUTE_SAMPLE_COUNT);
  const instant = new Date(input.observedAtIso);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('Rota karşılaştırması için geçerli bir gözlem zamanı gereklidir.');
  }
  const observedAtIso = instant.toISOString();
  const path = createWgs84GeodesicPath(
    { latitudeDeg: input.startLatitudeDeg, longitudeDeg: input.startLongitudeDeg },
    { latitudeDeg: input.endLatitudeDeg, longitudeDeg: input.endLongitudeDeg }
  );

  const warnings = [
    ...path.warnings,
    'Bütün rota örnekleri aynı fiziksel UTC anında çözülür; bu bir hareket/seyahat zamanı simülasyonu değildir.',
    'Aynı sabit UTC ofseti bütün örneklerde yalnız saat karşılaştırma referansı olarak kullanılır; rota boyunca yasal saat dilimi veya DST sınırları modellenmez.',
    'Güneş yükseklikleri geometriktir; atmosferik kırılma ve topoğrafik yerel ufuk uygulanmaz.',
    `${sampleCount} rota örneği tanısal bir profildir; ara noktalarda sürekli maksimum/minimum araması yaptığı varsayılmaz.`
  ];

  const samples = Array.from({ length: sampleCount }, (_, index): SolarRouteSample => {
    const fraction = index / (sampleCount - 1);
    const point = coordinateAtWgs84PathFraction(path, fraction);
    if (point.warning && !warnings.includes(point.warning)) warnings.push(point.warning);
    const position = calculateSolarPosition({
      observedAtIso,
      latitudeDeg: point.coordinate.latitudeDeg,
      longitudeDeg: point.coordinate.longitudeDeg
    });
    const timeOffset = calculateSolarTimeOffset({
      experimentId: `${input.experimentId}:route:${index}`,
      observedAtIso,
      utcOffsetMinutes: input.utcOffsetMinutes,
      longitudeDeg: point.coordinate.longitudeDeg
    });
    return {
      fraction,
      distanceM: path.totalDistanceM * fraction,
      latitudeDeg: point.coordinate.latitudeDeg,
      longitudeDeg: point.coordinate.longitudeDeg,
      solarElevationDeg: position.elevationDeg,
      solarAzimuthDeg: position.azimuthDeg,
      apparentSolarClock: timeOffset.apparentSolarClock,
      apparentSolarCorrectionMinutes: timeOffset.apparentSolarCorrectionMinutes
    };
  });

  const start = samples[0]!;
  const end = samples[samples.length - 1]!;
  const apparentDifference = normalizeClockDifferenceMinutes(
    clockTotalMinutes(end.apparentSolarClock) - clockTotalMinutes(start.apparentSolarClock)
  );
  const elevations = samples.map((sample) => sample.solarElevationDeg);
  const minimumSolarElevationDeg = Math.min(...elevations);
  const maximumSolarElevationDeg = Math.max(...elevations);
  const sideChanges = horizonSideChangeCount(samples);

  const traceId = `${SOLAR_ROUTE_COMPARISON_MODEL_ID}:${input.experimentId}:${observedAtIso}:${input.startLatitudeDeg.toFixed(6)}:${input.startLongitudeDeg.toFixed(6)}:${input.endLatitudeDeg.toFixed(6)}:${input.endLongitudeDeg.toFixed(6)}:${sampleCount}`;
  const trace: CalculationTrace = {
    summary: 'İki WGS84 konumu arasındaki jeodezik rota eşit mesafe kesirlerinde örneklendi; aynı UTC anında her örnek için geometrik Güneş konumu ve aynı sabit UTC ofsetine göre görünür Güneş saati karşılaştırıldı.',
    assumptions: warnings,
    steps: [
      {
        id: 'route-geodesic',
        title: 'WGS84 rota geometrisi',
        formula: 'P(f) = doğrudan_jeodezik(P₀, α₀, f · s)',
        substitution: `A=${format(input.startLatitudeDeg, 6)}°, ${format(input.startLongitudeDeg, 6)}°; B=${format(input.endLatitudeDeg, 6)}°, ${format(input.endLongitudeDeg, 6)}°`,
        result: `s=${format(path.totalDistanceM / 1_000)} km; α₀=${format(path.initialBearingDeg)}°; yöntem=${path.method}`
      },
      {
        id: 'same-instant-sampling',
        title: 'Aynı an rota örnekleri',
        formula: 'fᵢ = i / (N - 1), i=0…N-1',
        substitution: `N=${sampleCount}; t=${observedAtIso}`,
        result: `${sampleCount} örnek üretildi`
      },
      {
        id: 'solar-position-profile',
        title: 'Rota boyunca geometrik Güneş yüksekliği',
        formula: 'hᵢ, Aᵢ = solar_position(t, φᵢ, λᵢ)',
        substitution: `aynı t; ${sampleCount} WGS84 konumu`,
        result: `h_min=${format(minimumSolarElevationDeg)}°; h_max=${format(maximumSolarElevationDeg)}°; A→B Δh=${format(end.solarElevationDeg - start.solarElevationDeg)}°`
      },
      {
        id: 'solar-clock-profile',
        title: 'Görünür Güneş saati farkı',
        formula: 'LAST = civil + 4(λ-λ_std) + EoT',
        substitution: `aynı sabit UTC ofseti=${input.utcOffsetMinutes} dk`,
        result: `B − A kısa saat farkı=${format(apparentDifference)} dk`
      }
    ]
  };

  return {
    experimentId: input.experimentId,
    observedAtIso,
    utcOffsetMinutes: input.utcOffsetMinutes,
    routeDistanceM: path.totalDistanceM,
    initialBearingDeg: path.initialBearingDeg,
    routeMethod: path.method,
    samples,
    startSolarElevationDeg: start.solarElevationDeg,
    endSolarElevationDeg: end.solarElevationDeg,
    endMinusStartElevationDeg: end.solarElevationDeg - start.solarElevationDeg,
    startSolarAzimuthDeg: start.solarAzimuthDeg,
    endSolarAzimuthDeg: end.solarAzimuthDeg,
    apparentSolarClockDifferenceMinutes: apparentDifference,
    minimumSolarElevationDeg,
    maximumSolarElevationDeg,
    horizonSideChangeCount: sideChanges,
    warnings,
    traceId,
    trace
  };
}

export const solarRouteComparisonMetadata: ModelMetadata = {
  id: SOLAR_ROUTE_COMPARISON_MODEL_ID,
  name: 'Güneş Rota Karşılaştırması · Astronomik Referans',
  version: SOLAR_ROUTE_COMPARISON_MODEL_VERSION,
  description: 'İki WGS84 konumu arasındaki jeodezik rotayı aynı fiziksel anda örnekleyerek geometrik Güneş yüksekliği, azimut ve görünür Güneş zamanı farklarını karşılaştırır.',
  capabilities: ['solar-position', 'surface-distance'],
  assumptions: [
    'Rota WGS84 jeodezik referansında çözülür.',
    'Bütün konumlar aynı fiziksel UTC anında değerlendirilir.',
    'Sabit UTC ofseti yasal saat dilimi değil, saat karşılaştırma referansıdır.',
    'Atmosferik kırılma ve topoğrafik ufuk uygulanmaz.'
  ]
};

export function createSolarRouteComparisonPrediction(
  result: SolarRouteComparisonResult
): ModelPrediction {
  const start = result.samples[0]!;
  const end = result.samples[result.samples.length - 1]!;
  return {
    modelId: SOLAR_ROUTE_COMPARISON_MODEL_ID,
    experimentId: result.experimentId,
    status: 'indeterminate',
    metrics: [
      { key: 'routeStartLatitudeDeg', label: 'Rota A enlemi', value: start.latitudeDeg, unit: 'deg' },
      { key: 'routeStartLongitudeDeg', label: 'Rota A boylamı', value: start.longitudeDeg, unit: 'deg' },
      { key: 'routeEndLatitudeDeg', label: 'Rota B enlemi', value: end.latitudeDeg, unit: 'deg' },
      { key: 'routeEndLongitudeDeg', label: 'Rota B boylamı', value: end.longitudeDeg, unit: 'deg' },
      { key: 'routeDistanceM', label: 'WGS84 rota mesafesi', value: result.routeDistanceM, unit: 'm' },
      { key: 'initialBearingDeg', label: 'Başlangıç rota azimutu', value: result.initialBearingDeg, unit: 'deg' },
      { key: 'startSolarElevationDeg', label: 'A noktası Güneş yüksekliği', value: result.startSolarElevationDeg, unit: 'deg' },
      { key: 'endSolarElevationDeg', label: 'B noktası Güneş yüksekliği', value: result.endSolarElevationDeg, unit: 'deg' },
      { key: 'endMinusStartElevationDeg', label: 'B − A Güneş yüksekliği farkı', value: result.endMinusStartElevationDeg, unit: 'deg' },
      { key: 'apparentSolarClockDifferenceMinutes', label: 'B − A görünür Güneş saati farkı', value: result.apparentSolarClockDifferenceMinutes, unit: 'min' },
      { key: 'minimumSolarElevationDeg', label: 'Örneklerde minimum Güneş yüksekliği', value: result.minimumSolarElevationDeg, unit: 'deg' },
      { key: 'maximumSolarElevationDeg', label: 'Örneklerde maksimum Güneş yüksekliği', value: result.maximumSolarElevationDeg, unit: 'deg' },
      { key: 'horizonSideChangeCount', label: 'Örnekler arası geometrik ufuk tarafı değişimi', value: result.horizonSideChangeCount, unit: 'count' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}
