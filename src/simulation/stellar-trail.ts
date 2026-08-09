import type { CalculationTrace } from '../shared/domain';
import {
  calculateStellarPosition,
  type StellarPositionInput,
  type StellarHorizonClass
} from './stellar-position';

export const STELLAR_TRAIL_ALGORITHM_ID = 'stellar-trail-geometric';
export const STELLAR_TRAIL_ALGORITHM_VERSION = '0.1.0';

export interface StellarTrailInput extends Omit<StellarPositionInput, 'observedAtIso'> {
  startAtIso: string;
  durationMinutes: number;
  sampleIntervalMinutes: number;
}

export interface StellarTrailSample {
  observedAtIso: string;
  elapsedMinutes: number;
  elevationDeg: number;
  azimuthDeg: number | null;
  hourAngleDeg: number;
  aboveGeometricHorizon: boolean;
}

export interface StellarHorizonCrossing {
  kind: 'rise' | 'set';
  observedAtIso: string;
  elapsedMinutes: number;
  azimuthDeg: number | null;
}

export interface StellarTrailResult {
  startAtIso: string;
  endAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  rightAscensionDeg: number;
  declinationDeg: number;
  durationMinutes: number;
  sampleIntervalMinutes: number;
  horizonClass: StellarHorizonClass;
  samples: StellarTrailSample[];
  horizonCrossings: StellarHorizonCrossing[];
  visibleDurationMinutes: number;
  sampledMinimumElevationDeg: number;
  sampledMaximumElevationDeg: number;
  traceId: string;
  trace: CalculationTrace;
}

export class StellarTrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarTrailError';
  }
}

const MAX_DURATION_MINUTES = 48 * 60;
const MAX_SAMPLE_COUNT = 4_000;
const ROOT_TIME_TOLERANCE_MS = 250;

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateTrailInput(input: StellarTrailInput): Date {
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > MAX_DURATION_MINUTES) {
    throw new StellarTrailError('İz süresi 0 dakikadan büyük ve en fazla 48 saat olmalıdır.');
  }
  if (!Number.isFinite(input.sampleIntervalMinutes) || input.sampleIntervalMinutes <= 0) {
    throw new StellarTrailError('Örnekleme aralığı 0 dakikadan büyük olmalıdır.');
  }
  const start = new Date(input.startAtIso);
  if (Number.isNaN(start.getTime())) {
    throw new StellarTrailError('İz başlangıç zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  calculateStellarPosition({
    observedAtIso: input.startAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg: input.rightAscensionDeg,
    declinationDeg: input.declinationDeg,
    label: input.label
  });
  const estimatedSampleCount = Math.ceil(input.durationMinutes / input.sampleIntervalMinutes) + 1;
  if (estimatedSampleCount > MAX_SAMPLE_COUNT) {
    throw new StellarTrailError(`Bu iz ayarı ${MAX_SAMPLE_COUNT} örnek sınırını aşar; örnekleme aralığını büyütün.`);
  }
  return start;
}

function positionAtMs(input: StellarTrailInput, timestampMs: number) {
  return calculateStellarPosition({
    observedAtIso: new Date(timestampMs).toISOString(),
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg: input.rightAscensionDeg,
    declinationDeg: input.declinationDeg,
    label: input.label
  });
}

function refineHorizonCrossing(
  input: StellarTrailInput,
  leftMs: number,
  rightMs: number,
  leftElevationDeg: number,
  rightElevationDeg: number
): { timestampMs: number; elevationDeg: number; azimuthDeg: number | null } | null {
  if (leftElevationDeg === 0) {
    const result = positionAtMs(input, leftMs);
    return { timestampMs: leftMs, elevationDeg: result.elevationDeg, azimuthDeg: result.azimuthDeg };
  }
  if (rightElevationDeg === 0) {
    const result = positionAtMs(input, rightMs);
    return { timestampMs: rightMs, elevationDeg: result.elevationDeg, azimuthDeg: result.azimuthDeg };
  }
  if (Math.sign(leftElevationDeg) === Math.sign(rightElevationDeg)) return null;

  let lowMs = leftMs;
  let highMs = rightMs;
  let lowElevationDeg = leftElevationDeg;
  let midResult = positionAtMs(input, (lowMs + highMs) / 2);

  for (let index = 0; index < 50 && highMs - lowMs > ROOT_TIME_TOLERANCE_MS; index += 1) {
    const midMs = (lowMs + highMs) / 2;
    midResult = positionAtMs(input, midMs);
    if (Math.sign(midResult.elevationDeg) === Math.sign(lowElevationDeg)) {
      lowMs = midMs;
      lowElevationDeg = midResult.elevationDeg;
    } else {
      highMs = midMs;
    }
  }

  const timestampMs = (lowMs + highMs) / 2;
  const result = positionAtMs(input, timestampMs);
  return { timestampMs, elevationDeg: result.elevationDeg, azimuthDeg: result.azimuthDeg };
}

function dedupeCrossings(crossings: StellarHorizonCrossing[]): StellarHorizonCrossing[] {
  const sorted = [...crossings].sort((a, b) => a.elapsedMinutes - b.elapsedMinutes);
  return sorted.filter((crossing, index) => {
    if (index === 0) return true;
    return Math.abs(crossing.elapsedMinutes - sorted[index - 1]!.elapsedMinutes) > 1 / 60;
  });
}

