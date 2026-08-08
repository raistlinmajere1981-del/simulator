import { describe, expect, it } from 'vitest';
import { simulationModels } from '../src/models';
import type { ExperimentDefinition } from '../src/shared/domain';
import { propagateModelAngularUncertainty } from '../src/simulation/photo-model-uncertainty';

const experiment: ExperimentDefinition = {
  id: 'uncertainty-exp',
  title: 'uncertainty',
  type: 'target-visibility',
  observer: { latitudeDeg: 0, longitudeDeg: 0, elevationM: 0, eyeHeightM: 10 },
  target: { latitudeDeg: 0, longitudeDeg: 0.1, elevationM: 0, heightM: 15, label: 'target' },
  observedAtIso: '2026-08-08T10:00:00+03:00',
  measurements: {
    surfaceDistanceM: { value: 1000, uncertainty: 0, unit: 'm' },
    visibleFraction: { value: 1, uncertainty: 0.1, unit: 'fraction' }
  }
};

const context = { atmosphereMode: 'standard' as const, refractionCoefficient: 0.13 };

describe('photo model angular uncertainty', () => {
  it('propagates explicit distance/height/k uncertainty into angular metrics', async () => {
    const model = simulationModels[0]!;
    const baseline = await model.predict(experiment, context);
    const result = await propagateModelAngularUncertainty({
      model,
      baselinePrediction: baseline,
      experiment,
      context,
      settings: {
        combination: 'linear-conservative',
        surfaceDistanceM: 5,
        observerEyeHeightM: 0.1,
        targetHeightM: 0.2,
        refractionCoefficient: 0.01
      }
    });
    expect(result.definedParameterCount).toBe(4);
    expect(result.metricUncertaintyDeg.targetTopElevationDeg).toBeGreaterThan(0);
    expect(result.metricUncertaintyDeg.targetAngularHeightDeg).toBeGreaterThan(0);
  });

  it('does not silently apply k uncertainty outside standard atmosphere mode', async () => {
    const model = simulationModels[1]!;
    const offContext = { atmosphereMode: 'off' as const };
    const baseline = await model.predict(experiment, offContext);
    const result = await propagateModelAngularUncertainty({
      model,
      baselinePrediction: baseline,
      experiment,
      context: offContext,
      settings: { combination: 'linear-conservative', refractionCoefficient: 0.01 }
    });
    expect(result.definedParameterCount).toBe(0);
    expect(result.warnings.join(' ')).toContain('Standart k');
  });
});
