import type { CalculationTrace } from '../shared/domain';
import {
  calculateStellarLocalHorizonClearance,
  normalizeStellarLocalHorizonMask,
  type StellarLocalHorizonMask,
  type StellarLocalHorizonSource
} from './stellar-local-horizon';
import {
  calculateStellarPosition,
  type StellarPositionInput
} from './stellar-position';
import {
  calculateStellarTrail,
  type StellarTrailInput
} from './stellar-trail';

export const STELLAR_LOCAL_HORIZON_TRAIL_ALGORITHM_ID = 'stellar-trail-local-horizon';
export const STELLAR_LOCAL_HORIZON_TRAIL_ALGORITHM_VERSION = '0.1.0';

export interface StellarLocalHorizonTrailInput extends StellarTrailInput {
  horizonMask: StellarLocalHorizonMask;
}

export interface StellarLocalHorizonTrailSample {
  observedAtIso: string;
  elapsedMinutes: number;
  elevationDeg: number;
  azimuthDeg: number | null;
  localHorizonElevationDeg: number | null;
  clearanceDeg: number | null;
  localHorizonStatus: 'above' | 'on-horizon' | 'below' | 'undefined-azimuth';
}

export interface StellarLocalHorizonCrossing {
  kind: 'rise' | 'set';
  observedAtIso: string;
  elapsedMinutes: number;
  azimuthDeg: number | null;
  localHorizonElevationDeg: number | null;
}

export interface StellarLocalHorizonTrailResult {
  startAtIso: string;
  endAtIso: string;
  durationMinutes: number;
  sampleIntervalMinutes: number;
  maskSource: StellarLocalHorizonSource;
  maskSourceLabel: string;
  maskPointCount: number;
  maskMaximumAzimuthGapDeg: number;
  samples: StellarLocalHorizonTrailSample[];
  localHorizonCrossings: StellarLocalHorizonCrossing[];
  visibleDurationMinutes: number;
  sampledMinimumClearanceDeg: number | null;
  sampledMaximumClearanceDeg: number | null;
  traceId: string;
  trace: CalculationTrace;
}

export class StellarLocalHorizonTrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarLocalHorizonTrailError';
  }
}

const ROOT_TIME_TOLERANCE_MS = 250;
const CLEARANCE_EPSILON_DEG = 1e-9;

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function positionAtMs(input: StellarLocalHorizonTrailInput, timestampMs: number) {
  return calculateStellarPosition({
    observedAtIso: new Date(timestampMs).toISOString(),
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg: input.rightAscensionDeg,
    declinationDeg: input.declinationDeg,
    label: input.label
  });
}

function signedClearanceAtMs(
  input: StellarLocalHorizonTrailInput,
  normalizedMask: ReturnType<typeof normalizeStellarLocalHorizonMask>,
  timestampMs: number
): {
  elevationDeg: number;
  azimuthDeg: number | null;
  localHorizonElevationDeg: number | null;
  clearanceDeg: number | null;
} {
  const position = positionAtMs(input, timestampMs);
  if (position.azimuthDeg === null) {
    return {
      elevationDeg: position.elevationDeg,
      azimuthDeg: null,
      localHorizonElevationDeg: null,
      clearanceDeg: null
    };
  }
  const clearance = calculateStellarLocalHorizonClearance({
    mask: normalizedMask,
    azimuthDeg: position.azimuthDeg,
    geometricElevationDeg: position.elevationDeg
  });
  return {
    elevationDeg: position.elevationDeg,
    azimuthDeg: position.azimuthDeg,
    localHorizonElevationDeg: clearance.localHorizonElevationDeg,
    clearanceDeg: clearance.clearanceDeg
  };
}

