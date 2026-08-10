import type { CalculationTrace } from '../shared/domain';
import {
  normalizeStellarLocalHorizonMask,
  type NormalizedStellarLocalHorizonMask,
  type StellarLocalHorizonMask,
  type StellarLocalHorizonSourceKind,
  type StellarLocalHorizonStatus
} from './stellar-local-horizon';
import { calculateStellarPosition } from './stellar-position';
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
  geometricAltitudeDeg: number;
  azimuthDeg: number | null;
  localHorizonAltitudeDeg: number | null;
  geometricClearanceDeg: number | null;
  status: StellarLocalHorizonStatus | 'undefined-azimuth';
}

export interface StellarLocalHorizonCrossing {
  kind: 'rise' | 'set';
  observedAtIso: string;
  elapsedMinutes: number;
  azimuthDeg: number | null;
  localHorizonAltitudeDeg: number | null;
}

export interface StellarLocalHorizonTrailResult {
  startAtIso: string;
  endAtIso: string;
  durationMinutes: number;
  sampleIntervalMinutes: number;
  crossingScanIntervalMinutes: number;
  maskSourceKind: StellarLocalHorizonSourceKind;
  maskSourceLabel: string;
  maskPointCount: number;
  maskMaximumAzimuthGapDeg: number;
  samples: StellarLocalHorizonTrailSample[];
  localHorizonCrossings: StellarLocalHorizonCrossing[];
  visibleDurationMinutes: number | null;
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
const MAX_CROSSING_SCAN_INTERVAL_MINUTES = 0.25;

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function normalizeAzimuthDeg(valueDeg: number): number {
  return ((valueDeg % 360) + 360) % 360;
}

function interpolateNormalizedMaskAltitude(
  mask: NormalizedStellarLocalHorizonMask,
  azimuthDeg: number
): number {
  const target = normalizeAzimuthDeg(azimuthDeg);
  const points = mask.points;

  let low = 0;
  let high = points.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid]!.azimuthDeg <= target) low = mid + 1;
    else high = mid;
  }
  const upperIndex = low;

  if (upperIndex > 0) {
    const exact = points[upperIndex - 1]!;
    if (Math.abs(exact.azimuthDeg - target) <= 1e-10) return exact.altitudeDeg;
  }

  const lowerPoint = upperIndex === 0
    ? { azimuthDeg: points[points.length - 1]!.azimuthDeg - 360, altitudeDeg: points[points.length - 1]!.altitudeDeg }
    : points[upperIndex - 1]!;
  const upperPoint = upperIndex === points.length
    ? { azimuthDeg: points[0]!.azimuthDeg + 360, altitudeDeg: points[0]!.altitudeDeg }
    : points[upperIndex]!;

  const spanDeg = upperPoint.azimuthDeg - lowerPoint.azimuthDeg;
  if (!(spanDeg > 0)) {
    throw new StellarLocalHorizonTrailError('Yerel ufuk maskesi azimut aralığı interpolate edilemedi.');
  }
  const fraction = (target - lowerPoint.azimuthDeg) / spanDeg;
  return lowerPoint.altitudeDeg + (upperPoint.altitudeDeg - lowerPoint.altitudeDeg) * fraction;
}

function classifyClearance(clearanceDeg: number): StellarLocalHorizonStatus {
  if (Math.abs(clearanceDeg) <= CLEARANCE_EPSILON_DEG) return 'on-horizon';
  return clearanceDeg > 0 ? 'above' : 'below';
}

function positionAtMs(input: StellarLocalHorizonTrailInput, timestampMs: number) {
  return calculateStellarPosition({
    observedAtIso: new Date(timestampMs).toISOString(),
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    rightAscensionDeg: input.rightAscensionDeg,
    declinationDeg: input.declinationDeg,
    label: input.label,
    includeTrace: false
  });
}

