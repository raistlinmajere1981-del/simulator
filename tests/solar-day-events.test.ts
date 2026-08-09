import { describe, expect, it } from 'vitest';
import { calculateSolarPosition } from '../src/simulation/solar-position';
import {
  GEOMETRIC_HORIZON_THRESHOLD_DEG,
  STANDARD_APPARENT_SUNRISE_THRESHOLD_DEG,
  calculateSolarDayEvents,
  createSolarDayEventsPrediction
} from '../src/simulation/solar-day-events';

function equinoxResult() {
  return calculateSolarDayEvents({
    experimentId: 'solar-day-equinox',
    observedAtIso: '2026-03-20T12:00:00Z',
    utcOffsetMinutes: 0,
    latitudeDeg: 0,
    longitudeDeg: 0
  });
}

describe('solar day events', () => {
  it('finds geometric sunrise, sunset and solar noon on an equatorial equinox day', () => {
    const result = equinoxResult();
    expect(result.localDate).toBe('2026-03-20');
    expect(result.geometric.state).toBe('normal');
    expect(result.geometric.riseIso).not.toBeNull();
    expect(result.geometric.setIso).not.toBeNull();
    expect(result.solarNoonElevationDeg).toBeGreaterThan(88);
    expect(result.geometric.aboveThresholdDurationMinutes).toBeGreaterThan(710);
    expect(result.geometric.aboveThresholdDurationMinutes).toBeLessThan(730);
  });

  it('refines event instants to the requested solar elevation thresholds', () => {
    const result = equinoxResult();
    const geometricRise = calculateSolarPosition({
      observedAtIso: result.geometric.riseIso!,
      latitudeDeg: result.latitudeDeg,
      longitudeDeg: result.longitudeDeg
    });
    const standardRise = calculateSolarPosition({
      observedAtIso: result.standardApparent.riseIso!,
      latitudeDeg: result.latitudeDeg,
      longitudeDeg: result.longitudeDeg
    });
    expect(geometricRise.elevationDeg).toBeCloseTo(GEOMETRIC_HORIZON_THRESHOLD_DEG, 3);
    expect(standardRise.elevationDeg).toBeCloseTo(STANDARD_APPARENT_SUNRISE_THRESHOLD_DEG, 3);
  });

  it('keeps the standard -0.833 degree reference longer than geometric center daylight', () => {
    const result = equinoxResult();
    expect(new Date(result.standardApparent.riseIso!).getTime()).toBeLessThan(new Date(result.geometric.riseIso!).getTime());
    expect(new Date(result.standardApparent.setIso!).getTime()).toBeGreaterThan(new Date(result.geometric.setIso!).getTime());
    expect(result.standardApparent.aboveThresholdDurationMinutes).toBeGreaterThan(result.geometric.aboveThresholdDurationMinutes);
  });

  it('reports continuous summer daylight at high northern latitude', () => {
    const result = calculateSolarDayEvents({
      experimentId: 'polar-summer',
      observedAtIso: '2026-06-21T12:00:00Z',
      utcOffsetMinutes: 120,
      latitudeDeg: 78.2232,
      longitudeDeg: 15.6469
    });
    expect(result.geometric.state).toBe('continuous-above');
    expect(result.geometric.riseIso).toBeNull();
    expect(result.geometric.setIso).toBeNull();
    expect(result.geometric.aboveThresholdDurationMinutes).toBeCloseTo(1440, 6);
  });

  it('reports continuous winter darkness at high northern latitude', () => {
    const result = calculateSolarDayEvents({
      experimentId: 'polar-winter',
      observedAtIso: '2026-12-21T12:00:00Z',
      utcOffsetMinutes: 60,
      latitudeDeg: 78.2232,
      longitudeDeg: 15.6469
    });
    expect(result.standardApparent.state).toBe('continuous-below');
    expect(result.standardApparent.riseIso).toBeNull();
    expect(result.standardApparent.setIso).toBeNull();
    expect(result.standardApparent.aboveThresholdDurationMinutes).toBeCloseTo(0, 6);
  });

  it('builds the local civil-day UTC window from the explicit saved offset', () => {
    const result = calculateSolarDayEvents({
      experimentId: 'offset-day',
      observedAtIso: '2026-08-09T12:00:00Z',
      utcOffsetMinutes: 180,
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784
    });
    expect(result.localDate).toBe('2026-08-09');
    expect(result.dayStartIso).toBe('2026-08-08T21:00:00.000Z');
    expect(result.dayEndIso).toBe('2026-08-09T21:00:00.000Z');
  });

  it('creates traceable numeric prediction metrics without claiming model compatibility', () => {
    const prediction = createSolarDayEventsPrediction(equinoxResult());
    expect(prediction.modelId).toBe('solar-day-events');
    expect(prediction.status).toBe('indeterminate');
    expect(prediction.metrics.find((metric) => metric.key === 'geometricRiseLocalMinute')?.value).toBeTypeOf('number');
    expect(prediction.metrics.find((metric) => metric.key === 'standardAboveThresholdMinutes')?.value).toBeGreaterThan(700);
    expect(prediction.warnings.some((warning) => warning.includes('-0,833°'))).toBe(true);
  });
});
