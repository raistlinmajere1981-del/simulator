import type {
  AtmosphereExperimentState,
  AtmosphereMode,
  AtmosphereProfileSample,
  LayeredAtmosphereProfile,
  OpticalAtmosphereSettings
} from '../shared/atmosphere';
import { createDefaultAtmosphereExperimentState } from '../shared/atmosphere';
import { validateAtmosphereProfile } from './atmosphere-profile';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMode(value: unknown): value is AtmosphereMode {
  return value === 'off' || value === 'standard' || value === 'profile';
}

function parseProfile(value: unknown): LayeredAtmosphereProfile | null {
  if (!isRecord(value) || value.kind !== 'layered-meteorological' ||
    typeof value.sourceLabel !== 'string' || !value.sourceLabel.trim() ||
    !Array.isArray(value.samples)) {
    return null;
  }
  if (value.observedAtIso !== undefined && typeof value.observedAtIso !== 'string') return null;

  const samples: AtmosphereProfileSample[] = [];
  for (const item of value.samples) {
    if (!isRecord(item) || typeof item.id !== 'string' ||
      !finite(item.altitudeM) || !finite(item.temperatureC) ||
      !finite(item.pressureHpa) || !finite(item.relativeHumidityPercent)) {
      return null;
    }
    samples.push({
      id: item.id,
      altitudeM: item.altitudeM,
      temperatureC: item.temperatureC,
      pressureHpa: item.pressureHpa,
      relativeHumidityPercent: item.relativeHumidityPercent
    });
  }

  const profile: LayeredAtmosphereProfile = {
    kind: 'layered-meteorological',
    sourceLabel: value.sourceLabel.trim(),
    ...(value.observedAtIso === undefined ? {} : { observedAtIso: value.observedAtIso }),
    samples
  };
  return validateAtmosphereProfile(profile).length === 0 ? profile : null;
}

function parseOpticalSettings(value: unknown): OpticalAtmosphereSettings | null {
  if (!isRecord(value) || !finite(value.wavelengthNm) || !finite(value.carbonDioxidePpm)) {
    return null;
  }
  if (value.wavelengthNm < 300 || value.wavelengthNm > 1690 ||
    value.carbonDioxidePpm < 0 || value.carbonDioxidePpm > 2000) {
    return null;
  }
  return {
    wavelengthNm: value.wavelengthNm,
    carbonDioxidePpm: value.carbonDioxidePpm
  };
}

export function parseAtmosphereExperimentState(value: unknown): AtmosphereExperimentState | null {
  if (!isRecord(value) || !isMode(value.mode) || !finite(value.rayTraceStepM) ||
    value.rayTraceStepM <= 0 || value.rayTraceStepM > 5000) {
    return null;
  }
  const profile = parseProfile(value.profile);
  const opticalSettings = parseOpticalSettings(value.opticalSettings);
  if (!profile || !opticalSettings) return null;
  return {
    mode: value.mode,
    profile,
    opticalSettings,
    rayTraceStepM: value.rayTraceStepM
  };
}

export function cloneAtmosphereExperimentState(
  state: AtmosphereExperimentState
): AtmosphereExperimentState {
  return {
    mode: state.mode,
    profile: {
      ...state.profile,
      samples: state.profile.samples.map((sample) => ({ ...sample }))
    },
    opticalSettings: { ...state.opticalSettings },
    rayTraceStepM: state.rayTraceStepM
  };
}

export function atmosphereStateFromLegacyStandardFlag(
  useStandardRefraction: boolean
): AtmosphereExperimentState {
  return createDefaultAtmosphereExperimentState(useStandardRefraction ? 'standard' : 'off');
}
