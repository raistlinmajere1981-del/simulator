import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import {
  STELLAR_OBSERVATION_MODEL_ID,
  STELLAR_OBSERVATION_MODEL_VERSION,
  calculateStellarObservation,
  createStellarObservationPrediction,
  readStellarObservationSettings
} from '../src/simulation/stellar-observation';

function savedStellarExperiment(): SavedExperiment {
  const id = 'stellar-persistence';
  const observedAtIso = '2026-08-09T17:00:00.000Z';
  const result = calculateStellarObservation({
    experimentId: id,
    observedAtIso,
    latitudeDeg: 41.0082,
    longitudeDeg: 28.9784,
    settings: {
      starId: 'hr-2491',
      trailDurationMinutes: 360,
      trailSampleIntervalMinutes: 15
    }
  });
  return {
    id,
    name: 'Sirius yıldız izi',
    createdAtIso: '2026-08-09T17:05:00.000Z',
    updatedAtIso: '2026-08-09T17:06:00.000Z',
    observedAtIso,
    observationUtcOffsetMinutes: 180,
    scenarioId: 'stellar-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: 41.0082,
      observerLongitudeDeg: 28.9784
    },
    modelVersions: {
      [STELLAR_OBSERVATION_MODEL_ID]: STELLAR_OBSERVATION_MODEL_VERSION
    },
    predictions: [createStellarObservationPrediction(result)]
  };
}

describe('stellar observation persistence', () => {
  it('round-trips scenario, catalog selection, trail settings and trace through portable JSON', () => {
    const parsed = parsePortableExperimentFile(
      createPortableExperimentFile(savedStellarExperiment(), '1.13.0', '2026-08-09T18:00:00.000Z')
    ).experiment;
    expect(parsed.scenarioId).toBe('stellar-observation');
    const prediction = parsed.predictions.find((item) => item.modelId === STELLAR_OBSERVATION_MODEL_ID);
    expect(prediction).toBeDefined();
    expect(readStellarObservationSettings(prediction)).toEqual({
      starId: 'hr-2491',
      trailDurationMinutes: 360,
      trailSampleIntervalMinutes: 15
    });
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarMeanOfDateRaDeg')?.value).toBeTypeOf('number');
    expect(prediction?.trace.steps.some((step) => step.id.startsWith('precession-'))).toBe(true);
  });

  it('renders the human-readable stellar model, catalog provenance and scientific limits in HTML report', () => {
    const report = createExperimentHtmlReport(savedStellarExperiment(), '2026-08-09T18:00:00.000Z');
    expect(report).toContain('Yıldız Gözlemi · Astronomik Referans');
    expect(report).toContain('J2000 sağ açıklık');
    expect(report).toContain('Gözlem tarihi sağ açıklık');
    expect(report).toContain('Katalog yıldızı');
    expect(report).toContain('Proper motion');
    expect(report).toContain('NASA HEASARC BSC5P');
  });
});
