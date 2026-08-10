import { describe, expect, it } from 'vitest';
import { getSimulationScenario, normalizeSimulationScenarioId } from '../src/shared/scenario';
import { searchSolarEclipseEventWindow } from '../src/simulation/solar-eclipse-event-search';
import {
  createSolarEclipseEventSearchPrediction,
  readSolarEclipseEventSearchSnapshot,
  snapshotSolarEclipseEventSearch
} from '../src/simulation/solar-eclipse-event-search-prediction';

describe('dedicated eclipse scenario persistence', () => {
  it('normalizes and resolves the eclipse scenario as a celestial workflow', () => {
    expect(normalizeSimulationScenarioId('eclipse-simulation')).toBe('eclipse-simulation');
    expect(getSimulationScenario('eclipse-simulation')).toMatchObject({
      label: 'Tutulma Simülasyonları',
      experimentType: 'celestial',
      usesTerrain: false
    });
  });

  it('round-trips a Dallas event search through the ModelPrediction contract', () => {
    const result = searchSolarEclipseEventWindow({
      anchorObservedAtIso: '2024-04-08T18:42:00.000Z',
      latitudeDeg: 32.7767,
      longitudeDeg: -96.797,
      halfWindowHours: 12,
      coarseStepMinutes: 5
    });
    const snapshot = snapshotSolarEclipseEventSearch(result);
    const prediction = createSolarEclipseEventSearchPrediction('eclipse-test', snapshot);
    const reopened = readSolarEclipseEventSearchSnapshot(prediction);

    expect(reopened).toBeDefined();
    expect(reopened?.status).toBe('overlap-found');
    expect(reopened?.anchorObservedAtIso).toBe(snapshot.anchorObservedAtIso);
    expect(reopened?.latitudeDeg).toBeCloseTo(32.7767, 8);
    expect(reopened?.longitudeDeg).toBeCloseTo(-96.797, 8);
    expect(reopened?.overlapStartIso).toBe(snapshot.overlapStartIso);
    expect(reopened?.maximumOverlapIso).toBe(snapshot.maximumOverlapIso);
    expect(reopened?.overlapEndIso).toBe(snapshot.overlapEndIso);
    expect(reopened?.maximumSolarDiskCoveredFraction).toBeCloseTo(snapshot.maximumSolarDiskCoveredFraction ?? 0, 12);
    expect(reopened?.maximumGeometryClass).toBe(snapshot.maximumGeometryClass);
    expect(prediction.metrics.some((metric) => metric.key === 'eclipseMaximumSolarDiskCoveredFraction')).toBe(true);
  });

  it('preserves a no-overlap result without inventing event boundaries', () => {
    const result = searchSolarEclipseEventWindow({
      anchorObservedAtIso: '2026-08-10T19:16:13.000Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      halfWindowHours: 12,
      coarseStepMinutes: 5
    });
    const prediction = createSolarEclipseEventSearchPrediction(
      'eclipse-no-event',
      snapshotSolarEclipseEventSearch(result)
    );
    const reopened = readSolarEclipseEventSearchSnapshot(prediction);

    expect(reopened?.status).toBe('no-overlap-in-window');
    expect(reopened?.overlapStartIso).toBeNull();
    expect(reopened?.maximumOverlapIso).toBeNull();
    expect(reopened?.overlapEndIso).toBeNull();
    expect(reopened?.closestApproachOuterLimbClearanceDeg).toBeGreaterThan(0);
  });
});
