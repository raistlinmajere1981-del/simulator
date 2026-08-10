import type { CalculationTrace, ModelMetadata, ModelPrediction } from '../shared/domain';
import { calculateSolarDayEvents } from './solar-day-events';
import { calculateSolarPosition } from './solar-position';

export const SOLAR_SEASON_EVENTS_MODEL_ID = 'solar-season-events';
export const SOLAR_SEASON_EVENTS_MODEL_VERSION = '0.1.0';

export type SolarSeasonEventKind =
  | 'march-equinox'
  | 'june-solstice'
  | 'september-equinox'
  | 'december-solstice';

export interface SolarSeasonEvent {
  kind: SolarSeasonEventKind;
  label: string;
  northernSeason: string;
  southernSeason: string;
  targetApparentSolarLongitudeDeg: number;
  eventIso: string;
  apparentSolarLongitudeDeg: number;
  declinationDeg: number;
  observerLocalDate: string;
  observerSolarNoonElevationDeg: number;
  observerGeometricDaylightMinutes: number;
  observerStandardDaylightMinutes: number;
  observerStandardRiseAzimuthDeg: number | null;
  observerStandardSetAzimuthDeg: number | null;
}

export interface SolarSeasonEventsResult {
  experimentId: string;
  year: number;
  latitudeDeg: number;
  longitudeDeg: number;
  utcOffsetMinutes: number;
  events: SolarSeasonEvent[];
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

interface EventSpec {
  kind: SolarSeasonEventKind;
  label: string;
  northernSeason: string;
  southernSeason: string;
  targetDeg: number;
  startMonthDay: string;
  endMonthDay: string;
}

const EVENT_SPECS: readonly EventSpec[] = [
  {
    kind: 'march-equinox',
    label: 'Mart ekinoksu',
    northernSeason: 'İlkbahar başlangıcı',
    southernSeason: 'Sonbahar başlangıcı',
    targetDeg: 0,
    startMonthDay: '03-15',
    endMonthDay: '03-25'
  },
  {
    kind: 'june-solstice',
    label: 'Haziran gündönümü',
    northernSeason: 'Yaz başlangıcı',
    southernSeason: 'Kış başlangıcı',
    targetDeg: 90,
    startMonthDay: '06-15',
    endMonthDay: '06-27'
  },
  {
    kind: 'september-equinox',
    label: 'Eylül ekinoksu',
    northernSeason: 'Sonbahar başlangıcı',
    southernSeason: 'İlkbahar başlangıcı',
    targetDeg: 180,
    startMonthDay: '09-15',
    endMonthDay: '09-28'
  },
  {
    kind: 'december-solstice',
    label: 'Aralık gündönümü',
    northernSeason: 'Kış başlangıcı',
    southernSeason: 'Yaz başlangıcı',
    targetDeg: 270,
    startMonthDay: '12-15',
    endMonthDay: '12-27'
  }
] as const;

const SCAN_STEP_MS = 6 * 60 * 60 * 1000;
const ROOT_TOLERANCE_MS = 500;

function validateInput(input: {
  year: number;
  latitudeDeg: number;
  longitudeDeg: number;
  utcOffsetMinutes: number;
}): void {
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    throw new RangeError('Mevsim dönüm noktaları için yıl 1900–2100 aralığında tam sayı olmalıdır.');
  }
  if (!Number.isFinite(input.latitudeDeg) || input.latitudeDeg < -90 || input.latitudeDeg > 90) {
    throw new RangeError('Enlem -90° ile +90° arasında olmalıdır.');
  }
  if (!Number.isFinite(input.longitudeDeg) || input.longitudeDeg < -180 || input.longitudeDeg > 180) {
    throw new RangeError('Boylam -180° ile +180° arasında olmalıdır.');
  }
  if (!Number.isInteger(input.utcOffsetMinutes) || input.utcOffsetMinutes < -14 * 60 || input.utcOffsetMinutes > 14 * 60) {
    throw new RangeError('UTC ofseti -14:00 ile +14:00 arasında tam dakika olmalıdır.');
  }
}

function signedAngleDifferenceDeg(valueDeg: number, targetDeg: number): number {
  const normalized = ((valueDeg - targetDeg + 540) % 360) - 180;
  return normalized === -180 ? 180 : normalized;
}

