import { describe, expect, it } from 'vitest';
import {
  WATER_SURFACE_APPLICATION_MODEL_ID,
  applyWaterSurfaceToEndpoints
} from '../src/simulation/water-surface-application';
import {
  WATER_SURFACE_OBSERVATION_MODEL_ID,
  createWaterSurfaceObservationRecord
} from '../src/simulation/water-surface-observation';
import { decodeWaterSurfaceObservationSnapshot } from '../src/simulation/water-surface-snapshot';
import {
  markWaterSurfaceApplicationHistorical,
  readStoredWaterSurfaceState
} from '../src/simulation/water-surface-ui-state';

describe('water surface UI state helpers', () => {
  it('restores observation and application predictions with model versions', () => {
    const observation = createWaterSurfaceObservationRecord({
      experimentId: 'exp-water-ui',
      sourceLabel: 'İskele ölçümü',
      sourceKind: 'tide-gauge',
      observedAtIso: '2026-08-07T00:00:00+03:00',
      recordedAtIso: '2026-08-07T00:02:00+03:00',
      verticalDatumKind: 'orthometric-msl',
      waterLevelM: 1.2,
      waterLevelUncertaintyM: 0.1,
      waveVerticalUncertaintyM: 0.2,
      tidePhase: 'rising'
    });
    const application = applyWaterSurfaceToEndpoints({
      experimentId: 'exp-water-ui',
      experimentObservedAtIso: '2026-08-07T00:05:00+03:00',
      experimentVerticalDatumKind: 'orthometric-msl',
      observerGroundElevationM: 0,
      targetGroundElevationM: 2,
      snapshot: decodeWaterSurfaceObservationSnapshot(observation.prediction),
      target: 'both-endpoints',
      scenario: 'upper-bound',
      appliedAtIso: '2026-08-07T00:06:00+03:00',
      maximumTimeDifferenceMinutes: 10
    });

    const restored = readStoredWaterSurfaceState(
      [observation.prediction, application.prediction],
      {
        [WATER_SURFACE_OBSERVATION_MODEL_ID]: observation.modelVersion,
        [WATER_SURFACE_APPLICATION_MODEL_ID]: application.modelVersion
      }
    );

    expect(restored.observation?.prediction.traceId).toBe(observation.prediction.traceId);
    expect(restored.application?.prediction.traceId).toBe(application.prediction.traceId);
    expect(restored.observation?.modelVersion).toBe(observation.modelVersion);
    expect(restored.application?.modelVersion).toBe(application.modelVersion);
  });

  it('marks an applied water surface as historical after endpoint or datum changes', () => {
    const observation = createWaterSurfaceObservationRecord({
      experimentId: 'exp-history',
      sourceLabel: 'Manuel ölçüm',
      sourceKind: 'manual-observation',
      observedAtIso: '2026-08-07T01:00:00+03:00',
      recordedAtIso: '2026-08-07T01:00:30+03:00',
      verticalDatumKind: 'orthometric-msl',
      waterLevelM: 0.8,
      tidePhase: 'unknown'
    });
    const application = applyWaterSurfaceToEndpoints({
      experimentId: 'exp-history',
      experimentObservedAtIso: '2026-08-07T01:00:00+03:00',
      experimentVerticalDatumKind: 'orthometric-msl',
      observerGroundElevationM: 0,
      targetGroundElevationM: 0,
      snapshot: decodeWaterSurfaceObservationSnapshot(observation.prediction),
      target: 'observer-ground',
      scenario: 'mean',
      appliedAtIso: '2026-08-07T01:01:00+03:00'
    });

    const historical = markWaterSurfaceApplicationHistorical({
      prediction: application.prediction,
      modelVersion: application.modelVersion
    });

    expect(historical?.prediction.status).toBe('indeterminate');
    expect(historical?.prediction.warnings.at(-1)).toContain('tarihsel işlem provenansı');
  });
});
