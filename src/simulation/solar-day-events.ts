import type { CalculationTrace, ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  formatUtcOffset,
  instantIsoFromLocalDateTime,
  localDateTimeValueFromInstant
} from '../shared/celestial-time';
import { calculateSolarPosition } from './solar-position';

export const SOLAR_DAY_EVENTS_MODEL_ID = 'solar-day-events';
export const SOLAR_DAY_EVENTS_MODEL_VERSION = '0.1.0';
export const GEOMETRIC_HORIZON_THRESHOLD_DEG = 0;
export const STANDARD_APPARENT_SUNRISE_THRESHOLD_DEG = -0.833;

export type SolarThresholdState =
  | 'normal'
  | 'continuous-above'
  | 'continuous-below'
  | 'grazing';

export interface SolarThresholdEvents {
  thresholdDeg: number;
  state: SolarThresholdState;
  riseIso: string | null;
  riseAzimuthDeg: number | null;
  setIso: string | null;
  setAzimuthDeg: number | null;
  aboveThresholdDurationMinutes: number;
}

export interface SolarDayEventsResult {
  experimentId: string;
  observedAtIso: string;
  localDate: string;
  utcOffsetMinutes: number;
  dayStartIso: string;
  dayEndIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  solarNoonIso: string;
  solarNoonElevationDeg: number;
  solarNoonAzimuthDeg: number;
  geometric: SolarThresholdEvents;
  standardApparent: SolarThresholdEvents;
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

interface SolarSample {
  timeMs: number;
  elevationDeg: number;
}

interface Crossing {
  timeMs: number;
  kind: 'rise' | 'set';
}

const DAY_MS = 86_400_000;
const SAMPLE_STEP_MS = 5 * 60_000;
const ROOT_TOLERANCE_MS = 250;

function format(value: number, digits = 3): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function normalizeObservedAtIso(value: string): string {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  return instant.toISOString();
}

function validateCoordinate(latitudeDeg: number, longitudeDeg: number): void {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
    throw new RangeError('Enlem -90° ile +90° arasında olmalıdır.');
  }
  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    throw new RangeError('Boylam -180° ile +180° arasında olmalıdır.');
  }
}

function elevationAt(timeMs: number, latitudeDeg: number, longitudeDeg: number): number {
  return calculateSolarPosition({
    observedAtIso: new Date(timeMs).toISOString(),
    latitudeDeg,
    longitudeDeg
  }).elevationDeg;
}

function sampleDay(startMs: number, latitudeDeg: number, longitudeDeg: number): SolarSample[] {
  const samples: SolarSample[] = [];
  for (let timeMs = startMs; timeMs <= startMs + DAY_MS; timeMs += SAMPLE_STEP_MS) {
    samples.push({ timeMs, elevationDeg: elevationAt(timeMs, latitudeDeg, longitudeDeg) });
  }
  if (samples.at(-1)?.timeMs !== startMs + DAY_MS) {
    samples.push({
      timeMs: startMs + DAY_MS,
      elevationDeg: elevationAt(startMs + DAY_MS, latitudeDeg, longitudeDeg)
    });
  }
  return samples;
}

function refineCrossing(
  leftMs: number,
  rightMs: number,
  thresholdDeg: number,
  latitudeDeg: number,
  longitudeDeg: number
): number {
  let left = leftMs;
  let right = rightMs;
  let leftValue = elevationAt(left, latitudeDeg, longitudeDeg) - thresholdDeg;

  while (right - left > ROOT_TOLERANCE_MS) {
    const middle = (left + right) / 2;
    const middleValue = elevationAt(middle, latitudeDeg, longitudeDeg) - thresholdDeg;
    if (middleValue === 0) return middle;
    if ((leftValue < 0 && middleValue > 0) || (leftValue > 0 && middleValue < 0)) {
      right = middle;
    } else {
      left = middle;
      leftValue = middleValue;
    }
  }
  return (left + right) / 2;
}

function findCrossings(
  samples: SolarSample[],
  thresholdDeg: number,
  latitudeDeg: number,
  longitudeDeg: number,
  dayEndMs: number
): Crossing[] {
  const crossings: Crossing[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = samples[index];
    const next = samples[index + 1];
    const currentValue = current.elevationDeg - thresholdDeg;
    const nextValue = next.elevationDeg - thresholdDeg;
    const signChanged = (currentValue < 0 && nextValue >= 0) || (currentValue > 0 && nextValue <= 0);
    if (!signChanged) continue;
    const timeMs = refineCrossing(
      current.timeMs,
      next.timeMs,
      thresholdDeg,
      latitudeDeg,
      longitudeDeg
    );
    if (timeMs >= dayEndMs - ROOT_TOLERANCE_MS) continue;
    crossings.push({
      timeMs,
      kind: nextValue > currentValue ? 'rise' : 'set'
    });
  }
  return crossings;
}

