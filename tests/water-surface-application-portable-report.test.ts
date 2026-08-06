import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile,
  PORTABLE_EXPERIMENT_SCHEMA_VERSION
} from '../src/shared/portable';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import {
  applyWaterSurfaceToEndpoints,
  WATER_SURFACE_APPLICATION_MODEL_ID
} from '../src/simulation/water-surface-application';
import {
  createWaterSurfaceObservationRecord,
  WATER_SURFACE_OBSERVATION_MODEL_ID
} from '../src/simulation/water-surface-observation';
import {
  decodeWaterSurfaceObservationSnapshot
} from '../src/simulation/water-surface-snapshot';

function experiment(): SavedExperiment {
  const observation = createWaterSurfaceObservationRecord({
    experimentId: 'water-application-portable',
    sourceLabel: 'Kıyı istasyonu',
    sourceKind: 'tide-gauge',
    observedAtIso: '2026-08-07T03:00:00+03:00',
    recordedAtIso: '2026-08-07T03:01:00+03:00',
    verticalDatumKind: 'orthometric-msl',
    waterLevelM: 1.1,
    waterLevelUncertaintyM: 0.05,
    waveVerticalUncertaintyM: 0.15,
    uncertaintyCombination: 'linear-conservative',
    tidePhase: 'high-water'
  });
  const application = applyWaterSurfaceToEndpoints({
    experimentId: 'water-application-portable',
    experimentObservedAtIso: '2026-08-07T03:05:00+03:00',
    experimentVerticalDatumKind: 'orthometric-msl',
    observerGroundElevationM: 6,
    targetGroundElevationM: 0,
    snapshot: decodeWaterSurfaceObservationSnapshot(observation.prediction),
    target: 'target-ground',
    scenario: 'upper-bound',
    appliedAtIso: '2026-08-07T03:06:00+03:00',
    maximumTimeDifferenceMinutes: 10
  });

  return {
    id: 'water-application-portable',
    name: 'Su yüzeyi uygulama deneyi',
    createdAtIso: '2026-08-07T02:55:00+03:00',
    updatedAtIso: '2026-08-07T03:06:00+03:00',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      targetGroundElevationM: application.targetGroundElevationM
    },
    modelVersions: {
      [WATER_SURFACE_OBSERVATION_MODEL_ID]: observation.modelVersion,
      [WATER_SURFACE_APPLICATION_MODEL_ID]: application.modelVersion
    },
    predictions: [observation.prediction, application.prediction]
  };
}

describe('water surface application portable and report integration', () => {
  it('round-trips the application model prediction through schema 7', () => {
    const file = createPortableExperimentFile(
      experiment(),
      '1.0.10',
      '2026-08-07T03:10:00+03:00'
    );
    const parsed = parsePortableExperimentFile(file);
    const application = parsed.experiment.predictions.find(
      (prediction) => prediction.modelId === WATER_SURFACE_APPLICATION_MODEL_ID
    );

    expect(file.schemaVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.modelVersions[WATER_SURFACE_APPLICATION_MODEL_ID])
      .toBe('0.1.0');
    expect(application?.metrics.find((metric) =>
      metric.key === 'appliedWaterSurfaceM')?.value).toBeCloseTo(1.3, 12);
    expect(application?.trace.steps.find((step) =>
      step.id === 'endpoint-application')?.formula).toContain('target-ground');
  });

  it('renders scenario, applied surface, time difference and endpoint trace', () => {
    const html = createExperimentHtmlReport(
      experiment(),
      '2026-08-07T03:12:00+03:00'
    );

    expect(html).toContain('water-surface-application');
    expect(html).toContain('Uygulanan su yüzeyi');
    expect(html).toContain('1,3 m');
    expect(html).toContain('Su gözlemi ile deney zamanı farkı');
    expect(html).toContain('5 min');
    expect(html).toContain('target-ground');
    expect(html).toContain('upper-bound');
  });
});
