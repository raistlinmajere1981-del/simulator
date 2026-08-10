import type { CalculationTrace, ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  formatUtcOffset,
  localDateTimeValueFromInstant,
  MAX_UTC_OFFSET_MINUTES,
  MIN_UTC_OFFSET_MINUTES
} from '../shared/celestial-time';
import { calculateSolarPosition } from './solar-position';

export const SOLAR_TIME_OFFSET_MODEL_ID = 'solar-time-offset';
export const SOLAR_TIME_OFFSET_MODEL_VERSION = '0.1.0';

export interface SolarClockReading {
  minuteOfDay: number;
  dayOffset: number;
}

export interface SolarTimeOffsetResult {
  experimentId: string;
  observedAtIso: string;
  localCivilDateTime: string;
  utcOffsetMinutes: number;
  longitudeDeg: number;
  standardMeridianDeg: number;
  longitudeDeltaDeg: number;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  apparentSolarCorrectionMinutes: number;
  civilClock: SolarClockReading;
  meanSolarClock: SolarClockReading;
  apparentSolarClock: SolarClockReading;
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

function normalizeSignedDegrees(valueDeg: number): number {
  return ((valueDeg + 540) % 360) - 180;
}

function normalizeClock(totalMinutes: number): SolarClockReading {
  const dayOffset = Math.floor(totalMinutes / 1_440);
  const minuteOfDay = ((totalMinutes % 1_440) + 1_440) % 1_440;
  return { minuteOfDay, dayOffset };
}

function localClockMinutes(localDateTime: string): number {
  const hour = Number(localDateTime.slice(11, 13));
  const minute = Number(localDateTime.slice(14, 16));
  const second = Number(localDateTime.slice(17, 19));
  return hour * 60 + minute + second / 60;
}

function validateInput(input: {
  observedAtIso: string;
  utcOffsetMinutes: number;
  longitudeDeg: number;
}): string {
  const instant = new Date(input.observedAtIso);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  if (!Number.isFinite(input.utcOffsetMinutes) ||
    input.utcOffsetMinutes < MIN_UTC_OFFSET_MINUTES ||
    input.utcOffsetMinutes > MAX_UTC_OFFSET_MINUTES) {
    throw new RangeError('UTC ofseti -12:00 ile +14:00 arasında olmalıdır.');
  }
  if (!Number.isFinite(input.longitudeDeg) || input.longitudeDeg < -180 || input.longitudeDeg > 180) {
    throw new RangeError('Boylam -180° ile +180° arasında olmalıdır.');
  }
  return instant.toISOString();
}

function format(value: number, digits = 3): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

export function calculateSolarTimeOffset(input: {
  experimentId: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  longitudeDeg: number;
}): SolarTimeOffsetResult {
  const observedAtIso = validateInput(input);
  const localCivilDateTime = localDateTimeValueFromInstant(observedAtIso, input.utcOffsetMinutes);
  const standardMeridianDeg = normalizeSignedDegrees(input.utcOffsetMinutes / 4);
  const longitudeDeltaDeg = normalizeSignedDegrees(input.longitudeDeg - standardMeridianDeg);
  const longitudeCorrectionMinutes = 4 * longitudeDeltaDeg;
  const solarPosition = calculateSolarPosition({
    observedAtIso,
    latitudeDeg: 0,
    longitudeDeg: input.longitudeDeg
  });
  const equationOfTimeMinutes = solarPosition.equationOfTimeMinutes;
  const apparentSolarCorrectionMinutes = longitudeCorrectionMinutes + equationOfTimeMinutes;
  const civilMinutes = localClockMinutes(localCivilDateTime);
  const civilClock = normalizeClock(civilMinutes);
  const meanSolarClock = normalizeClock(civilMinutes + longitudeCorrectionMinutes);
  const apparentSolarClock = normalizeClock(civilMinutes + apparentSolarCorrectionMinutes);
  const offsetLabel = formatUtcOffset(input.utcOffsetMinutes);

  const warnings = [
    `Sivil saat ${offsetLabel} sabit ofsetiyle değerlendirilir; saat dilimi adı, yasal bölge sınırı veya DST kuralı otomatik uygulanmaz.`,
    'Standart meridyen, UTC ofsetinden 15°/saat kuralıyla türetilen geometrik referanstır; siyasi/yasal saat dilimi sınırı değildir.',
    'Ortalama Güneş zamanı yalnız boylam farkını; görünür Güneş zamanı buna mevcut düşük hassasiyetli Güneş çekirdeğinin zaman denklemini de ekler.',
    'Bu saat karşılaştırması resmi zaman servisi veya yüksek hassasiyetli efemeris değildir.'
  ];

  const traceId = `${SOLAR_TIME_OFFSET_MODEL_ID}:${input.experimentId}:${observedAtIso}:${input.utcOffsetMinutes}:${input.longitudeDeg.toFixed(6)}`;
  const trace: CalculationTrace = {
    summary: 'Kaydedilmiş sabit UTC ofsetinin standart meridyeni ile gözlem boylamı karşılaştırıldı; boylam kaynaklı ortalama Güneş zamanı düzeltmesine zaman denklemi eklenerek görünür Güneş saati üretildi.',
    assumptions: warnings,
    steps: [
      {
        id: 'standard-meridian',
        title: 'Sabit UTC ofsetinin standart meridyeni',
        formula: 'λ_std = UTC_ofset_dk / 4',
        substitution: `${offsetLabel} = ${input.utcOffsetMinutes} dk`,
        result: `λ_std=${format(standardMeridianDeg)}°`
      },
      {
        id: 'longitude-correction',
        title: 'Boylam kaynaklı ortalama Güneş zamanı düzeltmesi',
        formula: 'Δt_lon = 4 · wrap180(λ_obs - λ_std)',
        substitution: `λ_obs=${format(input.longitudeDeg)}°; λ_std=${format(standardMeridianDeg)}°`,
        result: `Δλ=${format(longitudeDeltaDeg)}°; Δt_lon=${format(longitudeCorrectionMinutes)} dk`
      },
      {
        id: 'equation-of-time',
        title: 'Zaman denklemi',
        formula: 'Δt_app = Δt_lon + EoT',
        substitution: `Δt_lon=${format(longitudeCorrectionMinutes)} dk; EoT=${format(equationOfTimeMinutes)} dk`,
        result: `toplam görünür Güneş zamanı düzeltmesi=${format(apparentSolarCorrectionMinutes)} dk`
      },
      {
        id: 'solar-clocks',
        title: 'Sivil, ortalama ve görünür Güneş saatleri',
        formula: 'LMST = civil + Δt_lon; LAST = civil + Δt_lon + EoT',
        substitution: `sivil=${format(civilClock.minuteOfDay)} dk`,
        result: `ortalama=${format(meanSolarClock.minuteOfDay)} dk (gün ${meanSolarClock.dayOffset >= 0 ? '+' : ''}${meanSolarClock.dayOffset}); görünür=${format(apparentSolarClock.minuteOfDay)} dk (gün ${apparentSolarClock.dayOffset >= 0 ? '+' : ''}${apparentSolarClock.dayOffset})`
      }
    ]
  };

  return {
    experimentId: input.experimentId,
    observedAtIso,
    localCivilDateTime,
    utcOffsetMinutes: input.utcOffsetMinutes,
    longitudeDeg: input.longitudeDeg,
    standardMeridianDeg,
    longitudeDeltaDeg,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes,
    apparentSolarCorrectionMinutes,
    civilClock,
    meanSolarClock,
    apparentSolarClock,
    warnings,
    traceId,
    trace
  };
}

export const solarTimeOffsetMetadata: ModelMetadata = {
  id: SOLAR_TIME_OFFSET_MODEL_ID,
  name: 'Sivil Saat / Güneş Zamanı · Astronomik Referans',
  version: SOLAR_TIME_OFFSET_MODEL_VERSION,
  description: 'Sabit UTC ofseti, standart meridyen, gözlem boylamı ve zaman denklemi üzerinden ortalama ve görünür Güneş zamanını karşılaştırır.',
  capabilities: ['solar-position'],
  assumptions: [
    'Sivil zaman sabit UTC ofsetidir; otomatik DST uygulanmaz.',
    'Standart meridyen UTC ofsetinden 15°/saat ile türetilir.',
    'Görünür Güneş zamanı mevcut düşük hassasiyetli Güneş konumu çekirdeğinin zaman denklemini kullanır.'
  ]
};

export function createSolarTimeOffsetPrediction(result: SolarTimeOffsetResult): ModelPrediction {
  return {
    modelId: SOLAR_TIME_OFFSET_MODEL_ID,
    experimentId: result.experimentId,
    status: 'indeterminate',
    metrics: [
      { key: 'standardMeridianDeg', label: 'UTC ofseti standart meridyeni', value: result.standardMeridianDeg, unit: 'deg' },
      { key: 'longitudeDeltaDeg', label: 'Gözlem boylamı - standart meridyen', value: result.longitudeDeltaDeg, unit: 'deg' },
      { key: 'longitudeCorrectionMinutes', label: 'Boylam kaynaklı ortalama Güneş zamanı düzeltmesi', value: result.longitudeCorrectionMinutes, unit: 'min' },
      { key: 'equationOfTimeMinutes', label: 'Zaman denklemi', value: result.equationOfTimeMinutes, unit: 'min' },
      { key: 'apparentSolarCorrectionMinutes', label: 'Toplam görünür Güneş zamanı düzeltmesi', value: result.apparentSolarCorrectionMinutes, unit: 'min' },
      { key: 'civilMinuteOfDay', label: 'Sivil saat · gün dakikası', value: result.civilClock.minuteOfDay, unit: 'min' },
      { key: 'meanSolarMinuteOfDay', label: 'Ortalama Güneş zamanı · gün dakikası', value: result.meanSolarClock.minuteOfDay, unit: 'min' },
      { key: 'apparentSolarMinuteOfDay', label: 'Görünür Güneş zamanı · gün dakikası', value: result.apparentSolarClock.minuteOfDay, unit: 'min' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}
