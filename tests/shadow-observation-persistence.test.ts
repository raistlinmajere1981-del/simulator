import { describe, expect, it } from 'vitest';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import { normalizeSimulationScenarioId } from '../src/shared/scenario';
import { calculateSolarPosition } from '../src/simulation/solar-position';
import {
  SHADOW_OBSERVATION_MODEL_ID,
  SHADOW_OBSERVATION_MODEL_VERSION,
  calculateShadowObservation,
  createShadowObservationPrediction,
  readShadowObservationSettings
} from '../src/simulation/shadow-observation';
import { createExperimentHtmlReport } from '../src/report/html-report';

function savedShadowExperiment(): SavedExperiment {
  const id = 'shadow-observation-test';
  const observedAtIso = '2026-06-21T09:00:00.000Z';
  const latitudeDeg = 41.0082;
  const longitudeDeg = 28.9784;
  const solarPosition = calculateSolarPosition({ observedAtIso, latitudeDeg, longitudeDeg });
  const result = calculateShadowObservation({
    experimentId: id,
    observedAtIso,
    latitudeDeg,
    longitudeDeg,
    solarPosition,
    settings: {
      gnomonHeightM: 1.25,
      observedShadowLengthM: 0.42,
      observedShadowLengthUncertaintyM: 0.05,
      observedShadowAzimuthDeg: 350,
      observedShadowAzimuthUncertaintyDeg: 3
    }
  });
  return {
    id,
    name: 'Gölge deney kaydı',
    createdAtIso: '2026-06-21T10:00:00.000Z',
    updatedAtIso: '2026-06-21T10:05:00.000Z',
    observedAtIso,
    observationUtcOffsetMinutes: 180,
    scenarioId: 'shadow-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: latitudeDeg,
      observerLongitudeDeg: longitudeDeg
    },
    modelVersions: {
      [SHADOW_OBSERVATION_MODEL_ID]: SHADOW_OBSERVATION_MODEL_VERSION
    },
    predictions: [createShadowObservationPrediction(result)]
  };
}

describe('shadow observation persistence', () => {
  it('round-trips the shadow scenario and editable observation values', () => {
    expect(normalizeSimulationScenarioId('shadow-observation')).toBe('shadow-observation');
    const parsed = parsePortableExperimentFile(
      createPortableExperimentFile(savedShadowExperiment(), '1.10.0', '2026-06-21T11:00:00.000Z')
    ).experiment;
    expect(parsed.scenarioId).toBe('shadow-observation');
    const prediction = parsed.predictions.find((item) => item.modelId === SHADOW_OBSERVATION_MODEL_ID);
    expect(readShadowObservationSettings(prediction)).toEqual({
      gnomonHeightM: 1.25,
      observedShadowLengthM: 0.42,
      observedShadowLengthUncertaintyM: 0.05,
      observedShadowAzimuthDeg: 350,
      observedShadowAzimuthUncertaintyDeg: 3
    });
  });

  it('renders the shadow astronomical reference and its trace in HTML report', () => {
    const report = createExperimentHtmlReport(savedShadowExperiment(), '2026-06-21T11:00:00.000Z');
    expect(report).toContain('Gölge Geometrisi · Astronomik Referans');
    expect(report).toContain('Gnomon yüksekliği');
    expect(report).toContain('Beklenen gölge uzunluğu');
    expect(report).toContain('Gölge uzunluğu');
  });
});
