export interface AtmosphereProfileSample {
  id: string;
  altitudeM: number;
  temperatureC: number;
  pressureHpa: number;
  relativeHumidityPercent: number;
}

export interface LayeredAtmosphereProfile {
  kind: 'layered-meteorological';
  sourceLabel: string;
  observedAtIso?: string;
  samples: AtmosphereProfileSample[];
}

export interface InterpolatedAtmosphereState {
  altitudeM: number;
  temperatureC: number;
  pressureHpa: number;
  relativeHumidityPercent: number;
}

export interface OpticalAtmosphereSettings {
  wavelengthNm: number;
  carbonDioxidePpm: number;
}

export type AtmosphereMode = 'off' | 'standard' | 'profile';

export interface AtmosphereExperimentState {
  mode: AtmosphereMode;
  profile: LayeredAtmosphereProfile;
  opticalSettings: OpticalAtmosphereSettings;
  rayTraceStepM: number;
}

export const DEFAULT_OPTICAL_ATMOSPHERE_SETTINGS: OpticalAtmosphereSettings = {
  wavelengthNm: 550,
  carbonDioxidePpm: 450
};

export const DEFAULT_ATMOSPHERE_PROFILE: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Manuel atmosfer profili',
  samples: [
    {
      id: 'surface',
      altitudeM: 0,
      temperatureC: 15,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 50
    },
    {
      id: 'layer-100',
      altitudeM: 100,
      temperatureC: 14.35,
      pressureHpa: 1001.29,
      relativeHumidityPercent: 50
    }
  ]
};

export function createDefaultAtmosphereExperimentState(
  mode: AtmosphereMode = 'standard'
): AtmosphereExperimentState {
  return {
    mode,
    profile: {
      ...DEFAULT_ATMOSPHERE_PROFILE,
      samples: DEFAULT_ATMOSPHERE_PROFILE.samples.map((sample) => ({ ...sample }))
    },
    opticalSettings: { ...DEFAULT_OPTICAL_ATMOSPHERE_SETTINGS },
    rayTraceStepM: 25
  };
}