function apparentLongitudeAt(timeMs: number): number {
  return calculateSolarPosition({
    observedAtIso: new Date(timeMs).toISOString(),
    latitudeDeg: 0,
    longitudeDeg: 0
  }).apparentSolarLongitudeDeg;
}

function rootValue(timeMs: number, targetDeg: number): number {
  return signedAngleDifferenceDeg(apparentLongitudeAt(timeMs), targetDeg);
}

function refineLongitudeCrossing(leftMs: number, rightMs: number, targetDeg: number): number {
  let left = leftMs;
  let right = rightMs;
  let leftValue = rootValue(left, targetDeg);

  while (right - left > ROOT_TOLERANCE_MS) {
    const middle = (left + right) / 2;
    const middleValue = rootValue(middle, targetDeg);
    if (Math.abs(middleValue) < 1e-10) return middle;
    if (Math.sign(leftValue) === Math.sign(middleValue)) {
      left = middle;
      leftValue = middleValue;
    } else {
      right = middle;
    }
  }
  return (left + right) / 2;
}

function findEventTimeMs(year: number, spec: EventSpec): number {
  const startMs = Date.parse(`${year}-${spec.startMonthDay}T00:00:00.000Z`);
  const endMs = Date.parse(`${year}-${spec.endMonthDay}T00:00:00.000Z`);
  let previousMs = startMs;
  let previousValue = rootValue(previousMs, spec.targetDeg);

  for (let currentMs = startMs + SCAN_STEP_MS; currentMs <= endMs; currentMs += SCAN_STEP_MS) {
    const currentValue = rootValue(currentMs, spec.targetDeg);
    if (Math.abs(currentValue) < 1e-10) return currentMs;
    if (Math.sign(previousValue) !== Math.sign(currentValue)) {
      return refineLongitudeCrossing(previousMs, currentMs, spec.targetDeg);
    }
    previousMs = currentMs;
    previousValue = currentValue;
  }

  throw new RangeError(`${spec.label} için seçilen yıl penceresinde görünür Güneş boylamı geçişi bulunamadı.`);
}

function format(value: number, digits = 4): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