export function calculateStellarTrail(input: StellarTrailInput): StellarTrailResult {
  const start = validateTrailInput(input);
  const startMs = start.getTime();
  const durationMs = input.durationMinutes * 60_000;
  const endMs = startMs + durationMs;
  const intervalMs = input.sampleIntervalMinutes * 60_000;
  const sampleTimesMs: number[] = [];
  for (let timestampMs = startMs; timestampMs < endMs; timestampMs += intervalMs) {
    sampleTimesMs.push(timestampMs);
  }
  if (sampleTimesMs.length === 0 || sampleTimesMs[sampleTimesMs.length - 1] !== endMs) {
    sampleTimesMs.push(endMs);
  }

  const positionResults = sampleTimesMs.map((timestampMs) => positionAtMs(input, timestampMs));
  const samples: StellarTrailSample[] = positionResults.map((result, index) => ({
    observedAtIso: result.observedAtIso,
    elapsedMinutes: (sampleTimesMs[index]! - startMs) / 60_000,
    elevationDeg: result.elevationDeg,
    azimuthDeg: result.azimuthDeg,
    hourAngleDeg: result.hourAngleDeg,
    aboveGeometricHorizon: result.aboveGeometricHorizon
  }));

  const rawCrossings: StellarHorizonCrossing[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = samples[index]!;
    const right = samples[index + 1]!;
    if (left.elevationDeg === 0 && right.elevationDeg === 0) continue;
    if (Math.sign(left.elevationDeg) === Math.sign(right.elevationDeg) && left.elevationDeg !== 0 && right.elevationDeg !== 0) continue;
    const crossing = refineHorizonCrossing(
      input,
      sampleTimesMs[index]!,
      sampleTimesMs[index + 1]!,
      left.elevationDeg,
      right.elevationDeg
    );
    if (!crossing) continue;
    const kind: StellarHorizonCrossing['kind'] = left.elevationDeg < right.elevationDeg ? 'rise' : 'set';
    rawCrossings.push({
      kind,
      observedAtIso: new Date(crossing.timestampMs).toISOString(),
      elapsedMinutes: (crossing.timestampMs - startMs) / 60_000,
      azimuthDeg: crossing.azimuthDeg
    });
  }
  const horizonCrossings = dedupeCrossings(rawCrossings);

  let visibleDurationMs = 0;
  let cursorMs = startMs;
  let above = positionResults[0]!.elevationDeg >= 0;
  for (const crossing of horizonCrossings) {
    const crossingMs = new Date(crossing.observedAtIso).getTime();
    if (above) visibleDurationMs += Math.max(0, crossingMs - cursorMs);
    cursorMs = crossingMs;
    above = crossing.kind === 'rise';
  }
  if (above) visibleDurationMs += Math.max(0, endMs - cursorMs);

  const elevations = samples.map((sample) => sample.elevationDeg);
  const sampledMinimumElevationDeg = Math.min(...elevations);
  const sampledMaximumElevationDeg = Math.max(...elevations);
  const horizonClass = positionResults[0]!.horizonClass;
  const startAtIso = new Date(startMs).toISOString();
  const endAtIso = new Date(endMs).toISOString();
  const traceId = `${STELLAR_TRAIL_ALGORITHM_ID}:${startAtIso}:${endAtIso}:${input.latitudeDeg.toFixed(6)}:${input.longitudeDeg.toFixed(6)}:${input.rightAscensionDeg.toFixed(6)}:${input.declinationDeg.toFixed(6)}:${input.sampleIntervalMinutes}`;
  const trace: CalculationTrace = {
    summary: 'Sabit of-date ekvatoryal yıldız yönü seçilen zaman penceresi boyunca yeniden çözülerek geometrik yıldız izi ve ufuk geçişleri örneklendi.',
    assumptions: [
      ...positionResults[0]!.trace.assumptions,
      'Yıldız koordinatı seçilen iz penceresi boyunca sabit kabul edilir.',
      'Ufuk geçişleri örnekler arasındaki işaret değişiminden bulunur ve zaman ekseninde ikili kök aramayla inceltilir.',
      'İz çizgisi optik poz süresi, kamera projeksiyonu veya sensör parlaklığı modeli değildir.'
    ],
    steps: [
      {
        id: 'trail-window',
        title: 'İz zaman penceresi',
        formula: 't ∈ [t0, t0 + Δt]',
        substitution: `t0=${startAtIso}; Δt=${format(input.durationMinutes)} dk`,
        result: `t1=${endAtIso}`
      },
      {
        id: 'trail-sampling',
        title: 'Yatay koordinat örnekleme',
        formula: 'her t_i için equatorial → LMST → (h,A)',
        substitution: `örnek aralığı=${format(input.sampleIntervalMinutes)} dk`,
        result: `${samples.length} örnek; h_min=${format(sampledMinimumElevationDeg)}°; h_max=${format(sampledMaximumElevationDeg)}°`
      },
      {
        id: 'horizon-crossings',
        title: 'Geometrik ufuk geçişleri',
        formula: 'h(t)=0° kökleri',
        substitution: `${horizonCrossings.length} işaret değişimi`,
        result: horizonCrossings.length === 0
          ? `geçiş yok; sınıf=${horizonClass}`
          : horizonCrossings.map((crossing) => `${crossing.kind}@${crossing.observedAtIso}`).join('; ')
      },
      {
        id: 'visible-duration',
        title: 'Geometrik ufuk üstü süre',
        formula: 'Σ Δt(h≥0°)',
        substitution: `pencere=${format(input.durationMinutes)} dk`,
        result: `${format(visibleDurationMs / 60_000)} dk`
      }
    ]
  };

  return {
    startAtIso,
    endAtIso,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg: input.rightAscensionDeg,
    declinationDeg: input.declinationDeg,
    durationMinutes: input.durationMinutes,
    sampleIntervalMinutes: input.sampleIntervalMinutes,
    horizonClass,
    samples,
    horizonCrossings,
    visibleDurationMinutes: visibleDurationMs / 60_000,
    sampledMinimumElevationDeg,
    sampledMaximumElevationDeg,
    traceId,
    trace
  };
}
