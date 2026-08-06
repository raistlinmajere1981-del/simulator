import { describe, expect, it } from 'vitest';
import {
  applyWaterSurfaceToEndpoints,
  WATER_SURFACE_APPLICATION_MODEL_ID,
  WATER_SURFACE_APPLICATION_MODEL_VERSION
} from '../src/simulation/water-surface-application';
import {
  createWaterSurfaceObservationRecord
} from '../src/simulation/water-surface-observation';
import {
  decodeWaterSurfaceObservationSnapshot
} from '../src/simulation/water-surface-snapshot';

function snapshot() {
  return decodeWaterSurfaceObservationSnapshot(
    createWaterSurfaceObservationRecord({
      experimentId: 'water-application-test',
      sourceLabel: 'Gelgit ölçer',
      sourceKind: 'tide-gauge',
      observedAtIso: '2026-08-07T02:00:00+03:00',
      recordedAtIso: '2026-08-07T02:01:00+03:00',
      verticalDatumKind: 'orthometric-msl',
      waterLevelM: 1.2,
      waterLevelUncertaintyM: 0.1,
      waveVerticalUncertaintyM: 0.2,
      uncertaintyCombination: 'linear-conservative',
      tidePhase: 'rising'
    }).prediction
  );
}

describe('controlled water surface endpoint application', () => {
  it('applies the mean surface only to the target base', () => {
    const result = applyWaterSurfaceToEndpoints({
      experimentId: 'water-application-test',
      experimentObservedAtIso: '2026-08-07T02:00:00+03:00',
      experimentVerticalDatumKind: 'orthometric-msl',
      observerGroundElevationM: 12,
      targetGroundElevationM: 0,
      snapshot: snapshot(),
      target: 'target-ground',
      scenario: 'mean',
      appliedAtIso: '2026-08-07T02:05:00+03:00'
    });

    expect(result.modelVersion).toBe(WATER_SURFACE_APPLICATION_MODEL_VERSION);
    expect(result.prediction.modelId).toBe(WATER_SURFACE_APPLICATION_MODEL_ID);
    expect(result.observerGroundElevationM).toBe(12);
    expect(result.targetGroundElevationM).toBe(1.2);
    expect(result.appliedWaterSurfaceM).toBe(1.2);
    expect(result.observationTimeDifferenceMinutes).toBe(0);
    expect(result.prediction.metrics.find((metric) =>
      metric.key === 'appliedWaterSurfaceM')?.uncertainty).toBeCloseTo(0.3, 12);
  });

  it('applies lower and upper sensitivity bounds to selected endpoints', () => {
    const lower = applyWaterSurfaceToEndpoints({
      experimentId: 'water-application-test',
      experimentObservedAtIso: '2026-08-07T02:10:00+03:00',
      experimentVerticalDatumKind: 'orthometric-msl',
      observerGroundElevationM: 5,
      targetGroundElevationM: 8,
      snapshot: snapshot(),
      target: 'observer-ground',
      scenario: 'lower-bound',
      appliedAtIso: '2026-08-07T02:11:00+03:00',
      maximumTimeDifferenceMinutes: 15
    });
    const upper = applyWaterSurfaceToEndpoints({
      experimentId: 'water-application-test',
      experimentObservedAtIso: '2026-08-07T02:10:00+03:00',
      experimentVerticalDatumKind: 'orthometric-msl',
      observerGroundElevationM: 5,
      targetGroundElevationM: 8,
      snapshot: snapshot(),
      target: 'both-endpoints',
      scenario: 'upper-bound',
      appliedAtIso: '2026-08-07T02:12:00+03:00'
    });

    expect(lower.observerGroundElevationM).toBeCloseTo(0.9, 12);
    expect(lower.targetGroundElevationM).toBe(8);
    expect(lower.observationTimeDifferenceMinutes).toBe(10);
    expect(upper.observerGroundElevationM).toBeCloseTo(1.5, 12);
    expect(upper.targetGroundElevationM).toBeCloseTo(1.5, 12);
    expect(upper.prediction.warnings.join(' ')).toContain('duyarlılık sınırı');
  });

  it('rejects experiment, datum and time-window mismatches', () => {
    const base = {
      experimentId: 'water-application-test',
      experimentObservedAtIso: '2026-08-07T02:00:00+03:00',
      experimentVerticalDatumKind: 'orthometric-msl' as const,
      observerGroundElevationM: 5,
      targetGroundElevationM: 8,
      snapshot: snapshot(),
      target: 'target-ground' as const,
      scenario: 'mean' as const,
      appliedAtIso: '2026-08-07T02:05:00+03:00'
    };

    expect(() => applyWaterSurfaceToEndpoints({
      ...base,
      experimentId: 'other-experiment'
    })).toThrow('farklı bir deneye');
    expect(() => applyWaterSurfaceToEndpoints({
      ...base,
      experimentVerticalDatumKind: 'ellipsoidal-wgs84'
    })).toThrow('datumları uyuşmuyor');
    expect(() => applyWaterSurfaceToEndpoints({
      ...base,
      experimentObservedAtIso: '2026-08-07T04:00:00+03:00',
      maximumTimeDifferenceMinutes: 30
    })).toThrow('izin verilen sınır');
  });

  it('rejects bound scenarios when the source has no uncertainty envelope', () => {
    const noEnvelope = decodeWaterSurfaceObservationSnapshot(
      createWaterSurfaceObservationRecord({
        experimentId: 'water-application-test',
        sourceLabel: 'Manuel gözlem',
        sourceKind: 'manual-observation',
        observedAtIso: '2026-08-07T02:00:00+03:00',
        recordedAtIso: '2026-08-07T02:01:00+03:00',
        verticalDatumKind: 'orthometric-msl',
        waterLevelM: 1.2,
        tidePhase: 'unknown'
      }).prediction
    );

    expect(() => applyWaterSurfaceToEndpoints({
      experimentId: 'water-application-test',
      experimentObservedAtIso: '2026-08-07T02:00:00+03:00',
      experimentVerticalDatumKind: 'orthometric-msl',
      observerGroundElevationM: 0,
      targetGroundElevationM: 0,
      snapshot: noEnvelope,
      target: 'both-endpoints',
      scenario: 'upper-bound',
      appliedAtIso: '2026-08-07T02:05:00+03:00'
    })).toThrow('Üst sınır');
  });
});