export function calculateSolarSeasonEvents(input: {
  experimentId: string;
  year: number;
  latitudeDeg: number;
  longitudeDeg: number;
  utcOffsetMinutes: number;
}): SolarSeasonEventsResult {
  validateInput(input);

  const events = EVENT_SPECS.map((spec): SolarSeasonEvent => {
    const timeMs = findEventTimeMs(input.year, spec);
    const eventIso = new Date(timeMs).toISOString();
    const solar = calculateSolarPosition({
      observedAtIso: eventIso,
      latitudeDeg: 0,
      longitudeDeg: 0
    });
    const day = calculateSolarDayEvents({
      experimentId: input.experimentId,
      observedAtIso: eventIso,
      utcOffsetMinutes: input.utcOffsetMinutes,
      latitudeDeg: input.latitudeDeg,
      longitudeDeg: input.longitudeDeg
    });

    return {
      kind: spec.kind,
      label: spec.label,
      northernSeason: spec.northernSeason,
      southernSeason: spec.southernSeason,
      targetApparentSolarLongitudeDeg: spec.targetDeg,
      eventIso,
      apparentSolarLongitudeDeg: solar.apparentSolarLongitudeDeg,
      declinationDeg: solar.declinationDeg,
      observerLocalDate: day.localDate,
      observerSolarNoonElevationDeg: day.solarNoonElevationDeg,
      observerGeometricDaylightMinutes: day.geometric.aboveThresholdDurationMinutes,
      observerStandardDaylightMinutes: day.standardApparent.aboveThresholdDurationMinutes,
      observerStandardRiseAzimuthDeg: day.standardApparent.riseAzimuthDeg,
      observerStandardSetAzimuthDeg: day.standardApparent.setAzimuthDeg
    };
  });

  const warnings = [
    'Dönüm noktaları mevcut düşük maliyetli NOAA Güneş çekirdeğinin görünür ekliptik boylamının 0°, 90°, 180° ve 270° geçişleriyle sayısal olarak aranır.',
    'Bu sonuç yüksek hassasiyetli efemeris, ΔT/UT1 düzeltmesi veya resmi almanak zamanı değildir; 1900–2100 aralığında karşılaştırmalı astronomik referans olarak kullanılmalıdır.',
    'Gözlemciye ait gün uzunluğu ve güneş öğlesi, kaydedilmiş sabit UTC ofsetiyle kurulan yerel sivil günde hesaplanır; saat dilimi adı ve DST kuralı otomatik uygulanmaz.',
    'Standart gün uzunluğu -0,833° sabit Güneş merkezi eşiğidir; gerçek zamanlı atmosferik kırılma veya topoğrafik ufuk ölçümü değildir.',
    'Mevsim adları kuzey ve güney yarıküre için ayrı etiketlenir; astronomik dönüm noktalarının zamanı küreseldir.'
  ];

  const traceId = `${SOLAR_SEASON_EVENTS_MODEL_ID}:${input.experimentId}:${input.year}:${input.latitudeDeg.toFixed(6)}:${input.longitudeDeg.toFixed(6)}:${input.utcOffsetMinutes}`;
  const trace: CalculationTrace = {
    summary: 'Seçilen yılda görünür Güneş boylamının dört ana ekliptik çeyrek geçişi aranarak ekinoks/gündönümü referansları ve seçili gözlemci için o yerel günlerin Güneş davranışı hesaplandı.',
    assumptions: warnings,
    steps: events.map((event) => ({
      id: event.kind,
      title: event.label,
      formula: `λ_app(t) = ${event.targetApparentSolarLongitudeDeg}°`,
      substitution: `yıl=${input.year}; tarama=6 sa; kök toleransı≤${ROOT_TOLERANCE_MS} ms`,
      result: `${event.eventIso}; λ_app=${format(event.apparentSolarLongitudeDeg, 6)}°; δ=${format(event.declinationDeg, 6)}°; standart gün=${format(event.observerStandardDaylightMinutes / 60, 3)} sa`
    }))
  };

  return {
    experimentId: input.experimentId,
    year: input.year,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    utcOffsetMinutes: input.utcOffsetMinutes,
    events,
    warnings,
    traceId,
    trace
  };
}

export const solarSeasonEventsMetadata: ModelMetadata = {
  id: SOLAR_SEASON_EVENTS_MODEL_ID,
  name: 'Ekinoks / Gündönümü · Yıllık Güneş Referansı',
  version: SOLAR_SEASON_EVENTS_MODEL_VERSION,
  description: 'Seçilen yılın dört astronomik dönüm noktasını görünür Güneş boylamı üzerinden arar ve gözlemci konumundaki gün uzunluğu referanslarını hesaplar.',
  capabilities: ['solar-position'],
  assumptions: [
    'NOAA tabanlı mevcut düşük hassasiyetli Güneş konumu çekirdeği kullanılır.',
    'Ekinoks ve gündönümü geçişleri görünür ekliptik Güneş boylamının 0°/90°/180°/270° kökleridir.',
    'Yerel gün karşılaştırmaları sabit UTC ofseti ve standart -0,833° görünür doğuş/batış eşiğini kullanır.'
  ]
};

export function createSolarSeasonEventsPrediction(result: SolarSeasonEventsResult): ModelPrediction {
  const metrics = result.events.flatMap((event) => [
    {
      key: `${event.kind}UnixMs`,
      label: `${event.label} zamanı`,
      value: new Date(event.eventIso).getTime(),
      unit: 'unix-ms'
    },
    {
      key: `${event.kind}DeclinationDeg`,
      label: `${event.label} Güneş deklinasyonu`,
      value: event.declinationDeg,
      unit: 'deg'
    },
    {
      key: `${event.kind}StandardDaylightMinutes`,
      label: `${event.label} standart eşik üstü süre`,
      value: event.observerStandardDaylightMinutes,
      unit: 'min'
    },
    {
      key: `${event.kind}SolarNoonElevationDeg`,
      label: `${event.label} güneş öğlesi yüksekliği`,
      value: event.observerSolarNoonElevationDeg,
      unit: 'deg'
    }
  ]);

  return {
    modelId: SOLAR_SEASON_EVENTS_MODEL_ID,
    experimentId: result.experimentId,
    status: 'indeterminate',
    metrics,
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}