function refineLocalHorizonCrossing(
  input: StellarLocalHorizonTrailInput,
  normalizedMask: ReturnType<typeof normalizeStellarLocalHorizonMask>,
  leftMs: number,
  rightMs: number,
  leftClearanceDeg: number,
  rightClearanceDeg: number
): { timestampMs: number; azimuthDeg: number | null; localHorizonElevationDeg: number | null } | null {
  if (Math.abs(leftClearanceDeg) <= CLEARANCE_EPSILON_DEG) {
    const exact = signedClearanceAtMs(input, normalizedMask, leftMs);
    return {
      timestampMs: leftMs,
      azimuthDeg: exact.azimuthDeg,
      localHorizonElevationDeg: exact.localHorizonElevationDeg
    };
  }
  if (Math.abs(rightClearanceDeg) <= CLEARANCE_EPSILON_DEG) {
    const exact = signedClearanceAtMs(input, normalizedMask, rightMs);
    return {
      timestampMs: rightMs,
      azimuthDeg: exact.azimuthDeg,
      localHorizonElevationDeg: exact.localHorizonElevationDeg
    };
  }
  if (Math.sign(leftClearanceDeg) === Math.sign(rightClearanceDeg)) return null;

  let lowMs = leftMs;
  let highMs = rightMs;
  let lowClearanceDeg = leftClearanceDeg;

  for (let index = 0; index < 60 && highMs - lowMs > ROOT_TIME_TOLERANCE_MS; index += 1) {
    const midMs = (lowMs + highMs) / 2;
    const mid = signedClearanceAtMs(input, normalizedMask, midMs);
    if (mid.clearanceDeg === null) {
      throw new StellarLocalHorizonTrailError('Yerel ufuk geçişi inceltilirken azimut tanımsız oldu.');
    }
    if (Math.abs(mid.clearanceDeg) <= CLEARANCE_EPSILON_DEG) {
      return {
        timestampMs: midMs,
        azimuthDeg: mid.azimuthDeg,
        localHorizonElevationDeg: mid.localHorizonElevationDeg
      };
    }
    if (Math.sign(mid.clearanceDeg) === Math.sign(lowClearanceDeg)) {
      lowMs = midMs;
      lowClearanceDeg = mid.clearanceDeg;
    } else {
      highMs = midMs;
    }
  }

  const timestampMs = (lowMs + highMs) / 2;
  const result = signedClearanceAtMs(input, normalizedMask, timestampMs);
  return {
    timestampMs,
    azimuthDeg: result.azimuthDeg,
    localHorizonElevationDeg: result.localHorizonElevationDeg
  };
}

function dedupeCrossings(crossings: StellarLocalHorizonCrossing[]): StellarLocalHorizonCrossing[] {
  const sorted = [...crossings].sort((a, b) => a.elapsedMinutes - b.elapsedMinutes);
  return sorted.filter((crossing, index) => {
    if (index === 0) return true;
    return Math.abs(crossing.elapsedMinutes - sorted[index - 1]!.elapsedMinutes) > 1 / 60;
  });
}