function durationAboveThreshold(
  startMs: number,
  endMs: number,
  thresholdDeg: number,
  latitudeDeg: number,
  longitudeDeg: number,
  crossings: Crossing[]
): number {
  let above = elevationAt(startMs + 1_000, latitudeDeg, longitudeDeg) > thresholdDeg;
  let cursor = startMs;
  let aboveMs = 0;
  for (const crossing of crossings) {
    if (above) aboveMs += crossing.timeMs - cursor;
    cursor = crossing.timeMs;
    above = crossing.kind === 'rise';
  }
  if (above) aboveMs += endMs - cursor;
  return Math.min(DAY_MS, Math.max(0, aboveMs)) / 60_000;
}

function thresholdEvents(
  samples: SolarSample[],
  thresholdDeg: number,
  latitudeDeg: number,
  longitudeDeg: number,
  startMs: number,
  endMs: number
): SolarThresholdEvents {
  const crossings = findCrossings(
    samples,
    thresholdDeg,
    latitudeDeg,
    longitudeDeg,
    endMs
  );
  const rise = crossings.find((crossing) => crossing.kind === 'rise');
  const set = crossings.find((crossing) => crossing.kind === 'set');
  const minimum = Math.min(...samples.map((sample) => sample.elevationDeg));
  const maximum = Math.max(...samples.map((sample) => sample.elevationDeg));
  const state: SolarThresholdState = crossings.length > 0
    ? 'normal'
    : minimum > thresholdDeg
      ? 'continuous-above'
      : maximum < thresholdDeg
        ? 'continuous-below'
        : 'grazing';
  const risePosition = rise
    ? calculateSolarPosition({
        observedAtIso: new Date(rise.timeMs).toISOString(),
        latitudeDeg,
        longitudeDeg
      })
    : undefined;
  const setPosition = set
    ? calculateSolarPosition({
        observedAtIso: new Date(set.timeMs).toISOString(),
        latitudeDeg,
        longitudeDeg
      })
    : undefined;

  return {
    thresholdDeg,
    state,
    riseIso: rise ? new Date(rise.timeMs).toISOString() : null,
    riseAzimuthDeg: risePosition?.azimuthDeg ?? null,
    setIso: set ? new Date(set.timeMs).toISOString() : null,
    setAzimuthDeg: setPosition?.azimuthDeg ?? null,
    aboveThresholdDurationMinutes: durationAboveThreshold(
      startMs,
      endMs,
      thresholdDeg,
      latitudeDeg,
      longitudeDeg,
      crossings
    )
  };
}

function refineSolarNoon(
  samples: SolarSample[],
  latitudeDeg: number,
  longitudeDeg: number,
  startMs: number,
  endMs: number
): { timeMs: number; elevationDeg: number; azimuthDeg: number } {
  let bestIndex = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index].elevationDeg > samples[bestIndex].elevationDeg) bestIndex = index;
  }
  let left = bestIndex === 0 ? startMs : samples[bestIndex - 1].timeMs;
  let right = bestIndex === samples.length - 1 ? endMs : samples[bestIndex + 1].timeMs;

  for (let iteration = 0; iteration < 35; iteration += 1) {
    const first = left + (right - left) / 3;
    const second = right - (right - left) / 3;
    if (elevationAt(first, latitudeDeg, longitudeDeg) < elevationAt(second, latitudeDeg, longitudeDeg)) {
      left = first;
    } else {
      right = second;
    }
  }
  const timeMs = (left + right) / 2;
  const position = calculateSolarPosition({
    observedAtIso: new Date(timeMs).toISOString(),
    latitudeDeg,
    longitudeDeg
  });
  return { timeMs, elevationDeg: position.elevationDeg, azimuthDeg: position.azimuthDeg };
}

function localMinute(iso: string | null, startMs: number): number | null {
  return iso === null ? null : (new Date(iso).getTime() - startMs) / 60_000;
}

function stateWarning(label: string, events: SolarThresholdEvents): string | undefined {
  if (events.state === 'continuous-above') return `${label}: Güneş seçilen yerel gün boyunca eşik üstünde kaldı; doğuş/batış geçişi yok.`;
  if (events.state === 'continuous-below') return `${label}: Güneş seçilen yerel gün boyunca eşik altında kaldı; doğuş/batış geçişi yok.`;
  if (events.state === 'grazing') return `${label}: Güneş eşiğe teğet/çok yakın davrandı; işaret değiştiren güvenilir geçiş bulunamadı.`;
  return undefined;
}

