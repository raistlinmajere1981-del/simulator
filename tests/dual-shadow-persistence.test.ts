import { describe, expect, it } from 'vitest';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import {
  DUAL_SHADOW_COMPARISON_MODEL_ID,
  DUAL_SHADOW_COMPARISON_MODEL_VERSION,
  calculateDualShadowComparison,
  createDualShadowComparisonPrediction,
  readDualShadowComparisonSettings
} from '../src/simulation/dual-shadow-comparison';
import { createExperimentHtmlReport } from '../src/report/html-report';

function savedDualShadowExperiment(): SavedExperiment {
  const id = 'dual-shadow-persistence';
  const observedAtIso = '2026-06-21T09:00:00.000Z';
  const result = calculateDualShadowComparison({
    experimentId: id,
    observedAtIso,
    stationA: {
      latitudeDeg: 39.9334,
      longitudeDeg: 32.8597,
      gnomonHeightM: 1,
      observedShadowLengthM: 0.4,
      observedShadowLengthUncertaintyM: 0.02
    },
    stationB: {
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      gnomonHeightM: 1.5,
      observedShadowLengthM: 0.7,
      observedShadowLengthUncertaintyM: 0.03,
      observedShadowAzimuthDeg: 350,
      observedShadowAzimuthUncertaintyDeg: 2
    }
  });
  return {
    id,
    name: 'İki konumlu gölge deneyi',
    createdAtIso: '2026-06-21T10:00:00.000Z',
    updatedAtIso: '2026-06-21T10:05:00.000Z',
    observedAtIso,
    observationUtcOffsetMinutes: 180,
    scenarioId: 'shadow-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: 39.9334,
      observerLongitudeDeg: 32.8597
    },
    modelVersions: {
      [DUAL_SHADOW_COMPARISON_MODEL_ID]: DUAL_SHADOW_COMPARISON_MODEL_VERSION
    },
    predictions: [createDualShadowComparisonPrediction(result)]
  };
}

describe('dual shadow persistence', () => {
  it('round-trips station B coordinates and measurement settings through portable JSON', () => {
    const parsed = parsePortableExperimentFile(
      createPortableExperimentFile(savedDualShadowExperiment(), '1.11.0', '2026-06-21T11:00:00.000Z')
    ).experiment;
    const prediction = parsed.predictions.find((item) => item.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID);
    expect(readDualShadowComparisonSettings(prediction)).toEqual({
      stationB: {
        latitudeDeg: 41.0082,
        longitudeDeg: 28.9784,
        gnomonHeightM: 1.5,
        observedShadowLengthM: 0.7,
        observedShadowLengthUncertaintyM: 0.03,
        observedShadowAzimuthDeg: 350,
        observedShadowAzimuthUncertaintyDeg: 2
      }
    });
  });

  it('renders the dual comparison metrics and trace in the HTML report', () => {
    const report = createExperimentHtmlReport(savedDualShadowExperiment(), '2026-06-21T11:00:00.000Z');
    expect(report).toContain('İki Konumlu Gölge Karşılaştırması');
    expect(report).toContain('WGS84 nokta ayrımı');
    expect(report).toContain('Beklenen Güneş yükseklik farkı B-A');
    expect(report).toContain('Eşzamanlı Güneş yüksekliği farkı');
  });
});
