import { describe, expect, it } from 'vitest';
import { calculateSolarPosition } from '../src/simulation/solar-position';
import {
  calculateSolarTimeOffset,
  createSolarTimeOffsetPrediction,
  SOLAR_TIME_OFFSET_MODEL_ID
} from '../src/simulation/solar-time-offset';

describe('solar time offset', () => {
  it('has zero longitude correction on the fixed-offset standard meridian', () => {
    const result = calculateSolarTimeOffset({
      experimentId: 'aligned',
      observedAtIso: '2024-08-11T09:00:00.000Z',
      utcOffsetMinutes: 180,
      longitudeDeg: 45
    });

    expect(result.standardMeridianDeg).toBeCloseTo(45, 8);
    expect(result.longitudeDeltaDeg).toBeCloseTo(0, 8);
    expect(result.longitudeCorrectionMinutes).toBeCloseTo(0, 8);
    expect(result.civilClock.minuteOfDay).toBeCloseTo(720, 8);
    expect(result.meanSolarClock.minuteOfDay).toBeCloseTo(720, 8);
  });

  it('separates Istanbul longitude correction from the equation of time', () => {
    const observedAtIso = '2024-08-11T09:00:00.000Z';
    const longitudeDeg = 28.9784;
    const result = calculateSolarTimeOffset({
      experimentId: 'istanbul',
      observedAtIso,
      utcOffsetMinutes: 180,
      longitudeDeg
    });
    const solarPosition = calculateSolarPosition({
      observedAtIso,
      latitudeDeg: 0,
      longitudeDeg
    });

    expect(result.standardMeridianDeg).toBeCloseTo(45, 8);
    expect(result.longitudeDeltaDeg).toBeCloseTo(-16.0216, 6);
    expect(result.longitudeCorrectionMinutes).toBeCloseTo(-64.0864, 5);
    expect(result.equationOfTimeMinutes).toBeCloseTo(solarPosition.equationOfTimeMinutes, 8);
    expect(result.apparentSolarCorrectionMinutes).toBeCloseTo(
      result.longitudeCorrectionMinutes + result.equationOfTimeMinutes,
      8
    );
    expect(result.meanSolarClock.minuteOfDay).toBeLessThan(result.civilClock.minuteOfDay);
    expect(result.apparentSolarClock.minuteOfDay).toBeCloseTo(
      720 + result.apparentSolarCorrectionMinutes,
      7
    );
  });

  it('normalizes UTC+14 standard meridian across the date line', () => {
    const result = calculateSolarTimeOffset({
      experimentId: 'dateline',
      observedAtIso: '2024-01-15T00:00:00.000Z',
      utcOffsetMinutes: 14 * 60,
      longitudeDeg: -150
    });

    expect(result.standardMeridianDeg).toBeCloseTo(-150, 8);
    expect(result.longitudeDeltaDeg).toBeCloseTo(0, 8);
    expect(result.longitudeCorrectionMinutes).toBeCloseTo(0, 8);
  });

  it('produces a traceable prediction and rejects invalid coordinates or offsets', () => {
    const result = calculateSolarTimeOffset({
      experimentId: 'prediction',
      observedAtIso: '2024-03-20T12:00:00.000Z',
      utcOffsetMinutes: 0,
      longitudeDeg: 0
    });
    const prediction = createSolarTimeOffsetPrediction(result);

    expect(prediction.modelId).toBe(SOLAR_TIME_OFFSET_MODEL_ID);
    expect(prediction.metrics).toHaveLength(8);
    expect(prediction.trace.steps).toHaveLength(4);

    expect(() => calculateSolarTimeOffset({
      experimentId: 'bad-offset',
      observedAtIso: '2024-03-20T12:00:00.000Z',
      utcOffsetMinutes: 900,
      longitudeDeg: 0
    })).toThrow(/UTC ofseti/);

    expect(() => calculateSolarTimeOffset({
      experimentId: 'bad-longitude',
      observedAtIso: '2024-03-20T12:00:00.000Z',
      utcOffsetMinutes: 0,
      longitudeDeg: 181
    })).toThrow(/Boylam/);
  });
});