export function calculateSolarDayEvents(input: {
  experimentId: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  latitudeDeg: number;
  longitudeDeg: number;
}): SolarDayEventsResult {
  validateCoordinate(input.latitudeDeg, input.longitudeDeg);
  const observedAtIso = normalizeObservedAtIso(input.observedAtIso);
  const offsetLabel = formatUtcOffset(input.utcOffsetMinutes);
  const localDate = localDateTimeValueFromInstant(observedAtIso, input.utcOffsetMinutes).slice(0, 10);
  const dayStartIso = instantIsoFromLocalDateTime(`${localDate}T00:00:00`, input.utcOffsetMinutes);
  const startMs = new Date(dayStartIso).getTime();
  const endMs = startMs + DAY_MS;
  const dayEndIso = new Date(endMs).toISOString();
  const samples = sampleDay(startMs, input.latitudeDeg, input.longitudeDeg);
  const geometric = thresholdEvents(
    samples,
    GEOMETRIC_HORIZON_THRESHOLD_DEG,
    input.latitudeDeg,
    input.longitudeDeg,
    startMs,
    endMs
  );
  const standardApparent = thresholdEvents(
    samples,
    STANDARD_APPARENT_SUNRISE_THRESHOLD_DEG,
    input.latitudeDeg,
    input.longitudeDeg,
    startMs,
    endMs
  );
  const solarNoon = refineSolarNoon(
    samples,
    input.latitudeDeg,
    input.longitudeDeg,
    startMs,
    endMs
  );

  const warnings = [
    'Geometrik olaylar Güneş merkezinin 0° yerel geometrik ufuk geçişini kullanır; atmosferik kırılma ve topoğrafik ufuk uygulanmaz.',
    'Standart görünür doğuş/batış -0,833° sabit Güneş merkezi eşiğini kullanır; bu gerçek zamanlı atmosfer ölçümü değil, üst Güneş kenarı ve standart kırılma için yaklaşık bir takvim referansıdır.',
    `Yerel gün sınırı saat dilimi adı/DST kuralı yerine kaydedilmiş sabit ${offsetLabel} ofsetiyle kurulmuştur.`,
    'Bu astronomik olay referansı tek başına herhangi bir Dünya şekli modeline Güneş/ışık fiziği atamaz.'
  ];
  const geometricWarning = stateWarning('Geometrik 0° eşiği', geometric);
  const apparentWarning = stateWarning('Standart -0,833° eşiği', standardApparent);
  if (geometricWarning) warnings.push(geometricWarning);
  if (apparentWarning) warnings.push(apparentWarning);

  const traceId = `${SOLAR_DAY_EVENTS_MODEL_ID}:${input.experimentId}:${localDate}:${input.utcOffsetMinutes}`;
  const trace: CalculationTrace = {
    summary: 'Seçilen yerel sivil gün boyunca mevcut geometrik Güneş konumu örneklendi; 0° geometrik merkez ve -0,833° standart görünür referans eşikleri için doğuş/batış geçişleri kök aramayla inceltildi ve gün içi en yüksek Güneş konumu bulundu.',
    assumptions: warnings,
    steps: [
      {
        id: 'civil-day-window',
        title: 'Yerel gün penceresi',
        formula: 'yerel 00:00…24:00 + açık UTC ofseti → UTC aralığı',
        substitution: `tarih=${localDate}; ofset=${offsetLabel}`,
        result: `${dayStartIso} … ${dayEndIso}`
      },
      {
        id: 'geometric-horizon-events',
        title: 'Geometrik merkez ufuk geçişleri',
        formula: 'h_sun(t) = 0°',
        substitution: `enlem=${format(input.latitudeDeg, 6)}°; boylam=${format(input.longitudeDeg, 6)}°`,
        result: `doğuş=${geometric.riseIso ?? geometric.state}; batış=${geometric.setIso ?? geometric.state}; eşik üstü=${format(geometric.aboveThresholdDurationMinutes)} dk`
      },
      {
        id: 'standard-apparent-events',
        title: 'Standart görünür doğuş/batış referansı',
        formula: 'h_sun,merkez(t) = -0,833°',
        substitution: 'sabit yaklaşık eşik = -0,833°',
        result: `doğuş=${standardApparent.riseIso ?? standardApparent.state}; batış=${standardApparent.setIso ?? standardApparent.state}; eşik üstü=${format(standardApparent.aboveThresholdDurationMinutes)} dk`,
        note: 'Bu eşik ölçülen atmosferik kırılma değildir.'
      },
      {
        id: 'solar-noon',
        title: 'Yerel gün içindeki en yüksek Güneş',
        formula: 'max_t h_sun(t)',
        substitution: `${localDate} yerel gün penceresi`,
        result: `t=${new Date(solarNoon.timeMs).toISOString()}; yükseklik=${format(solarNoon.elevationDeg)}°; azimut=${format(solarNoon.azimuthDeg)}°`
      }
    ]
  };

  return {
    experimentId: input.experimentId,
    observedAtIso,
    localDate,
    utcOffsetMinutes: input.utcOffsetMinutes,
    dayStartIso,
    dayEndIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    solarNoonIso: new Date(solarNoon.timeMs).toISOString(),
    solarNoonElevationDeg: solarNoon.elevationDeg,
    solarNoonAzimuthDeg: solarNoon.azimuthDeg,
    geometric,
    standardApparent,
    warnings,
    traceId,
    trace
  };
}

