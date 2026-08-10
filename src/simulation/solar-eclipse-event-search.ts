import { calculateLunarPosition } from './lunar-position';
import {
  calculateSolarEclipseOverlap,
  type SolarEclipseOverlapResult
} from './solar-eclipse-overlap';
import { calculateSolarPosition } from './solar-position';

export const SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID = 'solar-eclipse-event-search-low-precision';
export const SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_VERSION = '0.1.0';

const DEFAULT_HALF_WINDOW_HOURS = 12;
const DEFAULT_COARSE_STEP_MINUTES = 5;
const MIN_HALF_WINDOW_HOURS = 1;
const MAX_HALF_WINDOW_HOURS = 72;
const MIN_COARSE_STEP_MINUTES = 0.5;
const MAX_COARSE_STEP_MINUTES = 60;
const ROOT_TOLERANCE_MS = 1_000;
const OPTIMIZATION_ITERATIONS = 34;

export type SolarEclipseEventSearchStatus = 'overlap-found' | 'no-overlap-in-window';

export interface SolarEclipseEventSearchInput {
  anchorObservedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  halfWindowHours?: number;
  coarseStepMinutes?: number;
}

export interface SolarEclipseEventSearchResult {
  algorithmId: typeof SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID;
  algorithmVersion: typeof SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_VERSION;
  status: SolarEclipseEventSearchStatus;
  anchorObservedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  windowStartIso: string;
  windowEndIso: string;
  halfWindowHours: number;
  coarseStepMinutes: number;
  coarseSampleCount: number;
  closestApproachIso: string;
  closestApproach: SolarEclipseOverlapResult;
  overlapStartIso: string | null;
  maximumOverlapIso: string | null;
  maximumOverlap: SolarEclipseOverlapResult | null;
  overlapEndIso: string | null;
  overlapDurationMinutes: number | null;
  containedStartIso: string | null;
  containedEndIso: string | null;
  containedDurationMinutes: number | null;
  windowClipsEventStart: boolean;
  windowClipsEventEnd: boolean;
  warnings: string[];
}

export class SolarEclipseEventSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolarEclipseEventSearchError';
  }
}

