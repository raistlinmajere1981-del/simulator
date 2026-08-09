import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import {
  DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  STELLAR_OBSERVATION_MODEL_ID,
  STELLAR_OBSERVATION_MODEL_VERSION,
  calculateStellarObservation,
  createStellarObservationPrediction,
  readStellarObservationSettings,
  type StellarObservationSettings
} from '../src/simulation/stellar-observation';

const SAVED_SETTINGS: StellarObservationSettings = {
  ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
  starId: 'hr-2491',
  trailDurationMinutes: 360,
  trailSampleIntervalMinutes: 15,
  localHorizonEnabled: true,
  localHorizonNorthDeg: 1,
  localHorizonNorthEastDeg: 2,
  localHorizonEastDeg: 6,
  localHorizonSouthEastDeg: 9,
  localHorizonSouthDeg: 11,
  localHorizonSouthWestDeg: 7,
  localHorizonWestDeg: 3,
  localHorizonNorthWestDeg: 2
};

function savedStellarExperiment(): SavedExperiment {
  const id = 'stellar-persistence';
  const observedAtIso = '2026-08-09T17:00:00.000Z';
  const result = calculateStellarObservation({
    experimentId: id,
    observedAtIso,
    latitudeDeg: 41.0082,
    longitudeDeg: 28.9784,
    settings: SAVED_SETTINGS
  });
  return {
    id,
    name: 'Sirius yerel ufuklu yıldız izi',
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
  it('round-trips scenario, catalog selection, trail and local skyline settings through portable JSON', () => {
    const parsed = parsePortableExperimentFile(
      createPortableExperimentFile(savedStellarExperiment(), '1.14.0', '2026-08-09T18:00:00.000Z')
    ).experiment;
    expect(parsed.scenarioId).toBe('stellar-observation');
    const prediction = parsed.predictions.find((item) => item.modelId === STELLAR_OBSERVATION_MODEL_ID);
    expect(prediction).toBeDefined();
    expect(readStellarObservationSettings(prediction)).toEqual(SAVED_SETTINGS);
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarMeanOfDateRaDeg')?.value).toBeTypeOf('number');
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarLocalHorizonEnabled')?.value).toBe(1);
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarLocalHorizonEastDeg')?.value).toBe(6);
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarLocalHorizonWestDeg')?.value).toBe(3);
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarLocalHorizonVisibleDurationMinutes')).toBeDefined();
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarApparentElevationDeg')).toBeDefined();
    expect(prediction?.metrics.find((metric) => metric.key === 'stellarLocalApparentVisibilityClassified')?.value).toBe(0);
    expect(prediction?.trace.steps.some((step) => step.id.startsWith('precession-'))).toBe(true);
    expect(prediction?.trace.steps.some((step) => step.id.startsWith('local-'))).toBe(true);
    expect(prediction?.trace.steps.some((step) => step.id === 'standard-refraction-diagnostic')).toBe(true);
  });

  it('renders local-horizon metrics, catalog provenance and scientific limits in HTML report', () => {
    const report = createExperimentHtmlReport(savedStellarExperiment(), '2026-08-09T18:00:00.000Z');
    expect(report).toContain('Yıldız Gözlemi · Astronomik Referans');
    expect(report).toContain('J2000 sağ açıklık');
    expect(report).toContain('Gözlem tarihi sağ açıklık');
    expect(report).toContain('Katalog yıldızı');
    expect(report).toContain('Yerel ufuk maskesi etkin');
    expect(report).toContain('Yerel ufuk D');
    expect(report).toContain('Anlık yerel ufuk açıklığı');
    expect(report).toContain('İz penceresinde yerel ufuk üstü geometrik süre');
    expect(report).toContain('Sekiz yönlü manuel yerel skyline');
    expect(report).toContain('Proper motion');
    expect(report).toContain('Standart atmosferik kırılma tanısı');
    expect(report).toContain('Standart apparent yıldız yüksekliği');
    expect(report).toContain('Yerel apparent görünürlük sınıflandırıldı');
    expect(report).toContain('yerel görünürlük sınıflandırılmadı');
    expect(report).toContain('NASA HEASARC BSC5P');
  });

  it('reopens a legacy prediction without local-horizon metrics as local horizon off', () => {
    const legacy = savedStellarExperiment();
    const stellarPrediction = legacy.predictions[0]!;
    const localMetricKeys = new Set([
      'stellarLocalHorizonEnabled',
      'stellarLocalHorizonNorthDeg',
      'stellarLocalHorizonNorthEastDeg',
      'stellarLocalHorizonEastDeg',
      'stellarLocalHorizonSouthEastDeg',
      'stellarLocalHorizonSouthDeg',
      'stellarLocalHorizonSouthWestDeg',
      'stellarLocalHorizonWestDeg',
      'stellarLocalHorizonNorthWestDeg',
      'stellarLocalHorizonInstantAltitudeDeg',
      'stellarLocalHorizonInstantClearanceDeg',
      'stellarLocalHorizonVisibleDurationMinutes'
    ]);
    const legacyPrediction = {
      ...stellarPrediction,
      metrics: stellarPrediction.metrics.filter((metric) => !localMetricKeys.has(metric.key))
    };

    expect(readStellarObservationSettings(legacyPrediction)).toEqual({
      ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
      starId: 'hr-2491',
      trailDurationMinutes: 360,
      trailSampleIntervalMinutes: 15
    });
  });
});