function evaluateAtMs(
  input: StellarLocalHorizonTrailInput,
  normalizedMask: NormalizedStellarLocalHorizonMask,
  timestampMs: number
): {
  timestampMs: number;
  geometricAltitudeDeg: number;
  azimuthDeg: number | null;
  localHorizonAltitudeDeg: number | null;
  geometricClearanceDeg: number | null;
  status: StellarLocalHorizonStatus | 'undefined-azimuth';
} {
  const position = positionAtMs(input, timestampMs);
  if (position.azimuthDeg === null) {
    return {
      timestampMs,
      geometricAltitudeDeg: position.elevationDeg,
      azimuthDeg: null,
      localHorizonAltitudeDeg: null,
      geometricClearanceDeg: null,
      status: 'undefined-azimuth'
    };
  }
  const localHorizonAltitudeDeg = interpolateNormalizedMaskAltitude(normalizedMask, position.azimuthDeg);
  const geometricClearanceDeg = position.elevationDeg - localHorizonAltitudeDeg;
  return {
    timestampMs,
    geometricAltitudeDeg: position.elevationDeg,
    azimuthDeg: position.azimuthDeg,
    localHorizonAltitudeDeg,
    geometricClearanceDeg,
    status: classifyClearance(geometricClearanceDeg)
  };
}

function refineLocalHorizonCrossing(
  input: StellarLocalHorizonTrailInput,
  normalizedMask: NormalizedStellarLocalHorizonMask,
  leftMs: number,
  rightMs: number,
  leftClearanceDeg: number,
  rightClearanceDeg: number
): { timestampMs: number; azimuthDeg: number | null; localHorizonAltitudeDeg: number | null } | null {
  if (Math.sign(leftClearanceDeg) === Math.sign(rightClearanceDeg)) return null;

  let lowMs = leftMs;
  let highMs = rightMs;
  let lowClearanceDeg = leftClearanceDeg;

  for (let index = 0; index < 60 && highMs - lowMs > ROOT_TIME_TOLERANCE_MS; index += 1) {
    const midMs = (lowMs + highMs) / 2;
    const mid = evaluateAtMs(input, normalizedMask, midMs);
    if (mid.geometricClearanceDeg === null) {
      throw new StellarLocalHorizonTrailError('Yerel ufuk geçişi inceltilirken azimut tanımsız oldu.');
    }
    if (Math.abs(mid.geometricClearanceDeg) <= CLEARANCE_EPSILON_DEG) {
      return {
        timestampMs: midMs,
        azimuthDeg: mid.azimuthDeg,
        localHorizonAltitudeDeg: mid.localHorizonAltitudeDeg
      };
    }
    if (Math.sign(mid.geometricClearanceDeg) === Math.sign(lowClearanceDeg)) {
      lowMs = midMs;
      lowClearanceDeg = mid.geometricClearanceDeg;
    } else {
      highMs = midMs;
    }
  }

  const timestampMs = (lowMs + highMs) / 2;
  const result = evaluateAtMs(input, normalizedMask, timestampMs);
  return {
    timestampMs,
    azimuthDeg: result.azimuthDeg,
    localHorizonAltitudeDeg: result.localHorizonAltitudeDeg
  };
}

function dedupeCrossings(crossings: StellarLocalHorizonCrossing[]): StellarLocalHorizonCrossing[] {
  const sorted = [...crossings].sort((a, b) => a.elapsedMinutes - b.elapsedMinutes);
  return sorted.filter((crossing, index) => {
    if (index === 0) return true;
    return Math.abs(crossing.elapsedMinutes - sorted[index - 1]!.elapsedMinutes) > 1 / 60;
  });
}

