import { describe, expect, it } from 'vitest';
import { createAiAnalysisPackage } from '../src/shared/ai-analysis-package';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

function fixture(): SavedExperiment {
  return {
    id: 'exp-ai-package',
    name: 'AI paket testi',
    createdAtIso: '2026-08-11T10:00:00.000Z',
    updatedAtIso: '2026-08-11T10:05:00.000Z',
    observedAtIso: '2024-04-08T18:42:00.000Z',
    observationUtcOffsetMinutes: 0,
    scenarioId: 'sun-moon-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: 32.7767,
      observerLongitudeDeg: -96.797,
      targetLatitudeDeg: 32.7767,
      targetLongitudeDeg: -66.797
    },
    modelVersions: { 'sample-model': '1.2.3' },
    predictions: [{
      modelId: 'sample-model',
      experimentId: 'exp-ai-package',
      status: 'compatible',
      metrics: [{ key: 'sampleMetric', label: 'Örnek metrik', value: 12.5, unit: 'deg', uncertainty: 0.2 }],
      warnings: ['Örnek uyarı'],
      traceId: 'trace-1',
      trace: {
        summary: 'Örnek hesap özeti',
        assumptions: ['Örnek varsayım'],
        steps: []
      }
    }]
  };
}

describe('GGL AI analysis package v1', () => {
  it('serializes stable experiment context and model results', () => {
    const text = createAiAnalysisPackage(fixture(), '2026-08-11T12:00:00.000Z');
    expect(text).toContain('GGL-AI-ANALYSIS v1');
    expect(text).toContain('experiment.scenario_id: sun-moon-observation');
    expect(text).toContain('observer.coordinates: 32.7767,-96.797');
    expect(text).toContain('model_id: sample-model');
    expect(text).toContain('model_version: 1.2.3');
    expect(text).toContain('metric.sampleMetric: 12.5 ±0.2 deg | Örnek metrik');
    expect(text).toContain('warning: Örnek uyarı');
    expect(text).toContain('assumption: Örnek varsayım');
    expect(text).toContain('AI_TASK BEGIN');
    expect(text).toContain('END GGL-AI-ANALYSIS');
  });

  it('does not serialize trace step bodies into the compact package', () => {
    const experiment = fixture();
    experiment.predictions[0]!.trace.steps = [{
      id: 's1',
      title: 'Uzun adım',
      formula: 'x = y',
      substitution: 'x = 1',
      result: '1'
    }];
    const text = createAiAnalysisPackage(experiment, '2026-08-11T12:00:00.000Z');
    expect(text).not.toContain('Uzun adım');
    expect(text).toContain('trace_summary: Örnek hesap özeti');
  });
});
