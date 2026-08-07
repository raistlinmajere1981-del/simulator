import { describe, expect, it } from 'vitest';
import { IdealSphereModel } from '../src/models/ideal-sphere';
import { DefinedPlaneModel } from '../src/models/defined-plane';
import { AzimuthalProjectionReference } from '../src/models/azimuthal-projection';
import type { ExperimentDefinition } from '../src/shared/domain';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { getSimulationScenario, normalizeSimulationScenarioId } from '../src/shared/scenario';

function horizonExperiment(): ExperimentDefinition {
  return {
    id: 'horizon-test',
    title: 'Ufuk testi',
    type: 'horizon',
    observer: {
      latitudeDeg: 41,
      longitudeDeg: 29,
      elevationM: 90,
      eyeHeightM: 10
    },
    observedAtIso: '2026-08-07T12:00:00Z',
    measurements: {}
  };
}

describe('scenario workflow contracts', () => {
  it('defines three ready visibility scenarios with a real horizon experiment type', () => {
    expect(getSimulationScenario('target-visibility').experimentType).toBe('target-visibility');
    expect(getSimulationScenario('horizon').experimentType).toBe('horizon');
    expect(getSimulationScenario('long-distance-visibility').experimentType).toBe('target-visibility');
    expect(normalizeSimulationScenarioId('unknown')).toBe('target-visibility');
  });

  it('computes a finite spherical horizon and an infinite planar horizon without a target', async () => {
    const experiment = horizonExperiment();
    const sphere = await new IdealSphereModel().predict(experiment, { atmosphereMode: 'off' });
    const plane = await new DefinedPlaneModel().predict(experiment, { atmosphereMode: 'off' });
    const projection = await new AzimuthalProjectionReference().predict(experiment, { atmosphereMode: 'off' });

    const sphereHorizon = sphere.metrics.find((metric) => metric.key === 'horizonSurfaceDistanceM')?.value;
    const planeHorizon = plane.metrics.find((metric) => metric.key === 'horizonSurfaceDistanceM')?.value;

    expect(sphere.status).toBe('compatible');
    expect(sphereHorizon).toBeTypeOf('number');
    expect(sphereHorizon).toBeGreaterThan(30_000);
    expect(sphereHorizon).toBeLessThan(40_000);
    expect(plane.status).toBe('compatible');
    expect(planeHorizon).toBeNull();
    expect(projection.status).toBe('unsupported');
    expect(projection.warnings.join(' ')).toContain('ufuk');
  });

  it('preserves scenario identity through the portable experiment normalizer', () => {
    const saved: SavedExperiment = {
      id: 'saved-horizon',
      name: 'Ufuk kaydı',
      createdAtIso: '2026-08-07T12:00:00Z',
      updatedAtIso: '2026-08-07T12:00:00Z',
      scenarioId: 'horizon',
      inputs: DEFAULT_SIMULATOR_INPUTS,
      modelVersions: {},
      predictions: []
    };
    const portable = createPortableExperimentFile(saved, '1.2.0', '2026-08-07T12:01:00Z');
    expect(parsePortableExperimentFile(portable).experiment.scenarioId).toBe('horizon');

    const legacy = { ...saved } as Record<string, unknown>;
    delete legacy.scenarioId;
    const parsedLegacy = parsePortableExperimentFile(legacy).experiment;
    expect(parsedLegacy.scenarioId).toBeUndefined();
    expect(normalizeSimulationScenarioId(parsedLegacy.scenarioId)).toBe('target-visibility');
  });
});