function finiteSign(value: number | null): -1 | 0 | 1 | null {
  if (value === null) return null;
  if (Math.abs(value) <= CLEARANCE_EPSILON_DEG) return 0;
  return value > 0 ? 1 : -1;
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
        geometricAltitudeDeg: sample.elevationDeg,
        azimuthDeg: null,
        localHorizonAltitudeDeg: null,
        geometricClearanceDeg: null,
        status: 'undefined-azimuth'
      };
    }
    const localHorizonAltitudeDeg = interpolateNormalizedMaskAltitude(normalizedMask, sample.azimuthDeg);
    const geometricClearanceDeg = sample.elevationDeg - localHorizonAltitudeDeg;
    return {
      observedAtIso: sample.observedAtIso,
      elapsedMinutes: sample.elapsedMinutes,
      geometricAltitudeDeg: sample.elevationDeg,
      azimuthDeg: sample.azimuthDeg,
      localHorizonAltitudeDeg,
      geometricClearanceDeg,
      status: classifyClearance(geometricClearanceDeg)
    };
  });

  const crossingScanIntervalMinutes = Math.min(
    input.sampleIntervalMinutes,
    MAX_CROSSING_SCAN_INTERVAL_MINUTES
  );
  const crossingScanIntervalMs = crossingScanIntervalMinutes * 60_000;
  const scanTimesMs: number[] = [];
  for (let timestampMs = startMs; timestampMs < endMs; timestampMs += crossingScanIntervalMs) {
    scanTimesMs.push(timestampMs);
  }
  if (scanTimesMs.length === 0 || scanTimesMs[scanTimesMs.length - 1] !== endMs) {
    scanTimesMs.push(endMs);
  }
  const scan = scanTimesMs.map((timestampMs) => evaluateAtMs(input, normalizedMask, timestampMs));

  const rawCrossings: StellarLocalHorizonCrossing[] = [];
  for (let index = 0; index < scan.length - 1; index += 1) {
    const left = scan[index]!;
    const right = scan[index + 1]!;
    const leftSign = finiteSign(left.geometricClearanceDeg);
    const rightSign = finiteSign(right.geometricClearanceDeg);
    if (leftSign === null || rightSign === null || leftSign === 0 || rightSign === 0 || leftSign === rightSign) continue;

    const crossing = refineLocalHorizonCrossing(
      input,
      normalizedMask,
      left.timestampMs,
      right.timestampMs,
      left.geometricClearanceDeg!,
      right.geometricClearanceDeg!
    );
    if (!crossing) continue;
    const kind: StellarLocalHorizonCrossing['kind'] = leftSign < rightSign ? 'rise' : 'set';
    rawCrossings.push({
      kind,
      observedAtIso: new Date(crossing.timestampMs).toISOString(),
      elapsedMinutes: (crossing.timestampMs - startMs) / 60_000,
      azimuthDeg: crossing.azimuthDeg,
      localHorizonAltitudeDeg: crossing.localHorizonAltitudeDeg
    });
  }

  for (let index = 1; index < scan.length - 1; index += 1) {
    const previous = scan[index - 1]!;
    const current = scan[index]!;
    const next = scan[index + 1]!;
    const previousSign = finiteSign(previous.geometricClearanceDeg);
    const currentSign = finiteSign(current.geometricClearanceDeg);
    const nextSign = finiteSign(next.geometricClearanceDeg);
    if (
      currentSign !== 0 ||
      previousSign === null ||
      nextSign === null ||
      previousSign === 0 ||
      nextSign === 0 ||
      previousSign === nextSign
    ) {
      continue;
    }
    rawCrossings.push({
      kind: previousSign < nextSign ? 'rise' : 'set',
      observedAtIso: new Date(current.timestampMs).toISOString(),
      elapsedMinutes: (current.timestampMs - startMs) / 60_000,
      azimuthDeg: current.azimuthDeg,
      localHorizonAltitudeDeg: current.localHorizonAltitudeDeg
    });
  }
  const localHorizonCrossings = dedupeCrossings(rawCrossings);

  const firstFiniteNonTangential = scan.find((entry) => {
    const sign = finiteSign(entry.geometricClearanceDeg);
    return sign === -1 || sign === 1;
  });
  const anyFinite = scan.some((entry) => entry.geometricClearanceDeg !== null);
  let visibleDurationMinutes: number | null = null;
  if (anyFinite) {
    if (!firstFiniteNonTangential) {
      visibleDurationMinutes = input.durationMinutes;
    } else {
      let visibleDurationMs = 0;
      let cursorMs = startMs;
      let above = firstFiniteNonTangential.geometricClearanceDeg! > 0;
      for (const crossing of localHorizonCrossings) {
        const crossingMs = startMs + crossing.elapsedMinutes * 60_000;
        if (above) visibleDurationMs += Math.max(0, crossingMs - cursorMs);
        cursorMs = crossingMs;
        above = crossing.kind === 'rise';
      }
      if (above) visibleDurationMs += Math.max(0, endMs - cursorMs);
      visibleDurationMinutes = visibleDurationMs / 60_000;
    }
  }

  const finiteClearances = samples
    .map((sample) => sample.geometricClearanceDeg)
    .filter((value): value is number => value !== null);
  const sampledMinimumClearanceDeg = finiteClearances.length > 0 ? Math.min(...finiteClearances) : null;
  const sampledMaximumClearanceDeg = finiteClearances.length > 0 ? Math.max(...finiteClearances) : null;
  const traceId = `${STELLAR_LOCAL_HORIZON_TRAIL_ALGORITHM_ID}:${geometricTrail.traceId}:${normalizedMask.sourceKind}:${normalizedMask.sourceLabel}:${normalizedMask.points.length}`;
  const trace: CalculationTrace = {
    summary: 'Geometrik yıldız izi, azimuta bağlı yerel/doğal skyline maskesine göre yeniden sınıflandırıldı ve yerel-ufuk geçişleri zaman ekseninde inceltildi.',
    assumptions: [
      ...geometricTrail.trace.assumptions,
      'Skyline maskesi astronomik 0° ufuktan ayrıdır ve yalnız geometrik yön açıklığı üretir.',
      'Atmosferik kırılma, extinction, sky brightness ve çıplak-göz algı eşiği bu sonuçta uygulanmaz.',
      'Maskenin ara azimutları döngüsel doğrusal interpolasyonla değerlendirilir.',
      'Yerel ufuk kök taraması çıktı örneklemesinden bağımsız olarak en fazla 15 saniyelik adımla yapılır; işaret değişimleri 250 ms altı zaman aralığına kadar inceltilir.',
      'Sürekli fakat çok hızlı değişen bir skyline ile 15 saniyeden kısa aralıkta çift geçiş oluşursa örneklemeli tarama bunu garanti ederek yakalayamaz; maske çözünürlüğü provenans olarak raporlanır.'
    ],
    steps: [
      {
        id: 'local-horizon-mask',
        title: 'Yerel skyline maskesi',
        formula: 'h_skyline(A) = döngüsel doğrusal interpolasyon',
        substitution: `${normalizedMask.points.length} nokta; kaynak=${normalizedMask.sourceKind}; etiket=${normalizedMask.sourceLabel}`,
        result: `en büyük azimut boşluğu=${format(normalizedMask.maximumAzimuthGapDeg)}°`
      },
      {
        id: 'local-clearance',
        title: 'Yerel ufuk açıklığı',
        formula: 'Δh(t) = h_yıldız(t) - h_skyline(A(t))',
        substitution: `${samples.length} çıktı örneği`,
        result: sampledMinimumClearanceDeg === null || sampledMaximumClearanceDeg === null
          ? 'azimut tanımsız örnekler nedeniyle sonlu açıklık özeti üretilemedi'
          : `Δh_min=${format(sampledMinimumClearanceDeg)}°; Δh_max=${format(sampledMaximumClearanceDeg)}°`
      },
      {
        id: 'local-horizon-crossings',
        title: 'Yerel ufuk geçişleri',
        formula: 'Δh(t)=0° kökleri',
        substitution: `tarama adımı=${format(crossingScanIntervalMinutes)} dk; ${localHorizonCrossings.length} işaret değişimi`,
        result: localHorizonCrossings.length === 0
          ? 'yerel ufuk geçişi yok'
          : localHorizonCrossings.map((crossing) => `${crossing.kind}@${crossing.observedAtIso}`).join('; ')
      },
      {
        id: 'local-visible-duration',
        title: 'Yerel ufuk üstü geometrik süre',
        formula: 'Σ Δt(Δh≥0°)',
        substitution: `pencere=${format(input.durationMinutes)} dk`,
        result: visibleDurationMinutes === null
          ? 'azimut tüm pencere boyunca tanımsız olduğundan süre üretilemedi'
          : `${format(visibleDurationMinutes)} dk`
      }
    ]
  };

  return {
    startAtIso: geometricTrail.startAtIso,
    endAtIso: geometricTrail.endAtIso,
    durationMinutes: geometricTrail.durationMinutes,
    sampleIntervalMinutes: geometricTrail.sampleIntervalMinutes,
    crossingScanIntervalMinutes,
    maskSourceKind: normalizedMask.sourceKind,
    maskSourceLabel: normalizedMask.sourceLabel,
    maskPointCount: normalizedMask.points.length,
    maskMaximumAzimuthGapDeg: normalizedMask.maximumAzimuthGapDeg,
    samples,
    localHorizonCrossings,
    visibleDurationMinutes,
    sampledMinimumClearanceDeg,
    sampledMaximumClearanceDeg,
    traceId,
    trace
  };
}
