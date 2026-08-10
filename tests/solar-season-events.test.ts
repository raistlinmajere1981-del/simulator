import { describe, expect, it } from 'vitest';
import {
  calculateSolarSeasonEvents,
  createSolarSeasonEventsPrediction,
  SOLAR_SEASON_EVENTS_MODEL_ID
} from '../src/simulation/solar-season-events';

const DALLAS = {
  experimentId: 'season-test',
  year: 2024,
  latitudeDeg: 32.7767,
  longitudeDeg: -96.797,
  utcOffsetMinutes: 0
};

describe('solar season events', () => {
  it('finds the four 2024 apparent-longitude quarter crossings in their expected UTC dates', () => {
    const result = calculateSolarSeasonEvents(DALLAS);

    expect(result.events).toHaveLength(4);
    expect(result.events.map((event) => event.eventIso.slice(0, 10))).toEqual([
      '2024-03-20',
      '2024-06-20',
      '2024-09-22',
      '2024-12-21'
    ]);

    for (const event of result.events) {
      const difference = Math.abs(
        ((((event.apparentSolarLongitudeDeg - event.targetApparentSolarLongitudeDeg) + 540) % 360) - 180)
      );
      expect(difference).toBeLessThan(0.0001);
    }
  });

  it('shows the expected northern-hemisphere daylight contrast between June and December', () => {
    const result = calculateSolarSeasonEvents(DALLAS);
    const june = result.events.find((event) => event.kind === 'june-solstice');
    const december = result.events.find((event) => event.kind === 'december-solstice');

    expect(june).toBeDefined();
    expect(december).toBeDefined();
    expect(june!.declinationDeg).toBeGreaterThan(23);
    expect(december!.declinationDeg).toBeLessThan(-23);
    expect(june!.observerStandardDaylightMinutes).toBeGreaterThan(december!.observerStandardDaylightMinutes + 180);
    expect(june!.observerSolarNoonElevationDeg).toBeGreaterThan(december!.observerSolarNoonElevationDeg + 40);
  });

  it('reverses the June/December daylight contrast in the southern hemisphere', () => {
    const result = calculateSolarSeasonEvents({
      ...DALLAS,
      latitudeDeg: -32.7767,
      longitudeDeg: 18.5
    });
    const june = result.events.find((event) => event.kind === 'june-solstice')!;
    const december = result.events.find((event) => event.kind === 'december-solstice')!;

    expect(december.observerStandardDaylightMinutes).toBeGreaterThan(june.observerStandardDaylightMinutes + 180);
    expect(december.observerSolarNoonElevationDeg).toBeGreaterThan(june.observerSolarNoonElevationDeg + 40);
  });

  it('produces a traceable model prediction and rejects unsupported years', () => {
    const result = calculateSolarSeasonEvents(DALLAS);
    const prediction = createSolarSeasonEventsPrediction(result);

    expect(prediction.modelId).toBe(SOLAR_SEASON_EVENTS_MODEL_ID);
    expect(prediction.metrics).toHaveLength(16);
    expect(prediction.trace.steps).toHaveLength(4);

    expect(() => calculateSolarSeasonEvents({ ...DALLAS, year: 1899 })).toThrow(/1900/);
    expect(() => calculateSolarSeasonEvents({ ...DALLAS, year: 2101 })).toThrow(/2100/);
  });
});
