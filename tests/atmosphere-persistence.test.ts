import { describe, expect, it } from 'vitest';
import {
  createDefaultAtmosphereExperimentState,
  type AtmosphereExperimentState
} from '../src/shared/atmosphere';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import {
  atmosphereStateFromLegacyStandardFlag,
  cloneAtmosphereExperimentState,
  parseAtmosphereExperimentState
} from '../src/simulation/atmosphere-persistence';

function savedExperiment(atmosphere?: AtmosphereExperimentState): SavedExperiment {
  return {
    id: 'atmosphere-test',
    name: 'Atmosfer kayıt testi',
    createdAtIso: '2026-08-07T16:00:00+03:00',
    updatedAtIso: '2026-08-07T16:01:00+03:00',
    scenarioId: 'target-visibility',
    ...(atmosphere ? { atmosphere } : {}),
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    modelVersions: {},
    predictions: []
  };
}

describe('atmosphere experiment persistence', () => {
  it('parses and deep clones a valid profile state', () => {
    const state = createDefaultAtmosphereExperimentState('profile');
    const parsed = parseAtmosphereExperimentState(state);
    expect(parsed).not.toBeNull();
    expect(parsed?.mode).toBe('profile');
    expect(parsed?.profile.samples).toHaveLength(2);

    const cloned = cloneAtmosphereExperimentState(state);
    cloned.profile.samples[0]!.temperatureC = 30;
    expect(state.profile.samples[0]!.temperatureC).toBe(15);
  });

  it('rejects invalid persisted optical settings and ray steps', () => {
    const state = createDefaultAtmosphereExperimentState('profile');
    expect(parseAtmosphereExperimentState({
      ...state,
      opticalSettings: { ...state.opticalSettings, wavelengthNm: 200 }
    })).toBeNull();
    expect(parseAtmosphereExperimentState({ ...state, rayTraceStepM: 0 })).toBeNull();
  });

  it('round-trips atmosphere state through the portable experiment format', () => {
    const state = createDefaultAtmosphereExperimentState('profile');
    state.profile.sourceLabel = 'Radiosonde manuel aktarım';
    state.opticalSettings.wavelengthNm = 633;
    state.rayTraceStepM = 10;

    const portable = createPortableExperimentFile(
      savedExperiment(state),
      '1.3.0',
      '2026-08-07T16:02:00+03:00'
    );
    const parsed = parsePortableExperimentFile(portable).experiment;

    expect(parsed.atmosphere?.mode).toBe('profile');
    expect(parsed.atmosphere?.profile.sourceLabel).toBe('Radiosonde manuel aktarım');
    expect(parsed.atmosphere?.opticalSettings.wavelengthNm).toBe(633);
    expect(parsed.atmosphere?.rayTraceStepM).toBe(10);
  });

  it('preserves the absence of atmosphere state in legacy records', () => {
    const portable = createPortableExperimentFile(
      savedExperiment(),
      '1.3.0',
      '2026-08-07T16:02:00+03:00'
    );
    const parsed = parsePortableExperimentFile(portable).experiment;
    expect(parsed.atmosphere).toBeUndefined();
    expect(atmosphereStateFromLegacyStandardFlag(parsed.inputs.useStandardRefraction).mode)
      .toBe('standard');
  });
});