export function calculateStellarLocalHorizonTrail(
  input: StellarLocalHorizonTrailInput
): StellarLocalHorizonTrailResult {
  const normalizedMask = normalizeStellarLocalHorizonMask(input.horizonMask);
  const geometricTrail = calculateStellarTrail(input);
  const startMs = new Date(geometricTrail.startAtIso).getTime();
  const endMs = new Date(geometricTrail.endAtIso).getTime();

  const samples: StellarLocalHorizonTrailSample[] = geometricTrail.samples.map((sample) => {
    if (sample.azimuthDeg === null) {
      return {
        observedAtIso: sample.observedAtIso,
        elapsedMinutes: sample.elapsedMinutes,
        elevationDeg: sample.elevationDeg,
        azimuthDeg: null,
        localHorizonElevationDeg: null,
        clearanceDeg: null,
        localHorizonStatus: 'undefined-azimuth'
      };
    }
    const clearance = calculateStellarLocalHorizonClearance({
      mask: normalizedMask,
      azimuthDeg: sample.azimuthDeg,
      geometricElevationDeg: sample.elevationDeg
    });
    return {
      observedAtIso: sample.observedAtIso,
      elapsedMinutes: sample.elapsedMinutes,
      elevationDeg: sample.elevationDeg,
      azimuthDeg: sample.azimuthDeg,
      localHorizonElevationDeg: clearance.localHorizonElevationDeg,
      clearanceDeg: clearance.clearanceDeg,
      localHorizonStatus: clearance.status
    };
  });

  const rawCrossings: StellarLocalHorizonCrossing[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = samples[index]!;
    const right = samples[index + 1]!;
    if (left.clearanceDeg === null || right.clearanceDeg === null) continue;
    if (
      Math.sign(left.clearanceDeg) === Math.sign(right.clearanceDeg) &&
      Math.abs(left.clearanceDeg) > CLEARANCE_EPSILON_DEG &&
      Math.abs(right.clearanceDeg) > CLEARANCE_EPSILON_DEG
    ) {
      continue;
    }
    if (
      Math.abs(left.clearanceDeg) <= CLEARANCE_EPSILON_DEG &&
      Math.abs(right.clearanceDeg) <= CLEARANCE_EPSILON_DEG
    ) {
      continue;
    }
    const leftMs = new Date(left.observedAtIso).getTime();
    const rightMs = new Date(right.observedAtIso).getTime();
    const crossing = refineLocalHorizonCrossing(
      input,
      normalizedMask,
      leftMs,
      rightMs,
      left.clearanceDeg,
      right.clearanceDeg
    );
    if (!crossing) continue;
    const kind: StellarLocalHorizonCrossing['kind'] = left.clearanceDeg < right.clearanceDeg ? 'rise' : 'set';
    rawCrossings.push({
      kind,
      observedAtIso: new Date(crossing.timestampMs).toISOString(),
      elapsedMinutes: (crossing.timestampMs - startMs) / 60_000,
      azimuthDeg: crossing.azimuthDeg,
      localHorizonElevationDeg: crossing.localHorizonElevationDeg
    });
  }
  const localHorizonCrossings = dedupeCrossings(rawCrossings);

  const firstFiniteSample = samples.find((sample) => sample.clearanceDeg !== null);
  let visibleDurationMs = 0;
  if (firstFiniteSample) {
    let cursorMs = startMs;
    let above = firstFiniteSample.clearanceDeg! >= 0;
    for (const crossing of localHorizonCrossings) {
      const crossingMs = new Date(crossing.observedAtIso).getTime();
      if (above) visibleDurationMs += Math.max(0, crossingMs - cursorMs);
      cursorMs = crossingMs;
      above = crossing.kind === 'rise';
    }
    if (above) visibleDurationMs += Math.max(0, endMs - cursorMs);
  }

  const finiteClearances = samples
    .map((sample) => sample.clearanceDeg)
    .filter((value): value is number => value !== null);
  const sampledMinimumClearanceDeg = finiteClearances.length > 0 ? Math.min(...finiteClearances) : null;
  const sampledMaximumClearanceDeg = finiteClearances.length > 0 ? Math.max(...finiteClearances) : null;
  const traceId = `${STELLAR_LOCAL_HORIZON_TRAIL_ALGORITHM_ID}:${geometricTrail.traceId}:${normalizedMask.source}:${normalizedMask.sourceLabel}:${normalizedMask.points.length}`;
  const trace: CalculationTrace = {
    summary: 'Geometrik yıldız izi, azimuta bağlı yerel/doğal skyline maskesine göre yeniden sınıflandırıldı ve local-horizon geçişleri zaman ekseninde inceltildi.',
    assumptions: [
      ...geometricTrail.trace.assumptions,
      'Skyline maskesi astronomik 0° ufuktan ayrıdır ve yalnız geometrik yön açıklığı üretir.',
      'Atmosferik kırılma, extinction, sky brightness ve çıplak-göz algı eşiği bu sonuçta uygulanmaz.',
      'Maskenin ara azimutları döngüsel doğrusal interpolasyonla değerlendirilir.',
      'Maskenin kaynak ve örnekleme yoğunluğu sonuçla birlikte provenans olarak korunur.'
    ],
    steps: [
      {
        id: 'local-horizon-mask',
        title: 'Yerel skyline maskesi',
        formula: 'h_skyline(A) = döngüsel doğrusal interpolasyon',
        substitution: `${normalizedMask.points.length} nokta; kaynak=${normalizedMask.source}; etiket=${normalizedMask.sourceLabel}`,
        result: `en büyük azimut boşluğu=${format(normalizedMask.maximumAzimuthGapDeg)}°`
      },
      {
        id: 'local-clearance',
        title: 'Yerel ufuk açıklığı',
        formula: 'Δh(t) = h_yıldız(t) - h_skyline(A(t))',
        substitution: `${samples.length} yıldız izi örneği`,
        result: sampledMinimumClearanceDeg === null || sampledMaximumClearanceDeg === null
          ? 'azimut tanımsız örnekler nedeniyle sonlu açıklık özeti üretilemedi'
          : `Δh_min=${format(sampledMinimumClearanceDeg)}°; Δh_max=${format(sampledMaximumClearanceDeg)}°`
      },
      {
        id: 'local-horizon-crossings',
        title: 'Yerel ufuk geçişleri',
        formula: 'Δh(t)=0° kökleri',
        substitution: `${localHorizonCrossings.length} işaret değişimi`,
        result: localHorizonCrossings.length === 0
          ? 'yerel ufuk geçişi yok'
          : localHorizonCrossings.map((crossing) => `${crossing.kind}@${crossing.observedAtIso}`).join('; ')
      },
      {
        id: 'local-visible-duration',
        title: 'Yerel ufuk üstü geometrik süre',
        formula: 'Σ Δt(Δh≥0°)',
        substitution: `pencere=${format(input.durationMinutes)} dk`,
        result: `${format(visibleDurationMs / 60_000)} dk`
      }
    ]
  };

  return {
    startAtIso: geometricTrail.startAtIso,
    endAtIso: geometricTrail.endAtIso,
    durationMinutes: geometricTrail.durationMinutes,
    sampleIntervalMinutes: geometricTrail.sampleIntervalMinutes,
    maskSource: normalizedMask.source,
    maskSourceLabel: normalizedMask.sourceLabel,
    maskPointCount: normalizedMask.points.length,
    maskMaximumAzimuthGapDeg: normalizedMask.maximumAzimuthGapDeg,
    samples,
    localHorizonCrossings,
    visibleDurationMinutes: visibleDurationMs / 60_000,
    sampledMinimumClearanceDeg,
    sampledMaximumClearanceDeg,
    traceId,
    trace
  };
}
