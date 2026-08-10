import { describe, expect, it } from 'vitest';
import {
  SolarEclipseEventSearchError,
  searchSolarEclipseEventWindow
} from '../src/simulation/solar-eclipse-event-search';

describe('solar eclipse event search', () => {
  it('finds the 2024-04-08 Dallas overlap event around the selected instant', () => {
    const result = searchSolarEclipseEventWindow({
      anchorObservedAtIso: '2024-04-08T18:42:00Z',
      latitudeDeg: 32.7767,
      longitudeDeg: -96.797,
      halfWindowHours: 4,
      coarseStepMinutes: 5
    });

    expect(result.status).toBe('overlap-found');
    expect(result.overlapStartIso).not.toBeNull();
    expect(result.maximumOverlapIso).not.toBeNull();
    expect(result.overlapEndIso).not.toBeNull();
    expect(result.maximumOverlap).not.toBeNull();
    expect(result.maximumOverlap!.solarDiskCoveredFraction).toBeGreaterThan(0.5);
    expect(result.maximumOverlap!.outerLimbClearanceDeg).toBeLessThan(0);
    expect(result.maximumOverlap!.bothCentersAboveGeometricHorizon).toBe(true);
    expect(result.overlapDurationMinutes).not.toBeNull();
    expect(result.overlapDurationMinutes!).toBeGreaterThan(90);
    expect(result.overlapDurationMinutes!).toBeLessThan(240);

    const start = new Date(result.overlapStartIso!).getTime();
    const maximum = new Date(result.maximumOverlapIso!).getTime();
    const end = new Date(result.overlapEndIso!).getTime();
    expect(start).toBeLessThan(maximum);
    expect(maximum).toBeLessThan(end);
    expect(maximum).toBeGreaterThan(new Date('2024-04-08T18:00:00Z').getTime());
    expect(maximum).toBeLessThan(new Date('2024-04-08T19:30:00Z').getTime());
  });

  it('reports closest approach without inventing an event when the window has no overlap', () => {
    const result = searchSolarEclipseEventWindow({
      anchorObservedAtIso: '2024-04-10T18:42:00Z',
      latitudeDeg: 32.7767,
      longitudeDeg: -96.797,
      halfWindowHours: 3,
      coarseStepMinutes: 10
    });

    expect(result.status).toBe('no-overlap-in-window');
    expect(result.maximumOverlap).toBeNull();
    expect(result.overlapStartIso).toBeNull();
    expect(result.overlapEndIso).toBeNull();
    expect(result.closestApproach.outerLimbClearanceDeg).toBeGreaterThanOrEqual(0);
  });

  it('fails closed for a time without an explicit timezone', () => {
    expect(() => searchSolarEclipseEventWindow({
      anchorObservedAtIso: '2024-04-08T18:42:00',
      latitudeDeg: 32.7767,
      longitudeDeg: -96.797
    })).toThrow(SolarEclipseEventSearchError);
  });

  it('fails closed for an excessive search window', () => {
    expect(() => searchSolarEclipseEventWindow({
      anchorObservedAtIso: '2024-04-08T18:42:00Z',
      latitudeDeg: 32.7767,
      longitudeDeg: -96.797,
      halfWindowHours: 100
    })).toThrow(/72 saat/);
  });
});
