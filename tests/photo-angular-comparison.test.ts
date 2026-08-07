import { describe, expect, it } from 'vitest';
import type { ModelPrediction } from '../src/shared/domain';
import {
  PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M,
  comparePhotoAngularObservation,
  photoAngularComparisonModelId
} from '../src/simulation/photo-angular-comparison';

function prediction(
  modelId: string,
  metrics: Array<{ key: string; value: number | null; uncertainty?: number }>,
  status: ModelPrediction['status'] = 'compatible'
): ModelPrediction {
  return {
    modelId,
    experimentId: 'exp-1',
    status,
    metrics: metrics.map((metric) => ({
      key: metric.key,
      label: metric.key,
      value: metric.value,
      unit: 'deg',
      ...(metric.uncertainty === undefined ? {} : { uncertainty: metric.uncertainty })
    })),
    warnings: [],
    traceId: `${modelId}:trace`,
    trace: { summary: modelId, assumptions: [], steps: [] }
  };
}

const photo = prediction('photo-calibration', [
  { key: 'targetBaseRelativeElevationDeg', value: -0.2, uncertainty: 0.1 },
  { key: 'targetTopRelativeElevationDeg', value: 0.8, uncertainty: 0.1 },
  { key: 'targetAngularHeightDeg', value: 1.0, uncertainty: 0.15 }
]);

describe('photo angular comparison', () => {
  it('compares only reference-independent angular height for a visual reference', () => {
    const model = prediction('ideal-sphere', [
      { key: 'targetBaseElevationDeg', value: -0.1 },
      { key: 'targetTopElevationDeg', value: 0.85 },
      { key: 'targetAngularHeightDeg', value: 0.95 },
      { key: 'hiddenHeightM', value: 0 },
      { key: 'visibleFraction', value: 1 }
    ]);

    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'ideal-sphere',
      sourceModelName: 'İdeal Küre',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'visual-reference'
    });

    expect(result.prediction.modelId).toBe(photoAngularComparisonModelId('ideal-sphere'));
    expect(result.prediction.status).toBe('compatible');
    expect(result.channels.map((channel) => channel.key)).toEqual(['targetAngularHeight']);
    expect(result.prediction.warnings.join(' ')).toContain('yerel yatay');
  });

  it('compares base, top and angular height when local horizontal is explicit', () => {
    const model = prediction('defined-plane', [
      { key: 'targetBaseElevationDeg', value: -0.15 },
      { key: 'targetTopElevationDeg', value: 0.75 },
      { key: 'targetAngularHeightDeg', value: 0.9 },
      { key: 'hiddenHeightM', value: 0 },
      { key: 'visibleFraction', value: 1 }
    ]);

    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'defined-plane',
      sourceModelName: 'Tanımlı Düzlem',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'local-horizontal'
    });

    expect(result.channels.map((channel) => channel.key).sort()).toEqual([
      'targetAngularHeight',
      'targetBase',
      'targetTop'
    ]);
    expect(result.prediction.status).toBe('compatible');
  });

  it('accepts sub-centimetre layered-solver residual as a visible physical base', () => {
    const model = prediction('ideal-sphere', [
      { key: 'targetBaseElevationDeg', value: -0.1 },
      { key: 'targetTopElevationDeg', value: 0.85 },
      { key: 'targetAngularHeightDeg', value: 0.95 },
      { key: 'hiddenHeightM', value: PHOTO_TARGET_BASE_VISIBILITY_TOLERANCE_M * 0.75 },
      { key: 'visibleFraction', value: 0.9999 }
    ]);

    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'ideal-sphere',
      sourceModelName: 'İdeal Küre',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'visual-reference'
    });

    expect(result.channels.map((channel) => channel.key)).toEqual(['targetAngularHeight']);
    expect(result.prediction.status).toBe('compatible');
  });

  it('marks a channel incompatible when the model lies outside the photo uncertainty envelope', () => {
    const model = prediction('ideal-sphere', [
      { key: 'targetBaseElevationDeg', value: -0.1 },
      { key: 'targetTopElevationDeg', value: 2.5 },
      { key: 'targetAngularHeightDeg', value: 2.6 },
      { key: 'hiddenHeightM', value: 0 },
      { key: 'visibleFraction', value: 1 }
    ]);

    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'ideal-sphere',
      sourceModelName: 'İdeal Küre',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'visual-reference'
    });

    expect(result.prediction.status).toBe('incompatible');
    expect(result.channels[0]?.differenceDeg).toBeCloseTo(1.6, 10);
  });

  it('does not score full angular height when the model hides the physical target base', () => {
    const model = prediction('ideal-sphere', [
      { key: 'targetBaseElevationDeg', value: -1 },
      { key: 'targetTopElevationDeg', value: 0.5 },
      { key: 'targetAngularHeightDeg', value: 1.5 },
      { key: 'hiddenHeightM', value: 3 },
      { key: 'visibleFraction', value: 0.8 }
    ]);

    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'ideal-sphere',
      sourceModelName: 'İdeal Küre',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'visual-reference'
    });

    expect(result.channels).toHaveLength(0);
    expect(result.prediction.status).toBe('indeterminate');
    expect(result.prediction.warnings.join(' ')).toContain('tabanını görünür öngörmediği');
  });

  it('keeps unsupported cartographic predictions unsupported', () => {
    const model = prediction('azimuthal-projection', [], 'unsupported');
    const result = comparePhotoAngularObservation({
      experimentId: 'exp-1',
      sourceModelId: 'azimuthal-projection',
      sourceModelName: 'Azimutal Gösterim',
      modelPrediction: model,
      photoPrediction: photo,
      referenceKind: 'local-horizontal'
    });

    expect(result.prediction.status).toBe('unsupported');
    expect(result.channels).toHaveLength(0);
  });
});
