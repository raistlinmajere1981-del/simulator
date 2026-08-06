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
import { convertGeoidTerrainProfile } from '../src/simulation/geoid-profile-conversion';
import {
  createGeoidConversionApplication,
  GEOID_CONVERSION_MODEL_ID
} from '../src/simulation/geoid-conversion-provenance';

function experimentWithGeoidProvenance(): SavedExperiment {
  const application = createGeoidConversionApplication({
    experimentId: 'geoid-portable-test',
    sourceLabel: 'EGM2008 kurum çözümü',
    sourceModelVersion: '2.5 arc-minute',
    sourceEpoch: '2008.0',
    appliedAtIso: '2026-08-06T20:45:00.000Z',
    geoidUndulationM: 31.25,
    geoidUndulationUncertaintyM: 0.35,
    result: convertGeoidTerrainProfile({
      from: 'ellipsoidal-wgs84',
      to: 'orthometric-msl',
      geoidUndulationM: 31.25,
      geoidUndulationUncertaintyM: 0.35,
      observerGroundElevationM: 120,
      targetGroundElevationM: 150,
      points: [{ id: 'p1', distancePercent: 50, elevationM: 135 }]
    })
  });

  return {
    id: 'geoid-portable-test',
    name: 'Jeoit provenans deneyi',
    createdAtIso: '2026-08-06T20:40:00.000Z',
    updatedAtIso: '2026-08-06T20:45:00.000Z',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      verticalDatumKind: application.targetDatum,
      observerGroundElevationM: application.observerGroundElevationM,
      targetGroundElevationM: application.targetGroundElevationM,
      terrainMode: 'manual-points'
    },
    manualTerrainPoints: application.points,
    modelVersions: {
      [GEOID_CONVERSION_MODEL_ID]: application.modelVersion
    },
    predictions: [application.prediction]
  };
}

describe('geoid provenance portable and report integration', () => {
  it('round-trips through the current portable schema without a schema bump', () => {
    const file = createPortableExperimentFile(
      experimentWithGeoidProvenance(),
      '1.0.7',
      '2026-08-06T20:50:00.000Z'
    );
    const parsed = parsePortableExperimentFile(file);
    const prediction = parsed.experiment.predictions.find(
      (candidate) => candidate.modelId === GEOID_CONVERSION_MODEL_ID
    );

    expect(file.schemaVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.modelVersions[GEOID_CONVERSION_MODEL_ID]).toBe('0.2.0');
    expect(prediction?.metrics.find((metric) =>
      metric.key === 'geoidUndulationM')?.value).toBe(31.25);
    expect(prediction?.trace.assumptions.join(' ')).toContain('EGM2008 kurum çözümü');
    expect(prediction?.trace.steps.find((step) => step.id === 'source')?.result)
      .toBe('2026-08-06T20:45:00.000Z');
  });

  it('renders the stored metrics, source metadata and trace in HTML', () => {
    const html = createExperimentHtmlReport(
      experimentWithGeoidProvenance(),
      '2026-08-06T21:00:00.000Z'
    );

    expect(html).toContain('geoid-height-conversion');
    expect(html).toContain('Jeoit ondülasyonu N');
    expect(html).toContain('31,25 m');
    expect(html).toContain('EGM2008 kurum çözümü');
    expect(html).toContain('2.5 arc-minute');
    expect(html).toContain('2008.0');
    expect(html).toContain('geoid-profile:2026-08-06T20:45:00.000Z');
  });
});
