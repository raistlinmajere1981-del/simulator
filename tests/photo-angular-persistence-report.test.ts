import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import type { ModelPrediction } from '../src/shared/domain';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import {
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION
} from '../src/simulation/photo-calibration';
import {
  PHOTO_ANGULAR_COMPARISON_MODEL_VERSION,
  comparePhotoAngularObservation
} from '../src/simulation/photo-angular-comparison';

function prediction(
  modelId: string,
  metrics: Array<{ key: string; value: number | null; uncertainty?: number }>
): ModelPrediction {
  return {
    modelId,
    experimentId: 'photo-angular-report',
    status: 'compatible',
    metrics: metrics.map((item) => ({
      key: item.key,
      label: item.key,
      value: item.value,
      unit: 'deg',
      ...(item.uncertainty === undefined ? {} : { uncertainty: item.uncertainty })
    })),
    warnings: [],
    traceId: `${modelId}:trace`,
    trace: { summary: modelId, assumptions: [], steps: [] }
  };
}

describe('photo angular comparison persistence report', () => {
  it('renders a saved comparison snapshot under a readable model name', () => {
    const photo = prediction(PHOTO_CALIBRATION_MODEL_ID, [
      { key: 'targetAngularHeightDeg', value: 0.12, uncertainty: 0.02 },
      { key: 'targetBaseRelativeElevationDeg', value: -0.03, uncertainty: 0.01 },
      { key: 'targetTopRelativeElevationDeg', value: 0.09, uncertainty: 0.01 }
    ]);
    const sphere = prediction('ideal-sphere', [
      { key: 'targetAngularHeightDeg', value: 0.11 },
      { key: 'targetBaseElevationDeg', value: -0.02 },
      { key: 'targetTopElevationDeg', value: 0.09 },
      { key: 'hiddenHeightM', value: 0 },
      { key: 'visibleFraction', value: 1 }
    ]);
    const comparison = comparePhotoAngularObservation({
      experimentId: 'photo-angular-report',
      sourceModelId: 'ideal-sphere',
      sourceModelName: 'İdeal Küre',
      modelPrediction: sphere,
      photoPrediction: photo,
      referenceKind: 'visual-reference'
    });

    const saved: SavedExperiment = {
      id: 'photo-angular-report',
      name: 'Fotoğraf açısal karşılaştırma raporu',
      createdAtIso: '2026-08-08T02:00:00+03:00',
      updatedAtIso: '2026-08-08T02:05:00+03:00',
      scenarioId: 'target-visibility',
      inputs: { ...DEFAULT_SIMULATOR_INPUTS },
      modelVersions: {
        [PHOTO_CALIBRATION_MODEL_ID]: PHOTO_CALIBRATION_MODEL_VERSION,
        [comparison.prediction.modelId]: PHOTO_ANGULAR_COMPARISON_MODEL_VERSION
      },
      predictions: [photo, comparison.prediction]
    };

    const report = createExperimentHtmlReport(saved);
    expect(report).toContain('Fotoğraf Açısal Karşılaştırması · İdeal Küre');
    expect(report).toContain('Karşılaştırılan açı kanalı');
    expect(report).toContain('Fotoğraf kalibrasyonu model tahminini üretmek için kullanılmaz');
  });
});