interface TimedOverlap {
  timeMs: number;
  overlap: SolarEclipseOverlapResult;
}

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function validateInput(input: SolarEclipseEventSearchInput): {
  anchorMs: number;
  halfWindowHours: number;
  coarseStepMinutes: number;
} {
  if (!hasExplicitTimezone(input.anchorObservedAtIso)) {
    throw new SolarEclipseEventSearchError('Arama merkezi açık saat dilimi (Z veya ±SS:dd) içermelidir.');
  }
  const anchor = new Date(input.anchorObservedAtIso);
  if (Number.isNaN(anchor.getTime())) {
    throw new SolarEclipseEventSearchError('Arama merkezi geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  if (!Number.isFinite(input.latitudeDeg) || input.latitudeDeg < -90 || input.latitudeDeg > 90) {
    throw new SolarEclipseEventSearchError('Enlem -90° ile +90° arasında olmalıdır.');
  }
  if (!Number.isFinite(input.longitudeDeg) || input.longitudeDeg < -180 || input.longitudeDeg > 180) {
    throw new SolarEclipseEventSearchError('Boylam -180° ile +180° arasında olmalıdır.');
  }
  const halfWindowHours = input.halfWindowHours ?? DEFAULT_HALF_WINDOW_HOURS;
  if (!Number.isFinite(halfWindowHours) || halfWindowHours < MIN_HALF_WINDOW_HOURS || halfWindowHours > MAX_HALF_WINDOW_HOURS) {
    throw new SolarEclipseEventSearchError(`Yarım arama penceresi ${MIN_HALF_WINDOW_HOURS} ile ${MAX_HALF_WINDOW_HOURS} saat arasında olmalıdır.`);
  }
  const coarseStepMinutes = input.coarseStepMinutes ?? DEFAULT_COARSE_STEP_MINUTES;
  if (!Number.isFinite(coarseStepMinutes) || coarseStepMinutes < MIN_COARSE_STEP_MINUTES || coarseStepMinutes > MAX_COARSE_STEP_MINUTES) {
    throw new SolarEclipseEventSearchError(`Kaba tarama adımı ${MIN_COARSE_STEP_MINUTES} ile ${MAX_COARSE_STEP_MINUTES} dakika arasında olmalıdır.`);
  }
  return { anchorMs: anchor.getTime(), halfWindowHours, coarseStepMinutes };
}

function evaluateAt(timeMs: number, latitudeDeg: number, longitudeDeg: number): TimedOverlap {
  const observedAtIso = new Date(timeMs).toISOString();
  const solarPosition = calculateSolarPosition({ observedAtIso, latitudeDeg, longitudeDeg });
  const lunarPosition = calculateLunarPosition({
    observedAtIso,
    latitudeDeg,
    longitudeDeg,
    solarPosition
  });
  return {
    timeMs,
    overlap: calculateSolarEclipseOverlap({ solarPosition, lunarPosition })
  };
}

function refineMinimum(
  leftMs: number,
  rightMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
  score: (value: SolarEclipseOverlapResult) => number
): TimedOverlap {
  let left = leftMs;
  let right = rightMs;
  for (let index = 0; index < OPTIMIZATION_ITERATIONS; index += 1) {
    const third = (right - left) / 3;
    const a = evaluateAt(left + third, latitudeDeg, longitudeDeg);
    const b = evaluateAt(right - third, latitudeDeg, longitudeDeg);
    if (score(a.overlap) <= score(b.overlap)) right = b.timeMs;
    else left = a.timeMs;
  }
  return evaluateAt((left + right) / 2, latitudeDeg, longitudeDeg);
}

function refineCrossing(
  left: TimedOverlap,
  right: TimedOverlap,
  latitudeDeg: number,
  longitudeDeg: number,
  clearance: (value: SolarEclipseOverlapResult) => number
): TimedOverlap {
  let low = left;
  let high = right;
  let lowValue = clearance(low.overlap);
  let highValue = clearance(high.overlap);
  if (lowValue === 0) return low;
  if (highValue === 0) return high;
  if (Math.sign(lowValue) === Math.sign(highValue)) {
    return Math.abs(lowValue) <= Math.abs(highValue) ? low : high;
  }
  while (high.timeMs - low.timeMs > ROOT_TOLERANCE_MS) {
    const mid = evaluateAt((low.timeMs + high.timeMs) / 2, latitudeDeg, longitudeDeg);
    const midValue = clearance(mid.overlap);
    if (midValue === 0) return mid;
    if (Math.sign(midValue) === Math.sign(lowValue)) {
      low = mid;
      lowValue = midValue;
    } else {
      high = mid;
      highValue = midValue;
    }
  }
  return Math.abs(lowValue) <= Math.abs(highValue) ? low : high;
}

function durationMinutes(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000;
}

export function searchSolarEclipseEventWindow(
  input: SolarEclipseEventSearchInput
): SolarEclipseEventSearchResult {
  const { anchorMs, halfWindowHours, coarseStepMinutes } = validateInput(input);
  const halfWindowMs = halfWindowHours * 3_600_000;
  const stepMs = coarseStepMinutes * 60_000;
  const startMs = anchorMs - halfWindowMs;
  const endMs = anchorMs + halfWindowMs;
  const samples: TimedOverlap[] = [];

  for (let timeMs = startMs; timeMs < endMs; timeMs += stepMs) {
    samples.push(evaluateAt(timeMs, input.latitudeDeg, input.longitudeDeg));
  }
  samples.push(evaluateAt(endMs, input.latitudeDeg, input.longitudeDeg));

  let bestIndex = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index]!.overlap.outerLimbClearanceDeg < samples[bestIndex]!.overlap.outerLimbClearanceDeg) {
      bestIndex = index;
    }
  }

  const closestLeft = samples[Math.max(0, bestIndex - 1)]!.timeMs;
  const closestRight = samples[Math.min(samples.length - 1, bestIndex + 1)]!.timeMs;
  const closest = refineMinimum(
    closestLeft,
    closestRight,
    input.latitudeDeg,
    input.longitudeDeg,
    (value) => value.outerLimbClearanceDeg
  );

  if (closest.overlap.outerLimbClearanceDeg >= 0) {
    return {
      algorithmId: SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID,
      algorithmVersion: SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_VERSION,
      status: 'no-overlap-in-window',
      anchorObservedAtIso: new Date(anchorMs).toISOString(),
      latitudeDeg: input.latitudeDeg,
      longitudeDeg: input.longitudeDeg,
      windowStartIso: new Date(startMs).toISOString(),
      windowEndIso: new Date(endMs).toISOString(),
      halfWindowHours,
      coarseStepMinutes,
      coarseSampleCount: samples.length,
      closestApproachIso: closest.overlap.observedAtIso,
      closestApproach: closest.overlap,
      overlapStartIso: null,
      maximumOverlapIso: null,
      maximumOverlap: null,
      overlapEndIso: null,
      overlapDurationMinutes: null,
      containedStartIso: null,
      containedEndIso: null,
      containedDurationMinutes: null,
      windowClipsEventStart: false,
      windowClipsEventEnd: false,
      warnings: [
        'Seçilen arama penceresinde Güneş ve Ay apparent diskleri geometrik olarak örtüşmedi.',
        'Sonuç düşük hassasiyetli yerel zaman taramasıdır; resmi tutulma efemerisi veya Bessel elemanı değildir.'
      ]
    };
  }

  let firstInsideIndex = bestIndex;
  while (firstInsideIndex > 0 && samples[firstInsideIndex - 1]!.overlap.outerLimbClearanceDeg <= 0) {
    firstInsideIndex -= 1;
  }
  let lastInsideIndex = bestIndex;
  while (lastInsideIndex < samples.length - 1 && samples[lastInsideIndex + 1]!.overlap.outerLimbClearanceDeg <= 0) {
    lastInsideIndex += 1;
  }

  const clipsStart = firstInsideIndex === 0;
  const clipsEnd = lastInsideIndex === samples.length - 1;
  const overlapStart = clipsStart
    ? null
    : refineCrossing(
        samples[firstInsideIndex - 1]!,
        samples[firstInsideIndex]!,
        input.latitudeDeg,
        input.longitudeDeg,
        (value) => value.outerLimbClearanceDeg
      );
  const overlapEnd = clipsEnd
    ? null
    : refineCrossing(
        samples[lastInsideIndex]!,
        samples[lastInsideIndex + 1]!,
        input.latitudeDeg,
        input.longitudeDeg,
        (value) => value.outerLimbClearanceDeg
      );

  const maximumLeft = samples[Math.max(firstInsideIndex, bestIndex - 1)]!.timeMs;
  const maximumRight = samples[Math.min(lastInsideIndex, bestIndex + 1)]!.timeMs;
  const maximum = refineMinimum(
    maximumLeft,
    maximumRight,
    input.latitudeDeg,
    input.longitudeDeg,
    (value) => -value.solarDiskCoveredFraction
  );

  let containedStart: TimedOverlap | null = null;
  let containedEnd: TimedOverlap | null = null;
  let firstContainedIndex = -1;
  let lastContainedIndex = -1;
  for (let index = firstInsideIndex; index <= lastInsideIndex; index += 1) {
    if (samples[index]!.overlap.innerLimbClearanceDeg <= 0) {
      if (firstContainedIndex < 0) firstContainedIndex = index;
      lastContainedIndex = index;
    }
  }
  if (firstContainedIndex > 0) {
    containedStart = refineCrossing(
      samples[firstContainedIndex - 1]!,
      samples[firstContainedIndex]!,
      input.latitudeDeg,
      input.longitudeDeg,
      (value) => value.innerLimbClearanceDeg
    );
  }
  if (lastContainedIndex >= 0 && lastContainedIndex < samples.length - 1) {
    containedEnd = refineCrossing(
      samples[lastContainedIndex]!,
      samples[lastContainedIndex + 1]!,
      input.latitudeDeg,
      input.longitudeDeg,
      (value) => value.innerLimbClearanceDeg
    );
  }

  const overlapStartIso = overlapStart?.overlap.observedAtIso ?? null;
  const overlapEndIso = overlapEnd?.overlap.observedAtIso ?? null;
  const containedStartIso = containedStart?.overlap.observedAtIso ?? null;
  const containedEndIso = containedEnd?.overlap.observedAtIso ?? null;
  const warnings = [
    'Başlangıç/bitiş sınırları kaba tarama sonrası yaklaşık 1 saniyelik zaman toleransıyla sayısal olarak inceltilir; C1–C4 resmi temas etiketleri değildir.',
    'Maksimum örtüşme seçilen yerel pencere içinde düşük hassasiyetli Güneş/Ay modellerinden aranır.',
    'Bessel elemanları, Ay limb topografyası, atmosferik kırılma, gözlemci rakımı ve JPL DE yüksek hassasiyet efemerisi uygulanmaz.'
  ];
  if (clipsStart || clipsEnd) {
    warnings.unshift('Örtüşme olayı arama penceresinin kenarına taşıyor; başlangıç veya bitiş zamanı bu pencerede çözülemedi.');
  }

  return {
    algorithmId: SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_ID,
    algorithmVersion: SOLAR_ECLIPSE_EVENT_SEARCH_ALGORITHM_VERSION,
    status: 'overlap-found',
    anchorObservedAtIso: new Date(anchorMs).toISOString(),
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    windowStartIso: new Date(startMs).toISOString(),
    windowEndIso: new Date(endMs).toISOString(),
    halfWindowHours,
    coarseStepMinutes,
    coarseSampleCount: samples.length,
    closestApproachIso: maximum.overlap.observedAtIso,
    closestApproach: maximum.overlap,
    overlapStartIso,
    maximumOverlapIso: maximum.overlap.observedAtIso,
    maximumOverlap: maximum.overlap,
    overlapEndIso,
    overlapDurationMinutes: durationMinutes(overlapStartIso, overlapEndIso),
    containedStartIso,
    containedEndIso,
    containedDurationMinutes: durationMinutes(containedStartIso, containedEndIso),
    windowClipsEventStart: clipsStart,
    windowClipsEventEnd: clipsEnd,
    warnings
  };
}