export const solarDayEventsMetadata: ModelMetadata = {
  id: SOLAR_DAY_EVENTS_MODEL_ID,
  name: 'Gün Doğumu / Batımı · Astronomik Referans',
  version: SOLAR_DAY_EVENTS_MODEL_VERSION,
  description: 'Açık UTC ofsetli yerel gün için geometrik 0° ve standart -0,833° Güneş doğuş/batış olayları ile güneş öğlesi.',
  capabilities: ['solar-position'],
  assumptions: [
    'Güneş konumu mevcut geometrik astronomik referanstan alınır.',
    'Yerel sivil gün kaydedilmiş sabit UTC ofsetiyle tanımlanır.',
    '-0,833° kanalı sabit standart görünür referans eşiğidir; ölçülen atmosfer değildir.'
  ]
};

export function createSolarDayEventsPrediction(result: SolarDayEventsResult): ModelPrediction {
  const startMs = new Date(result.dayStartIso).getTime();
  return {
    modelId: SOLAR_DAY_EVENTS_MODEL_ID,
    experimentId: result.experimentId,
    status: 'indeterminate',
    metrics: [
      { key: 'solarNoonLocalMinute', label: 'Güneş öğlesi · yerel gün dakikası', value: localMinute(result.solarNoonIso, startMs), unit: 'min' },
      { key: 'solarNoonElevationDeg', label: 'Güneş öğlesi yüksekliği', value: result.solarNoonElevationDeg, unit: 'deg' },
      { key: 'solarNoonAzimuthDeg', label: 'Güneş öğlesi azimutu', value: result.solarNoonAzimuthDeg, unit: 'deg' },
      { key: 'geometricRiseLocalMinute', label: 'Geometrik 0° doğuş · yerel gün dakikası', value: localMinute(result.geometric.riseIso, startMs), unit: 'min' },
      { key: 'geometricRiseAzimuthDeg', label: 'Geometrik doğuş azimutu', value: result.geometric.riseAzimuthDeg, unit: 'deg' },
      { key: 'geometricSetLocalMinute', label: 'Geometrik 0° batış · yerel gün dakikası', value: localMinute(result.geometric.setIso, startMs), unit: 'min' },
      { key: 'geometricSetAzimuthDeg', label: 'Geometrik batış azimutu', value: result.geometric.setAzimuthDeg, unit: 'deg' },
      { key: 'geometricAboveThresholdMinutes', label: 'Geometrik 0° eşik üstü süre', value: result.geometric.aboveThresholdDurationMinutes, unit: 'min' },
      { key: 'standardRiseLocalMinute', label: 'Standart -0,833° doğuş · yerel gün dakikası', value: localMinute(result.standardApparent.riseIso, startMs), unit: 'min' },
      { key: 'standardRiseAzimuthDeg', label: 'Standart doğuş azimutu', value: result.standardApparent.riseAzimuthDeg, unit: 'deg' },
      { key: 'standardSetLocalMinute', label: 'Standart -0,833° batış · yerel gün dakikası', value: localMinute(result.standardApparent.setIso, startMs), unit: 'min' },
      { key: 'standardSetAzimuthDeg', label: 'Standart batış azimutu', value: result.standardApparent.setAzimuthDeg, unit: 'deg' },
      { key: 'standardAboveThresholdMinutes', label: 'Standart -0,833° eşik üstü süre', value: result.standardApparent.aboveThresholdDurationMinutes, unit: 'min' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}
